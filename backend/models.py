"""SQLAlchemy ORM models for all game entities: users, campaigns, circles, characters, notebook entries, and relationship votes."""
from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Float, Boolean, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    pending_rejoin_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)

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

    # Single labeled tension clock (4 slices, starts full)
    tension_clock = Column(Integer, default=4)
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

    # Per-player assignment report responses stored in backstory_answers JSON keyed by character_id
    # Structure: { "selected_question_key": "...", "reports": { "42": { "q0": true, "q1": false, ... } } }

    # Campaign ownership — each campaign owns exactly one circle (nullable for legacy circle id=1)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)

    game = relationship("Game", back_populates="circles")
    characters = relationship("Character", back_populates="circle")

class Character(Base):
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

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    campaign_code = Column(String, unique=True, index=True, nullable=False)
    gm_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    roster_finalized = Column(Boolean, default=False)
    is_retired = Column(Boolean, default=False)

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

    campaign = relationship("Campaign", back_populates="notebook_entries")
