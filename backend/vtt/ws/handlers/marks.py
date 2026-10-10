"""Marks and the ability offers around them: take_mark, resolve_ability_mark and intercept_mark.

Every mark lands through apply_mark (rulebook p. 14): a fourth mark in a track drops
the character incapacitated and asks for a scar, unless Endurance saves them. Every
mark that lands, the fourth and one Endurance saves included, offers Let Them In and
Adrenaline Rush; one that does not incapacitate also offers the allies' Behind Me and
Premonitions. The roll handler's Back Against the Wall cost and Bending
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
from vtt.abilities import MARK_TYPES, WARD, abilities_of, count_use, resistance_left, spend_use, uses_of
from vtt.serializers import get_char_dict
from vtt.ws.handlers.circle import announce_downed
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
# Characters whose fourth mark asked for a scar not yet recorded (handle_apply_scar
# clears it). Resuscitation reads it: a scar still waiting counts. In memory only.
awaiting_scar: set = set()
# character id -> how many Adrenaline Rush offers are open
_pending_rush: dict = {}

NO_RUSH_WAITING = "No Adrenaline Rush is waiting to be used."

# (target character id, mark type) -> when each offered mark was offered (monotonic)
_interceptable: dict = {}
INTERCEPT_WINDOW = 120  # seconds an ally may still answer an offered mark
# ally id -> deadlines of the Non-Combatant drive points they were offered, one per mark
_non_combatant: dict = {}
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
    # A Circle of Protection around them (Ritual, p. 27) soaks a Body mark at no cost, so
    # it is offered first
    ward = [{"ability": "Circle of Protection", "resist_key": None}] \
        if m_type == "body" and uses_of(character, WARD) >= 1 else []
    return ward + [{"ability": name, "resist_key": drive} for name, drive in SOAKS.get(m_type, [])
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
                await _after_mark_taken(ctx, character, channel, m_type, abilities)
                return
            await _log(ctx, character, f"{character.name} used Endurance — rolled {endurance_roll}, no 6. Incapacitated.", "danger")

    if val >= 4:
        setattr(character, f"{m_type}_marks", 0)
        character.incapacitated = True
        db.commit()
        awaiting_scar.add(character.id)
        await manager.broadcast(channel, {"type": "trigger_scar", "payload": {
            "character_id": character.id, "mark_type": m_type, "character": get_char_dict(character)}})
        await _log(ctx, character, f"{character.name} has been incapacitated!", "danger")
        await announce_downed(ctx)
        # The fourth mark is taken, as a scar (p. 14), so it is answered too
        await _after_mark_taken(ctx, character, channel, m_type, abilities)
        return

    setattr(character, f"{m_type}_marks", val)
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})

    await _after_mark_taken(ctx, character, channel, m_type, abilities)
    if offer_intercepts:
        await _offer_intercepts(ctx, character, m_type)


async def _after_mark_taken(ctx, character, channel, m_type, abilities):
    """Let Them In ("Whenever you take 1 or more Bleed marks", p. 27), Adrenaline Rush
    ("For each mark you take", p. 27) and Non-Combatant answer every mark that lands: an
    ordinary one, the fourth, one Endurance kept from incapacitating them, and one taken
    as a cost."""
    if m_type == "bleed" and "Let Them In" in abilities:
        await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
            "ability": "Let Them In", "mark_type": m_type, "character_id": character.id, "action": "info"}})
    if "Adrenaline Rush" in abilities:
        await _offer_rush(character, channel, m_type)
    if "Non-Combatant" in abilities:
        await _offer_non_combatant(ctx, character, m_type)


async def _offer_non_combatant(ctx, doctor, m_type):
    """Non-Combatant (p. 30): "If you haven't hurt anyone yet during this assignment, when
    you take a mark, each of your allies in the scene can recover 1 drive point of their
    choice." Each active member of the campaign is offered one, for INTERCEPT_WINDOW
    seconds; whether the Doctor has hurt anyone, and who is in the scene, is the table's
    call, and an offer can be let go."""
    if not ctx.camp_id:
        return
    allies = ctx.db.query(Character).filter(
        Character.campaign_id == ctx.camp_id, Character.status == "active", Character.id != doctor.id,
        Character.is_dead.isnot(True)).all()
    now = time.monotonic()
    for ally in allies:
        _non_combatant[ally.id] = [t for t in _non_combatant.get(ally.id, []) if t > now] + [now + INTERCEPT_WINDOW]
        await manager.broadcast(character_key(ally.id), {"type": "ability_mark_offer", "payload": {
            "ability": "Non-Combatant", "mark_type": m_type, "character_id": doctor.id,
            "character_name": doctor.name, "action": "drive_refresh", "expires_in": INTERCEPT_WINDOW}})


async def _offer_intercepts(ctx, character, m_type):
    """Behind Me and Premonitions offers to the character's fellow members. Each says how
    long it stays open (expires_in, seconds), so the ally's card lasts as long as the
    server takes an answer: it vanished after 20 seconds (playtest, ability-offers-expire)."""
    candidates = ctx.db.query(Character).filter(
        Character.campaign_id == ctx.camp_id,
        Character.status == "active",
        Character.is_dead.isnot(True),
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
                "character_name": character.name, "action": "intercept", "expires_in": INTERCEPT_WINDOW}})
        if "Premonitions" in other_abilities and resistance_left(other, "intuition") > 0:
            await manager.broadcast(character_key(other.id), {"type": "ability_intercept_offer", "payload": {
                "ability": "Premonitions", "mark_type": m_type, "character_id": character.id,
                "character_name": character.name, "action": "soak", "expires_in": INTERCEPT_WINDOW}})


async def _land(ctx, character, held, channel):
    """The marks an offer held: its own, and any more of the same harm (Death Defy)."""
    for m_type in [held["mark_type"], *held.get("more", [])]:
        await apply_mark(ctx, character, m_type, channel, held["offer_intercepts"])


async def _offer_defy(character, channel, held):
    count = 1 + len(held.get("more", []))
    await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": {
        "ability": "Death Defy", "mark_type": held["mark_type"], "character_id": character.id,
        "action": "escape", "count": count}})


async def mark_or_offer(ctx, character, m_type, channel, *, is_from_enemy=False, offer_intercepts=True,
                        soaks=True):
    """take_mark's flow: a soak offer, then Death Defy for an enemy's mark, then the mark.
    A mark an open offer still holds lands first, as if that offer were declined (a new
    mark, or Behind Me taking an ally's mark, used to replace it, and it was lost).

    Death Defy escapes "1 or more marks from an enemy" (p. 27): another enemy mark that
    arrives while it is offered is taken as part of the same harm. It waits with the
    first, the offer counts it, and one use escapes them all."""
    held = _pending_marks.pop(character.id, None)
    if held and held.get("stage") == "escape" and is_from_enemy:
        held["more"] = [*held.get("more", []), m_type]
        _pending_marks[character.id] = held
        await _offer_defy(character, channel, held)
        return
    if held:
        await _land(ctx, character, held, channel)
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
        await _offer_defy(character, channel, _pending_marks[character.id])
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
        await _land(ctx, character, pending, ctx.channel)


async def handle_resolve_ability_mark(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    ab_name = payload.get("ability")
    choice = payload.get("choice")
    abilities = abilities_of(character)
    if ab_name == "Non-Combatant":
        # An ally's answer to the Doctor's mark (_offer_non_combatant): not their ability
        if choice not in ("nerve", "cunning", "intuition"):
            return
        now = time.monotonic()
        waiting = [t for t in _non_combatant.get(character.id, []) if t > now]
        if not waiting:
            _non_combatant.pop(character.id, None)
            await _refuse(ctx, "resolve_ability_mark", 409, "No Non-Combatant drive point is waiting.")
            return
        _non_combatant[character.id] = waiting[1:]
        setattr(character, f"{choice}_current", min(getattr(character, f"{choice}_max", 0) or 0,
                                                    (getattr(character, f"{choice}_current", 0) or 0) + 1))
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} recovered 1 {choice.capitalize()} (Non-Combatant).")
        return
    if ab_name == "Circle of Protection":
        # The ward an ally's Ritual put around them: it is theirs to use, not an ability
        if choice == "decline":
            await _let_the_mark_land(ctx, character, payload, "soak")
            return
        held = _pending_marks.get(character.id)
        if uses_of(character, WARD) < 1 or not held or held["mark_type"] != "body":
            await _refuse(ctx, "resolve_ability_mark", 409, "No Circle of Protection is holding a Body mark back.")
            if held:
                await _let_the_mark_land(ctx, character, payload, "soak")
            return
        spend_use(character, WARD)
        _pending_marks.pop(character.id, None)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name}'s Circle of Protection soaked the Body mark.")
        return
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
        escaped = _pending_marks.pop(character.id, None)
        count = 1 + len((escaped or {}).get("more", []))
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} used Death Defy — escaped "
                   + (f"{count} marks " if count > 1 else "") + "unscathed!")


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
