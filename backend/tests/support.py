"""Helpers shared by the characterization tests.

All tests in one run share one database, so every helper creates rows with unique
names (uuid suffixes) and tests only look at rows they created themselves, plus the
two rows main.py seeds at import (user 1 'admin' and circle 1).

The WebSocket helpers read frames with a timeout. They use two private attributes
of starlette's WebSocketTestSession (portal and _send_rx) because the public
receive methods block forever when the server sends nothing.

Every route except login and register needs a login token. The helpers log users
in through POST /api/auth/login (once per user, then the token is cached) and send
the token of whoever should be acting: as_user(user_id), as_owner(character_id),
as_gm(campaign) and as_stranger() return the headers for a request, and the REST
shortcuts below pick the rightful caller by default. Users made by make_user get a
cheap bcrypt hash (4 rounds) so that logging in hundreds of them stays fast.
"""
import asyncio
import contextlib
import json
import time
from types import SimpleNamespace
import uuid

import anyio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import main
from vtt.ws.manager import campaign_key
from models import Campaign, Character, Circle, CircleVote, NotebookEntry, Relationship, User

EM = "\u2014"      # em dash used in several server messages
DOT = "\u00b7"     # middle dot used in roll log messages
ARROW = "\u2192"   # arrow used in whisper log messages

PASSWORD = "correct-horse-1"
_password_hash = None

# The session TestClient, set by the client fixture in conftest.py.
CLIENT = None
# user id -> (username, password) for every user the tests can log in as, and the
# login token once it has been fetched.
_CREDENTIALS = {}
_TOKENS = {}

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
    "ability_uses", "train_bonus", "train_dice", "resources_spent_assignment",
    "advancement_picks", "advancement_taken", "warded_by_id",
}

