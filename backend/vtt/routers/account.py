"""The signed-in user's account page: change the username (POST /api/auth/me/username),
the password (POST /api/auth/me/password) and the email address (POST /api/auth/me/email,
then its link, POST /api/auth/me/email/confirm; /resend and /cancel act on the change
that waits for its link), and remove the Google sign-in (POST /api/auth/me/google/remove).
GET /api/auth/me reads the account and POST /api/auth/me/google adds a Google sign-in
(both in vtt/routers/auth.py).

Every change needs a login token and proves the account again: with its current
password, or with a Google credential of the Google account linked to it that Google
issued at most GOOGLE_PROOF_MAX_AGE_SECONDS before (a Google sign-in made for this
request). Removing Google takes the password only. A login token alone is never enough:
tokens last 30 days and cannot be revoked one at a time. Each change counts against a
limit per user (count_account_change) besides the per-IP limit of its route. The log
names the user id and what changed, never a password, a token, a credential or an
address. docs/refactor/AUTH.md (The account page) has the rules.
"""
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from models import User
from vtt import config, email_change, password_reset
from vtt.auth import get_current_user
from vtt.config import logger
from vtt.db import get_db
from vtt.routers.auth import (RELINK_WRONG_PASSWORD, REGISTER_REFUSALS_LIMITED, SEEDED_USERNAMES, USERNAME_TAKEN,
                              account_view, check_password, count_account_change, count_register_refusal,
                              proven_link, register_refusals_left, signed_in_google_identity)
from vtt.schemas import AccountProof, EmailChange, EmailChangeConfirm, GoogleRemoval, PasswordChange, UsernameChange
from vtt.security import create_access_token, limiter, pwd_context
from vtt.ws.manager import manager

router = APIRouter()

# A Google sign-in counts as proof for this long after Google issued its ID token.
GOOGLE_PROOF_MAX_AGE_SECONDS = 5 * 60

PROOF_NEEDED = "Enter your current password, or confirm with Google."
PASSWORD_NEEDED = "Enter your current password."
WRONG_PASSWORD = RELINK_WRONG_PASSWORD  # "That is not this account's password."
GOOGLE_NOT_THIS_ACCOUNT = "That Google account is not the one linked to this account."
GOOGLE_PROOF_OLD = "That Google sign-in is too old. Please confirm with Google again."
ACCOUNT_CHANGED = "The account changed while this was being saved. Please try again."
USERNAME_FIXED = "This account's username cannot be changed."
EMAIL_SAME = "That is already your email address."
EMAIL_NO_MAIL = "That email address cannot receive mail."
EMAIL_UNAVAILABLE = "That email address cannot be used."
EMAIL_CHANGE_OFF = "Email changes are not available on this server."
NO_PENDING_EMAIL = "No email change is waiting."
EMAIL_LINK_INVALID = "This link has expired or has already been used."
EMAIL_LINK_OTHER_ACCOUNT = "This link is for another account."
GOOGLE_REMOVE_NO_PASSWORD = "Set a password before you remove Google sign-in."
GOOGLE_REMOVE_PASSWORD_LOGIN_OFF = "Password sign-in is turned off, so Google sign-in cannot be removed."

# The seed scripts' usernames. None of these accounts may take another name: their
# protections (never linked by email, no reset emails) go by the name. Nobody else may
# take one of these names either.
_SEEDED_NAMES = {name.lower() for name in SEEDED_USERNAMES}


@dataclass
class Proof:
    """How a request proved the account, and what it checked: the password hash at the
    time and, for a Google proof, the linked Google account. A change is written only
    while both are still the same (write_if_unchanged)."""
    how: str                      # "password" or "Google"
    password_hash: str
    google_sub: Optional[str] = None


async def proven(user: User, body: AccountProof, action: str) -> Proof:
    """The account's current password (when one is sent it must be right), else a Google
    credential of the linked Google account, a few minutes old at most."""
    if body.password:
        if not await run_in_threadpool(check_password, body.password, user):
            logger.warning("Wrong password on the account page for user id=%s (%s)", user.id, action)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=WRONG_PASSWORD)
        return Proof("password", user.hashed_password)
    if body.credential:
        identity = await signed_in_google_identity(body.credential)
        if user.google_sub is None or identity.sub != user.google_sub:
            logger.warning("Another Google account was offered as proof on the account page for user id=%s (%s)",
                           user.id, action)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=GOOGLE_NOT_THIS_ACCOUNT)
        if identity.issued_at is None or time.time() - identity.issued_at > GOOGLE_PROOF_MAX_AGE_SECONDS:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=GOOGLE_PROOF_OLD)
        return Proof("Google", user.hashed_password, identity.sub)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PROOF_NEEDED)


