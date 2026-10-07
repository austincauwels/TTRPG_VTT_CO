"""GM messages: tension, scene, the circle toggles, advancing the circle, refilling resources,
ending an assignment, resetting a character, and update_circle.

Only the campaign's GM may send these (vtt.ws.access rejects them from anyone else,
and ctx.is_gm comes from the login token, never from the payload's "role"). The
circle they name must be the GM's campaign circle. update_circle is grouped here
because only GM screens send it. See docs/refactor/WEBSOCKET.md section 4.2 and
docs/refactor/AUTH.md.
"""
from models import Character, Circle
from vtt.abilities import abilities_of
from vtt.circle_queries import circle_abilities, fill_resources, resolve_circle
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.manager import character_key, manager

TRACK = 12              # the Illumination track (rulebook p. 55)
MILESTONES = (3, 6, 9)  # its milestones, printed on the circle sheet


async def _log_illumination(db, camp_code, camp_id, circle, old_illum, new_illum):
    """A log line for each milestone a rise in Illumination passed, a Resource Management
    line after each when the circle has it, and a line when the track fills (RULES_CHECK.md
    items 19 and 20)."""
    if not (isinstance(old_illum, int) and isinstance(new_illum, int) and new_illum > old_illum):
        return
    circle_name = circle.name or "The Circle"

    async def log(message):
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log", "payload": {"message": message, "log_type": "field"}}, db)
    for milestone in MILESTONES:
        if old_illum < milestone <= new_illum:
            await log(f"{circle_name} milestone reached!")
            if "Resource Management" in circle_abilities(circle):
                await log(f"Resource Management: {circle_name} gains one resource of its choice.")
    if old_illum < TRACK <= new_illum:
        await log(f"{circle_name}'s Illumination track is full: the circle can advance.")


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
        # Read the row again: the socket's session may hold it as it was when it opened,
        # and setting a value it already shows would write nothing
        db.refresh(target_circle, with_for_update=True)
        new_ability = payload.get("circle_ability")
        if new_ability:
            existing_abilities = getattr(target_circle, "circle_ability", None) or ""
            if existing_abilities:
                target_circle.circle_ability = existing_abilities + "\n" + new_ability
            else:
                target_circle.circle_ability = new_ability
        carry = max(0, (getattr(target_circle, "illumination", 0) or 0) - TRACK)
        target_circle.illumination = carry
        # Each active member chooses two different advancements (rulebook p. 55), or all
        # four when the circle takes One Last Run (p. 41). The picks wait on the character
        # until chosen, so a player who was away still gets them.
        grant = 4 if (new_ability or "").strip() == "One Last Run" else 2
        members = db.query(Character).filter(
            Character.campaign_id == camp_id, Character.status == "active").all() if camp_id else []
        for member in members:
            if not (member.advancement_picks or 0):
                member.advancement_taken = []
                member.advancement_set = grant
            elif grant == 4:
                # Picks still waiting from an earlier advance join One Last Run's set
                member.advancement_set = 4
            member.advancement_picks = (member.advancement_picks or 0) + grant
        # A full track replenishes the circle's resources (rulebook p. 41)
        fill_resources(target_circle, db)
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
        db.refresh(target_circle, with_for_update=True)  # see handle_gm_advance_circle
        # 1 + the active members in each resource (RULES_CHECK.md item 16)
        fill_resources(target_circle, db)
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)


async def handle_gm_end_assignment(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    if not ctx.is_gm: return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, camp_id)
    if target_circle:
        db.refresh(target_circle, with_for_update=True)  # see handle_gm_advance_circle
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
            ch.train_dice = 0
            ch.gear = []  # "Gear slots only reset once an assignment is complete" (p. 52)
        target_circle.stamina_dice_used = 0  # Stamina Training's dice come back
        # Meticulous Notes (p. 27): "After an assignment, increase your Illumination track 1
        # additional point because of the detailed notes your character returns with."
        note_takers = [ch for ch in active_chars if "Meticulous Notes" in abilities_of(ch)]
        old_illum = target_circle.illumination or 0
        if note_takers:
            target_circle.illumination = old_illum + len(note_takers)
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)
        for ch in active_chars:
            await manager.broadcast(character_key(ch.id), {"type": "character_update", "payload": get_char_dict(ch)})
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "activity_log",
            "payload": {"message": "— Assignment ended. Ability uses and gear slots have been reset. —", "log_type": "field"},
        }, db)
        for ch in note_takers:
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {
                "message": f"Meticulous Notes: {ch.name}'s detailed notes add 1 Illumination.",
                "log_type": "field", "ink_color": getattr(ch, "ink_color", "") or ""}}, db)
        await _log_illumination(db, camp_code, camp_id, target_circle, old_illum, target_circle.illumination or 0)


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
        # A line for each milestone the change passed (it used to need the value to land
        # on one), and one when the track fills (RULES_CHECK.md items 19 and 20)
        if "illumination" in payload:
            await _log_illumination(db, camp_code, camp_id, target_circle, old_illum,
                                    getattr(target_circle, "illumination", 0) or 0)
