"""Campaign notebook routes: list, add, edit, soft-delete and image upload.

Every route needs a login token. Who may call what is in docs/refactor/AUTH.md: the
campaign's GM and members read and write; role=GM (the Lightkeeper's private notes)
only works for the GM; a character_id must be the caller's own character; only the
author of an entry may change or delete it. A player writes as one of their
characters in the campaign, and the server sets the author name, pen and ink.
"""
import base64
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BeforeValidator
from sqlalchemy.orm import Session

from engine import create_notebook_entry
from models import Campaign, Character, NotebookEntry, User
from vtt.auth import (
    MEMBER_STATUSES, campaign_facts, campaign_or_404, character_facts, character_or_404, forbidden,
    get_current_user, is_gm, require_gm_or_member, require_owner,
)
from vtt.db import get_db
from vtt.schemas import NotebookEntryCreate, NotebookEntryResponse, NotebookEntryUpdate
from vtt.ws.manager import manager

router = APIRouter()

# The frontend sends "character_id=" when it has no character (the GM's notebook).
# An empty value means no character; anything else must still be an integer.
OptionalCharacterId = Annotated[Optional[int], BeforeValidator(lambda v: None if v == "" else v)]


def is_gm_entry(author_type, entry_type, visibility) -> bool:
    """Entries that only the Lightkeeper writes."""
    return author_type == "gm" or entry_type == "lightkeeper" or visibility == "gm_only"


def _require_writer(db: Session, user: User, campaign_id: int, character_id, gm_entry: bool):
    """The caller may write into this campaign's notebook, as themself. Returns the
    author: (author_name, pen_font, ink_color), all set by the server.

    A player writes as one of their own characters, which must be an active member
    of this campaign; character_id is required. The GM may write
    without a character, under their username (what the frontend already sent)."""
    campaign = campaign_or_404(db, campaign_id)
    require_gm_or_member(db, user, campaign)
    gm = is_gm(user.id, campaign)
    character = None
    if character_id is not None:
        facts = character_or_404(db, character_id)
        require_owner(user, facts)
        if facts.campaign_id != campaign_id or facts.status not in MEMBER_STATUSES:
            raise forbidden()
        character = db.query(Character).filter(Character.id == character_id).first()
    elif not gm:
        raise forbidden()
    if gm_entry and not gm:
        raise forbidden()
    if character is None:
        return user.username, 'Caveat', '#1a1a1a'
    return character.name, character.pen_font or 'Caveat', character.ink_color or '#8b1a1a'


def _require_author(db: Session, user: User, entry: NotebookEntry):
    """A character's entry belongs to that character's owner; any other entry to the campaign's GM."""
    if entry.character_id is not None:
        author = character_facts(db, entry.character_id)
        if author is not None and author.user_id == user.id:
            return
        raise forbidden()
    if not is_gm(user.id, campaign_facts(db, entry.campaign_id)):
        raise forbidden()


