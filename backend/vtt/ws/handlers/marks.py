"""Marks and the ability offers around them: take_mark, resolve_ability_mark and intercept_mark.

Every mark lands through apply_mark (rulebook p. 14): a fourth mark in a track drops
the character incapacitated and asks for a scar, unless Endurance saves them, and a
mark that does not incapacitate offers Let Them In, Adrenaline Rush and the allies'
Behind Me and Premonitions. The roll handler's Back Against the Wall cost and Bending
Spoons use it too (vtt/ws/handlers/rolls.py).

Before a mark lands, mark_or_offer offers a soak (Compartmentalization, Steel Mind, In
the Trenches) and then, for a mark from an enemy, Death Defy. The mark waits in
_pending_marks while an offer is open: using the ability spends it, and declining it
(the desk's "Take the mark", or its countdown running out) lets the mark land
(RULES_CHECK.md items 10, 11 and 22). Adrenaline Rush can be claimed once per offer
(_pending_rush). Both are in memory: after a restart an open offer's decline still
lands the mark it names, and an Adrenaline Rush offer is gone.

A mark that sends the allies Behind Me and Premonitions offers opens one answer
(_interceptable, for INTERCEPT_WINDOW seconds): the first ally to answer takes it, and
later answers, or answers with no mark waiting, are refused, so one mark is never
removed twice.
"""
import secrets
import time

from sqlalchemy import or_

from models import Character
from vtt.abilities import MARK_TYPES, abilities_of, count_use, resistance_left, uses_of
from vtt.serializers import get_char_dict
from vtt.ws.manager import character_key, manager

# Abilities that can intercept marks on other players — used for efficient DB filtering
INTERCEPT_ABILITIES = {"Behind Me", "Premonitions"}

# The soaks for each track and the resistance each burns. Each works once per assignment
# (rulebook pp. 28 to 30). Back Against the Wall is not a soak: it is a roll cost
# (RULES_CHECK.md item 21).
SOAKS = {
    "brain": [("Compartmentalization", "nerve"), ("Steel Mind", "intuition")],
    "body":  [("In the Trenches", "cunning")],
}
SOAK_RESISTANCE = {name: drive for options in SOAKS.values() for name, drive in options}
ONCE_PER_ASSIGNMENT = {"Compartmentalization": 1, "Steel Mind": 1, "In the Trenches": 1, "Death Defy": 1}

# character id -> the mark an open soak or Death Defy offer holds back
_pending_marks: dict = {}
# character id -> how many Adrenaline Rush offers are open
_pending_rush: dict = {}

NO_RUSH_WAITING = "No Adrenaline Rush is waiting to be used."

# (target character id, mark type) -> when each offered mark was offered (monotonic)
_interceptable: dict = {}
INTERCEPT_WINDOW = 120  # seconds an ally may still answer an offered mark
NO_MARK_TO_ANSWER = "No ally's mark is waiting for that, or another ally answered it first."


def open_intercept(target_id, m_type):
    """A mark on target_id was offered to the allies: one of them may answer it."""
    _interceptable.setdefault((target_id, m_type), []).append(time.monotonic())


def _take_intercept(target_id, m_type) -> bool:
    """Uses up the oldest answerable offer of this mark, if one is still open."""
    key = (target_id, m_type)
    now = time.monotonic()
    open_ones = [t for t in _interceptable.get(key, []) if now - t < INTERCEPT_WINDOW]
    if not open_ones:
        _interceptable.pop(key, None)
        return False
    open_ones.pop(0)
    if open_ones:
        _interceptable[key] = open_ones
    else:
        _interceptable.pop(key, None)
    return True


async def _refuse(ctx, action, status, detail):
    await manager.broadcast(ctx.channel, {"type": "action_rejected", "payload": {
        "action": action, "status": status, "detail": detail}})


def _log(ctx, character, message, log_type="field"):
    return manager.broadcast_campaign(ctx.camp_code, ctx.camp_id, {
        "type": "activity_log",
        "payload": {"message": message, "log_type": log_type, "ink_color": getattr(character, "ink_color", "") or ""},
    }, ctx.db)


