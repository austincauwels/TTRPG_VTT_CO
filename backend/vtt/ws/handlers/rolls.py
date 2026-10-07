"""Dice messages: roll, resolve_gilded, use_post_roll_ability and burn_resistance.

The roller's own socket gets roll_result with the dice. The rest of the table (the
campaign's GM and active members, not the roller) gets dice_thrown at the moment the
dice start tumbling on the roller's felt, so every desk hears them then and the GM's
tray can show them: when a roll or a resistance reroll lands, or, for a gilded roll,
when a die is kept (the roll's dice wait for that choice). Its payload:
{"character_id" (None for the Lightkeeper), "campaign_id", "name", "ink_color",
"action", "rating" (the roller's rating in the action, or None), "roll" (the dice,
result and outcome, as in roll_result) and "kept" (None, or {"index", "is_gilded",
"value"} for the die kept in a gilded choice)}. A secret roll sends none.
"""
from engine import OUTCOME_LABELS, burn_resistance, calculate_outcome, drive_for_action, roll_dice
from vtt.abilities import abilities_of, resistance_left
from vtt.config import logger
from models import Circle
from vtt.circle_queries import STAMINA_DICE, circle_abilities, downed_members, take_train_die, train_dice_left
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.handlers.marks import apply_mark
from vtt.ws.manager import manager

ACTION_KEYS = ("move", "strike", "control", "sway", "sneak", "hide", "survey", "read", "sense")

# The dice of a gilded roll waiting for its choice, per character id: the roll, its
# action, the drive it spent from and how much, and whether it was secret. The kept die
# is read from these dice, not from the value the client sends, so a choice can only be
# made once, for the roll that is waiting, and a critical success counts the real dice
# (rulebook p. 10; QUIRKS.md D8). In memory only: after a restart there is nothing to
# choose from and the choice is refused, so the player rolls again.
_pending_gilded: dict = {}

NO_CHOICE_WAITING = "No roll is waiting for a die to be kept. Roll again."


async def _refuse(ctx, action, status, detail):
    """An action_rejected frame to the sender's own channel, as vtt.ws.access sends."""
    await manager.broadcast(ctx.channel, {"type": "action_rejected", "payload": {
        "action": action, "status": status, "detail": detail}})


def _rating(character, action):
    if character is None or action not in ACTION_KEYS:
        return None
    return getattr(character, action, None)


async def _dice_thrown(ctx, character, action, roll, rating, kept=None):
    """Tells the rest of the table that these dice are tumbling now (dice_thrown)."""
    await manager.broadcast_campaign(ctx.camp_code, ctx.camp_id, {
        "type": "dice_thrown",
        "payload": {
            "character_id": character.id if character is not None else None,
            "campaign_id": ctx.camp_id,
            "name": character.name if character is not None else "Lightkeeper",
            "ink_color": (getattr(character, "ink_color", "") or "") if character is not None else "",
            "action": action,
            "rating": rating,
            "roll": roll,
            "kept": kept,
        },
    }, ctx.db, exclude=ctx.channel)


def _hold_or_throw(character, action, roll, is_secret, cat=None, spent=0):
    """For a roll that has just landed on the roller's felt: True when its dice tumble
    now and the table is told; False for a secret roll, which is never shown, and for
    a gilded choice, whose dice are held until a die is kept (secret or not)."""
    if character is not None:
        _pending_gilded.pop(character.id, None)
        # A new roll replaces the last one: a burn or a post-roll ability answers this
        # roll once its result is known (_remember), never an older one while a die
        # waits to be kept
        _last_roll.pop(character.id, None)
        if roll.get("needs_gilded_choice"):
            _pending_gilded[character.id] = {
                "action": action, "roll": dict(roll), "rating": _rating(character, action),
                "cat": cat or drive_for_action(action), "spent": spent, "secret": bool(is_secret),
            }
            return False
    return not is_secret


DRIVES = ("nerve", "cunning", "intuition")

