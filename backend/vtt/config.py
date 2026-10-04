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

_secret = os.getenv("SECRET_KEY")
if not _secret:
    raise RuntimeError("SECRET_KEY environment variable must be set. Generate one with: openssl rand -hex 32")
SECRET_KEY = _secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

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
