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

So that one account cannot hold many names nobody else may take, renames are capped
(rename_refusal): RENAME_LIMIT renames a day per user, and at most MAX_HOLDS_PER_USER
names held for one user at a time. A change of case only frees no name and counts
against neither; taking back a held name ends that hold, so it never adds one.
"""
import math
import time
from typing import Optional

from limits import parse as parse_limit
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import User, UsernameHold
from vtt.config import logger
from vtt.security import limiter

USERNAME_HOLD_DAYS = 90
# Renames that free a name, per user, counted in the rate limiter's storage (in memory,
# off while the limiter is off, like the other per-user counts).
RENAME_LIMIT = parse_limit("3/day")
RENAME_SCOPE = "username-rename"
# Names held for one user at a time (in the database, always on).
MAX_HOLDS_PER_USER = 5

RENAMES_LIMITED = "You can change your username 3 times a day. Please try again tomorrow."


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


def frees_a_name(old_name: Optional[str], new_name: str) -> bool:
    """True when a rename frees the old name (more than a change of case or spaces)."""
    return username_key(old_name) != username_key(new_name)


def holds_full(days: int) -> str:
    """The refusal when the user holds MAX_HOLDS_PER_USER names already."""
    when = "1 day" if days == 1 else f"{days} days"
    return (f"Your last {MAX_HOLDS_PER_USER} usernames are still held for you. "
            f"You can change it again in {when}, or go back to one of them.")


def rename_refusal(db: Session, user_id: int, old_name: Optional[str], new_name: str) -> Optional[str]:
    """None when the user may make this rename, which frees old_name; else the detail
    for the 429. The user's renames today (RENAME_LIMIT), then the names the user would
    hold after it: their live holds, less a hold on the new name (taking a held name
    back ends it), plus the old name; at most MAX_HOLDS_PER_USER. Counts nothing
    (count_rename does, once the rename is saved)."""
    if limiter.enabled and not limiter.limiter.test(RENAME_LIMIT, RENAME_SCOPE, str(user_id)):
        logger.warning("Refused a rename of user id=%s: %s", user_id, RENAME_LIMIT)
        return RENAMES_LIMITED
    current = now()
    staying = db.query(UsernameHold.held_until).filter(
        UsernameHold.user_id == user_id, UsernameHold.held_until > current,
        UsernameHold.name_key.notin_([username_key(old_name), username_key(new_name)]),
    ).order_by(UsernameHold.held_until).all()
    over = len(staying) + 1 - MAX_HOLDS_PER_USER
    if over <= 0:
        return None
    # The rename can go once `over` of the holds that stay have ended, the oldest first.
    free_at = staying[over - 1].held_until
    logger.warning("Refused a rename of user id=%s: it holds %d names", user_id, len(staying))
    return holds_full(max(1, math.ceil((free_at - current) / (24 * 60 * 60))))


def count_rename(user_id: int) -> None:
    """Counts a saved rename that freed a name against RENAME_LIMIT."""
    if limiter.enabled:
        limiter.limiter.hit(RENAME_LIMIT, RENAME_SCOPE, str(user_id))