# The abilities that change a roll when the player picks them (the dossier's chips, which
# frontend/src/game/rollMods.js lists the same way). Rulebook pages 27 to 32 and
# docs/refactor/RULES_CHECK.md items 21, 25, 26 and 27.
#   actions       the action keys it works on, or "any"
#   condition     what the character must have for it to apply
#   extra_dice    dice it adds (a number, or a function of the character)
#   gild          it gilds a die
#   first_point   the drive whose first point spent on this roll is worth +2d (one more die)
#   substitute    the drive spent instead of the action's own ("any": the payload's "drive")
#   cost          a drive point it costs, apart from what is spent for dice
#   nerve_doubles each Nerve spent is worth +2d, for a Brain mark (Back Against the Wall)
ROLL_MODS = {
    "Sweet Talk":            {"actions": ["sneak"], "extra_dice": 1,
                              "gild_if": lambda ch: resistance_left(ch, "cunning") >= 2},
    "Open Book":             {"actions": ["sway"], "extra_dice": lambda ch: resistance_left(ch, "cunning")},
    # Leverage (p. 31): Sway rolls using what a Read revealed add the current Cunning
    # resistance in dice; whether the roll uses it is the player's call, as Open Book's
    "Leverage":              {"actions": ["sway"], "extra_dice": lambda ch: resistance_left(ch, "cunning")},
    # Narrow Escape (p. 29): +1d to Move when escaping a trap or ambush (the player's call)
    "Narrow Escape":         {"actions": ["move"], "extra_dice": 1},
    # Press Conference (p. 28): +1d to Cunning rolls at the assembly the Journalist called
    # (the 1 Cunning is paid with use_ability)
    "Press Conference":      {"actions": ["sway", "sneak", "hide"], "extra_dice": 1},
    "Lie Detector":          {"actions": ["sneak"], "gild": True, "first_point": "cunning"},
    "Misdirection":          {"actions": ["hide"], "first_point": "cunning"},
    "Interrogation":         {"actions": ["sneak"], "extra_dice": lambda ch: resistance_left(ch, "cunning")},
    "Inspection":            {"actions": ["survey"], "gild": True},
    "Basic Training":        {"actions": ["survey"], "extra_dice": lambda ch: resistance_left(ch, "nerve")},
    "Better Part of Valor":  {"actions": ["control", "move"], "gild": True, "first_point": "nerve"},
    "Tenacious":             {"actions": ["move", "strike", "control"], "gild": True,
                              "condition": lambda ch: (ch.bleed_marks or 0) >= 1},
    "Extend Your Senses":    {"actions": ["sense"], "extra_dice": lambda ch: resistance_left(ch, "intuition")},
    "Meticulous Notes":      {"actions": ["read"], "extra_dice": 1,
                              "condition": lambda ch: resistance_left(ch, "cunning") >= 2},
    "Sharpshooter":          {"actions": ["strike", "control"], "extra_dice": 2, "cost": "nerve",
                              "condition": lambda ch: (ch.nerve_current or 0) >= 1},
    "Dissection":            {"actions": ["read"], "gild": True},
    "Born in the Shadows":   {"actions": ["hide"], "gild": True},
    "Cool Under Pressure":   {"actions": ["any"], "substitute": "cunning"},
    "Practiced Patter":      {"actions": ["sway", "hide"], "substitute": "intuition"},
    "Street Smarts":         {"actions": ["survey"], "substitute": "any"},
    "Back Against the Wall": {"actions": ["any"], "nerve_doubles": True},
}

# The last roll each character made, for the post-roll abilities (RULES_CHECK.md item
# 28): its action, drive, result and outcome, and which of them were used on it. Set when
# a roll's result is known (at once, or when a die is kept). In memory only.
_last_roll: dict = {}


def _remember(character, action, cat, result, outcome):
    if character is not None:
        _last_roll[character.id] = {"action": action, "cat": cat, "result": result,
                                    "outcome": outcome, "used": set()}


