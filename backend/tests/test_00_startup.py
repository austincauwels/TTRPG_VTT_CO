"""Import-time behavior of main.py: seeds, migrations, settings, route table.

The file name starts with 00 so these run first, while the database is closest
to what a fresh deployment looks like.
"""
import os
import subprocess
import sys

import pytest
from sqlalchemy import inspect as sa_inspect, text

import main
import support
from models import Character, Circle, User
from vtt import security


def test_seeded_admin_user(client):
    admin = support.fetch(User, 1)
    assert admin is not None
    assert admin.username == "admin"
    assert admin.email == "admin@archive.com"
    assert admin.pending_rejoin_campaign_id is None
    assert not main.pwd_context.verify("admin", admin.hashed_password)
    assert len(support.fetch_all(User, username="admin")) == 1


def test_seeded_circle_one(client):
    c = support.fetch(Circle, 1)
    assert c is not None
    assert c.name == "The Order of Light"
    assert (c.stitch, c.refresh, c.train) == (1, 1, 1)
    assert c.campaign_id is None


def test_admin_cannot_log_in_with_the_published_password(client):
    """Fixed QUIRK: the seeded admin/admin account used to work on every new database.
    Admin now gets a random password nobody is told."""
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 401


def test_init_db_replaces_published_passwords(client):
    """An existing database keeps whatever init_db or the seed scripts wrote. Startup
    replaces the published passwords (admin/admin and the seed scripts' testpass);
    other accounts, and seed accounts with a password of their own, are left alone."""
    from vtt import db as vtt_db
    published = main.pwd_context.handler("bcrypt").using(rounds=4)
    support.update(User, 1, hashed_password=published.hash("admin"))
    keeper = support.fetch_all(User, username="keeper_test")
    keeper = keeper[0] if keeper else support.make_user(username="keeper_test")
    support.update(User, keeper.id, hashed_password=published.hash("testpass"))
    rook = support.fetch_all(User, username="rook_halcyon")
    rook = rook[0] if rook else support.make_user(username="rook_halcyon")
    support.update(User, rook.id, hashed_password=published.hash("my own password"))
    bystander = support.make_user()
    support.update(User, bystander.id, hashed_password=published.hash("admin"))
    assert client.post("/api/auth/login", json={"username": "admin", "password": "admin"}).status_code == 200

    main.init_db()

    assert not main.pwd_context.verify("admin", support.fetch(User, 1).hashed_password)
    assert not main.pwd_context.verify("testpass", support.fetch(User, keeper.id).hashed_password)
    assert main.pwd_context.verify("my own password", support.fetch(User, rook.id).hashed_password)
    assert main.pwd_context.verify("admin", support.fetch(User, bystander.id).hashed_password)
    for username, password in (("admin", "admin"), ("keeper_test", "testpass")):
        r = client.post("/api/auth/login", json={"username": username, "password": password})
        assert r.status_code == 401
    assert vtt_db.retire_published_passwords() == []


def test_fresh_postgres_sequences_collide_with_seeded_ids(client):
    """QUIRK: init_db inserts user 1 and circle 1 with explicit ids, which leaves the
    PostgreSQL sequences untouched. The first register and the first auto-created
    campaign circle on a new database get id 1 again and fail with a 500. The failed
    insert consumes the value, so the second attempt works."""
    seqs = support.FRESH_DB["sequences_at_import"]
    if seqs:  # PostgreSQL only
        assert seqs == {"users": (1, False), "circles": (1, False)}
        assert support.FRESH_DB["first_register_status"] == 500
        assert support.FRESH_DB["first_circle_status"] == 500


def test_init_db_is_idempotent(client):
    users_before = len(support.fetch_all(User))
    circle_before = support.fetch(Circle, 1)
    main.Base.metadata.create_all(bind=main.db_engine)
    main.init_db()
    main.init_db()
    assert len(support.fetch_all(User)) == users_before
    assert len(support.fetch_all(User, username="admin")) == 1
    circle_after = support.fetch(Circle, 1)
    assert circle_after.name == circle_before.name
    assert (circle_after.stitch, circle_after.refresh, circle_after.train) == (
        circle_before.stitch, circle_before.refresh, circle_before.train)