CIRCLE_DICT_KEYS = {
    "id", "name", "stitch", "refresh", "train", "guard_patrol", "miasma_bleed",
    "tension_clock", "tension_label", "location", "atmosphere", "dispatch_text", "max_capacity",
    "chapter_house_location", "circle_ability", "insignia", "backstory_answers",
    "is_finalized", "illumination", "resources_editable", "reports_open", "stamina_dice_left",
    "incapacitated_members", "saw_this_coming",
    "timer_duration_ms", "timer_remaining_ms", "timer_running", "timer_visible",
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
        _password_hash = cheap_hash(PASSWORD)
    return _password_hash


def cheap_hash(password):
    """A bcrypt hash of the password with 4 rounds (fast; login accepts it)."""
    return main.pwd_context.handler("bcrypt").using(rounds=4).hash(password)


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
    _CREDENTIALS[u.id] = (u.username, PASSWORD)
    return u


# ---------------------------------------------------------------------------
# Login tokens
# ---------------------------------------------------------------------------

def login(client, username, password):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def token_for(user_id):
    """The login token of a user made by make_user, logging in on first use."""
    if user_id not in _TOKENS:
        username, password = _CREDENTIALS[user_id]
        r = login(CLIENT, username, password)
        assert r.status_code == 200, r.text
        _TOKENS[user_id] = r.json()["token"]
    return _TOKENS[user_id]


def fresh_token(user_id):
    """A login token for the user's password hash as it is now (for a user whose hash
    a test replaced, which ends the tokens issued before). It replaces the cached one."""
    from vtt.security import create_access_token
    _TOKENS[user_id] = create_access_token(user_id, fetch(User, user_id).hashed_password)
    return _TOKENS[user_id]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def as_user(user_id):
    return bearer(token_for(user_id))


def as_stranger():
    """A logged-in user who owns nothing and runs no campaign."""
    return as_user(make_user().id)


def owner_id(character_id):
    row = fetch(Character, character_id)
    return row.user_id if row is not None else None


def gm_id(campaign):
    """The GM of a campaign, given its id or the dict /campaign/create returned."""
    campaign_id = campaign["id"] if isinstance(campaign, dict) else campaign
    row = fetch(Campaign, campaign_id)
    return row.gm_user_id if row is not None else None


def as_owner(character_id):
    """The owner of a character; a stranger when the character does not exist."""
    uid_ = owner_id(character_id)
    return as_user(uid_) if uid_ is not None else as_stranger()


def as_gm(campaign):
    """The GM of a campaign; a stranger when it does not exist or has no GM."""
    uid_ = gm_id(campaign)
    return as_user(uid_) if uid_ is not None else as_stranger()


def as_gm_of_character(character_id):
    """The GM of the campaign a character belongs to; a stranger otherwise."""
    row = fetch(Character, character_id)
    if row is None or row.campaign_id is None:
        return as_stranger()
    return as_gm(row.campaign_id)


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
    """Create a campaign as gm_user_id (sent as user_id too, as the frontend does), or
    as a new user when none is given. The caller becomes the GM."""
    params = {"name": name or f"Campaign {uid()}", "code": code or f"c-{uid()}"}
    if gm_user_id is not None:
        params["user_id"] = gm_user_id
    gm = gm_user_id if gm_user_id is not None else make_user().id
    r = client.post("/campaign/create", params=params, headers=as_user(gm))
    assert r.status_code == 200, r.text
    return r.json()


# A sheet the character creator could make (vtt/creation.py): a Scholar and Doctor who
# raised Move from 0, put 3 more points on Strike, Sway and Hide, gilded Read (the
# Doctor's, key sneak) and Move, and put 2 more points on each drive.
SHEET = dict(
    role="Scholar", specialty="Doctor", role_ability="Well-Read", specialty_ability="Dissection",
    control=1, sneak=1, survey=1, read=2, move=1, strike=1, sway=1, hide=1, sense=0,
    gilded_sneak=True, gilded_move=True,
    nerve_max=2, nerve_current=2, cunning_max=2, cunning_current=2, intuition_max=5, intuition_current=5,
    gear=["Surgical Tools", "Lantern"],
)

# The sheet a forged character had before the server checked new investigators: no role,
# no abilities, every action 0, every drive 1. Most tests build on it.
BLANK = dict(
    pronouns="Unlisted", style="", catalyst="", question="", role="", specialty="",
    role_ability="None", specialty_ability="None", gear=[],
    **{a: 0 for a in ("move", "strike", "control", "sneak", "hide", "sway", "survey", "read", "sense")},
    **{f"gilded_{a}": False for a in ("move", "strike", "control", "sneak", "hide", "sway", "survey", "read", "sense")},
    **{f"{d}_{k}": v for d in ("nerve", "cunning", "intuition") for k, v in (("current", 1), ("max", 1), ("resistance_spent", 0))},
    body_marks=0, brain_marks=0, bleed_marks=0, scars_count=0, scars_list=[], incapacitated=False,
)


def sheet(**fields):
    """A forge body the server accepts (SHEET), with the given fields."""
    return {**SHEET, "name": f"Inv {uid()}", **fields}


def forge(client, user_id=None, name=None, **fields):
    """Forge a character for user_id (also sent in the body, as the frontend does), or
    for a new user when none is given. The forge sends a valid sheet, then the row is set
    to BLANK with the given fields: tests build sheets the creator never makes (a rating
    of 3, marks, any ability). profile_pic goes through the forge and its portrait rule."""
    body = sheet(name=name or f"Inv {uid()}")
    if "profile_pic" in fields:
        body["profile_pic"] = fields.pop("profile_pic")
    if user_id is not None:
        body["user_id"] = user_id
    owner = user_id if user_id is not None else make_user().id
    r = client.post("/api/investigators/forge", json=body, headers=as_user(owner))
    assert r.status_code == 201, r.text
    char_id = r.json()["id"]
    update(Character, char_id, **{**BLANK, **fields})
    r = client.get(f"/api/investigators/{char_id}", headers=as_user(owner))
    assert r.status_code == 200, r.text
    return r.json()


def join(client, char_id, code, pen_font="Caveat", headers=None):
    return client.post("/campaign/join", params={"character_id": char_id, "code": code, "pen_font": pen_font},
                       headers=headers or as_owner(char_id))


def approve(client, char_id, headers=None):
    return client.post(f"/campaign/approve/{char_id}", headers=headers or as_gm_of_character(char_id))


def reject(client, char_id, headers=None):
    return client.post(f"/campaign/reject/{char_id}", headers=headers or as_gm_of_character(char_id))


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
        self.is_gm = None  # set by ws_connect: a GM socket gets no character_update on connect

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
        answer to this marker arrives, every earlier frame from this socket has been
        fully handled (and its broadcasts queued for other clients). Returns the
        frames that arrived before the marker.

        The marker is gm_transition_scene, which only echoes back to the sender. On a
        GM socket the answer is scene_transition with the marker's scene name; on a
        player socket it is the action_rejected frame for gm_transition_scene (tests
        must not send gm_transition_scene from a player socket themselves)."""
        token = f"sync-{uid()}"
        self.send("gm_transition_scene", scene_name=token)
        out = []
        deadline = time.monotonic() + timeout
        while True:
            left = deadline - time.monotonic()
            if left <= 0:
                raise TimeoutError("sync marker never came back (socket closed by the server?)")
            msg = self.recv(left)
            if self.is_gm and msg["type"] == "scene_transition" and msg["payload"]["scene_name"] == token:
                return out
            if not self.is_gm and msg["type"] == "action_rejected" \
                    and msg["payload"]["action"] == "gm_transition_scene":
                return out
            out.append(msg)


def server_sockets(key):
    """The server-side sockets open on /ws/{key}: those on the character channel and
    on the campaign channel the key can name (the manager keys them apart)."""
    connections = main.manager.active_connections
    return list(connections.get(str(key), [])) + list(connections.get(campaign_key(str(key)), []))


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


def channel_owner(key):
    """The user entitled to /ws/{key}: the owner of character key, else the GM of
    the campaign whose code is key (None when neither exists)."""
    key = str(key)
    if key.isdigit() and int(key) < 2 ** 31:
        user_id = owner_id(int(key))
        if user_id is not None:
            return user_id
    with main.SessionLocal() as s:
        campaign = s.query(Campaign).filter(Campaign.campaign_code == key).first()
        return campaign.gm_user_id if campaign is not None else None


AUTO = object()


def ws_url(key, token=AUTO):
    """/ws/{key} with the token of the user entitled to it (a stranger's when nobody
    is), a given token, or no token at all when token is None."""
    if token is AUTO:
        user_id = channel_owner(key)
        token = token_for(user_id if user_id is not None else make_user().id)
    return f"/ws/{key}" if token is None else f"/ws/{key}?token={token}"


@contextlib.contextmanager
def ws_connect(client, key, wait_disconnect=True, token=AUTO):
    """Open /ws/{key} as the user entitled to it (or with the given token), read the
    frames the server sends on connect into ws.initial, and on exit close the socket
    and wait for the server to forget it."""
    with client.websocket_connect(ws_url(key, token)) as session:
        ws = WS(session, key)
        first = ws.recv()
        ws.initial.append(first)
        ws.is_gm = first["type"] != "character_update"
        if not ws.is_gm:
            ws.initial.append(ws.recv())
        try:
            yield ws
        finally:
            if wait_disconnect:
                session.close(1000)
                wait_server_dropped(key, timeout=2.0)


def ws_close_code(client, key, token=AUTO):
    """Open /ws/{key} and return the code the server closes it with before sending
    anything (fails if the server sends a frame instead)."""
    with client.websocket_connect(ws_url(key, token)) as session:
        ws = WS(session, key)
        try:
            msg = ws.recv(timeout=5.0)
        except Closed as closed:
            return closed.code
        raise AssertionError(f"the server sent {msg['type']} instead of closing the socket")


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
    """Stands in for a WebSocket inside ConnectionManager; fail=True makes sending raise.
    sent holds the messages as dicts; texts holds the frames the manager sent as text
    (it serializes a broadcast once and sends the same text to every socket)."""

    def __init__(self, fail=False):
        self.fail = fail
        self.sent = []
        self.texts = []

    async def send_json(self, message):
        if self.fail:
            raise RuntimeError("socket is gone")
        self.sent.append(message)

    async def send_text(self, text):
        if self.fail:
            raise RuntimeError("socket is gone")
        self.texts.append(text)
        self.sent.append(json.loads(text))


class StaleSocket:
    """Stands in for a socket whose other end went away without a word: a phone that
    went to sleep or changed networks. The server still holds it, sending to it fails,
    and closing it waits for the other end to answer the close, which never comes: the
    real close waits out its timeout (10 seconds in uvicorn), this one waits hang
    seconds. A second close raises at once, as starlette's does once a close was sent.
    close_codes holds the code of every close asked for."""

    def __init__(self, hang=6.0, user_id=None):
        self.hang = hang
        self.close_codes = []
        self.state = SimpleNamespace()
        if user_id is not None:
            self.state.candela_user_id = user_id

    async def close(self, code=1000):
        self.close_codes.append(code)
        if len(self.close_codes) > 1:
            raise RuntimeError('Cannot call "send" once a close message has been sent.')
        await asyncio.sleep(self.hang)

    async def send_text(self, text):
        raise RuntimeError("socket is gone")

    async def send_json(self, message):
        raise RuntimeError("socket is gone")


def offer_intercept(target_id, mark_type):
    """Opens the answer a mark offered to the allies opens (vtt/ws/handlers/marks.py), for
    tests that send intercept_mark without having a mark land first."""
    from vtt.ws.handlers import marks
    marks.open_intercept(target_id, mark_type)


def last_roll(char_id, action, outcome="failure", result=2):
    """Records a roll of action as the character's last (vtt/ws/handlers/rolls.py), for
    tests of what answers a roll (a resistance burn, a post-roll ability)."""
    from engine import drive_for_action
    from vtt.ws.handlers import rolls
    rolls._last_roll[char_id] = {"action": action, "cat": drive_for_action(action), "result": result,
                                 "outcome": outcome, "used": set(),
                                 "campaign_id": None}
