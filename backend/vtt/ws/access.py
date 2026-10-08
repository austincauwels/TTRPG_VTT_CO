"""Who may open which channel, and who may send which message type.

The rules follow the "should be allowed" column of docs/refactor/WEBSOCKET.md and are
listed in docs/refactor/AUTH.md. A few rules also refuse a malformed payload (422)
that would otherwise make the handler raise after it has committed. A rejected
message raises Rejected; the endpoint answers it with an action_rejected frame to the
sender and handles nothing. Facts
are read with column queries (vtt.auth), so the socket's long-lived session never
decides on a stale copy of a row.
"""
from engine import ALL_ACTIONS
from models import Campaign, Character, Circle, Relationship
from vtt.abilities import MARK_TYPES, abilities_of, uses_of
from vtt.ability_uses import SCAR_ABILITIES
from vtt.auth import MEMBER_STATUSES, NOT_ALLOWED, ROSTER_STATUSES, campaign_facts, character_facts
from vtt.circle_queries import VOTE_TYPES

# Close codes for a refused connection. The socket is accepted first and then
# closed, so that browsers see the code (a refused handshake shows up as 1006).
CLOSE_UNAUTHENTICATED = 4401   # missing, invalid or expired token, or the user is gone
CLOSE_FORBIDDEN = 4403         # the channel exists but belongs to someone else
CLOSE_NOT_FOUND = 4404         # no character or campaign by that id or code

_INT32_MAX = 2 ** 31 - 1


class Rejected(Exception):
    def __init__(self, status, detail):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _forbid():
    raise Rejected(403, NOT_ALLOWED)


def _not_found(what):
    raise Rejected(404, f"{what} not found")


def _invalid(detail):
    raise Rejected(422, detail)


def resolve_channel(db, user_id, game_id):
    """(character, campaign, is_gm) for a channel the user may open, or a close code.

    A numeric game_id is a character's channel and only its owner may open it; the
    campaign is then the character's own (none for an unaffiliated character). Any
    other game_id is a campaign code and only that campaign's GM may open it. When an
    all-digit campaign code equals a character id, the owner gets the character
    channel and the GM gets the campaign channel. The two have different
    connection-manager keys (vtt.ws.manager), so neither can take over the other.
    """
    character = None
    try:
        char_id = int(game_id)
    except ValueError:
        char_id = None
    if char_id is not None and -_INT32_MAX <= char_id <= _INT32_MAX:
        character = db.query(Character).filter(Character.id == char_id).first()
    if character is not None and character.user_id == user_id:
        campaign = None
        if character.campaign_id:
            campaign = db.query(Campaign).filter(Campaign.id == character.campaign_id).first()
        return character, campaign, False
    campaign = db.query(Campaign).filter(Campaign.campaign_code == game_id).first()
    if campaign is not None and campaign.gm_user_id is not None and campaign.gm_user_id == user_id:
        return None, campaign, True
    if campaign is not None or character is not None:
        return CLOSE_FORBIDDEN
    return CLOSE_NOT_FOUND


# --- per message -------------------------------------------------------------------

# Only the campaign's GM may send these.
GM_ONLY = frozenset({
    "gm_update_tension", "gm_update_circle", "gm_timer", "gm_transition_scene", "gm_toggle_resource_edit",
    "gm_toggle_reports", "gm_advance_circle", "refill_resources", "gm_end_assignment",
    "gm_reset_character", "update_circle", "gm_update_scars",
})

# A GM socket may aim these at a character of its campaign with payload.character_id.
# Every other type acts for a character only on that character's own socket.
GM_MAY_TARGET = frozenset({
    "gm_update_tension", "gm_reset_character", "update_drive", "take_mark", "revive_character", "update_gear",
    "gm_update_scars",
})


def check_target(ctx, action, character, named_in_payload):
    """The character a message acts on (payload.character_id, else the socket's own).

    A player socket may only act for its own character. A GM socket may only aim the
    GM_MAY_TARGET types at a character on its own campaign's roster (active or
    pending), not at a retired character still tagged with it. A character_id that
    matches no character is 404.
    """
    if character is None:
        if named_in_payload:
            _not_found("Character")
        return
    if ctx.is_gm:
        facts = character_facts(ctx.db, character.id)
        if action not in GM_MAY_TARGET or facts is None or facts.campaign_id is None \
                or facts.campaign_id != ctx.camp_id or facts.status not in ROSTER_STATUSES:
            _forbid()
    elif character.id != ctx.own_char_id:
        _forbid()


