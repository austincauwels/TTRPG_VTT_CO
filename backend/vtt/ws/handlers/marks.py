"""Marks and the ability offers around them: take_mark, resolve_ability_mark and intercept_mark.

Every mark lands through apply_mark (rulebook p. 14): a fourth mark in a track drops
the character incapacitated and asks for a scar, unless Endurance saves them. Every
mark that lands, the fourth and one Endurance saves included, offers Let Them In and
Adrenaline Rush; one that does not incapacitate also offers the allies' Behind Me and
Premonitions. The roll handler's Back Against the Wall cost and Bending
Spoons use it too (vtt/ws/handlers/rolls.py).

Before a mark lands, mark_or_offer offers a soak (Compartmentalization, Steel Mind, In
the Trenches) and then, for a mark from an enemy, Death Defy. The mark waits, with its
offer, in the character's held_mark column while the offer is open: using the ability
spends it, and declining it (the desk's "Take the mark", or its countdown running out)
lets the mark land (RULES_CHECK.md items 10, 11 and 22). It is stored, not kept in
memory, so a held mark and its offer survive a restart and come back to the desk with
the same offer_id (fix round 6, #17 and #18). A message that lets it go (an answer, or
another mark) takes it off the stored row first (_take_held), so the player's answer and a
mark the Lightkeeper deals, on two sockets, never both act on it. Adrenaline Rush can be claimed once per
offer (_pending_rush), which is in memory: after a restart it is gone, and its answer
is refused (NO_RUSH_WAITING), like the other ally offers below.

The desk draws a held mark as held, not taken, while its offer is open. A desk that
opens while a mark is held gets its offer again (send_held_mark), and when a held mark
lands because another mark came, the desk is told the offer is closed
(mark_offer_closed), so its card does not stay up and land the mark a second time when
its countdown runs out.

Each offer that holds a mark has an offer_id, which the desk sends back with its answer.
An answer already on its way when the offer closed, one to an offer already answered, one
to a Death Defy offer since counted again, or one to an offer from before an upgrade that
kept held marks in memory names an offer the server no longer holds. It is ignored
(_stale_answer) and never lands a mark, and the desk is told that offer is closed
(mark_offer_closed with dropped and its offer_id), so the marks it drew on their way go:
it used to answer the next held mark, or with nothing held land its mark again (the
"restart rule", #18). The id starts with the id of the process that made it (_BOOT), so
a new process never makes an id an earlier one gave out.

The Lightkeeper's copy of the sheet draws the held marks too: the sheet carries them
(held_marks, vtt.serializers), and each offer sends her the sheet (_offer), as every
landing, use and drop of a held mark already does (#23).

A mark that sends the allies Behind Me and Premonitions offers opens one answer
(_interceptable, for INTERCEPT_WINDOW seconds): the first ally to answer takes it, and
later answers, or answers with no mark waiting, are refused, so one mark is never
removed twice. Once it is taken the other allies are told (intercept_offer_closed), so
their cards go, and an ally's desk that opens while one is open gets its offer again
with the time left (send_open_intercepts). The Activity Log of the Lightkeeper and of each
ally offered says who was offered what, and, when the window ran out with the offer not
used, that it lapsed (_watch_lapse); no other desk gets these lines (Robert's decision 6,
playtest 3, behind-me-offer-unseen: the offer opened and lapsed unseen). Non-Combatant's
drive point, offered to every ally for the same window, is logged the same way. The watch
is in memory like the offer, so after a restart no lapse is logged, and an answer to
the offer is refused as one that came too late (NO_MARK_TO_ANSWER, and Non-Combatant's
own refusal): these offers expire cleanly (fix round 6, decision 1).

A mark that lands through mark_or_offer (one taken on the sheet, dealt by the
Lightkeeper, or taken for an ally with Behind Me) writes a line in the Activity Log with
the track's count, and names the offer the player passed on. A mark taken as an
ability's cost does not: the use's own line names it (playtest, self-mark-no-log).
"""
import asyncio
import functools
import itertools
import secrets
import time

from sqlalchemy import or_

