"""Deleting characters and campaigns, the undo right after, and the admin restore.

Both are soft deletes: the row keeps everything and gets deleted_at, and models.py
leaves such rows out of every query (models.SoftDeleted). Who may delete what, and
how an admin restores a row or a later purge would remove it, is in
docs/refactor/DELETION.md.

- A character can be deleted by its owner while it is on no campaign's roster (not
  active, not pending). A retired character, still tagged with its old campaign, can be.
- A campaign can be deleted by its GM, the Lightkeeper. Its characters are not deleted:
  every character on its roster (active or pending, RELEASED_STATUSES) goes back to its
  owner as unaffiliated, with no campaign. The campaign keeps a list of them as they
  were (released_characters), so an undo or a restore can put back the ones still free.
  A retired character stays tagged with the campaign: it is hidden with it (the
  registry leaves it out, hidden_with_their_campaign) and comes back with it.
- The same user can undo a delete for UNDO_SECONDS. After that only an admin can
  restore it (restore_character and restore_campaign without a user), within KEEP_DAYS.

Every function here that changes rows first locks the rows it decides on (SELECT ...
FOR UPDATE, _locked) and reads them as they are once the lock is held. /campaign/join
(engine.request_join_campaign) and /campaign/rejoin (routers/campaigns.rejoin) lock
too: the campaign row FOR SHARE, then the character row. So two deletes of one
campaign, a delete and a join, a delete and a restore, or a restore and a join cannot
cross: the second waits for the first to commit and then sees what it did (a second
delete finds nothing to delete, a join finds the campaign gone or the character back
on a roster). Each of them rolls back before an error leaves it, which lets go of its
locks at once (vtt.db.releases_locks_on_error), and no lock wait lasts longer than
vtt.db.LOCK_TIMEOUT_MS.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import INCLUDE_DELETED, Campaign, Character
from vtt.auth import ROSTER_STATUSES
from vtt.db import releases_locks_on_error

# How long the user who deleted something can undo it themself. The roster book keeps
# each delete's Undo for this long, less a few seconds for the request to get there.
UNDO_SECONDS = 120
# How long deleted rows are kept for an admin to restore. Nothing removes them yet; a
# later purge job would remove rows deleted longer ago than this (DELETION.md).
KEEP_DAYS = 30
# The characters a campaign delete lets go: those on its roster. The Lightkeeper
# Ledger's count (investigator_count) counts the same ones.
RELEASED_STATUSES = ROSTER_STATUSES

IN_A_CAMPAIGN = "An investigator in a campaign cannot be deleted."
CHARACTER_NOT_FOUND = "Investigator dossier not found."
CAMPAIGN_NOT_FOUND = "Campaign not found"
NOTHING_TO_RESTORE = "Nothing to restore."
TOO_LATE = "It is too late to undo this."


def utcnow() -> datetime:
    """Now in UTC without a time zone, as deleted_at is stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _locked(query):
    """The query's rows, locked until the commit (FOR UPDATE) and read as they are once
    the lock is held: a row this session already has gets its values refreshed
    (populate_existing), and PostgreSQL checks the query's conditions again against a
    row that another transaction changed while this one waited."""
    return query.populate_existing().with_for_update()


def _refuse(status: int, detail: str) -> HTTPException:
    """The error to raise. Every function that raises it is wrapped in
    releases_locks_on_error, which rolls back first and so lets go of the locks taken."""
    return HTTPException(status_code=status, detail=detail)


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


def hidden_with_their_campaign(db: Session, characters) -> set:
    """The ids of those characters that are tagged with a deleted campaign: the retired
    characters a campaign delete left with it. Lists of a user's characters leave them
    out until the campaign comes back."""
    tagged = {c.campaign_id for c in characters if c.campaign_id is not None}
    if not tagged:
        return set()
    live = {row.id for row in db.query(Campaign.id).filter(Campaign.id.in_(tagged))}
    return {c.id for c in characters if c.campaign_id is not None and c.campaign_id not in live}


# --- characters -------------------------------------------------------------------

