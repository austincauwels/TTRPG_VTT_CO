import os
import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware  # <-- NEW IMPORT
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel

from .models import Base, User, Game, Character, Circle
from .engine import roll_dice, calculate_resistance_max

SECRET_KEY = os.getenv("SECRET_KEY", "candela_obscura_secret_key_unbreakable_shadows")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SQLALCHEMY_DATABASE_URL = "sqlite:///./candela_obscura.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# =====================================================================
# CORS MIDDLEWARE (THE FIX FOR THE 403 FORBIDDEN ERROR)
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (including your Vite proxy subdomains)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods and WebSocket upgrades
    allow_headers=["*"],  # Allows all headers (including custom Origin and Host headers)
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# =====================================================================
# PYDANTIC SCHEMAS 
# =====================================================================
class CharacterBase(BaseModel):
    name: str
    pronouns: str = "Unlisted"
    style: str = ""
    catalyst: str = ""
    question: str = ""
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

    nerve_current: int = 1
    nerve_max: int = 1
    cunning_current: int = 1
    cunning_max: int = 1
    intuition_current: int = 1
    intuition_max: int = 1

    body_marks: int = 0
    brain_marks: int = 0
    bleed_marks: int = 0
    scars_count: int = 0
    scars_list: List[str] = []
    incapacitated: bool = False

class CharacterCreate(CharacterBase):
    pass 

class CharacterResponse(CharacterBase):
    id: int
    circle_id: int
    class Config:
        from_attributes = True

# =====================================================================
# REST API ENDPOINTS
# =====================================================================
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

        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(id=1, username="admin", email="admin@archive.com", hashed_password="xxx")
            db.add(user)
            db.commit()

        char_dict = character_data.dict() if hasattr(character_data, 'dict') else character_data.model_dump()
        
        for key in ["body_marks", "brain_marks", "bleed_marks", "scars_count", "move", "strike", "control", "sneak", "hide", "sway", "survey", "read", "sense"]:
            if char_dict.get(key) is None:
                char_dict[key] = 0
        
        char_dict["gear"] = json.dumps(char_dict.get("gear") or [])
        char_dict["scars_list"] = json.dumps(char_dict.get("scars_list") or [])

        new_character = Character(**char_dict, circle_id=circle.id, user_id=user.id)
        db.add(new_character)
        db.commit()
        db.refresh(new_character)
        
        new_character.gear = json.loads(new_character.gear)
        new_character.scars_list = json.loads(new_character.scars_list)
        return new_character
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Forge Error: {str(e)}")

# =====================================================================
# WEBSOCKET STREAM ROUTER 
# =====================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}
    async def connect(self, game_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(game_id, []).append(websocket)
    def disconnect(self, game_id: int, websocket: WebSocket):
        if game_id in self.active_connections:
            self.active_connections[game_id].remove(websocket)
    async def broadcast(self, game_id: int, message: dict):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                await connection.send_json(message)

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
        "nerve_current": getattr(char, "nerve_current", 1) or 1,
        "cunning_max": getattr(char, "cunning_max", 1) or 1,
        "cunning_current": getattr(char, "cunning_current", 1) or 1,
        "intuition_max": getattr(char, "intuition_max", 1) or 1,
        "intuition_current": getattr(char, "intuition_current", 1) or 1,
        
        "body_marks": getattr(char, "body_marks", 0) or 0,
        "brain_marks": getattr(char, "brain_marks", 0) or 0,
        "bleed_marks": getattr(char, "bleed_marks", 0) or 0,
        "scars_count": getattr(char, "scars_count", 0) or 0,
        "scars_list": scars,
        "incapacitated": bool(getattr(char, "incapacitated", False)),
        "circle_id": getattr(char, "circle_id", 1),
        
        "pronouns": getattr(char, "pronouns", "Unlisted") or "Unlisted",
        "style": getattr(char, "style", "") or "",
        "catalyst": getattr(char, "catalyst", "") or "",
        "question": getattr(char, "question", "") or "",
        "role_ability": getattr(char, "role_ability", "None") or "None",
        "specialty_ability": getattr(char, "specialty_ability", "None") or "None",
        "gear": gear,
        "profile_pic": getattr(char, "profile_pic", None)
    }

