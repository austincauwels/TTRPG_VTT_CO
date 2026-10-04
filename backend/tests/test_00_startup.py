"""Import-time behavior of main.py: seeds, migrations, settings, route table.

The file name starts with 00 so these run first, while the database is closest
to what a fresh deployment looks like.
"""
import os
import subprocess
import sys

from sqlalchemy import inspect as sa_inspect, text

import main
import support
from models import Circle, User
from vtt import security


def test_seeded_admin_user(client):
    admin = support.fetch(User, 1)
    assert admin is not None
    assert admin.username == "admin"
    assert admin.email == "admin@archive.com"
    assert admin.pending_rejoin_campaign_id is None
    assert main.pwd_context.verify("admin", admin.hashed_password)
    assert len(support.fetch_all(User, username="admin")) == 1


def test_seeded_circle_one(client):
    c = support.fetch(Circle, 1)
    assert c is not None
    assert c.name == "The Order of Light"
    assert (c.stitch, c.refresh, c.train) == (1, 1, 1)
    assert c.campaign_id is None


def test_admin_can_log_in_with_default_password(client):
    """QUIRK: the seeded admin/admin account works on every new database."""
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "admin"
    assert body["userId"] == 1


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
    assert "pending_rejoin_campaign_id" in cols["users"]


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
        ("/api/investigators", ["GET"]),
        ("/api/investigators/{investigator_id}", ["GET"]),
        ("/api/investigators/forge", ["POST"]),
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
    ("circles", "backstory_answers"): ("text", "'{}'::text"),
    ("circles", "is_finalized"): ("integer", "0"),
    ("circles", "illumination"): ("integer", "0"),
    ("circles", "tension_clock"): ("integer", "4"),
    ("circles", "tension_label"): ("text", "''::text"),
    ("circles", "resources_editable"): ("integer", "0"),
    ("circles", "reports_open"): ("integer", "0"),
    ("circles", "campaign_id"): ("integer", None),
    ("campaigns", "gm_user_id"): ("integer", None),
    ("campaigns", "roster_finalized"): ("integer", "0"),
    ("characters", "role"): ("text", "''::text"),
    ("characters", "specialty"): ("text", "''::text"),
    ("characters", "personal_circle_answer"): ("text", "''::text"),
    ("characters", "nerve_resistance_spent"): ("integer", "0"),
    ("characters", "cunning_resistance_spent"): ("integer", "0"),
    ("characters", "intuition_resistance_spent"): ("integer", "0"),
    ("characters", "ability_uses"): ("text", "'{}'::text"),
    ("characters", "train_bonus"): ("integer", "0"),
    ("characters", "resources_spent_assignment"): ("integer", "0"),
    ("relationships", "last_actor_id"): ("integer", None),
    ("notebook_entries", "entry_type"): ("text", "'field_log'::text"),
    ("notebook_entries", "visibility"): ("text", "'all'::text"),
    ("notebook_entries", "image_data"): ("text", None),
    ("notebook_entries", "is_deleted"): ("integer", "0"),
    ("users", "pending_rejoin_campaign_id"): ("integer", None),
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
    stop the rest. QUIRK: the added columns are TEXT and INTEGER, not the JSON and
    BOOLEAN types the models declare (this is how a database that grew through these
    ALTERs differs from a create_all one), and no seed rows are written on such a
    database, because the seed query runs before the ALTERs and fails on the
    missing columns."""
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
        with eng.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM circles")).scalar() == 0
            assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 0
        main.init_db()  # a second start changes nothing
        assert _schema_columns(eng, schema) == cols


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
                        headers=support.bearer(security.create_access_token(user_id)))
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["circle_id"] == 1
        with Session() as s:
            c = s.get(Circle, 1)
            assert (c.name, c.stitch, c.refresh, c.train, c.campaign_id) == ("The Order of Light", 1, 1, 1, None)


def test_ws_connect_recreates_missing_circle_one(client, monkeypatch):
    with support.isolated_schema() as (eng, Session, schema):
        monkeypatch.setattr(main, "SessionLocal", Session)
        key = f"nothing-{support.uid()}"
        with support.ws_connect(client, key) as ws:
            assert support.types(ws.initial) == ["circle_update"]
            p = ws.initial[0]["payload"]
            assert (p["id"], p["name"], p["stitch"]) == (1, "The Order of Light", 1)
        with Session() as s:
            assert s.get(Circle, 1).name == "The Order of Light"
