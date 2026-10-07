"""Circle lookups shared by the REST circle routes and the WebSocket handlers."""
from sqlalchemy.orm import Session, object_session

from models import Character, Circle, CircleVote, Relationship

RESOURCES = ("stitch", "refresh", "train")
STAMINA_DICE = 3  # Stamina Training's gilded dice for each assignment (rulebook p. 41)


def train_dice_left(character) -> int:
    """Train dice the character has waiting. A character saved before the count existed
    has train_bonus set and a count of 0: that is one die."""
    n = getattr(character, "train_dice", 0) or 0
    return n if n > 0 else (1 if getattr(character, "train_bonus", False) else 0)


def take_train_die(character, n=-1):
    """Adds (n=1) or uses (n=-1) a Train die, keeping train_bonus true while any wait."""
    left = max(0, train_dice_left(character) + n)
    character.train_dice = left
    character.train_bonus = left > 0


def resource_pool(circle, db: Session = None) -> int:
    """The circle's resource points: 1 plus its active members (rulebook p. 41), shared
    across Stitch, Refresh and Train. A campaign's members are counted by campaign, since
    they stay on the shared circle 1 (QUIRKS.md); circle 1 counts its own characters."""
    if circle.campaign_id:
        db = db or object_session(circle)
        members = db.query(Character.id).filter(
            Character.campaign_id == circle.campaign_id, Character.status == "active").count() if db else 0
    else:
        members = sum(1 for c in circle.characters if c.status == "active")
    return 1 + members


def fill_resources(circle, db: Session = None):
    """Sets Stitch, Refresh and Train to the pool split as evenly as it goes, Stitch
    first (5 points: 2, 2, 1). The Lightkeeper can move points between them afterwards."""
    total = resource_pool(circle, db)
    for i, key in enumerate(RESOURCES):
        setattr(circle, key, total // 3 + (1 if i < total % 3 else 0))


def circle_abilities(circle) -> list:
    """The circle's abilities (circle_ability holds one per line, newest last)."""
    raw = getattr(circle, "circle_ability", None) or ""
    return [line.strip() for line in raw.split("\n") if line.strip()]


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
