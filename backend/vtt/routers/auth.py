"""Signing in: password login and registration (POST /api/auth/login, /api/auth/register),
Sign in with Google (POST /api/auth/google, /api/auth/google/link,
/api/auth/google/create), and GET /api/auth/config, which tells the login screen
which of the two is on.

Every route that signs someone in answers with the user's details plus "token", a
login token (see vtt/security.py) that every other route and the WebSocket require.
These routes are the only ones that work without one. docs/refactor/AUTH.md has the
rules for linking a Google account to a user.
"""
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from models import Campaign, User
from vtt import config, google
from vtt.config import logger
from vtt.db import PUBLISHED_PASSWORDS, get_db, unusable_password_hash
from vtt.google import GoogleIdentity
from vtt.schemas import (GoogleCreateRequest, GoogleLinkRequest, GoogleSignInRequest, LoginRequest,
                         RegisterRequest)
from vtt.security import create_access_token, create_link_token, identity_from_link_token, limiter, pwd_context

router = APIRouter()

INVALID_CREDENTIALS = "Invalid credentials."
LINK_WRONG_PASSWORD = "That username and password do not match."
USERNAME_TAKEN = "That identification is already claimed."
PASSWORD_LOGIN_OFF = "Password sign-in is turned off. Please use Sign in with Google."
GOOGLE_NOT_SET_UP = "Sign in with Google is not set up on this server."
GOOGLE_REFUSED = "Google could not confirm this sign-in. Please try again."
GOOGLE_UNREACHABLE = "Google could not be reached to check this sign-in. Please try again in a moment."
LINK_EXPIRED = "This Google sign-in has expired. Please sign in with Google again."
GOOGLE_ALREADY_LINKED = "This Google account is already linked to an account. Please sign in with Google again."
ACCOUNT_ALREADY_LINKED = "That account is already linked to a Google account."
EMAIL_TAKEN = ("An account with this email address already exists. "
               "Please use Link my existing account instead.")


def signed_in_response(db: Session, user: User) -> dict:
    """What login answers: the user's role, name, id, GM campaign or pending rejoin
    invite, and a new login token."""
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
            "token": create_access_token(user.id),
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
        "token": create_access_token(user.id),
    }


def username_taken(db: Session, username: str) -> bool:
    """True when a user has this name, ignoring case. Login compares names exactly, but
    a new name must differ from every existing one in more than case, so that nobody
    can pass for another player ("Mira" next to "mira") where people type or read a
    name, such as the GM's invite to rejoin."""
    return db.query(User.id).filter(func.lower(User.username) == func.lower(username)).first() is not None


def require_password_login():
    if not config.ALLOW_PASSWORD_LOGIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PASSWORD_LOGIN_OFF)


@router.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    require_password_login()
    user = db.query(User).filter(User.username == credentials.username).first()

    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        logger.warning("Failed login attempt for username=%r", credentials.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS
        )

    return signed_in_response(db, user)

@router.post("/api/auth/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, credentials: RegisterRequest, db: Session = Depends(get_db)):
    require_password_login()
    if username_taken(db, credentials.username):
        raise HTTPException(status_code=400, detail=USERNAME_TAKEN)
    # Ignoring case: two users whose emails differ only in case keep Sign in with Google
    # from linking either of them by email.
    if db.query(User.id).filter(func.lower(User.email) == func.lower(credentials.email)).first() is not None:
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
        "campaignId": campaign.id if campaign else None,
        "token": create_access_token(new_user.id),
    }


# --- Sign in with Google -----------------------------------------------------------

async def verified_google_identity(credential: str) -> GoogleIdentity:
    if not config.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GOOGLE_NOT_SET_UP)
    try:
        # google-auth may download Google's certificates, which blocks, so the check
        # runs in a worker thread and the event loop (and every WebSocket) carries on.
        return await run_in_threadpool(google.verify_id_token, credential)
    except google.GoogleUnavailableError as exc:
        logger.error("Could not check a Google sign-in, Google unreachable: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GOOGLE_UNREACHABLE)
    except google.GoogleTokenError as exc:
        logger.warning("Refused a Google sign-in: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GOOGLE_REFUSED)


def identity_or_401(link_token: str) -> GoogleIdentity:
    identity = identity_from_link_token(link_token)
    if identity is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LINK_EXPIRED)
    return identity


def refuse_linked_google_account(db: Session, identity: GoogleIdentity) -> None:
    """A Google account links to one user only. This also makes a link token good
    for one link or create: afterwards its Google account is taken."""
    if db.query(User.id).filter(User.google_sub == identity.sub).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=GOOGLE_ALREADY_LINKED)


def link_google_account(db: Session, user: User, identity: GoogleIdentity, how: str) -> None:
    user.google_sub = identity.sub
    try:
        db.commit()
    except IntegrityError:
        # Only google_sub changed, so another request linked this Google account to
        # someone else after refuse_linked_google_account looked.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=GOOGLE_ALREADY_LINKED)
    db.refresh(user)
    logger.info("Linked a Google account to user id=%s (%s)", user.id, how)