def _plan_roll(character, act, spent, mods, payload, stamina_die=False, rescue_die=False):
    """What a player's roll will be, before anything changes: the drive it spends, how
    many dice, gilds and drive points it uses, what else it costs, and the abilities that
    applied. Raises ValueError with words for the player when the roll cannot be made."""
    owned = abilities_of(character)
    cat = drive_for_action(act)
    extra, gilds, first_points, costs, applied = 0, 0, [], {}, []
    nerve_doubles = False
    for name in mods:
        mod = ROLL_MODS.get(name)
        if mod is None or name not in owned:
            continue
        if act not in mod["actions"] and "any" not in mod["actions"]:
            continue
        if mod.get("condition") and not mod["condition"](character):
            continue
        applied.append(name)
        sub = mod.get("substitute")
        if sub == "any":
            if payload.get("drive") in DRIVES:
                cat = payload["drive"]
        elif sub:
            cat = sub
        dice = mod.get("extra_dice", 0)
        extra += dice(character) if callable(dice) else dice
        if mod.get("gild") or (mod.get("gild_if") and mod["gild_if"](character)):
            gilds += 1
        if mod.get("first_point"):
            first_points.append(mod["first_point"])
        if mod.get("cost"):
            costs[mod["cost"]] = costs.get(mod["cost"], 0) + 1
        nerve_doubles = nerve_doubles or mod.get("nerve_doubles", False)

    # Back Against the Wall only does something when Nerve is spent: no mark otherwise
    if "Back Against the Wall" in applied and not (nerve_doubles and cat == "nerve" and spent > 0):
        applied.remove("Back Against the Wall")
        nerve_doubles = False
    per_point = 2 if nerve_doubles and cat == "nerve" else 1
    first_bonus = sum(1 for d in first_points if d == cat)

    # Train (p. 41): the player chooses the roll, from a chip like the abilities'
    train = train_dice_left(character) > 0 and ("Train" in mods or bool(payload.get("use_train")))
    if train:
        extra += 1
    # Stamina Training (p. 41): one of the circle's three gilded dice for the assignment,
    # added "as +1d to any roll". It used to gild a die already in the pool and add none.
    if stamina_die:
        extra += 1
        gilds += 1
    # Nobody Left Behind (p. 41): +1d on a roll to protect a circle member who is down, or
    # get them out of danger (the player's call, while one is down)
    if rescue_die:
        extra += 1
        applied.append("Nobody Left Behind")

    # The drive must hold the spend and any cost from the same drive (p. 8)
    for drive in DRIVES:
        need = (spent if drive == cat else 0) + costs.get(drive, 0)
        if need > (getattr(character, f"{drive}_current", 0) or 0):
            raise ValueError(f"Not enough {drive.capitalize()} for that roll.")

    rating = getattr(character, act, 0) or 0

    def pool(points):
        return rating + points * per_point + (first_bonus if points > 0 else 0) + extra

    # The Rule of Six (p. 11): never more than six dice, and drive past the sixth die is
    # not taken
    target = min(6, pool(spent))
    used = next(k for k in range(spent + 1) if min(6, pool(k)) == target)
    return {"cat": cat, "pool": target, "gilds": gilds, "used": used, "costs": costs,
            "applied": applied, "train": train, "brain_mark": "Back Against the Wall" in applied and used > 0}


