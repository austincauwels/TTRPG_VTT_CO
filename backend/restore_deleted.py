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

Restoring a campaign does not tell anyone; its players see it again the next time they
open the roster book. See docs/refactor/DELETION.md.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import HTTPException  # noqa: E402

from vtt import db as vtt_db  # noqa: E402  (loads .env and checks SECRET_KEY, as the app does)
from vtt import deletion  # noqa: E402


def _when(row) -> str:
    return row.deleted_at.strftime("%Y-%m-%d %H:%M UTC")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="List and restore deleted characters and campaigns.")
    sub = parser.add_subparsers(dest="command", required=True)
    listing = sub.add_parser("list", help="deleted characters and campaigns")
    listing.add_argument("--days", type=int, default=deletion.KEEP_DAYS)
    sub.add_parser("character", help="restore a character").add_argument("id", type=int)
    sub.add_parser("campaign", help="restore a campaign").add_argument("id", type=int)
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
                print(f"  campaign {c.id}  {c.name!r}  code {c.campaign_code}  GM user {c.gm_user_id}  "
                      f"{released} characters let go  deleted {_when(c)}")
            if not rows["characters"] and not rows["campaigns"]:
                print("  nothing")
            return 0
        try:
            if args.command == "character":
                character = deletion.restore_character(db, args.id)
                print(f"Restored character {character.id} {character.name!r} ({character.status}).")
            else:
                campaign, restored = deletion.restore_campaign(db, args.id)
                back = ", ".join(str(i) for i in restored) or "none"
                print(f"Restored campaign {campaign.id} {campaign.name!r}. Characters put back: {back}.")
        except HTTPException as e:
            print(f"No deleted {args.command} with id {args.id}." if e.status_code == 404 else e.detail)
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