def get_circle_dict(circle):
    return {
        "id": circle.id,
        "name": circle.name,
        "stitch": circle.stitch,
        "refresh": circle.refresh,
        "train": circle.train,
        "max_capacity": 1 + len(circle.characters)
    }

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: int):
    await manager.connect(game_id, websocket)
    db = SessionLocal()
    
    circle = db.query(Circle).filter(Circle.id == 1).first()
    if not circle:
        circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
        db.add(circle)
        db.commit()
        
    character = db.query(Character).filter(Character.id == game_id).first()
    if character:
        await websocket.send_json({"type": "character_update", "payload": get_char_dict(character)})
    await websocket.send_json({"type": "circle_update", "payload": get_circle_dict(circle)})

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("type")
            payload = message.get("payload", {})
            
            char_id = payload.get("character_id") if payload else game_id
            character = db.query(Character).filter(Character.id == char_id).first()

            if action == "roll" and character:
                act = payload.get("action")
                spent = int(payload.get("drive_spent", 0))
                cat = "nerve" if act in ["move", "strike", "control"] else "cunning" if act in ["hide", "sneak", "sway"] else "intuition"
                
                setattr(character, f"{cat}_current", max(0, getattr(character, f"{cat}_current") - spent))
                is_gilded_action = getattr(character, f"gilded_{act}", False)
                res = roll_dice(getattr(character, act, 0) + spent, is_gilded_action)
                
                formatted_dice = []
                for i, die_value in enumerate(res.get("dice", [])):
                    formatted_dice.append({
                        "value": die_value,
                        "is_gilded": True if (is_gilded_action and i == 0) else False
                    })
                
                res["dice"] = formatted_dice
                res["action"] = act
                db.commit()
                
                await manager.broadcast(game_id, {
                    "type": "roll_result", 
                    "payload": {"character_id": char_id, "action": act, "roll": res, "character": get_char_dict(character)}
                })

            elif action == "update_drive" and character: 
                pool = payload.get("pool")
                value = payload.get("value")
                if pool and value is not None:
                    setattr(character, f"{pool}_current", value)
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "select_gilded" and character:
                cat = payload.get("drive_category")
                if cat and hasattr(character, f"{cat}_current"):
                    setattr(character, f"{cat}_current", min(getattr(character, f"{cat}_max", 3), getattr(character, f"{cat}_current") + 1))
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "take_mark" and character:
                m_type = payload.get("mark_type")
                if m_type:
                    val = getattr(character, f"{m_type}_marks", 0) + 1
                    if val >= 4:
                        setattr(character, f"{m_type}_marks", 0)
                        character.scars_count = getattr(character, "scars_count", 0) + 1
                        if character.scars_count >= 4: character.incapacitated = True
                        db.commit()
                        await manager.broadcast(game_id, {"type": "trigger_scar", "payload": {"character_id": char_id, "mark_type": m_type, "character": get_char_dict(character)}})
                    else:
                        setattr(character, f"{m_type}_marks", val)
                        db.commit()
                        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "apply_scar" and character:
                character.scars_list = list(character.scars_list) + [payload.get("scar_text")]
                down, up = payload.get("shift_down"), payload.get("shift_up")
                if down and up and hasattr(character, down) and hasattr(character, up):
                    if getattr(character, down) > 0 and getattr(character, up) < 3:
                        setattr(character, down, getattr(character, down) - 1)
                        setattr(character, up, getattr(character, up) + 1)
                db.commit()
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "update_circle":
                circle_id = payload.get("circle_id") or 1
                circle = db.query(Circle).filter(Circle.id == circle_id).first()
                if circle:
                    for field in ["stitch", "refresh", "train"]:
                        if field in payload:
                            setattr(circle, field, payload[field])
                    db.commit()
                    await manager.broadcast(game_id, {"type": "circle_update", "payload": get_circle_dict(circle)})

    except WebSocketDisconnect:
        manager.disconnect(game_id, websocket)
    finally:
        db.close()