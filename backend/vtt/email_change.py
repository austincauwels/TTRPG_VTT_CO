"""Changing a signed-in user's email address, by a link mailed to the new address.

POST /api/auth/me/email (vtt/routers/account.py) takes the new address and a proof of
the account (its current password, or a fresh Google sign-in of the Google account
linked to it). The new address gets an email with a link to
RESET_URL_BASE/confirm-email?token=<token>, and the old address a notice. The address
changes only when the link is used: POST /api/auth/me/email/confirm with the token, by
the same user, signed in. Then the new address counts as proven (users.email_proven),
and a Google link is proven or not by the new address (vtt/routers/auth.py proven_link).

A token is 32 random bytes (secrets.token_urlsafe). Only its SHA-256 is stored, in
email_change_tokens, with the user, the new address, the address the account had when
the change was asked for, the user's password stamp at the time (see vtt/security.py)
and an expiry EMAIL_CHANGE_EXPIRE_MINUTES later. One change waits per user: asking again
replaces it, and cancel deletes it. A link works once; using it deletes every row of the
user, and the user's password reset links too (they went to the old address). Any change
of the password ends a waiting change (the stamp), and so does a change of the address
by any other way (old_email). Expired rows are deleted whenever a change is asked for.

The emails go through vtt/mail.py like the reset emails, and count against the same
overall caps (password_reset.MAIL_LIMITS), plus EMAIL_CHANGE_MAIL_LIMIT per user.
"""
import hashlib
import hmac
import html
import secrets
import time
from dataclasses import dataclass
from typing import Optional

from limits import parse as parse_limit
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import EmailChangeToken, PasswordResetToken, User
from vtt import config, mail, password_reset
from vtt.config import logger
from vtt.password_reset import CREAM, INK, NIGHT, OXBLOOD, PARCHMENT, SEPIA, SERIF
from vtt.security import limiter, password_stamp

EMAIL_CHANGE_EXPIRE_MINUTES = 60  # a link works once, within this time

LINK_SUBJECT = "Confirm your new Candela Obscura email address"
NOTICE_SUBJECT = "Your Candela Obscura email address is being changed"

# Emails about changing the address, per user: a request and each resend count one.
EMAIL_CHANGE_MAIL_LIMIT = parse_limit("3/hour")
EMAIL_CHANGE_MAIL_SCOPE = "email-change-mail"

# The seed scripts' accounts (vtt/db.py): their addresses are seed data, so they get no notice.
SEEDED_USERNAMES = password_reset.SEEDED_USERNAMES

MAIL_LIMITED = "Too many confirmation emails. Please try again in an hour."
MAIL_PAUSED = "Too many emails were sent from this site. Please try again later."


def now() -> int:
    return int(time.time())


def normalize_address(address: str) -> str:
    return address.strip().lower()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def confirm_link(token: str) -> str:
    return f"{config.RESET_URL_BASE}/confirm-email?token={token}"


def forget_expired(db: Session) -> None:
    db.query(EmailChangeToken).filter(EmailChangeToken.expires_at <= now()).delete(
        synchronize_session=False)


def still_valid(row: EmailChangeToken, user: User) -> bool:
    """True while the row can still be used for this user: not expired, the password
    is the one it was asked for with, and the account still has the address it had."""
    return (row.user_id == user.id and row.expires_at > now()
            and hmac.compare_digest(row.password_stamp, password_stamp(user.hashed_password))
            and (row.old_email or "") == (user.email or ""))


def pending(db: Session, user: User) -> Optional[EmailChangeToken]:
    """The user's change of address that is waiting for its link, or None."""
    row = db.query(EmailChangeToken).filter(EmailChangeToken.user_id == user.id).order_by(
        EmailChangeToken.id.desc()).first()
    return row if row is not None and still_valid(row, user) else None


def pending_address(db: Session, user: User) -> Optional[str]:
    row = pending(db, user)
    return row.new_email if row is not None else None


def address_taken(db: Session, user: User, address: str) -> bool:
    """True when another account has this address, ignoring case."""
    return db.query(User.id).filter(func.lower(User.email) == normalize_address(address),
                                    User.id != user.id).first() is not None


