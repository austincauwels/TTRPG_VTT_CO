"""Helpers shared by the characterization tests.

All tests in one run share one database, so every helper creates rows with unique
names (uuid suffixes) and tests only look at rows they created themselves, plus the
two rows main.py seeds at import (user 1 'admin' and circle 1).

The WebSocket helpers read frames with a timeout. They use two private attributes
of starlette's WebSocketTestSession (portal and _send_rx) because the public
receive methods block forever when the server sends nothing.
"""
import contextlib
import json
import time
import uuid

import anyio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import main
from models import Campaign, Character, Circle, CircleVote, NotebookEntry, Relationship, User

EM = "\u2014"      # em dash used in several server messages
DOT = "\u00b7"     # middle dot used in roll log messages
ARROW = "\u2192"   # arrow used in whisper log messages

PASSWORD = "correct-horse-1"
_password_hash = None

# Filled in once per run by the session fixture in conftest.py before any test runs.
FRESH_DB = {}

CHAR_DICT_KEYS = {
    "id", "name",
    "move", "strike", "control", "hide", "sneak", "sway", "survey", "read", "sense",
    "gilded_move", "gilded_strike", "gilded_control", "gilded_hide", "gilded_sneak",
    "gilded_sway", "gilded_survey", "gilded_read", "gilded_sense",
    "nerve_max", "nerve_current", "nerve_resistance_spent",
    "cunning_max", "cunning_current", "cunning_resistance_spent",
    "intuition_max", "intuition_current", "intuition_resistance_spent",
    "body_marks", "brain_marks", "bleed_marks", "scars_count", "scars_list",
    "incapacitated", "is_dead", "circle_id",
    "pronouns", "style", "catalyst", "question", "role", "specialty",
    "role_ability", "specialty_ability", "gear", "profile_pic", "status",
    "pen_font", "ink_color", "campaign_id", "personal_circle_answer",
    "ability_uses", "train_bonus", "resources_spent_assignment",
}

CIRCLE_DICT_KEYS = {
    "id", "name", "stitch", "refresh", "train", "guard_patrol", "miasma_bleed",
    "tension_clock", "tension_label", "location", "atmosphere", "max_capacity",
    "chapter_house_location", "circle_ability", "insignia", "backstory_answers",
    "is_finalized", "illumination", "resources_editable", "reports_open",
}

CHARACTER_COLUMNS = {c.name for c in Character.__table__.columns}
CAMPAIGN_COLUMNS = {c.name for c in Campaign.__table__.columns}


def uid(n=8):
    return uuid.uuid4().hex[:n]


# ---------------------------------------------------------------------------
# Database access (fresh session per call, so reads never see stale objects)
# ---------------------------------------------------------------------------

def fetch(model, obj_id):
    """Return a detached copy of one row, or None."""
    with main.SessionLocal() as s:
        obj = s.get(model, obj_id)
        if obj is not None:
            s.expunge(obj)
        return obj


def fetch_all(model, **filters):
    with main.SessionLocal() as s:
        rows = s.query(model).filter_by(**filters).order_by(model.id).all()
        s.expunge_all()
        return rows


def update(model, obj_id, **fields):
    with main.SessionLocal() as s:
        obj = s.get(model, obj_id)
        assert obj is not None, f"{model.__name__} {obj_id} missing"
        for k, v in fields.items():
            setattr(obj, k, v)
        s.commit()


def password_hash():
    global _password_hash
    if _password_hash is None:
        _password_hash = main.pwd_context.hash(PASSWORD)
    return _password_hash


def make_user(username=None, email=None, **fields):
    """Insert a user directly (one bcrypt hash per run instead of one per user)."""
    with main.SessionLocal() as s:
        u = User(
            username=username or f"user_{uid()}",
            email=email or f"{uid()}@example.test",
            hashed_password=password_hash(),
            **fields,
        )
        s.add(u)
        s.commit()
        s.refresh(u)
        s.expunge(u)
        return u


def campaign_circle(campaign_id):
    with main.SessionLocal() as s:
        c = s.query(Circle).filter(Circle.campaign_id == campaign_id).first()
        if c is not None:
            s.expunge(c)
        return c


# ---------------------------------------------------------------------------
# REST shortcuts
# ---------------------------------------------------------------------------

