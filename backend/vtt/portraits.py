"""What a character's portrait (characters.profile_pic) may be.

The character creator reads the chosen picture with FileReader.readAsDataURL and sends
the result as profile_pic, a data URL: "data:image/<type>;base64,<the file's bytes>".
Forge (POST /api/investigators/forge) and PUT /api/investigators/{id}/portrait both
check it with check_portrait, so the two take exactly the same pictures.

Before this check forge stored any string, so the only limit was nginx's 25 MB cap on
an API request; a picture of more than PORTRAIT_MAX_BYTES (10 MB, which takes about
13.4 MB as base64) is now 413, and anything other than a raster image data URL is 422.
"""
import base64
import re

from fastapi import HTTPException

PORTRAIT_MAX_BYTES = 10 * 1024 * 1024
# Raster image types a browser's file picker gives for a photo. SVG is not taken: it
# is a document that can carry script.
PORTRAIT_TYPES = frozenset({"apng", "avif", "bmp", "gif", "heic", "heif", "jpeg", "jpg", "png", "tiff", "webp"})

PORTRAIT_TOO_LARGE = "The portrait is too large. Choose a picture of at most 10 MB."
PORTRAIT_NOT_A_PICTURE = "The portrait must be a picture (PNG, JPEG, GIF, WebP, AVIF, HEIC, BMP or TIFF)."

_DATA_URL_PREFIX = re.compile(r"data:image/([A-Za-z0-9.+-]+);base64,")


def check_portrait(value):
    """None or "" is no portrait and gives None. Anything else must be a data URL of a
    raster image (PORTRAIT_TYPES) whose bytes are valid base64, not empty, and at most
    PORTRAIT_MAX_BYTES; it is returned unchanged. Otherwise HTTPException 422 (not a
    picture) or 413 (too large)."""
    if value is None or value == "":
        return None
    match = _DATA_URL_PREFIX.match(value)
    if match is None or match.group(1).lower() not in PORTRAIT_TYPES:
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    encoded = value[match.end():]
    # Base64 carries 3 bytes in every 4 characters (less up to 2 for padding), so a
    # string this long is too large whatever it holds; it is refused before decoding.
    if len(encoded) // 4 * 3 - 2 > PORTRAIT_MAX_BYTES:
        raise HTTPException(status_code=413, detail=PORTRAIT_TOO_LARGE)
    try:
        raw = base64.b64decode(encoded, validate=True)
    except ValueError:  # binascii.Error, or characters outside ASCII
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    if not raw:
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    if len(raw) > PORTRAIT_MAX_BYTES:
        raise HTTPException(status_code=413, detail=PORTRAIT_TOO_LARGE)
    return value
