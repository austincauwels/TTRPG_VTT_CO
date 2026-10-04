"""The signed-in user's account page: change the username (POST /api/auth/me/username),
the password (POST /api/auth/me/password) and the email address (POST /api/auth/me/email;
then its link: POST /api/auth/me/email/check reads what the link would change, so the
page can show it, and POST /api/auth/me/email/confirm makes the change; /resend and
/cancel act on the change that waits for its link), and remove the Google sign-in
(POST /api/auth/me/google/remove). GET /api/auth/me reads the account and
POST /api/auth/me/google adds a Google sign-in (both in vtt/routers/auth.py).
POST /api/auth/email-change/undo, the link mailed to the old address once a change of
address went through, works without a login.

Every change needs a login token and proves the account again: with its current
password, or with a Google credential of the Google account linked to it that Google
issued at most GOOGLE_PROOF_MAX_AGE_SECONDS before (a Google sign-in made for this
request). Removing Google takes the password only; cancelling a change of address also
takes the change's own link. A login token alone is never enough:
tokens last 30 days and cannot be revoked one at a time. A failed proof counts against a
limit per user (refused_proof) besides the per-IP limit of its route; a right proof
always goes through. The log names the user id and what changed, never a password, a
token, a credential or an address. docs/refactor/AUTH.md (The account page) has the rules.
"""
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from models import EmailChangeToken, User
from vtt import config, email_change, password_reset, usernames
from vtt.auth import get_current_user
from vtt.config import logger
from vtt.db import get_db, unusable_password_hash
from vtt.routers.auth import (RELINK_WRONG_PASSWORD, REGISTER_REFUSALS_LIMITED, SEEDED_USERNAMES, USERNAME_TAKEN,
                              account_view, check_password, count_register_refusal, proof_google_identity,
                              proven_link, refused_proof, register_refusals_left)
from vtt.schemas import (AccountProof, EmailChange, EmailChangeCancel, EmailChangeConfirm, EmailChangeUndo,
                         GoogleRemoval, PasswordChange, UsernameChange)
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
UNDO_LINK_INVALID = EMAIL_LINK_INVALID
UNDO_ADDRESS_TAKEN = "Another account has that address now, so the change cannot be undone."

# The seed scripts' usernames. None of these accounts may take another name: their
# protections (never linked by email, no reset emails) go by the name. Nobody else may
# take one of these names either.
_SEEDED_NAMES = {usernames.username_key(name) for name in SEEDED_USERNAMES}


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
    credential of the linked Google account, a few minutes old at most. A proof that
    fails counts against the user's limit (refused_proof); a request with no proof at
    all does not."""
    if body.password:
        if not await run_in_threadpool(check_password, body.password, user):
            logger.warning("Wrong password on the account page for user id=%s (%s)", user.id, action)
            raise refused_proof(user, status.HTTP_403_FORBIDDEN, WRONG_PASSWORD)
        return Proof("password", user.hashed_password)
    if body.credential:
        identity = await proof_google_identity(user, body.credential)
        if user.google_sub is None or identity.sub != user.google_sub:
            logger.warning("Another Google account was offered as proof on the account page for user id=%s (%s)",
                           user.id, action)
            raise refused_proof(user, status.HTTP_403_FORBIDDEN, GOOGLE_NOT_THIS_ACCOUNT)
        if identity.issued_at is None or time.time() - identity.issued_at > GOOGLE_PROOF_MAX_AGE_SECONDS:
            raise refused_proof(user, status.HTTP_403_FORBIDDEN, GOOGLE_PROOF_OLD)
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


def with_token(db: Session, user: User) -> dict:
    """The account plus a new login token for this browser, for the changes that end
    every other session."""
    return {**account_view(db, user), "token": create_access_token(user.id, user.hashed_password, user.session_epoch)}


# --- username ------------------------------------------------------------------------------

def name_taken_by_another(db: Session, user: User, username: str) -> bool:
    """True when another user has this name or holds it after a rename (compared as
    vtt/usernames.py compares names: case and stray spaces do not count), or it is one
    of the seed scripts' names."""
    if usernames.username_key(username) in _SEEDED_NAMES:
        return True
    return usernames.name_taken(db, username, except_user_id=user.id)


@router.post("/api/auth/me/username")
@limiter.limit("10/minute")
async def change_username(request: Request, body: UsernameChange, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    """A new username under the register rule (the schema strips it), free as
    vtt/usernames.py compares names. A change of case of the user's own name is allowed.
    The old name is held for the user for USERNAME_HOLD_DAYS. A rename that frees a name
    is capped per user (usernames.rename_refusal: a few a day, and a few held names at a
    time). Answers the account."""
    if user.username in SEEDED_USERNAMES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=USERNAME_FIXED)
    proof = await proven(user, body, "username")
    if body.username == user.username:
        return account_view(db, user)
    if name_taken_by_another(db, user, body.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_TAKEN)
    frees_name = usernames.frees_a_name(user.username, body.username)
    if frees_name:
        refusal = usernames.rename_refusal(db, user.id, user.username, body.username)
        if refusal:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=refusal)
    try:
        if not write_if_unchanged(db, user, proof, {User.username: body.username}):
            raise account_changed()
        # user.username is still the old name here (synchronize_session=False)
        usernames.hold_freed_name(db, user.id, user.username, body.username)
        db.commit()
    except IntegrityError:
        # Another request took the name after the check (the unique index on username)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USERNAME_TAKEN)
    if frees_name:
        usernames.count_rename(user.id)
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
    return with_token(db, user)