async def handle_roll(ctx):
    db, payload, character, target_char_id, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.target_char_id, ctx.channel, ctx.camp_code, ctx.camp_id
    try:
        act = payload.get("action")
        if not act:
            raise ValueError("roll action missing 'action' field")
        spent = int(payload.get("drive_spent", 0))
        is_secret = payload.get("is_secret", False)
        raw_mods = payload.get("ability_mods", [])
        # Each ability once, whatever the client lists (RULES_CHECK.md item 29)
        mods = list(dict.fromkeys(m for m in raw_mods if isinstance(m, str))) if isinstance(raw_mods, list) else []

        plan = None
        stamina_circle = None
        if character:
            if act not in ACTION_KEYS:
                await _refuse(ctx, "roll", 422, "Unknown action.")
                return
            # Stamina Training's dice are the circle's: read and locked until the commit, so
            # two players cannot take the last one at once
            if "Stamina Training" in mods and camp_id:
                stamina_circle = db.query(Circle).filter(Circle.campaign_id == camp_id) \
                    .populate_existing().with_for_update().first()
                if not (stamina_circle and "Stamina Training" in circle_abilities(stamina_circle)
                        and (stamina_circle.stamina_dice_used or 0) < STAMINA_DICE):
                    stamina_circle = None
            rescue = False
            if "Nobody Left Behind" in mods and camp_id:
                circle = db.query(Circle).filter(Circle.campaign_id == camp_id).first()
                rescue = circle is not None and any(m["id"] != character.id for m in downed_members(circle, db))
            try:
                plan = _plan_roll(character, act, spent, mods, payload, stamina_die=stamina_circle is not None,
                                  rescue_die=rescue)
            except ValueError as refused:
                db.rollback()
                await _refuse(ctx, "roll", 422, str(refused))
                return
            if stamina_circle is not None:
                stamina_circle.stamina_dice_used = (stamina_circle.stamina_dice_used or 0) + 1
            cat, spent = plan["cat"], plan["used"]
            setattr(character, f"{cat}_current", getattr(character, f"{cat}_current") - spent)
            for drive, cost in plan["costs"].items():
                setattr(character, f"{drive}_current", getattr(character, f"{drive}_current") - cost)
            if plan["train"]:
                take_train_die(character)  # one die per roll
            is_gilded_action = bool(getattr(character, f"gilded_{act}", False))
            res = roll_dice(plan["pool"], is_gilded_action, extra_gild=plan["gilds"])
            char_name = character.name
            db.commit()
        else:
            # Lightkeeper (GM) roll: drive_spent is the total pool size
            cat = None
            res = roll_dice(spent)
            char_name = "Lightkeeper"
        res["drive_spent_key"] = cat
        res["action"] = act

        await manager.broadcast(channel, {
            "type": "roll_result",
            "payload": {"character_id": target_char_id, "action": act, "roll": res, "character": get_char_dict(character) if character else None}
        })
        if character and stamina_circle is not None:
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(stamina_circle)}, db)
        if _hold_or_throw(character, act, res, is_secret, cat, spent):
            await _dice_thrown(ctx, character, act, res, _rating(character, act))

        if not res.get("needs_gilded_choice"):
            result_val = res.get("result")
            outcome_key = res.get("outcome", "")
            outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
            # GM rolls omit the internal action name from the log label
            if character:
                log_msg = f"{char_name} rolled {act} — {result_val} · {outcome_label}."
            else:
                log_msg = f"Lightkeeper rolled — {result_val} · {outcome_label}."

            # The gilded refresh and Well-Read follow the dice, so they apply to a secret
            # roll too (RULES_CHECK.md item 6); only its log line stays with the roller.
            post_roll_dirty = False
            # The gilded die refreshes "the drive that encompasses that action" (p. 8),
            # even when the roll spent another drive (Cool Under Pressure, Street Smarts)
            act_drive = drive_for_action(act)
            if res.get("auto_gilded_refresh") and character and act_drive:
                setattr(character, f"{act_drive}_current", min(getattr(character, f"{act_drive}_max", 3), getattr(character, f"{act_drive}_current") + 1))
                post_roll_dirty = True
                log_msg += f" [gilded — {act_drive} Drive refreshed]"

            # Well-Read auto-refund: if failure and Intuition was spent, earn it back
            if character and outcome_key == "failure" and cat == "intuition" and spent > 0 \
                    and "Well-Read" in abilities_of(character):
                setattr(character, "intuition_current", min(getattr(character, "intuition_max", 3), getattr(character, "intuition_current") + spent))
                post_roll_dirty = True
                log_msg += f" [Well-Read — {spent} Intuition refunded]"

            if post_roll_dirty:
                db.commit()
                await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})

            if not is_secret:
                await manager.broadcast_campaign(camp_code, camp_id, {
                    "type": "activity_log",
                    "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
                }, db)
            _remember(character, act, cat, result_val, outcome_key)

        # Back Against the Wall's price: a Brain mark, taken as any mark is (RULES_CHECK.md
        # item 21). It is the player's choice, so no soak or ally is offered for it.
        if plan and plan["brain_mark"]:
            await apply_mark(ctx, character, "brain", channel, offer_intercepts=False)
    except Exception as roll_exc:
        logger.error("WS roll handler error: %s", roll_exc, exc_info=True)
        db.rollback()
        await manager.broadcast(channel, {"type": "roll_error", "payload": {"message": str(roll_exc)}})