def _sender_campaign(ctx):
    """The campaign the sender belongs to: the GM's campaign, or the campaign of the
    player's character as it is now (not as it was when the socket opened). 403 when
    the player's character is not a member (an active character; a pending one is
    still waiting for the GM)."""
    if ctx.is_gm:
        return ctx.camp_id
    me = character_facts(ctx.db, ctx.own_char_id)
    if me is None or me.campaign_id is None or me.status not in MEMBER_STATUSES:
        _forbid()
    return me.campaign_id


def _circle_of(ctx, circle_id, campaign_id):
    """The circle must exist (404) and belong to that campaign (403). An id that is not a
    whole number is refused (422) before the query: a string, an object or a bool used to
    reach the database, fail there, and end the socket."""
    if type(circle_id) is not int:
        _invalid("circle_id must be a whole number.")
    row = ctx.db.query(Circle.id, Circle.campaign_id).filter(Circle.id == circle_id).first()
    if row is None:
        _not_found("Circle")
    if campaign_id is None or row.campaign_id != campaign_id:
        _forbid()


def _default_circle(ctx, payload):
    return payload.get("circle_id") or (ctx.circle.id if ctx.circle else 1)


def _gm_only(ctx, payload, character):
    if not ctx.is_gm:
        _forbid()


def _gm_circle(ctx, payload, character):
    _gm_only(ctx, payload, character)
    _circle_of(ctx, _default_circle(ctx, payload), ctx.camp_id)


def _gm_update_circle(ctx, payload, character):
    # Unlike the other circle messages this one has always defaulted to circle 1.
    _gm_only(ctx, payload, character)
    _circle_of(ctx, payload.get("circle_id") or 1, ctx.camp_id)


def _intercept_mark(ctx, payload, character):
    m_type = payload.get("mark_type")
    if m_type and m_type not in MARK_TYPES:
        _invalid("Unknown mark type.")
    target_id = payload.get("target_character_id")
    if target_id is None:
        return
    target = character_facts(ctx.db, target_id)
    if target is None:
        _not_found("Character")
    me = character_facts(ctx.db, character.id)
    if me.campaign_id is None or target.campaign_id != me.campaign_id:
        _forbid()


def _spend_resource(ctx, payload, character):
    campaign_id = _sender_campaign(ctx)
    if ctx.circle is None or ctx.circle.campaign_id != campaign_id:
        _forbid()


def _member_circle_vote(ctx, payload, character):
    """submit_assignment_report and circle_creation_vote: an active member, for the
    character on their own socket (check_target), on their campaign's circle."""
    if not payload.get("character_id"):
        return  # the handler ignores the message
    _circle_of(ctx, _default_circle(ctx, payload), _sender_campaign(ctx))


def _circle_creation_vote(ctx, payload, character):
    """An unknown vote_type used to be stored, and then the reply's lookup raised and
    ended the socket."""
    _member_circle_vote(ctx, payload, character)
    if payload.get("character_id") and payload.get("vote_type") and payload.get("value") \
            and payload.get("vote_type") not in VOTE_TYPES:
        _invalid("Unknown vote type.")


def _circle_backstory_update(ctx, payload, character):
    if not payload.get("question_key"):
        return  # the handler ignores the message
    _circle_of(ctx, _default_circle(ctx, payload), _sender_campaign(ctx))


def _circle_relationship_propose(ctx, payload, character):
    from_id, to_id = payload.get("from_character_id"), payload.get("to_character_id")
    if from_id is None and to_id is None:
        return  # the handler ignores the message
    if ctx.is_gm:
        _forbid()
    proposer = character_facts(ctx.db, from_id)
    if proposer is None:
        _not_found("Character")
    if proposer.id != ctx.own_char_id:
        _forbid()
    campaign_id = _sender_campaign(ctx)
    if to_id is not None:
        other = character_facts(ctx.db, to_id)
        if other is None:
            _not_found("Character")
        if other.campaign_id != campaign_id or other.status not in MEMBER_STATUSES:
            _forbid()
    _circle_of(ctx, _default_circle(ctx, payload), campaign_id)


def _circle_relationship_respond(ctx, payload, character):
    """Only the other party may answer: the character that did not act last (for a
    proposal made over REST, which records no actor, the character it was made to)."""
    if ctx.is_gm:
        _forbid()
    rel_id = payload.get("relationship_id")
    if not (rel_id and payload.get("action")):
        return  # the handler ignores the message
    rel = ctx.db.query(Relationship.id, Relationship.circle_id, Relationship.from_character_id,
                       Relationship.to_character_id, Relationship.last_actor_id).filter(
        Relationship.id == rel_id).first()
    if rel is None:
        _not_found("Relationship")
    me = ctx.own_char_id
    if me not in (rel.from_character_id, rel.to_character_id):
        _forbid()
    if (rel.last_actor_id is not None and me == rel.last_actor_id) or \
            (rel.last_actor_id is None and me != rel.to_character_id):
        _forbid()
    _circle_of(ctx, rel.circle_id, _sender_campaign(ctx))


