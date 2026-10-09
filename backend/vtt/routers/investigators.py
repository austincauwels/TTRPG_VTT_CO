"""Investigator (character) routes: list, fetch one, forge a new one, set or clear a
portrait, and delete one (and undo that).

Every route needs a login token. Who may call what is in docs/refactor/AUTH.md.
"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import Character, Circle, User
from vtt import deletion
from vtt.auth import (
    MEMBER_STATUSES, ROSTER_STATUSES, campaign_facts, character_or_404, get_current_user,
    require_owner, require_owner_or_gm, require_owner_or_roster_gm, require_self,
)
from vtt.creation import creation_problem
from vtt.db import get_db
from vtt.portraits import check_portrait, refuse_too_many_portrait_changes, served_portrait
from vtt.schemas import CharacterCreate, CharacterResponse, CharacterRosterItem, CharacterSheet, PortraitUpdate
from vtt.serializers import get_char_dict
from vtt.ws.access import CLOSE_NOT_FOUND
from vtt.ws.manager import campaign_key, character_key, manager

router = APIRouter()

@router.get("/api/investigators", response_model=List[CharacterRosterItem])
async def list_investigators(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Nothing in the frontend needs every user's characters, so this lists the caller's own.
    # A retired character left with a deleted campaign is hidden with it (vtt/deletion.py).
    characters = db.query(Character).filter(Character.user_id == user.id).all()
    hidden = deletion.hidden_with_their_campaign(db, characters)
    characters = [c for c in characters if c.id not in hidden]
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

@router.get("/api/investigators/{investigator_id}", response_model=CharacterSheet)
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

    # The sheet as the socket sends it, so a sheet read here lacks nothing a live one has
    return get_char_dict(character)

@router.post("/api/investigators/forge", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def forge_investigator(character_data: CharacterCreate, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    # The character belongs to the caller. A user_id that names someone else is refused.
    require_self(user, character_data.user_id)
    target_user_id = user.id
    # The sheet must be one the character creator could make (vtt/creation.py,
    # RULES_CHECK.md item 15): it used to take any ratings, drives, gilds, marks and scars.
    problem = creation_problem(character_data.model_dump())
    if problem:
        raise HTTPException(status_code=422, detail=problem)
    # The same portrait rule as PUT /api/investigators/{id}/portrait (413 or 422), and
    # a forge with a portrait counts as a portrait change (429 past the limit).
    if character_data.profile_pic:
        refuse_too_many_portrait_changes(user.id)
    character_data.profile_pic = check_portrait(character_data.profile_pic)
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


async def broadcast_portrait(db: Session, character: Character) -> None:
    """Tells the open sockets about a new portrait. The character's own channel gets
    character_update with the whole sheet, as for every sheet change. A character on a
    campaign's roster also gets portrait_update {character_id, campaign_id, profile_pic}
    sent to the campaign: the GM and the active members for an active character (their
    rosters and Circle cards show it), the GM alone for a pending one."""
    await manager.broadcast(character_key(character.id), {
        "type": "character_update", "payload": get_char_dict(character)})
    if character.campaign_id is None or character.status not in ROSTER_STATUSES:
        return
    campaign = campaign_facts(db, character.campaign_id)
    if campaign is None:
        return
    message = {"type": "portrait_update", "payload": {
        "character_id": character.id, "campaign_id": campaign.id,
        "profile_pic": served_portrait(character.profile_pic)}}
    if character.status in MEMBER_STATUSES:
        await manager.broadcast_campaign(campaign.campaign_code, campaign.id, message, db)
    else:
        await manager.broadcast(campaign_key(campaign.campaign_code), message)


@router.put("/api/investigators/{investigator_id}/portrait")
async def set_portrait(investigator_id: int, body: PortraitUpdate, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    """Sets the character's portrait to a picture data URL, or clears it (profile_pic
    null). Allowed for the owner, and for the GM of the character's campaign while it
    is active or pending, a limited number of times per user (vtt/portraits.py).
    Answers with the character as the WebSocket sends it."""
    require_owner_or_roster_gm(
        db, user, character_or_404(db, investigator_id, detail="Investigator dossier not found."))
    refuse_too_many_portrait_changes(user.id)
    portrait = check_portrait(body.profile_pic)
    character = db.query(Character).filter(Character.id == investigator_id).first()
    character.profile_pic = portrait
    db.commit()
    db.refresh(character)
    await broadcast_portrait(db, character)
    return get_char_dict(character)


@router.delete("/api/investigators/{investigator_id}")
async def delete_investigator(investigator_id: int, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    """Deletes the caller's own character, which must be on no campaign's roster (409
    while it is active or pending in one). Nobody else may, the GM of its campaign
    included. A soft delete: the owner can undo it for a short while (POST
    .../restore) and an admin can restore it later (docs/refactor/DELETION.md). A
    socket still open on the character's channel gets character_deleted and is closed
    with 4404."""
    require_owner(user, character_or_404(db, investigator_id, detail=deletion.CHARACTER_NOT_FOUND))
    character = deletion.delete_character(db, investigator_id)
    key = character_key(character.id)
    await manager.broadcast(key, {"type": "character_deleted", "payload": {"character_id": character.id}})
    manager.close_channel(key, CLOSE_NOT_FOUND)
    return deletion.receipt(character)


@router.post("/api/investigators/{investigator_id}/restore")
def restore_investigator(investigator_id: int, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    """Undoes the caller's delete of their own character, within deletion.UNDO_SECONDS
    (409 after that). A character that is not deleted, or not the caller's, is 404."""
    character = deletion.restore_character(db, investigator_id, user_id=user.id)
    return {"ok": True, "id": character.id, "name": character.name, "status": character.status,
            "campaign_id": character.campaign_id}