@releases_locks_on_error
def delete_character(db: Session, character_id) -> Character:
    """Soft-deletes a character that is on no roster (409 otherwise; 404 when it is
    gone already). The caller checks that the user owns it. Commits and returns it."""
    character = _locked(db.query(Character).filter(Character.id == character_id)).first()
    if character is None:
        raise _refuse(404, CHARACTER_NOT_FOUND)
    if character.status in ROSTER_STATUSES:
        raise _refuse(409, IN_A_CAMPAIGN)
    character.deleted_at = utcnow()
    db.commit()
    return character


@releases_locks_on_error
def restore_character(db: Session, character_id, user_id=None) -> Character:
    """Brings back a deleted character as it was. With user_id (the undo) only its owner
    may, and only within UNDO_SECONDS; anyone else gets 404, as if nothing were there.
    Without user_id (an admin) there is no time limit. Commits."""
    character = _locked(deleted_query(db, Character).filter(Character.id == character_id)).first()
    if character is None or (user_id is not None and character.user_id != user_id):
        raise _refuse(404, NOTHING_TO_RESTORE)
    if user_id is not None and not within_undo(character.deleted_at):
        raise _refuse(409, TOO_LATE)
    character.deleted_at = None
    db.commit()
    db.refresh(character)
    return character


# --- campaigns --------------------------------------------------------------------

@releases_locks_on_error
def delete_campaign(db: Session, campaign_id):
    """Soft-deletes a campaign and lets the characters on its roster go: each active or
    pending one becomes unaffiliated with no campaign. Retired characters stay tagged
    with it. Returns (campaign, the released characters as they were: {"id", "status"}),
    and the campaign keeps that list. 404 when it is gone already (a second delete that
    waited for the first). The caller checks that the user is its GM. Commits."""
    campaign = _locked(db.query(Campaign).filter(Campaign.id == campaign_id)).first()
    if campaign is None:
        raise _refuse(404, CAMPAIGN_NOT_FOUND)
    released = _locked(db.query(Character).filter(
        Character.campaign_id == campaign.id,
        Character.status.in_(RELEASED_STATUSES),
    ).order_by(Character.id)).all()
    snapshot = [{"id": c.id, "status": c.status} for c in released]
    for c in released:
        c.status = "unaffiliated"
        c.campaign_id = None
    campaign.released_characters = snapshot
    campaign.deleted_at = utcnow()
    db.commit()
    return campaign, snapshot


def _free_query(db: Session, campaign: Campaign):
    """The characters the campaign let go that are still free: not deleted,
    unaffiliated, in no campaign."""
    ids = [entry["id"] for entry in (campaign.released_characters or [])]
    return db.query(Character).filter(
        Character.id.in_(ids),
        Character.campaign_id.is_(None),
        Character.status == "unaffiliated",
    ).order_by(Character.id)


def still_free(db: Session, campaign: Campaign) -> list:
    """The characters a restore of this deleted campaign would put back, as they are
    now (restore_deleted.py shows them before it asks)."""
    return _free_query(db, campaign).all() if campaign.released_characters else []


@releases_locks_on_error
def restore_campaign(db: Session, campaign_id, user_id=None, put_back=True):
    """Brings back a deleted campaign, and puts each character it let go back the way
    it was, if that character is still free: not deleted, unaffiliated, in no campaign
    (one that joined another campaign or was deleted meanwhile stays where it is). With
    put_back=False (an admin's choice) the characters stay free. With user_id (the
    undo) only its GM may, within UNDO_SECONDS; anyone else gets 404.
    Returns (campaign, ids of the characters put back). Commits."""
    campaign = _locked(deleted_query(db, Campaign).filter(Campaign.id == campaign_id)).first()
    if campaign is None or (user_id is not None and campaign.gm_user_id != user_id):
        raise _refuse(404, NOTHING_TO_RESTORE)
    if user_id is not None and not within_undo(campaign.deleted_at):
        raise _refuse(409, TOO_LATE)
    before = {entry["id"]: entry["status"] for entry in (campaign.released_characters or [])}
    restored = []
    if put_back and before:
        for c in _locked(_free_query(db, campaign)).all():
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
