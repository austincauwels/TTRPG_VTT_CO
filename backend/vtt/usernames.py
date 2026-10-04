"""Usernames: how two names are compared, and the names held after a rename.

A new username (register, an account made with Google, the account page) follows
check_new_username in vtt/schemas.py: surrounding whitespace dropped, runs of spaces
made one, then 2 to 32 of the ASCII letters, digits, spaces, dots, dashes and
underscores. Two names are the same name when their keys are equal (username_key):
whitespace at either end dropped, runs of whitespace inside made one space, lower case.
Register used to take "mira " and "mira\\n" next to "mira", which look the same wherever
a name is shown, and letters from any script.

A name freed by a rename is held for its former owner for USERNAME_HOLD_DAYS (table
username_holds): nobody else may take it meanwhile, so a GM who invites a player to
rejoin by the name they knew (the invite skips the GM's approval) cannot reach a
stranger who took that name. The former owner may take it back.
"""
import time
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import User, UsernameHold

USERNAME_HOLD_DAYS = 90


def now() -> int:
    return int(time.time())


def username_key(name: Optional[str]) -> str:
    """The form names are compared in: "  Mira   Bell\\n" and "mira bell" are one name."""
    return " ".join((name or "").split()).lower()


def name_taken(db: Session, username: str, except_user_id: Optional[int] = None) -> bool:
    """True when another user has this name (by username_key), or holds it after a
    rename. except_user_id leaves that user's own name and holds out."""
    key = username_key(username)
    # The database narrows the rows down (spaces and the one newline register let
    # through removed, lower case); username_key decides.
    squashed = func.lower(func.replace(func.replace(User.username, " ", ""), "\n", ""))
    rows = db.query(User.id, User.username).filter(squashed == key.replace(" ", ""))
    if except_user_id is not None:
        rows = rows.filter(User.id != except_user_id)
    if any(username_key(row.username) == key for row in rows.all()):
        return True
    held = db.query(UsernameHold.id).filter(UsernameHold.name_key == key, UsernameHold.held_until > now())
    if except_user_id is not None:
        held = held.filter(UsernameHold.user_id != except_user_id)
    return held.first() is not None


def hold_freed_name(db: Session, user_id: int, old_name: Optional[str], new_name: str) -> None:
    """After a rename: holds the old name for the user for USERNAME_HOLD_DAYS, and ends
    the user's own hold on the new name (taking a held name back). Expired holds are
    deleted. The caller commits."""
    issued_at = now()
    db.query(UsernameHold).filter(UsernameHold.held_until <= issued_at).delete(synchronize_session=False)
    old_key, new_key = username_key(old_name), username_key(new_name)
    db.query(UsernameHold).filter(UsernameHold.user_id == user_id,
                                  UsernameHold.name_key.in_([old_key, new_key])).delete(synchronize_session=False)
    if old_key and old_key != new_key:
        db.add(UsernameHold(user_id=user_id, name_key=old_key,
                            held_until=issued_at + USERNAME_HOLD_DAYS * 24 * 60 * 60))
