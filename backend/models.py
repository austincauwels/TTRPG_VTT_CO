"""SQLAlchemy ORM models for all game entities: users, password reset links, email change links and their undo links, held usernames, campaigns, circles, characters, notebook entries, and relationship votes."""
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Float, Boolean, Text, Index, DateTime, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, column_property, deferred, relationship, with_loader_criteria

Base = declarative_base()


class SoftDeleted:
    """A row its owner can delete and get back: characters and campaigns.

    Deleting sets deleted_at (UTC, no time zone) and keeps the row. Every ORM query in
    every session leaves such rows out (_hide_deleted_rows below), so the app and the
    API never list or find them: lookups by id answer 404, and lists and relationship
    loads skip them. Code that has to see them
    (the undo and admin restore in vtt/deletion.py, the campaign code check that keeps
    a deleted campaign's code reserved) asks for them with
    .execution_options(include_deleted=True). Raw SQL (text()) is not filtered.
    See docs/refactor/DELETION.md."""
    deleted_at = Column(DateTime, nullable=True)


# The execution option that lets one query see deleted rows.
INCLUDE_DELETED = "include_deleted"


@event.listens_for(Session, "do_orm_execute")
def _hide_deleted_rows(state):
    # Every SELECT gets the criteria, relationship loads included, except the loads that
    # refresh a row already in the session (an expired attribute after a commit,
    # Session.refresh): those fetch one known row by its primary key and must still find
    # it after it was deleted. propagate_to_loaders=False keeps the criteria off the
    # loaded objects, so it never reaches those refreshes.
    if (state.is_select and not state.is_column_load
            and not state.execution_options.get(INCLUDE_DELETED, False)):
        state.statement = state.statement.options(with_loader_criteria(
            SoftDeleted, lambda cls: cls.deleted_at.is_(None),
            include_aliases=True, propagate_to_loaders=False))


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    pending_rejoin_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    # Sign in with Google: the Google account's subject id, once linked (unique index ix_users_google_sub)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    # The email of that Google account when it was linked. A link whose Google email is
    # not the account's email (or was never recorded) is unproven: a password reset
    # removes it, and so does the address owner's Google sign-in (docs/refactor/AUTH.md).
    google_email = Column(String, nullable=True)
    # True once someone showed they read the account's email: a used reset link, or a
    # Google account with that address (made with Google, or linked with the same email).
    email_proven = Column(Boolean, default=False)
    # True when someone chose the account's password (register, a reset link, the account
    # page, or any password that was checked and worked); False when the server set one
    # nobody knows (made with Google, replaced by Google's sign-in by email, a retired
    # published password). NULL for accounts from before the column: not known.
    has_password = Column(Boolean, nullable=True)
    # Raised by one to end every session without a new password (removing the Google
    # sign-in). Login tokens carry it in their stamp (vtt/security.py session_stamp).
    # NULL for rows from before the column counts as 0.
    session_epoch = Column(Integer, default=0, nullable=True)

class PasswordResetToken(Base):
    """An outstanding password reset link (vtt/password_reset.py). Only the SHA-256 of
    the link's token is kept. A row is deleted when its link is used and when the user's
    password is reset; password_stamp (see vtt/security.py) makes it useless once the
    password changes any other way. When the user asks for a newer link the row stays,
    marked replaced_at, so that its link can say that a newer one was sent; it never works
    again, and it expires with the newer link."""
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    password_stamp = Column(String(32), nullable=False)
    created_at = Column(Integer, nullable=False)  # Unix time, seconds
    expires_at = Column(Integer, nullable=False)  # Unix time, seconds
    replaced_at = Column(Integer, nullable=True)  # Unix time, seconds: when a newer link replaced it

class EmailChangeToken(Base):
    """A pending change of a user's email address (vtt/email_change.py): the link mailed
    to the new address. Only the SHA-256 of the link's token is kept. A row is deleted
    when its link is used, when the user asks again or cancels, and when the password
    changes on the account page; password_stamp and old_email make it useless once the
    password or the email changes any other way."""
    __tablename__ = "email_change_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    new_email = Column(String, nullable=False)
    old_email = Column(String, nullable=True)     # the account's email when the change was asked for
    password_stamp = Column(String(32), nullable=False)
    created_at = Column(Integer, nullable=False)  # Unix time, seconds
    expires_at = Column(Integer, nullable=False)  # Unix time, seconds

