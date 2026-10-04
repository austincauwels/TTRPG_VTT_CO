"""POST /api/auth/register and POST /api/auth/login, and the login token they return."""
import base64
import json
import time

import pytest
from jose import jwt

import main
import support
from models import Campaign, User
from vtt import config, security

THIRTY_DAYS = 30 * 24 * 60 * 60


def _assert_token_for(token, user_id):
    claims = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    assert claims["sub"] == str(user_id)
    assert claims["exp"] - claims["iat"] == THIRTY_DAYS
    assert abs(claims["iat"] - time.time()) < 60
    assert security.user_id_from_token(token) == user_id


def _register(client, username=None, email=None, password="long-enough-pw"):
    return client.post("/api/auth/register", json={
        "username": username or f"reg_{support.uid()}",
        "email": email or f"{support.uid()}@example.test",
        "password": password,
    })


def _fairelands_id():
    rows = support.fetch_all(Campaign, campaign_code="fairelands-01")
    return rows[0].id if rows else None


def test_register_happy_path(client):
    name = f"reg_{support.uid()}"
    r = _register(client, username=name, password="hunter22-ok")
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"role", "name", "userId", "campaignCode", "campaignId", "token"}
    _assert_token_for(body["token"], body["userId"])
    assert body["role"] == "PLAYER"
    assert body["name"] == name
    assert isinstance(body["userId"], int)
    # QUIRK: every new user is pointed at a hard-coded campaign code.
    assert body["campaignCode"] == "fairelands-01"
    assert body["campaignId"] == _fairelands_id()
    user = support.fetch(User, body["userId"])
    assert user.username == name
    assert user.hashed_password != "hunter22-ok"
    assert user.hashed_password.startswith("$2b$")
    assert main.pwd_context.verify("hunter22-ok", user.hashed_password)


def test_register_reports_fairelands_campaign_id_when_it_exists(client):
    if _fairelands_id() is None:
        support.new_campaign(client, name="Fairelands", code="fairelands-01")
    r = _register(client)
    assert r.status_code == 201
    assert r.json()["campaignCode"] == "fairelands-01"
    assert r.json()["campaignId"] == _fairelands_id()


def test_register_duplicate_username(client):
    name = f"dup_{support.uid()}"
    assert _register(client, username=name).status_code == 201
    r = _register(client, username=name)
    assert r.status_code == 400
    assert r.json() == {"detail": "That identification is already claimed."}


def test_register_duplicate_email(client):
    email = f"{support.uid()}@example.test"
    assert _register(client, email=email).status_code == 201
    r = _register(client, email=email)
    assert r.status_code == 400
    assert r.json() == {"detail": "That correspondence address is already registered."}


def test_register_username_check_is_case_sensitive(client):
    """QUIRK: 'Bob' and 'bob' are different accounts (invite-rejoin matches case-insensitively)."""
    base = f"case_{support.uid()}"
    assert _register(client, username=base.lower()).status_code == 201
    assert _register(client, username=base.upper()).status_code == 201


@pytest.mark.parametrize("field,value", [
    ("username", "a"),
    ("username", "x" * 33),
    ("username", "bad!name"),
    ("username", "semi;colon"),
    ("password", "short7!"),
    ("password", "p" * 129),
    ("email", "e" * 255),
])
def test_register_validation_errors(client, field, value):
    body = {"username": f"val_{support.uid()}", "email": f"{support.uid()}@example.test",
            "password": "long-enough-pw"}
    body[field] = value
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 422


def test_register_accepts_spaces_dots_dashes(client):
    name = f"A b.c-{support.uid(4)}"
    r = _register(client, username=name)
    assert r.status_code == 201
    assert r.json()["name"] == name
    assert support.fetch(User, r.json()["userId"]).username == name  # stored as sent, not trimmed or lowered


def test_register_missing_field(client):
    r = client.post("/api/auth/register", json={"username": f"m_{support.uid()}", "password": "long-enough-pw"})
    assert r.status_code == 422


def test_login_player(client):
    u = support.make_user()
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.status_code == 200
    body = r.json()
    _assert_token_for(body.pop("token"), u.id)
    assert body == {
        "role": "PLAYER",
        "name": u.username,
        "userId": u.id,
        "campaignCode": None,
        "campaignId": None,
        "pendingRejoinInvite": None,
    }


def test_login_issues_a_bearer_token_and_no_cookie(client):
    """The token is an HS256 JWT signed with SECRET_KEY; nothing is set as a cookie."""
    u = support.make_user()
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.status_code == 200
    assert "set-cookie" not in r.headers
    token = r.json()["token"]
    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    _assert_token_for(token, u.id)


def test_login_gm(client):
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.status_code == 200
    body = r.json()
    _assert_token_for(body.pop("token"), u.id)
    assert body == {
        "role": "GM",
        "name": u.username,
        "userId": u.id,
        "campaignCode": camp["campaign_code"],
        "campaignId": camp["id"],
    }


def test_login_gm_of_retired_campaign_is_player(client):
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    assert client.post(f"/campaign/{camp['id']}/retire").status_code == 200
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.json()["role"] == "PLAYER"
    assert r.json()["campaignId"] is None


