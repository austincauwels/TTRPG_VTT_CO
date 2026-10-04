"""Password hashing, login and link tokens, and the per-IP rate limiter.

Every route that signs a user in (login, register and the Google sign-in routes)
hands out a login token: a JWT signed with SECRET_KEY (HS256). Its "sub" claim is
the user id as a string, and it expires ACCESS_TOKEN_EXPIRE_MINUTES after it was
issued. REST calls send it as "Authorization: Bearer <token>"; the WebSocket sends it
as the "token" query parameter, because browsers cannot set headers on a WebSocket.
vtt/auth.py turns a token back into a user.

Sign in with Google hands out a second kind of token, a link token, when a Google
account belongs to no user yet. It is signed with the same key but has
"purpose": "google_link", no "sub", and lasts LINK_TOKEN_EXPIRE_MINUTES. It carries
the Google account (google_sub, email, name) to POST /api/auth/google/link or
/api/auth/google/create and is good for nothing else: user_id_from_token refuses it,
and identity_from_link_token refuses login tokens.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from vtt.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, LINK_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from vtt.google import GoogleIdentity

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

limiter = Limiter(key_func=get_remote_address)

# A token that lacks one of these claims is rejected.
_DECODE_OPTIONS = {"require_sub": True, "require_iat": True, "require_exp": True}
_LINK_DECODE_OPTIONS = {"require_iat": True, "require_exp": True}

LINK_TOKEN_PURPOSE = "google_link"


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def user_id_from_token(token: Optional[str]) -> Optional[int]:
    """The user id a token was issued for, or None when the token is missing,
    malformed, signed with another key or algorithm, or expired. Only HS256 is
    accepted."""
    if not token or not isinstance(token, str):
        return None
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options=_DECODE_OPTIONS)
    except JWTError:
        return None
    if "purpose" in claims:
        return None  # a link token, never a login token
    try:
        return int(claims["sub"])
    except (KeyError, TypeError, ValueError):
        return None


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
