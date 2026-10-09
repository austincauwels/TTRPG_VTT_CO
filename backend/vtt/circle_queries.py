"""Circle lookups shared by the REST circle routes and the WebSocket handlers."""
from sqlalchemy import or_
from sqlalchemy.orm import Session, object_session

from models import Character, Circle, CircleVote, Relationship
from vtt.abilities import abilities_of, uses_of

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
    """The resource points for each of Stitch, Refresh and Train: 1 plus the active
    members (rulebook p. 41; the example on p. 62 has four players with 5 in each). A
    campaign's members are counted by campaign, since they stay on the shared circle 1
    (QUIRKS.md); circle 1 counts its own characters."""
    if circle.campaign_id:
        db = db or object_session(circle)
        members = db.query(Character.id).filter(
            Character.campaign_id == circle.campaign_id, Character.status == "active").count() if db else 0
    else:
        members = sum(1 for c in circle.characters if c.status == "active")
    return 1 + members


def downed_members(circle, db: Session = None) -> list:
    """With Nobody Left Behind (rulebook p. 41), the campaign's active members who are
    incapacitated and alive, as {id, name}: a roll to protect them or get them out of
    danger has +1d. Empty for a circle without the ability."""
    if not circle.campaign_id or "Nobody Left Behind" not in circle_abilities(circle):
        return []
    db = db or object_session(circle)
    if db is None:
        return []
    rows = db.query(Character.id, Character.name).filter(
        Character.campaign_id == circle.campaign_id, Character.status == "active",
        Character.incapacitated.is_(True), Character.is_dead.isnot(True)).order_by(Character.id).all()
    return [{"id": cid, "name": name} for cid, name in rows]


SAW_THIS_COMING_USES = 3


def saw_this_coming(circle, db: Session = None) -> list:
    """Saw This Coming (rulebook p. 27): "Three times per assignment, you may add +1d to a
    circle member's roll without spending drive". The campaign's active members who have it
    and uses left, as {id, name, left}, for the chips on the other members' desks."""
    if not circle.campaign_id:
        return []
    db = db or object_session(circle)
    if db is None:
        return []
    rows = db.query(Character).filter(
        Character.campaign_id == circle.campaign_id, Character.status == "active",
        or_(Character.role_ability.contains("Saw This Coming"), Character.specialty_ability.contains("Saw This Coming")),
    ).order_by(Character.id).all()
    return [{"id": c.id, "name": c.name, "left": SAW_THIS_COMING_USES - uses_of(c, "Saw This Coming")}
            for c in rows if "Saw This Coming" in abilities_of(c)
            and uses_of(c, "Saw This Coming") < SAW_THIS_COMING_USES]


def fill_resources(circle, db: Session = None):
    """Sets each of Stitch, Refresh and Train to 1 plus the active members. (On
    2026-10-06 this split one pool of that size across the three, a misreading of p. 41
    that the p. 62 example rules out.)"""
    points = resource_pool(circle, db)
    for key in RESOURCES:
        setattr(circle, key, points)


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


NAME_MAX = 80


def canonical_name_suggestion(db: Session, circle_id: int, value) -> str:
    """A suggested circle name with its spaces collapsed and cut to NAME_MAX. One that matches
    an earlier suggestion, ignoring case, is returned in that suggestion's spelling, so the
    votes for it merge instead of splitting."""
    text = " ".join(str(value or "").split())[:NAME_MAX].strip()
    if not text:
        return ""
    for (known,) in db.query(CircleVote.value).filter(
            CircleVote.circle_id == circle_id, CircleVote.vote_type == "name_suggest").order_by(CircleVote.id):
        if known and known.casefold() == text.casefold():
            return known
    return text


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
