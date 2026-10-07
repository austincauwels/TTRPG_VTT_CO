"""Character sheet messages: drives, pen font, scars, revive, gear, advancement and
abilities used outside a roll."""
import json

from engine import ALL_ACTIONS, apply_advancement
from models import Character, Circle
from vtt.abilities import (GEARED_UP_SLOT, ONE_STEP_AHEAD, WARD, count_use, counted_gear, gear_limit, has_ability,
                           resistance_left, uses_of, written_in)
from vtt.ability_uses import ABILITY_USES, DRIVES, SCAR_ABILITIES
from vtt.circle_queries import RESOURCES, circle_abilities
from vtt.config import _SAFE_FONT_NAMES
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.access import scar_ability
from vtt.ws.handlers.circle import announce_downed
from vtt.ws.handlers.marks import awaiting_scar
from vtt.ws.manager import character_key, manager


async def handle_update_drive(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    pool = payload.get("pool")
    value = payload.get("value")
    if pool and value is not None:
        # One of the three drives, from empty to its maximum (rulebook p. 8). Any value
        # used to be stored, 99 or -5 included, and an unknown pool sent an update anyway.
        maximum = (getattr(character, f"{pool}_max", 0) or 0) if pool in DRIVES else None
        if maximum is None or type(value) is not int or not 0 <= value <= maximum:
            await manager.broadcast(channel, {"type": "action_rejected", "payload": {
                "action": "update_drive", "status": 422,
                "detail": "A drive is a whole number from 0 to its maximum."}})
            return
        setattr(character, f"{pool}_current", value)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


async def handle_update_pen_font(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    new_font = payload.get("pen_font", "")
    if new_font in _SAFE_FONT_NAMES:
        character.pen_font = new_font
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


async def handle_apply_scar(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    raw = character.scars_list
    existing = list(raw) if isinstance(raw, list) else (json.loads(raw) if raw else [])
    scar_text = payload.get("scar_text", "")
    if scar_text:
        existing.append(scar_text)
    # Assign a fresh list so SQLAlchemy detects the mutation
    character.scars_list = existing
    character.scars_count = len(existing)
    awaiting_scar.discard(character.id)
    if character.scars_count >= 4:
        character.is_dead = True
        character.incapacitated = True
    down, up = payload.get("shift_down"), payload.get("shift_up")
    skip_shifts = payload.get("skip_shifts", False)
    # A scar taken for Not Again (p. 29) or Forbidden Ritual (p. 32); vtt.ws.access checked
    # the ability, and that Not Again is unused this assignment
    ability = scar_ability(payload)
    use = SCAR_ABILITIES.get(ability) if has_ability(character, ability) else None
    if use and use.get("once"):
        count_use(character, ability)
    if use and use.get("keeps_ratings"):
        skip_shifts = True   # "Don't adjust your action ratings when you take this scar."
    # vtt.ws.access already rejects other names; this keeps the handler safe on its own.
    if not skip_shifts and down in ALL_ACTIONS and up in ALL_ACTIONS:
        if getattr(character, down) > 0 and getattr(character, up) < 3:
            setattr(character, down, getattr(character, down) - 1)
            setattr(character, up, getattr(character, up) + 1)
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
    if character.is_dead:
        await announce_downed(ctx)
    if use:
        said = {
            "Not Again": f"{character.name} used Not Again: a scar, and an automatic full success.",
            "Forbidden Ritual": f"{character.name} used Forbidden Ritual and took a Bleed scar.",
        }[ability]
        await manager.broadcast_campaign(ctx.camp_code, ctx.camp_id, {
            "type": "activity_log",
            "payload": {"message": said, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""},
        }, db)


async def handle_revive_character(ctx):
    db, character, channel, camp_code, camp_id = ctx.db, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    # Back on their feet once the circle gets them somewhere safe (rulebook p. 14). The
    # overfilled track was cleared when the scar was taken; the others keep their marks,
    # which only resources, abilities or gear heal (RULES_CHECK.md item 9).
    character.incapacitated = False
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
    await manager.broadcast_campaign(camp_code, camp_id, {
        "type": "activity_log",
        "payload": {
            "message": f"{character.name} has been revived and is operational.",
            "log_type": "field",
            "ink_color": getattr(character, "ink_color", "") or "",
        }
    }, db)
    await announce_downed(ctx)


GEAR_STAYS = "Marked gear stays until the Lightkeeper ends the assignment."


def _gear_of(character) -> list:
    raw = character.gear
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = []
    return list(raw) if isinstance(raw, list) else []


async def handle_update_gear(ctx):
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    new_gear = payload.get("gear", [])
    if isinstance(new_gear, list):
        # Gear is marked when it is used, and "Gear slots only reset once an assignment is
        # complete" (rulebook p. 52): a player may add items, up to the slots they have
        # (three; four with Geared Up, p. 30), but not unmark them. The Lightkeeper may
        # correct the list, and ending the assignment clears it.
        old_gear = _gear_of(character)
        refused = None
        if not ctx.is_gm:
            if any(item not in new_gear for item in old_gear):
                refused = GEAR_STAYS
            # One Step Ahead's object is written in by its Use button, not here
            elif sorted(written_in(new_gear)) != sorted(written_in(old_gear)):
                refused = "One Step Ahead's object is written in with its Use button."
            elif len(counted_gear(new_gear)) > gear_limit(character):
                refused = f"{character.name} has {gear_limit(character)} gear slots this assignment."
        if refused:
            await manager.broadcast(channel, {"type": "action_rejected", "payload": {
                "action": "update_gear", "status": 409, "detail": refused}})
            return
        character.gear = new_gear
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
        gear_names = ", ".join(new_gear) if new_gear else "nothing"
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log",
            "payload": {
                "message": f"{character.name} updated their equipment: {gear_names}.",
                "log_type": "field",
                "ink_color": getattr(character, "ink_color", "") or "",
            }
        }, db)


async def handle_apply_advancement(ctx):
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    adv_choice = payload.get("choice")
    adv_detail = payload.get("detail", "")
    if adv_choice:
        # The campaign circle's Interdisciplinary allows one ability from another role or
        # specialty (vtt/creation.py new_ability_problem)
        circle = db.query(Circle).filter(Circle.campaign_id == camp_id).first() if camp_id else None
        interdisciplinary = bool(circle) and "Interdisciplinary" in circle_abilities(circle)
        result = apply_advancement(db, character, adv_choice, adv_detail, interdisciplinary=interdisciplinary)
        if "error" in result:
            # A pick that is not waiting, repeated, or out of range changes nothing
            await manager.broadcast(channel, {"type": "action_rejected", "payload": {
                "action": "apply_advancement", "status": result.get("status", 409), "detail": result["error"]}})
            return
        if "error" not in result:
            await manager.broadcast(channel, {
                "type": "character_update",
                "payload": get_char_dict(character),
            })
            label_map = {
                "add_action": f"gained +1 {adv_detail}",
                "add_drive":  f"gained +2 {adv_detail} drive",
                "new_ability": f"learned a new ability: {adv_detail}",
                "gild_action": f"gilded their {adv_detail} action",
            }
            log_msg = f"{character.name} has advanced — {label_map.get(adv_choice, adv_choice)}."
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""},
            }, db)


