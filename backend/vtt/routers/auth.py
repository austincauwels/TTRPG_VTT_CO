"""Signing in: password login and registration (POST /api/auth/login, /api/auth/register),
Sign in with Google (POST /api/auth/google, /api/auth/google/link,
/api/auth/google/create), and GET /api/auth/config, which tells the login screen
which of the two is on. Password reset by email (POST /api/auth/password-reset and
/api/auth/password-reset/confirm, see vtt/password_reset.py). The signed-in user's
own account: GET /api/auth/me, and POST /api/auth/me/google, which links a Google
account to it.

Every route that signs someone in answers with the user's details plus "token", a
login token (see vtt/security.py) that every other route and the WebSocket require.
These routes and the reset request are the only ones that work without one.
docs/refactor/AUTH.md has the rules for linking a Google account to a user and for
reset links.
"""
import re
import secrets
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from limits import parse as parse_limit
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from models import Campaign, User
from vtt import config, google, password_reset
from vtt.auth import get_current_user
from vtt.config import logger
from vtt.db import PUBLISHED_PASSWORDS, get_db, unusable_password_hash
from vtt.google import GoogleIdentity
from vtt.schemas import (AccountGoogleLinkRequest, GoogleCreateRequest, GoogleLinkRequest, GoogleSignInRequest,
                         LoginRequest, PasswordResetConfirm, PasswordResetRequest, RegisterRequest)
from vtt.security import (client_key, create_access_token, create_link_token, identity_from_link_token, limiter,
                          pwd_context)
from vtt.ws.manager import manager

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
GOOGLE_LINKED_ELSEWHERE = "This Google account is already linked to another account."
RELINK_WRONG_PASSWORD = "That is not this account's password."
RELINK_NEEDS_PASSWORD = ("This Google account has another email address than your account. "
                         "Enter your account's password to link it.")
RESET_ADDRESS_LIMITED = "Too many reset emails were asked for this address. Please wait an hour and try again."
# Register's one answer for a taken username and a taken email (it used to say which).
REGISTER_REFUSED = ("That username or email address cannot be used for a new account. "
                    "Choose another username, or sign in if you already have an account.")
REGISTER_REFUSALS_LIMITED = "Too many accounts could not be created from here. Please try again in an hour."
# Refused registrations per client (client_key) before register answers 429.
REGISTER_REFUSAL_LIMIT = parse_limit("10/hour")
REGISTER_REFUSAL_SCOPE = "register-refused"
RESET_LINK_INVALID = "This link has expired or has already been used. Please ask for a new one."


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
            "token": create_access_token(user.id, user.hashed_password),
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
        "token": create_access_token(user.id, user.hashed_password),
    }


def username_taken(db: Session, username: str) -> bool:
    """True when a user has this name, ignoring case. Login compares names exactly, but
    a new name must differ from every existing one in more than case, so that nobody
    can pass for another player ("Mira" next to "mira") where people type or read a
    name, such as the GM's invite to rejoin."""
    return db.query(User.id).filter(func.lower(User.username) == func.lower(username)).first() is not None


def check_password(password: str, user) -> bool:
    """True when the user exists and the password is theirs. For a missing user passlib
    runs its dummy check, which takes as long as a real one, so the time taken does
    not tell whether an account has that username.

    bcrypt takes about a quarter of a second, and these routes are async: the routes
    call this, and every other bcrypt hash, through run_in_threadpool, so that the
    event loop (and every game WebSocket of the single worker) carries on meanwhile."""
    return pwd_context.verify(password, user.hashed_password if user is not None else None) and user is not None


def require_password_login():
    if not config.ALLOW_PASSWORD_LOGIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PASSWORD_LOGIN_OFF)


@router.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    require_password_login()
    user = db.query(User).filter(User.username == credentials.username).first()

    if not await run_in_threadpool(check_password, credentials.password, user):
        logger.warning("Failed login attempt for username=%r", credentials.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS
        )

    return signed_in_response(db, user)

