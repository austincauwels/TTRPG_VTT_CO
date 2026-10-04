"""Changing a signed-in user's email address, by a link mailed to the new address, and
undoing a change by a link mailed to the old one.

POST /api/auth/me/email (vtt/routers/account.py) takes the new address and a proof of
the account (its current password, or a fresh Google sign-in of the Google account
linked to it). The new address gets an email with a link to
RESET_URL_BASE/confirm-email?token=<token>, and the old address a notice. The address
changes only when the link is used: POST /api/auth/me/email/confirm with the token, by
the same user, signed in, after the page showed the new address and the owner clicked.
Then the new address counts as proven (users.email_proven), and a Google link is proven
or not by the new address (vtt/routers/auth.py proven_link).

Once the change went through, the old address gets a second notice with an undo link,
RESET_URL_BASE/undo-email-change?token=<token>, that works once for EMAIL_UNDO_EXPIRE_DAYS
(table email_change_undos), signed in or not, whatever happened to the account since.
Using it (POST /api/auth/email-change/undo) puts the old address back, ends every
session (a password nobody knows), and mails a password reset link to the old address.
The Google link stays when it is the one the account had when the change went through
(recorded in the undo row) or the old address is its email; another one is removed,
unless no reset link can be sent (password sign-in off), when removing it would leave
the account no way in. The address the undo takes off the account gets a notice
(undone_email). Whoever asked for the change needed the password or the linked Google
account; whoever reads the old address gets the account back. While an undo link can
put an address back, no other account may take it (address_held).

A token is 32 random bytes (secrets.token_urlsafe). Only its SHA-256 is stored, in
email_change_tokens, with the user, the new address, the address the account had when
the change was asked for, the user's password stamp at the time (see vtt/security.py)
and an expiry EMAIL_CHANGE_EXPIRE_MINUTES later. One change waits per user: asking again
replaces it, and cancel deletes it. A link works once; using it deletes every row of the
user, and the user's password reset links too (they went to the old address). Any change
of the password ends a waiting change (the stamp), and so does a change of the address
by any other way (old_email). Expired rows are deleted whenever a change is asked for.

The emails go through vtt/mail.py like the reset emails, under caps of their own
(mail_refusal), so that email changes can never use up the reset emails' caps: per user
(EMAIL_CHANGE_MAIL_LIMIT), per new address (EMAIL_CHANGE_ADDRESS_LIMIT) and for the whole
server (EMAIL_CHANGE_MAIL_LIMITS). A request counts its notice of the finished change
too, so that notice always goes out. The two emails an undo sends (the reset link and
the notice to the address it takes off) are not capped: each undo link comes from one
finished change.
"""
import hashlib
import hmac
import html
import secrets
import time
from dataclasses import dataclass
from typing import Optional

from limits import parse as parse_limit
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from models import EmailChangeToken, EmailChangeUndo, PasswordResetToken, User
from vtt import config, mail, password_reset
from vtt.config import logger
from vtt.password_reset import CREAM, INK, NIGHT, OXBLOOD, PARCHMENT, SEPIA, SERIF
from vtt.security import limiter, password_stamp

EMAIL_CHANGE_EXPIRE_MINUTES = 60  # a link works once, within this time
EMAIL_UNDO_EXPIRE_DAYS = 7         # the undo link sent to the old address

LINK_SUBJECT = "Confirm your new Candela Obscura email address"
NOTICE_SUBJECT = "Your Candela Obscura email address is being changed"
CHANGED_SUBJECT = "Your Candela Obscura email address was changed"
UNDONE_SUBJECT = "Your Candela Obscura email address was changed back"