def refuse_new_google_user(db: Session, identity: GoogleIdentity, username: str) -> None:
    """The checks before a new user for a Google account, in the order AUTH.md gives."""
    refuse_linked_google_account(db, identity)
    if username_taken(db, username):
        raise HTTPException(status_code=400, detail=USERNAME_TAKEN)
    if db.query(User.id).filter(func.lower(User.email) == identity.email.lower()).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_TAKEN)


# The accounts the seed scripts make (admin and the test players). Their emails are
# seed data, not anyone's real address, and admin (user 1) owns every character forged
# before login tokens, so none of them is ever linked by email. admin@archive.com is
# on a real domain whose owner could make a Google account for that address. Whoever
# knows one of their passwords can still link it through /api/auth/google/link.
SEEDED_USERNAMES = tuple(PUBLISHED_PASSWORDS)

_NOT_IN_USERNAMES = re.compile(r"[^\w\-. ]+")


def _username_from(text: str) -> str:
    return " ".join(_NOT_IN_USERNAMES.sub(" ", text or "").split())[:32].strip()


def suggest_username(db: Session, identity: GoogleIdentity) -> str:
    """A free username made from the Google name (else the email's local part) that
    passes the register rule. The player can change it before creating the account."""
    base = _username_from(identity.name)
    if len(base) < 2:
        base = _username_from(identity.email.split("@", 1)[0])
    if len(base) < 2:
        base = "Investigator"
    candidates = [base]
    for n in range(2, 10):
        suffix = f" {n}"
        candidates.append(base[:32 - len(suffix)].rstrip() + suffix)
    candidates.append(base[:27].rstrip() + " " + secrets.token_hex(2))
    for candidate in candidates:
        if not username_taken(db, candidate):
            return candidate
    return base


@router.post("/api/auth/google")
@limiter.limit("10/minute")
async def google_sign_in(request: Request, body: GoogleSignInRequest, db: Session = Depends(get_db)):
    """Signs in the user linked to this Google account. A user with no Google account
    yet whose email is the Google email (ignoring case) is linked on the spot, if
    exactly one such user exists. Seeded accounts are never linked this way. Otherwise
    the answer is a link token for /api/auth/google/link or /api/auth/google/create."""
    identity = await verified_google_identity(body.credential)

    user = db.query(User).filter(User.google_sub == identity.sub).first()
    if user is not None:
        return signed_in_response(db, user)

    same_email = db.query(User).filter(
        User.google_sub.is_(None),
        func.lower(User.email) == identity.email.lower(),
        User.username.notin_(SEEDED_USERNAMES),
    ).limit(2).all()
    if len(same_email) == 1:
        user = same_email[0]
        link_google_account(db, user, identity, "matching email")
        return signed_in_response(db, user)

    return {
        "needs_account": True,
        "link_token": create_link_token(identity),
        "suggested_name": suggest_username(db, identity),
        "email": identity.email,
    }


@router.post("/api/auth/google/link")
@limiter.limit("10/minute")
async def google_link(request: Request, body: GoogleLinkRequest, db: Session = Depends(get_db)):
    """Links the Google account in the link token to an existing user, once, given
    that user's username and password. Works whether or not password login is on,
    so players whose email differs can still bring their account over."""
    identity = identity_or_401(body.link_token)
    refuse_linked_google_account(db, identity)

    user = db.query(User).filter(User.username == body.username).first()
    if not user or not pwd_context.verify(body.password, user.hashed_password):
        logger.warning("Failed Google link attempt for username=%r", body.username)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LINK_WRONG_PASSWORD)
    if user.google_sub is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_ALREADY_LINKED)

    link_google_account(db, user, identity, "username and password")
    return signed_in_response(db, user)


@router.post("/api/auth/google/create", status_code=201)
@limiter.limit("5/minute")
async def google_create(request: Request, body: GoogleCreateRequest, db: Session = Depends(get_db)):
    """Creates a user for the Google account in the link token, with the Google email
    and a password nobody knows, and signs them in."""
    identity = identity_or_401(body.link_token)
    refuse_new_google_user(db, identity, body.username)

    user = User(
        username=body.username,
        email=identity.email,
        hashed_password=unusable_password_hash(),
        google_sub=identity.sub,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Another request took the Google account, the username or the email after
        # the checks looked. Answer as the checks now would; anything else (such as
        # the fresh-database sequence clash in ROUTES.md) stays a server error.
        db.rollback()
        refuse_new_google_user(db, identity, body.username)
        raise
    db.refresh(user)
    logger.info("Created user id=%s with a Google account", user.id)
    return signed_in_response(db, user)


@router.get("/api/auth/config")
async def auth_config():
    """Which ways of signing in are on, for the login screen. Public."""
    return {"google": bool(config.GOOGLE_CLIENT_ID), "password_login": config.ALLOW_PASSWORD_LOGIN}