def write_if_unchanged(db: Session, user: User, proof: Proof, values: dict) -> bool:
    """One conditional UPDATE of the user: only while the password hash (and for a
    Google proof the Google link) is still what the proof checked, so a request that
    another request overtook writes nothing. A password that just worked also shows
    that somebody knows it (has_password). False, rolled back, when nothing matched.
    The caller commits."""
    if proof.how == "password":
        values = {User.has_password: True, **values}
    conditions = [User.id == user.id, User.hashed_password == proof.password_hash]
    if proof.google_sub is not None:
        conditions.append(User.google_sub == proof.google_sub)
    if db.query(User).filter(*conditions).update(values, synchronize_session=False) != 1:
        db.rollback()
        logger.info("Did not change the account of user id=%s: it changed meanwhile", user.id)
        return False
    return True


def account_changed():
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ACCOUNT_CHANGED)


# --- username ------------------------------------------------------------------------------

def name_taken_by_another(db: Session, user: User, username: str) -> bool:
    """True when another user has this name, ignoring case (as register compares), or
    it is one of the seed scripts' names."""
    if username.lower() in _SEEDED_NAMES:
        return True
    return db.query(User.id).filter(func.lower(User.username) == func.lower(username),
                                    User.id != user.id).first() is not None


@router.post("/api/auth/me/username")
@limiter.limit("10/minute")
async def change_username(request: Request, body: UsernameChange, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    """A new username under the register rule, free ignoring case. A change of case of
    the user's own name is allowed. Answers the account."""
    count_account_change(user)
    if user.username in SEEDED_USERNAMES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=USERNAME_FIXED)
    proof = await proven(user, body, "username")
    if body.username == user.username:
        return account_view(db, user)
    if name_taken_by_another(db, user, body.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_TAKEN)
    try:
        if not write_if_unchanged(db, user, proof, {User.username: body.username}):
            raise account_changed()
        db.commit()
    except IntegrityError:
        # Another request took the name after the check (the unique index on username)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_TAKEN)
    db.refresh(user)
    logger.info("Changed the username of user id=%s (%s proof)", user.id, proof.how)
    return account_view(db, user)


# --- password ------------------------------------------------------------------------------

@router.post("/api/auth/me/password")
@limiter.limit("10/minute")
async def change_password(request: Request, body: PasswordChange, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    """Sets a new password (the register rule). "Change password" proves the account with
    the current one; "Set a password", for an account whose password nobody knows, with
    a fresh Google sign-in. The new password ends every other session: every login
    token issued before stops working and the user's open sockets close (4401). The
    answer is the account plus a new login token for this browser. A change of address
    waiting for its link ends too."""
    count_account_change(user)
    proof = await proven(user, body, "password")
    new_hash = await run_in_threadpool(pwd_context.hash, body.new_password)
    if not write_if_unchanged(db, user, proof, {User.hashed_password: new_hash, User.has_password: True}):
        raise account_changed()
    email_change.cancel(db, user)
    db.commit()
    db.refresh(user)
    logger.info("Set a new password for user id=%s on the account page (%s proof)", user.id, proof.how)
    # Every earlier login token ended with the old password; so do the sockets opened with them.
    await manager.close_user(user.id)
    return {**account_view(db, user), "token": create_access_token(user.id, user.hashed_password)}


# --- email address -------------------------------------------------------------------------

def require_email_links():
    """The link points at RESET_URL_BASE, the site's own address (vtt/config.py)."""
    if not config.RESET_URL_BASE:
        logger.error("No email change link was issued: RESET_URL_BASE is not set")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=EMAIL_CHANGE_OFF)


