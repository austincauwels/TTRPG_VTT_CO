"""Database engine, session factory, the get_db dependency, and init_db (seed rows plus additive migrations).

Everything here reads db_engine and SessionLocal from this module at call time,
so replacing them (main.py forwards main.db_engine and main.SessionLocal here,
which the tests use) redirects init_db, get_db and the WebSocket handler.
"""
import functools
import secrets

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from models import Circle, EmailChangeToken, EmailChangeUndo, PasswordResetToken, User, UsernameHold
from vtt import config
from vtt.config import SQLALCHEMY_DATABASE_URL, logger
from vtt.security import pwd_context

# How long a statement waits for a lock before it fails (PostgreSQL lock_timeout, in
# milliseconds), on every connection of the app's engine. The routes are async and the
# driver blocks, so a request that waits for a row lock stops the event loop, and with it
# every other request and socket, until it gets the lock. Without a limit a lock that is
# never let go hangs the server; with one, the waiting request fails after this long
# (503, vtt/application.py) and everything else carries on.
LOCK_TIMEOUT_MS = 5000
# PostgreSQL's lock_not_available, the error a lock_timeout or a NOWAIT raises.
LOCK_NOT_AVAILABLE = "55P03"


def _connect_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    if make_url(url).get_backend_name() == "postgresql":
        return {"options": f"-c lock_timeout={LOCK_TIMEOUT_MS}"}
    return {}


