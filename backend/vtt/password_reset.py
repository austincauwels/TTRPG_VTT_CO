"""Password reset by email: who gets a link, the links themselves, and the email.

POST /api/auth/password-reset (vtt/routers/auth.py) takes an email address. Every
account whose email is that address (ignoring case and surrounding spaces) gets an
email with a link to RESET_URL_BASE/reset-password?token=<token>, except the seeded
accounts and accounts whose email cannot receive mail (usable_email). The answer is
the same whether or not any account matched, and the email goes out after the answer.

A token is 32 random bytes (secrets.token_urlsafe). Only its SHA-256 is stored, in
password_reset_tokens, with the user, the user's password stamp at the time (see
vtt/security.py) and an expiry PASSWORD_RESET_EXPIRE_MINUTES later. A token works
once: POST /api/auth/password-reset/confirm deletes its row before it sets the new
password, and deletes the user's other rows with it. A newer request for the same user
deletes the older rows. Any other change of the password (Sign in with Google linking
by email, retire_published_passwords, a hash set in the database) changes the stamp,
so an older token no longer matches. The new password changes the stamp that login
tokens carry too, which ends every earlier session. Using a token also marks the
account's email as proven, records that someone chose the password (has_password),
removes an unproven Google link and ends a change of address that waits for its link
(use_token). A change of address that is used ends the user's reset links
(vtt/email_change.py), because they went to the old address.
"""
import hashlib
import hmac
import html
import re
import secrets
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from limits import parse as parse_limit
from sqlalchemy.orm import Session
from sqlalchemy import and_, case, func

from models import EmailChangeToken, PasswordResetToken, User
from vtt import config, mail
from vtt.config import logger
from vtt.db import PUBLISHED_PASSWORDS
from vtt.security import limiter, password_stamp

SUBJECT = "Set a new Candela Obscura password"

# Per address, on top of the per-IP limit on the route. Every request counts, whether
# or not an account has the address, so a refusal says nothing about accounts.
ADDRESS_LIMIT = parse_limit("3/hour")
ADDRESS_LIMIT_SCOPE = "password-reset-address"

# At most this many accounts get a link from one request. Several accounts can share
# an address only as emails that differ in case, from before register compared them
# ignoring case.
MAX_ACCOUNTS_PER_ADDRESS = 5

# Overall caps on the reset emails the server sends, whatever the address or IP. Over
# a cap a request still answers 202, nothing is sent and the log says so. Without
# them one client with many registered addresses (or many IPs) could use up the
# Resend quota, after which every real reset email fails while the answer stays 202.
MAIL_LIMITS = (parse_limit("20/hour"), parse_limit("50/day"))
MAIL_LIMIT_SCOPE = "password-reset-mail"
# An address nobody has proven (users.email_proven false: no used reset link, no
# Google account with it) is one that whoever registered it typed, perhaps someone
# else's. It gets at most this many reset emails a day, on top of the caps above.
UNPROVEN_ADDRESS_MAIL_LIMIT = parse_limit("3/day")
UNPROVEN_ADDRESS_SCOPE = "password-reset-unproven-address"

# The accounts the seed scripts make (vtt/db.py). Their emails are seed data, not
# anyone's address (admin@archive.com is on a real domain), so they never get a link.
SEEDED_USERNAMES = tuple(PUBLISHED_PASSWORDS)

_LOCAL_PART = r"[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
_DOMAIN_LABEL = r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
_EMAIL = re.compile(_LOCAL_PART + "@(?:" + _DOMAIN_LABEL + r"\.)+[A-Za-z]{2,63}")
# Names reserved so that they never receive mail (RFC 2606, RFC 6761). Seed data and
# the tests use them.
_NO_MAIL_TLDS = {"test", "example", "invalid", "localhost", "local"}
_NO_MAIL_DOMAINS = ("example.com", "example.net", "example.org")


@dataclass
class ResetEmail:
    to: str
    username: str
    link: str


def now() -> int:
    return int(time.time())


def normalize_address(address: str) -> str:
    return address.strip().lower()


def address_allowed(address: str) -> bool:
    """Counts one reset request for this address, and is False once the address has
    used up ADDRESS_LIMIT. Kept in the rate limiter's storage, and off while the rate
    limiter is off (the tests turn it off)."""
    if not limiter.enabled:
        return True
    return limiter.limiter.hit(ADDRESS_LIMIT, ADDRESS_LIMIT_SCOPE, normalize_address(address))