@router.get("/api/notebook/{campaign_id}/entries", response_model=List[NotebookEntryResponse])
def fetch_notebook_entries(campaign_id: int, role: str = "player", character_id: OptionalCharacterId = None,
                           db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    campaign = campaign_or_404(db, campaign_id)
    require_gm_or_member(db, user, campaign)
    if role == "GM" and not is_gm(user.id, campaign):
        raise forbidden()
    if character_id is not None:
        require_owner(user, character_or_404(db, character_id))
    entries = db.query(NotebookEntry).filter(
        NotebookEntry.campaign_id == campaign_id,
        NotebookEntry.is_deleted == False,
    ).order_by(NotebookEntry.page_number).all()

    visible = []
    for e in entries:
        vis = getattr(e, "visibility", "all") or "all"
        if vis == "all":
            visible.append(e)
        elif vis == "gm_only" and role == "GM":
            visible.append(e)
        elif vis == "self" and e.character_id and e.character_id == character_id:
            visible.append(e)
    return visible

@router.post("/api/notebook/{campaign_id}/entries", response_model=NotebookEntryResponse, status_code=201)
async def add_notebook_entry(campaign_id: int, entry_data: NotebookEntryCreate, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    # author_name in the body is ignored; the server names the author.
    author_name, pen_font, ink_color = _require_writer(
        db, user, campaign_id, entry_data.character_id,
        is_gm_entry(entry_data.author_type, entry_data.entry_type, entry_data.visibility))

    entry = create_notebook_entry(
        db, campaign_id,
        title        = entry_data.title,
        content      = entry_data.content,
        author_name  = author_name,
        author_type  = entry_data.author_type,
        pen_font     = pen_font,
        ink_color    = ink_color,
        character_id = entry_data.character_id,
        entry_type   = entry_data.entry_type,
        visibility   = entry_data.visibility,
        image_data   = entry_data.image_data,
    )
    # Don't broadcast ephemeral or gm_only entries to activity log
    if entry_data.visibility == 'all':
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            entry_payload = {
                "id": entry.id,
                "title": entry.title,
                "content": entry.content,
                "author_name": entry.author_name,
                "author_type": entry.author_type,
                "entry_type": entry.entry_type,
                "visibility": entry.visibility,
                "character_id": entry.character_id,
                "page_number": entry.page_number,
                "pen_font": entry.pen_font,
                "ink_color": entry.ink_color,
                "image_data": entry.image_data,
                "created_at": entry.created_at or None,
                "is_deleted": entry.is_deleted,
            }
            await manager.broadcast_campaign(campaign.campaign_code, campaign_id, {
                "type": "notebook_entry",
                "payload": entry_payload,
            }, db)
            await manager.broadcast_campaign(campaign.campaign_code, campaign_id, {
                "type": "activity_log",
                "payload": {
                    "message": f"{author_name} has archived a journal entry.",
                    "log_type": "field",
                    "ink_color": ink_color if ink_color != '#1a1a1a' else "",
                }
            }, db)
    return entry

@router.put("/api/notebook/entries/{entry_id}", response_model=NotebookEntryResponse)
def update_notebook_entry(entry_id: int, entry_data: NotebookEntryUpdate, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    entry = db.query(NotebookEntry).filter(NotebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    _require_author(db, user, entry)
    if entry_data.title is not None:
        entry.title = entry_data.title
    if entry_data.content is not None:
        entry.content = entry_data.content
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/api/notebook/entries/{entry_id}", status_code=204)
def delete_notebook_entry(entry_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    entry = db.query(NotebookEntry).filter(NotebookEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    _require_author(db, user, entry)
    entry.is_deleted = True
    db.commit()

@router.post("/api/notebook/{campaign_id}/upload", status_code=201)
async def upload_notebook_image(
    campaign_id: int,
    file: UploadFile = File(...),
    title: str = Form("Attached Image"),
    content: str = Form(""),
    author_name: str = Form("Unknown"),
    author_type: str = Form("player"),
    entry_type: str = Form("sketch"),
    character_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # author_name in the form is ignored; the server names the author.
    author_name, pen_font, ink_color = _require_writer(
        db, user, campaign_id, character_id, is_gm_entry(author_type, entry_type, "all"))
    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 2MB)")
    b64 = base64.b64encode(raw).decode("utf-8")
    mime = file.content_type or "image/png"
    image_data = f"data:{mime};base64,{b64}"

    entry = create_notebook_entry(
        db, campaign_id,
        title        = title,
        content      = content,
        author_name  = author_name,
        author_type  = author_type,
        pen_font     = pen_font,
        ink_color    = ink_color,
        character_id = character_id,
        entry_type   = entry_type,
        visibility   = 'all',
        image_data   = image_data,
    )
    return {
        "id": entry.id,
        "page_number": entry.page_number,
        "entry_type": entry.entry_type,
        "image_data": entry.image_data,
        "title": entry.title,
        "content": entry.content,
        "author_name": entry.author_name,
        "pen_font": entry.pen_font,
        "ink_color": entry.ink_color,
        "created_at": entry.created_at,
        "campaign_id": entry.campaign_id,
        "character_id": entry.character_id,
        "visibility": entry.visibility,
        "is_deleted": entry.is_deleted,
    }