def issue(db: Session, user: User, new_email: str) -> str:
    """A new link for changing the user's address to new_email, replacing any waiting
    one. Returns the token; the caller commits, then sends the emails."""
    token = secrets.token_urlsafe(32)
    issued_at = now()
    db.query(EmailChangeToken).filter(EmailChangeToken.user_id == user.id).delete(
        synchronize_session=False)
    db.add(EmailChangeToken(
        user_id=user.id,
        token_hash=token_hash(token),
        new_email=new_email,
        old_email=user.email,
        password_stamp=password_stamp(user.hashed_password),
        created_at=issued_at,
        expires_at=issued_at + EMAIL_CHANGE_EXPIRE_MINUTES * 60,
    ))
    return token


def reissue(db: Session, row: EmailChangeToken) -> str:
    """A new link for the same waiting change: the older link stops working, and the
    change still expires when it would have. The caller commits."""
    token = secrets.token_urlsafe(32)
    db.query(EmailChangeToken).filter(EmailChangeToken.id == row.id).update(
        {EmailChangeToken.token_hash: token_hash(token)}, synchronize_session=False)
    return token


def cancel(db: Session, user: User) -> int:
    """Deletes the user's waiting change, if any. The caller commits."""
    return db.query(EmailChangeToken).filter(EmailChangeToken.user_id == user.id).delete(
        synchronize_session=False)


def find(db: Session, token: Optional[str]) -> Optional[EmailChangeToken]:
    """The row of a token that exists and has not expired, or None."""
    if not token or not isinstance(token, str):
        return None
    row = db.query(EmailChangeToken).filter(EmailChangeToken.token_hash == token_hash(token)).first()
    if row is None or row.expires_at <= now():
        return None
    return row


def use(db: Session, row: EmailChangeToken, user: User) -> bool:
    """Deletes the row, sets the new address (proven) and deletes the user's other
    email change rows and password reset links. Each step is conditional, so of two
    requests with the same link only one gets through, and a password or address that
    changed since the checks is not overwritten. False when that happens; the caller
    then rolls back. The caller commits, and handles the unique index on the address."""
    claimed = db.query(EmailChangeToken).filter(EmailChangeToken.id == row.id).delete(
        synchronize_session=False)
    if claimed != 1:
        return False
    changed = db.query(User).filter(
        User.id == user.id,
        User.hashed_password == user.hashed_password,
        User.email == row.old_email,
    ).update({User.email: row.new_email, User.email_proven: True}, synchronize_session=False)
    if changed != 1:
        return False
    db.query(EmailChangeToken).filter(EmailChangeToken.user_id == user.id).delete(
        synchronize_session=False)
    # A reset link went to the old address; whoever reads it no longer owns the account.
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(
        synchronize_session=False)
    return True


def mail_refusal(user: User, emails: int) -> Optional[str]:
    """Counts one request against EMAIL_CHANGE_MAIL_LIMIT for the user and `emails`
    emails against the overall caps the reset emails use, and answers None. When one of
    them is used up it counts nothing and answers the detail for the 429. Off while the
    rate limiter is off, like the other counts."""
    if not limiter.enabled:
        return None
    store = limiter.limiter
    if not store.test(EMAIL_CHANGE_MAIL_LIMIT, EMAIL_CHANGE_MAIL_SCOPE, str(user.id)):
        logger.warning("No email change link was sent for user id=%s: %s", user.id, EMAIL_CHANGE_MAIL_LIMIT)
        return MAIL_LIMITED
    for limit in password_reset.MAIL_LIMITS:
        if not store.test(limit, password_reset.MAIL_LIMIT_SCOPE, "all"):
            logger.error("The overall cap on emails (%s) is reached, so no email change link was sent "
                         "for user id=%s", limit, user.id)
            return MAIL_PAUSED
    store.hit(EMAIL_CHANGE_MAIL_LIMIT, EMAIL_CHANGE_MAIL_SCOPE, str(user.id))
    for limit in password_reset.MAIL_LIMITS:
        for _ in range(emails):
            store.hit(limit, password_reset.MAIL_LIMIT_SCOPE, "all")
    return None