# Emails about changing the address, per user: a request and each resend count one.
EMAIL_CHANGE_MAIL_LIMIT = parse_limit("3/hour")
EMAIL_CHANGE_MAIL_SCOPE = "email-change-mail"
# Confirmation links to one new address, whoever asks for them (lower case, spaces
# stripped): the site mails any address someone types, so each gets only a few a day.
EMAIL_CHANGE_ADDRESS_LIMIT = parse_limit("3/day")
EMAIL_CHANGE_ADDRESS_SCOPE = "email-change-address"
# Every email about changing an address, for the whole server. Kept apart from the reset
# emails' caps (password_reset.MAIL_LIMITS, 20 an hour and 50 a day), so throwaway
# accounts asking for changes cannot stop reset emails; together they stay under the
# Resend quota (100 a day on the free plan).
EMAIL_CHANGE_MAIL_LIMITS = (parse_limit("15/hour"), parse_limit("30/day"))
EMAIL_CHANGE_MAIL_ALL_SCOPE = "email-change-mail-all"

# The seed scripts' accounts (vtt/db.py): their addresses are seed data, so they get no notice.
SEEDED_USERNAMES = password_reset.SEEDED_USERNAMES

MAIL_LIMITED = "Too many confirmation emails. Please try again in an hour."
MAIL_ADDRESS_LIMITED = "Too many confirmation emails went to that address today. Please try again tomorrow."
MAIL_PAUSED = "Too many emails were sent from this site. Please try again later."


def now() -> int:
    return int(time.time())


def normalize_address(address: str) -> str:
    return address.strip().lower()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def confirm_link(token: str) -> str:
    return f"{config.RESET_URL_BASE}/confirm-email?token={token}"


def undo_link(token: str) -> str:
    return f"{config.RESET_URL_BASE}/undo-email-change?token={token}"


