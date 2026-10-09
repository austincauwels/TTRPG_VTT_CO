"""gm_timer: the Lightkeeper's countdown beside the hourglass (vtt/countdown.py).

Only the campaign's Lightkeeper may send it, for the campaign's own circle (vtt.ws.access,
the rule of the circle toggles). Fields: `action`, one of countdown.ACTIONS; `duration_ms`
for set; `circle_id` (default: the circle loaded at connect). An unknown action or a
duration outside one second to three hours is refused with action_rejected 422, and
start before a duration is set with 409; nothing changes then. Each change sends
circle_update to the campaign, as gm_update_circle does.
"""
from vtt import countdown
from vtt.circle_queries import resolve_circle
from vtt.serializers import get_circle_dict
from vtt.ws.manager import manager


async def _refuse(ctx, status, detail):
    await manager.broadcast(ctx.channel, {"type": "action_rejected", "payload": {
        "action": "gm_timer", "status": status, "detail": detail}})


async def handle_gm_timer(ctx):
    db, payload, circle = ctx.db, ctx.payload, ctx.circle
    if not ctx.is_gm: return

    action = payload.get("action")
    duration = payload.get("duration_ms")
    if action not in countdown.ACTIONS:
        await _refuse(ctx, 422, "Unknown timer action.")
        return
    if action == "set" and not countdown.valid_duration(duration):
        await _refuse(ctx, 422, "A timer runs from 1 second to 3 hours.")
        return
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    target_circle = resolve_circle(db, circle_id, ctx.camp_id)
    if target_circle is None:
        return
    db.refresh(target_circle, with_for_update=True)  # see gm.handle_gm_advance_circle
    if action == "start" and not target_circle.timer_duration_ms:
        db.rollback()
        await _refuse(ctx, 409, "The timer has no duration yet.")
        return
    countdown.apply_action(target_circle, action, duration)
    db.commit()
    await manager.broadcast_campaign(ctx.camp_code, ctx.camp_id, {
        "type": "circle_update", "payload": get_circle_dict(target_circle)}, db)
