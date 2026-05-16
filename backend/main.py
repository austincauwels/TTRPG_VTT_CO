import os
import json
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .models import Base, User, Game, Character, Circle
from .engine import roll_dice, calculate_resistance_max

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SQLALCHEMY_DATABASE_URL = "sqlite:///./candela_obscura.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI()

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
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/register")
def register(username: str, email: str, password: str, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = User(username=username, email=email, hashed_password=get_password_hash(password))
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

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
    return {
        "id": char.id, "name": char.name,
        "move": char.move, "strike": char.strike, "control": char.control,
        "hide": char.hide, "sneak": char.sneak, "sway": char.sway,
        "survey": char.survey, "read": char.read, "sense": char.sense,
        "gilded_move": char.gilded_move, "gilded_strike": char.gilded_strike, "gilded_control": char.gilded_control,
        "gilded_hide": char.gilded_hide, "gilded_sneak": char.gilded_sneak, "gilded_sway": char.gilded_sway,
        "gilded_survey": char.gilded_survey, "gilded_read": char.gilded_read, "gilded_sense": char.gilded_sense,
        "nerve_max": char.nerve_max, "nerve_current": char.nerve_current,
        "cunning_max": char.cunning_max, "cunning_current": char.cunning_current,
        "intuition_max": char.intuition_max, "intuition_current": char.intuition_current,
        "body_marks": char.body_marks, "brain_marks": char.brain_marks, "bleed_marks": char.bleed_marks,
        "scars_count": char.scars_count, "scars_list": char.scars_list,
        "incapacitated": char.incapacitated, "circle_id": char.circle_id
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
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("type")
            payload = message.get("payload")
            char_id = payload.get("character_id") if payload else None
            character = db.query(Character).filter(Character.id == char_id).first() if char_id else None

            if action == "roll" and character:
                act = payload.get("action")
                spent = payload.get("drive_spent", 0)
                cat = "nerve" if act in ["move", "strike", "control"] else "cunning" if act in ["hide", "sneak", "sway"] else "intuition"
                setattr(character, f"{cat}_current", max(0, getattr(character, f"{cat}_current") - spent))
                res = roll_dice(getattr(character, act, 0) + spent, getattr(character, f"gilded_{act}", False))
                res["action"] = act # Pass action name back to frontend
                db.commit()
                await manager.broadcast(game_id, {"type": "roll_result", "payload": {"character_id": char_id, "action": act, "roll": res, "character": get_char_dict(character)}})

            elif action == "select_gilded" and character:
                cat = payload.get("drive_category")
                setattr(character, f"{cat}_current", min(getattr(character, f"{cat}_max"), getattr(character, f"{cat}_current") + 1))
                db.commit()
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            elif action == "take_mark" and character:
                m_type = payload.get("mark_type")
                val = getattr(character, f"{m_type}_marks") + 1
                if val >= 4:
                    setattr(character, f"{m_type}_marks", 0)
                    character.scars_count += 1
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
                circle_id = payload.get("circle_id")
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