def can_soak(character, ability) -> bool:
    """The character has the soak, has not used it this assignment, and has a point of
    its resistance left to burn."""
    drive = SOAK_RESISTANCE.get(ability)
    return (drive is not None and ability in abilities_of(character)
            and uses_of(character, ability) < ONCE_PER_ASSIGNMENT[ability]
            and resistance_left(character, drive) > 0)


def _soak_options(character, m_type):
    return [{"ability": name, "resist_key": drive} for name, drive in SOAKS.get(m_type, [])
            if can_soak(character, name)]


def _can_defy(character) -> bool:
    return "Death Defy" in abilities_of(character) and uses_of(character, "Death Defy") < 1


async def _offer_rush(character, channel, m_type):
    _pending_rush[character.id] = _pending_rush.get(character.id, 0) + 1
    await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
        "ability": "Adrenaline Rush", "mark_type": m_type, "character_id": character.id, "action": "drive_refresh"}})


async def apply_mark(ctx, character, m_type, channel, offer_intercepts=True):
    """The mark lands on the character, whose channel is channel. Commits."""
    db = ctx.db
    abilities = abilities_of(character)
    val = (getattr(character, f"{m_type}_marks", 0) or 0) + 1

    if val >= 4 and "Endurance" in abilities:
        # Endurance (p. 27): roll a die per Nerve resistance point left; a 6 keeps them standing
        remaining = resistance_left(character, "nerve")
        if remaining > 0:
            endurance_roll = [secrets.randbelow(6) + 1 for _ in range(remaining)]
            if any(d == 6 for d in endurance_roll):
                setattr(character, f"{m_type}_marks", 3)
                db.commit()
                await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
                await _log(ctx, character, f"{character.name} used Endurance! Rolled {endurance_roll} — a 6 saves them from incapacitation!")
                if "Adrenaline Rush" in abilities:
                    await _offer_rush(character, channel, m_type)
                return
            await _log(ctx, character, f"{character.name} used Endurance — rolled {endurance_roll}, no 6. Incapacitated.", "danger")

    if val >= 4:
        setattr(character, f"{m_type}_marks", 0)
        character.incapacitated = True
        db.commit()
        await manager.broadcast(channel, {"type": "trigger_scar", "payload": {
            "character_id": character.id, "mark_type": m_type, "character": get_char_dict(character)}})
        await _log(ctx, character, f"{character.name} has been incapacitated!", "danger")
        # The fourth mark is taken, as a scar (p. 14): Let Them In ("Whenever you take 1 or
        # more Bleed marks") and Adrenaline Rush ("For each mark you take") answer it too
        if m_type == "bleed" and "Let Them In" in abilities:
            await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
                "ability": "Let Them In", "mark_type": m_type, "character_id": character.id, "action": "info"}})
        if "Adrenaline Rush" in abilities:
            await _offer_rush(character, channel, m_type)
        return

    setattr(character, f"{m_type}_marks", val)
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})

    # Let Them In: informational notification on Bleed mark
    if m_type == "bleed" and "Let Them In" in abilities:
        await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
            "ability": "Let Them In", "mark_type": m_type, "character_id": character.id, "action": "info"}})
    if "Adrenaline Rush" in abilities:
        await _offer_rush(character, channel, m_type)
    if offer_intercepts:
        await _offer_intercepts(ctx, character, m_type)


