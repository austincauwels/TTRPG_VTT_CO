"""FastAPI application: REST endpoints, WebSocket game loop, authentication, and database session management."""
import os
import sys
import json
import base64
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv

# Ensure backend/ is on the path regardless of where uvicorn is invoked from
sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("candela")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request, status, APIRouter, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, text, or_, func
from sqlalchemy.orm import sessionmaker, Session, joinedload
from pydantic import BaseModel, field_validator
import re as _re

from models import Base, User, Game, Character, Circle, Campaign, NotebookEntry, CircleVote, Relationship
from engine import (
    create_new_campaign, request_join_campaign,
    approve_investigator, reject_investigator, get_campaign_roster,
    roll_dice, calculate_resistance_max, burn_resistance,
    get_notebook_entries, create_notebook_entry,
    calculate_outcome, OUTCOME_LABELS,
    apply_advancement,
)

# Abilities that can intercept marks on other players — used for efficient DB filtering
INTERCEPT_ABILITIES = {"Behind Me", "Premonitions"}

_secret = os.getenv("SECRET_KEY")
if not _secret:
    raise RuntimeError("SECRET_KEY environment variable must be set. Generate one with: openssl rand -hex 32")
SECRET_KEY = _secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./candela_obscura.db")
_connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
db_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
Base.metadata.create_all(bind=db_engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Seed required rows and run additive ALTER TABLE migrations. Each migration is idempotent — the except block silently ignores columns that already exist."""
    db = SessionLocal()
    try:
        circle = db.query(Circle).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)

        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                id=1,
                username="admin",
                email="admin@archive.com",
                hashed_password=pwd_context.hash("admin")
            )
            db.add(new_admin)

        db.commit()
    except Exception as e:
        logger.error("Error seeding database: %s", e)
    finally:
        db.close()

    for col, typedef in [
        ("guard_patrol", "INTEGER DEFAULT 0"),
        ("miasma_bleed", "INTEGER DEFAULT 0"),
        ("location",     "TEXT DEFAULT ''"),
        ("atmosphere",   "TEXT DEFAULT ''"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass  # column already exists

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN gm_user_id INTEGER"))
            conn.commit()
    except Exception:
        pass  # column already exists

    for col in [("role", "TEXT DEFAULT ''"), ("specialty", "TEXT DEFAULT ''")]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col[0]} {col[1]}"))
                conn.commit()
        except Exception:
            pass  # column already exists

    for col, typedef in [
        ("chapter_house_location", "TEXT"),
        ("circle_ability",         "TEXT"),
        ("insignia",               "TEXT"),
        ("backstory_answers",      "TEXT DEFAULT '{}'"),
        ("is_finalized",           "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN roster_finalized INTEGER DEFAULT 0"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE characters ADD COLUMN personal_circle_answer TEXT DEFAULT ''"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE relationships ADD COLUMN last_actor_id INTEGER"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE circles ADD COLUMN illumination INTEGER DEFAULT 0"))
            conn.commit()
    except Exception:
        pass

    for col, typedef in [
        ("tension_clock", "INTEGER DEFAULT 4"),
        ("tension_label", "TEXT DEFAULT ''"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    for col in ["nerve_resistance_spent", "cunning_resistance_spent", "intuition_resistance_spent"]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col} INTEGER DEFAULT 0"))
                conn.commit()
        except Exception:
            pass

    for col, typedef in [
        ("entry_type", "TEXT DEFAULT 'field_log'"),
        ("visibility",  "TEXT DEFAULT 'all'"),
        ("image_data",  "TEXT"),
        ("is_deleted",  "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE notebook_entries ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    for col, typedef in [
        ("resources_editable", "INTEGER DEFAULT 0"),
        ("reports_open",       "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE circles ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE characters ADD COLUMN ability_uses TEXT DEFAULT '{}'"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_rejoin_campaign_id INTEGER"))
            conn.commit()
    except Exception:
        pass

    for col, typedef in [
        ("train_bonus",                "INTEGER DEFAULT 0"),
        ("resources_spent_assignment", "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

init_db()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# PYDANTIC SCHEMAS
# =====================================================================
class NotebookEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_length(cls, v):
        if len(v) > 64:
            raise ValueError("Username too long")
        return v

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanum(cls, v):
        if len(v) < 2 or len(v) > 32:
            raise ValueError("Username must be 2–32 characters")
        if not _re.match(r"^[\w\-. ]+$", v):
            raise ValueError("Username contains invalid characters")
        return v

    @field_validator("email")
    @classmethod
    def email_length(cls, v):
        if len(v) > 254:
            raise ValueError("Email too long")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v

class CharacterBase(BaseModel):
    name: str
    pronouns: str = "Unlisted"
    style: str = ""
    catalyst: str = ""
    question: str = ""
    role: str = ""
    specialty: str = ""
    role_ability: str = "None"
    specialty_ability: str = "None"
    profile_pic: Optional[str] = None
    gear: List[str] = []

    move: int = 0
    strike: int = 0
    control: int = 0
    sneak: int = 0
    hide: int = 0
    sway: int = 0
    survey: int = 0
    read: int = 0
    sense: int = 0

    gilded_move: bool = False
    gilded_strike: bool = False
    gilded_control: bool = False
    gilded_hide: bool = False
    gilded_sneak: bool = False
    gilded_sway: bool = False
    gilded_survey: bool = False
    gilded_read: bool = False
    gilded_sense: bool = False

    nerve_current: int = 1
    nerve_max: int = 1
    nerve_resistance_spent: int = 0
    cunning_current: int = 1
    cunning_max: int = 1
    cunning_resistance_spent: int = 0
    intuition_current: int = 1
    intuition_max: int = 1
    intuition_resistance_spent: int = 0

    body_marks: int = 0
    brain_marks: int = 0
    bleed_marks: int = 0
    scars_count: int = 0
    scars_list: List[str] = []
    incapacitated: bool = False

class CharacterCreate(CharacterBase):
    user_id: Optional[int] = None

class CharacterSummaryItem(BaseModel):
    id: int
    name: str
    role_ability: str = "None"
    specialty_ability: str = "None"
    status: str
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_code: Optional[str] = None
    class Config:
        from_attributes = True

class CampaignSummaryItem(BaseModel):
    id: int
    name: str
    campaign_code: str
    class Config:
        from_attributes = True

class CharacterResponse(CharacterBase):
    id: int
    circle_id: int
    status: str = "unaffiliated"
    pen_font: str = "Caveat"
    ink_color: str = ""
    class Config:
        from_attributes = True

class CharacterRosterItem(BaseModel):
    id: int
    name: str
    role_class: Optional[str] = None
    role_ability: Optional[str] = None
    specialty: Optional[str] = None
    specialty_ability: Optional[str] = None
    profile_pic: Optional[str] = None
    circle_name: Optional[str] = None
    status: str
    is_dead: bool = False
    pen_font: Optional[str] = "Caveat"
    ink_color: Optional[str] = ""
    class Config:
        from_attributes = True

class RosterResponse(BaseModel):
    pending_investigators: List[CharacterRosterItem]
    active_investigators: List[CharacterRosterItem]
    roster_finalized: bool = False

class NotebookEntryCreate(BaseModel):
    title: str
    content: str
    author_name: str
    author_type: str          # 'gm' | 'player'
    character_id: Optional[int] = None
    entry_type: str = 'field_log'
    visibility: str = 'all'
    image_data: Optional[str] = None

class NotebookEntryResponse(BaseModel):
    id: int
    campaign_id: int
    character_id: Optional[int]
    author_name: str
    author_type: str
    pen_font: str
    ink_color: str
    title: str
    content: str
    created_at: str
    page_number: int
    entry_type: str = 'field_log'
    visibility: str = 'all'
    image_data: Optional[str] = None
    is_deleted: bool = False
    class Config:
        from_attributes = True

# =====================================================================
# CAMPAIGN ROUTER
# =====================================================================
router = APIRouter()

_SAFE_FONT_NAMES = {
    "Caveat", "Satisfy", "Kalam", "Shadows Into Light", "Amatic SC", "Permanent Marker",
    "Reenie Beenie", "Zeyada", "Sacramento", "Homemade Apple", "Alex Brush",
    "Cedarville Cursive", "La Belle Aurore", "Charm", "Dawning of a New Day",
    "Gaegu", "Grape Nuts", "Moondance", "Long Cang", "Indie Flower",
    "Patrick Hand", "Rock Salt", "Gochi Hand",
}
_ALLOWED_CAMPAIGN_CODE_RE = _re.compile(r"^[a-zA-Z0-9\-_]{3,32}$")

@router.post("/campaign/create")
def create_campaign(name: str, code: str, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    if not _ALLOWED_CAMPAIGN_CODE_RE.match(code):
        raise HTTPException(status_code=422, detail="Campaign code must be 3–32 alphanumeric characters (hyphens/underscores allowed)")
    if len(name) < 1 or len(name) > 80:
        raise HTTPException(status_code=422, detail="Campaign name must be 1–80 characters")
    return create_new_campaign(db, name, code, gm_user_id=user_id)

@router.post("/campaign/join")
async def join_campaign(character_id: int, code: str, pen_font: str = 'Caveat', db: Session = Depends(get_db)):
    if not _ALLOWED_CAMPAIGN_CODE_RE.match(code):
        raise HTTPException(status_code=422, detail="Invalid campaign code format")
    if pen_font not in _SAFE_FONT_NAMES:
        pen_font = "Caveat"
    result = request_join_campaign(db, character_id, code, pen_font)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    char = result.get("character")
    if char:
        campaign = db.query(Campaign).filter(Campaign.id == char.campaign_id).first()
        pending = db.query(Character).filter(
            Character.campaign_id == char.campaign_id,
            Character.status == "pending"
        ).all()
        camp_code = campaign.campaign_code if campaign else code
        camp_id = campaign.id if campaign else None
        payload = {
            "type": "investigator_joined",
            "payload": {
                "campaign_code": camp_code,
                "pending_investigators": [get_char_dict(c) for c in pending],
            }
        }
        if camp_id:
            await manager.broadcast_campaign(camp_code, camp_id, payload, db)
        else:
            await manager.broadcast(code, payload)
    return result

@router.post("/campaign/approve/{character_id}")
async def approve_character(character_id: int, db: Session = Depends(get_db)):
    result = approve_investigator(db, character_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    # Broadcast to all connected clients so popup relationship matrices update live
    char = db.query(Character).filter(Character.id == character_id).first()
    if char and char.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == char.campaign_id).first()
        active = db.query(Character).filter(
            Character.campaign_id == char.campaign_id,
            Character.status == "active"
        ).all()
        await manager.broadcast_campaign(campaign.campaign_code, char.campaign_id, {
            "type": "investigator_approved",
            "payload": {
                "character": get_char_dict(char),
                "active_investigators": [get_char_dict(c) for c in active],
                "campaign_id": char.campaign_id,
            }
        }, db)
    return result

@router.post("/campaign/reject/{character_id}")
async def reject_character(character_id: int, db: Session = Depends(get_db)):
    # Capture campaign info before the reject clears campaign_id
    char_before = db.query(Character).filter(Character.id == character_id).first()
    camp_id_before = char_before.campaign_id if char_before else None
    campaign_before = db.query(Campaign).filter(Campaign.id == camp_id_before).first() if camp_id_before else None
    camp_code_before = campaign_before.campaign_code if campaign_before else None
    pending_before = db.query(Character).filter(
        Character.campaign_id == camp_id_before,
        Character.status == "pending",
        Character.id != character_id,
    ).all() if camp_id_before else []

    result = reject_investigator(db, character_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    char_after = result.get("character")
    if camp_code_before and camp_id_before:
        await manager.broadcast_campaign(camp_code_before, camp_id_before, {
            "type": "investigator_rejected",
            "payload": {
                "character_id": character_id,
                "pending_investigators": [get_char_dict(c) for c in pending_before],
            },
        }, db)
        # Also notify the rejected character directly if they're connected
        await manager.broadcast(str(character_id), {
            "type": "investigator_rejected",
            "payload": {"character_id": character_id},
        })
    return result

@router.post("/campaign/{campaign_id}/retire")
async def retire_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.is_retired = True
    active_chars = db.query(Character).filter(
        Character.campaign_id == campaign_id,
        Character.status.in_(["active", "pending"]),
    ).all()
    for c in active_chars:
        c.status = "retired"
    db.commit()
    await manager.broadcast_campaign(campaign.campaign_code, campaign_id, {
        "type": "campaign_retired",
        "payload": {"campaign_id": campaign_id, "campaign_code": campaign.campaign_code},
    }, db)
    return {"ok": True}

class RejoinRequest(BaseModel):
    character_id: int
    campaign_code: str

@router.post("/campaign/rejoin")
async def rejoin_campaign(body: RejoinRequest, db: Session = Depends(get_db)):
    from engine import INK_COLORS
    campaign = db.query(Campaign).filter(Campaign.campaign_code == body.campaign_code).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    new_char = db.query(Character).filter(Character.id == body.character_id).first()
    if not new_char:
        raise HTTPException(status_code=404, detail="Character not found")

    # Retire any active or dead characters this user had in this campaign
    old_chars = db.query(Character).filter(
        Character.campaign_id == campaign.id,
        Character.user_id == new_char.user_id,
        Character.id != new_char.id,
        or_(Character.status == "active", Character.is_dead == True),
    ).all()
    for c in old_chars:
        c.status = "retired"

    # Assign ink color and activate the new character
    active_count = db.query(Character).filter(
        Character.campaign_id == campaign.id,
        Character.status == "active",
        Character.ink_color != "",
    ).count()
    new_char.campaign_id = campaign.id
    new_char.ink_color = INK_COLORS[active_count % len(INK_COLORS)]
    new_char.status = "active"

    # Attach to campaign's circle so relationship proposals work mid-campaign
    campaign_circle = db.query(Circle).filter(Circle.campaign_id == campaign.id).first()
    if campaign_circle:
        new_char.circle_id = campaign_circle.id

    db.commit()
    db.refresh(new_char)

    # Clear any pending rejoin invite for this user
    rejoining_user = db.query(User).filter(User.id == new_char.user_id).first()
    if rejoining_user:
        rejoining_user.pending_rejoin_campaign_id = None
        db.commit()

    active = db.query(Character).filter(
        Character.campaign_id == campaign.id,
        Character.status == "active",
    ).all()
    await manager.broadcast_campaign(campaign.campaign_code, campaign.id, {
        "type": "investigator_approved",
        "payload": {
            "character": get_char_dict(new_char),
            "active_investigators": [get_char_dict(c) for c in active],
            "campaign_id": campaign.id,
        },
    }, db)
    await manager.broadcast_campaign(campaign.campaign_code, campaign.id, {
        "type": "character_joined_mid_campaign",
        "payload": {
            "new_character": get_char_dict(new_char),
            "active_investigators": [get_char_dict(c) for c in active],
            "campaign_id": campaign.id,
        },
    }, db)
    return {"success": True, "character": get_char_dict(new_char)}

class InviteRejoinRequest(BaseModel):
    username: str

@router.post("/campaign/{campaign_id}/invite-rejoin")
async def invite_rejoin(campaign_id: int, body: InviteRejoinRequest, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    user = db.query(User).filter(func.lower(User.username) == body.username.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No player found with that username.")

    user.pending_rejoin_campaign_id = campaign_id
    db.commit()

    # Attempt live delivery to any character websocket this user owns
    chars = db.query(Character).filter(Character.user_id == user.id).all()
    for c in chars:
        await manager.broadcast(str(c.id), {
            "type": "gm_rejoin_invite",
            "payload": {
                "campaign_id": campaign_id,
                "campaign_name": campaign.name,
                "campaign_code": campaign.campaign_code,
            },
        })
    return {"ok": True}

@router.get("/campaign/{campaign_id}/roster", response_model=RosterResponse)
def get_roster(campaign_id: int, db: Session = Depends(get_db)):
    raw = get_campaign_roster(db, campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    def to_item(c):
        return CharacterRosterItem(
            id=c.id,
            name=c.name,
            role_class=getattr(c, "role", "") or "",
            role_ability=c.role_ability or "None",
            specialty=getattr(c, "specialty", "") or "",
            specialty_ability=c.specialty_ability or "None",
            profile_pic=c.profile_pic,
            circle_name=c.circle.name if c.circle else None,
            status=c.status,
            is_dead=bool(getattr(c, "is_dead", False)),
            pen_font=getattr(c, "pen_font", "Caveat") or "Caveat",
            ink_color=getattr(c, "ink_color", "") or "",
        )
    return {
        "pending_investigators": [to_item(c) for c in raw["pending_investigators"]],
        # Exclude deceased investigators — they stay in the DB as "active" until
        # their replacement is approved, but they should not appear in the live roster.
        "active_investigators": [to_item(c) for c in raw["active_investigators"] if not c.is_dead],
        "roster_finalized": bool(campaign.roster_finalized) if campaign else False,
    }

# =====================================================================
# CIRCLE CREATION SCHEMAS
# =====================================================================

class CircleVoteSubmit(BaseModel):
    circle_id: int
    character_id: int
    vote_type: str   # 'name' | 'ability' | 'question'
    value: str

class RelationshipPropose(BaseModel):
    circle_id: int
    from_character_id: int
    to_character_id: int
    rel_type: str
    lore: str = ""

class RelationshipRespond(BaseModel):
    relationship_id: int
    action: str          # 'accept' | 'counter'
    counter_type: Optional[str] = None
    counter_lore: Optional[str] = None

class FinalizeRosterRequest(BaseModel):
    campaign_id: int
    circle_id: int

# =====================================================================
# CIRCLE CREATION ENDPOINTS
# =====================================================================

def get_or_create_campaign_circle(db: Session, campaign_id: int) -> Circle:
    """Returns the circle owned by this campaign, creating one if it doesn't exist yet."""
    circle = db.query(Circle).filter(Circle.campaign_id == campaign_id).first()
    if not circle:
        circle = Circle(name="Unnamed Circle", stitch=1, refresh=1, train=1, campaign_id=campaign_id)
        db.add(circle)
        db.commit()
        db.refresh(circle)
    return circle

def _votes_dict(db: Session, circle_id: int) -> dict:
    all_votes = db.query(CircleVote).filter(CircleVote.circle_id == circle_id).all()
    result = {"name_suggest": [], "name_vote": [], "ability": [], "question": [], "insignia": []}
    for v in all_votes:
        vtype = v.vote_type
        if vtype in result:
            result[vtype].append({"character_id": v.character_id, "value": v.value})
    return result

def _relationships_list(db: Session, circle_id: int) -> list:
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

@router.get("/campaign/{campaign_id}/circle-creation-state")
def get_circle_creation_state(campaign_id: int, db: Session = Depends(get_db)):
    circle = get_or_create_campaign_circle(db, campaign_id)
    active = db.query(Character).filter(
        Character.campaign_id == campaign_id,
        Character.status == "active"
    ).all()
    return {
        "circle_id": circle.id,
        "is_finalized": bool(getattr(circle, "is_finalized", False)),
        "active_investigators": [get_char_dict(c) for c in active],
        "votes": _votes_dict(db, circle.id),
        "relationships": _relationships_list(db, circle.id),
        "backstory_answers": get_circle_dict(circle)["backstory_answers"],
    }

@router.post("/circle/vote")
def submit_circle_vote(body: CircleVoteSubmit, db: Session = Depends(get_db)):
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
    all_votes = _votes_dict(db, body.circle_id)
    return {"ok": True, "votes": all_votes[body.vote_type]}

@router.post("/circle/relationship/propose")
def propose_relationship(body: RelationshipPropose, db: Session = Depends(get_db)):
    existing = db.query(Relationship).filter(
        Relationship.circle_id == body.circle_id,
        Relationship.from_character_id == body.from_character_id,
        Relationship.to_character_id == body.to_character_id,
    ).first()
    if existing:
        existing.rel_type = body.rel_type
        existing.lore = body.lore
        existing.status = "proposed"
        existing.counter_type = None
        existing.counter_lore = None
    else:
        db.add(Relationship(
            circle_id=body.circle_id,
            from_character_id=body.from_character_id,
            to_character_id=body.to_character_id,
            rel_type=body.rel_type,
            lore=body.lore,
            status="proposed",
        ))
    db.commit()
    return {"ok": True, "relationships": _relationships_list(db, body.circle_id)}

@router.post("/circle/relationship/respond")
def respond_relationship(body: RelationshipRespond, db: Session = Depends(get_db)):
    rel = db.query(Relationship).filter(Relationship.id == body.relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if body.action == "accept":
        rel.status = "accepted"
        rel.counter_type = None
        rel.counter_lore = None
    elif body.action == "counter":
        rel.status = "countered"
        rel.counter_type = body.counter_type
        rel.counter_lore = body.counter_lore
    db.commit()
    return {"ok": True, "relationships": _relationships_list(db, rel.circle_id)}

@router.post("/campaign/finalize-roster")
async def finalize_roster(body: FinalizeRosterRequest, db: Session = Depends(get_db)):
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

app.include_router(router)

# =====================================================================
# REST API ENDPOINTS
# =====================================================================

@app.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()

    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        logger.warning("Failed login attempt for username=%r", credentials.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    gm_campaign = db.query(Campaign).filter(
        Campaign.gm_user_id == user.id,
        Campaign.is_retired == False,
    ).first()

    if gm_campaign:
        return {
            "role": "GM",
            "name": user.username,
            "userId": user.id,
            "campaignCode": gm_campaign.campaign_code,
            "campaignId": gm_campaign.id,
        }

    pending_invite = None
    if user.pending_rejoin_campaign_id:
        invite_camp = db.query(Campaign).filter(Campaign.id == user.pending_rejoin_campaign_id).first()
        if invite_camp and not invite_camp.is_retired:
            pending_invite = {
                "campaign_id": invite_camp.id,
                "campaign_name": invite_camp.name,
                "campaign_code": invite_camp.campaign_code,
            }

    return {
        "role": "PLAYER",
        "name": user.username,
        "userId": user.id,
        "campaignCode": None,
        "campaignId": None,
        "pendingRejoinInvite": pending_invite,
    }

@app.post("/api/auth/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, credentials: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == credentials.username).first():
        raise HTTPException(status_code=400, detail="That identification is already claimed.")
    if db.query(User).filter(User.email == credentials.email).first():
        raise HTTPException(status_code=400, detail="That correspondence address is already registered.")

    new_user = User(
        username=credentials.username,
        email=credentials.email,
        hashed_password=pwd_context.hash(credentials.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    campaign = db.query(Campaign).filter(Campaign.campaign_code == "fairelands-01").first()

    return {
        "role": "PLAYER",
        "name": new_user.username,
        "userId": new_user.id,
        "campaignCode": "fairelands-01",
        "campaignId": campaign.id if campaign else None
    }

@app.get("/api/investigators", response_model=List[CharacterRosterItem])
async def list_investigators(db: Session = Depends(get_db)):
    characters = db.query(Character).all()
    return [
        CharacterRosterItem(
            id=c.id,
            name=c.name,
            role_class=getattr(c, "role", "") or "",
            role_ability=c.role_ability or "None",
            specialty=getattr(c, "specialty", "") or "",
            specialty_ability=c.specialty_ability or "None",
            profile_pic=c.profile_pic,
            circle_name=None,
            status=c.status,
        )
        for c in characters
    ]

@app.get("/api/investigators/{investigator_id}", response_model=CharacterResponse)
async def get_investigator(investigator_id: int, db: Session = Depends(get_db)):
    character = db.query(Character).filter(Character.id == investigator_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Investigator dossier not found.")

    if isinstance(character.gear, str):
        try: character.gear = json.loads(character.gear)
        except: character.gear = []
    if isinstance(character.scars_list, str):
        try: character.scars_list = json.loads(character.scars_list)
        except: character.scars_list = []

    return character

@app.post("/api/investigators/forge", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def forge_investigator(character_data: CharacterCreate, db: Session = Depends(get_db)):
    try:
        circle = db.query(Circle).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)
            db.commit()

        char_dict = character_data.dict() if hasattr(character_data, 'dict') else character_data.model_dump()

        # Use the user_id from the request, falling back to 1 (admin) for legacy compatibility
        target_user_id = char_dict.pop('user_id', None) or 1
        user = db.query(User).filter(User.id == target_user_id).first()
        if not user:
            user = db.query(User).filter(User.id == 1).first()
            target_user_id = user.id if user else 1

        for key in ["body_marks", "brain_marks", "bleed_marks", "scars_count", "move", "strike", "control", "sneak", "hide", "sway", "survey", "read", "sense"]:
            if char_dict.get(key) is None:
                char_dict[key] = 0

        char_dict["gear"] = char_dict.get("gear") or []
        char_dict["scars_list"] = char_dict.get("scars_list") or []

        new_character = Character(**char_dict, circle_id=circle.id, user_id=target_user_id)
        db.add(new_character)
        db.commit()
        db.refresh(new_character)

        return new_character
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Forge Error: {str(e)}")

# =====================================================================
# NOTEBOOK ENDPOINTS
# =====================================================================

@app.get("/api/notebook/{campaign_id}/entries", response_model=List[NotebookEntryResponse])
def fetch_notebook_entries(campaign_id: int, role: str = "player", character_id: Optional[int] = None, db: Session = Depends(get_db)):
    entries = db.query(NotebookEntry).filter(
        NotebookEntry.campaign_id == campaign_id,
        NotebookEntry.is_deleted == False,
    ).order_by(NotebookEntry.page_number).all()

    visible = []
    for e in entries:
        vis = getattr(e, "visibility", "all") or "all"
        if vis == "all":
            visible.append(e)
        elif vis == "gm_only" and role == "GM":
            visible.append(e)
        elif vis == "self" and e.character_id and e.character_id == character_id:
            visible.append(e)
    return visible

@app.post("/api/notebook/{campaign_id}/entries", response_model=NotebookEntryResponse, status_code=201)
async def add_notebook_entry(campaign_id: int, entry_data: NotebookEntryCreate, db: Session = Depends(get_db)):
    pen_font  = 'Caveat'
    ink_color = '#1a1a1a'
    if entry_data.character_id:
        char = db.query(Character).filter(Character.id == entry_data.character_id).first()
        if char:
            pen_font  = char.pen_font  or 'Caveat'
            ink_color = char.ink_color or '#8b1a1a'

    entry = create_notebook_entry(
        db, campaign_id,
        title        = entry_data.title,
        content      = entry_data.content,
        author_name  = entry_data.author_name,
        author_type  = entry_data.author_type,
        pen_font     = pen_font,
        ink_color    = ink_color,
        character_id = entry_data.character_id,
        entry_type   = entry_data.entry_type,
        visibility   = entry_data.visibility,
        image_data   = entry_data.image_data,
    )
    # Don't broadcast ephemeral or gm_only entries to activity log
    if entry_data.visibility == 'all':
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            entry_payload = {
                "id": entry.id,
                "title": entry.title,
                "content": entry.content,
                "author_name": entry.author_name,
                "author_type": entry.author_type,
                "entry_type": entry.entry_type,
                "visibility": entry.visibility,
                "character_id": entry.character_id,
                "page_number": entry.page_number,
                "pen_font": entry.pen_font,
                "ink_color": entry.ink_color,
                "image_data": entry.image_data,
                "created_at": entry.created_at or None,
                "is_deleted": entry.is_deleted,
            }
            await manager.broadcast_campaign(campaign.campaign_code, campaign_id, {
                "type": "notebook_entry",
                "payload": entry_payload,
            }, db)
            await manager.broadcast_campaign(campaign.campaign_code, campaign_id, {
                "type": "activity_log",
                "payload": {
                    "message": f"{entry_data.author_name} has archived a journal entry.",
                    "log_type": "field",
                    "ink_color": ink_color if ink_color != '#1a1a1a' else "",
                }
            }, db)
    return entry

@app.put("/api/notebook/entries/{entry_id}", response_model=NotebookEntryResponse)
def update_notebook_entry(entry_id: int, entry_data: NotebookEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(NotebookEntry).filter(NotebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry_data.title is not None:
        entry.title = entry_data.title
    if entry_data.content is not None:
        entry.content = entry_data.content
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/api/notebook/entries/{entry_id}", status_code=204)
def delete_notebook_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(NotebookEntry).filter(NotebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.is_deleted = True
    db.commit()

@app.post("/api/notebook/{campaign_id}/upload", status_code=201)
async def upload_notebook_image(
    campaign_id: int,
    file: UploadFile = File(...),
    title: str = Form("Attached Image"),
    content: str = Form(""),
    author_name: str = Form("Unknown"),
    author_type: str = Form("player"),
    entry_type: str = Form("sketch"),
    character_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 2MB)")
    b64 = base64.b64encode(raw).decode("utf-8")
    mime = file.content_type or "image/png"
    image_data = f"data:{mime};base64,{b64}"

    pen_font  = 'Caveat'
    ink_color = '#1a1a1a'
    if character_id:
        char = db.query(Character).filter(Character.id == character_id).first()
        if char:
            pen_font  = char.pen_font  or 'Caveat'
            ink_color = char.ink_color or '#8b1a1a'

    entry = create_notebook_entry(
        db, campaign_id,
        title        = title,
        content      = content,
        author_name  = author_name,
        author_type  = author_type,
        pen_font     = pen_font,
        ink_color    = ink_color,
        character_id = character_id,
        entry_type   = entry_type,
        visibility   = 'all',
        image_data   = image_data,
    )
    return {
        "id": entry.id,
        "page_number": entry.page_number,
        "entry_type": entry.entry_type,
        "image_data": entry.image_data,
        "title": entry.title,
        "content": entry.content,
        "author_name": entry.author_name,
        "pen_font": entry.pen_font,
        "ink_color": entry.ink_color,
        "created_at": entry.created_at,
        "campaign_id": entry.campaign_id,
        "character_id": entry.character_id,
        "visibility": entry.visibility,
        "is_deleted": entry.is_deleted,
    }

# =====================================================================
# USER DATA ENDPOINTS
# =====================================================================

@app.get("/api/users/{user_id}/characters", response_model=List[CharacterSummaryItem])
def get_user_characters(user_id: int, db: Session = Depends(get_db)):
    chars = db.query(Character).filter(Character.user_id == user_id).all()
    campaign_ids = list({c.campaign_id for c in chars if c.campaign_id})
    campaigns_by_id = {}
    if campaign_ids:
        campaigns_by_id = {
            c.id: c for c in db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all()
        }
    result = []
    for c in chars:
        camp = campaigns_by_id.get(c.campaign_id) if c.campaign_id else None
        result.append(CharacterSummaryItem(
            id=c.id,
            name=c.name,
            role_ability=c.role_ability or "None",
            specialty_ability=c.specialty_ability or "None",
            status=c.status,
            campaign_id=c.campaign_id,
            campaign_name=camp.name if camp else None,
            campaign_code=camp.campaign_code if camp else None,
        ))
    return result

@app.get("/api/users/{user_id}/campaigns", response_model=List[CampaignSummaryItem])
def get_user_gm_campaigns(user_id: int, db: Session = Depends(get_db)):
    return db.query(Campaign).filter(
        Campaign.gm_user_id == user_id,
        Campaign.is_retired == False,
    ).all()

# =====================================================================
# WEBSOCKET STREAM ROUTER
# =====================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        for old_conn in self.active_connections.get(game_id, []):
            try:
                await old_conn.close(code=1001)
            except Exception:
                pass
        self.active_connections[game_id] = [websocket]

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_connections:
            try:
                self.active_connections[game_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[game_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            try:
                self.active_connections[game_id].remove(conn)
            except ValueError:
                pass

    async def broadcast_all(self, message: dict):
        dead = []
        for gid, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append((gid, connection))
        for gid, conn in dead:
            try:
                self.active_connections[gid].remove(conn)
            except ValueError:
                pass

    async def broadcast_campaign(self, campaign_code: str, campaign_id, message: dict, db):
        """Broadcast to all active connections belonging to a campaign.
        Falls back to broadcasting only to campaign_code if campaign_id is unknown."""
        if not campaign_id:
            await self.broadcast(campaign_code, message)
            return
        chars = db.query(Character).filter(
            Character.campaign_id == campaign_id,
            Character.status == "active",
        ).all()
        ids = {campaign_code}
        for c in chars:
            ids.add(str(c.id))
        for gid in ids:
            await self.broadcast(gid, message)

manager = ConnectionManager()

def get_char_dict(char):
    gear = char.gear if not isinstance(char.gear, str) else json.loads(char.gear) if char.gear else []
    scars = char.scars_list if not isinstance(char.scars_list, str) else json.loads(char.scars_list) if char.scars_list else []

    return {
        "id": getattr(char, "id", 1),
        "name": getattr(char, "name", "Unknown Investigator"),

        "move": getattr(char, "move", 0) or 0,
        "strike": getattr(char, "strike", 0) or 0,
        "control": getattr(char, "control", 0) or 0,
        "hide": getattr(char, "hide", 0) or 0,
        "sneak": getattr(char, "sneak", 0) or 0,
        "sway": getattr(char, "sway", 0) or 0,
        "survey": getattr(char, "survey", 0) or 0,
        "read": getattr(char, "read", 0) or 0,
        "sense": getattr(char, "sense", 0) or 0,

        "gilded_move": bool(getattr(char, "gilded_move", False)),
        "gilded_strike": bool(getattr(char, "gilded_strike", False)),
        "gilded_control": bool(getattr(char, "gilded_control", False)),
        "gilded_hide": bool(getattr(char, "gilded_hide", False)),
        "gilded_sneak": bool(getattr(char, "gilded_sneak", False)),
        "gilded_sway": bool(getattr(char, "gilded_sway", False)),
        "gilded_survey": bool(getattr(char, "gilded_survey", False)),
        "gilded_read": bool(getattr(char, "gilded_read", False)),
        "gilded_sense": bool(getattr(char, "gilded_sense", False)),

        "nerve_max": getattr(char, "nerve_max", 1) or 1,
        "nerve_current": max(0, getattr(char, "nerve_current", 0) or 0),
        "nerve_resistance_spent": getattr(char, "nerve_resistance_spent", 0) or 0,
        "cunning_max": getattr(char, "cunning_max", 1) or 1,
        "cunning_current": max(0, getattr(char, "cunning_current", 0) or 0),
        "cunning_resistance_spent": getattr(char, "cunning_resistance_spent", 0) or 0,
        "intuition_max": getattr(char, "intuition_max", 1) or 1,
        "intuition_current": max(0, getattr(char, "intuition_current", 0) or 0),
        "intuition_resistance_spent": getattr(char, "intuition_resistance_spent", 0) or 0,

        "body_marks": getattr(char, "body_marks", 0) or 0,
        "brain_marks": getattr(char, "brain_marks", 0) or 0,
        "bleed_marks": getattr(char, "bleed_marks", 0) or 0,
        "scars_count": getattr(char, "scars_count", 0) or 0,
        "scars_list": scars,
        "incapacitated": bool(getattr(char, "incapacitated", False)),
        "is_dead": bool(getattr(char, "is_dead", False)),
        "circle_id": getattr(char, "circle_id", 1),

        "pronouns": getattr(char, "pronouns", "Unlisted") or "Unlisted",
        "style": getattr(char, "style", "") or "",
        "catalyst": getattr(char, "catalyst", "") or "",
        "question": getattr(char, "question", "") or "",
        "role": getattr(char, "role", "") or "",
        "specialty": getattr(char, "specialty", "") or "",
        "role_ability": getattr(char, "role_ability", "None") or "None",
        "specialty_ability": getattr(char, "specialty_ability", "None") or "None",
        "gear": gear,
        "profile_pic": getattr(char, "profile_pic", None),
        "status": getattr(char, "status", "unaffiliated") or "unaffiliated",
        "pen_font": getattr(char, "pen_font", "Caveat") or "Caveat",
        "ink_color": getattr(char, "ink_color", "") or "",
        "campaign_id": getattr(char, "campaign_id", None),
        "personal_circle_answer": getattr(char, "personal_circle_answer", "") or "",
        "ability_uses": getattr(char, "ability_uses", None) or {},
        "train_bonus": bool(getattr(char, "train_bonus", False)),
        "resources_spent_assignment": getattr(char, "resources_spent_assignment", 0) or 0,
    }

def get_circle_dict(circle):
    backstory = getattr(circle, "backstory_answers", None) or {}
    if isinstance(backstory, str):
        try: backstory = json.loads(backstory)
        except: backstory = {}
    return {
        "id": circle.id,
        "name": circle.name,
        "stitch": circle.stitch,
        "refresh": circle.refresh,
        "train": circle.train,
        "guard_patrol": getattr(circle, "guard_patrol", None) or 0,
        "miasma_bleed": getattr(circle, "miasma_bleed", None) or 0,
        "tension_clock": getattr(circle, "tension_clock", 4) if getattr(circle, "tension_clock", None) is not None else 4,
        "tension_label": getattr(circle, "tension_label", None) or "",
        "location": getattr(circle, "location", None) or "",
        "atmosphere": getattr(circle, "atmosphere", None) or "",
        "max_capacity": 1 + sum(1 for c in circle.characters if c.status == "active"),
        "chapter_house_location": getattr(circle, "chapter_house_location", None) or "",
        "circle_ability": getattr(circle, "circle_ability", None) or "",
        "insignia": getattr(circle, "insignia", None) or "",
        "backstory_answers": backstory,
        "is_finalized": bool(getattr(circle, "is_finalized", False)),
        "illumination": getattr(circle, "illumination", 0) or 0,
        "resources_editable": bool(getattr(circle, "resources_editable", False)),
        "reports_open": bool(getattr(circle, "reports_open", False)),
    }

def resolve_circle(db, circle_id, camp_id):
    """Find circle by id. Falls back to plain id lookup for legacy circles with campaign_id=NULL."""
    if camp_id:
        c = db.query(Circle).filter(Circle.id == circle_id, Circle.campaign_id == camp_id).first()
        if c is None:
            c = db.query(Circle).filter(Circle.id == circle_id).first()
        return c
    return db.query(Circle).filter(Circle.id == circle_id).first()

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    logger.info("WebSocket connected: game_id=%s", game_id)
    await manager.connect(game_id, websocket)
    db = SessionLocal()

    # Resolve character from game_id (numeric = character id, string = GM campaign code)
    character = None
    try:
        parsed_char_id = int(game_id)
        character = db.query(Character).filter(Character.id == parsed_char_id).first()
    except ValueError:
        pass  # GM connection via campaign code

    # Resolve the campaign for this connection
    campaign = None
    if character and character.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == character.campaign_id).first()
    if campaign is None:
        campaign = db.query(Campaign).filter(Campaign.campaign_code == game_id).first()

    # Load this campaign's circle (create one if this campaign has none yet)
    circle = None
    if campaign:
        circle = get_or_create_campaign_circle(db, campaign.id)
    if not circle:
        circle = db.query(Circle).filter(Circle.id == 1).first()
    if not circle:
        circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
        db.add(circle)
        db.commit()

    # Camp context variables for this connection (re-resolved per-message inside the loop)
    camp_code = campaign.campaign_code if campaign else game_id
    camp_id = campaign.id if campaign else None

    if character:
        await websocket.send_json({"type": "character_update", "payload": get_char_dict(character)})
    await websocket.send_json({"type": "circle_update", "payload": get_circle_dict(circle)})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue
            action = message.get("type")
            payload = message.get("payload", {})

            target_char_id = payload.get("character_id")
            if target_char_id is None:
                try: target_char_id = int(game_id)
                except ValueError: target_char_id = None

            try:
                character = db.query(Character).filter(Character.id == target_char_id).first() if target_char_id else None

                # camp_id and camp_code are resolved once at connection time and reused — characters
                # do not change campaigns mid-session, so no re-query is needed per message.
            except Exception as exc:
                logger.error("WS context resolution error: action=%s error=%s", action, exc)
                db.rollback()
                continue

            # --- GM ADMINISTRATIVE HOOKS ---
            if action == "gm_update_tension" and character:
                if payload.get("role") != "GM": continue

                m_type = payload.get("mark_type")
                value = payload.get("value")
                if m_type and value is not None:
                    setattr(character, f"{m_type}_marks", value)
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "gm_update_circle":
                if payload.get("role") != "GM": continue

                circle_id = payload.get("circle_id") or 1
                target_circle = db.query(Circle).filter(Circle.id == circle_id).first()
                if target_circle:
                    for field in ["stitch", "refresh", "train", "guard_patrol", "miasma_bleed",
                                  "location", "atmosphere", "tension_clock", "tension_label"]:
                        if field in payload:
                            setattr(target_circle, field, payload[field])
                    db.commit()
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)

            elif action == "gm_transition_scene":
                if payload.get("role") != "GM": continue

                await manager.broadcast(game_id, {
                    "type": "scene_transition",
                    "payload": {
                        "scene_name": payload.get("scene_name", "Unknown Location"),
                        "description": payload.get("description", "")
                    }
                })

            # --- STANDARD PLAYER HOOKS ---
            elif action == "roll":
                try:
                    act = payload.get("action")
                    if not act:
                        raise ValueError("roll action missing 'action' field")
                    spent = int(payload.get("drive_spent", 0))
                    is_secret = payload.get("is_secret", False)
                    ability_mods = payload.get("ability_mods", [])

                    # Per-ability backend mod definitions (mirrors frontend ABILITY_ROLL_MODS)
                    ABILITY_MOD_DEFS = {
                        "Sweet Talk":           {"actions": ["sneak"],                   "extra_dice": 1,  "extra_gild_condition": lambda ch: (ch.cunning_max // 3 - ch.cunning_resistance_spent) >= 2},
                        "Open Book":            {"actions": ["sway"],                    "extra_dice_fn": lambda ch: max(0, ch.cunning_max // 3 - ch.cunning_resistance_spent)},
                        "Lie Detector":         {"actions": ["sneak"],                   "extra_gild": True},
                        "Misdirection":         {"actions": ["hide"],                    "extra_dice": 1},
                        "Interrogation":        {"actions": ["sneak"],                   "extra_dice_fn": lambda ch: max(0, ch.cunning_max // 3 - ch.cunning_resistance_spent)},
                        "Inspection":           {"actions": ["survey"],                  "extra_gild": True},
                        "Basic Training":       {"actions": ["survey"],                  "extra_dice_fn": lambda ch: max(0, ch.nerve_max // 3 - ch.nerve_resistance_spent)},
                        "Better Part of Valor": {"actions": ["control","move"],          "extra_gild": True},
                        "Tenacious":            {"actions": ["move","strike","control"],  "extra_gild": True},
                        "Extend Your Senses":   {"actions": ["sense"],                   "extra_dice_fn": lambda ch: max(0, ch.intuition_max // 3 - ch.intuition_resistance_spent)},
                        "Meticulous Notes":     {"actions": ["read"],                    "extra_dice": 1},
                        "Sharpshooter":         {"actions": ["strike"],                  "extra_dice": 2,  "cost_drive": "nerve"},
                        "Dissection":           {"actions": ["read"],                    "extra_gild": True},
                        "Born in the Shadows":  {"actions": ["hide"],                    "extra_gild": True},
                        "Cool Under Pressure":  {"actions": ["any"],                     "drive_substitute": "cunning"},
                        "Practiced Patter":     {"actions": ["sway","hide"],             "drive_substitute": "intuition"},
                        "Street Smarts":        {"actions": ["survey"],                  "drive_substitute": "any"},
                        "Back Against the Wall":{"actions": ["any"],                     "cost_brain_mark": True},
                    }

                    if character:
                        cat = "nerve" if act in ["move", "strike", "control"] else "cunning" if act in ["hide", "sneak", "sway"] else "intuition"

                        # Apply drive substitution from ability mods
                        extra_dice_count = 0
                        extra_gild_flag = False
                        for mod_name in ability_mods:
                            mod_def = ABILITY_MOD_DEFS.get(mod_name)
                            if not mod_def: continue
                            char_abilities = [character.role_ability, character.specialty_ability]
                            if mod_name not in char_abilities: continue
                            allowed_actions = mod_def.get("actions", [])
                            if act not in allowed_actions and "any" not in allowed_actions: continue
                            # Drive substitution
                            if "drive_substitute" in mod_def and mod_def["drive_substitute"] != "any":
                                cat = mod_def["drive_substitute"]
                            # Brain mark cost (Back Against the Wall)
                            if mod_def.get("cost_brain_mark"):
                                character.brain_marks = min(3, character.brain_marks + 1)
                            # Drive cost (e.g. Sharpshooter costs 1 Nerve)
                            if "cost_drive" in mod_def:
                                drive_key = mod_def["cost_drive"]
                                cur = getattr(character, f"{drive_key}_current", 0) or 0
                                setattr(character, f"{drive_key}_current", max(0, cur - 1))
                            # Extra dice
                            if "extra_dice_fn" in mod_def:
                                extra_dice_count += mod_def["extra_dice_fn"](character)
                            elif mod_def.get("extra_dice", 0) > 0:
                                extra_dice_count += mod_def["extra_dice"]
                            # Extra gild
                            if mod_def.get("extra_gild"):
                                extra_gild_flag = True
                            elif "extra_gild_condition" in mod_def and mod_def["extra_gild_condition"](character):
                                extra_gild_flag = True
                            # Record ability use
                            MAX_ABILITY_USES = {
                                "I Know a Guy": 1, "Death Defy": 1, "Field Experience": 1,
                                "Not Again": 1, "In the Trenches": 1, "Steel Mind": 1,
                                "Compartmentalization": 1, "Saw This Coming": 3,
                            }
                            if mod_name in MAX_ABILITY_USES:
                                uses = dict(character.ability_uses or {})
                                uses[mod_name] = uses.get(mod_name, 0) + 1
                                character.ability_uses = uses

                        # Consume Train bonus (+1d on first roll after spending Train resource)
                        if getattr(character, "train_bonus", False):
                            extra_dice_count += 1
                            character.train_bonus = False

                        setattr(character, f"{cat}_current", max(0, getattr(character, f"{cat}_current") - spent))
                        is_gilded_action = getattr(character, f"gilded_{act}", False)
                        pool = min(6, getattr(character, act, 0) + spent)
                        char_name = character.name
                        db.commit()
                    else:
                        # Lightkeeper (GM) roll: drive_spent is the total pool size
                        cat = None
                        is_gilded_action = False
                        pool = spent
                        extra_dice_count = 0
                        extra_gild_flag = False
                        char_name = "Lightkeeper"

                    res = roll_dice(pool, is_gilded_action, extra_dice=extra_dice_count, extra_gild=extra_gild_flag)
                    res["drive_spent_key"] = cat
                    res["action"] = act

                    await manager.broadcast(game_id, {
                        "type": "roll_result",
                        "payload": {"character_id": target_char_id, "action": act, "roll": res, "character": get_char_dict(character) if character else None}
                    })

                    if not res.get("needs_gilded_choice") and not is_secret:
                        result_val = res.get("result")
                        outcome_key = res.get("outcome", "")
                        outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
                        # GM rolls omit the internal action name from the log label
                        if character:
                            log_msg = f"{char_name} rolled {act} — {result_val} · {outcome_label}."
                        else:
                            log_msg = f"Lightkeeper rolled — {result_val} · {outcome_label}."

                        post_roll_dirty = False
                        if res.get("auto_gilded_refresh") and character and cat:
                            setattr(character, f"{cat}_current", min(getattr(character, f"{cat}_max", 3), getattr(character, f"{cat}_current") + 1))
                            post_roll_dirty = True
                            log_msg += f" [gilded — {cat} Drive refreshed]"

                        # Well-Read auto-refund: if failure and Intuition was spent, earn it back
                        if character and outcome_key == "failure" and cat == "intuition" and spent > 0:
                            char_abilities = [character.role_ability, character.specialty_ability]
                            if "Well-Read" in char_abilities:
                                setattr(character, "intuition_current", min(getattr(character, "intuition_max", 3), getattr(character, "intuition_current") + spent))
                                post_roll_dirty = True
                                log_msg += f" [Well-Read — {spent} Intuition refunded]"

                        if post_roll_dirty:
                            db.commit()
                            await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

                        await manager.broadcast_campaign(camp_code, camp_id, {
                            "type": "activity_log",
                            "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
                        }, db)
                except Exception as roll_exc:
                    logger.error("WS roll handler error: %s", roll_exc, exc_info=True)
                    db.rollback()
                    await manager.broadcast(game_id, {"type": "roll_error", "payload": {"message": str(roll_exc)}})

            elif action == "update_drive" and character:
                pool = payload.get("pool")
                value = payload.get("value")
                if pool and value is not None:
                    setattr(character, f"{pool}_current", value)
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "resolve_gilded" and character:
                r_act = payload.get("action")
                chosen_type = payload.get("chosen_type")
                chosen_value = int(payload.get("chosen_value", 0))
                r_cat = "nerve" if r_act in ["move", "strike", "control"] else "cunning" if r_act in ["hide", "sneak", "sway"] else "intuition"

                drive_refreshed = False
                if chosen_type == "gilded" and hasattr(character, f"{r_cat}_current"):
                    setattr(character, f"{r_cat}_current", min(getattr(character, f"{r_cat}_max", 3), getattr(character, f"{r_cat}_current") + 1))
                    drive_refreshed = True
                    db.commit()

                outcome_key = calculate_outcome(chosen_value)
                outcome_label = OUTCOME_LABELS.get(outcome_key, outcome_key)
                log_msg = f"{character.name} rolled {r_act} — {chosen_value} · {outcome_label}."
                if drive_refreshed:
                    log_msg += f" [gilded — {r_cat} Drive refreshed]"

                await manager.broadcast_campaign(camp_code, camp_id, {
                    "type": "activity_log",
                    "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
                }, db)
                if drive_refreshed:
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "use_post_roll_ability" and character:
                ab_name = payload.get("ability")
                char_abilities = [character.role_ability, character.specialty_ability]
                if ab_name and ab_name in char_abilities:
                    if ab_name == "Flourish":
                        character.cunning_current = max(0, character.cunning_current - 2)
                        db.commit()
                        log_msg = f"{character.name} used Flourish — result pushed up one tier."
                        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
                    elif ab_name == "Learn from My Mistakes":
                        drive = payload.get("drive")
                        if drive in ["nerve", "cunning", "intuition"]:
                            max_val = getattr(character, f"{drive}_max", 3)
                            setattr(character, f"{drive}_current", min(max_val, getattr(character, f"{drive}_current") + 1))
                            db.commit()
                            log_msg = f"{character.name} used Learn from My Mistakes — refreshed 1 {drive.capitalize()}."
                            await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
                    elif ab_name == "Bending Spoons":
                        character.bleed_marks = min(3, character.bleed_marks + 1)
                        db.commit()
                        log_msg = f"{character.name} used Bending Spoons — took 1 Bleed mark to upgrade the result."
                        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": log_msg, "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

            elif action == "update_pen_font" and character:
                new_font = payload.get("pen_font", "")
                if new_font in _SAFE_FONT_NAMES:
                    character.pen_font = new_font
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "take_mark" and character:
                m_type = payload.get("mark_type")
                is_from_enemy = payload.get("is_from_enemy", False)
                if m_type:
                    char_abilities = [character.role_ability, character.specialty_ability]
                    ability_uses = dict(character.ability_uses or {})

                    # Pre-mark resistance soaks (Compartmentalization, Steel Mind, In the Trenches)
                    soak_map = {
                        "brain": [("Compartmentalization", "nerve"), ("Steel Mind", "intuition"), ("Back Against the Wall", None)],
                        "body":  [("In the Trenches", "cunning")],
                    }
                    soak_offers = []
                    for ability_name, resist_key in soak_map.get(m_type, []):
                        if ability_name in char_abilities:
                            MAX_USES = {"Compartmentalization": 1, "Steel Mind": 1, "In the Trenches": 1}
                            max_use = MAX_USES.get(ability_name)
                            if max_use and ability_uses.get(ability_name, 0) >= max_use:
                                continue
                            if resist_key:
                                resist_max = getattr(character, f"{resist_key}_max", 3) // 3
                                resist_spent = getattr(character, f"{resist_key}_resistance_spent", 0)
                                if resist_spent >= resist_max:
                                    continue
                            soak_offers.append({"ability": ability_name, "resist_key": resist_key})

                    if soak_offers:
                        await manager.broadcast(game_id, {
                            "type": "ability_mark_offer",
                            "payload": {"ability": soak_offers[0]["ability"], "mark_type": m_type, "character_id": target_char_id, "options": soak_offers, "action": "soak"}
                        })
                        continue

                    # Death Defy
                    if is_from_enemy and "Death Defy" in char_abilities and ability_uses.get("Death Defy", 0) < 1:
                        await manager.broadcast(game_id, {
                            "type": "ability_mark_offer",
                            "payload": {"ability": "Death Defy", "mark_type": m_type, "character_id": target_char_id, "action": "escape"}
                        })
                        continue

                    # Apply the mark
                    val = getattr(character, f"{m_type}_marks", 0) + 1

                    if val >= 4 and "Endurance" in char_abilities:
                        # Endurance: roll Nd6 where N = Nerve resistance remaining
                        nerve_max = getattr(character, "nerve_max", 3) // 3
                        nerve_spent = getattr(character, "nerve_resistance_spent", 0)
                        nerve_resist_remaining = max(0, nerve_max - nerve_spent)
                        if nerve_resist_remaining > 0:
                            endurance_roll = [secrets.randbelow(6) + 1 for _ in range(nerve_resist_remaining)]
                            if any(d == 6 for d in endurance_roll):
                                # Not incapacitated — mark stays at 3
                                setattr(character, f"{m_type}_marks", 3)
                                db.commit()
                                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                                await manager.broadcast_campaign(camp_code, camp_id, {
                                    "type": "activity_log",
                                    "payload": {"message": f"{character.name} used Endurance! Rolled {endurance_roll} — a 6 saves them from incapacitation!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}
                                }, db)
                                # Still offer Adrenaline Rush if applicable
                                if "Adrenaline Rush" in char_abilities:
                                    await manager.broadcast(game_id, {"type": "ability_mark_offer", "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": target_char_id, "action": "drive_refresh"}})
                                continue
                            else:
                                await manager.broadcast_campaign(camp_code, camp_id, {
                                    "type": "activity_log",
                                    "payload": {"message": f"{character.name} used Endurance — rolled {endurance_roll}, no 6. Incapacitated.", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}
                                }, db)

                    if val >= 4:
                        setattr(character, f"{m_type}_marks", 0)
                        character.incapacitated = True
                        db.commit()
                        await manager.broadcast(game_id, {"type": "trigger_scar", "payload": {"character_id": target_char_id, "mark_type": m_type, "character": get_char_dict(character)}})
                        await manager.broadcast_campaign(camp_code, camp_id, {
                            "type": "activity_log",
                            "payload": {"message": f"{character.name} has been incapacitated!", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}
                        }, db)
                    else:
                        setattr(character, f"{m_type}_marks", val)
                        db.commit()
                        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

                        # Let Them In: informational notification on Bleed mark
                        if m_type == "bleed" and "Let Them In" in char_abilities:
                            await manager.broadcast(game_id, {
                                "type": "ability_mark_offer",
                                "payload": {"ability": "Let Them In", "mark_type": m_type, "character_id": target_char_id, "action": "info"}
                            })

                        # Adrenaline Rush: prompt drive refresh
                        if "Adrenaline Rush" in char_abilities:
                            await manager.broadcast(game_id, {
                                "type": "ability_mark_offer",
                                "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": target_char_id, "action": "drive_refresh"}
                            })

                        # Cross-player intercept offers (Behind Me, Premonitions) — single filtered query
                        intercept_candidates = db.query(Character).filter(
                            Character.campaign_id == camp_id,
                            Character.status == "active",
                            Character.id != target_char_id,
                            or_(
                                Character.role_ability.in_(INTERCEPT_ABILITIES),
                                Character.specialty_ability.in_(INTERCEPT_ABILITIES)
                            )
                        ).all()
                        for other in intercept_candidates:
                            other_abilities = {other.role_ability, other.specialty_ability}
                            if "Behind Me" in other_abilities and (other.nerve_current or 0) >= 1:
                                await manager.broadcast(str(other.id), {
                                    "type": "ability_intercept_offer",
                                    "payload": {"ability": "Behind Me", "mark_type": m_type, "character_id": target_char_id, "character_name": character.name, "action": "intercept"}
                                })
                            if "Premonitions" in other_abilities:
                                intuition_resist_max = (other.intuition_max or 3) // 3
                                if (other.intuition_resistance_spent or 0) < intuition_resist_max:
                                    await manager.broadcast(str(other.id), {
                                        "type": "ability_intercept_offer",
                                        "payload": {"ability": "Premonitions", "mark_type": m_type, "character_id": target_char_id, "character_name": character.name, "action": "soak"}
                                    })

            elif action == "resolve_ability_mark" and character:
                ab_name = payload.get("ability")
                choice = payload.get("choice")
                char_abilities = [character.role_ability, character.specialty_ability]
                ability_uses = dict(character.ability_uses or {})

                if ab_name == "Adrenaline Rush" and ab_name in char_abilities and choice in ["nerve","cunning","intuition"]:
                    max_val = getattr(character, f"{choice}_max", 3)
                    setattr(character, f"{choice}_current", min(max_val, getattr(character, f"{choice}_current") + 1))
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Adrenaline Rush — refreshed 1 {choice.capitalize()}.", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

                elif ab_name in ("Compartmentalization", "Steel Mind", "In the Trenches") and ab_name in char_abilities:
                    resist_key_map = {"Compartmentalization": "nerve", "Steel Mind": "intuition", "In the Trenches": "cunning"}
                    rkey = resist_key_map[ab_name]
                    setattr(character, f"{rkey}_resistance_spent", getattr(character, f"{rkey}_resistance_spent", 0) + 1)
                    ability_uses[ab_name] = ability_uses.get(ab_name, 0) + 1
                    character.ability_uses = ability_uses
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used {ab_name} — soaked the mark.", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

                elif ab_name == "Death Defy" and ab_name in char_abilities:
                    ability_uses["Death Defy"] = 1
                    character.ability_uses = ability_uses
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Death Defy — escaped unscathed!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

            elif action == "intercept_mark" and character:
                ab_name = payload.get("ability")
                target_id = payload.get("target_character_id")
                m_type = payload.get("mark_type")
                char_abilities = [character.role_ability, character.specialty_ability]

                if ab_name == "Behind Me" and ab_name in char_abilities and character.nerve_current >= 1 and m_type:
                    character.nerve_current = max(0, character.nerve_current - 1)

                    # Remove the mark from the target (they no longer take it)
                    target_char = db.query(Character).filter(Character.id == target_id).first()
                    if target_char:
                        prev_val = max(0, getattr(target_char, f"{m_type}_marks", 1) - 1)
                        setattr(target_char, f"{m_type}_marks", prev_val)

                    db.commit()

                    # Broadcast target's mark removal
                    if target_char:
                        await manager.broadcast(str(target_id), {"type": "character_update", "payload": get_char_dict(target_char)})

                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Behind Me to intercept a mark for {target_char.name if target_char else 'an ally'}!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

                    # Now apply the mark to the interceptor with the full take_mark logic
                    interceptor_abilities = [character.role_ability, character.specialty_ability]
                    interceptor_uses = dict(character.ability_uses or {})

                    soak_map = {
                        "brain": [("Compartmentalization", "nerve"), ("Steel Mind", "intuition")],
                        "body":  [("In the Trenches", "cunning")],
                    }
                    soak_offers = []
                    for ability_name, resist_key in soak_map.get(m_type, []):
                        if ability_name not in interceptor_abilities: continue
                        MAX_USES = {"Compartmentalization": 1, "Steel Mind": 1, "In the Trenches": 1}
                        if MAX_USES.get(ability_name) and interceptor_uses.get(ability_name, 0) >= MAX_USES[ability_name]: continue
                        if resist_key:
                            if getattr(character, f"{resist_key}_resistance_spent", 0) >= getattr(character, f"{resist_key}_max", 3) // 3: continue
                        soak_offers.append({"ability": ability_name, "resist_key": resist_key})

                    if soak_offers:
                        await manager.broadcast(game_id, {
                            "type": "ability_mark_offer",
                            "payload": {"ability": soak_offers[0]["ability"], "mark_type": m_type, "character_id": character.id, "action": "soak"}
                        })
                    else:
                        val = getattr(character, f"{m_type}_marks", 0) + 1
                        if val >= 4:
                            setattr(character, f"{m_type}_marks", 0)
                            character.incapacitated = True
                            db.commit()
                            await manager.broadcast(game_id, {"type": "trigger_scar", "payload": {"character_id": character.id, "mark_type": m_type, "character": get_char_dict(character)}})
                            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} has been incapacitated!", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
                        else:
                            setattr(character, f"{m_type}_marks", val)
                            db.commit()
                            await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                            if "Adrenaline Rush" in interceptor_abilities:
                                await manager.broadcast(game_id, {"type": "ability_mark_offer", "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": character.id, "action": "drive_refresh"}})

                elif ab_name == "Premonitions" and ab_name in char_abilities:
                    intuition_resist_max = getattr(character, "intuition_max", 3) // 3
                    if character.intuition_resistance_spent < intuition_resist_max:
                        character.intuition_resistance_spent += 1
                        db.commit()
                        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Premonitions — soaked the mark!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

            elif action == "apply_scar" and character:
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
                if not skip_shifts and down and up and hasattr(character, down) and hasattr(character, up):
                    if getattr(character, down) > 0 and getattr(character, up) < 3:
                        setattr(character, down, getattr(character, down) - 1)
                        setattr(character, up, getattr(character, up) + 1)
                db.commit()
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "revive_character" and character:
                character.incapacitated = False
                # Reset marks on all three tracks so they can act again
                character.body_marks = 0
                character.brain_marks = 0
                character.bleed_marks = 0
                db.commit()
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                await manager.broadcast_campaign(camp_code, camp_id, {
                    "type": "activity_log",
                    "payload": {
                        "message": f"{character.name} has been revived and is operational.",
                        "log_type": "field",
                        "ink_color": getattr(character, "ink_color", "") or "",
                    }
                }, db)

            elif action == "burn_resistance" and character:
                act = payload.get("action")
                drive_key = payload.get("drive_key")
                if act and drive_key:
                    result = burn_resistance(db, character, act, drive_key)
                    if "error" not in result:
                        outcome_label = OUTCOME_LABELS.get(result.get("outcome", ""), "")
                        await manager.broadcast(game_id, {
                            "type": "roll_result",
                            "payload": {"character_id": target_char_id, "action": act, "roll": result, "character": get_char_dict(character)}
                        })
                        log_msg = f"{character.name} burned resistance on {act} — {result.get('result', '?')} · {outcome_label}."
                        await manager.broadcast_campaign(camp_code, camp_id, {
                            "type": "activity_log",
                            "payload": {"message": log_msg, "log_type": "roll", "ink_color": getattr(character, "ink_color", "") or ""}
                        }, db)

            elif action == "update_gear" and character:
                new_gear = payload.get("gear", [])
                if isinstance(new_gear, list):
                    character.gear = new_gear
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                    gear_names = ", ".join(new_gear) if new_gear else "nothing"
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "activity_log",
                        "payload": {
                            "message": f"{character.name} updated their equipment: {gear_names}.",
                            "log_type": "field",
                            "ink_color": getattr(character, "ink_color", "") or "",
                        }
                    }, db)

            elif action == "gm_toggle_resource_edit":
                if payload.get("role") != "GM": continue
                circle_id = payload.get("circle_id") or (circle.id if circle else 1)
                target_circle = resolve_circle(db, circle_id, camp_id)
                if target_circle:
                    target_circle.resources_editable = not bool(getattr(target_circle, "resources_editable", False))
                    db.commit()
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)

            elif action == "gm_toggle_reports":
                if payload.get("role") != "GM": continue
                circle_id = payload.get("circle_id") or (circle.id if circle else 1)
                target_circle = resolve_circle(db, circle_id, camp_id)
                if target_circle:
                    target_circle.reports_open = not bool(getattr(target_circle, "reports_open", False))
                    db.commit()
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)

            elif action == "submit_assignment_report":
                circle_id = payload.get("circle_id") or (circle.id if circle else 1)
                char_id = payload.get("character_id")
                responses = payload.get("responses", {})
                if char_id:
                    target_circle = resolve_circle(db, circle_id, camp_id)
                    if target_circle:
                        existing = target_circle.backstory_answers or {}
                        if isinstance(existing, str):
                            try: existing = json.loads(existing)
                            except: existing = {}
                        if "reports" not in existing:
                            existing["reports"] = {}
                        existing["reports"][str(char_id)] = responses
                        target_circle.backstory_answers = existing
                        db.commit()
                        reporter = db.query(Character).filter(Character.id == char_id).first()
                        reporter_name = reporter.name if reporter else "Unknown"
                        await manager.broadcast_campaign(camp_code, camp_id, {
                            "type": "assignment_report_submitted",
                            "payload": {"character_id": char_id, "character_name": reporter_name, "responses": responses},
                        }, db)

            elif action == "gm_advance_circle":
                if payload.get("role") != "GM": continue
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
                    db.commit()
                    circle_name = target_circle.name or "The Circle"
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "activity_log",
                        "payload": {"message": f"{circle_name} has advanced!", "log_type": "field"},
                    }, db)
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "circle_advanced",
                        "payload": {"circle": get_circle_dict(target_circle), "campaign_id": camp_id},
                    }, db)

            elif action == "refill_resources":
                if payload.get("role") != "GM": continue
                circle_id = payload.get("circle_id") or (circle.id if circle else 1)
                target_circle = resolve_circle(db, circle_id, camp_id)
                if target_circle:
                    max_cap = 1 + sum(1 for c in target_circle.characters if c.status == "active")
                    target_circle.stitch  = max_cap
                    target_circle.refresh = max_cap
                    target_circle.train   = max_cap
                    db.commit()
                    await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(target_circle)}, db)

            elif action == "gm_end_assignment":
                if payload.get("role") != "GM": continue
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
                        await manager.broadcast(str(ch.id), {"type": "character_update", "payload": get_char_dict(ch)})
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "activity_log",
                        "payload": {"message": "— Assignment ended. Ability uses have been reset. —", "log_type": "field"},
                    }, db)

            elif action == "gm_reset_character":
                if payload.get("role") != "GM": continue
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
                        await manager.broadcast(str(target_char.id), {
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

            elif action == "spend_resource" and character:
                resource_type = payload.get("resource_type")
                if resource_type not in ("stitch", "refresh", "train"):
                    continue
                if not circle or not getattr(circle, "resources_editable", False):
                    continue
                if (getattr(character, "resources_spent_assignment", 0) or 0) >= 2:
                    continue
                cur_val = getattr(circle, resource_type, 0) or 0
                if cur_val <= 0:
                    continue

                if resource_type == "stitch":
                    character.body_marks  = 0
                    character.brain_marks = 0
                    character.bleed_marks = 0
                elif resource_type == "refresh":
                    character.nerve_current     = character.nerve_max
                    character.cunning_current   = character.cunning_max
                    character.intuition_current = character.intuition_max
                    character.nerve_resistance_spent     = 0
                    character.cunning_resistance_spent   = 0
                    character.intuition_resistance_spent = 0
                    character.ability_uses = {}
                elif resource_type == "train":
                    character.train_bonus = True

                setattr(circle, resource_type, cur_val - 1)
                character.resources_spent_assignment = (getattr(character, "resources_spent_assignment", 0) or 0) + 1
                db.commit()

                _RESOURCE_MSG = {
                    "stitch":  "all marks cleared.",
                    "refresh": "drives & resistances restored.",
                    "train":   "Train d6 bonus active for next roll.",
                }
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                await manager.broadcast_campaign(camp_code, camp_id, {"type": "circle_update", "payload": get_circle_dict(circle)}, db)
                await manager.broadcast_campaign(camp_code, camp_id, {
                    "type": "activity_log",
                    "payload": {
                        "message": f"{character.name} used {resource_type.capitalize()} — {_RESOURCE_MSG[resource_type]}",
                        "log_type": "field",
                        "ink_color": getattr(character, "ink_color", "") or "",
                    },
                }, db)

            elif action == "apply_advancement" and character:
                adv_choice = payload.get("choice")
                adv_detail = payload.get("detail", "")
                if adv_choice:
                    result = apply_advancement(db, character, adv_choice, adv_detail)
                    if "error" not in result:
                        await manager.broadcast(game_id, {
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

            elif action == "update_circle":
                circle_id = payload.get("circle_id") or (circle.id if circle else 1)
                target_circle = resolve_circle(db, circle_id, camp_id)
                if target_circle:
                    old_illum = getattr(target_circle, "illumination", 0) or 0
                    role = payload.get("role", "")
                    for field in ["name", "stitch", "refresh", "train", "guard_patrol", "miasma_bleed", "location", "atmosphere",
                                  "chapter_house_location", "circle_ability", "illumination",
                                  "tension_clock", "tension_label"]:
                        if field in payload:
                            if field in ("stitch", "refresh", "train"):
                                current_val = getattr(target_circle, field, 0) or 0
                                if payload[field] > current_val and role != "GM":
                                    continue
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

            elif action == "circle_creation_vote":
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
                    updated_votes = _votes_dict(db, c_id)
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "vote_update",
                        "payload": {"vote_type": v_type, "votes": updated_votes[v_type]}
                    }, db)

            elif action == "circle_backstory_update":
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

            elif action == "circle_personal_answer":
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

            elif action == "circle_relationship_propose":
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
                        "payload": {"relationships": _relationships_list(db, c_id)}
                    }, db)

            elif action == "circle_relationship_respond":
                rel_id = payload.get("relationship_id")
                resp_action = payload.get("action")
                actor_id = int(game_id)
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
                            "payload": {"relationships": _relationships_list(db, rel.circle_id)}
                        }, db)

            elif action == "chat_message":
                sender_name = payload.get("sender_name", "Unknown")
                text = payload.get("message", "").strip()
                target = payload.get("target", "@Circle")
                if not text:
                    continue

                sender_ink = getattr(character, "ink_color", "") or ""

                # Resolve campaign for this connection
                chat_campaign = None
                if character and character.campaign_id:
                    chat_campaign = db.query(Campaign).filter(Campaign.id == character.campaign_id).first()
                if chat_campaign is None:
                    chat_campaign = db.query(Campaign).filter(Campaign.campaign_code == game_id).first()
                chat_campaign_code = chat_campaign.campaign_code if chat_campaign else game_id
                chat_campaign_id = chat_campaign.id if chat_campaign else None

                if target.lower() == "@environment":
                    env_payload = {
                        "type": "activity_log",
                        "payload": {"message": text.upper(), "log_type": "environment"},
                    }
                    if chat_campaign_id:
                        await manager.broadcast_campaign(chat_campaign_code, chat_campaign_id, env_payload, db)
                    else:
                        await manager.broadcast(game_id, env_payload)
                elif target.lower() == "@circle":
                    log_msg = f"{sender_name}: {text}"
                    circle_payload = {
                        "type": "activity_log",
                        "payload": {"message": log_msg, "log_type": "chat", "target": target, "ink_color": sender_ink},
                    }
                    if chat_campaign_id:
                        await manager.broadcast_campaign(chat_campaign_code, chat_campaign_id, circle_payload, db)
                    else:
                        await manager.broadcast(game_id, circle_payload)
                else:
                    log_msg = f"{sender_name} → {target}: {text}"
                    chat_payload = {
                        "type": "activity_log",
                        "payload": {"message": log_msg, "log_type": "chat", "target": target, "ink_color": sender_ink},
                    }
                    player_name = target.lstrip("@")
                    target_char = db.query(Character).filter(
                        Character.name.ilike(player_name),
                        Character.campaign_id == chat_campaign_id,
                    ).first() if chat_campaign_id else db.query(Character).filter(
                        Character.name.ilike(player_name)
                    ).first()
                    notify_ids = {game_id, chat_campaign_code}
                    if target_char:
                        notify_ids.add(str(target_char.id))
                    for nid in notify_ids:
                        await manager.broadcast(nid, chat_payload)

            elif action == "add_notebook_entry":
                campaign_id = payload.get("campaign_id")
                if campaign_id:
                    e_type  = payload.get("entry_type", "field_log")
                    e_vis   = payload.get("visibility", "all")
                    db_entry = create_notebook_entry(
                        db,
                        campaign_id  = int(campaign_id),
                        title        = payload.get("title", ""),
                        content      = payload.get("content", ""),
                        author_name  = payload.get("author_name", "Unknown"),
                        author_type  = payload.get("author_type", "player"),
                        pen_font     = payload.get("pen_font", "Caveat"),
                        ink_color    = payload.get("ink_color", "#8b1a1a"),
                        character_id = payload.get("character_id"),
                        entry_type   = e_type,
                        visibility   = e_vis,
                        image_data   = payload.get("image_data"),
                    )
                    entry_dict = {
                        "id": db_entry.id,
                        "campaign_id": db_entry.campaign_id,
                        "character_id": db_entry.character_id,
                        "author_name": db_entry.author_name,
                        "author_type": db_entry.author_type,
                        "pen_font": db_entry.pen_font,
                        "ink_color": db_entry.ink_color,
                        "title": db_entry.title,
                        "content": db_entry.content,
                        "created_at": db_entry.created_at,
                        "page_number": db_entry.page_number,
                        "entry_type": db_entry.entry_type,
                        "visibility": db_entry.visibility,
                        "image_data": db_entry.image_data,
                        "is_deleted": False,
                    }
                    # Ephemeral + gm_only entries only broadcast back to the sender
                    if e_vis == "all":
                        await manager.broadcast_campaign(camp_code, camp_id, {"type": "notebook_entry", "payload": entry_dict}, db)
                        await manager.broadcast_campaign(camp_code, camp_id, {
                            "type": "activity_log",
                            "payload": {"message": f"{payload.get('author_name', 'Someone')} logged an entry: \"{payload.get('title', '')}\""}
                        }, db)
                    else:
                        await manager.broadcast(game_id, {"type": "notebook_entry", "payload": entry_dict})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: game_id=%s", game_id)
        manager.disconnect(game_id, websocket)
    except Exception as exc:
        logger.error("WebSocket fatal error: game_id=%s error=%s", game_id, exc, exc_info=True)
        manager.disconnect(game_id, websocket)
    finally:
        db.close()