async def handle_resolve_gilded(ctx):
    """Keeps a die of the roll waiting for a choice: the best gilded die (chosen_type
    "gilded"), which earns back 1 drive, or the best regular one (anything else). The die
    and its value come from the held dice; the client's chosen_value is ignored. Two or
    more 6s with a 6 kept is a critical success. Well-Read refunds spent Intuition on a
    kept 3 or less, as on any roll. A secret roll's choice is told to no one else."""
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    r_act = payload.get("action")
    pending = _pending_gilded.get(character.id)
    if pending is None or pending["action"] != r_act:
        await _refuse(ctx, "resolve_gilded", 409, NO_CHOICE_WAITING)
        return
    _pending_gilded.pop(character.id, None)

    roll = pending["roll"]
    dice = roll.get("dice") or []
    want_gilded = payload.get("chosen_type") == "gilded"
    index = roll["gilded_idx"] if want_gilded else roll["highest_regular_idx"]
    chosen_value = dice[index]["value"]
    r_cat, spent = pending["cat"], pending["spent"]
    outcome_key = calculate_outcome(chosen_value, dice)
    outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
    log_msg = f"{character.name} rolled {r_act} — {chosen_value} · {outcome_label}."

    changed = False
    if want_gilded:
        # the action's own drive (p. 8), whichever drive the roll spent
        act_drive = drive_for_action(r_act)
        setattr(character, f"{act_drive}_current", min(getattr(character, f"{act_drive}_max", 3), getattr(character, f"{act_drive}_current") + 1))
        changed = True
        log_msg += f" [gilded — {act_drive} Drive refreshed]"
    if outcome_key == "failure" and r_cat == "intuition" and spent > 0 \
            and "Well-Read" in abilities_of(character):
        character.intuition_current = min(character.intuition_max or 3, (character.intuition_current or 0) + spent)
        changed = True
        log_msg += f" [Well-Read — {spent} Intuition refunded]"
    if changed:
        db.commit()
    _remember(character, r_act, r_cat, chosen_value, outcome_key)

    # The roller's own desk learns the kept die's result, so its outcome slip, the
    # post-roll ability prompts and the resistance offer follow the server's scoring (they
    # were left with a roll that had no result). Sent for a secret roll too.
    await manager.broadcast(channel, {"type": "roll_kept", "payload": {
        "character_id": character.id, "action": r_act, "index": index, "is_gilded": want_gilded,
        "value": chosen_value, "outcome": outcome_key}})

    if not pending["secret"]:
        # The kept die starts the dice tumbling on the roller's felt: the table sees them now
        shown = {**roll, "needs_gilded_choice": False, "result": chosen_value, "outcome": outcome_key}
        await _dice_thrown(ctx, character, r_act, shown, pending["rating"],
                           kept={"index": index, "is_gilded": want_gilded, "value": chosen_value})
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log",
            "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
        }, db)
    if changed:
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


TIER_UP = {"failure": "mixed_success", "mixed_success": "full_success"}
POST_ROLL_REFUSED = {
    "Flourish": "Flourish needs a failed or mixed roll that could take Cunning, and 2 Cunning to spend.",
    "Learn from My Mistakes": "Learn from My Mistakes needs a roll of 3 or less.",
    "Bending Spoons": "Bending Spoons needs a mixed success on a Sense roll.",
}