def test_login_with_pending_rejoin_invite(client):
    camp = support.new_campaign(client)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.json()["pendingRejoinInvite"] == {
        "campaign_id": camp["id"],
        "campaign_name": camp["name"],
        "campaign_code": camp["campaign_code"],
    }


def test_login_invite_to_retired_campaign_is_hidden(client):
    camp = support.new_campaign(client)
    u = support.make_user(pending_rejoin_campaign_id=camp["id"])
    client.post(f"/campaign/{camp['id']}/retire")
    r = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD})
    assert r.json()["pendingRejoinInvite"] is None


def test_login_wrong_password(client):
    u = support.make_user()
    r = client.post("/api/auth/login", json={"username": u.username, "password": "nope-nope"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Invalid credentials."}


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", json={"username": f"ghost_{support.uid()}", "password": "x"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Invalid credentials."}


def test_login_username_is_case_sensitive(client):
    u = support.make_user(username=f"Case_{support.uid()}")
    r = client.post("/api/auth/login", json={"username": u.username.lower(), "password": support.PASSWORD})
    assert r.status_code == 401


def test_login_username_too_long(client):
    r = client.post("/api/auth/login", json={"username": "x" * 65, "password": "x"})
    assert r.status_code == 422


def test_login_missing_password(client):
    r = client.post("/api/auth/login", json={"username": "admin"})
    assert r.status_code == 422


def test_login_rate_limit_ten_per_minute(client, limiter_on):
    body = {"username": f"ghost_{support.uid()}", "password": "x"}
    codes = [client.post("/api/auth/login", json=body).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
    r = client.post("/api/auth/login", json=body)
    assert r.status_code == 429
    assert r.json()["error"].startswith("Rate limit exceeded")


def test_register_rate_limit_five_per_minute(client, limiter_on):
    taken = support.make_user()
    body = {"username": taken.username, "email": f"{support.uid()}@example.test", "password": "long-enough-pw"}
    codes = [client.post("/api/auth/register", json=body).status_code for _ in range(6)]
    assert codes[:5] == [400] * 5
    assert codes[5] == 429


def test_rate_limit_does_not_count_validation_errors(client, limiter_on):
    """Requests rejected by body validation never reach the limiter."""
    for _ in range(12):
        assert client.post("/api/auth/login", json={"username": "x" * 65, "password": "x"}).status_code == 422
    r = client.post("/api/auth/login", json={"username": f"ghost_{support.uid()}", "password": "x"})
    assert r.status_code == 401


# --- the token itself -------------------------------------------------------------

def _signed(claims, key=None, algorithm="HS256"):
    return jwt.encode(claims, key or config.SECRET_KEY, algorithm=algorithm)


def _fresh_claims(**changes):
    now = int(time.time())
    claims = {"sub": "1", "iat": now, "exp": now + 60}
    claims.update(changes)
    return claims


def test_token_round_trip():
    assert security.user_id_from_token(security.create_access_token(42)) == 42


@pytest.mark.parametrize("token", [None, "", "not-a-jwt", "a.b.c", 12345])
def test_garbage_tokens_are_rejected(token):
    assert security.user_id_from_token(token) is None


def test_token_signed_with_another_key_is_rejected():
    assert security.user_id_from_token(_signed(_fresh_claims(), key="some-other-secret")) is None


def test_expired_token_is_rejected():
    now = int(time.time())
    assert security.user_id_from_token(_signed(_fresh_claims(iat=now - 120, exp=now - 60))) is None


@pytest.mark.parametrize("missing", ["sub", "iat", "exp"])
def test_token_missing_a_claim_is_rejected(missing):
    claims = _fresh_claims()
    del claims[missing]
    assert security.user_id_from_token(_signed(claims)) is None


def test_token_with_non_numeric_subject_is_rejected():
    assert security.user_id_from_token(_signed(_fresh_claims(sub="admin"))) is None


@pytest.mark.parametrize("algorithm", ["HS384", "HS512"])
def test_only_hs256_is_accepted(algorithm):
    assert security.user_id_from_token(_signed(_fresh_claims(), algorithm=algorithm)) is None


def test_unsigned_token_is_rejected():
    """A token with alg "none" and an empty signature."""
    def part(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    token = f'{part({"alg": "none", "typ": "JWT"})}.{part(_fresh_claims())}.'
    assert security.user_id_from_token(token) is None


@pytest.mark.parametrize("logger_name", ["uvicorn.error", "uvicorn.access", "candela"])
def test_token_query_parameter_is_redacted_from_logs(logger_name):
    """uvicorn logs a WebSocket's path with its query string, which carries the token."""
    import logging
    logger = logging.getLogger(logger_name)
    token = security.create_access_token(7)
    record = logger.makeRecord(logger_name, logging.INFO, __file__, 1, '%s - "WebSocket %s" [accepted]',
                               ("10.0.0.1:5000", f"/ws/12?token={token}&x=1"), None)
    assert all(f.filter(record) for f in logger.filters)
    assert record.getMessage() == '10.0.0.1:5000 - "WebSocket /ws/12?token=<redacted>&x=1" [accepted]'
    record = logger.makeRecord(logger_name, logging.INFO, __file__, 1, f"plain /ws/12?token={token}", None, None)
    assert all(f.filter(record) for f in logger.filters)
    assert token not in record.getMessage()
