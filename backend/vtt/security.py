"""Password hashing, login tokens, and the per-IP rate limiter.

Login and register hand out a JWT signed with SECRET_KEY (HS256). Its "sub" claim is
the user id as a string, and it expires ACCESS_TOKEN_EXPIRE_MINUTES after it was
issued. REST calls send it as "Authorization: Bearer <token>"; the WebSocket sends it
as the "token" query parameter, because browsers cannot set headers on a WebSocket.
vtt/auth.py turns a token back into a user.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from vtt.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

limiter = Limiter(key_func=get_remote_address)

# A token that lacks one of these claims is rejected.
_DECODE_OPTIONS = {"require_sub": True, "require_iat": True, "require_exp": True}


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
    try:
        return int(claims["sub"])
    except (KeyError, TypeError, ValueError):
        return None