def forget_expired(db: Session) -> None:
    """Deletes expired change links and undo links. The caller commits."""
    db.query(EmailChangeToken).filter(EmailChangeToken.expires_at <= now()).delete(
        synchronize_session=False)
    db.query(EmailChangeUndo).filter(EmailChangeUndo.expires_at <= now()).delete(
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


def address_held(db: Session, address: str, except_user_id: Optional[int] = None) -> bool:
    """True while an undo link of another account (not except_user_id) can put this
    address back on it, ignoring case: the address is kept for that account."""
    query = db.query(EmailChangeUndo.id).filter(func.lower(EmailChangeUndo.old_email) == normalize_address(address),
                                                EmailChangeUndo.expires_at > now())
    if except_user_id is not None:
        query = query.filter(EmailChangeUndo.user_id != except_user_id)
    return query.first() is not None


def address_taken(db: Session, user: User, address: str) -> bool:
    """True when another account has this address, ignoring case, or an undo link of
    another account can put it back (address_held)."""
    if db.query(User.id).filter(func.lower(User.email) == normalize_address(address),
                                User.id != user.id).first() is not None:
        return True
    return address_held(db, address, except_user_id=user.id)


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


def mail_refusal(user: User, new_address: str, emails: int) -> Optional[str]:
    """Counts one request against EMAIL_CHANGE_MAIL_LIMIT for the user, one link against
    EMAIL_CHANGE_ADDRESS_LIMIT for the new address, and `emails` emails against the
    overall EMAIL_CHANGE_MAIL_LIMITS, and answers None. When one of them is used up it
    counts nothing and answers the detail for the 429. Off while the rate limiter is
    off, like the other counts."""
    if not limiter.enabled:
        return None
    store = limiter.limiter
    if not store.test(EMAIL_CHANGE_MAIL_LIMIT, EMAIL_CHANGE_MAIL_SCOPE, str(user.id)):
        logger.warning("No email change link was sent for user id=%s: %s", user.id, EMAIL_CHANGE_MAIL_LIMIT)
        return MAIL_LIMITED
    address_key = normalize_address(new_address)
    if not store.test(EMAIL_CHANGE_ADDRESS_LIMIT, EMAIL_CHANGE_ADDRESS_SCOPE, address_key):
        logger.warning("No email change link was sent for user id=%s: the new address has had %s",
                       user.id, EMAIL_CHANGE_ADDRESS_LIMIT)
        return MAIL_ADDRESS_LIMITED
    for limit in EMAIL_CHANGE_MAIL_LIMITS:
        if store.get_window_stats(limit, EMAIL_CHANGE_MAIL_ALL_SCOPE, "all")[1] < emails:
            logger.error("The overall cap on email change emails (%s) is reached, so no email change link "
                         "was sent for user id=%s", limit, user.id)
            return MAIL_PAUSED
    store.hit(EMAIL_CHANGE_MAIL_LIMIT, EMAIL_CHANGE_MAIL_SCOPE, str(user.id))
    store.hit(EMAIL_CHANGE_ADDRESS_LIMIT, EMAIL_CHANGE_ADDRESS_SCOPE, address_key)
    for limit in EMAIL_CHANGE_MAIL_LIMITS:
        for _ in range(emails):
            store.hit(limit, EMAIL_CHANGE_MAIL_ALL_SCOPE, "all")
    return None


# --- undoing a change that went through ----------------------------------------------

def issue_undo(db: Session, user_id: int, old_email: str, new_email: str) -> str:
    """An undo link for a change of address that just went through, for the old
    address. It records the Google link the account has now (google_sub), which the
    undo keeps. Returns the token; the caller commits, then sends changed_email."""
    token = secrets.token_urlsafe(32)
    issued_at = now()
    db.add(EmailChangeUndo(
        user_id=user_id,
        token_hash=token_hash(token),
        old_email=old_email,
        new_email=new_email,
        google_sub=db.query(User.google_sub).filter(User.id == user_id).scalar(),
        created_at=issued_at,
        expires_at=issued_at + EMAIL_UNDO_EXPIRE_DAYS * 24 * 60 * 60,
    ))
    return token


def find_undo(db: Session, token: Optional[str]) -> Optional[EmailChangeUndo]:
    """The row of an undo token that exists and has not expired, or None."""
    if not token or not isinstance(token, str):
        return None
    row = db.query(EmailChangeUndo).filter(EmailChangeUndo.token_hash == token_hash(token)).first()
    if row is None or row.expires_at <= now():
        return None
    return row


def link_kept_by_rule(google_sub: Optional[str], google_email: Optional[str], row: EmailChangeUndo) -> bool:
    """Whether an undo keeps this Google link by its rule: it is the link the account
    had when the change went through (row.google_sub), or its email is the old address."""
    return google_sub is not None and (
        (row.google_sub is not None and google_sub == row.google_sub)
        or normalize_address(google_email or "") == normalize_address(row.old_email))


def undo(db: Session, row: EmailChangeUndo, new_password_hash: str, keep_any_link: bool = False) -> bool:
    """Deletes the undo row, and the user's undo rows issued after it (they belong to
    later changes, which this one takes back; left alone, whoever made those changes
    could undo this undo). Then one UPDATE of the user: the old address back, proven
    (the link reached it); the password replaced with new_password_hash, one nobody
    knows, which ends every session; has_password false; the Google link removed unless
    it is the one the account had when the change went through or its email is the old
    address (link_kept_by_rule). With keep_any_link (no reset link will be sent, so
    without Google the account would have no way in) the Google link stays whatever it
    is. The user's waiting change and reset links are deleted. False when another
    request used the row first; the caller then rolls back. The caller commits, and
    handles the unique index on the address."""
    claimed = db.query(EmailChangeUndo).filter(EmailChangeUndo.id == row.id).delete(
        synchronize_session=False)
    if claimed != 1:
        return False
    db.query(EmailChangeUndo).filter(EmailChangeUndo.user_id == row.user_id, EmailChangeUndo.id > row.id).delete(
        synchronize_session=False)
    values = {
        User.email: row.old_email,
        User.email_proven: True,
        User.hashed_password: new_password_hash,
        User.has_password: False,
    }
    if not keep_any_link:
        kept_link = func.lower(func.coalesce(User.google_email, "")) == normalize_address(row.old_email)
        if row.google_sub is not None:
            kept_link = or_(kept_link, User.google_sub == row.google_sub)
        values[User.google_sub] = case((kept_link, User.google_sub), else_=None)
        values[User.google_email] = case((kept_link, User.google_email), else_=None)
    changed = db.query(User).filter(User.id == row.user_id).update(values, synchronize_session=False)
    if changed != 1:
        return False
    db.query(EmailChangeToken).filter(EmailChangeToken.user_id == row.user_id).delete(
        synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == row.user_id).delete(
        synchronize_session=False)
    return True


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
        "The address changes only if the link sent to the new address is opened within one hour. "
        "If it is, this address gets another email with a link to undo the change.\n"
        "\n"
        "If you did not ask for this, sign in and change your password. That also cancels the change.\n"
    )
    page = _letter(NOTICE_SUBJECT, [
        (f"Someone asked to change the email address of the account <strong>{html.escape(username)}</strong> "
         f"to <strong>{html.escape(shown)}</strong>.", False),
        ("The address changes only if the link sent to the new address is opened within one hour. "
         "If it is, this address gets another email with a link to undo the change.", True),
        ("If you did not ask for this, sign in and change your password. That also cancels the change.", True),
    ])
    return Email(to=to, subject=NOTICE_SUBJECT, text=text, html=page)