def new_campaign(client, gm_user_id=None, name=None, code=None):
    params = {"name": name or f"Campaign {uid()}", "code": code or f"c-{uid()}"}
    if gm_user_id is not None:
        params["user_id"] = gm_user_id
    r = client.post("/campaign/create", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def forge(client, user_id=None, name=None, **fields):
    body = {"name": name or f"Inv {uid()}", **fields}
    if user_id is not None:
        body["user_id"] = user_id
    r = client.post("/api/investigators/forge", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def join(client, char_id, code, pen_font="Caveat"):
    return client.post("/campaign/join", params={"character_id": char_id, "code": code, "pen_font": pen_font})


def approve(client, char_id):
    return client.post(f"/campaign/approve/{char_id}")


def pending_member(client, campaign, user_id=None, **fields):
    """Forge a character for a new user (or the given one) and join it to the campaign."""
    if user_id is None:
        user_id = make_user().id
    ch = forge(client, user_id=user_id, **fields)
    r = join(client, ch["id"], campaign["campaign_code"])
    assert r.status_code == 200, r.text
    return ch


def active_member(client, campaign, user_id=None, **fields):
    ch = pending_member(client, campaign, user_id=user_id, **fields)
    r = approve(client, ch["id"])
    assert r.status_code == 200, r.text
    return ch


@contextlib.contextmanager
def server_errors_as_500(client):
    """Let an unhandled server exception come back as a plain 500 response,
    which is what a browser sees behind uvicorn."""
    transport = client._transport
    old = transport.raise_server_exceptions
    transport.raise_server_exceptions = False
    try:
        yield
    finally:
        transport.raise_server_exceptions = old


# ---------------------------------------------------------------------------
# WebSocket helpers
# ---------------------------------------------------------------------------

class Closed(Exception):
    def __init__(self, code):
        super().__init__(f"server closed the socket with code {code}")
        self.code = code


class WS:
    def __init__(self, session, key):
        self.session = session
        self.key = str(key)
        self.initial = []

    def send(self, type_, **payload):
        self.session.send_json({"type": type_, "payload": payload})

    def send_text(self, text):
        self.session.send_text(text)

    def recv(self, timeout=5.0):
        session = self.session

        async def _receive():
            with anyio.fail_after(timeout):
                return await session._send_rx.receive()

        msg = session.portal.call(_receive)
        if msg["type"] == "websocket.close":
            raise Closed(msg.get("code"))
        return json.loads(msg["text"])

    def drain(self, timeout=0.05):
        """Everything already queued for this client."""
        out = []
        while True:
            try:
                out.append(self.recv(timeout))
            except TimeoutError:
                return out

    def recv_type(self, type_, timeout=5.0):
        """Skip frames until one of the given type arrives."""
        deadline = time.monotonic() + timeout
        while True:
            left = deadline - time.monotonic()
            if left <= 0:
                raise TimeoutError(f"no {type_} frame within {timeout}s")
            msg = self.recv(left)
            if msg["type"] == type_:
                return msg

    def sync(self, timeout=5.0):
        """Barrier: the server handles one socket's frames in order, so once the
        scene_transition answer to this marker arrives, every earlier frame from this
        socket has been fully handled (and its broadcasts queued for other clients).
        Returns the frames that arrived before the marker."""
        token = f"sync-{uid()}"
        self.send("gm_transition_scene", role="GM", scene_name=token)
        out = []
        deadline = time.monotonic() + timeout
        while True:
            left = deadline - time.monotonic()
            if left <= 0:
                raise TimeoutError("sync marker never came back (socket closed by the server?)")
            msg = self.recv(left)
            if msg["type"] == "scene_transition" and msg["payload"]["scene_name"] == token:
                return out
            out.append(msg)


def server_sockets(key):
    return list(main.manager.active_connections.get(str(key), []))


def wait_until(predicate, timeout=3.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.01)
    return predicate()


def wait_server_dropped(key, timeout=3.0):
    """True once the server-side handler for this key has removed its socket from
    the connection manager (it does so on disconnect and on any unhandled error)."""
    return wait_until(lambda: not server_sockets(key), timeout)


@contextlib.contextmanager
def ws_connect(client, key, wait_disconnect=True):
    """Open /ws/{key}, read the frames the server sends on connect into ws.initial,
    and on exit close the socket and wait for the server to forget it."""
    with client.websocket_connect(f"/ws/{key}") as session:
        ws = WS(session, key)
        first = ws.recv()
        ws.initial.append(first)
        if first["type"] == "character_update":
            ws.initial.append(ws.recv())
        try:
            yield ws
        finally:
            if wait_disconnect:
                session.close(1000)
                wait_server_dropped(key, timeout=2.0)


def types(messages):
    return [m["type"] for m in messages]


def of_type(messages, type_):
    return [m for m in messages if m["type"] == type_]


# ---------------------------------------------------------------------------
# Isolated PostgreSQL schema (for startup code that must not touch shared rows)
# ---------------------------------------------------------------------------

@contextlib.contextmanager
def isolated_schema(create_tables=True):
    """Yield (engine, Session, schema name) for a new, empty PostgreSQL schema in the test
    database. With create_tables the current models are created in it. The schema
    is dropped afterwards. Tests swap main.db_engine / main.SessionLocal for these
    with monkeypatch, which redirects init_db, get_db and the WebSocket handler."""
    import pytest
    if main.db_engine.dialect.name != "postgresql":
        pytest.skip("needs PostgreSQL schemas")
    name = f"iso_{uid()}"
    with main.db_engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{name}"'))
    eng = create_engine(main.SQLALCHEMY_DATABASE_URL, connect_args={"options": f"-csearch_path={name}"})
    try:
        if create_tables:
            main.Base.metadata.create_all(bind=eng)
        yield eng, sessionmaker(autocommit=False, autoflush=False, bind=eng), name
    finally:
        eng.dispose()
        with main.db_engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{name}" CASCADE'))


class FakeSocket:
    """Stands in for a WebSocket inside ConnectionManager; fail=True makes send_json raise."""

    def __init__(self, fail=False):
        self.fail = fail
        self.sent = []

    async def send_json(self, message):
        if self.fail:
            raise RuntimeError("socket is gone")
        self.sent.append(message)
