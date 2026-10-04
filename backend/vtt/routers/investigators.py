"""Investigator (character) routes: list, fetch one, and forge a new one.

Every route needs a login token. Who may call what is in docs/refactor/AUTH.md.
"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import Character, Circle, User
from vtt.auth import character_or_404, get_current_user, require_owner_or_gm, require_self
from vtt.db import get_db
from vtt.schemas import CharacterCreate, CharacterResponse, CharacterRosterItem

router = APIRouter()

@router.get("/api/investigators", response_model=List[CharacterRosterItem])
async def list_investigators(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Nothing in the frontend needs every user's characters, so this lists the caller's own.
    characters = db.query(Character).filter(Character.user_id == user.id).all()
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

@router.get("/api/investigators/{investigator_id}", response_model=CharacterResponse)
async def get_investigator(investigator_id: int, db: Session = Depends(get_db),
                           user: User = Depends(get_current_user)):
    require_owner_or_gm(db, user, character_or_404(db, investigator_id, detail="Investigator dossier not found."))
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

@router.post("/api/investigators/forge", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def forge_investigator(character_data: CharacterCreate, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    # The character belongs to the caller. A user_id that names someone else is refused.
    require_self(user, character_data.user_id)
    target_user_id = user.id
    try:
        circle = db.query(Circle).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)
            db.commit()

        char_dict = character_data.dict() if hasattr(character_data, 'dict') else character_data.model_dump()
        char_dict.pop('user_id', None)

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
