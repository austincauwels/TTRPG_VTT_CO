"""Settings read from the environment (and backend/.env), logging setup, and shared constants."""
import logging
import os
import re as _re

from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Existing environment variables win over backend/.env.
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("candela")


class _RedactTokenFilter(logging.Filter):
    """Replaces the value of any token=... query parameter in a log record.

    The WebSocket sends its login token in the query string, and uvicorn writes the
    path with its query string when it logs an accepted or rejected WebSocket.
    """
    _pattern = _re.compile(r"(token=)[^&\s\"']+")

    def _redact(self, value):
        return self._pattern.sub(r"\1<redacted>", value) if isinstance(value, str) else value

    def filter(self, record):
        record.msg = self._redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(self._redact(a) for a in record.args)
        return True


for _name in ("uvicorn.error", "uvicorn.access", "candela"):
    logging.getLogger(_name).addFilter(_RedactTokenFilter())

# SECRET_KEY signs the login tokens, so anyone who knows it can log in as any user.
# The placeholder from .env.example and short keys are refused.
SECRET_KEY_PLACEHOLDER = "your-secret-key-here"
SECRET_KEY_MIN_LENGTH = 32

_secret = os.getenv("SECRET_KEY")
if not _secret:
    raise RuntimeError("SECRET_KEY environment variable must be set. Generate one with: openssl rand -hex 32")
if _secret.strip() == SECRET_KEY_PLACEHOLDER or len(_secret) < SECRET_KEY_MIN_LENGTH:
    raise RuntimeError(f"SECRET_KEY must be a random value of at least {SECRET_KEY_MIN_LENGTH} characters, "
                       "not the .env.example placeholder. Generate one with: openssl rand -hex 32")
SECRET_KEY = _secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # login tokens last 30 days

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./candela_obscura.db")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",") if o.strip()]

# Handwriting fonts a character may use as pen_font (REST join and WebSocket update_pen_font).
_SAFE_FONT_NAMES = {
    "Caveat", "Satisfy", "Kalam", "Shadows Into Light", "Amatic SC", "Permanent Marker",
    "Reenie Beenie", "Zeyada", "Sacramento", "Homemade Apple", "Alex Brush",
    "Cedarville Cursive", "La Belle Aurore", "Charm", "Dawning of a New Day",
    "Gaegu", "Grape Nuts", "Moondance", "Long Cang", "Indie Flower",
    "Patrick Hand", "Rock Salt", "Gochi Hand",
}
_ALLOWED_CAMPAIGN_CODE_RE = _re.compile(r"^[a-zA-Z0-9\-_]{3,32}$")
