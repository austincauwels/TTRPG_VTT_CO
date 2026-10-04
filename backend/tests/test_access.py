"""Login tokens on the REST routes: every route except login and register answers 401
without a valid token. Per-route ownership and GM checks (403 and 404) are tested
next to each route's other tests."""
import time

import pytest
from fastapi.routing import APIRoute
from jose import jwt

import main
import support
from vtt import config, security

PUBLIC = {"/api/auth/login", "/api/auth/register"}

PROTECTED = sorted(
    (method, route.path)
    for route in main.app.routes if isinstance(route, APIRoute) and route.path not in PUBLIC
    for method in route.methods
)


def _url(path):
    return path.replace("{", "").replace("}", "").replace("campaign_id", "1").replace("character_id", "1") \
        .replace("investigator_id", "1").replace("entry_id", "1").replace("user_id", "1")


def test_every_route_but_login_and_register_is_protected():
    assert len(PROTECTED) == 23


def _expired_token():
    now = int(time.time())
    return jwt.encode({"sub": "1", "iat": now - 120, "exp": now - 60}, config.SECRET_KEY, algorithm="HS256")


BAD_HEADERS = {
    "missing": {},
    "empty bearer": {"Authorization": "Bearer "},
    "garbage": {"Authorization": "Bearer not-a-token"},
    "wrong scheme": {"Authorization": "Basic dXNlcjpwYXNz"},
    "token without scheme": None,  # filled in per test: the raw token as the whole header
    "expired": {"Authorization": f"Bearer {_expired_token()}"},
    "deleted user": {"Authorization": f"Bearer {security.create_access_token(987654321)}"},
    "other key": {"Authorization": "Bearer " + jwt.encode(
        {"sub": "1", "iat": int(time.time()), "exp": int(time.time()) + 60}, "not-the-key", algorithm="HS256")},
}


@pytest.mark.parametrize("method,path", PROTECTED, ids=[f"{m} {p}" for m, p in PROTECTED])
@pytest.mark.parametrize("kind", list(BAD_HEADERS))
def test_protected_route_without_a_valid_token_is_401(client, method, path, kind):
    headers = BAD_HEADERS[kind]
    if headers is None:
        headers = {"Authorization": security.create_access_token(1)}
    r = client.request(method, _url(path), headers=headers)
    assert r.status_code == 401, r.text
    assert r.json() == {"detail": "Not authenticated."}
    assert r.headers["www-authenticate"] == "Bearer"


def test_a_401_comes_before_body_validation(client):
    r = client.post("/campaign/finalize-roster", json={"nonsense": True})
    assert r.status_code == 401


def test_login_and_register_need_no_token(client):
    u = support.make_user()
    assert client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD}).status_code == 200
    r = client.post("/api/auth/register", json={"username": f"open_{support.uid()}",
                                                "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    assert r.status_code == 201


def test_the_login_token_works_on_the_next_request(client):
    """The full round trip the frontend makes: log in, then call with the token."""
    u = support.make_user()
    token = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD}).json()["token"]
    r = client.get(f"/api/users/{u.id}/characters", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == []
    # the scheme name is not case sensitive
    assert client.get(f"/api/users/{u.id}/characters", headers={"Authorization": f"bearer {token}"}).status_code == 200


def test_a_registered_users_token_works(client):
    r = client.post("/api/auth/register", json={"username": f"new_{support.uid()}",
                                                "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    body = r.json()
    r = client.get(f"/api/users/{body['userId']}/campaigns", headers={"Authorization": f"Bearer {body['token']}"})
    assert r.status_code == 200