class EmailChangeUndo(Base):
    """The undo link mailed to the old address when a change of address went through
    (vtt/email_change.py). Only the SHA-256 of the link's token is kept. It works once,
    for EMAIL_UNDO_EXPIRE_DAYS, whatever happened to the account since: a new password,
    a new Google link or another change of address do not end it. Using it deletes it
    and every undo link of the user issued after it. google_sub is the Google link the
    account had when the change went through (NULL: none), which the undo keeps."""
    __tablename__ = "email_change_undos"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    old_email = Column(String, nullable=False)    # the address the undo puts back
    new_email = Column(String, nullable=False)    # the address the change set
    google_sub = Column(String, nullable=True)    # the Google link when the change went through
    created_at = Column(Integer, nullable=False)  # Unix time, seconds
    expires_at = Column(Integer, nullable=False)  # Unix time, seconds

class UsernameHold(Base):
    """A name freed by a rename, held for the user who had it until held_until
    (vtt/usernames.py): nobody else may take it meanwhile. name_key is the name as
    usernames.username_key compares it."""
    __tablename__ = "username_holds"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name_key = Column(String, nullable=False, index=True)
    held_until = Column(Integer, nullable=False)  # Unix time, seconds

class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

    characters = relationship("Character", back_populates="game")
    circles = relationship("Circle", back_populates="game")

class Circle(Base):
    __tablename__ = "circles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    game_id = Column(Integer, ForeignKey("games.id"))

    stitch = Column(Integer, default=0)
    refresh = Column(Integer, default=0)
    train = Column(Integer, default=0)

    # GM-controlled threat clocks (legacy, replaced by tension_clock)
    guard_patrol = Column(Integer, default=0)
    miasma_bleed = Column(Integer, default=0)

    # Single labeled tension clock (4 slices, starts empty and fills as tension rises)
    tension_clock = Column(Integer, default=0)
    tension_label = Column(String, default="")

    # Scene manager fields broadcast to players
    location = Column(String, default="")
    atmosphere = Column(String, default="")

    # Circle creation fields
    chapter_house_location = Column(String, nullable=True)
    circle_ability = Column(String, nullable=True)
    insignia = Column(String, nullable=True)
    backstory_answers = Column(JSON, default=dict)
    is_finalized = Column(Boolean, default=False)

    # Illumination Track
    illumination = Column(Integer, default=0)

    # GM toggles for player permissions
    resources_editable = Column(Boolean, default=False)
    reports_open = Column(Boolean, default=False)

    # Stamina Training's gilded dice used this assignment (rulebook p. 41)
    stamina_dice_used = Column(Integer, default=0)

    # Per-player assignment report responses stored in backstory_answers JSON keyed by character_id
    # Structure: { "selected_question_key": "...", "reports": { "42": { "q0": true, "q1": false, ... } } }

    # Campaign ownership — each campaign owns exactly one circle (nullable for legacy circle id=1)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)

    game = relationship("Game", back_populates="circles")
    characters = relationship("Character", back_populates="circle")

class Character(SoftDeleted, Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    circle_id = Column(Integer, ForeignKey("circles.id"))

    # --- NARRATIVE & METADATA DETAILS ---
    pronouns = Column(String, default="Unlisted")
    style = Column(String, default="")
    catalyst = Column(String, default="")
    question = Column(String, default="")
    role = Column(String, default="")           # Face, Scholar, Weird, Slink, Muscle
    specialty = Column(String, default="")      # Investigator, Doctor, etc.
    role_ability = Column(String, default="None")
    specialty_ability = Column(String, default="None")
    gear = Column(JSON, default=list) # JSON list; SQLAlchemy tracks mutations on list-type columns automatically.
    profile_pic = Column(String, nullable=True)

    # Actions
    # Nerve
    move = Column(Integer, default=0)
    strike = Column(Integer, default=0)
    control = Column(Integer, default=0)
    # Cunning
    hide = Column(Integer, default=0)
    sneak = Column(Integer, default=0)
    sway = Column(Integer, default=0)
    # Intuition
    survey = Column(Integer, default=0)
    read = Column(Integer, default=0)
    sense = Column(Integer, default=0)

    # Gilded Actions (flags)
    gilded_move = Column(Boolean, default=False)
    gilded_strike = Column(Boolean, default=False)
    gilded_control = Column(Boolean, default=False)
    gilded_hide = Column(Boolean, default=False)
    gilded_sneak = Column(Boolean, default=False)
    gilded_sway = Column(Boolean, default=False)
    gilded_survey = Column(Boolean, default=False)
    gilded_read = Column(Boolean, default=False)
    gilded_sense = Column(Boolean, default=False)

    # Drive
    nerve_max = Column(Integer, default=3)
    nerve_current = Column(Integer, default=3)
    cunning_max = Column(Integer, default=3)
    cunning_current = Column(Integer, default=3)
    intuition_max = Column(Integer, default=3)
    intuition_current = Column(Integer, default=3)

    # Marks
    body_marks = Column(Integer, default=0)
    brain_marks = Column(Integer, default=0)
    bleed_marks = Column(Integer, default=0)

    # Scars
    scars_count = Column(Integer, default=0)
    scars_list = Column(JSON, default=list)

    # Resistance (pips spent per drive pool)
    nerve_resistance_spent     = Column(Integer, default=0)
    cunning_resistance_spent   = Column(Integer, default=0)
    intuition_resistance_spent = Column(Integer, default=0)

    # Per-assignment ability use tracking: { "Death Defy": 1, "Saw This Coming": 2, ... }
    ability_uses = Column(JSON, default=dict)

    # Circle resource tracking
    train_bonus                = Column(Boolean, default=False)
    resources_spent_assignment = Column(Integer, default=0)
    # Train dice waiting to be used: a player may spend Train twice (rulebook p. 41).
    # train_bonus stays true while any wait (vtt/circle_queries.py train_dice_left).
    train_dice                 = Column(Integer, default=0)

    # Circle advancement (rulebook p. 55): picks the Lightkeeper's advance gave the
    # character that are not chosen yet, and the options already taken among them (two
    # different options per advancement; engine.apply_advancement).
    advancement_picks = Column(Integer, default=0)
    advancement_taken = Column(JSON, default=list)
    # How many different options the current set of picks takes: 2, or 4 for the
    # advancement that brings One Last Run (rulebook p. 41)
    advancement_set = Column(Integer, default=2)

    # Status
    incapacitated = Column(Boolean, default=False)
    is_dead = Column(Boolean, default=False)

    # Campaign binding — approval flow: 'unaffiliated', 'pending', 'active'
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)
    status = Column(String, default="unaffiliated", nullable=False, index=True)

    # Notebook pen style — chosen at campaign join
    pen_font = Column(String, default='Caveat')
    ink_color = Column(String, default='')

    # Circle history: player's personal answer to the selected circle question
    personal_circle_answer = Column(Text, default="")

    game = relationship("Game", back_populates="characters")
    circle = relationship("Circle", back_populates="characters")
    campaign = relationship("Campaign", back_populates="characters")