async def _offer_intercepts(ctx, character, m_type):
    """Behind Me and Premonitions offers to the character's fellow members."""
    candidates = ctx.db.query(Character).filter(
        Character.campaign_id == ctx.camp_id,
        Character.status == "active",
        Character.id != character.id,
        or_(*[Character.role_ability.contains(a) for a in INTERCEPT_ABILITIES],
            *[Character.specialty_ability.contains(a) for a in INTERCEPT_ABILITIES]),
    ).all() if ctx.camp_id else []
    if candidates:
        open_intercept(character.id, m_type)
    for other in candidates:
        other_abilities = abilities_of(other)
        if "Behind Me" in other_abilities and (other.nerve_current or 0) >= 1:
            await manager.broadcast(character_key(other.id), {"type": "ability_intercept_offer", "payload": {
                "ability": "Behind Me", "mark_type": m_type, "character_id": character.id,
                "character_name": character.name, "action": "intercept"}})
        if "Premonitions" in other_abilities and resistance_left(other, "intuition") > 0:
            await manager.broadcast(character_key(other.id), {"type": "ability_intercept_offer", "payload": {
                "ability": "Premonitions", "mark_type": m_type, "character_id": character.id,
                "character_name": character.name, "action": "soak"}})


async def mark_or_offer(ctx, character, m_type, channel, *, is_from_enemy=False, offer_intercepts=True,
                        soaks=True):
    """take_mark's flow: a soak offer, then Death Defy for an enemy's mark, then the mark.
    A mark an open offer still holds lands first, as if that offer were declined (a new
    mark, or Behind Me taking an ally's mark, used to replace it, and it was lost)."""
    held = _pending_marks.pop(character.id, None)
    if held:
        await apply_mark(ctx, character, held["mark_type"], channel, held["offer_intercepts"])
    pending = {"mark_type": m_type, "is_from_enemy": bool(is_from_enemy), "offer_intercepts": offer_intercepts}
    options = _soak_options(character, m_type) if soaks else []
    if options:
        _pending_marks[character.id] = {**pending, "stage": "soak"}
        await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
            "ability": options[0]["ability"], "mark_type": m_type, "character_id": character.id,
            "options": options, "action": "soak"}})
        return
    if is_from_enemy and _can_defy(character):
        _pending_marks[character.id] = {**pending, "stage": "escape"}
        await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
            "ability": "Death Defy", "mark_type": m_type, "character_id": character.id, "action": "escape"}})
        return
    _pending_marks.pop(character.id, None)
    await apply_mark(ctx, character, m_type, channel, offer_intercepts)


async def handle_take_mark(ctx):
    m_type = ctx.payload.get("mark_type")
    if m_type:
        # A mark an open offer still holds lands first (mark_or_offer). Whether an enemy dealt the mark is the table's call, and the desk does not ask,
        # so Death Defy is offered unless the payload says the mark is not from an enemy
        # (is_from_enemy false). The offer asks the player (RULES_CHECK.md item 24).
        await mark_or_offer(ctx, ctx.character, m_type, ctx.channel,
                            is_from_enemy=ctx.payload.get("is_from_enemy") is not False)


async def _let_the_mark_land(ctx, character, payload, after):
    """A declined soak or Death Defy: the held mark goes on (after a declined soak, Death
    Defy can still be offered for an enemy's mark). Without a held mark (a restart),
    the payload's mark_type lands."""
    pending = _pending_marks.pop(character.id, None)
    if pending is None:
        m_type = payload.get("mark_type")
        if m_type not in MARK_TYPES:
            return
        pending = {"mark_type": m_type, "is_from_enemy": False, "offer_intercepts": True}
    if after == "soak":
        await mark_or_offer(ctx, character, pending["mark_type"], ctx.channel, soaks=False,
                            is_from_enemy=pending["is_from_enemy"], offer_intercepts=pending["offer_intercepts"])
    else:
        await apply_mark(ctx, character, pending["mark_type"], ctx.channel, pending["offer_intercepts"])