def test_migrated_columns_exist(client):
    insp = sa_inspect(main.db_engine)
    cols = {t: {c["name"] for c in insp.get_columns(t)} for t in
            ("circles", "campaigns", "characters", "relationships", "notebook_entries", "users")}
    assert {"guard_patrol", "miasma_bleed", "location", "atmosphere", "chapter_house_location",
            "circle_ability", "insignia", "backstory_answers", "is_finalized", "illumination",
            "tension_clock", "tension_label", "resources_editable", "reports_open",
            "campaign_id"} <= cols["circles"]
    assert {"gm_user_id", "roster_finalized", "is_retired"} <= cols["campaigns"]
    assert {"role", "specialty", "personal_circle_answer", "nerve_resistance_spent",
            "cunning_resistance_spent", "intuition_resistance_spent", "ability_uses",
            "train_bonus", "resources_spent_assignment"} <= cols["characters"]
    assert "last_actor_id" in cols["relationships"]
    assert {"entry_type", "visibility", "image_data", "is_deleted"} <= cols["notebook_entries"]
    assert {"pending_rejoin_campaign_id", "google_sub", "google_email", "email_proven",
            "has_password"} <= cols["users"]
    google_sub_index = [i for i in insp.get_indexes("users") if i["column_names"] == ["google_sub"]]
    assert [(i["name"], bool(i["unique"])) for i in google_sub_index] == [("ix_users_google_sub", True)]
    assert {c["name"] for c in insp.get_columns("password_reset_tokens")} == {
        "id", "user_id", "token_hash", "password_stamp", "created_at", "expires_at"}
    assert {c["name"] for c in insp.get_columns("email_change_tokens")} == {
        "id", "user_id", "token_hash", "new_email", "old_email", "password_stamp", "created_at", "expires_at"}


def _run_import(env):
    backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return subprocess.run(
        [sys.executable, "-c", "import main; print('imported', main.app.title)"],
        cwd=backend, env=env, capture_output=True, text=True, timeout=120,
    )


def test_second_process_import_is_safe(client):
    """A second process importing main against the same database (a restart)
    re-runs create_all, the seeds and every ALTER TABLE without error."""
    users_before = len(support.fetch_all(User))
    proc = _run_import(dict(os.environ))
    assert proc.returncode == 0, proc.stderr
    assert "imported" in proc.stdout
    assert len(support.fetch_all(User)) == users_before


def test_missing_secret_key_refuses_to_start(client):
    env = {k: v for k, v in os.environ.items() if k != "SECRET_KEY"}
    proc = _run_import(env)
    assert proc.returncode != 0
    assert "RuntimeError" in proc.stderr
    assert "SECRET_KEY environment variable must be set" in proc.stderr


@pytest.mark.parametrize("key", ["your-secret-key-here", "x" * 31])
def test_placeholder_or_short_secret_key_refuses_to_start(client, key):
    """SECRET_KEY signs the login tokens, so the .env.example placeholder or a short
    key would let anyone forge one."""
    proc = _run_import(dict(os.environ, SECRET_KEY=key))
    assert proc.returncode != 0
    assert "RuntimeError" in proc.stderr
    assert "at least 32 characters" in proc.stderr


def test_an_unclear_allow_password_login_refuses_to_start(client):
    """A typo must not leave password login on when it was meant to be off."""
    proc = _run_import(dict(os.environ, ALLOW_PASSWORD_LOGIN="flase"))
    assert proc.returncode != 0
    assert "RuntimeError" in proc.stderr
    assert "ALLOW_PASSWORD_LOGIN must be true or false" in proc.stderr


@pytest.mark.parametrize("value,expected", [
    (None, True), ("", True), ("  ", True), ("true", True), ("TRUE", True), ("1", True), ("yes", True),
    ("on", True), ("false", False), ("False", False), (" 0 ", False), ("no", False), ("off", False),
])
def test_env_flag(monkeypatch, value, expected):
    from vtt import config
    if value is None:
        monkeypatch.delenv("CANDELA_TEST_FLAG", raising=False)
    else:
        monkeypatch.setenv("CANDELA_TEST_FLAG", value)
    assert config._env_flag("CANDELA_TEST_FLAG", True) is expected