class Campaign(SoftDeleted, Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    campaign_code = Column(String, unique=True, index=True, nullable=False)
    gm_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    roster_finalized = Column(Boolean, default=False)
    is_retired = Column(Boolean, default=False)
    # Set when the campaign is deleted: the characters it let go, as they were
    # ([{"id": 12, "status": "active"}, ...]), so that an undo or an admin restore can
    # put back the ones that are still free (vtt/deletion.py). None otherwise.
    released_characters = Column(JSON, nullable=True)

    characters = relationship("Character", back_populates="campaign")
    notebook_entries = relationship("NotebookEntry", back_populates="campaign", order_by="NotebookEntry.page_number")


class CircleVote(Base):
    __tablename__ = "circle_votes"
    __table_args__ = (
        Index("ix_circle_votes_circle_type", "circle_id", "vote_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    vote_type = Column(String, nullable=False)   # 'name' | 'ability' | 'question'
    value = Column(String, nullable=False)


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id"), nullable=False, index=True)
    from_character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    to_character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    rel_type = Column(String, nullable=False)
    lore = Column(Text, default="")
    status = Column(String, default="proposed")  # 'proposed' | 'accepted'
    counter_type = Column(String, nullable=True)
    counter_lore = Column(Text, nullable=True)
    last_actor_id = Column(Integer, ForeignKey("characters.id"), nullable=True)

class NotebookEntry(Base):
    __tablename__ = "notebook_entries"

    id           = Column(Integer, primary_key=True, index=True)
    campaign_id  = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)
    author_name  = Column(String, nullable=False)
    author_type  = Column(String, nullable=False)   # 'gm' | 'player'
    pen_font     = Column(String, default='Caveat')
    ink_color    = Column(String, default='#1a1a1a')
    title        = Column(String, nullable=False)
    content      = Column(Text, nullable=False)
    created_at   = Column(String, nullable=False)   # ISO datetime string
    page_number  = Column(Integer, nullable=False)
    entry_type   = Column(String, default='field_log')  # 'field_log'|'ephemeral'|'lightkeeper'|'sketch'|'photo'
    visibility   = Column(String, default='all')         # 'all'|'gm_only'|'self'
    image_data   = Column(Text, nullable=True)           # base64-encoded image
    is_deleted   = Column(Boolean, default=False)
    # A drawn sketch's Excalidraw scene, for its author only (vtt/sketch_scenes.py). Deferred:
    # lists and the API read has_scene (below), so a scene is loaded only when asked for.
    sketch_scene = deferred(Column(Text, nullable=True))

    campaign = relationship("Campaign", back_populates="notebook_entries")


# Whether the entry keeps a drawing, worked out by the database (IS NOT NULL), so reading it
# never loads the scene itself.
NotebookEntry.has_scene = column_property(NotebookEntry.__table__.c.sketch_scene.isnot(None))
