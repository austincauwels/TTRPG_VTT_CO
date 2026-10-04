"""Login and registration (POST /api/auth/login, POST /api/auth/register).

No token or cookie is issued; the client keeps the returned userId.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from models import Campaign, User
from vtt.config import logger
from vtt.db import get_db
from vtt.schemas import LoginRequest, RegisterRequest
from vtt.security import limiter, pwd_context

router = APIRouter()

@router.post("/api/auth/login")
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

@router.post("/api/auth/register", status_code=201)
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