def register_refusals_left(request: Request) -> bool:
    """False once this client (client_key: its IP, or its IPv6 /64) has had
    REGISTER_REFUSAL_LIMIT refusals. Off while the rate limiter is off."""
    return not limiter.enabled or limiter.limiter.test(
        REGISTER_REFUSAL_LIMIT, REGISTER_REFUSAL_SCOPE, client_key(request))


def count_register_refusal(request: Request) -> None:
    if limiter.enabled:
        limiter.limiter.hit(REGISTER_REFUSAL_LIMIT, REGISTER_REFUSAL_SCOPE, client_key(request))


@router.post("/api/auth/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, credentials: RegisterRequest, db: Session = Depends(get_db)):
    """Creates a password account and signs it in. A username or email that another
    account has (ignoring case) gets one answer for both, so the answer does not say
    which of the two is taken. Since the request names the username, a free one still
    shows that the email has an account; the refusals are limited per IP to make that
    slow (AUTH.md)."""
    require_password_login()
    if not register_refusals_left(request):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=REGISTER_REFUSALS_LIMITED)
    # Ignoring case: two users whose emails differ only in case keep Sign in with Google
    # from linking either of them by email.
    if username_taken(db, credentials.username) or db.query(User.id).filter(
            func.lower(User.email) == func.lower(credentials.email)).first() is not None:
        count_register_refusal(request)
        raise HTTPException(status_code=400, detail=REGISTER_REFUSED)

    new_user = User(
        username=credentials.username,
        email=credentials.email,
        hashed_password=await run_in_threadpool(pwd_context.hash, credentials.password)
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
        "token": create_access_token(new_user.id, new_user.hashed_password),
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


def same_email(a: Optional[str], b: Optional[str]) -> bool:
    """True when both addresses are set and equal ignoring case."""
    return bool(a) and bool(b) and a.lower() == b.lower()


def proven_link(user: User) -> bool:
    """True when the user's Google link was made with a Google account whose email is
    the account's email. A link with another Google email, or one from before the
    Google email was recorded, is unproven (AUTH.md)."""
    return user.google_sub is not None and same_email(user.google_email, user.email)


def link_google_account(db: Session, user: User, identity: GoogleIdentity, how: str, *,
                        expect_sub: Optional[str] = None, expect_hash: Optional[str] = None,
                        new_password_hash: Optional[str] = None,
                        taken_detail: str = GOOGLE_ALREADY_LINKED) -> bool:
    """Links the Google account to the user and records its email (google_email). When
    that is the account's email, ignoring case, the account's email counts as proven.
    With new_password_hash (the hash of a password nobody knows) the user's password is
    replaced too, which ends every login token issued before (they carry a stamp of the
    password hash, see vtt/security.py).

    One conditional UPDATE, so a route that checked an older copy of the row cannot
    overwrite what another request wrote since: it writes only while google_sub is
    still expect_sub (None: no link) and, with expect_hash, the password hash is still
    that one. False when the row no longer matched (rolled back, nothing written).
    When another user has the Google account by now (the unique index), the answer is
    409 with taken_detail."""
    values = {User.google_sub: identity.sub, User.google_email: identity.email}
    if same_email(identity.email, user.email):
        values[User.email_proven] = True
    if new_password_hash is not None:
        values[User.hashed_password] = new_password_hash
    conditions = [User.id == user.id,
                  User.google_sub.is_(None) if expect_sub is None else User.google_sub == expect_sub]
    if expect_hash is not None:
        conditions.append(User.hashed_password == expect_hash)
    try:
        changed = db.query(User).filter(*conditions).update(values, synchronize_session=False)
        if changed != 1:
            db.rollback()
            logger.info("Did not link a Google account to user id=%s (%s): the account changed meanwhile",
                        user.id, how)
            return False
        db.commit()
    except IntegrityError:
        # google_sub is the only unique column written, so another request linked this
        # Google account to someone else after the route's check looked.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=taken_detail)
    db.refresh(user)
    logger.info("Linked a Google account to user id=%s (%s%s)", user.id, how,
                ", password replaced" if new_password_hash is not None else "")
    return True


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


def account_for_google_email(db: Session, identity: GoogleIdentity) -> Optional[User]:
    """Step 2 of google_sign_in: the account this Google account's (verified) email
    links to, or None. Among the accounts with that email, ignoring case, except the
    seeded ones: the one with no Google account, if exactly one has none. If every one
    has a Google account: the one whose email was never proven and whose link is
    unproven, if exactly one is. Such a link was made by whoever registered the
    address, perhaps not its owner (AUTH.md), and the owner's Google sign-in replaces it."""
    rows = db.query(User).filter(
        func.lower(User.email) == identity.email.lower(),
        User.username.notin_(SEEDED_USERNAMES),
    ).order_by(User.id).limit(5).all()
    free = [u for u in rows if u.google_sub is None]
    if free:
        return free[0] if len(free) == 1 else None
    unproven = [u for u in rows if not u.email_proven and not proven_link(u)]
    return unproven[0] if len(unproven) == 1 else None


@router.post("/api/auth/google")
@limiter.limit("10/minute")
async def google_sign_in(request: Request, body: GoogleSignInRequest, db: Session = Depends(get_db)):
    """Signs in the user linked to this Google account. Otherwise the account with the
    Google email (ignoring case) is linked on the spot, if account_for_google_email
    finds one: an account with no Google account, or one whose unproven link this
    replaces. Unless the account's email was proven, its password is replaced with one
    nobody knows. Seeded accounts are never linked this way. Otherwise the answer is a
    link token for /api/auth/google/link or /api/auth/google/create."""
    identity = await verified_google_identity(body.credential)

    user = db.query(User).filter(User.google_sub == identity.sub).first()
    if user is not None:
        return signed_in_response(db, user)

    user = account_for_google_email(db, identity)
    if user is not None:
        # Register never checked that the email belongs to whoever registered it.
        # Someone who registered this player's email first would know the password of
        # the account the player is about to use (and may have linked a Google account
        # of their own), so the password, every login token issued so far and that
        # link end here. The player signs in with Google. A proven email means the
        # password was set through a reset link sent to it, so it stays.
        new_hash = None if user.email_proven else await run_in_threadpool(unusable_password_hash)
        how = "matching email" if user.google_sub is None else "matching email, replaced an unproven link"
        if link_google_account(db, user, identity, how, expect_sub=user.google_sub, new_password_hash=new_hash):
            if new_hash is not None:
                # The earlier login tokens ended with the password; so do their sockets.
                await manager.close_user(user.id)
            return signed_in_response(db, user)
        # Another request changed the account first. If it linked this Google account
        # (a second click), sign in; otherwise carry on as for no matching account.
        user = db.query(User).filter(User.google_sub == identity.sub).first()
        if user is not None:
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
    if not await run_in_threadpool(check_password, body.password, user):
        logger.warning("Failed Google link attempt for username=%r", body.username)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LINK_WRONG_PASSWORD)
    if user.google_sub is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_ALREADY_LINKED)

    # Only while the account still has no link and still has the password just checked:
    # a sign-in by email that replaced both meanwhile wins.
    if not link_google_account(db, user, identity, "username and password", expect_hash=user.hashed_password):
        if user.google_sub is not None:  # read again after the rollback
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_ALREADY_LINKED)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LINK_WRONG_PASSWORD)
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
        hashed_password=await run_in_threadpool(unusable_password_hash),
        google_sub=identity.sub,
        google_email=identity.email,
        email_proven=True,  # Google verified it
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


