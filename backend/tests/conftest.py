"""Shared fixtures for the characterization tests.

These tests pin what the backend does today, bugs included, so the refactor can
prove it changed nothing. Tests whose docstring starts with "QUIRK:" pin behavior
that is probably wrong and should only change in its own commit.

Marker legacy_trust: the test's expected outcome exists only because the server
trusts ids or roles sent by the client (acting on someone else's character, a
client-claimed GM role, a user_id in a body or path). Happy-path tests where the
caller is the rightful owner are not marked; once login issues tokens they will
need a token, but their expected outcome stays the same.

Importing main has side effects (create_all, seed rows, ALTER TABLE statements),
so it must only ever run against a throwaway database. The beta test harness
provides one per run in DATABASE_URL.
"""
import os

import pytest

_db_url = os.environ.get("DATABASE_URL", "")
if not _db_url or "candela_obscura.db" in _db_url:
    pytest.exit(
        "DATABASE_URL must point at a throwaway test database "
        "(run the tests through the beta test harness)",
        returncode=2,
    )
if not os.environ.get("SECRET_KEY"):
    pytest.exit("SECRET_KEY must be set for the tests", returncode=2)

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

import main  # noqa: E402  (imported once; seeds user 1 and circle 1)
import engine  # noqa: E402
import support  # noqa: E402

TABLES = ["users", "circles", "characters", "campaigns", "notebook_entries",
          "circle_votes", "relationships", "games"]


def _sequence_state():
    state = {}
    with main.db_engine.connect() as conn:
        if conn.dialect.name != "postgresql":
            return state
        for table in ("users", "circles"):
            seq = conn.execute(text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table}).scalar()
            row = conn.execute(text(f"SELECT last_value, is_called FROM {seq}")).one()
            state[table] = (row[0], bool(row[1]))
    return state


def _resync_sequences():
    with main.db_engine.begin() as conn:
        if conn.dialect.name != "postgresql":
            return
        for table in TABLES:
            conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM {table}"
            ))


# Rate limits are per client IP and every test request comes from "testclient".
main.limiter.enabled = False
support.FRESH_DB["sequences_at_import"] = _sequence_state()


@pytest.fixture(scope="session")
def client():
    # One TestClient context means one event loop for every request and socket,
    # like the single uvicorn worker in production. Broadcasts from one socket's
    # handler to another socket therefore work as they do live.
    with TestClient(main.app) as c:
        # Record what a brand new PostgreSQL database does before anything else
        # touches it: init_db inserted user 1 and circle 1 with explicit ids, so
        # the SERIAL sequences still hand out 1 next.
        with support.server_errors_as_500(c):
            r = c.post("/api/auth/register", json={
                "username": f"seqprobe_{support.uid()}",
                "email": f"seqprobe_{support.uid()}@example.test",
                "password": "probe-password",
            })
            support.FRESH_DB["first_register_status"] = r.status_code
            camp = support.new_campaign(c)
            r = c.get(f"/campaign/{camp['id']}/circle-creation-state")
            support.FRESH_DB["first_circle_status"] = r.status_code
        _resync_sequences()
        yield c
        main.manager.active_connections.clear()


@pytest.fixture
def dice(monkeypatch):
    """Load die faces (1-6) that engine.roll_dice will produce, in order."""
    faces = []

    def fake_randbelow(n):
        assert n == 6, n
        if not faces:
            raise AssertionError("test dice queue is empty")
        return faces.pop(0) - 1

    monkeypatch.setattr(engine.secrets, "randbelow", fake_randbelow)

    def load(*values):
        faces.extend(values)
        return faces

    return load


@pytest.fixture
def limiter_on():
    main.limiter.reset()
    main.limiter.enabled = True
    try:
        yield main.limiter
    finally:
        main.limiter.enabled = False
        main.limiter.reset()
