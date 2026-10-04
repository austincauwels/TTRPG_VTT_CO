"""Per-user lists for the campaign selector (GET /api/users/{user_id}/...).

Both need a login token, and user_id must be the token's own user (403 otherwise).
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Campaign, Character, User
from vtt.auth import ROSTER_STATUSES, get_current_user, require_self
from vtt.db import get_db
from vtt.schemas import CampaignSummaryItem, CharacterSummaryItem

router = APIRouter()

@router.get("/api/users/{user_id}/characters", response_model=List[CharacterSummaryItem])
def get_user_characters(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_self(user, user_id)
    chars =db.query(Character).filter(Character.user_id == user_id).all()
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

@router.get("/api/users/{user_id}/campaigns", response_model=List[CampaignSummaryItem])
def get_user_gm_campaigns(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """The campaigns the user runs, with how many investigators are on each roster.
    Retired and deleted campaigns are left out."""
    require_self(user, user_id)
    campaigns = db.query(Campaign).filter(
        Campaign.gm_user_id == user_id,
        Campaign.is_retired == False,
    ).all()
    counts = {}
    if campaigns:
        counts = dict(db.query(Character.campaign_id, func.count(Character.id)).filter(
            Character.campaign_id.in_([c.id for c in campaigns]),
            Character.status.in_(ROSTER_STATUSES),
        ).group_by(Character.campaign_id).all())
    return [
        CampaignSummaryItem(id=c.id, name=c.name, campaign_code=c.campaign_code,
                            investigator_count=counts.get(c.id, 0))
        for c in campaigns
    ]
