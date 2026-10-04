"""Database engine, session factory, the get_db dependency, and init_db (seed rows plus additive migrations).

Everything here reads db_engine and SessionLocal from this module at call time,
so replacing them (main.py forwards main.db_engine and main.SessionLocal here,
which the tests use) redirects init_db, get_db and the WebSocket handler.
"""
import secrets

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from models import Circle, PasswordResetToken, User
from vtt.config import SQLALCHEMY_DATABASE_URL, logger
from vtt.security import pwd_context

_connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
db_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    an unusable one. Returns the usernames it changed. Uses column queries, so it also
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
                    {User.hashed_password: unusable_password_hash()}, synchronize_session=False)
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


def init_db():
    """Seed required rows, run additive ALTER TABLE migrations, then retire published
    passwords. Each migration is idempotent: add_columns skips a column that exists
    already and logs any other failure. The ALTERs add the types the models declare, and flag columns
    that older ALTERs added as INTEGER are converted to BOOLEAN (convert_integer_flags). The seeded admin (user 1, which owns characters forged before
    login tokens) gets a random password nobody knows. Tables added after the first
    release (password_reset_tokens) are created here when missing, so init_db alone
    brings an older database up to date."""
    db = SessionLocal()
    try:
        circle = db.query(Circle).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)

        # A column query, so the seed also works on a users table that predates google_sub.
        admin_user = db.query(User.id).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                id=1,
                username="admin",
                email="admin@archive.com",
                hashed_password=unusable_password_hash()
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

    # Password reset links. main.py's create_all makes the table on a normal start; this
    # makes it (with its indexes) on a database that only init_db upgrades. checkfirst
    # leaves an existing table and its rows alone.
    try:
        PasswordResetToken.__table__.create(bind=db_engine, checkfirst=True)
    except Exception as e:
        logger.error("Could not create the password_reset_tokens table: %s", e)

    convert_integer_flags()
    retire_published_passwords()