@router.post("/api/auth/me/email", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def request_email_change(request: Request, body: EmailChange, background_tasks: BackgroundTasks,
                               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Mails a link to the new address and a notice to the old one. Nothing changes until
    the link is used (confirm_email_change). Answers the account, with pendingEmail."""
    count_account_change(user)
    require_email_links()
    proof = await proven(user, body, "email")
    new_email = body.email
    if not password_reset.usable_email(new_email):
        raise HTTPException(status_code=422, detail=EMAIL_NO_MAIL)
    if email_change.normalize_address(new_email) == email_change.normalize_address(user.email or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_SAME)
    # Whether an address has an account is what register's refusals count (AUTH.md,
    # Register answers); a taken address here counts the same way.
    if not register_refusals_left(request):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=REGISTER_REFUSALS_LIMITED)
    if email_change.address_taken(db, user, new_email):
        count_register_refusal(request)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_UNAVAILABLE)
    notice_to = email_change.notice_goes_to(user)
    refusal = email_change.mail_refusal(user, 2 if notice_to else 1)
    if refusal:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=refusal)
    email_change.forget_expired(db)
    # The row carries the stamp of the password the proof checked, so a password changed
    # meanwhile leaves a link that never works.
    token = email_change.issue(db, user, new_email)
    db.commit()
    logger.info("Sent an email change link for user id=%s (%s proof)", user.id, proof.how)
    background_tasks.add_task(email_change.send, email_change.link_email(
        new_email, user.username, email_change.confirm_link(token)))
    if notice_to:
        background_tasks.add_task(email_change.send, email_change.notice_email(notice_to, user.username, new_email))
    return account_view(db, user)


@router.post("/api/auth/me/email/resend", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def resend_email_change(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    """A new link for the change that waits, to the same new address. The older link
    stops working and the change still expires when it would have, so this needs no
    proof. Limited with the requests (EMAIL_CHANGE_MAIL_LIMIT)."""
    require_email_links()
    row = email_change.pending(db, user)
    if row is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=NO_PENDING_EMAIL)
    refusal = email_change.mail_refusal(user, 1)
    if refusal:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=refusal)
    new_email = row.new_email
    token = email_change.reissue(db, row)
    db.commit()
    logger.info("Sent the email change link again for user id=%s", user.id)
    background_tasks.add_task(email_change.send, email_change.link_email(
        new_email, user.username, email_change.confirm_link(token)))
    return account_view(db, user)


@router.post("/api/auth/me/email/cancel")
@limiter.limit("10/minute")
async def cancel_email_change(request: Request, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    """Drops the change that waits, if any; its link stops working. No proof: it changes
    nothing on the account, and the owner can always undo a change someone else asked for."""
    if email_change.cancel(db, user):
        logger.info("Cancelled the email change of user id=%s", user.id)
    db.commit()
    return account_view(db, user)


@router.post("/api/auth/me/email/confirm")
@limiter.limit("10/minute")
async def confirm_email_change(request: Request, body: EmailChangeConfirm, db: Session = Depends(get_db),
                               user: User = Depends(get_current_user)):
    """Uses the link from the email, once, signed in as the user who asked for it. The
    address changes and counts as proven; the user's password reset links end. A
    Google link is proven or not by the new address. Answers the account."""
    count_account_change(user)
    row = email_change.find(db, body.token)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_LINK_INVALID)
    if row.user_id != user.id:
        logger.warning("User id=%s opened the email change link of another account", user.id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=EMAIL_LINK_OTHER_ACCOUNT)
    if not email_change.still_valid(row, user):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_LINK_INVALID)
    if email_change.address_taken(db, user, row.new_email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_UNAVAILABLE)
    try:
        if not email_change.use(db, row, user):
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_LINK_INVALID)
        db.commit()
    except IntegrityError:
        # Another account took the address after the check (the unique index on email)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_UNAVAILABLE)
    db.refresh(user)
    link = "none" if user.google_sub is None else ("proven" if proven_link(user) else "unproven")
    logger.info("Changed the email address of user id=%s with its link (Google link: %s)", user.id, link)
    return account_view(db, user)


# --- Google sign-in ------------------------------------------------------------------------

@router.post("/api/auth/me/google/remove")
@limiter.limit("10/minute")
async def remove_google_sign_in(request: Request, body: GoogleRemoval, db: Session = Depends(get_db),
                                user: User = Depends(get_current_user)):
    """Unlinks the Google account. Takes the current password, so the account can still
    be signed in to afterwards; refused for an account whose password nobody knows, and
    while password sign-in is off, either of which would lock the account. Sessions stay.
    Answers the account."""
    count_account_change(user)
    if user.google_sub is None:
        return account_view(db, user)  # nothing linked, for example after a second click
    if not config.ALLOW_PASSWORD_LOGIN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=GOOGLE_REMOVE_PASSWORD_LOGIN_OFF)
    if user.has_password is False:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=GOOGLE_REMOVE_NO_PASSWORD)
    if not body.password:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PASSWORD_NEEDED)
    if not await run_in_threadpool(check_password, body.password, user):
        logger.warning("Wrong password on the account page for user id=%s (remove Google)", user.id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=WRONG_PASSWORD)
    proof = Proof("password", user.hashed_password, user.google_sub)
    if not write_if_unchanged(db, user, proof, {User.google_sub: None, User.google_email: None}):
        raise account_changed()
    db.commit()
    db.refresh(user)
    logger.info("Removed the Google sign-in of user id=%s", user.id)
    return account_view(db, user)