# --- the signed-in user's own account ------------------------------------------------

def account_view(user: User) -> dict:
    """The signed-in user's account, as GET /api/auth/me and POST /api/auth/me/google answer."""
    return {"userId": user.id, "name": user.username, "email": user.email,
            "googleLinked": user.google_sub is not None}


@router.get("/api/auth/me")
async def current_account(user: User = Depends(get_current_user)):
    """The caller's account, including whether a Google account is linked to it."""
    return account_view(user)


def refuse_google_linked_elsewhere(db: Session, identity: GoogleIdentity) -> None:
    if db.query(User.id).filter(User.google_sub == identity.sub).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=GOOGLE_LINKED_ELSEWHERE)


@router.post("/api/auth/me/google")
@limiter.limit("10/minute")
async def link_google_to_account(request: Request, body: AccountGoogleLinkRequest, db: Session = Depends(get_db),
                                 user: User = Depends(get_current_user)):
    """Links the Google account of a Google ID token (the credential, as for
    /api/auth/google) to the signed-in user, who has none yet.

    A login token alone is not enough: whoever stole one could link their own Google
    account and keep signing in after the owner changed the password. The request
    must also prove the account again, with its current password, or with a Google
    account whose email is the account's email (ignoring case), which is how an
    account whose password nobody knows proves itself. The password stays as it is
    and so do the login tokens. From then on Sign in with Google signs in to this
    account."""
    try:
        identity = await verified_google_identity(body.credential)
    except HTTPException as exc:
        # Elsewhere a refused credential is 401, but this caller is signed in, and the
        # browser ends the session on any 401 (apiFetch in utils/api.js).
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail)
        raise
    if user.google_sub == identity.sub:
        return account_view(user)  # linked already, for example by a second click
    if user.google_sub is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_ALREADY_LINKED)
    checked_hash = None
    if body.password:
        if not await run_in_threadpool(check_password, body.password, user):
            logger.warning("Wrong password to link a Google account for user id=%s", user.id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=RELINK_WRONG_PASSWORD)
        checked_hash = user.hashed_password
    elif not same_email(identity.email, user.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=RELINK_NEEDS_PASSWORD)
    refuse_google_linked_elsewhere(db, identity)
    if not link_google_account(db, user, identity, "signed in", expect_hash=checked_hash,
                               taken_detail=GOOGLE_LINKED_ELSEWHERE):
        # Another request changed the account after the checks above (user is read
        # again after the rollback). Answer as the checks now would.
        if user.google_sub == identity.sub:
            return account_view(user)
        if user.google_sub is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_ALREADY_LINKED)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=RELINK_WRONG_PASSWORD)
    return account_view(user)


