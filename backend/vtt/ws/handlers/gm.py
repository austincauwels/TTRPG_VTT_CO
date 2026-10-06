"""GM messages: tension, scene, the circle toggles, advancing the circle, refilling resources,
ending an assignment, resetting a character, and update_circle.

Only the campaign's GM may send these (vtt.ws.access rejects them from anyone else,
and ctx.is_gm comes from the login token, never from the payload's "role"). The
circle they name must be the GM's campaign circle. update_circle is grouped here
because only GM screens send it. See docs/refactor/WEBSOCKET.md section 4.2 and
docs/refactor/AUTH.md.
"""
from models import Character, Circle
from vtt.circle_queries import resolve_circle
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.manager import character_key, manager


async def handle_gm_update_tension(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    if not ctx.is_gm: return

    m_type = payload.get("mark_type")
    value = payload.get("value")
    if m_type and value is not None:
        setattr(character, f"{m_type}_marks", value)
        db.commit()
        await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})


async def handle_gm_update_circle(ctx):
    db, payload, camp_code, camp_id = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id
    if not ctx.is_gm: return

    circle_id = payload.get("circle_id") or 1
    target_circle = db.query(Circle).filter(Circle.id == circle_id).first()
    if target_circle:
        for field in ["stitch", "refresh", "train", "guard_patrol", "miasma_bleed",
                      "location", "atmosphere", "tension_clock", "tension_label"]:
            if field in payload:
                setattr(target_circle, field, payload[field])
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)


async def handle_gm_transition_scene(ctx):
    payload, channel = ctx.payload, ctx.channel
    if not ctx.is_gm: return

    await manager.broadcast(channel, {
        "type": "scene_transition",
        "payload": {
            "scene_name": payload.get("scene_name", "Unknown Location"),
            "description": payload.get("description", "")
        }
    })


async def handle_gm_toggle_resource_edit(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        target_circle.resources_editable = not bool(getattr(target_circle, "resources_editable", False))
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)


async def handle_gm_toggle_reports(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        target_circle.reports_open = not bool(getattr(target_circle, "reports_open", False))
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)


async def handle_gm_advance_circle(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        new_ability = payload.get("circle_ability")
        if new_ability:
            existing_abilities = getattr(target_circle, "circle_ability", None) or ""
            if existing_abilities:
                target_circle.circle_ability = existing_abilities + "\n" + new_ability
            else:
                target_circle.circle_ability = new_ability
        carry = max(0, (getattr(target_circle, "illumination", 0) or 0) - 12)
        target_circle.illumination = carry
        # Each active member chooses two different advancements (rulebook p. 55). The
        # picks wait on the character until chosen, so a player who was away still gets them.
        members = db.query(Character).filter(
            Character.campaign_id == camp_id, Character.status == "active").all() if camp_id else []
        for member in members:
            if not (member.advancement_picks or 0):
                member.advancement_taken = []
            member.advancement_picks = (member.advancement_picks or 0) + 2
        db.commit()
        for member in members:
            await manager.broadcast(character_key(member.id), {"type": "character_update", "payload": get_char_dict(member)})
        circle_name = target_circle.name or "The Circle"
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log",
            "payload": {"message": f"{circle_name} has advanced!", "log_type": "field"},
        }, db)
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "circle_advanced",
            "payload": {"circle": get_circle_dict(target_circle), "campaign_id": camp_id},
        }, db)


async def handle_refill_resources(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        max_cap = 1 + sum(1 for c in target_circle.characters if c.status == "active")
        target_circle.stitch  = max_cap
        target_circle.refresh = max_cap
        target_circle.train   = max_cap
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)


async def handle_gm_end_assignment(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        # Clear scene text
        target_circle.location = ""
        target_circle.atmosphere = ""
        # Reset ability_uses for all active characters in this campaign
        active_chars = db.query(Character).filter(
            Character.campaign_id == camp_id,
            Character.status == "active"
        ).all()
        for ch in active_chars:
            ch.ability_uses = {}
            ch.resources_spent_assignment = 0
            ch.train_bonus = False
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)
        for ch in active_chars:
            await manager.broadcast(character_key(ch.id), {"type": "character_update", "payload": get_char_dict(ch)})
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log",
            "payload": {"message": "— Assignment ended. Ability uses have been reset. —", "log_type": "field"},
        }, db)


async def handle_gm_reset_character(ctx):
    db, payload, camp_code, camp_id = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id
    if not ctx.is_gm: return
    target_id = payload.get("character_id")
    if target_id:
        target_char = db.query(Character).filter(
            Character.id == target_id,
            Character.campaign_id == camp_id,
        ).first()
        if target_char:
            target_char.nerve_current     = target_char.nerve_max
            target_char.cunning_current   = target_char.cunning_max
            target_char.intuition_current = target_char.intuition_max
            target_char.nerve_resistance_spent     = 0
            target_char.cunning_resistance_spent   = 0
            target_char.intuition_resistance_spent = 0
            target_char.ability_uses = {}
            db.commit()
            await manager.broadcast(character_key(target_char.id), {
                "type": "character_update",
                "payload": get_char_dict(target_char),
            })
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {
                    "message": f"— {target_char.name}'s session resources have been reset. —",
                    "log_type": "field",
                },
            }, db)


async def handle_update_circle(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        old_illum = getattr(target_circle, "illumination", 0) or 0
        for field in ["name", "stitch", "refresh", "train", "guard_patrol", "miasma_bleed", "location", "atmosphere",
                      "chapter_house_location", "circle_ability", "illumination",
                      "tension_clock", "tension_label"]:
            if field in payload:
                setattr(target_circle, field, payload[field])
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)
        # Fire milestone notification when illumination hits a golden pip (every 3rd)
        new_illum = getattr(target_circle, "illumination", 0) or 0
        if "illumination" in payload and new_illum > old_illum and new_illum % 3 == 0 and new_illum < 12:
            circle_name = target_circle.name or "The Circle"
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": f"{circle_name} milestone reached!", "log_type": "field"},
            }, db)