def changed_email(to: str, username: str, new_address: str, link: str) -> Email:
    """To the old address once the change went through: what changed, and the undo link."""
    shown = masked(new_address)
    days = EMAIL_UNDO_EXPIRE_DAYS
    text = (
        f"The email address of the Candela Obscura account \"{username}\" was changed to {shown}.\n"
        "\n"
        "If you made this change, you can ignore this email.\n"
        "\n"
        f"If you did not, open this link within {days} days to undo it:\n"
        f"{link}\n"
        "\n"
        "Undoing it puts this address back on the account, ends every sign-in to it, and sends "
        "this address a link to set a new password.\n"
    )
    name, href = html.escape(username), html.escape(link, quote=True)
    page = _letter(CHANGED_SUBJECT, [
        (f"The email address of the account <strong>{name}</strong> was changed to "
         f"<strong>{html.escape(shown)}</strong>. If you did not make this change, undo it.", False),
        (f"The link works once, for {days} days. Undoing the change puts this address back on the account, "
         "ends every sign-in to it, and sends this address a link to set a new password.", True),
        (f'If the button does not work, copy this address into your browser:<br><a href="{href}" '
         f'style="color:{OXBLOOD};word-break:break-all;">{href}</a>', True),
        ("If you made this change, you can ignore this email.", True),
    ], button=("Undo this change", href))
    return Email(to=to, subject=CHANGED_SUBJECT, text=text, html=page)


def undone_email(to: str, username: str, old_address: str, google_email: Optional[str] = None,
                 google_kept: bool = False) -> Email:
    """To the address an undo took off the account: what happened, plainly. Whoever
    reads it may be the owner, signed out by someone who reads the old address."""
    shown = masked(old_address)
    if google_kept:
        google = (f"Google sign-in with {masked(google_email)} still works." if google_email
                  else "Its Google sign-in still works.")
    else:
        google = ""
    first = (f"The email address of the Candela Obscura account \"{username}\" was changed back to {shown}. "
             "Someone used the undo link that was sent to that address when this one replaced it.")
    second = ("This address is no longer on the account. Every sign-in to the account has ended "
              "and its password no longer works.")
    third = f"If you did not expect this, whoever reads {shown} now has the account."
    text = "\n\n".join(p for p in (first, f"{second} {google}".strip(), third)) + "\n"
    page = _letter(UNDONE_SUBJECT, [
        (f"The email address of the account <strong>{html.escape(username)}</strong> was changed back to "
         f"<strong>{html.escape(shown)}</strong>. Someone used the undo link that was sent to that address "
         "when this one replaced it.", False),
        (html.escape(f"{second} {google}".strip()), True),
        (html.escape(third), True),
    ])
    return Email(to=to, subject=UNDONE_SUBJECT, text=text, html=page)


def send(message: Email) -> None:
    """Runs after the answer has gone out (a background task). A failed send is logged
    by vtt/mail.py and changes nothing."""
    mail.send_email(message.to, message.subject, message.text, message.html)