from models import Character
from vtt.abilities import MARK_TYPES, WARD, abilities_of, count_use, resistance_left, spend_use, uses_of
from vtt.serializers import get_char_dict
from vtt.ws.handlers.circle import announce_downed, announce_status
from vtt.ws.manager import campaign_key, character_key, manager

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
# The offers that hold the character's own mark until they are answered
HOLDS_A_MARK = {"Circle of Protection", "Death Defy", *SOAK_RESISTANCE}

# The ids of the offers that hold a mark: this process's own, then a count
_BOOT = secrets.token_hex(4)
_offer_ids = itertools.count(1)
# Characters whose fourth mark asked for a scar not yet recorded (handle_apply_scar
# clears it): vtt.serializers keeps the set, the sheet carries it as scar_pending.
# Resuscitation reads it: a scar still waiting counts. In memory only.
# character id -> how many Adrenaline Rush offers are open
_pending_rush: dict = {}

NO_RUSH_WAITING = "No Adrenaline Rush is waiting to be used."

# (target character id, mark type) -> when each offered mark was offered (monotonic)
_interceptable: dict = {}
# (target character id, mark type) -> {"campaign_id", "character_name"} of the offered mark
_intercept_for: dict = {}
INTERCEPT_WINDOW = 120  # seconds an ally may still answer an offered mark
# (target character id, mark type, when offered) of each offered mark whose lapse is still
# watched for; an answer takes it out (_take_intercept), so the watch logs nothing
_watched: set = set()
# The running watches, kept so they are not collected before they wake
_watches: set = set()
# ally id -> deadlines of the Non-Combatant drive points they were offered, one per mark
# (an answer takes out the oldest, so that point's lapse watch, _point_waiting, logs nothing)
_non_combatant: dict = {}
NO_MARK_TO_ANSWER = "No ally's mark is waiting for that, or another ally answered it first."
# The ids of the last marks the player's desk sent (take_mark's mark_id) are kept in the
# character's taken_mark_ids. A desk whose socket went silent sends an unanswered mark again
# on its next socket, or after a reload, with the same id; one already taken is not taken
# twice (playtest 2, silent-socket-loses-mark: it was dropped, and lost). They are stored,
# so a restart in between does not take it twice either (#43).
MARK_ID_MAX = 64
MARK_IDS_KEPT = 16


def _taken_before(character, mark_id) -> bool:
    """Whether this mark was taken already; a new one is remembered, and stored with the
    mark itself by the commit that lands or holds it (mark_or_offer always commits). An id
    that is not short text is no id."""
    if not (isinstance(mark_id, str) and 0 < len(mark_id) <= MARK_ID_MAX):
        return False
    raw = character.taken_mark_ids
    seen = [m for m in raw if isinstance(m, str)] if isinstance(raw, list) else []
    if mark_id in seen:
        return True
    character.taken_mark_ids = (seen + [mark_id])[-MARK_IDS_KEPT:]
    return False


def held_mark(character):
    """What an open soak or Death Defy offer holds back for the character (a copy):
    {mark_type, more (Death Defy's further marks of the harm), is_from_enemy,
    offer_intercepts, stage ("soak" or "escape"), offer (the ability_mark_offer payload,
    with its offer_id)}, or None."""
    held = getattr(character, "held_mark", None)
    return dict(held) if isinstance(held, dict) and held.get("mark_type") in MARK_TYPES else None


def _let_go_of_held(character):
    """The held mark, no longer held; the caller's commit stores that."""
    held = held_mark(character)
    character.held_mark = None
    return held


def _take_held(ctx, character, commit=False):
    """The held mark, taken by this message alone, or None when nothing is held or another
    socket took it first. Each socket reads the character in its own session, so two of
    them (the player's Use, and a mark the Lightkeeper deals) can both read one held mark:
    the stored offer is cleared only while it is still the one read, and only the message
    that cleared it acts on it (review of #18; the in-memory hold was one shared dict).
    The caller commits before its first await, or asks for the commit here."""
    held = held_mark(character)
    if not held:
        return None
    taken = ctx.db.query(Character).filter(
        Character.id == character.id,
        Character.held_mark[("offer", "offer_id")].as_string() == held.get("offer", {}).get("offer_id"),
    ).update({Character.held_mark: None}, synchronize_session=False)
    if taken:
        character.held_mark = None
    if commit:
        ctx.db.commit()
    return held if taken else None


