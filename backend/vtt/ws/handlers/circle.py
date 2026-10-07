"""Circle messages from players: assignment reports, spending circle resources, and circle
creation (votes, backstory answers, personal answers, relationships).
"""
import json

from models import Character, CircleVote, Relationship
from vtt.circle_queries import relationships_list, resolve_circle, take_train_die, votes_dict
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.manager import manager


async def handle_submit_assignment_report(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    circle_id = payload.get("circle_id") or (circle.id if circle else 1)
    char_id = payload.get("character_id")
    responses = payload.get("responses", {})
    if char_id:
        target_circle = resolve_circle(db, circle_id, camp_id)
        if target_circle:
            # Read the row again, locked until the commit, so reports other sockets
            # saved after this session loaded the circle are kept.
            db.refresh(target_circle, with_for_update=True)
            raw = target_circle.backstory_answers
            if isinstance(raw, str):
                try: existing = json.loads(raw)
                except: existing = {}
            else:
                existing = raw
            # New dicts, not the loaded ones changed in place: the JSON column does not
            # track in-place changes, so assigning the same object back saved nothing.
            existing = dict(existing) if isinstance(existing, dict) else {}
            reports = existing.get("reports")
            reports = dict(reports) if isinstance(reports, dict) else {}
            reporter = db.query(Character).filter(Character.id == char_id).first()
            reporter_name = reporter.name if reporter else "Unknown"
            # The shape of the broadcast payload, which the GM's report card reads
            # after a reload too.
            reports[str(char_id)] = {"character_name": reporter_name, "responses": responses}
            existing["reports"] = reports
            target_circle.backstory_answers = existing
            db.commit()
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "assignment_report_submitted",
                "payload": {"character_id": char_id, "character_name": reporter_name, "responses": responses},
            }, db)


async def handle_spend_resource(ctx):
    db, payload, character, channel, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.character, ctx.channel, ctx.camp_code, ctx.camp_id, ctx.circle
    resource_type = payload.get("resource_type")
    if resource_type not in ("stitch", "refresh", "train"):
        return
    if not circle or not getattr(circle, "resources_editable", False):
        return
    if (getattr(character, "resources_spent_assignment", 0) or 0) >= 2:
        return
    cur_val = getattr(circle, resource_type, 0) or 0
    if cur_val <= 0:
        return

    if resource_type == "stitch":
        character.body_marks  = 0
        character.brain_marks = 0
        character.bleed_marks = 0
    elif resource_type == "refresh":
        # Refresh recoups drives and resistances (rulebook p. 41). Once-per-assignment
        # abilities come back when the Lightkeeper ends the assignment, not here.
        character.nerve_current     = character.nerve_max
        character.cunning_current   = character.cunning_max
        character.intuition_current = character.intuition_max
        character.nerve_resistance_spent     = 0
        character.cunning_resistance_spent   = 0
        character.intuition_resistance_spent = 0
    elif resource_type == "train":
        # Each Train is a die for a roll in the next assignment (p. 41): two spends, two dice
        take_train_die(character, 1)

    setattr(circle, resource_type, cur_val - 1)
    character.resources_spent_assignment = (getattr(character, "resources_spent_assignment", 0) or 0) + 1
    db.commit()

    _RESOURCE_MSG = {
        "stitch":  "all marks cleared.",
        "refresh": "drives & resistances restored.",
        "train":   "a Train d6 for a roll of their choice this assignment.",
    }
    await manager.broadcast(channel, {"type": "character_update", "payload": get_char_dict(character)})
    await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(circle)}, db)
    await manager.broadcast_campaign(camp_code, camp_id, {
        "type": "activity_log",
        "payload": {
            "message": f"{character.name} used {resource_type.capitalize()} — {_RESOURCE_MSG[resource_type]}",
            "log_type": "field",
            "ink_color": getattr(character, "ink_color", "") or "",
        },
    }, db)