async def handle_use_post_roll_ability(ctx):
    """The abilities used after a roll, each checked against the character's last roll
    and usable once on it (rulebook pp. 28 to 32; RULES_CHECK.md item 28):
    Flourish on a failure or mixed success that could take Cunning, for 2 Cunning, pushes
    the result up a tier; Learn from My Mistakes on a result of 3 or less refreshes 1
    drive point of the player's choice; Bending Spoons on a mixed success on a Sense roll
    takes a Bleed mark (through apply_mark) to make it a full success."""
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    ab_name = payload.get("ability")
    abilities = abilities_of(character)
    if not ab_name or ab_name not in abilities or ab_name not in POST_ROLL_REFUSED:
        return
    last = _last_roll.get(character.id)
    fresh = last is not None and ab_name not in last["used"]

    async def log(message):
        await manager.broadcast_campaign(ctx.camp_code, ctx.camp_id, {"type": "activity_log", "payload": {
            "message": message, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

    if ab_name == "Flourish":
        # "a roll where you could spend Cunning" (p. 28): a Cunning action, a roll that spent
        # Cunning (Street Smarts), or any roll with Cool Under Pressure. A Sway or Hide roll
        # paid in Intuition with Practiced Patter still counts.
        could_take_cunning = fresh and (last["cat"] == "cunning" or drive_for_action(last["action"]) == "cunning"
                                        or "Cool Under Pressure" in abilities)
        if not (could_take_cunning and last["outcome"] in TIER_UP and (character.cunning_current or 0) >= 2):
            await _refuse(ctx, "use_post_roll_ability", 409, POST_ROLL_REFUSED[ab_name])
            return
        character.cunning_current -= 2
        last["used"].add(ab_name)
        last["outcome"] = TIER_UP[last["outcome"]]
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await log(f"{character.name} used Flourish — result pushed up one tier, to {OUTCOME_LABELS[last['outcome']]}.")

    elif ab_name == "Learn from My Mistakes":
        drive = payload.get("drive")
        if drive not in DRIVES:
            return
        if not (fresh and isinstance(last["result"], int) and last["result"] <= 3):
            await _refuse(ctx, "use_post_roll_ability", 409, POST_ROLL_REFUSED[ab_name])
            return
        last["used"].add(ab_name)
        max_val = getattr(character, f"{drive}_max", 3)
        setattr(character, f"{drive}_current", min(max_val, getattr(character, f"{drive}_current") + 1))
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        await log(f"{character.name} used Learn from My Mistakes — refreshed 1 {drive.capitalize()}.")

    elif ab_name == "Bending Spoons":
        if not (fresh and last["action"] == "sense" and last["outcome"] == "mixed_success"):
            await _refuse(ctx, "use_post_roll_ability", 409, POST_ROLL_REFUSED[ab_name])
            return
        last["used"].add(ab_name)
        last["outcome"] = "full_success"
        await apply_mark(ctx, character, "bleed", channel, offer_intercepts=False)
        await log(f"{character.name} used Bending Spoons — took 1 Bleed mark to upgrade the result.")


async def handle_burn_resistance(ctx):
    """Burns a resistance point of the action's own drive (rulebook p. 13; the client's
    drive_key is ignored) and rerolls the action rating."""
    db, payload, character, target_char_id, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.target_char_id, ctx.channel, ctx.camp_code, ctx.camp_id
    act = payload.get("action")
    if act not in ACTION_KEYS:
        if act:
            await _refuse(ctx, "burn_resistance", 422, "Unknown action.")
        return
    # A burn answers a roll the player does not like (p. 13): the character's last roll,
    # of this action (a reroll counts, so a second burn can follow it)
    last = _last_roll.get(character.id)
    if not last or last["action"] != act:
        await _refuse(ctx, "burn_resistance", 409, "Burn a resistance after a roll of that action.")
        return
    drive_key = drive_for_action(act)
    result = burn_resistance(db, character, act, drive_key)
    if "error" in result:
        return
    # The reroll's drive, as on any roll, so the desk's post-roll prompts can read it
    result["drive_spent_key"] = drive_key
    outcome_label = OUTCOME_LABELS.get(result.get("outcome", ""), "")
    # A gilded die that counts earns back 1 drive (rulebook p. 8) on a reroll too: a zero
    # rating whose gilded die is the lower one, or a pool that is all gilded
    refreshed = ""
    if result.get("auto_gilded_refresh"):
        setattr(character, f"{drive_key}_current",
                min(getattr(character, f"{drive_key}_max", 3) or 0, (getattr(character, f"{drive_key}_current", 0) or 0) + 1))
        db.commit()
        refreshed = f" [gilded — {drive_key} Drive refreshed]"
    await manager.broadcast(channel, {
        "type": "roll_result",
        "payload": {"character_id": target_char_id, "action": act, "roll": result, "character": get_char_dict(character)}
    })
    if _hold_or_throw(character, act, result, False, drive_key):
        await _dice_thrown(ctx, character, act, result, _rating(character, act))
    if result.get("needs_gilded_choice"):
        # The result is the die the player keeps; resolve_gilded logs it
        log_msg = f"{character.name} burned resistance on {act}."
    else:
        log_msg = f"{character.name} burned resistance on {act} — {result['result']} · {outcome_label}.{refreshed}"
        _remember(character, act, drive_key, result["result"], result["outcome"])
    await manager.broadcast_campaign(camp_code, camp_id, {
        "type": "activity_log",
        "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
    }, db)
