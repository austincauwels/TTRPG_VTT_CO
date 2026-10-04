"""What a drawn notebook sketch keeps besides its picture (notebook_entries.sketch_scene).

The notebook's drawing sheet (frontend/src/components/shared/sketch/) saves a sketch as
two things. The picture is a PNG, stored as the entry's image_data exactly like an
uploaded sketch, and it is all anyone else ever sees. The drawing itself is an
Excalidraw scene, kept so that the author, and only the author, can open the sheet
again and keep drawing: GET /api/notebook/entries/{id}/scene answers the author alone,
and lists and socket messages carry only has_scene.

The scene comes in as a file part of the multipart request (Starlette caps a plain form
field at 1 MB, and a busy drawing is close to that). read_scene reads at most
SCENE_MAX_BYTES of it, before any parsing: more is 413. It must then be UTF-8 JSON, an
object with an "elements" list of objects, or it is 422. What is stored is only
{"type": "excalidraw", "version": 2, "elements": [...]}, with:
- only the sheet's own kinds of element (SCENE_ELEMENT_TYPES: the pen, line, arrow,
  rectangle, ellipse and text tools). Images, embeds, frames and anything else are
  dropped, and so are elements marked deleted. The scene's "files" (pictures pasted
  into it) and its appState are never kept;
- no links: every element's "link" is cleared, and no element keeps "customData".

PNG_MAX_BYTES is the upload route's picture limit, which a redrawn sketch keeps too.
"""
import json

from fastapi import HTTPException, UploadFile

# The longest scene read, in bytes: 1 MB.
SCENE_MAX_BYTES = 1024 * 1024
# The longest picture taken for a sketch, as for every notebook upload: 2 MB.
PNG_MAX_BYTES = 2 * 1024 * 1024

# The sheet's tools: freehand pen, line, arrow, rectangle, ellipse and text (the eraser
# and select tools make no elements).
SCENE_ELEMENT_TYPES = frozenset({"freedraw", "line", "arrow", "rectangle", "ellipse", "text"})

SCENE_TOO_LARGE = "The drawing is too large to keep. Save a simpler one."
SCENE_NOT_A_DRAWING = "The drawing could not be read."
PNG_TOO_LARGE = "Image too large (max 2MB)"
PNG_NOT_A_PNG = "The sketch must be a PNG picture."

_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


async def read_capped(upload: UploadFile, limit: int, too_large: str) -> bytes:
    """The upload's bytes, reading at most limit + 1 of them: 413 when there are more."""
    raw = await upload.read(limit + 1)
    if len(raw) > limit:
        raise HTTPException(status_code=413, detail=too_large)
    return raw


def clean_scene(value) -> str:
    """The stored form of a parsed scene (see the module docstring), as compact JSON.
    HTTPException 422 when it is not an object with an "elements" list of objects."""
    if not isinstance(value, dict) or not isinstance(value.get("elements"), list):
        raise HTTPException(status_code=422, detail=SCENE_NOT_A_DRAWING)
    elements = []
    for element in value["elements"]:
        if not isinstance(element, dict):
            raise HTTPException(status_code=422, detail=SCENE_NOT_A_DRAWING)
        if element.get("type") not in SCENE_ELEMENT_TYPES or element.get("isDeleted") is True:
            continue
        kept = {k: v for k, v in element.items() if k != "customData"}
        if "link" in kept:
            kept["link"] = None
        elements.append(kept)
    # ASCII only: a lone surrogate in a text element could not be stored as UTF-8
    return json.dumps({"type": "excalidraw", "version": 2, "elements": elements}, separators=(",", ":"))


async def read_scene(upload: UploadFile) -> str:
    """Reads, checks and cleans a scene sent as a file part. 413 or 422 when refused."""
    raw = await read_capped(upload, SCENE_MAX_BYTES, SCENE_TOO_LARGE)
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, RecursionError):  # RecursionError: nested too deep
        raise HTTPException(status_code=422, detail=SCENE_NOT_A_DRAWING)
    return clean_scene(value)


async def read_png(upload: UploadFile) -> bytes:
    """A redrawn sketch's picture: at most PNG_MAX_BYTES (413) of a PNG file (422)."""
    raw = await read_capped(upload, PNG_MAX_BYTES, PNG_TOO_LARGE)
    if not raw.startswith(_PNG_SIGNATURE):
        raise HTTPException(status_code=422, detail=PNG_NOT_A_PNG)
    return raw
