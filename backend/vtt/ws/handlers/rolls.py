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
from engine import OUTCOME_LABELS, burn_resistance, calculate_outcome, roll_dice
from vtt.config import logger
from vtt.serializers import get_char_dict
from vtt.ws.manager import manager

ACTION_KEYS = ("move", "strike", "control", "sway", "sneak", "hide", "survey", "read", "sense")

# The dice of a gilded roll waiting for its choice, per character id, so that the table
# can be shown them when a die is kept. In memory only: after a restart a kept die
# sends no dice_thrown, and the other desks hear the dice when the roll's log line comes.
# The choice itself is still taken as the client sends it (see handle_resolve_gilded).
_pending_gilded: dict = {}


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


def _hold_or_throw(character, action, roll, is_secret):
    """For a roll that has just landed on the roller's felt: True when its dice tumble
    now and the table is told; False for a secret roll, which is never shown, and for
    a gilded choice, whose dice are held until a die is kept."""
    if character is not None:
        _pending_gilded.pop(character.id, None)
    if is_secret:
        return False
    if roll.get("needs_gilded_choice"):
        if character is not None:
            _pending_gilded[character.id] = {"action": action, "roll": dict(roll), "rating": _rating(character, action)}
        return False
    return True


async def handle_roll(ctx):
    db, payload, character, target_char_id, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.target_char_id, ctx.channel, ctx.camp_code, ctx.camp_id
    try:
        act = payload.get("action")
        if not act:
            raise ValueError("roll action missing 'action' field")
        spent = int(payload.get("drive_spent", 0))
        is_secret = payload.get("is_secret", False)
        ability_mods = payload.get("ability_mods", [])

        # Per-ability backend mod definitions (mirrors frontend ABILITY_ROLL_MODS)
        ABILITY_MOD_DEFS = {
            "Sweet Talk":           {"actions": ["sneak"],                   "extra_dice": 1,  "extra_gild_condition": lambda ch: (ch.cunning_max // 3 - ch.cunning_resistance_spent) >= 2},
            "Open Book":            {"actions": ["sway"],                    "extra_dice_fn": lambda ch: max(0, ch.cunning_max // 3 - ch.cunning_resistance_spent)},
            "Lie Detector":         {"actions": ["sneak"],                   "extra_gild": True},
            "Misdirection":         {"actions": ["hide"],                    "extra_dice": 1},
            "Interrogation":        {"actions": ["sneak"],                   "extra_dice_fn": lambda ch: max(0, ch.cunning_max // 3 - ch.cunning_resistance_spent)},
            "Inspection":           {"actions": ["survey"],                  "extra_gild": True},
            "Basic Training":       {"actions": ["survey"],                  "extra_dice_fn": lambda ch: max(0, ch.nerve_max // 3 - ch.nerve_resistance_spent)},
            "Better Part of Valor": {"actions": ["control","move"],          "extra_gild": True},
            "Tenacious":            {"actions": ["move","strike","control"],  "extra_gild": True},
            "Extend Your Senses":   {"actions": ["sense"],                   "extra_dice_fn": lambda ch: max(0, ch.intuition_max // 3 - ch.intuition_resistance_spent)},
            "Meticulous Notes":     {"actions": ["read"],                    "extra_dice": 1},
            "Sharpshooter":         {"actions": ["strike"],                  "extra_dice": 2,  "cost_drive": "nerve"},
            "Dissection":           {"actions": ["read"],                    "extra_gild": True},
            "Born in the Shadows":  {"actions": ["hide"],                    "extra_gild": True},
            "Cool Under Pressure":  {"actions": ["any"],                     "drive_substitute": "cunning"},
            "Practiced Patter":     {"actions": ["sway","hide"],             "drive_substitute": "intuition"},
            "Street Smarts":        {"actions": ["survey"],                  "drive_substitute": "any"},
            "Back Against the Wall":{"actions": ["any"],                     "cost_brain_mark": True},
        }

        if character:
            cat = "nerve" if act in ["move", "strike", "control"] else "cunning" if act in ["hide", "sneak", "sway"] else "intuition"

            # Apply drive substitution from ability mods
            extra_dice_count = 0
            extra_gild_flag = False
            for mod_name in ability_mods:
                mod_def = ABILITY_MOD_DEFS.get(mod_name)
                if not mod_def: continue
                char_abilities = [character.role_ability, character.specialty_ability]
                if mod_name not in char_abilities: continue
                allowed_actions = mod_def.get("actions", [])
                if act not in allowed_actions and "any" not in allowed_actions: continue
                # Drive substitution
                if "drive_substitute" in mod_def and mod_def["drive_substitute"] != "any":
                    cat = mod_def["drive_substitute"]
                # Brain mark cost (Back Against the Wall)
                if mod_def.get("cost_brain_mark"):
                    character.brain_marks = min(3, character.brain_marks + 1)
                # Drive cost (e.g. Sharpshooter costs 1 Nerve)
                if "cost_drive" in mod_def:
                    drive_key = mod_def["cost_drive"]
                    cur = getattr(character, f"{drive_key}_current", 0) or 0
                    setattr(character, f"{drive_key}_current", max(0, cur - 1))
                # Extra dice
                if "extra_dice_fn" in mod_def:
                    extra_dice_count += mod_def["extra_dice_fn"](character)
                elif mod_def.get("extra_dice", 0) > 0:
                    extra_dice_count += mod_def["extra_dice"]
                # Extra gild
                if mod_def.get("extra_gild"):
                    extra_gild_flag = True
                elif "extra_gild_condition" in mod_def and mod_def["extra_gild_condition"](character):
                    extra_gild_flag = True
                # Record ability use
                MAX_ABILITY_USES = {
                    "I Know a Guy": 1, "Death Defy": 1, "Field Experience": 1,
                    "Not Again": 1, "In the Trenches": 1, "Steel Mind": 1,
                    "Compartmentalization": 1, "Saw This Coming": 3,
                }
                if mod_name in MAX_ABILITY_USES:
                    uses = dict(character.ability_uses or {})
                    uses[mod_name] = uses.get(mod_name, 0) + 1
                    character.ability_uses = uses

            # Consume Train bonus (+1d on first roll after spending Train resource)
            if getattr(character, "train_bonus", False):
                extra_dice_count += 1
                character.train_bonus = False

            setattr(character, f"{cat}_current", max(0, getattr(character, f"{cat}_current") - spent))
            is_gilded_action = getattr(character, f"gilded_{act}", False)
            pool = min(6, getattr(character, act, 0) + spent)
            char_name = character.name
            db.commit()
        else:
            # Lightkeeper (GM) roll: drive_spent is the total pool size
            cat = None
            is_gilded_action = False
            pool = spent
            extra_dice_count = 0
            extra_gild_flag = False
            char_name = "Lightkeeper"

        res = roll_dice(pool, is_gilded_action, extra_dice=extra_dice_count, extra_gild=extra_gild_flag)
        res["drive_spent_key"] = cat
        res["action"] = act

        await manager.broadcast(channel, {
            "type": "roll_result",
            "payload": {"character_id": target_char_id, "action": act, "roll": res, "character": get_char_dict(character) if character else None}
        })
        if _hold_or_throw(character, act, res, is_secret):
            await _dice_thrown(ctx, character, act, res, _rating(character, act))

        if not res.get("needs_gilded_choice") and not is_secret:
            result_val = res.get("result")
            outcome_key = res.get("outcome", "")
            outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
            # GM rolls omit the internal action name from the log label
            if character:
                log_msg = f"{char_name} rolled {act} — {result_val} · {outcome_label}."
            else:
                log_msg = f"Lightkeeper rolled — {result_val} · {outcome_label}."

            post_roll_dirty = False
            if res.get("auto_gilded_refresh") and character and cat:
                setattr(character, f"{cat}_current", min(getattr(character, f"{cat}_max", 3), getattr(character, f"{cat}_current") + 1))
                post_roll_dirty = True
                log_msg += f" [gilded — {cat} Drive refreshed]"

            # Well-Read auto-refund: if failure and Intuition was spent, earn it back
            if character and outcome_key == "failure" and cat == "intuition" and spent > 0:
                char_abilities = [character.role_ability, character.specialty_ability]
                if "Well-Read" in char_abilities:
                    setattr(character, "intuition_current", min(getattr(character, "intuition_max", 3), getattr(character, "intuition_current") + spent))
                    post_roll_dirty = True
                    log_msg += f" [Well-Read — {spent} Intuition refunded]"

            if post_roll_dirty:
                db.commit()
                await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})

            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
            }, db)
    except Exception as roll_exc:
        logger.error("WS roll handler error: %s", roll_exc, exc_info=True)
        db.rollback()
        await manager.broadcast(channel, {"type": "roll_error", "payload": {"message": str(roll_exc)}})


async def handle_resolve_gilded(ctx):
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    r_act = payload.get("action")
    chosen_type = payload.get("chosen_type")
    chosen_value = int(payload.get("chosen_value", 0))
    r_cat = "nerve" if r_act in ["move", "strike", "control"] else "cunning" if r_act in ["hide", "sneak", "sway"] else "intuition"

    drive_refreshed = False
    if chosen_type == "gilded" and hasattr(character, f"{r_cat}_current"):
        setattr(character, f"{r_cat}_current", min(getattr(character, f"{r_cat}_max", 3), getattr(character, f"{r_cat}_current") + 1))
        drive_refreshed = True
        db.commit()

    outcome_key = calculate_outcome(chosen_value)
    outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
    log_msg = f"{character.name} rolled {r_act} — {chosen_value} · {outcome_label}."
    if drive_refreshed:
        log_msg += f" [gilded — {r_cat} Drive refreshed]"

    # The kept die starts the dice tumbling on the roller's felt: the table sees them now
    pending = _pending_gilded.pop(character.id, None)
    if pending is not None and pending["action"] == r_act:
        roll = pending["roll"]
        dice = roll.get("dice") or []
        want_gilded = chosen_type == "gilded"
        index = roll.get("gilded_idx") if want_gilded else roll.get("highest_regular_idx")
        if not (isinstance(index, int) and 0 <= index < len(dice)
                and dice[index].get("value") == chosen_value and bool(dice[index].get("is_gilded")) == want_gilded):
            index = next((i for i, d in enumerate(dice)
                          if bool(d.get("is_gilded")) == want_gilded and d.get("value") == chosen_value), None)
        shown = {**roll, "needs_gilded_choice": False, "result": chosen_value, "outcome": outcome_key}
        await _dice_thrown(ctx, character, r_act, shown, pending["rating"],
                           kept={"index": index, "is_gilded": want_gilded, "value": chosen_value})

    await manager.broadcast_campaign(camp_code, camp_id, {
        "type": "activity_log",
        "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
    }, db)
    if drive_refreshed:
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


async def handle_use_post_roll_ability(ctx):
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    ab_name = payload.get("ability")
    char_abilities = [character.role_ability, character.specialty_ability]
    if ab_name and ab_name in char_abilities:
        if ab_name == "Flourish":
            character.cunning_current = max(0, character.cunning_current - 2)
            db.commit()
            log_msg = f"{character.name} used Flourish — result pushed up one tier."
            await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
        elif ab_name == "Learn from My Mistakes":
            drive = payload.get("drive")
            if drive in ["nerve", "cunning", "intuition"]:
                max_val = getattr(character, f"{drive}_max", 3)
                setattr(character, f"{drive}_current", min(max_val, getattr(character, f"{drive}_current") + 1))
                db.commit()
                log_msg = f"{character.name} used Learn from My Mistakes — refreshed 1 {drive.capitalize()}."
                await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
                await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
        elif ab_name == "Bending Spoons":
            character.bleed_marks = min(3, character.bleed_marks + 1)
            db.commit()
            log_msg = f"{character.name} used Bending Spoons — took 1 Bleed mark to upgrade the result."
            await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)


async def handle_burn_resistance(ctx):
    db, payload, character, target_char_id, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.target_char_id, ctx.channel, ctx.camp_code, ctx.camp_id
    act = payload.get("action")
    drive_key = payload.get("drive_key")
    if act and drive_key:
        result = burn_resistance(db, character, act, drive_key)
        if "error" not in result:
            outcome_label = OUTCOME_LABELS.get(result.get("outcome", ""), "")
            await manager.broadcast(channel, {
                "type": "roll_result",
                "payload": {"character_id": target_char_id, "action": act, "roll": result, "character": get_char_dict(character)}
            })
            if _hold_or_throw(character, act, result, False):
                await _dice_thrown(ctx, character, act, result, _rating(character, act))
            log_msg = f"{character.name} burned resistance on {act} — {result.get('result', '?')} · {outcome_label}."
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
            }, db)
