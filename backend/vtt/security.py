"""Password hashing and the per-IP rate limiter.

oauth2_scheme and the jose import are not used by any route (there are no tokens
yet, see docs/refactor/ROUTES.md); they are kept so the dependencies the app loads
at startup stay the same.
"""
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt  # noqa: F401  (unused, see the module docstring)
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

limiter = Limiter(key_func=get_remote_address)