def test_route_table_order(client):
    routes = []
    for r in main.app.routes:
        methods = sorted(getattr(r, "methods", None) or [])
        routes.append((r.path, methods))
    app_routes = [r for r in routes if not r[0].startswith(("/openapi", "/docs", "/redoc"))]
    assert app_routes == [
        ("/campaign/create", ["POST"]),
        ("/campaign/join", ["POST"]),
        ("/campaign/approve/{character_id}", ["POST"]),
        ("/campaign/reject/{character_id}", ["POST"]),
        ("/campaign/{campaign_id}/retire", ["POST"]),
        ("/campaign/rejoin", ["POST"]),
        ("/campaign/{campaign_id}/invite-rejoin", ["POST"]),
        ("/campaign/{campaign_id}/roster", ["GET"]),
        ("/campaign/{campaign_id}/circle-creation-state", ["GET"]),
        ("/circle/vote", ["POST"]),
        ("/circle/relationship/propose", ["POST"]),
        ("/circle/relationship/respond", ["POST"]),
        ("/campaign/finalize-roster", ["POST"]),
        ("/api/auth/login", ["POST"]),
        ("/api/auth/register", ["POST"]),
        ("/api/auth/google", ["POST"]),
        ("/api/auth/google/link", ["POST"]),
        ("/api/auth/google/create", ["POST"]),
        ("/api/auth/config", ["GET"]),
        ("/api/auth/me", ["GET"]),
        ("/api/auth/me/google", ["POST"]),
        ("/api/auth/password-reset", ["POST"]),
        ("/api/auth/password-reset/confirm", ["POST"]),
        ("/api/auth/me/username", ["POST"]),
        ("/api/auth/me/password", ["POST"]),
        ("/api/auth/me/email", ["POST"]),
        ("/api/auth/me/email/resend", ["POST"]),
        ("/api/auth/me/email/cancel", ["POST"]),
        ("/api/auth/me/email/check", ["POST"]),
        ("/api/auth/me/email/confirm", ["POST"]),
        ("/api/auth/email-change/undo", ["POST"]),
        ("/api/auth/me/google/remove", ["POST"]),
        ("/api/investigators", ["GET"]),
        ("/api/investigators/{investigator_id}", ["GET"]),
        ("/api/investigators/forge", ["POST"]),
        ("/api/investigators/{investigator_id}/portrait", ["PUT"]),
        ("/api/notebook/{campaign_id}/entries", ["GET"]),
        ("/api/notebook/{campaign_id}/entries", ["POST"]),
        ("/api/notebook/entries/{entry_id}", ["PUT"]),
        ("/api/notebook/entries/{entry_id}", ["DELETE"]),
        ("/api/notebook/{campaign_id}/upload", ["POST"]),
        ("/api/users/{user_id}/characters", ["GET"]),
        ("/api/users/{user_id}/campaigns", ["GET"]),
        ("/ws/{game_id}", []),
    ]


