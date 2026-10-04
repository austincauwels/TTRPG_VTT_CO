"""Who is calling, and what they may touch.

get_current_user is the FastAPI dependency every REST route uses except login and
register. It reads "Authorization: Bearer <token>" and answers 401 when the header
is missing, the token is invalid or expired, its user no longer exists, or the
user's password has been replaced since the token was issued.

The helpers below implement the access rules in docs/refactor/AUTH.md. They raise
HTTPException: 404 when an id the client sent does not exist, 403 when it exists but
the caller may not use it. Facts are read with column queries, so a long-lived
session (the WebSocket's) never decides on a stale copy of a row.
"""
import hmac
from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from models import Campaign, Character, User
from vtt.db import get_db
from vtt.security import login_token_subject, password_stamp

NOT_AUTHENTICATED = "Not authenticated."
NOT_ALLOWED = "Not allowed."

# A member of a campaign is a user with an approved (active) character in it. Dead
# characters keep status active until they are replaced. A pending character waits
# for the GM's approval and reaches nothing of the campaign (roster, notebook, circle,
# chat): anyone who has the campaign code can make one.
MEMBER_STATUSES = ("active",)
# The characters on a campaign's roster: its members and those waiting for approval.
# The GM may act on any of them over the WebSocket.
ROSTER_STATUSES = ("active", "pending")


def bearer_token(request: Request) -> Optional[str]:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def user_for_token(db: Session, token: Optional[str]) -> Optional[User]:
    """The user a login token names, or None. A token whose password stamp no longer
    matches the user's password hash (the password was replaced) counts as none."""
    subject = login_token_subject(token)
    if subject is None:
        return None
    user_id, stamp = subject
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not hmac.compare_digest(stamp, password_stamp(user.hashed_password)):
        return None
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = user_for_token(db, bearer_token(request))
    if user is None:
        raise HTTPException(status_code=401, detail=NOT_AUTHENTICATED,
                            headers={"WWW-Authenticate": "Bearer"})
    return user


def forbidden():
    return HTTPException(status_code=403, detail=NOT_ALLOWED)


def require_self(user: User, claimed_user_id) -> None:
    """For routes where the client still sends its own user id: a value equal to the
    token's user is accepted (and ignored), anything else is 403."""
    if claimed_user_id is not None and claimed_user_id != user.id:
        raise forbidden()


def campaign_facts(db: Session, campaign_id):
    """(id, gm_user_id, campaign_code) of a campaign, or None."""
    return db.query(Campaign.id, Campaign.gm_user_id, Campaign.campaign_code).filter(
        Campaign.id == campaign_id).first()


def character_facts(db: Session, character_id):
    """(id, user_id, campaign_id, status) of a character, or None."""
    return db.query(Character.id, Character.user_id, Character.campaign_id, Character.status).filter(
        Character.id == character_id).first()


def is_gm(user_id, campaign) -> bool:
    return campaign is not None and campaign.gm_user_id is not None and campaign.gm_user_id == user_id


def is_member(db: Session, user_id, campaign_id) -> bool:
    """True when the user has an active (approved) character in the campaign."""
    if campaign_id is None:
        return False
    return db.query(Character.id).filter(
        Character.user_id == user_id,
        Character.campaign_id == campaign_id,
        Character.status.in_(MEMBER_STATUSES),
    ).first() is not None


def campaign_or_404(db: Session, campaign_id, detail="Campaign not found"):
    campaign = campaign_facts(db, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail=detail)
    return campaign


def character_or_404(db: Session, character_id, detail="Character not found"):
    character = character_facts(db, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail=detail)
    return character


def require_gm(user: User, campaign) -> None:
    if not is_gm(user.id, campaign):
        raise forbidden()


def require_gm_or_member(db: Session, user: User, campaign) -> None:
    if not (is_gm(user.id, campaign) or is_member(db, user.id, campaign.id)):
        raise forbidden()


def require_owner(user: User, character) -> None:
    if character.user_id != user.id:
        raise forbidden()


def require_gm_of_character(db: Session, user: User, character) -> None:
    """The caller must be the GM of the campaign the character belongs to."""
    campaign = campaign_facts(db, character.campaign_id) if character.campaign_id is not None else None
    require_gm(user, campaign)


def require_owner_or_gm(db: Session, user: User, character) -> None:
    if character.user_id == user.id:
        return
    require_gm_of_character(db, user, character)


def require_owner_or_roster_gm(db: Session, user: User, character) -> None:
    """The character's owner, or the GM of its campaign while the character is on the
    roster (active or pending), as for the GM's WebSocket messages. A retired character
    stays tagged with its old campaign, and that GM may no longer change it."""
    if character.user_id == user.id:
        return
    if character.status not in ROSTER_STATUSES:
        raise forbidden()
    require_gm_of_character(db, user, character)