KEEP_RATINGS_REFUSED = ("A scar shifts an action point: choose one action to lower and one to raise. "
                        "Only Hardened, or a Not Again scar, keeps the ratings as they are.")


def scar_ability(payload):
    """The ability a scar is taken for, if any: the desk names it, and not_again is the
    older name of a Not Again scar."""
    return payload.get("ability") or ("Not Again" if payload.get("not_again") else None)


def may_keep_ratings(character, payload) -> bool:
    """Whether a scar may leave the action ratings as they are (rulebook p. 14): with
    Hardened (p. 31), for a Not Again scar (p. 29) while it is unused this assignment, or
    for the fourth scar, which is fatal (RULES_CHECK.md item 12)."""
    abilities = abilities_of(character)
    if "Hardened" in abilities or (character.scars_count or 0) >= 3:
        return True
    return scar_ability(payload) == "Not Again" and "Not Again" in abilities and uses_of(character, "Not Again") < 1


SCAR_SLOTS = 4        # the fourth scar is fatal (p. 74)
# The longest scar kept. The scar form's description is capped 40 characters short of it,
# room for the shift note it adds (ScarModal.jsx, SCAR_DESCRIPTION_MAX in game/actions.js).
SCAR_TEXT_MAX = 500
SCAR_TOO_LONG = f"A scar is a description of up to {SCAR_TEXT_MAX} characters."


def _apply_scar(ctx, payload, character):
    """A scar may only move a point between two of the nine action ratings. Any other
    name used to reach every numeric column, including campaign_id and user_id. A scar
    without a shift needs Hardened or one of the other cases in may_keep_ratings. A scar
    taken for an ability needs the ability, and Not Again an unused one. Its words are
    text of up to SCAR_TEXT_MAX characters: a longer scar, or one that was not text, used
    to be stored as it came."""
    text = payload.get("scar_text")
    if text is not None and (not isinstance(text, str) or len(text) > SCAR_TEXT_MAX):
        _invalid(SCAR_TOO_LONG)
    for key in ("shift_down", "shift_up"):
        name = payload.get(key)
        if name and name not in ALL_ACTIONS:
            _forbid()
    # A scar taken for Not Again or Forbidden Ritual (vtt/ability_uses.py SCAR_ABILITIES)
    ability = scar_ability(payload)
    if ability is not None:
        use = SCAR_ABILITIES.get(ability) if isinstance(ability, str) else None
        if use is None:
            _invalid("No ability takes a scar that way.")
        if ability not in abilities_of(character):
            raise Rejected(409, f"{character.name} does not have {ability}.")
        if use.get("once") and uses_of(character, ability) >= 1:
            raise Rejected(409, f"{ability} is used for this assignment.")
        if use.get("keeps_ratings"):
            return
    keeps = payload.get("skip_shifts") or not (payload.get("shift_down") and payload.get("shift_up"))
    if keeps and not may_keep_ratings(character, payload):
        _invalid(KEEP_RATINGS_REFUSED)


def _gm_update_scars(ctx, payload, character):
    """The Lightkeeper's correction of a member's scars: the list as it should be, and the
    list the trauma record showed when the change was made (previous). There are at most
    four. Each scar the Lightkeeper rewords is a description, trimmed, not empty, of up to
    SCAR_TEXT_MAX characters. A scar left as it was (one in previous, which the handler
    holds to the stored list) is not checked again: one stored before the limit, longer
    than it, used to block removing any other scar."""
    _gm_only(ctx, payload, character)
    scars, previous = payload.get("scars"), payload.get("previous")
    if not isinstance(scars, list) or not isinstance(previous, list) \
            or not all(isinstance(scar, str) for scar in scars):
        _invalid("Scars are a list of descriptions.")
    if len(scars) > SCAR_SLOTS:
        _invalid(f"An investigator has at most {SCAR_SLOTS} scars.")
    kept = {scar for scar in previous if isinstance(scar, str)}
    reworded = [scar for scar in scars if scar not in kept]
    if not all(scar.strip() for scar in reworded):
        _invalid("A scar needs a description. Remove it instead of leaving it blank.")
    if any(len(scar.strip()) > SCAR_TEXT_MAX for scar in reworded):
        _invalid(SCAR_TOO_LONG)


def _take_mark(ctx, payload, character):
    """The three mark tracks only. An unknown track used to be set on the loaded object
    and sent back as if it were a mark."""
    m_type = payload.get("mark_type")
    if m_type and m_type not in MARK_TYPES:
        _invalid("Unknown mark type.")