def mail_allowed(user: User) -> bool:
    """Counts one reset email to this account against MAIL_LIMITS and, when its address
    is unproven, against UNPROVEN_ADDRESS_MAIL_LIMIT for that address. False, counting
    nothing, when one of them is used up. The counts live in the rate limiter's storage
    (in memory: a restart clears them), and are off while the rate limiter is off."""
    if not limiter.enabled:
        return True
    store = limiter.limiter
    checks = [(limit, MAIL_LIMIT_SCOPE, "all") for limit in MAIL_LIMITS]
    if not user.email_proven:
        checks.append((UNPROVEN_ADDRESS_MAIL_LIMIT, UNPROVEN_ADDRESS_SCOPE, normalize_address(user.email)))
    for limit, scope, key in checks:
        if not store.test(limit, scope, key):
            if scope == MAIL_LIMIT_SCOPE:
                logger.error("The overall cap on reset emails (%s) is reached, so no reset email was sent "
                             "for user id=%s", limit, user.id)
            else:
                logger.warning("No reset email was sent for user id=%s: its address is unproven and "
                               "has had %s", user.id, limit)
            return False
    for limit, scope, key in checks:
        store.hit(limit, scope, key)
    return True


def usable_email(address) -> bool:
    """True for an address mail can be sent to: one plain ASCII address (no display
    name, no spaces, at most 254 characters) on a domain that is not reserved."""
    if not isinstance(address, str) or len(address) > 254 or not _EMAIL.fullmatch(address):
        return False
    local, domain = address.rsplit("@", 1)
    domain = domain.lower()
    if len(local) > 64 or domain.rsplit(".", 1)[-1] in _NO_MAIL_TLDS:
        return False
    return not any(domain == d or domain.endswith("." + d) for d in _NO_MAIL_DOMAINS)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def reset_link(token: str) -> str:
    return f"{config.RESET_URL_BASE}/reset-password?token={token}"


def accounts_for(db: Session, address: str) -> List[User]:
    """The accounts a request for this address reaches: email equal to it ignoring
    case, not a seeded account, and an email that can receive mail."""
    rows = db.query(User).filter(
        func.lower(User.email) == normalize_address(address),
        User.username.notin_(SEEDED_USERNAMES),
    ).order_by(User.id).limit(MAX_ACCOUNTS_PER_ADDRESS).all()
    return [user for user in rows if usable_email(user.email)]


def forget_expired(db: Session) -> None:
    db.query(PasswordResetToken).filter(PasswordResetToken.expires_at <= now()).delete(
        synchronize_session=False)


def issue_links(db: Session, users: List[User]) -> List[ResetEmail]:
    """A new token for each user, replacing any older one. The caller commits, then
    sends the emails."""
    issued_at = now()
    emails = []
    for user in users:
        token = secrets.token_urlsafe(32)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(
            synchronize_session=False)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash(token),
            password_stamp=password_stamp(user.hashed_password),
            created_at=issued_at,
            expires_at=issued_at + config.PASSWORD_RESET_EXPIRE_MINUTES * 60,
        ))
        emails.append(ResetEmail(to=user.email, username=user.username, link=reset_link(token)))
        logger.info("Issued a password reset link for user id=%s", user.id)
    return emails


def find_token(db: Session, token: Optional[str]) -> Optional[Tuple[PasswordResetToken, User]]:
    """(row, user) for a token that can still be used: it exists, has not expired, its
    user exists, and the user's password is still the one it was issued for."""
    if not token or not isinstance(token, str):
        return None
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash(token)).first()
    if row is None or row.expires_at <= now():
        return None
    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None or not hmac.compare_digest(row.password_stamp, password_stamp(user.hashed_password)):
        return None
    return row, user


@dataclass
class ResetOutcome:
    google_unlinked: bool  # the reset removed an unproven Google link


