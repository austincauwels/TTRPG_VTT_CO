"""Admin tool: list and restore deleted characters and campaigns.

Players and Lightkeepers can undo their own delete for a couple of minutes from the
roster book. After that a deleted row stays in the database (KEEP_DAYS, 30 days) and
only an admin brings it back, with this script, on the server, with the app's .env
(it uses the same DATABASE_URL as the app):

  python3 backend/restore_deleted.py list [--days N]   deleted in the last N days (30)
  python3 backend/restore_deleted.py character ID      restore one character
  python3 backend/restore_deleted.py campaign ID       restore a campaign and put back
                                                       the characters it let go that
                                                       are still free

A campaign deleted more than a day ago let its characters go that long ago, and their
players may be using them elsewhere by now (in no campaign, but planning to join one).
So before it puts any of them back the script lists them and asks; --put-back or
--leave-free answers in advance (without either, and with no one to ask, they stay
free). A campaign deleted less than a day ago puts them back without asking, as the
undo does.

Restoring a campaign does not tell anyone; its players see it again the next time they
open the roster book. See docs/refactor/DELETION.md.

A restore locks its rows as the app does, and waits for a lock no longer than the app
(vtt.db.LOCK_TIMEOUT_MS): if a request holds one that long, it stops and says so, and
nothing has changed.
"""
import argparse
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import HTTPException  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402

from models import Character  # noqa: E402
from vtt import db as vtt_db  # noqa: E402  (loads .env and checks SECRET_KEY, as the app does)
from vtt import deletion  # noqa: E402

# Characters a campaign let go longer ago than this are only put back after the admin
# says so.
ASK_AFTER = timedelta(days=1)


def _when(row) -> str:
    return row.deleted_at.strftime("%Y-%m-%d %H:%M UTC")


def _ask(question: str) -> bool:
    """A yes or no from whoever runs the script; no answer (no terminal) is no."""
    try:
        answer = input(f"{question} [y/N] ")
    except (EOFError, OSError):
        print()
        return False
    return answer.strip().lower() in ("y", "yes")


def _put_back(db, campaign, choice) -> bool:
    """Whether the restore puts the campaign's characters back: choice (from
    --put-back or --leave-free) if given, else yes for a campaign deleted less than
    ASK_AFTER ago, else the admin's answer to a question that names them."""
    if choice is not None:
        return choice
    free = deletion.still_free(db, campaign)
    if not free or deletion.utcnow() - campaign.deleted_at <= ASK_AFTER:
        return True
    before = {entry["id"]: entry["status"] for entry in campaign.released_characters or []}
    print(f"Campaign {campaign.id} {campaign.name!r} was deleted {_when(campaign)}. These characters it let "
          f"go are still free; their players may be planning to use them elsewhere:")
    for c in free:
        print(f"  character {c.id}  {c.name!r}  owner user {c.user_id}  was {before.get(c.id)}")
    db.rollback()  # no transaction stays open while the question waits
    return _ask("Put them back in the campaign as they were?")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="List and restore deleted characters and campaigns.")
    sub = parser.add_subparsers(dest="command", required=True)
    listing = sub.add_parser("list", help="deleted characters and campaigns")
    listing.add_argument("--days", type=int, default=deletion.KEEP_DAYS)
    sub.add_parser("character", help="restore a character").add_argument("id", type=int)
    restoring = sub.add_parser("campaign", help="restore a campaign")
    restoring.add_argument("id", type=int)
    answer = restoring.add_mutually_exclusive_group()
    answer.add_argument("--put-back", dest="put_back", action="store_const", const=True, default=None,
                        help="put back the characters it let go without asking")
    answer.add_argument("--leave-free", dest="put_back", action="store_const", const=False,
                        help="restore the campaign only; its characters stay free")
    args = parser.parse_args(argv)

    db = vtt_db.SessionLocal()
    try:
        if args.command == "list":
            rows = deletion.deleted_rows(db, days=args.days)
            print(f"Deleted in the last {args.days} days:")
            for c in rows["characters"]:
                print(f"  character {c.id}  {c.name!r}  owner user {c.user_id}  {c.status}  deleted {_when(c)}")
            for c in rows["campaigns"]:
                released = len(c.released_characters or [])
                kept = db.query(Character.id).filter(Character.campaign_id == c.id).count()
                print(f"  campaign {c.id}  {c.name!r}  code {c.campaign_code}  GM user {c.gm_user_id}  "
                      f"{released} characters let go, {kept} retired kept with it  deleted {_when(c)}")
            if not rows["characters"] and not rows["campaigns"]:
                print("  nothing")
            return 0
        try:
            if args.command == "character":
                character = deletion.restore_character(db, args.id)
                print(f"Restored character {character.id} {character.name!r} ({character.status}).")
            else:
                campaign = deletion.deleted_campaign(db, args.id)
                if campaign is None:
                    raise HTTPException(status_code=404)
                put_back = _put_back(db, campaign, args.put_back)
                campaign, restored = deletion.restore_campaign(db, args.id, put_back=put_back)
                back = ", ".join(str(i) for i in restored) or "none"
                print(f"Restored campaign {campaign.id} {campaign.name!r}. Characters put back: {back}.")
        except HTTPException as e:
            print(f"No deleted {args.command} with id {args.id}." if e.status_code == 404 else e.detail)
            return 1
        except OperationalError as e:
            if not vtt_db.is_lock_timeout(e):
                raise
            print(f"The app is changing this {args.command} right now, so nothing was restored. Try again.")
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