def _update_gear(ctx, payload, character):
    """Gear is a list of item names. A list holding anything else used to be saved,
    and then building the log line raised and ended the socket. Gear written in by name
    (the sheet's blank gear line, rulebook p. 53) is a name of up to 80 characters."""
    gear = payload.get("gear", [])
    if isinstance(gear, list) and not all(isinstance(item, str) for item in gear):
        _invalid("Gear items must be text.")
    if isinstance(gear, list) and not all(item.strip() and len(item) <= 80 for item in gear):
        _invalid("A gear item is a name of up to 80 characters.")


def _roll(ctx, payload, character):
    """A negative drive_spent used to raise the drive above its maximum and commit that
    before the empty pool failed (QUIRK D15). It is refused before anything changes.
    A value that is not a number still reaches the handler, which answers roll_error
    as it always has. Spending more than the drive holds is a rules question
    (RULES_CHECK.md item 5) and is left as it is."""
    try:
        spent = int(payload.get("drive_spent", 0))
    except (TypeError, ValueError, OverflowError):  # OverflowError: JSON's Infinity
        return
    if spent < 0:
        _invalid("Drive spent cannot be negative.")


def _chat_message(ctx, payload, character):
    _sender_campaign(ctx)
    if str(payload.get("target", "@Circle")).lower() == "@environment" and not ctx.is_gm:
        _forbid()


def _add_notebook_entry(ctx, payload, character):
    raw = payload.get("campaign_id")
    if not raw:
        return  # the handler ignores the message
    try:
        campaign_id = int(raw)
    except (TypeError, ValueError):
        return  # the handler raises on it, as it always has
    if ctx.db.query(Campaign.id).filter(Campaign.id == campaign_id).first() is None:
        _not_found("Campaign")
    if _sender_campaign(ctx) != campaign_id:
        _forbid()
    gm_entry = (payload.get("author_type") == "gm" or payload.get("entry_type") == "lightkeeper"
                or payload.get("visibility") == "gm_only")
    if gm_entry and not ctx.is_gm:
        _forbid()


RULES = {
    "gm_update_tension": _gm_only,
    "gm_update_circle": _gm_update_circle,
    "gm_timer": _gm_circle,
    "gm_transition_scene": _gm_only,
    "gm_toggle_resource_edit": _gm_circle,
    "gm_toggle_reports": _gm_circle,
    "gm_advance_circle": _gm_circle,
    "refill_resources": _gm_circle,
    "gm_end_assignment": _gm_circle,
    "gm_reset_character": _gm_only,
    "update_circle": _gm_circle,
    "gm_update_scars": _gm_update_scars,
    "intercept_mark": _intercept_mark,
    "spend_resource": _spend_resource,
    "submit_assignment_report": _member_circle_vote,
    "circle_creation_vote": _circle_creation_vote,
    "circle_backstory_update": _circle_backstory_update,
    "circle_relationship_propose": _circle_relationship_propose,
    "circle_relationship_respond": _circle_relationship_respond,
    "apply_scar": _apply_scar,
    "take_mark": _take_mark,
    "update_gear": _update_gear,
    "roll": _roll,
    "chat_message": _chat_message,
    "add_notebook_entry": _add_notebook_entry,
}


# Types whose handlers post to the campaign fixed at connect (ctx.camp_code), when a
# player channel sends them. chat_message is here too, because its handler can read
# the character's campaign from the socket's session, which may be stale.
PLAYER_CAMPAIGN_BROADCASTS = frozenset({
    "roll", "resolve_gilded", "use_post_roll_ability", "burn_resistance",
    "take_mark", "resolve_ability_mark", "intercept_mark",
    "revive_character", "update_gear", "apply_advancement",
    "spend_resource", "submit_assignment_report", "circle_creation_vote", "circle_backstory_update",
    "circle_personal_answer", "circle_relationship_propose", "circle_relationship_respond",
    "chat_message", "add_notebook_entry", "use_ability",
})


def _still_in_connect_campaign(ctx):
    """A player channel that opened with a campaign may post to it only while its
    character is still an active member of that campaign. A player who
    was rejected, retired or moved to another campaign keeps an open socket, but it
    no longer reaches the old campaign (403 until the client reconnects)."""
    me = character_facts(ctx.db, ctx.own_char_id)
    if me is None or me.campaign_id != ctx.camp_id or me.status not in MEMBER_STATUSES:
        _forbid()


def check_message(ctx, action, payload, character):
    if ctx.is_gm and campaign_facts(ctx.db, ctx.camp_id) is None:
        # The campaign was deleted while its GM's socket was open. Deleting it closes
        # that socket, but a message can still arrive before the close does.
        _not_found("Campaign")
    if not ctx.is_gm and ctx.camp_id is not None and action in PLAYER_CAMPAIGN_BROADCASTS:
        _still_in_connect_campaign(ctx)
    rule = RULES.get(action)
    if rule is not None:
        rule(ctx, payload, character)