def notice_goes_to(user: User) -> Optional[str]:
    """The old address the notice goes to, or None for an address that cannot receive
    mail (password_reset.usable_email) or a seeded account."""
    if user.username in SEEDED_USERNAMES or not password_reset.usable_email(user.email):
        return None
    return user.email


def masked(address: str) -> str:
    """The new address as the notice to the old one shows it: "n***@candela-players.org"."""
    local, _, domain = address.rpartition("@")
    return f"{local[:1]}***@{domain}" if local else address


# --- the emails --------------------------------------------------------------------------

@dataclass
class Email:
    to: str
    subject: str
    text: str
    html: str


def _letter(title: str, paragraphs, button=None) -> str:
    """The emails' HTML, the reset email's paper: a parchment sheet on the night stage,
    ink text, sepia small print, an oxblood button. paragraphs are (html, small)."""
    small = f"margin:0 0 14px;font-size:14px;line-height:1.5;color:{SEPIA};"
    body = "margin:0 0 20px;font-size:17px;line-height:1.5;"
    parts = []
    for i, (content, is_small) in enumerate(paragraphs):
        parts.append(f'<p style="{small if is_small else body}">{content}</p>')
        if i == 0 and button is not None:
            label, href = button
            parts.append(f'<p style="margin:0 0 24px;"><a href="{href}" style="display:inline-block;padding:12px 24px;'
                         f'background:{OXBLOOD};color:{CREAM};font-family:{SERIF};font-size:16px;'
                         f'text-decoration:none;">{label}</a></p>')
    inner = "\n".join(parts)
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background:{NIGHT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{NIGHT};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:{PARCHMENT};border:1px solid {SEPIA};">
<tr><td style="padding:24px 32px 14px;border-bottom:1px solid {SEPIA};font-family:{SERIF};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:{OXBLOOD};">Candela Obscura</td></tr>
<tr><td style="padding:24px 32px 12px;font-family:{SERIF};color:{INK};">
{inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def link_email(to: str, username: str, link: str) -> Email:
    text = (
        f"Someone asked to use this address for the Candela Obscura account \"{username}\".\n"
        "\n"
        "Open this link to confirm it:\n"
        f"{link}\n"
        "\n"
        "Open it in a browser where you are signed in to that account. The link works once "
        "and expires in one hour.\n"
        "\n"
        "If you did not ask for this, you can ignore this email. The account keeps its address.\n"
    )
    name, href = html.escape(username), html.escape(link, quote=True)
    page = _letter(LINK_SUBJECT, [
        (f"Someone asked to use this address for the account <strong>{name}</strong>.", False),
        ("Open the link in a browser where you are signed in to that account. It works once "
         "and expires in one hour.", True),
        (f'If the button does not work, copy this address into your browser:<br><a href="{href}" '
         f'style="color:{OXBLOOD};word-break:break-all;">{href}</a>', True),
        ("If you did not ask for this, you can ignore this email. The account keeps its address.", True),
    ], button=("Confirm this address", href))
    return Email(to=to, subject=LINK_SUBJECT, text=text, html=page)


def notice_email(to: str, username: str, new_address: str) -> Email:
    shown = masked(new_address)
    text = (
        f"Someone asked to change the email address of the Candela Obscura account \"{username}\" "
        f"to {shown}.\n"
        "\n"
        "The address changes only if the link sent to the new address is opened within one hour.\n"
        "\n"
        "If you did not ask for this, sign in and change your password. That also cancels the change.\n"
    )
    page = _letter(NOTICE_SUBJECT, [
        (f"Someone asked to change the email address of the account <strong>{html.escape(username)}</strong> "
         f"to <strong>{html.escape(shown)}</strong>.", False),
        ("The address changes only if the link sent to the new address is opened within one hour.", True),
        ("If you did not ask for this, sign in and change your password. That also cancels the change.", True),
    ])
    return Email(to=to, subject=NOTICE_SUBJECT, text=text, html=page)


def send(message: Email) -> None:
    """Runs after the answer has gone out (a background task). A failed send is logged
    by vtt/mail.py and changes nothing."""
    mail.send_email(message.to, message.subject, message.text, message.html)