db_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=_connect_args(SQLALCHEMY_DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_lock_timeout(error) -> bool:
    """True for the error a statement gets when it could not have a lock in time."""
    return getattr(getattr(error, "orig", None), "pgcode", None) == LOCK_NOT_AVAILABLE


def releases_locks_on_error(fn):
    """For a function that locks rows (SELECT ... FOR UPDATE or FOR SHARE) in the
    session it gets as its first argument and commits when it succeeds. If it raises,
    the session is rolled back before the error goes on, which lets go of the locks at
    once. What this is for is a refusal (an HTTPException) raised while the transaction
    is fine: PostgreSQL itself lets go of a transaction's locks when one of its
    statements fails, but not of a healthy transaction's.

    Left to get_db, the locks were held until it closed the session, after the
    response. An async route awaits on the way there, so other requests ran in the
    meantime, and one that needed a locked row waited for it on the event loop (the
    driver blocks). That stopped the loop, so the session holding the lock was never
    closed and the server hung."""
    @functools.wraps(fn)
    def wrapper(db, *args, **kwargs):
        try:
            return fn(db, *args, **kwargs)
        except BaseException:
            db.rollback()
            raise
    return wrapper

# Seeded accounts whose passwords are published in this repository: init_db before
# 2026-10-04 (admin), reset_seed.py and seed_test_players.py (testpass). Login tokens
# give real ownership, so init_db replaces these passwords wherever they still work.
PUBLISHED_PASSWORDS = {
    "admin": "admin",
    "elara_voss": "testpass",
    "rook_halcyon": "testpass",
    "sable_devereux": "testpass",
    "finn_ashcroft": "testpass",
    "keeper_test": "testpass",
}


def unusable_password_hash():
    """A hash of a random password nobody is told, so the account cannot log in."""
    return pwd_context.hash(secrets.token_urlsafe(32))


def retire_published_passwords():
    """Give every account in PUBLISHED_PASSWORDS that still has its published password
    an unusable one (has_password false). Returns the usernames it changed. Uses column queries, so it also
    runs on a database whose users table predates some model columns."""
    db = SessionLocal()
    changed = []
    try:
        rows = db.query(User.id, User.username, User.hashed_password).filter(
            User.username.in_(list(PUBLISHED_PASSWORDS))).all()
        for row in rows:
            try:
                published = pwd_context.verify(PUBLISHED_PASSWORDS[row.username], row.hashed_password)
            except (ValueError, TypeError):
                published = False  # not a hash passlib can read, so not the published password
            if published:
                db.query(User).filter(User.id == row.id).update(
                    {User.hashed_password: unusable_password_hash(), User.has_password: False},
                    synchronize_session=False)
                changed.append(row.username)
        db.commit()
        if changed:
            logger.warning("Replaced the published password of: %s", ", ".join(sorted(changed)))
    except Exception as e:
        db.rollback()
        logger.error("Error replacing published passwords: %s", e)
    finally:
        db.close()
    return changed


# Flag columns that the ALTERs in init_db used to add as INTEGER DEFAULT 0, although the
# models declare Boolean. PostgreSQL refuses True and False for an integer column, so on
# a database that got one of these through the old ALTER every write of the flag failed.
# train_bonus did exactly that: every forge and every train action failed on the live
# database until it was converted by hand on 2026-10-04.
INTEGER_FLAG_COLUMNS = [
    ("characters", "train_bonus"),
    ("circles", "is_finalized"),
    ("circles", "resources_editable"),
    ("circles", "reports_open"),
    ("campaigns", "roster_finalized"),
    ("notebook_entries", "is_deleted"),
]


def rename_relationship_types():
    """The rulebook's Bully relationship (pp. 34 to 37) was named Antagonist in the app.
    Renames stored rows, including a counter's proposed type; safe on every start."""
    try:
        with db_engine.begin() as conn:
            conn.execute(text("UPDATE relationships SET rel_type = 'Bully' WHERE rel_type = 'Antagonist'"))
            conn.execute(text("UPDATE relationships SET counter_type = 'Bully' WHERE counter_type = 'Antagonist'"))
    except Exception as e:
        logger.error("Error renaming relationship types: %s", e)


def convert_integer_flags():
    """Convert any column in INTEGER_FLAG_COLUMNS that is still an integer to BOOLEAN
    DEFAULT FALSE (0 becomes false, anything else true). Columns that are already
    boolean are left alone, so this is safe on every start. PostgreSQL only: SQLite
    stores booleans as integers anyway. Returns the "table.column" names it changed."""
    if db_engine.dialect.name != "postgresql":
        return []
    converted = []
    for table, col in INTEGER_FLAG_COLUMNS:
        try:
            with db_engine.connect() as conn:
                data_type = conn.execute(text(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_schema = current_schema() AND table_name = :t AND column_name = :c"),
                    {"t": table, "c": col}).scalar()
                if data_type not in ("smallint", "integer", "bigint"):
                    continue
                conn.execute(text(
                    f"ALTER TABLE {table} ALTER COLUMN {col} DROP DEFAULT, "
                    f"ALTER COLUMN {col} TYPE BOOLEAN USING ({col} <> 0), "
                    f"ALTER COLUMN {col} SET DEFAULT FALSE"))
                conn.commit()
                converted.append(f"{table}.{col}")
        except Exception as e:
            logger.error("Could not convert %s.%s to boolean: %s", table, col, e)
    if converted:
        logger.warning("Converted integer flag columns to boolean: %s", ", ".join(converted))
    return converted


def _is_duplicate_column(error) -> bool:
    """True for the error ALTER TABLE ... ADD COLUMN gets when the column is there
    already: PostgreSQL's duplicate_column (SQLSTATE 42701), SQLite's "duplicate column
    name"."""
    if getattr(getattr(error, "orig", None), "pgcode", None) == "42701":
        return True
    return "duplicate column" in str(error).lower()


def add_columns(table: str, columns) -> list:
    """ALTER TABLE table ADD COLUMN for each (name, type and default), each in its own
    transaction. A column that is there already is skipped without a word; any other
    failure is logged, because the models then read a column the table lacks and every
    query of that table fails. Returns the names it added."""
    added = []
    for col, typedef in columns:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typedef}"))
                conn.commit()
            added.append(col)
        except Exception as e:
            if not _is_duplicate_column(e):
                logger.error("Could not add the column %s.%s: %s", table, col, e)
    return added


def run_migration(sql: str, failure: str) -> bool:
    """Runs one migration statement in its own transaction; logs failure and the error
    if it fails. Returns whether it ran."""
    try:
        with db_engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        return True
    except Exception as e:
        logger.error("%s: %s", failure, e)
        return False


def warn_password_only_accounts():
    """While password sign-in is off (ALLOW_PASSWORD_LOGIN), logs a warning with the
    number of accounts that have no Google sign-in, the seeded ones left out: none of
    them can sign in directly. Each can still get in with Google, by a Google account
    with its email address or by linking one with its username and password on the
    sign-in screen. An account that removed its Google sign-in while password sign-in
    was on is one of them. Returns the number (None while password sign-in is on)."""
    if config.ALLOW_PASSWORD_LOGIN:
        return None
    db = SessionLocal()
    try:
        count = db.query(User.id).filter(User.google_sub.is_(None),
                                         User.username.notin_(list(PUBLISHED_PASSWORDS))).count()
    except Exception as e:
        logger.error("Could not count the accounts without Google sign-in: %s", e)
        return None
    finally:
        db.close()
    if count:
        logger.warning("Password sign-in is off (ALLOW_PASSWORD_LOGIN) and %d account(s) have no Google sign-in, "
                       "so they cannot sign in until they link a Google account on the sign-in screen", count)
    return count


def init_db():
    """Seed required rows, run additive ALTER TABLE migrations, then retire published
    passwords. Each migration is idempotent: add_columns skips a column that exists
    already and logs any other failure. The ALTERs add the types the models declare, and flag columns
    that older ALTERs added as INTEGER are converted to BOOLEAN (convert_integer_flags). The seeded admin (user 1, which owns characters forged before
    login tokens) gets a random password nobody knows. Tables added after the first
    release (password_reset_tokens, email_change_tokens, email_change_undos,
    username_holds) are created here when missing, and the columns added to them since
    (password_reset_tokens.replaced_at, email_change_undos.google_sub) are added, so
    init_db alone brings an older database up to date. Last, with password sign-in off, it warns how many accounts
    have no Google sign-in (warn_password_only_accounts)."""
    db = SessionLocal()
    try:
        # Column queries, so the seed also works on tables that predate a column added
        # below: loading the whole row failed on the first start after an upgrade that
        # added a column (circles.stamina_dice_used), and skipped the seed with an error.
        circle = db.query(Circle.id).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)

        admin_user = db.query(User.id).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                id=1,
                username="admin",
                email="admin@archive.com",
                hashed_password=unusable_password_hash(),
                has_password=False,
            )
            db.add(new_admin)

        db.commit()
    except Exception as e:
        logger.error("Error seeding database: %s", e)
    finally:
        db.close()

    # The additive migrations, in the order they were written. add_columns skips a
    # column that exists already and logs any other failure.
    add_columns("circles", [
        ("guard_patrol", "INTEGER DEFAULT 0"),
        ("miasma_bleed", "INTEGER DEFAULT 0"),
        ("location",     "TEXT DEFAULT ''"),
        ("atmosphere",   "TEXT DEFAULT ''"),
    ])
    add_columns("campaigns", [("gm_user_id", "INTEGER")])
    add_columns("characters", [("role", "TEXT DEFAULT ''"), ("specialty", "TEXT DEFAULT ''")])
    add_columns("circles", [
        ("chapter_house_location", "TEXT"),
        ("circle_ability",         "TEXT"),
        ("insignia",               "TEXT"),
        ("backstory_answers",      "JSON DEFAULT '{}'"),
        ("is_finalized",           "BOOLEAN DEFAULT FALSE"),
    ])
    add_columns("campaigns", [("roster_finalized", "BOOLEAN DEFAULT FALSE")])
    add_columns("characters", [("personal_circle_answer", "TEXT DEFAULT ''")])
    add_columns("relationships", [("last_actor_id", "INTEGER")])
    add_columns("circles", [("illumination", "INTEGER DEFAULT 0")])
    add_columns("circles", [
        ("tension_clock", "INTEGER DEFAULT 0"),
        ("tension_label", "TEXT DEFAULT ''"),
    ])

    # The tension clock used to start full (4 of 4); new circles now start it empty.
    # Existing circles keep whatever value their GM left them at.
    run_migration("ALTER TABLE circles ALTER COLUMN tension_clock SET DEFAULT 0",
                  "Could not set the default of circles.tension_clock")

    add_columns("characters", [(col, "INTEGER DEFAULT 0") for col in
                               ("nerve_resistance_spent", "cunning_resistance_spent", "intuition_resistance_spent")])
    add_columns("notebook_entries", [
        ("entry_type", "TEXT DEFAULT 'field_log'"),
        ("visibility",  "TEXT DEFAULT 'all'"),
        ("image_data",  "TEXT"),
        ("is_deleted",  "BOOLEAN DEFAULT FALSE"),
    ])
    add_columns("circles", [
        ("resources_editable", "BOOLEAN DEFAULT FALSE"),
        ("reports_open",       "BOOLEAN DEFAULT FALSE"),
    ])
    add_columns("circles", [("campaign_id", "INTEGER REFERENCES campaigns(id)")])
    add_columns("characters", [("ability_uses", "JSON DEFAULT '{}'")])
    add_columns("users", [("pending_rejoin_campaign_id", "INTEGER")])
    add_columns("characters", [
        ("train_bonus",                "BOOLEAN DEFAULT FALSE"),
        ("resources_spent_assignment", "INTEGER DEFAULT 0"),
    ])
    # Train dice as a count (a second Train used to set the flag again and give nothing).
    # A row whose flag is set and count is 0 has one die waiting (train_dice_left).
    add_columns("characters", [("train_dice", "INTEGER DEFAULT 0")])

    # Sign in with Google. The index has the name create_all gives it, so a database
    # made either way ends up with the same one.
    add_columns("users", [("google_sub", "TEXT")])
    try:
        with db_engine.connect() as conn:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)"))
            conn.commit()
    except Exception as e:
        logger.error("Could not create the unique index on users.google_sub: %s", e)
    # Which Google email a link was made with, and whether the account's email has been
    # proven (docs/refactor/AUTH.md). Existing rows get NULL and false: their links
    # count as unproven.
    add_columns("users", [
        ("google_email", "TEXT"),
        ("email_proven", "BOOLEAN DEFAULT FALSE"),
    ])

    # Deleting characters and campaigns (docs/refactor/DELETION.md). Existing rows get
    # NULL: nothing was deleted before these columns existed, so every row stays visible.
    # Every Character and Campaign query reads deleted_at, so if adding it fails for any
    # reason but "already there", every one of them fails: the log says why.
    add_columns("characters", [("deleted_at", "TIMESTAMP")])
    add_columns("campaigns", [
        ("deleted_at",          "TIMESTAMP"),
        ("released_characters", "JSON"),
    ])

    # Whether someone chose the account's password (the account page, docs/refactor/AUTH.md).
    # Existing rows get NULL: not known.
    add_columns("users", [("has_password", "BOOLEAN")])

    # The session epoch (the account page's Remove Google sign-in ends every session with
    # it, docs/refactor/AUTH.md). Existing rows get 0, which keeps their login tokens.
    add_columns("users", [("session_epoch", "INTEGER DEFAULT 0")])

    # Password reset links, email change links and their undo links, and the names held
    # after a rename. main.py's create_all makes the tables on a normal start; this makes
    # them (with their indexes) on a database that only init_db upgrades. checkfirst
    # leaves an existing table and its rows alone.
    for table in (PasswordResetToken.__table__, EmailChangeToken.__table__, EmailChangeUndo.__table__,
                  UsernameHold.__table__):
        try:
            table.create(bind=db_engine, checkfirst=True)
        except Exception as e:
            logger.error("Could not create the %s table: %s", table.name, e)
    # Columns added to those tables later (docs/refactor/AUTH.md): when a newer reset link
    # replaced a row, and the Google link an account had when a change of address went
    # through. Existing rows get NULL: not replaced, and no link recorded.
    add_columns("password_reset_tokens", [("replaced_at", "INTEGER")])
    add_columns("email_change_undos", [("google_sub", "TEXT")])

    # A drawn sketch's scene, kept for its author (vtt/sketch_scenes.py). Existing entries
    # get NULL: no drawing to reopen, and has_scene is false. Every NotebookEntry query
    # reads has_scene, so if adding it fails for any reason but "already there", the log
    # says why.
    add_columns("notebook_entries", [("sketch_scene", "TEXT")])

    # Stamina Training's dice used this assignment (RULES_CHECK.md item 20). Existing rows get 0.
    add_columns("circles", [("stamina_dice_used", "INTEGER DEFAULT 0")])

    # Circle advancement picks (RULES_CHECK.md item 14). Existing rows get 0 and an empty
    # list: no advancement waiting.
    add_columns("characters", [
        ("advancement_picks", "INTEGER DEFAULT 0"),
        ("advancement_taken", "JSON DEFAULT '[]'"),
        # One Last Run's set of four options (rulebook p. 41); others are sets of two
        ("advancement_set", "INTEGER DEFAULT 2"),
    ])
    # Great Wards: who holds the Weird's ward (rulebook p. 27). Nobody does on existing rows.
    add_columns("characters", [("warded_by_id", "INTEGER")])
    # The Lightkeeper's countdown beside the hourglass (vtt/countdown.py). Existing circles
    # get no timer, stopped and hidden. Its end is epoch milliseconds, past INTEGER's range.
    add_columns("circles", [
        ("timer_duration_ms",  "INTEGER DEFAULT 0"),
        ("timer_remaining_ms", "INTEGER DEFAULT 0"),
        ("timer_ends_at",      "BIGINT"),
        ("timer_running",      "BOOLEAN DEFAULT FALSE"),
        ("timer_visible",      "BOOLEAN DEFAULT FALSE"),
    ])
    # The Lightkeeper's dispatch in their own words, beside the template's location and
    # atmosphere. Existing circles get none.
    add_columns("circles", [("dispatch_text", "TEXT DEFAULT ''")])

    convert_integer_flags()
    rename_relationship_types()
    retire_published_passwords()
    warn_password_only_accounts()
