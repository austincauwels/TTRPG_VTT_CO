"""Circle lookups shared by the REST circle routes and the WebSocket handlers."""
from sqlalchemy.orm import Session

from models import Circle, CircleVote, Relationship


def get_or_create_campaign_circle(db: Session, campaign_id: int) -> Circle:
    """Returns the circle owned by this campaign, creating one if it doesn't exist yet."""
    circle = db.query(Circle).filter(Circle.campaign_id == campaign_id).first()
    if not circle:
        circle = Circle(name="Unnamed Circle", stitch=1, refresh=1, train=1, campaign_id=campaign_id)
        db.add(circle)
        db.commit()
        db.refresh(circle)
    return circle

# The circle creation vote types. Any other vote_type is refused (422) before it is stored.
VOTE_TYPES = ("name_suggest", "name_vote", "ability", "question", "insignia")


def votes_dict(db: Session, circle_id: int) -> dict:
    all_votes = db.query(CircleVote).filter(CircleVote.circle_id == circle_id).all()
    result = {vote_type: [] for vote_type in VOTE_TYPES}
    for v in all_votes:
        vtype = v.vote_type
        if vtype in result:
            result[vtype].append({"character_id": v.character_id, "value": v.value})
    return result

def relationships_list(db: Session, circle_id: int) -> list:
    rels = db.query(Relationship).filter(Relationship.circle_id == circle_id).all()
    return [
        {
            "id": r.id,
            "from_character_id": r.from_character_id,
            "to_character_id": r.to_character_id,
            "rel_type": r.rel_type,
            "lore": r.lore or "",
            "status": r.status,
            "last_actor_id": getattr(r, "last_actor_id", None),
        }
        for r in rels
    ]

def resolve_circle(db, circle_id, camp_id):
    """Find circle by id. Falls back to plain id lookup for legacy circles with campaign_id=NULL."""
    if camp_id:
        c = db.query(Circle).filter(Circle.id == circle_id, Circle.campaign_id == camp_id).first()
        if c is None:
            c = db.query(Circle).filter(Circle.id == circle_id).first()
        return c
    return db.query(Circle).filter(Circle.id == circle_id).first()