def use_token(db: Session, row: PasswordResetToken, user: User, new_password_hash: str) -> Optional[ResetOutcome]:
    """Deletes the token's row, sets the new password hash and deletes the user's other
    tokens. Each step is conditional, so of two requests with the same token only one
    gets through, and a password changed since find_token is not overwritten. None
    when that happens; the caller then rolls back. The caller commits.

    The same UPDATE marks the account's email as proven (the link reached whoever
    reads it) and removes the Google link unless it was made with a Google account
    whose email is the account's email (ignoring case). An unproven link may belong to
    someone who registered this address or stole a login token, and whoever reads the
    address owns the account."""
    claimed = db.query(PasswordResetToken).filter(PasswordResetToken.id == row.id).delete(
        synchronize_session=False)
    if claimed != 1:
        return None
    linked_before = db.query(User.google_sub).filter(User.id == user.id).scalar()
    proven_link = and_(User.google_email.isnot(None), func.lower(User.google_email) == func.lower(User.email))
    changed = db.query(User).filter(
        User.id == user.id, User.hashed_password == user.hashed_password,
    ).update({
        User.hashed_password: new_password_hash,
        User.has_password: True,
        User.email_proven: True,
        User.google_sub: case((proven_link, User.google_sub), else_=None),
        User.google_email: case((proven_link, User.google_email), else_=None),
    }, synchronize_session=False)
    if changed != 1:
        return None
    linked_after = db.query(User.google_sub).filter(User.id == user.id).scalar()
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(
        synchronize_session=False)
    # A change of address waiting for its link ends too (the new password would end it
    # anyway, see vtt/email_change.py): whoever reads the current address owns the account.
    db.query(EmailChangeToken).filter(EmailChangeToken.user_id == user.id).delete(
        synchronize_session=False)
    return ResetOutcome(google_unlinked=linked_before is not None and linked_after is None)


# --- the email ------------------------------------------------------------------------

# The site's palette (DESIGN.md): a parchment sheet on the night stage, ink text,
# sepia rules and small print, an oxblood button.
NIGHT, PARCHMENT, INK, SEPIA, OXBLOOD, CREAM = "#120b0a", "#f0e2c0", "#1a1311", "#5a3a28", "#721c15", "#fdfaf4"
SERIF = "Georgia, 'Times New Roman', serif"


def email_text(username: str, link: str) -> str:
    return (
        f"Someone asked to set a new password for the Candela Obscura account \"{username}\".\n"
        "\n"
        "Open this link to choose a new password:\n"
        f"{link}\n"
        "\n"
        "The link works once and expires in one hour. Once you set a new password, "
        "every earlier sign-in to this account ends.\n"
        "\n"
        "If you did not ask for this, you can ignore this email. Your password stays as it is.\n"
    )


def email_html(username: str, link: str) -> str:
    name, href = html.escape(username), html.escape(link, quote=True)
    small = f"margin:0 0 14px;font-size:14px;line-height:1.5;color:{SEPIA};"
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{SUBJECT}</title></head>
<body style="margin:0;padding:0;background:{NIGHT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{NIGHT};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:{PARCHMENT};border:1px solid {SEPIA};">
<tr><td style="padding:24px 32px 14px;border-bottom:1px solid {SEPIA};font-family:{SERIF};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:{OXBLOOD};">Candela Obscura</td></tr>
<tr><td style="padding:24px 32px 12px;font-family:{SERIF};color:{INK};">
<p style="margin:0 0 20px;font-size:17px;line-height:1.5;">Someone asked to set a new password for the account <strong>{name}</strong>.</p>
<p style="margin:0 0 24px;"><a href="{href}" style="display:inline-block;padding:12px 24px;background:{OXBLOOD};color:{CREAM};font-family:{SERIF};font-size:16px;text-decoration:none;">Set a new password</a></p>
<p style="{small}">The link works once and expires in one hour. Once you set a new password, every earlier sign-in to this account ends.</p>
<p style="{small}">If the button does not work, copy this address into your browser:<br><a href="{href}" style="color:{OXBLOOD};word-break:break-all;">{href}</a></p>
<p style="{small}">If you did not ask for this, you can ignore this email. Your password stays as it is.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def send_reset_email(message: ResetEmail) -> None:
    """Runs after the answer has gone out (a background task), so the time the answer
    takes does not depend on whether an account matched."""
    mail.send_email(message.to, SUBJECT, email_text(message.username, message.link),
                    email_html(message.username, message.link))
