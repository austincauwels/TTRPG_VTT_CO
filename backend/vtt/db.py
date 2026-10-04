"""Database engine, session factory, the get_db dependency, and init_db (seed rows plus additive migrations).

Everything here reads db_engine and SessionLocal from this module at call time,
so replacing them (main.py forwards main.db_engine and main.SessionLocal here,
which the tests use) redirects init_db, get_db and the WebSocket handler.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from models import Circle, User
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

def init_db():
    """Seed required rows and run additive ALTER TABLE migrations. Each migration is idempotent — the except block silently ignores columns that already exist."""
    db = SessionLocal()
    try:
        circle = db.query(Circle).filter(Circle.id == 1).first()
        if not circle:
            circle = Circle(id=1, name="The Order of Light", stitch=1, refresh=1, train=1)
            db.add(circle)

        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                id=1,
                username="admin",
                email="admin@archive.com",
                hashed_password=pwd_context.hash("admin")
            )
            db.add(new_admin)

        db.commit()
    except Exception as e:
        logger.error("Error seeding database: %s", e)
    finally:
        db.close()

    for col, typedef in [
        ("guard_patrol", "INTEGER DEFAULT 0"),
        ("miasma_bleed", "INTEGER DEFAULT 0"),
        ("location",     "TEXT DEFAULT ''"),
        ("atmosphere",   "TEXT DEFAULT ''"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass  # column already exists

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN gm_user_id INTEGER"))
            conn.commit()
    except Exception:
        pass  # column already exists

    for col in [("role", "TEXT DEFAULT ''"), ("specialty", "TEXT DEFAULT ''")]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col[0]} {col[1]}"))
                conn.commit()
        except Exception:
            pass  # column already exists

    for col, typedef in [
        ("chapter_house_location", "TEXT"),
        ("circle_ability",         "TEXT"),
        ("insignia",               "TEXT"),
        ("backstory_answers",      "TEXT DEFAULT '{}'"),
        ("is_finalized",           "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN roster_finalized INTEGER DEFAULT 0"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE characters ADD COLUMN personal_circle_answer TEXT DEFAULT ''"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE relationships ADD COLUMN last_actor_id INTEGER"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE circles ADD COLUMN illumination INTEGER DEFAULT 0"))
            conn.commit()
    except Exception:
        pass

    for col, typedef in [
        ("tension_clock", "INTEGER DEFAULT 4"),
        ("tension_label", "TEXT DEFAULT ''"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    for col in ["nerve_resistance_spent", "cunning_resistance_spent", "intuition_resistance_spent"]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col} INTEGER DEFAULT 0"))
                conn.commit()
        except Exception:
            pass

    for col, typedef in [
        ("entry_type", "TEXT DEFAULT 'field_log'"),
        ("visibility",  "TEXT DEFAULT 'all'"),
        ("image_data",  "TEXT"),
        ("is_deleted",  "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE notebook_entries ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    for col, typedef in [
        ("resources_editable", "INTEGER DEFAULT 0"),
        ("reports_open",       "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE circles ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE circles ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE characters ADD COLUMN ability_uses TEXT DEFAULT '{}'"))
            conn.commit()
    except Exception:
        pass

    try:
        with db_engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_rejoin_campaign_id INTEGER"))
            conn.commit()
    except Exception:
        pass

    for col, typedef in [
        ("train_bonus",                "INTEGER DEFAULT 0"),
        ("resources_spent_assignment", "INTEGER DEFAULT 0"),
    ]:
        try:
            with db_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE characters ADD COLUMN {col} {typedef}"))
                conn.commit()
        except Exception:
            pass
