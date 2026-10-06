"""Character sheet messages: drives, pen font, scars, revive, gear and advancement."""
import json

from engine import ALL_ACTIONS, apply_advancement
from vtt.abilities import count_use, has_ability
from vtt.config import _SAFE_FONT_NAMES
from vtt.serializers import get_char_dict
from vtt.ws.manager import manager


async def handle_update_drive(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    pool = payload.get("pool")
    value = payload.get("value")
    if pool and value is not None:
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
    if character.scars_count >= 4:
        character.is_dead = True
        character.incapacitated = True
    down, up = payload.get("shift_down"), payload.get("shift_up")
    skip_shifts = payload.get("skip_shifts", False)
    # A Not Again scar (p. 29) is once per assignment; vtt.ws.access checked it is unused
    if payload.get("not_again") and has_ability(character, "Not Again"):
        count_use(character, "Not Again")
    # vtt.ws.access already rejects other names; this keeps the handler safe on its own.
    if not skip_shifts and down in ALL_ACTIONS and up in ALL_ACTIONS:
        if getattr(character, down) > 0 and getattr(character, up) < 3:
            setattr(character, down, getattr(character, down) - 1)
            setattr(character, up, getattr(character, up) + 1)
    db.commit()
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


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


async def handle_update_gear(ctx):
    db, payload, character, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id
    new_gear = payload.get("gear", [])
    if isinstance(new_gear, list):
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
        result = apply_advancement(db, character, adv_choice, adv_detail)
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