# --- email address -------------------------------------------------------------------------

def require_email_links():
    """The links point at RESET_URL_BASE, the site's own address (vtt/config.py)."""
    if not config.RESET_URL_BASE:
        logger.error("No email change link was issued: RESET_URL_BASE is not set")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=EMAIL_CHANGE_OFF)


@router.post("/api/auth/me/email", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def request_email_change(request: Request, body: EmailChange, background_tasks: BackgroundTasks,
                               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Mails a link to the new address and a notice to the old one. Nothing changes until
    the link is used (confirm_email_change). Answers the account, with pendingEmail."""
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
    # The link; for an old address that gets notices, this notice and the one with the
    # undo link once the change goes through, counted now so that one always goes out.
    refusal = email_change.mail_refusal(user, new_email, 3 if notice_to else 1)
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
async def resend_email_change(request: Request, body: AccountProof, background_tasks: BackgroundTasks,
                              db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """A new link for the change that waits, to the same new address. The older link
    stops working and the change still expires when it would have. Needs a proof like
    the other changes: each resend uses up the owner's confirmation emails and ends the
    link the owner may already have. Limited with the requests (mail_refusal)."""
    require_email_links()
    proof = await proven(user, body, "resend")
    row = email_change.pending(db, user)
    if row is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=NO_PENDING_EMAIL)
    new_email = row.new_email
    refusal = email_change.mail_refusal(user, new_email, 1)
    if refusal:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=refusal)
    token = email_change.reissue(db, row)
    db.commit()
    logger.info("Sent the email change link again for user id=%s (%s proof)", user.id, proof.how)
    background_tasks.add_task(email_change.send, email_change.link_email(
        new_email, user.username, email_change.confirm_link(token)))
    return account_view(db, user)


@router.post("/api/auth/me/email/cancel")
@limiter.limit("10/minute")
async def cancel_email_change(request: Request, body: EmailChangeCancel, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    """Drops the change that waits, if any; its link stops working. Needs a proof like the
    other changes (a login token alone could drop the owner's change), or instead the
    change's own link (token), which the page at /confirm-email sends: a link that does
    not work is refused as confirm refuses it. A failed proof counts per user; a right
    one always goes through."""
    if body.password or body.credential or not body.token:
        how = (await proven(user, body, "cancel")).how
    else:
        usable_link(db, user, body.token)
        how = "link"
    if email_change.cancel(db, user):
        logger.info("Cancelled the email change of user id=%s (%s proof)", user.id, how)
    db.commit()
    return account_view(db, user)


def usable_link(db: Session, user: User, token: str) -> EmailChangeToken:
    """The row of an email change link the signed-in user may use now. The link is the
    proof that its reader asked for the change, so one that does not work counts as a
    failed proof (refused_proof): 400 when it is unknown, used or expired, or the password
    or the address changed since; 403 when it is another account's (logged)."""
    row = email_change.find(db, token)
    if row is None:
        raise refused_proof(user, status.HTTP_400_BAD_REQUEST, EMAIL_LINK_INVALID)
    if row.user_id != user.id:
        logger.warning("User id=%s opened the email change link of another account", user.id)
        raise refused_proof(user, status.HTTP_403_FORBIDDEN, EMAIL_LINK_OTHER_ACCOUNT)
    if not email_change.still_valid(row, user):
        raise refused_proof(user, status.HTTP_400_BAD_REQUEST, EMAIL_LINK_INVALID)
    return row


@router.post("/api/auth/me/email/check")
@limiter.limit("10/minute")
async def check_email_change(request: Request, body: EmailChangeConfirm, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    """What the link would change, for the page at /confirm-email to show before the
    owner confirms: the account's name, its address now and the new one. Changes
    nothing, and the link keeps working. Refused as confirm would refuse it."""
    row = usable_link(db, user, body.token)
    return {"name": user.username, "email": user.email, "newEmail": row.new_email}


@router.post("/api/auth/me/email/confirm")
@limiter.limit("10/minute")
async def confirm_email_change(request: Request, body: EmailChangeConfirm, background_tasks: BackgroundTasks,
                               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Uses the link from the email, once, signed in as the user who asked for it (the
    page sends it only when the owner clicks Confirm new email). The address changes and
    counts as proven; the user's password reset links end. A Google link is proven or
    not by the new address. The old address gets a notice with an undo link
    (vtt/email_change.py). Answers the account."""
    row = usable_link(db, user, body.token)
    if email_change.address_taken(db, user, row.new_email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_UNAVAILABLE)
    require_email_links()  # the undo link points at the site too
    new_email = row.new_email
    notice_to = email_change.notice_goes_to(user)
    undo_token = None
    try:
        if not email_change.use(db, row, user):
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_LINK_INVALID)
        if notice_to:
            undo_token = email_change.issue_undo(db, user.id, notice_to, new_email)
        db.commit()
    except IntegrityError:
        # Another account took the address after the check (the unique index on email)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_UNAVAILABLE)
    db.refresh(user)
    link = "none" if user.google_sub is None else ("proven" if proven_link(user) else "unproven")
    logger.info("Changed the email address of user id=%s with its link (Google link: %s)", user.id, link)
    if undo_token:
        background_tasks.add_task(email_change.send, email_change.changed_email(
            notice_to, user.username, new_email, email_change.undo_link(undo_token)))
    return account_view(db, user)


@router.post("/api/auth/email-change/undo")
@limiter.limit("10/minute")
async def undo_email_change(request: Request, body: EmailChangeUndo, background_tasks: BackgroundTasks,
                            db: Session = Depends(get_db)):
    """The undo link mailed to the old address once a change went through. No login:
    whoever made the change may have changed the password since. The old address comes
    back, every session ends (a password nobody knows; the user's sockets close), and the
    old address gets a password reset link while password sign-in is on. The Google link
    stays when it is the one the account had when the change went through or the old
    address is its email, and else is removed, unless no reset link can be sent: then
    it stays, as the account's only way in. The address the undo takes off the account
    gets a notice. Answers the account's id, name and address, whether a reset link was
    sent, and whether a Google link stayed (its email masked, and whether it stayed only
    as the way in)."""
    row = email_change.find_undo(db, body.token)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNDO_LINK_INVALID)
    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNDO_LINK_INVALID)
    if email_change.address_taken(db, user, row.old_email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=UNDO_ADDRESS_TAKEN)
    new_hash = await run_in_threadpool(unusable_password_hash)
    send_reset = bool(config.ALLOW_PASSWORD_LOGIN and config.RESET_URL_BASE)
    # What the undo takes off, for the notice. The row is gone after the commit.
    removed_address = email_change.notice_goes_to(user)
    old_email = row.old_email
    resets = []
    try:
        if not email_change.undo(db, row, new_hash, keep_any_link=not send_reset):
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNDO_LINK_INVALID)
        db.refresh(user)  # the old address, the new password hash and the Google link left
        google_kept = user.google_sub is not None
        only_way_in = google_kept and not email_change.link_kept_by_rule(user.google_sub, user.google_email, row)
        google_email = user.google_email if google_kept else None
        if send_reset:
            resets = password_reset.issue_links(db, [user])
        db.commit()
    except IntegrityError:
        # Another account took the address after the check (the unique index on email)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=UNDO_ADDRESS_TAKEN)
    logger.info("Undid a change of the email address of user id=%s with its undo link: every session ended%s%s",
                user.id, ", a reset link was sent" if resets else "",
                "" if not google_kept else (", its Google link stayed as the only way in" if only_way_in
                                            else ", its Google link stayed"))
    await manager.close_user(user.id)
    for message in resets:
        background_tasks.add_task(password_reset.send_reset_email, message)
    if removed_address and email_change.normalize_address(removed_address) != email_change.normalize_address(old_email):
        background_tasks.add_task(email_change.send, email_change.undone_email(
            removed_address, user.username, old_email, google_email, google_kept))
    return {"userId": user.id, "name": user.username, "email": user.email, "passwordReset": bool(resets),
            "googleKept": google_kept,
            "googleEmail": email_change.masked(google_email) if google_email else None,
            "googleOnlyWayIn": only_way_in}


# --- Google sign-in ------------------------------------------------------------------------

@router.post("/api/auth/me/google/remove")
@limiter.limit("10/minute")
async def remove_google_sign_in(request: Request, body: GoogleRemoval, db: Session = Depends(get_db),
                                user: User = Depends(get_current_user)):
    """Unlinks the Google account. Takes the current password, so the account can still
    be signed in to afterwards; refused for an account whose password nobody knows, and
    while password sign-in is off, either of which would lock the account. Every other
    session ends, those signed in with that Google account among them: the session epoch
    goes up (vtt/security.py session_stamp) and the user's sockets close. A change of
    address that waits for its link ends too. Answers the account plus a new login token
    for this browser."""
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
        raise refused_proof(user, status.HTTP_403_FORBIDDEN, WRONG_PASSWORD)
    proof = Proof("password", user.hashed_password, user.google_sub)
    values = {User.google_sub: None, User.google_email: None,
              User.session_epoch: func.coalesce(User.session_epoch, 0) + 1}
    if not write_if_unchanged(db, user, proof, values):
        raise account_changed()
    email_change.cancel(db, user)
    db.commit()
    db.refresh(user)
    logger.info("Removed the Google sign-in of user id=%s and ended its other sessions", user.id)
    await manager.close_user(user.id)
    return with_token(db, user)
