"""Circle creation routes: creation state, votes, relationships, and finalizing the roster.

Every route needs a login token. Who may call what is in docs/refactor/AUTH.md.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Campaign, Character, Circle, CircleVote, Relationship, User
from vtt.auth import (
    MEMBER_STATUSES, campaign_or_404, character_or_404, forbidden, get_current_user, require_gm,
    require_gm_or_member, require_owner,
)
from vtt.circle_queries import get_or_create_campaign_circle, relationships_list, votes_dict
from vtt.db import get_db
from vtt.schemas import CircleVoteSubmit, FinalizeRosterRequest, RelationshipPropose, RelationshipRespond
from vtt.serializers import get_char_dict, get_circle_dict
from vtt.ws.manager import manager

router = APIRouter()


def _circle_campaign_or_404(db: Session, circle_id):
    """The campaign id a circle belongs to (None for the legacy circle 1); 404 for an unknown circle."""
    row = db.query(Circle.id, Circle.campaign_id).filter(Circle.id == circle_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Circle not found")
    return row.campaign_id


def _require_member_of(character, campaign_id):
    """The character must be an active or pending member of the circle's campaign."""
    if campaign_id is None or character.campaign_id != campaign_id or character.status not in MEMBER_STATUSES:
        raise forbidden()


@router.get("/campaign/{campaign_id}/circle-creation-state")
def get_circle_creation_state(campaign_id: int, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    require_gm_or_member(db, user, campaign_or_404(db, campaign_id))
    circle = get_or_create_campaign_circle(db, campaign_id)
    active = db.query(Character).filter(
        Character.campaign_id == campaign_id,
        Character.status == "active"
    ).all()
    return {
        "circle_id": circle.id,
        "is_finalized": bool(getattr(circle, "is_finalized", False)),
        "active_investigators": [get_char_dict(c) for c in active],
        "votes": votes_dict(db, circle.id),
        "relationships": relationships_list(db, circle.id),
        "backstory_answers": get_circle_dict(circle)["backstory_answers"],
    }

@router.post("/circle/vote")
def submit_circle_vote(body: CircleVoteSubmit, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    voter = character_or_404(db, body.character_id)
    require_owner(user, voter)
    _require_member_of(voter, _circle_campaign_or_404(db, body.circle_id))
    if body.vote_type == "name_suggest":
        count = db.query(CircleVote).filter(
            CircleVote.circle_id == body.circle_id,
            CircleVote.character_id == body.character_id,
            CircleVote.vote_type == "name_suggest",
        ).count()
        already = db.query(CircleVote).filter(
            CircleVote.circle_id == body.circle_id,
            CircleVote.character_id == body.character_id,
            CircleVote.vote_type == "name_suggest",
            CircleVote.value == body.value,
        ).first()
        if count < 5 and not already:
            db.add(CircleVote(circle_id=body.circle_id, character_id=body.character_id,
                              vote_type="name_suggest", value=body.value))
            db.commit()
    else:
        existing = db.query(CircleVote).filter(
            CircleVote.circle_id == body.circle_id,
            CircleVote.character_id == body.character_id,
            CircleVote.vote_type == body.vote_type,
        ).first()
        if existing:
            existing.value = body.value
        else:
            db.add(CircleVote(circle_id=body.circle_id, character_id=body.character_id,
                              vote_type=body.vote_type, value=body.value))
        db.commit()
    all_votes = votes_dict(db, body.circle_id)
    return {"ok": True, "votes": all_votes[body.vote_type]}

@router.post("/circle/relationship/propose")
def propose_relationship(body: RelationshipPropose, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    proposer = character_or_404(db, body.from_character_id)
    require_owner(user, proposer)
    other = character_or_404(db, body.to_character_id)
    circle_campaign = _circle_campaign_or_404(db, body.circle_id)
    _require_member_of(proposer, circle_campaign)
    _require_member_of(other, circle_campaign)
    existing = db.query(Relationship).filter(
        Relationship.circle_id == body.circle_id,
        Relationship.from_character_id == body.from_character_id,
        Relationship.to_character_id == body.to_character_id,
    ).first()
    # last_actor_id records who acted last, as the WebSocket does, so that only the
    # other party may answer (over REST or the WebSocket).
    if existing:
        existing.rel_type = body.rel_type
        existing.lore = body.lore
        existing.status = "proposed"
        existing.counter_type = None
        existing.counter_lore = None
        existing.last_actor_id = proposer.id
    else:
        db.add(Relationship(
            circle_id=body.circle_id,
            from_character_id=body.from_character_id,
            to_character_id=body.to_character_id,
            rel_type=body.rel_type,
            lore=body.lore,
            status="proposed",
            last_actor_id=proposer.id,
        ))
    db.commit()
    return {"ok": True, "relationships": relationships_list(db, body.circle_id)}

def _relationship_responder(db, user, rel):
    """The character the caller answers for: the party that did not act last (for a
    row with no recorded actor, the character the proposal was made to), and only if
    the caller owns it. The same rule as the WebSocket's circle_relationship_respond."""
    if rel.last_actor_id is None:
        allowed = (rel.to_character_id,)
    else:
        allowed = tuple(c for c in (rel.to_character_id, rel.from_character_id) if c != rel.last_actor_id)
    for character_id in allowed:
        if character_or_404(db, character_id).user_id == user.id:
            return character_id
    raise forbidden()


@router.post("/circle/relationship/respond")
def respond_relationship(body: RelationshipRespond, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    rel = db.query(Relationship).filter(Relationship.id == body.relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    responder_id = _relationship_responder(db, user, rel)
    if body.action == "accept":
        rel.status = "accepted"
        rel.counter_type = None
        rel.counter_lore = None
        rel.last_actor_id = responder_id
    elif body.action == "counter":
        rel.status = "countered"
        rel.counter_type = body.counter_type
        rel.counter_lore = body.counter_lore
        rel.last_actor_id = responder_id
    db.commit()
    return {"ok": True, "relationships": relationships_list(db, rel.circle_id)}

@router.post("/campaign/finalize-roster")
async def finalize_roster(body: FinalizeRosterRequest, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    require_gm(user, campaign_or_404(db, body.campaign_id))
    campaign = db.query(Campaign).filter(Campaign.id == body.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    # Find circle: prefer exact match by id+campaign, fall back to campaign's circle
    circle = db.query(Circle).filter(
        Circle.id == body.circle_id,
        Circle.campaign_id == body.campaign_id,
    ).first()
    if not circle:
        circle = get_or_create_campaign_circle(db, body.campaign_id)
    if not circle:
        raise HTTPException(status_code=404, detail="No circle found for this campaign")

    # Tally name: prefer name_vote, fall back to name_suggest count
    def _tally_winner(votes_list):
        if not votes_list: return None
        tally: dict = {}
        for v in votes_list:
            tally[v.value] = tally.get(v.value, 0) + 1
        return max(tally, key=lambda k: tally[k])

    # Load all votes for this circle in one query, then group in Python
    all_circle_votes = db.query(CircleVote).filter(
        CircleVote.circle_id == circle.id
    ).all()
    votes_by_type: dict = {}
    for v in all_circle_votes:
        votes_by_type.setdefault(v.vote_type, []).append(v)

    name_winner = _tally_winner(votes_by_type.get("name_vote", [])) or _tally_winner(votes_by_type.get("name_suggest", []))
    if name_winner:
        circle.name = name_winner

    for vote_type, attr in [("ability", "circle_ability"), ("insignia", "insignia"), ("question", None)]:
        winner = _tally_winner(votes_by_type.get(vote_type, []))
        if winner:
            if attr:
                setattr(circle, attr, winner)
            elif vote_type == "question":
                raw_ba = getattr(circle, "backstory_answers", None)
                if isinstance(raw_ba, str):
                    try: current = json.loads(raw_ba)
                    except: current = {}
                else:
                    current = dict(raw_ba or {})
                current["selected_question_key"] = winner
                circle.backstory_answers = current

    # Carry chapter house from collaborative backstory answers into the dedicated column
    if not circle.chapter_house_location:
        raw_ba2 = circle.backstory_answers
        if isinstance(raw_ba2, str):
            try: ba = json.loads(raw_ba2)
            except: ba = {}
        else:
            ba = dict(raw_ba2 or {})
        house = ba.get("chapter_house", "")
        if house:
            circle.chapter_house_location = house

    circle.is_finalized = True
    campaign.roster_finalized = True

    # Set starting resources to 1 + number of active members
    active_member_count = db.query(Character).filter(
        Character.campaign_id == body.campaign_id,
        Character.status == "active",
    ).count()
    starting_resources = 1 + active_member_count
    circle.stitch  = starting_resources
    circle.refresh = starting_resources
    circle.train   = starting_resources

    # Any character still pending when the roster is locked was not included — release them
    pending_chars = db.query(Character).filter(
        Character.campaign_id == body.campaign_id,
        Character.status == "pending",
    ).all()
    rejected_ids = []
    for pc in pending_chars:
        pc.status = "unaffiliated"
        pc.campaign_id = None
        rejected_ids.append(pc.id)

    db.commit()
    db.refresh(circle)

    await manager.broadcast_campaign(campaign.campaign_code, body.campaign_id, {
        "type": "roster_finalized",
        "payload": {
            "circle": get_circle_dict(circle),
            "campaign_id": body.campaign_id,
            "rejected_character_ids": rejected_ids,
        }
    }, db)
    return get_circle_dict(circle)
