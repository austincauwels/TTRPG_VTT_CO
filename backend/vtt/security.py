"""Password hashing, login and link tokens, and the per-IP rate limiter (an IPv6 client
counts by its /64 network, see client_key).

Every route that signs a user in (login, register and the Google sign-in routes)
hands out a login token: a JWT signed with SECRET_KEY (HS256). Its "sub" claim is
the user id as a string, its "pwh" claim is the password stamp (a keyed hash of the
user's password hash, see password_stamp), and it expires ACCESS_TOKEN_EXPIRE_MINUTES
after it was issued. REST calls send it as "Authorization: Bearer <token>"; the
WebSocket sends it as the "token" query parameter, because browsers cannot set
headers on a WebSocket. vtt/auth.py turns a token back into a user, and refuses it
when the user's password has been replaced since the token was issued.

Sign in with Google hands out a second kind of token, a link token, when a Google
account belongs to no user yet. It is signed with the same key but has
"purpose": "google_link", no "sub", and lasts LINK_TOKEN_EXPIRE_MINUTES. It carries
the Google account (google_sub, email, name) to POST /api/auth/google/link or
/api/auth/google/create and is good for nothing else: user_id_from_token refuses it,
and identity_from_link_token refuses login tokens.
"""
import hashlib
import hmac
import ipaddress
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from jose import JWTError, jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from vtt.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, LINK_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from vtt.google import GoogleIdentity

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def client_key(request) -> str:
    """The key the per-IP rate limits count under: the client's address (behind nginx
    and uvicorn --proxy-headers, the real client's), but for IPv6 its /64 network.
    Any machine with IPv6 gets a whole /64 (2^64 addresses), so counting each address
    on its own let one client start a fresh count with every request. An IPv4 address
    mapped into IPv6 counts as that IPv4 address; anything that is not an address
    (the tests' "testclient") is used as it is."""
    address = get_remote_address(request)
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return address
    if ip.version == 6:
        if ip.ipv4_mapped is not None:
            return str(ip.ipv4_mapped)
        return str(ipaddress.IPv6Network((int(ip) >> 64 << 64, 64)))
    return str(ip)


limiter = Limiter(key_func=client_key)

# A token that lacks one of these claims is rejected (and one without "pwh", below).
_DECODE_OPTIONS = {"require_sub": True, "require_iat": True, "require_exp": True}
_LINK_DECODE_OPTIONS = {"require_iat": True, "require_exp": True}

LINK_TOKEN_PURPOSE = "google_link"


def password_stamp(password_hash: Optional[str]) -> str:
    """A keyed hash (HMAC-SHA256 with SECRET_KEY, 32 hex digits) of a user's password
    hash. Login tokens carry it, so replacing the password ends every login token
    issued before. Whoever holds a token can read it; the key keeps it from telling
    anything about the hash."""
    digest = hmac.new(SECRET_KEY.encode(), (password_hash or "").encode(), hashlib.sha256)
    return digest.hexdigest()[:32]


def create_access_token(user_id: int, password_hash: Optional[str]) -> str:
    """A login token for the user, stamped with their current password hash."""
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "pwh": password_stamp(password_hash),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def login_token_subject(token: Optional[str]) -> Optional[Tuple[int, str]]:
    """(user id, password stamp) of a login token, or None when the token is missing,
    malformed, signed with another key or algorithm, expired, a link token, or lacks
    a claim. Only HS256 is accepted. The caller compares the stamp with the user's
    current password hash (vtt.auth.user_for_token)."""
    if not token or not isinstance(token, str):
        return None
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options=_DECODE_OPTIONS)
    except JWTError:
        return None
    if "purpose" in claims:
        return None  # a link token, never a login token
    stamp = claims.get("pwh")
    if not isinstance(stamp, str) or not stamp:
        return None  # issued before tokens carried the password stamp
    try:
        return int(claims["sub"]), stamp
    except (KeyError, TypeError, ValueError):
        return None


def user_id_from_token(token: Optional[str]) -> Optional[int]:
    """The user id of a login token (see login_token_subject), or None."""
    subject = login_token_subject(token)
    return subject[0] if subject is not None else None


def create_link_token(identity: GoogleIdentity) -> str:
    """A short-lived token naming a verified Google account that has no user yet."""
    now = datetime.now(timezone.utc)
    claims = {
        "purpose": LINK_TOKEN_PURPOSE,
        "google_sub": identity.sub,
        "email": identity.email,
        "name": identity.name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=LINK_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def identity_from_link_token(token: Optional[str]) -> Optional[GoogleIdentity]:
    """The Google account a link token names, or None when the token is missing,
    malformed, signed with another key or algorithm, expired, or not a link token."""
    if not token or not isinstance(token, str):
        return None
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options=_LINK_DECODE_OPTIONS)
    except JWTError:
        return None
    if claims.get("purpose") != LINK_TOKEN_PURPOSE:
        return None
    sub, email, name = claims.get("google_sub"), claims.get("email"), claims.get("name", "")
    if not isinstance(sub, str) or not sub or not isinstance(email, str) or not email:
        return None
    return GoogleIdentity(sub=sub, email=email, name=name if isinstance(name, str) else "")
