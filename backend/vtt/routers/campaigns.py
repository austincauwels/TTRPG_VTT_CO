"""Campaign and roster routes: create, join, approve, reject, retire, rejoin, invite to rejoin, roster.

Every route needs a login token. Who may call what is in docs/refactor/AUTH.md.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from engine import (
    create_new_campaign, request_join_campaign,
    approve_investigator, reject_investigator, get_campaign_roster,
)
from models import Campaign, Character, Circle, User
from vtt.auth import (
    campaign_or_404, character_or_404, forbidden, get_current_user, require_gm,
    require_gm_of_character, require_gm_or_member, require_owner, require_self,
)
from vtt.config import _ALLOWED_CAMPAIGN_CODE_RE, _SAFE_FONT_NAMES
from vtt.db import get_db
from vtt.schemas import CharacterRosterItem, InviteRejoinRequest, RejoinRequest, RosterResponse
from vtt.serializers import get_char_dict
from vtt.ws.manager import campaign_key, character_key, manager

router = APIRouter()


def _reads_as_number(code: str) -> bool:
    """True for a code that int() accepts, such as "123", "-12" or "1_000"."""
    try:
        int(code)
    except ValueError:
        return False
    return True


CODE_IN_USE = "Campaign code is already in use"


def _code_taken(db: Session, code: str) -> bool:
    return db.query(Campaign.id).filter(Campaign.campaign_code == code).first() is not None


@router.post("/campaign/create")
def create_campaign(name: str, code: str, user_id: Optional[int] = None, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    # The caller becomes the GM. A user_id that names someone else is refused.
    require_self(user, user_id)
    if not _ALLOWED_CAMPAIGN_CODE_RE.match(code):
        raise HTTPException(status_code=422, detail="Campaign code must be 3–32 alphanumeric characters (hyphens/underscores allowed)")
    if _reads_as_number(code):
        # /ws/{code} would also name the character with that id (QUIRK D13).
        raise HTTPException(status_code=422, detail="Campaign code must not be a number")
    if len(name) < 1 or len(name) > 80:
        raise HTTPException(status_code=422, detail="Campaign name must be 1–80 characters")
    # A taken code used to reach the unique index and answer 500.
    if _code_taken(db, code):
        raise HTTPException(status_code=409, detail=CODE_IN_USE)
    try:
        return create_new_campaign(db, name, code, gm_user_id=user.id)
    except IntegrityError:
        db.rollback()
        if _code_taken(db, code):  # another request took the code after the check
            raise HTTPException(status_code=409, detail=CODE_IN_USE)
        raise

@router.post("/campaign/join")
async def join_campaign(character_id: int, code: str, pen_font: str = 'Caveat', db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    if not _ALLOWED_CAMPAIGN_CODE_RE.match(code):
        raise HTTPException(status_code=422, detail="Invalid campaign code format")
    require_owner(user, character_or_404(db, character_id))
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
            await manager.broadcast(campaign_key(code), payload)
    return result

@router.post("/campaign/approve/{character_id}")
async def approve_character(character_id: int, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    require_gm_of_character(db, user, character_or_404(db, character_id))
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
async def reject_character(character_id: int, db: Session = Depends(get_db),
                           user: User = Depends(get_current_user)):
    require_gm_of_character(db, user, character_or_404(db, character_id))
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
        await manager.broadcast(character_key(character_id), {
            "type": "investigator_rejected",
            "payload": {"character_id": character_id},
        })
    return result

@router.post("/campaign/{campaign_id}/retire")
async def retire_campaign(campaign_id: int, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    require_gm(user, campaign_or_404(db, campaign_id))
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


@router.post("/campaign/rejoin")
async def rejoin_campaign(body: RejoinRequest, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    from engine import INK_COLORS
    campaign = db.query(Campaign).filter(Campaign.campaign_code == body.campaign_code).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    new_char = db.query(Character).filter(Character.id == body.character_id).first()
    if not new_char:
        raise HTTPException(status_code=404, detail="Character not found")
    require_owner(user, new_char)
    # Rejoining skips GM approval, so it is only open to a user the GM invited back
    # to this campaign, or one whose approved character there has died and is still
    # on the roster (dead characters keep status active until they are replaced; this
    # rejoin retires it, so one death opens the path once). A pending character does
    # not count: its owner can kill it on its own socket, so anyone with the campaign
    # code could join, die and come back active without the GM.
    invited = user.pending_rejoin_campaign_id == campaign.id
    lost_a_character = db.query(Character.id).filter(
        Character.user_id == user.id,
        Character.campaign_id == campaign.id,
        Character.is_dead == True,
        Character.status == "active",
    ).first() is not None
    if not (invited or lost_a_character):
        raise forbidden()

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


AMBIGUOUS_USERNAME = ("More than one player has that username. Please type it exactly, "
                      "with the same capital letters.")


def _invitee(db: Session, typed: str) -> User:
    """The user a GM means by a typed username. An invite lets its holder rejoin without
    GM approval, so it must never land on the wrong user: an exact match wins, and a
    name that matches only ignoring case must match exactly one user (409 otherwise)."""
    name = typed.strip()
    exact = db.query(User).filter(User.username == name).first()
    if exact is not None:
        return exact
    matches = db.query(User).filter(func.lower(User.username) == func.lower(name)).limit(2).all()
    if not matches:
        raise HTTPException(status_code=404, detail="No player found with that username.")
    if len(matches) > 1:
        raise HTTPException(status_code=409, detail=AMBIGUOUS_USERNAME)
    return matches[0]


@router.post("/campaign/{campaign_id}/invite-rejoin")
async def invite_rejoin(campaign_id: int, body: InviteRejoinRequest, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    require_gm(user, campaign_or_404(db, campaign_id))
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    invitee = _invitee(db, body.username)

    invitee.pending_rejoin_campaign_id = campaign_id
    db.commit()

    # Attempt live delivery to any character websocket this user owns
    chars = db.query(Character).filter(Character.user_id == invitee.id).all()
    for c in chars:
        await manager.broadcast(character_key(c.id), {
            "type": "gm_rejoin_invite",
            "payload": {
                "campaign_id": campaign_id,
                "campaign_name": campaign.name,
                "campaign_code": campaign.campaign_code,
            },
        })
    return {"ok": True}

@router.get("/campaign/{campaign_id}/roster", response_model=RosterResponse)
def get_roster(campaign_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_gm_or_member(db, user, campaign_or_404(db, campaign_id))
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