def test_cors_allows_configured_origin_only(client):
    origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
    assert origins, "the harness sets CORS_ORIGINS"
    ok = client.options("/api/auth/login", headers={
        "Origin": origins[0], "Access-Control-Request-Method": "POST"})
    assert ok.status_code == 200
    assert ok.headers["access-control-allow-origin"] == origins[0]
    assert ok.headers["access-control-allow-credentials"] == "true"
    bad = client.options("/api/auth/login", headers={
        "Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert bad.status_code == 400
    assert "access-control-allow-origin" not in bad.headers


# --- init_db ALTERs against a legacy schema -----------------------------------

LEGACY_TABLES = [
    "CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT)",
    "CREATE TABLE campaigns (id SERIAL PRIMARY KEY, name TEXT, campaign_code TEXT, is_retired BOOLEAN DEFAULT false)",
    # guard_patrol already exists, so the very first ALTER fails; every later one must still run
    "CREATE TABLE circles (id SERIAL PRIMARY KEY, name TEXT, guard_patrol INTEGER DEFAULT 0)",
    "CREATE TABLE characters (id SERIAL PRIMARY KEY, name TEXT)",
    "CREATE TABLE relationships (id SERIAL PRIMARY KEY)",
    "CREATE TABLE notebook_entries (id SERIAL PRIMARY KEY)",
]

# (table, column) -> (data_type, column_default) as PostgreSQL reports them.
MIGRATED_COLUMNS = {
    ("circles", "guard_patrol"): ("integer", "0"),
    ("circles", "miasma_bleed"): ("integer", "0"),
    ("circles", "location"): ("text", "''::text"),
    ("circles", "atmosphere"): ("text", "''::text"),
    ("circles", "chapter_house_location"): ("text", None),
    ("circles", "circle_ability"): ("text", None),
    ("circles", "insignia"): ("text", None),
    ("circles", "backstory_answers"): ("json", "'{}'::json"),
    ("circles", "is_finalized"): ("boolean", "false"),
    ("circles", "illumination"): ("integer", "0"),
    ("circles", "tension_clock"): ("integer", "0"),
    ("circles", "tension_label"): ("text", "''::text"),
    ("circles", "resources_editable"): ("boolean", "false"),
    ("circles", "reports_open"): ("boolean", "false"),
    ("circles", "campaign_id"): ("integer", None),
    ("campaigns", "gm_user_id"): ("integer", None),
    ("campaigns", "roster_finalized"): ("boolean", "false"),
    ("characters", "role"): ("text", "''::text"),
    ("characters", "specialty"): ("text", "''::text"),
    ("characters", "personal_circle_answer"): ("text", "''::text"),
    ("characters", "nerve_resistance_spent"): ("integer", "0"),
    ("characters", "cunning_resistance_spent"): ("integer", "0"),
    ("characters", "intuition_resistance_spent"): ("integer", "0"),
    ("characters", "ability_uses"): ("json", "'{}'::json"),
    ("characters", "train_bonus"): ("boolean", "false"),
    ("characters", "resources_spent_assignment"): ("integer", "0"),
    ("relationships", "last_actor_id"): ("integer", None),
    ("notebook_entries", "entry_type"): ("text", "'field_log'::text"),
    ("notebook_entries", "visibility"): ("text", "'all'::text"),
    ("notebook_entries", "image_data"): ("text", None),
    ("notebook_entries", "is_deleted"): ("boolean", "false"),
    ("users", "pending_rejoin_campaign_id"): ("integer", None),
    ("users", "google_sub"): ("text", None),
    ("users", "google_email"): ("text", None),
    ("users", "email_proven"): ("boolean", "false"),
    ("users", "has_password"): ("boolean", None),
}


def _schema_columns(eng, schema):
    with eng.connect() as conn:
        rows = conn.execute(text(
            "SELECT table_name, column_name, data_type, column_default "
            "FROM information_schema.columns WHERE table_schema = :s"), {"s": schema}).all()
    return {(r[0], r[1]): (r[2], r[3]) for r in rows}


def test_init_db_alters_upgrade_a_legacy_schema(client, monkeypatch):
    """Runs init_db against tables that predate every migration. Each ALTER runs in
    its own transaction, so one that fails (a column that already exists) does not
    stop the rest. Fixed: the added flags are BOOLEAN and backstory_answers and
    ability_uses are JSON, as the models declare (they used to be INTEGER and TEXT,
    which broke every write of train_bonus on the live database). QUIRK: no seed rows
    are written on such a database, because the seed query runs before the ALTERs and
    fails on the missing columns."""
    with support.isolated_schema(create_tables=False) as (eng, Session, schema):
        with eng.begin() as conn:
            for ddl in LEGACY_TABLES:
                conn.execute(text(ddl))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        cols = _schema_columns(eng, schema)
        got = {key: cols.get(key) for key in MIGRATED_COLUMNS}
        assert got == MIGRATED_COLUMNS
        fks = sa_inspect(eng).get_foreign_keys("circles")
        assert [(fk["constrained_columns"], fk["referred_table"]) for fk in fks] == [(["campaign_id"], "campaigns")]
        indexes = [(i["name"], i["column_names"], bool(i["unique"])) for i in sa_inspect(eng).get_indexes("users")]
        assert indexes == [("ix_users_google_sub", ["google_sub"], True)]
        with eng.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM circles")).scalar() == 0
            assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 0
        main.init_db()  # a second start changes nothing
        assert _schema_columns(eng, schema) == cols


def _column_types(eng, schema):
    """(table, column) -> data_type, with text and character varying as one type
    (PostgreSQL treats an unlimited VARCHAR and TEXT the same)."""
    return {key: ("text" if data_type == "character varying" else data_type)
            for key, (data_type, _default) in _schema_columns(eng, schema).items()}


def _model_columns():
    return {(t.name, c.name) for t in main.Base.metadata.tables.values() for c in t.columns}


def test_init_db_converts_an_integer_train_bonus_to_boolean(client, monkeypatch):
    """Bug fix: init_db used to add characters.train_bonus as INTEGER DEFAULT 0 while the
    model is Boolean. PostgreSQL refuses False for an integer column, so on a database
    that got the column that way every forge and every train action failed (live and
    beta were converted by hand on 2026-10-04). init_db now converts the column, keeping
    the values (0 is false, anything else true), and leaves it alone afterwards."""
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("ALTER TABLE characters DROP COLUMN train_bonus"))
            conn.execute(text("ALTER TABLE characters ADD COLUMN train_bonus INTEGER DEFAULT 0"))
            conn.execute(text("INSERT INTO characters (name, status, train_bonus) VALUES "
                              "('Zero', 'unaffiliated', 0), ('One', 'unaffiliated', 1), "
                              "('Unset', 'unaffiliated', NULL)"))
        with Session() as s:  # the write that failed live
            s.add(Character(name="Forged", status="unaffiliated"))
            with pytest.raises(Exception, match="train_bonus"):
                s.commit()
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        assert _schema_columns(eng, schema)[("characters", "train_bonus")] == ("boolean", "false")
        with eng.connect() as conn:
            rows = conn.execute(text("SELECT name, train_bonus FROM characters ORDER BY id")).all()
        assert [tuple(r) for r in rows] == [("Zero", False), ("One", True), ("Unset", None)]

        def flags():
            with Session() as s:
                return {c.name: c.train_bonus for c in s.query(Character)}

        with Session() as s:
            s.add(Character(name="Forged", status="unaffiliated"))
            s.query(Character).filter(Character.name == "Zero").one().train_bonus = True
            s.commit()
        main.init_db()  # a second start changes nothing
        from vtt import db as vtt_db
        assert vtt_db.convert_integer_flags() == []
        assert _schema_columns(eng, schema)[("characters", "train_bonus")] == ("boolean", "false")
        assert flags() == {"Zero": True, "One": True, "Unset": None, "Forged": False}


def test_model_column_types_match_the_database_after_init_db_on_a_legacy_schema(client, monkeypatch):
    """A database made before the migrations (every column init_db adds is missing),
    with train_bonus already added as INTEGER the way the old ALTER did it, ends up
    with the type the model declares for every column, as a create_all one has."""
    with support.isolated_schema() as (fresh_eng, _, fresh_schema):
        expected = _column_types(fresh_eng, fresh_schema)
    assert _model_columns() <= set(expected)
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            for table, col in MIGRATED_COLUMNS:
                conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {col}"))
            conn.execute(text("ALTER TABLE characters ADD COLUMN train_bonus INTEGER DEFAULT 0"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        got = _column_types(eng, schema)
        assert {key: got.get(key) for key in _model_columns()} == {key: expected[key] for key in _model_columns()}


# --- circle 1 is recreated when it is missing --------------------------------

def test_forge_recreates_missing_circle_one(client, monkeypatch):
    with support.isolated_schema() as (eng, Session, schema):
        monkeypatch.setattr(main, "SessionLocal", Session)
        with Session() as s:
            u = User(username=f"iso_{support.uid()}", email=f"{support.uid()}@example.test", hashed_password="x")
            s.add(u)
            s.commit()
            user_id = u.id
            assert s.get(Circle, 1) is None
        # this user exists only in the scratch schema, so its token is minted directly
        r = client.post("/api/investigators/forge", json={"name": f"Inv {support.uid()}", "user_id": user_id},
                        headers=support.bearer(security.create_access_token(user_id, "x")))
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["circle_id"] == 1
        with Session() as s:
            c = s.get(Circle, 1)
            assert (c.name, c.stitch, c.refresh, c.train, c.campaign_id) == ("The Order of Light", 1, 1, 1, None)


def test_ws_connect_recreates_missing_circle_one(client, monkeypatch):
    """An unaffiliated character's socket uses circle 1 and recreates it when it is
    missing. (Before tokens any unknown channel did the same; those are refused now.)"""
    with support.isolated_schema() as (eng, Session, schema):
        monkeypatch.setattr(main, "SessionLocal", Session)
        with Session() as s:
            u = User(username=f"iso_{support.uid()}", email=f"{support.uid()}@example.test", hashed_password="x")
            s.add(u)
            s.commit()
            ch = Character(name=f"Iso {support.uid()}", user_id=u.id)
            s.add(ch)
            s.commit()
            key, user_id = ch.id, u.id
        with support.ws_connect(client, key, token=security.create_access_token(user_id, "x")) as ws:
            assert support.types(ws.initial) == ["character_update", "circle_update"]
            p = ws.initial[1]["payload"]
            assert (p["id"], p["name"], p["stitch"]) == (1, "The Order of Light", 1)
        with Session() as s:
            assert s.get(Circle, 1).name == "The Order of Light"