def open_intercept(target_id, m_type, campaign_id=None, name=None):
    """A mark on target_id was offered to the allies: one of them may answer it. Returns
    when it was offered."""
    offered_at = time.monotonic()
    _interceptable.setdefault((target_id, m_type), []).append(offered_at)
    if campaign_id is not None:
        _intercept_for[(target_id, m_type)] = {"campaign_id": campaign_id, "character_name": name}
    return offered_at


def _open_times(target_id, m_type):
    now = time.monotonic()
    return [t for t in _interceptable.get((target_id, m_type), []) if now - t < INTERCEPT_WINDOW]


def _take_intercept(target_id, m_type) -> bool:
    """Uses up the oldest answerable offer of this mark, if one is still open."""
    key = (target_id, m_type)
    open_ones = _open_times(target_id, m_type)
    if not open_ones:
        _interceptable.pop(key, None)
        _intercept_for.pop(key, None)
        return False
    _watched.discard((target_id, m_type, open_ones.pop(0)))
    if open_ones:
        _interceptable[key] = open_ones
    else:
        _interceptable.pop(key, None)
        _intercept_for.pop(key, None)
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


def _taken(character, m_type, val, passed_on=None, dealt=False) -> str:
    """The log's line for a mark that lands: "Iris took a Body mark (2 of 3).", or "took a
    fourth Body mark." when the track was full. passed_on says how the offer before it was
    let go ("passed on Death Defy", "let Death Defy run out", _let_go)."""
    took = f"took a fourth {m_type.capitalize()} mark" if val >= 4 \
        else f"took a {m_type.capitalize()} mark ({val} of 3)"
    if dealt:
        # One line for the deal and where it landed (playtest, log-lines-doubled-per-event)
        return f"The Lightkeeper dealt {character.name} a" + took[len("took a"):] + "."
    return f"{character.name} " + (f"{passed_on} and " if passed_on else "") + took + "."


def _let_go(ability, payload) -> str:
    """How the log says an offer was let go: the player's "Take the mark", or its countdown
    running out (the desk sends timed_out), which is not the player's choice."""
    return f"let {ability} run out" if payload.get("timed_out") is True else f"passed on {ability}"