async def handle_use_ability(ctx):
    """An ability used outside a roll (vtt/ability_uses.py): its cost is paid here, and
    the table answers the question or plays out the effect. Refused (409 or 422) with
    nothing changed when the character lacks the ability, cannot pay, or has used a
    once-per-assignment ability."""
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id

    async def refuse(status, detail):
        # Some refusals come after a row was locked (Volunteer Duty's circle, Ritual's
        # target). Release it first: the lock used to last until this socket's next
        # message, and every other write to the row waited for it and failed.
        db.rollback()
        await manager.broadcast(channel, {"type": "action_rejected", "payload": {
            "action": "use_ability", "status": status, "detail": detail}})

    name = payload.get("ability")
    use = ABILITY_USES.get(name) if isinstance(name, str) else None
    if use is None:
        await refuse(422, "That ability is not used this way.")
        return
    if not has_ability(character, name):
        await refuse(409, f"{character.name} does not have {name}.")
        return
    option = payload.get("option") or ""
    options = use.get("options")
    if options is not None and option not in options:
        await refuse(422, f"Choose how to use {name}: " + ", ".join(o for o in options if o) + ".")
        return
    # An option either adds a mark (Last Moments' still image) or names an effect (Ritual's
    # Reinvigorate)
    chosen = (options or {}).get(option)
    extra_mark = chosen if chosen in ("body", "brain", "bleed") else None
    effect = use.get("effect") or (chosen if chosen and not extra_mark else None)

    if use.get("once") and uses_of(character, name) >= 1:
        await refuse(409, f"{name} is used for this assignment.")
        return
    drive = use.get("drive")
    if drive and (getattr(character, f"{drive}_current", 0) or 0) < 1:
        await refuse(409, f"Not enough {drive.capitalize()} for {name}.")
        return
    resist = use.get("resistance")
    if resist and resistance_left(character, resist) < 1:
        await refuse(409, f"No {resist.capitalize()} resistance left for {name}.")
        return
    circle = None
    if effect == "volunteer":
        # Between assignments, instead of spending resources (p. 29)
        circle = db.query(Circle).filter(Circle.campaign_id == camp_id).with_for_update().first() if camp_id else None
        resource = payload.get("resource")
        if circle is None or not circle.resources_editable:
            await refuse(409, "Volunteer Duty is used between assignments, while resources are open.")
            return
        if (character.resources_spent_assignment or 0) > 0:
            await refuse(409, "Volunteer Duty is instead of spending resources, and some were spent.")
            return
        if resource not in RESOURCES:
            await refuse(422, "Choose a resource to refill: stitch, refresh or train.")
            return
    step_item = None
    if effect == "step_ahead":
        # One Step Ahead (p. 31): "a useful mundane object you've had with you all along"
        step_item = payload.get("item").strip()[:60] if isinstance(payload.get("item"), str) else ""
        if not step_item:
            await refuse(422, "Name the object you've had with you all along.")
            return
    ally = None
    if effect == "geared_up":
        # Geared Up (p. 30): "You and one ally in your circle may mark an additional gear slot"
        ally_id = payload.get("ally_id")
        ally = db.query(Character).filter(
            Character.id == ally_id, Character.campaign_id == camp_id, Character.status == "active",
        ).with_for_update().first() if camp_id and type(ally_id) is int and ally_id != character.id else None
        if ally is None:
            await refuse(422, "Choose an ally in your circle for the extra gear slot.")
            return
    points = None
    if effect == "covenant":
        # Blood of the Covenant (p. 32): "refresh a number of points, in any drive, equal to
        # your current Intuition resistance"
        left = resistance_left(character, "intuition")
        points = payload.get("points")
        if left < 1:
            await refuse(409, "No Intuition resistance left for Blood of the Covenant.")
            return
        if not (isinstance(points, dict) and set(points) <= set(DRIVES)
                and all(type(v) is int and v >= 0 for v in points.values()) and 1 <= sum(points.values()) <= left):
            await refuse(422, f"Choose up to {left} drive {'point' if left == 1 else 'points'} to refresh.")
            return
    # Ritual is performed "on yourself or an ally" (p. 27)
    target = character
    target_id = payload.get("target_character_id")
    if use.get("target") and target_id is not None and target_id != character.id:
        target = db.query(Character).filter(
            Character.id == target_id, Character.campaign_id == camp_id, Character.status == "active",
        ).with_for_update().first() if camp_id and type(target_id) is int else None
        if target is None:
            await refuse(422, "Choose yourself or an ally in your circle.")
            return
    reinvigorate = None
    if effect == "reinvigorate":
        reinvigorate = payload.get("drive")
        if reinvigorate not in DRIVES or not (getattr(target, f"{reinvigorate}_resistance_spent", 0) or 0):
            await refuse(409, "Choose a drive with a burned resistance to refresh.")
            return

    # Pay, then play out what the app can
    paid = []
    if drive:
        setattr(character, f"{drive}_current", getattr(character, f"{drive}_current") - 1)
        paid.append(f"1 {drive.capitalize()}")
    if resist:
        setattr(character, f"{resist}_resistance_spent", (getattr(character, f"{resist}_resistance_spent", 0) or 0) + 1)
        paid.append(f"burned 1 {resist.capitalize()} resistance")
    if use.get("once"):
        count_use(character, name)
    if reinvigorate:
        setattr(target, f"{reinvigorate}_resistance_spent", getattr(target, f"{reinvigorate}_resistance_spent") - 1)
        paid.append(f"refreshed 1 {reinvigorate.capitalize()} resistance")
    if effect == "ward":
        count_use(target, WARD)   # it soaks the next Body mark (vtt/ws/handlers/marks.py)
    changed = []   # other characters this use changed
    if effect == "circle_nerve":
        # Field Experience (p. 29): "refresh 1 Nerve for everyone in your circle"
        members = db.query(Character).filter(Character.campaign_id == camp_id, Character.status == "active") \
            .with_for_update().all() if camp_id else [character]
        if character not in members:
            members.append(character)
        for member in members:
            member.nerve_current = min(member.nerve_max or 0, (member.nerve_current or 0) + 1)
        changed = members
        paid.append("1 Nerve back for everyone in the circle")
    if effect == "volunteer":
        resource = payload["resource"]
        setattr(circle, resource, (getattr(circle, resource, 0) or 0) + 1)
        character.resources_spent_assignment = 2  # "You may not spend any resources during this downtime."
        paid.append(f"refilled 1 {resource.capitalize()}")
    if points:
        for d in DRIVES:
            if points.get(d):
                setattr(character, f"{d}_current", min(getattr(character, f"{d}_max", 0) or 0,
                                                       (getattr(character, f"{d}_current", 0) or 0) + points[d]))
        paid.append("refreshed " + ", ".join(f"{points[d]} {d.capitalize()}" for d in DRIVES if points.get(d)))
    if step_item:
        character.gear = _gear_of(character) + [ONE_STEP_AHEAD + step_item]
        paid.append(f"wrote in {step_item}")
    if effect == "great_ward":
        # One person at a time: the ward leaves whoever held it
        for holder in db.query(Character).filter(Character.warded_by_id == character.id).with_for_update().all():
            holder.warded_by_id = None
            if holder is not target and holder is not character:
                changed.append(holder)
        target.warded_by_id = character.id
        paid.append(f"the ward is on {'themselves' if target is character else target.name}")
    if target is not character:
        changed.append(target)
    if ally is not None:
        count_use(ally, GEARED_UP_SLOT)
        changed.append(ally)
        paid.append(f"an extra gear slot for {ally.name}")
    db.commit()

    for member in changed:
        if member.id != character.id:
            await manager.broadcast(character_key(member.id), {"type": "character_update", "payload": get_char_dict(member)})
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
    if circle is not None:
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(circle)}, db)
    marks = [m for m in (use.get("mark"), extra_mark) if m]
    label = (f"{name}: {option}" if option else name) + \
        (f" on {target.name}" if target is not character and effect != "great_ward" else "")
    taken = [f"took a {m.capitalize()} mark" for m in marks]
    detail = ", ".join(paid + taken)
    await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {
        "message": f"{character.name} used {label}" + (f" ({detail})." if detail else "."),
        "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
    # A mark the player chose to take is a cost: it lands as it is, with no soak, Death
    # Defy or ally offered (vtt/ws/handlers/marks.py apply_mark)
    if marks:
        from vtt.ws.handlers.marks import apply_mark
        for m in marks:
            await apply_mark(ctx, character, m, channel, offer_intercepts=False)
