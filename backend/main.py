"""Entry point for uvicorn (main:app).

The application lives in the vtt package (see docs/refactor/STRUCTURE.md).
Importing this module has the same side effects as before the split: it reads
backend/.env, refuses to start without SECRET_KEY, creates the tables, seeds
user 1 and circle 1 and runs the additive migrations in init_db. It also
re-exports the names the tests use.
"""
import os
import sys
import types

# Ensure backend/ is on the path regardless of where uvicorn is invoked from
sys.path.insert(0, os.path.dirname(__file__))

from vtt.config import SQLALCHEMY_DATABASE_URL  # noqa: E402  (loads .env, sets up logging, checks SECRET_KEY)
from models import Base  # noqa: E402
from vtt import db as _db  # noqa: E402
from vtt.db import SessionLocal, db_engine, init_db  # noqa: E402
from vtt.security import limiter, pwd_context  # noqa: E402
from vtt.ws.manager import ConnectionManager, manager  # noqa: E402
from vtt.application import app  # noqa: E402

__all__ = [
    "app", "SessionLocal", "db_engine", "limiter", "init_db", "pwd_context",
    "manager", "ConnectionManager", "Base", "SQLALCHEMY_DATABASE_URL",
]


class _MainModule(types.ModuleType):
    """Assigning main.db_engine or main.SessionLocal (the tests do this with
    monkeypatch to point the app at a scratch schema) also replaces them in vtt.db,
    which is where init_db, get_db and the WebSocket handler look them up."""

    def __setattr__(self, name, value):
        if name in ("db_engine", "SessionLocal"):
            setattr(_db, name, value)
        super().__setattr__(name, value)


sys.modules[__name__].__class__ = _MainModule

Base.metadata.create_all(bind=db_engine)
init_db()
