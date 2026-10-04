"""Deleting characters and campaigns, the undo right after, and the admin restore.

Both are soft deletes: the row keeps everything and gets deleted_at, and models.py
leaves such rows out of every query (models.SoftDeleted). Who may delete what, and
how an admin restores a row or a later purge would remove it, is in
docs/refactor/DELETION.md.

- A character can be deleted by its owner while it is on no campaign's roster (not
  active, not pending). A retired character, still tagged with its old campaign, can be.
- A campaign can be deleted by its GM, the Lightkeeper. Its characters are not deleted:
  every character tagged with it (active, pending or retired) goes back to its owner
  as unaffiliated, with no campaign. The campaign keeps a list of them as they were
  (released_characters), so an undo or a restore can put back the ones still free.
- The same user can undo a delete for UNDO_SECONDS. After that only an admin can
  restore it (restore_character and restore_campaign without a user), within KEEP_DAYS.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import INCLUDE_DELETED, Campaign, Character
from vtt.auth import ROSTER_STATUSES

# How long the user who deleted something can undo it themself. The roster book offers
# Undo for a few seconds; the server allows longer so a slow connection still makes it.
UNDO_SECONDS = 120
# How long deleted rows are kept for an admin to restore. Nothing removes them yet; a
# later purge job would remove rows deleted longer ago than this (DELETION.md).
KEEP_DAYS = 30

IN_A_CAMPAIGN = "An investigator in a campaign cannot be deleted."
NOTHING_TO_RESTORE = "Nothing to restore."
TOO_LATE = "It is too late to undo this."


def utcnow() -> datetime:
    """Now in UTC without a time zone, as deleted_at is stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def deleted_query(db: Session, model):
    """A query over the deleted rows of a SoftDeleted model."""
    return db.query(model).execution_options(**{INCLUDE_DELETED: True}).filter(model.deleted_at.isnot(None))


def deleted_character(db: Session, character_id):
    return deleted_query(db, Character).filter(Character.id == character_id).first()


def deleted_campaign(db: Session, campaign_id):
    return deleted_query(db, Campaign).filter(Campaign.id == campaign_id).first()


def undo_until(deleted_at: datetime) -> datetime:
    return deleted_at + timedelta(seconds=UNDO_SECONDS)


def within_undo(deleted_at: datetime) -> bool:
    return deleted_at is not None and utcnow() <= undo_until(deleted_at)


def receipt(row, **extra) -> dict:
    """What a delete answers: the row, when it was deleted, and until when its user can
    undo it (both ISO 8601, UTC)."""
    return {"ok": True, "id": row.id, "name": row.name,
            "deleted_at": row.deleted_at.isoformat() + "Z",
            "undo_until": undo_until(row.deleted_at).isoformat() + "Z", **extra}


# --- characters -------------------------------------------------------------------

def delete_character(db: Session, character: Character) -> None:
    """Soft-deletes a character that is on no roster (409 otherwise). The caller checks
    that the user owns it. Commits."""
    if character.status in ROSTER_STATUSES:
        raise HTTPException(status_code=409, detail=IN_A_CAMPAIGN)
    character.deleted_at = utcnow()
    db.commit()


def restore_character(db: Session, character_id, user_id=None) -> Character:
    """Brings back a deleted character as it was. With user_id (the undo) only its owner
    may, and only within UNDO_SECONDS; anyone else gets 404, as if nothing were there.
    Without user_id (an admin) there is no time limit. Commits."""
    character = deleted_character(db, character_id)
    if character is None or (user_id is not None and character.user_id != user_id):
        raise HTTPException(status_code=404, detail=NOTHING_TO_RESTORE)
    if user_id is not None and not within_undo(character.deleted_at):
        raise HTTPException(status_code=409, detail=TOO_LATE)
    character.deleted_at = None
    db.commit()
    db.refresh(character)
    return character


# --- campaigns --------------------------------------------------------------------

def delete_campaign(db: Session, campaign: Campaign) -> list:
    """Soft-deletes a campaign and lets its characters go: each one tagged with it
    (active, pending or retired) becomes unaffiliated with no campaign. Returns the
    released characters as they were ({"id", "status"}), which the campaign also keeps.
    The caller checks that the user is its GM. Commits."""
    released = db.query(Character).filter(Character.campaign_id == campaign.id).order_by(Character.id).all()
    snapshot = [{"id": c.id, "status": c.status} for c in released]
    for c in released:
        c.status = "unaffiliated"
        c.campaign_id = None
    campaign.released_characters = snapshot
    campaign.deleted_at = utcnow()
    db.commit()
    return snapshot


def restore_campaign(db: Session, campaign_id, user_id=None):
    """Brings back a deleted campaign, and puts each character it let go back the way
    it was, if that character is still free: not deleted, unaffiliated, in no campaign
    (one that joined another campaign or was deleted meanwhile stays where it is). With
    user_id (the undo) only its GM may, within UNDO_SECONDS; anyone else gets 404.
    Returns (campaign, ids of the characters put back). Commits."""
    campaign = deleted_campaign(db, campaign_id)
    if campaign is None or (user_id is not None and campaign.gm_user_id != user_id):
        raise HTTPException(status_code=404, detail=NOTHING_TO_RESTORE)
    if user_id is not None and not within_undo(campaign.deleted_at):
        raise HTTPException(status_code=409, detail=TOO_LATE)
    before = {entry["id"]: entry["status"] for entry in (campaign.released_characters or [])}
    restored = []
    if before:
        free = db.query(Character).filter(
            Character.id.in_(list(before)),
            Character.campaign_id.is_(None),
            Character.status == "unaffiliated",
        ).order_by(Character.id).all()
        for c in free:
            c.campaign_id = campaign.id
            c.status = before[c.id]
            restored.append(c.id)
    campaign.deleted_at = None
    campaign.released_characters = None
    db.commit()
    db.refresh(campaign)
    return campaign, restored


def deleted_rows(db: Session, days=KEEP_DAYS) -> dict:
    """The characters and campaigns deleted in the last `days` days, newest first (the
    admin's list, restore_deleted.py list)."""
    since = utcnow() - timedelta(days=days)
    return {
        "characters": deleted_query(db, Character).filter(Character.deleted_at >= since)
        .order_by(Character.deleted_at.desc()).all(),
        "campaigns": deleted_query(db, Campaign).filter(Campaign.deleted_at >= since)
        .order_by(Campaign.deleted_at.desc()).all(),
    }