async def handle_circle_creation_vote(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    c_id = payload.get("circle_id") or (circle.id if circle else 1)
    char_id = payload.get("character_id")
    v_type = payload.get("vote_type")
    v_value = payload.get("value", "")
    if char_id and v_type and v_value:
        if v_type == "name_suggest":
            count = db.query(CircleVote).filter(
                CircleVote.circle_id == c_id,
                CircleVote.character_id == char_id,
                CircleVote.vote_type == "name_suggest",
            ).count()
            already = db.query(CircleVote).filter(
                CircleVote.circle_id == c_id,
                CircleVote.character_id == char_id,
                CircleVote.vote_type == "name_suggest",
                CircleVote.value == v_value,
            ).first()
            if count < 5 and not already:
                db.add(CircleVote(circle_id=c_id, character_id=char_id, vote_type=v_type, value=v_value))
                db.commit()
        else:
            existing_vote = db.query(CircleVote).filter(
                CircleVote.circle_id == c_id,
                CircleVote.character_id == char_id,
                CircleVote.vote_type == v_type,
            ).first()
            if existing_vote:
                existing_vote.value = v_value
            else:
                db.add(CircleVote(circle_id=c_id, character_id=char_id, vote_type=v_type, value=v_value))
            db.commit()
        updated_votes = votes_dict(db, c_id)
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "vote_update",
            "payload": {"vote_type": v_type, "votes": updated_votes[v_type]}
        }, db)


async def handle_circle_backstory_update(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    c_id = payload.get("circle_id") or (circle.id if circle else 1)
    q_key = payload.get("question_key")
    answer = payload.get("answer", "")
    if q_key:
        target_circle = resolve_circle(db, c_id, camp_id)
        if target_circle:
            raw = target_circle.backstory_answers
            if isinstance(raw, str):
                try: existing_answers = json.loads(raw)
                except: existing_answers = {}
            else:
                existing_answers = dict(raw or {})
            existing_answers[q_key] = answer
            target_circle.backstory_answers = existing_answers
            db.commit()
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "backstory_update",
                "payload": {"question_key": q_key, "answer": answer}
            }, db)


async def handle_circle_personal_answer(ctx):
    db, payload, camp_code, camp_id = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id
    char_id = payload.get("character_id")
    answer = payload.get("answer", "")
    if char_id:
        target_char = db.query(Character).filter(
            Character.id == char_id,
            Character.campaign_id == camp_id,
        ).first() if camp_id else db.query(Character).filter(Character.id == char_id).first()
        if target_char:
            target_char.personal_circle_answer = answer
            db.commit()
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "personal_answer_update",
                "payload": {"character_id": char_id, "answer": answer}
            }, db)


async def handle_circle_relationship_propose(ctx):
    db, payload, camp_code, camp_id, circle = ctx.db, ctx.payload, ctx.camp_code, ctx.camp_id, ctx.circle
    c_id = payload.get("circle_id") or (circle.id if circle else 1)
    from_id = payload.get("from_character_id")
    to_id = payload.get("to_character_id")
    r_type = payload.get("rel_type", "")
    r_lore = payload.get("lore", "")
    if from_id and to_id and r_type:
        existing_rel = db.query(Relationship).filter(
            Relationship.circle_id == c_id,
            Relationship.from_character_id == from_id,
            Relationship.to_character_id == to_id,
        ).first()
        if existing_rel:
            existing_rel.rel_type = r_type
            existing_rel.lore = r_lore
            existing_rel.status = "proposed"
            existing_rel.counter_type = None
            existing_rel.counter_lore = None
            existing_rel.last_actor_id = from_id
        else:
            db.add(Relationship(
                circle_id=c_id, from_character_id=from_id,
                to_character_id=to_id, rel_type=r_type, lore=r_lore,
                status="proposed", last_actor_id=from_id,
            ))
        db.commit()
        await manager.broadcast_campaign(camp_code, camp_id, {
            "type": "relationship_update",
            "payload": {"relationships": relationships_list(db, c_id)}
        }, db)


async def handle_circle_relationship_respond(ctx):
    db, payload, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.channel, ctx.camp_code, ctx.camp_id
    rel_id = payload.get("relationship_id")
    resp_action = payload.get("action")
    # vtt.ws.access only lets a player channel send this, so the actor is its character.
    actor_id = ctx.own_char_id
    if rel_id and resp_action:
        rel = db.query(Relationship).filter(Relationship.id == rel_id).first()
        if rel:
            if resp_action == "accept":
                rel.status = "accepted"
                rel.counter_type = None
                rel.counter_lore = None
                rel.last_actor_id = actor_id
            elif resp_action == "counter":
                # Counter = re-propose with new terms; back to 'proposed' for other party
                rel.rel_type = payload.get("counter_type", rel.rel_type)
                rel.lore = payload.get("counter_lore", rel.lore or "")
                rel.status = "proposed"
                rel.counter_type = None
                rel.counter_lore = None
                rel.last_actor_id = actor_id
            db.commit()
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "relationship_update",
                "payload": {"relationships": relationships_list(db, rel.circle_id)}
            }, db)
