"""What a character's portrait (characters.profile_pic) may be, and how often it may change.

The character creator sends the chosen picture as profile_pic, a data URL:
"data:image/<type>;base64,<the picture's bytes>". Forge (POST /api/investigators/forge)
and PUT /api/investigators/{id}/portrait both check it with check_portrait, so the
two take exactly the same pictures: PNG, JPEG or WebP (the type in the data URL, and
bytes that start like one of the three), in a data URL of at most PORTRAIT_MAX_LENGTH
characters (400 KB, which holds a picture of about 300 KB). The browser scales a
photo down before it sends it (portraitDataUrl in frontend/src/utils/api.js).

Portraits are stored in the database and sent inline in roster lists and in
broadcasts to every socket of a campaign, so the cap keeps the database, its nightly
dumps and every frame small. It was 10 MB, and before that forge stored any string.

served_portrait applies the same type and size rule when a portrait is read, so a
value stored before the rule (a link to another site, an SVG, a picture over the
cap) is served as no portrait. The stored value is left alone.

portrait_change_allowed limits how often each user may set a portrait.
"""
import base64
import re

from fastapi import HTTPException
from limits import parse as parse_limit

from vtt.security import limiter

# The longest data URL taken, in characters (ASCII, so also bytes): 400 KB.
PORTRAIT_MAX_LENGTH = 400 * 1024
PORTRAIT_TYPES = ("png", "jpeg", "webp")

PORTRAIT_TOO_LARGE = "The portrait is too large. Choose a smaller picture."
PORTRAIT_NOT_A_PICTURE = "The portrait must be a PNG, JPEG or WebP picture."
PORTRAIT_CHANGES_LIMITED = "The portrait was changed too often. Please wait a few minutes and try again."

# Per user, for every portrait set through PUT /portrait and every forge with one.
PORTRAIT_CHANGE_LIMITS = (parse_limit("10/minute"), parse_limit("50/day"))
PORTRAIT_CHANGE_SCOPE = "portrait-change"

_DATA_URL_PREFIX = re.compile(r"data:image/(png|jpeg|webp);base64,")


def _looks_like_a_picture(raw: bytes) -> bool:
    """True when the bytes start like a PNG, a JPEG or a WebP file."""
    return (raw.startswith(b"\x89PNG\r\n\x1a\n")
            or raw.startswith(b"\xff\xd8\xff")
            or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"))


def check_portrait(value):
    """None or "" is no portrait and gives None. Anything else must be a data URL of a
    PNG, JPEG or WebP picture (the type, and bytes that start like one of the three),
    valid base64, and at most PORTRAIT_MAX_LENGTH characters in all; it is returned
    unchanged. Otherwise HTTPException 422 (not a picture) or 413 (too large)."""
    if value is None or value == "":
        return None
    match = _DATA_URL_PREFIX.match(value)
    if match is None:
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    if len(value) > PORTRAIT_MAX_LENGTH:
        raise HTTPException(status_code=413, detail=PORTRAIT_TOO_LARGE)
    try:
        raw = base64.b64decode(value[match.end():], validate=True)
    except ValueError:  # binascii.Error, or characters outside ASCII
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    if not _looks_like_a_picture(raw):
        raise HTTPException(status_code=422, detail=PORTRAIT_NOT_A_PICTURE)
    return value


def served_portrait(value):
    """A stored portrait as the API serves it: the value when it is a PNG, JPEG or WebP
    data URL of at most PORTRAIT_MAX_LENGTH characters, else None (no portrait). It
    looks at the type and the length only; every write since the rule was checked in
    full, and older bytes behind a valid prefix are inert in an <img>."""
    if isinstance(value, str) and len(value) <= PORTRAIT_MAX_LENGTH and _DATA_URL_PREFIX.match(value):
        return value
    return None


def portrait_change_allowed(user_id) -> bool:
    """Counts one portrait change for the user against PORTRAIT_CHANGE_LIMITS. False,
    counting nothing, when a limit is used up. Kept in the rate limiter's storage, and
    off while the rate limiter is off (the tests turn it off)."""
    if not limiter.enabled:
        return True
    store, key = limiter.limiter, str(user_id)
    if not all(store.test(limit, PORTRAIT_CHANGE_SCOPE, key) for limit in PORTRAIT_CHANGE_LIMITS):
        return False
    for limit in PORTRAIT_CHANGE_LIMITS:
        store.hit(limit, PORTRAIT_CHANGE_SCOPE, key)
    return True


def refuse_too_many_portrait_changes(user_id) -> None:
    """429 when the user has used up PORTRAIT_CHANGE_LIMITS; counts the change otherwise."""
    if not portrait_change_allowed(user_id):
        raise HTTPException(status_code=429, detail=PORTRAIT_CHANGES_LIMITED)
