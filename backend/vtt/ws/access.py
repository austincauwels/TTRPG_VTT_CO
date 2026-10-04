"""Who may open which channel, and who may send which message type.

The rules follow the "should be allowed" column of docs/refactor/WEBSOCKET.md and are
listed in docs/refactor/AUTH.md. A rejected message raises Rejected; the endpoint
answers it with an action_rejected frame to the sender and handles nothing. Facts
are read with column queries (vtt.auth), so the socket's long-lived session never
decides on a stale copy of a row.
"""
from models import Campaign, Character, Circle, Relationship
from vtt.auth import MEMBER_STATUSES, NOT_ALLOWED, character_facts

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


def resolve_channel(db, user_id, game_id):
    """(character, campaign, is_gm) for a channel the user may open, or a close code.

    A numeric game_id is a character's channel and only its owner may open it; the
    campaign is then the character's own (none for an unaffiliated character). Any
    other game_id is a campaign code and only that campaign's GM may open it. When an
    all-digit campaign code equals a character id, the owner gets the character
    channel and the GM gets the campaign channel.
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
    "gm_update_tension", "gm_update_circle", "gm_transition_scene", "gm_toggle_resource_edit",
    "gm_toggle_reports", "gm_advance_circle", "refill_resources", "gm_end_assignment",
    "gm_reset_character", "update_circle",
})

# A GM socket may aim these at a character of its campaign with payload.character_id.
# Every other type acts for a character only on that character's own socket.
GM_MAY_TARGET = frozenset({
    "gm_update_tension", "gm_reset_character", "update_drive", "take_mark", "revive_character", "update_gear",
})


def check_target(ctx, action, character, named_in_payload):
    """The character a message acts on (payload.character_id, else the socket's own).

    A player socket may only act for its own character. A GM socket may only aim the
    GM_MAY_TARGET types at a character of its own campaign. A character_id that
    matches no character is 404.
    """
    if character is None:
        if named_in_payload:
            _not_found("Character")
        return
    if ctx.is_gm:
        facts = character_facts(ctx.db, character.id)
        if action not in GM_MAY_TARGET or facts is None or facts.campaign_id is None \
                or facts.campaign_id != ctx.camp_id:
            _forbid()
    elif character.id != ctx.own_char_id:
        _forbid()


def _sender_campaign(ctx, active_only=False):
    """The campaign the sender belongs to: the GM's campaign, or the campaign of the
    player's character as it is now (not as it was when the socket opened). 403 when
    the player's character is not a member (active only, when active_only is set)."""
    if ctx.is_gm:
        return ctx.camp_id
    me = character_facts(ctx.db, ctx.own_char_id)
    allowed = ("active",) if active_only else MEMBER_STATUSES
    if me is None or me.campaign_id is None or me.status not in allowed:
        _forbid()
    return me.campaign_id


def _circle_of(ctx, circle_id, campaign_id):
    """The circle must exist (404) and belong to that campaign (403)."""
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
    campaign_id = _sender_campaign(ctx, active_only=True)
    if ctx.circle is None or ctx.circle.campaign_id != campaign_id:
        _forbid()


def _member_circle_vote(ctx, payload, character):
    """submit_assignment_report and circle_creation_vote: an active member, for the
    character on their own socket (check_target), on their campaign's circle."""
    if not payload.get("character_id"):
        return  # the handler ignores the message
    _circle_of(ctx, _default_circle(ctx, payload), _sender_campaign(ctx, active_only=True))


def _circle_backstory_update(ctx, payload, character):
    if not payload.get("question_key"):
        return  # the handler ignores the message
    _circle_of(ctx, _default_circle(ctx, payload), _sender_campaign(ctx, active_only=True))


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
    campaign_id = _sender_campaign(ctx, active_only=True)
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
    _circle_of(ctx, rel.circle_id, _sender_campaign(ctx, active_only=True))


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
    "gm_transition_scene": _gm_only,
    "gm_toggle_resource_edit": _gm_circle,
    "gm_toggle_reports": _gm_circle,
    "gm_advance_circle": _gm_circle,
    "refill_resources": _gm_circle,
    "gm_end_assignment": _gm_circle,
    "gm_reset_character": _gm_only,
    "update_circle": _gm_circle,
    "intercept_mark": _intercept_mark,
    "spend_resource": _spend_resource,
    "submit_assignment_report": _member_circle_vote,
    "circle_creation_vote": _member_circle_vote,
    "circle_backstory_update": _circle_backstory_update,
    "circle_relationship_propose": _circle_relationship_propose,
    "circle_relationship_respond": _circle_relationship_respond,
    "chat_message": _chat_message,
    "add_notebook_entry": _add_notebook_entry,
}

assert GM_ONLY == {t for t, rule in RULES.items() if rule in (_gm_only, _gm_circle, _gm_update_circle)}


def check_message(ctx, action, payload, character):
    rule = RULES.get(action)
    if rule is not None:
        rule(ctx, payload, character)