async def handle_resolve_ability_mark(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    ab_name = payload.get("ability")
    choice = payload.get("choice")
    abilities = abilities_of(character)
    if ab_name not in abilities:
        return

    if ab_name == "Adrenaline Rush":
        if choice not in ("nerve", "cunning", "intuition"):
            return
        if _pending_rush.get(character.id, 0) < 1:
            await _refuse(ctx, "resolve_ability_mark", 409, NO_RUSH_WAITING)
            return
        _pending_rush[character.id] -= 1
        max_val = getattr(character, f"{choice}_max", 3)
        setattr(character, f"{choice}_current", min(max_val, getattr(character, f"{choice}_current") + 1))
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} used Adrenaline Rush — refreshed 1 {choice.capitalize()}.")

    elif ab_name in SOAK_RESISTANCE:
        if choice == "decline":
            await _let_the_mark_land(ctx, character, payload, "soak")
            return
        if not can_soak(character, ab_name):
            await _refuse(ctx, "resolve_ability_mark", 409,
                          f"{ab_name} cannot soak this mark: it is used for this assignment or no "
                          f"{SOAK_RESISTANCE[ab_name].capitalize()} resistance is left.")
            if character.id in _pending_marks:
                await _let_the_mark_land(ctx, character, payload, "soak")
            return
        rkey = SOAK_RESISTANCE[ab_name]
        setattr(character, f"{rkey}_resistance_spent", (getattr(character, f"{rkey}_resistance_spent", 0) or 0) + 1)
        count_use(character, ab_name)
        _pending_marks.pop(character.id, None)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} used {ab_name} — soaked the mark.")

    elif ab_name == "Death Defy":
        if choice == "decline" or not _can_defy(character):
            if choice == "decline" or character.id in _pending_marks:
                await _let_the_mark_land(ctx, character, payload, "escape")
            return
        count_use(character, "Death Defy")
        _pending_marks.pop(character.id, None)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} used Death Defy — escaped unscathed!")


async def handle_intercept_mark(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    ab_name = payload.get("ability")
    target_id = payload.get("target_character_id")
    m_type = payload.get("mark_type")
    abilities = abilities_of(character)
    if m_type not in MARK_TYPES:
        return

    if ab_name == "Behind Me" and ab_name in abilities and (character.nerve_current or 0) >= 1:
        # Only a mark just offered to the allies, and only one ally per mark
        target_char = db.query(Character).filter(Character.id == target_id).first()
        if target_char is None or (getattr(target_char, f"{m_type}_marks", 0) or 0) < 1 \
                or not _take_intercept(target_id, m_type):
            await _refuse(ctx, "intercept_mark", 409, NO_MARK_TO_ANSWER)
            return
        character.nerve_current = max(0, character.nerve_current - 1)

        # Remove the mark from the target (they no longer take it)
        setattr(target_char, f"{m_type}_marks", max(0, (getattr(target_char, f"{m_type}_marks", 0) or 0) - 1))
        db.commit()
        if target_char:
            await manager.broadcast(character_key(target_id), {"type": "character_update", "payload": get_char_dict(target_char)})
        await _log(ctx, character, f"{character.name} used Behind Me to intercept a mark for {target_char.name if target_char else 'an ally'}!")

        # The interceptor takes the mark as they would any other: their own soaks first
        await mark_or_offer(ctx, character, m_type, channel, offer_intercepts=False)

    elif ab_name == "Premonitions" and ab_name in abilities:
        # Premonitions (p. 32): burn an Intuition resistance to warn the ally, who soaks
        # one of the marks (RULES_CHECK.md item 23)
        if resistance_left(character, "intuition") < 1:
            return
        target_char = db.query(Character).filter(Character.id == target_id).first()
        if target_char is None or (getattr(target_char, f"{m_type}_marks", 0) or 0) < 1:
            await _refuse(ctx, "intercept_mark", 409, "There is no such mark to soak.")
            return
        if not _take_intercept(target_id, m_type):
            await _refuse(ctx, "intercept_mark", 409, NO_MARK_TO_ANSWER)
            return
        character.intuition_resistance_spent = (character.intuition_resistance_spent or 0) + 1
        setattr(target_char, f"{m_type}_marks", getattr(target_char, f"{m_type}_marks") - 1)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await manager.broadcast(character_key(target_char.id), {"type": "character_update", "payload": get_char_dict(target_char)})
        await _log(ctx, character, f"{character.name} used Premonitions — soaked the mark!")