# --- password reset by email (vtt/password_reset.py) -----------------------------------

@router.post("/api/auth/password-reset", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute;20/hour")
async def request_password_reset(request: Request, body: PasswordResetRequest, background_tasks: BackgroundTasks,
                                 db: Session = Depends(get_db)):
    """Emails a link to set a new password to every account with this email address
    (ignoring case), except seeded accounts and accounts whose email cannot receive
    mail. The answer is the same whether or not an account has the address, and the
    emails go out after it. Limited per IP and per address; the emails themselves
    are capped overall and, for an address nobody has proven, per day (over a cap
    nothing is sent and the answer is the same)."""
    require_password_login()
    if not password_reset.address_allowed(body.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RESET_ADDRESS_LIMITED)
    password_reset.forget_expired(db)
    users = [u for u in password_reset.accounts_for(db, body.email) if password_reset.mail_allowed(u)]
    emails = password_reset.issue_links(db, users)
    db.commit()
    for message in emails:
        background_tasks.add_task(password_reset.send_reset_email, message)
    return {"ok": True}


@router.post("/api/auth/password-reset/confirm")
@limiter.limit("10/minute")
async def confirm_password_reset(request: Request, body: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Sets a new password with the token from a reset link, once. The new password ends
    every login token issued before. An unproven Google link (one made with another
    Google email, or from before the Google email was recorded) is removed, because
    whoever reads the address owns the account. The answer is what login answers, with
    a new token, plus googleUnlinked: whether a Google link was removed."""
    require_password_login()
    found = password_reset.find_token(db, body.token)
    if found is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_LINK_INVALID)
    row, user = found
    new_hash = await run_in_threadpool(pwd_context.hash, body.password)
    outcome = password_reset.use_token(db, row, user, new_hash)
    if outcome is None:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=RESET_LINK_INVALID)
    db.commit()
    logger.info("Set a new password with a reset link for user id=%s%s", user.id,
                ", removed its unproven Google link" if outcome.google_unlinked else "")
    # Every earlier login token ended with the old password, as the email promises; the
    # sockets opened with them end now too (4401), not when they next reconnect.
    await manager.close_user(user.id)
    return {**signed_in_response(db, user), "googleUnlinked": outcome.google_unlinked}