async def apply_mark(ctx, character, m_type, channel, offer_intercepts=True, announce=False, passed_on=None,
                     dealt=False):
    """The mark lands on the character, whose channel is channel. Commits.

    announce: the log says so, with the track's count (_taken). mark_or_offer announces
    every mark; an ability that takes a mark as its cost does not, since its use's own
    line names the mark. passed_on says how the offer before it was let go (_taken)."""
    db = ctx.db
    abilities = abilities_of(character)
    val = (getattr(character, f"{m_type}_marks", 0) or 0) + 1

    if val >= 4 and announce:
        # Before Endurance's roll or the incapacitation, which follow from it
        await _log(ctx, character, _taken(character, m_type, val, passed_on, dealt))
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
        already_down = bool(character.incapacitated)
        setattr(character, f"{m_type}_marks", 0)
        character.incapacitated = True
        character.scar_pending = True
        db.commit()
        await manager.broadcast(channel, {"type": "trigger_scar", "payload": {
            "character_id": character.id, "mark_type": m_type, "character": get_char_dict(character)}})
        # Marks that land on one already down are another scar, not another fall
        await _log(ctx, character, f"{character.name} takes another scar: a fourth {m_type.capitalize()} mark while down."
                   if already_down else f"{character.name} has been incapacitated!", "danger")
        await announce_status(ctx, character)
        await announce_downed(ctx)
        # The fourth mark is taken, as a scar (p. 14), so it is answered too
        await _after_mark_taken(ctx, character, channel, m_type, abilities)
        return

    setattr(character, f"{m_type}_marks", val)
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
    if announce:
        await _log(ctx, character, _taken(character, m_type, val, passed_on, dealt))

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
    call, and an offer can be let go. The Lightkeeper's log and the ally's say it was
    offered, and when it lapsed unused (see the module's docstring)."""
    if not ctx.camp_id:
        return
    allies = ctx.db.query(Character).filter(
        Character.campaign_id == ctx.camp_id, Character.status == "active", Character.id != doctor.id,
        Character.is_dead.isnot(True)).order_by(Character.id).all()
    now = time.monotonic()
    window = INTERCEPT_WINDOW
    point = f"Non-Combatant drive point from {doctor.name}'s {m_type.capitalize()} mark"
    for ally in allies:
        deadline = now + window
        _non_combatant[ally.id] = [t for t in _non_combatant.get(ally.id, []) if t > now] + [deadline]
        await manager.broadcast(character_key(ally.id), {"type": "ability_mark_offer", "payload": {
            "ability": "Non-Combatant", "mark_type": m_type, "character_id": doctor.id,
            "character_name": doctor.name, "action": "drive_refresh", "expires_in": window}})
        # Logged like an ally's Behind Me offer (decision 6): an answer takes the deadline out
        await _tell_offered(ctx.camp_code, ctx.camp_id, ally.id,
                            f"{ally.name} is offered a {point} ({_window_words(window)}).")
        _watch(ctx.camp_code, ctx.camp_id, window, functools.partial(_point_waiting, ally.id, deadline),
               [(ally.id, f"{ally.name}'s {point} lapsed unused.")])


def forget_points(character_id):
    """A released or departed member: the Non-Combatant drive points their old circle's
    Doctor offered them go (a desk with no campaign is not checked against one), and so
    do their lapse lines (_point_waiting)."""
    _non_combatant.pop(character_id, None)


def _point_waiting(ally_id, deadline) -> bool:
    """Whether the ally's Non-Combatant drive point with this deadline was never taken."""
    return deadline in _non_combatant.get(ally_id, [])


def _intercept_allies(ctx, character):
    """The character's fellow members who have Behind Me or Premonitions."""
    return ctx.db.query(Character).filter(
        Character.campaign_id == ctx.camp_id,
        Character.status == "active",
        Character.is_dead.isnot(True),
        Character.id != character.id,
        or_(*[Character.role_ability.contains(a) for a in INTERCEPT_ABILITIES],
            *[Character.specialty_ability.contains(a) for a in INTERCEPT_ABILITIES]),
    ).order_by(Character.id).all() if ctx.camp_id else []


def _intercept_offers(ally, target_id, target_name, m_type, expires_in):
    """The ability_intercept_offer payloads the ally can answer a mark on target_id with."""
    abilities = abilities_of(ally)
    offers = []
    if "Behind Me" in abilities and (ally.nerve_current or 0) >= 1:
        offers.append({"ability": "Behind Me", "mark_type": m_type, "character_id": target_id,
                       "character_name": target_name, "action": "intercept", "expires_in": expires_in})
    if "Premonitions" in abilities and resistance_left(ally, "intuition") > 0:
        offers.append({"ability": "Premonitions", "mark_type": m_type, "character_id": target_id,
                       "character_name": target_name, "action": "soak", "expires_in": expires_in})
    return offers


async def _offer_intercepts(ctx, character, m_type):
    """Behind Me and Premonitions offers to the character's fellow members. Each says how
    long it stays open (expires_in, seconds), so the ally's card lasts as long as the
    server takes an answer: it vanished after 20 seconds (playtest, ability-offers-expire).
    The Lightkeeper's log and each offered ally's say who was offered, and a watch says when
    the offer lapsed unused (see the module's docstring)."""
    window = INTERCEPT_WINDOW
    offered = [(other, offers) for other in _intercept_allies(ctx, character)
               if (offers := _intercept_offers(other, character.id, character.name, m_type, window))]
    if not offered:
        # Opened only for an offer sent, so each open one has its watch (review of decision 6)
        return
    offered_at = open_intercept(character.id, m_type, ctx.camp_id, character.name)
    for other, offers in offered:
        for offer in offers:
            await manager.broadcast(character_key(other.id), {"type": "ability_intercept_offer", "payload": offer})
    mark = f"{character.name}'s {m_type.capitalize()} mark"
    lapsed = []
    for other, offers in offered:
        abilities = " or ".join(offer["ability"] for offer in offers)
        await _tell_offered(ctx.camp_code, ctx.camp_id, other.id,
                            f"{other.name} is offered {abilities} for {mark} ({_window_words(window)}).")
        lapsed.append((other.id, f"{other.name}'s {abilities} offer for {mark} lapsed unused."))
    watched = (character.id, m_type, offered_at)
    _watched.add(watched)
    _watch(ctx.camp_code, ctx.camp_id, window, functools.partial(_unwatch, watched), lapsed)


def _window_words(seconds) -> str:
    """How long an offer stays open, in the log's words: "2 minutes"."""
    if seconds >= 60 and seconds % 60 == 0:
        minutes = int(seconds // 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    return f"{seconds:g} seconds"


async def _tell_offered(camp_code, camp_id, ally_id, message):
    """A line in the Activity Log of the Lightkeeper and of the ally the offer is about, and
    no one else's. It needs no database, so a watch can send it after the message's session
    has closed."""
    line = {"type": "activity_log", "payload": {"message": message, "log_type": "field"}}
    await manager.broadcast(campaign_key(camp_code), line, camp_id)
    await manager.broadcast(character_key(ally_id), line, camp_id)


def _unwatch(watched) -> bool:
    """Whether no ally answered the watched offer of a mark; it is watched no longer."""
    if watched not in _watched:
        return False
    _watched.discard(watched)
    return True


def _watch(camp_code, camp_id, window, unused, lapsed):
    """Starts a watch on an ally offer (_watch_lapse), kept in _watches so it is not
    collected before it wakes."""
    watch = asyncio.create_task(_watch_lapse(camp_code, camp_id, window, unused, lapsed))
    _watches.add(watch)
    watch.add_done_callback(_watches.discard)


async def _watch_lapse(camp_code, camp_id, window, unused, lapsed):
    """Once the offer's window has run out: if unused() says no one took it, the Lightkeeper
    and each ally in lapsed, (ally id, line), are told it lapsed. "Unused", not
    "unanswered": an ally's Not now stays on their desk, so the server cannot tell a
    declined offer from one never seen."""
    await asyncio.sleep(window)
    if not unused():
        return
    for ally_id, message in lapsed:
        await _tell_offered(camp_code, camp_id, ally_id, message)


async def send_open_intercepts(websocket, character):
    """A desk that opens while a fellow member's mark can still be answered (a reload, a
    phone that dropped the tab) gets the offer again, with the seconds left. It was sent
    once, live, so a reload lost it while the server still took the answer (playtest 2,
    ally-offer-cards-lost-or-stale)."""
    if character.status != "active" or character.is_dead or character.campaign_id is None:
        return
    now = time.monotonic()
    for (target_id, m_type), about in list(_intercept_for.items()):
        open_ones = _open_times(target_id, m_type)
        if not open_ones:
            # its window ran out unanswered: forgotten here, or the two would only grow
            _interceptable.pop((target_id, m_type), None)
            _intercept_for.pop((target_id, m_type), None)
            continue
        if target_id == character.id or about["campaign_id"] != character.campaign_id:
            continue
        for t in open_ones:
            left = int(INTERCEPT_WINDOW - (now - t))
            if left < 1:
                continue
            for offer in _intercept_offers(character, target_id, about["character_name"], m_type, left):
                await websocket.send_json({"type": "ability_intercept_offer", "payload": offer})


async def _close_intercepts(ctx, answered_by, target, m_type):
    """The mark an ally answered: once none of that kind is left open, the other allies'
    cards for it go (intercept_offer_closed). They stayed up for the rest of the window,
    and an answer from one was refused (playtest 2, ally-offer-cards-lost-or-stale)."""
    if _open_times(target.id, m_type):
        return
    for other in _intercept_allies(ctx, target):
        if other.id != answered_by.id:
            await manager.broadcast(character_key(other.id), {"type": "intercept_offer_closed", "payload": {
                "character_id": target.id, "mark_type": m_type}})


async def _land(ctx, character, held, channel, passed_on=None):
    """The marks an offer held: its own, and any more of the same harm (Death Defy). The
    first one's log line names the offer let go."""
    for i, m_type in enumerate([held["mark_type"], *held.get("more", [])]):
        await apply_mark(ctx, character, m_type, channel, held["offer_intercepts"],
                         announce=True, passed_on=None if i else passed_on)


async def _offer(ctx, character, channel, held, offer):
    """Sends an offer that holds the character's mark, stored with it (held_mark, which
    send_held_mark sends again) and committed. Each is a new offer with its own offer_id,
    a Death Defy offer counted again too. The Lightkeeper's copy of the sheet is sent the
    sheet, which now draws the mark held (#23)."""
    offer = {**offer, "offer_id": f"{_BOOT}.{next(_offer_ids)}"}
    character.held_mark = {**held, "offer": offer}
    ctx.db.commit()
    await manager.broadcast(channel, {"type": "ability_mark_offer", "payload": offer})
    await manager.show_gm_sheet(get_char_dict(character))


def _stale_answer(character, payload) -> bool:
    """The answer names an offer the server does not hold (see the module's docstring).
    One without an offer_id (a desk loaded before ids) answers whatever is held, as it
    always did; with nothing held it lands nothing."""
    offer_id = payload.get("offer_id")
    if not isinstance(offer_id, str):
        return False
    held = held_mark(character)
    return not held or held.get("offer", {}).get("offer_id") != offer_id


async def _close_stale(ctx, character, payload):
    """The desk's card answered an offer the server does not hold: that offer is closed
    (dropped, so the marks the desk drew on their way for it go), and nothing lands."""
    m_type = payload.get("mark_type")
    await manager.broadcast(ctx.channel, {"type": "mark_offer_closed", "payload": {
        "character_id": character.id, "ability": payload.get("ability"),
        "mark_type": m_type if m_type in MARK_TYPES else None,
        "offer_id": payload.get("offer_id"), "dropped": True}})


async def _offer_defy(ctx, character, channel, held):
    # mark_types: every mark of the harm, so the desk draws each one held
    types = [held["mark_type"], *held.get("more", [])]
    await _offer(ctx, character, channel, held, {
        "ability": "Death Defy", "mark_type": held["mark_type"], "character_id": character.id,
        "action": "escape", "count": len(types), "mark_types": types})


async def send_held_mark(websocket, character):
    """A desk that opens while an offer holds the character's mark (a reload, the player
    back on another device, a dropped connection, a server restart) gets that offer again,
    with its offer_id, so the sheet draws the mark held and the offer's countdown can still
    land it. Before, the mark waited unseen, with no countdown, until the character's next
    mark landed it."""
    held = held_mark(character)
    if held and held.get("offer"):
        await websocket.send_json({"type": "ability_mark_offer", "payload": held["offer"]})


def drop_held_at_death(character):
    """The fourth scar: a soak or Death Defy offer that holds a mark is dropped and its
    mark is not taken (the sheet is a record now). Returns what it held, for
    close_offers_at_death; the caller's commit stores the drop, so the sheet it sends
    draws nothing held."""
    return _let_go_of_held(character)


async def close_offers_at_death(character, held=None):
    """The fourth scar: what the investigator could still answer goes, since a dead
    investigator's answers are refused (vtt.ws.access DEAD_REFUSED). The desk is told of
    a held mark's offer dropped (held, from drop_held_at_death) with mark_offer_closed
    (dropped), so its card goes and is not sent again on the next connect; an Adrenaline
    Rush and a Non-Combatant drive point waiting go too. The offer could be open then: a
    mark the Lightkeeper dealt while the fourth scar was still to be recorded."""
    _pending_rush.pop(character.id, None)
    _non_combatant.pop(character.id, None)
    if held:
        await manager.broadcast(character_key(character.id), {"type": "mark_offer_closed", "payload": {
            "character_id": character.id, "ability": held.get("offer", {}).get("ability"),
            "mark_type": held["mark_type"], "dropped": True}})


async def mark_or_offer(ctx, character, m_type, channel, *, is_from_enemy=False, offer_intercepts=True,
                        soaks=True, passed_on=None, dealt=False):
    """take_mark's flow: a soak offer, then Death Defy for an enemy's mark, then the mark.
    A mark an open offer still holds lands first, as if that offer were declined (a new
    mark, or Behind Me taking an ally's mark, used to replace it, and it was lost).

    Death Defy escapes "1 or more marks from an enemy" (p. 27): another enemy mark that
    arrives while it is offered is taken as part of the same harm. It waits with the
    first, the offer counts it, and one use escapes them all.

    Every mark that lands here is announced in the log (apply_mark); passed_on says how
    the soak before it was let go (_let_the_mark_land). dealt: the Lightkeeper dealt it.
    A mark that lands at once is one line naming the dealer (_taken); one held for an
    offer gets its own "dealt" line first, since it lands later."""
    # Taken and committed before the first await, so the player's answer to its offer on
    # another socket finds it gone (_take_held)
    held = _take_held(ctx, character, commit=True)
    if dealt and (held or (soaks and _soak_options(character, m_type)) or (is_from_enemy and _can_defy(character))):
        await _log(ctx, character, f"The Lightkeeper dealt {character.name} a {m_type.capitalize()} mark.", "danger")
        dealt = False
    if held and held.get("stage") == "escape" and is_from_enemy:
        await _offer_defy(ctx, character, channel, {**held, "more": [*held.get("more", []), m_type]})
        return
    if held:
        # The desk's card for it closes: answered later, it would land the mark again
        await manager.broadcast(channel, {"type": "mark_offer_closed", "payload": {
            "character_id": character.id, "ability": held.get("offer", {}).get("ability"),
            "mark_type": held["mark_type"]}})
        await _land(ctx, character, held, channel)
    pending = {"mark_type": m_type, "is_from_enemy": bool(is_from_enemy), "offer_intercepts": offer_intercepts}
    options = _soak_options(character, m_type) if soaks else []
    if options:
        await _offer(ctx, character, channel, {**pending, "stage": "soak"}, {
            "ability": options[0]["ability"], "mark_type": m_type, "character_id": character.id,
            "options": options, "action": "soak"})
        return
    if is_from_enemy and _can_defy(character):
        await _offer_defy(ctx, character, channel, {**pending, "stage": "escape"})
        return
    await apply_mark(ctx, character, m_type, channel, offer_intercepts, announce=True, passed_on=passed_on, dealt=dealt)


async def handle_take_mark(ctx):
    """A mark taken on the player's own sheet, or dealt by the Lightkeeper to a member
    (the GM socket names character_id). A dealt mark goes the same way as a taken one, so
    soaks, Death Defy, the allies' Behind Me and Premonitions, and Let Them In are offered;
    the offers go to the player's channel, where they are answered. The trauma record's
    Edit sets a track without any of them, and the Lightkeeper used it for every story
    consequence, so those abilities were silently lost (playtest, lk-mark-skips-abilities)."""
    m_type = ctx.payload.get("mark_type")
    if m_type and ctx.is_gm:
        character = ctx.character
        key = character_key(character.id)
        if not manager.active_connections.get(key):
            # No desk is open to answer an offer, and a held mark would wait for one: it
            # lands now, with what follows any mark (the allies' offers, a scar at four)
            await _log(ctx, character, f"The Lightkeeper dealt {character.name} a {m_type.capitalize()} mark. "
                                       "Their desk is closed, so it landed without a soak or Death Defy.", "danger")
            await apply_mark(ctx, character, m_type, key, announce=True)
            return
        await mark_or_offer(ctx, character, m_type, key, dealt=True,
                            is_from_enemy=ctx.payload.get("is_from_enemy") is not False)
        return
    if m_type:
        if _taken_before(ctx.character, ctx.payload.get("mark_id")):
            # Sent again after a silent socket: the sheet as it is, which has it
            await manager.broadcast(ctx.channel, {"type": "character_update", "payload": get_char_dict(ctx.character)})
            return
        # A mark an open offer still holds lands first (mark_or_offer). Whether an enemy dealt the mark is the table's call, and the desk does not ask,
        # so Death Defy is offered unless the payload says the mark is not from an enemy
        # (is_from_enemy false). The offer asks the player (RULES_CHECK.md item 24).
        await mark_or_offer(ctx, ctx.character, m_type, ctx.channel,
                            is_from_enemy=ctx.payload.get("is_from_enemy") is not False)


async def _let_the_mark_land(ctx, character, payload, after, declined=None):
    """A declined soak or Death Defy: the held mark goes on (after a declined soak, Death
    Defy can still be offered for an enemy's mark). With no mark held nothing lands: the
    payload's mark_type used to, after a restart (the restart rule, #18). declined is the
    ability the player let go, which the log names (None when the server refused it)."""
    passed_on = _let_go(declined, payload) if declined else None
    pending = _take_held(ctx, character, commit=True)
    if pending is None:
        return
    if after == "soak":
        await mark_or_offer(ctx, character, pending["mark_type"], ctx.channel, soaks=False,
                            is_from_enemy=pending["is_from_enemy"], offer_intercepts=pending["offer_intercepts"],
                            passed_on=passed_on)
    else:
        await _land(ctx, character, pending, ctx.channel, passed_on)


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
    if ab_name in HOLDS_A_MARK and _stale_answer(character, payload):
        # Its mark has landed, waits for the offer that replaced it, or was never held
        # here: nothing to answer, and the desk's card for it is closed
        await _close_stale(ctx, character, payload)
        return
    if ab_name == "Circle of Protection":
        # The ward an ally's Ritual put around them: it is theirs to use, not an ability
        if choice == "decline":
            await _let_the_mark_land(ctx, character, payload, "soak", ab_name)
            return
        held = held_mark(character)
        if uses_of(character, WARD) < 1 or not held or held["mark_type"] != "body":
            await _refuse(ctx, "resolve_ability_mark", 409, "No Circle of Protection is holding a Body mark back.")
            if held:
                await _let_the_mark_land(ctx, character, payload, "soak")
            return
        if not _take_held(ctx, character):
            # Another socket let it go first (_take_held)
            await _close_stale(ctx, character, payload)
            return
        spend_use(character, WARD)
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
            await _let_the_mark_land(ctx, character, payload, "soak", ab_name)
            return
        if not can_soak(character, ab_name):
            await _refuse(ctx, "resolve_ability_mark", 409,
                          f"{ab_name} cannot soak this mark: it is used for this assignment or no "
                          f"{SOAK_RESISTANCE[ab_name].capitalize()} resistance is left.")
            if held_mark(character):
                await _let_the_mark_land(ctx, character, payload, "soak")
            return
        if held_mark(character) and not _take_held(ctx, character):
            await _close_stale(ctx, character, payload)
            return
        rkey = SOAK_RESISTANCE[ab_name]
        setattr(character, f"{rkey}_resistance_spent", (getattr(character, f"{rkey}_resistance_spent", 0) or 0) + 1)
        count_use(character, ab_name)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await _log(ctx, character, f"{character.name} used {ab_name} — soaked the mark.")

    elif ab_name == "Death Defy":
        if choice == "decline" or not _can_defy(character):
            if choice == "decline" or held_mark(character):
                await _let_the_mark_land(ctx, character, payload, "escape",
                                         ab_name if choice == "decline" else None)
            return
        escaped = _take_held(ctx, character)
        if held_mark(character) and not escaped:
            await _close_stale(ctx, character, payload)
            return
        count_use(character, "Death Defy")
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
        await _close_intercepts(ctx, character, target_char, m_type)

        # The interceptor takes the mark as they would any other: their own soaks first
        await mark_or_offer(ctx, character, m_type, channel, offer_intercepts=False)

    elif ab_name == "Premonitions" and ab_name in abilities:
        # Premonitions (p. 32): burn an Intuition resistance to warn the ally, who soaks
        # one of the marks (RULES_CHECK.md item 23)
        if resistance_left(character, "intuition") < 1:
            return
        target_char = db.query(Character).filter(Character.id == target_id).first()
        if target_char is None or (getattr(target_char, f"{m_type}_marks", 0) or 0) < 1:
            # Another ally may have taken it: that is what the refusal says then
            await _refuse(ctx, "intercept_mark", 409, "There is no such mark to soak."
                          if target_char is not None and _open_times(target_id, m_type) else NO_MARK_TO_ANSWER)
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
        await _close_intercepts(ctx, character, target_char, m_type)
