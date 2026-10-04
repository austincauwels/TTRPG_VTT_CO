"""Sign in with Google: POST /api/auth/google, /api/auth/google/link and
/api/auth/google/create, GET /api/auth/config, and the ALLOW_PASSWORD_LOGIN switch.

vtt.google.verify_id_token is stubbed: a credential made by google.credential()
verifies as that Google account, anything else is refused as a bad token. Nothing
here reaches Google (test_google.py tests the real check).
"""
import time
from types import SimpleNamespace

import pytest
from jose import jwt

import support
from models import User
from vtt import config, security
from vtt import google as vtt_google
from vtt.google import GoogleIdentity, GoogleTokenError, GoogleUnavailableError
from vtt.schemas import check_new_username

CLIENT_ID = "test-client-id.apps.googleusercontent.com"
# What login answers: a GM gets no pendingRejoinInvite.
LOGIN_KEYS = {"PLAYER": {"role", "name", "userId", "campaignCode", "campaignId", "pendingRejoinInvite", "token"},
              "GM": {"role", "name", "userId", "campaignCode", "campaignId", "token"}}


@pytest.fixture
def google(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    issued = {}
    state = SimpleNamespace(calls=0, error=None)

    def fake_verify(credential):
        state.calls += 1
        if state.error is not None:
            raise state.error
        if credential not in issued:
            raise GoogleTokenError("not a test credential")
        return issued[credential]

    def credential(sub=None, email=None, name="Test Player"):
        """A credential for a Google account (a new one unless sub is given)."""
        identity = GoogleIdentity(sub=sub or f"g{support.uid(20)}",
                                  email=email or f"{support.uid()}@gmail.test", name=name)
        token = f"credential-{support.uid(16)}"
        issued[token] = identity
        return token

    monkeypatch.setattr(vtt_google, "verify_id_token", fake_verify)
    state.credential = credential
    state.identity = lambda token: issued[token]
    return state


def google_sign_in(client, credential):
    return client.post("/api/auth/google", json={"credential": credential})


def link(client, link_token, username, password=support.PASSWORD):
    return client.post("/api/auth/google/link",
                       json={"link_token": link_token, "username": username, "password": password})


def create(client, link_token, username):
    return client.post("/api/auth/google/create", json={"link_token": link_token, "username": username})


def needs_account(client, google, **identity):
    """Sign in with a Google account that has no user; the link token."""
    r = google_sign_in(client, google.credential(**identity))
    assert r.status_code == 200, r.text
    assert r.json()["needs_account"] is True
    return r.json()["link_token"]


def login_body(client, user):
    """What password login answers for this user, without the token."""
    r = support.login(client, user.username, support.PASSWORD)
    assert r.status_code == 200, r.text
    body = r.json()
    body.pop("token")
    return body


def assert_signed_in_as(r, user_id, status=200):
    assert r.status_code == status, r.text
    body = r.json()
    assert set(body) == LOGIN_KEYS[body["role"]]
    assert body["userId"] == user_id
    assert security.user_id_from_token(body["token"]) == user_id
    return body


def google_sub_of(user_id):
    return support.fetch(User, user_id).google_sub


# --- GET /api/auth/config ---------------------------------------------------------------

def test_config_is_public_and_reports_both_switches(client, monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    r = client.get("/api/auth/config")
    assert r.status_code == 200
    assert r.json() == {"google": True, "password_login": True}
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    assert client.get("/api/auth/config").json() == {"google": False, "password_login": False}


def test_google_client_id_comes_from_the_environment(client):
    """The test harness sets a fake client ID; the app reads it at startup."""
    import os
    if not os.environ.get("GOOGLE_CLIENT_ID"):
        pytest.skip("GOOGLE_CLIENT_ID is not set (the beta test harness sets it)")
    assert config.GOOGLE_CLIENT_ID == os.environ["GOOGLE_CLIENT_ID"].strip()


# --- 1. a user already linked to the Google account ----------------------------------------

def test_sign_in_by_google_sub(client, google):
    sub = f"g{support.uid(20)}"
    u = support.make_user(google_sub=sub)
    # the Google email may have changed since; the sub is what counts
    body = assert_signed_in_as(google_sign_in(client, google.credential(sub=sub)), u.id)
    body.pop("token")
    assert body == login_body(client, u)
    assert body["role"] == "PLAYER"


def test_sign_in_by_google_sub_as_gm(client, google):
    sub = f"g{support.uid(20)}"
    u = support.make_user(google_sub=sub)
    camp = support.new_campaign(client, gm_user_id=u.id)
    body = assert_signed_in_as(google_sign_in(client, google.credential(sub=sub)), u.id)
    assert (body["role"], body["campaignId"], body["campaignCode"]) == ("GM", camp["id"], camp["campaign_code"])
    body.pop("token")
    assert body == login_body(client, u)


def test_sign_in_by_google_sub_shows_a_pending_rejoin_invite(client, google):
    camp = support.new_campaign(client)
    sub = f"g{support.uid(20)}"
    u = support.make_user(google_sub=sub, pending_rejoin_campaign_id=camp["id"])
    body = assert_signed_in_as(google_sign_in(client, google.credential(sub=sub)), u.id)
    assert body["pendingRejoinInvite"] == {
        "campaign_id": camp["id"], "campaign_name": camp["name"], "campaign_code": camp["campaign_code"]}


def test_the_google_token_works_on_the_next_request(client, google):
    sub = f"g{support.uid(20)}"
    u = support.make_user(google_sub=sub)
    token = google_sign_in(client, google.credential(sub=sub)).json()["token"]
    assert client.get(f"/api/users/{u.id}/characters", headers=support.bearer(token)).status_code == 200


# --- 2. one existing user with the same email ---------------------------------------------

def test_a_matching_email_links_the_existing_user(client, google):
    """How existing players move over: their first Google sign-in links their account."""
    local = f"Ada.{support.uid()}"
    u = support.make_user(email=f"{local}@Example.test")
    credential = google.credential(email=f"{local.lower()}@example.test")
    body = assert_signed_in_as(google_sign_in(client, credential), u.id)
    body.pop("token")
    assert body == login_body(client, u)  # the password still works too
    sub = google.identity(credential).sub
    assert google_sub_of(u.id) == sub
    assert support.fetch(User, u.id).email == f"{local}@Example.test"  # left as it was
    # from now on the Google account signs in by its sub, whatever its email
    assert_signed_in_as(google_sign_in(client, google.credential(sub=sub, email="new@gmail.test")), u.id)


def test_a_matching_email_of_a_user_linked_to_another_google_account_is_not_linked(client, google):
    email = f"{support.uid()}@example.test"
    u = support.make_user(email=email, google_sub=f"g{support.uid(20)}")
    before = google_sub_of(u.id)
    r = google_sign_in(client, google.credential(email=email))
    assert r.status_code == 200
    assert r.json()["needs_account"] is True
    assert google_sub_of(u.id) == before


def test_two_users_with_the_email_are_not_linked(client, google):
    """register compares emails exactly, so two users can differ only in case."""
    local = f"twin.{support.uid()}"
    a = support.make_user(email=f"{local}@example.test")
    b = support.make_user(email=f"{local.upper()}@example.test")
    r = google_sign_in(client, google.credential(email=f"{local}@example.test"))
    assert r.status_code == 200
    assert r.json()["needs_account"] is True
    assert google_sub_of(a.id) is None
    assert google_sub_of(b.id) is None


def test_of_two_users_with_the_email_the_one_without_google_is_linked(client, google):
    email = f"{support.uid()}@example.test"
    support.make_user(email=email.upper(), google_sub=f"g{support.uid(20)}")
    free = support.make_user(email=email)
    assert_signed_in_as(google_sign_in(client, google.credential(email=email)), free.id)


# --- 3. no user: needs_account ---------------------------------------------------------------

def test_an_unknown_google_account_needs_an_account(client, google):
    credential = google.credential(name="Ada Lovelace")
    identity = google.identity(credential)
    users_before = len(support.fetch_all(User))
    r = google_sign_in(client, credential)
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"needs_account", "link_token", "suggested_name", "email"}
    assert body["needs_account"] is True
    assert body["email"] == identity.email
    assert body["suggested_name"].startswith("Ada Lovelace")
    assert security.identity_from_link_token(body["link_token"]) == identity
    claims = jwt.decode(body["link_token"], config.SECRET_KEY, algorithms=["HS256"])
    assert claims["purpose"] == "google_link"
    assert claims["exp"] - claims["iat"] == 10 * 60
    assert len(support.fetch_all(User)) == users_before


@pytest.mark.parametrize("name,email_local,expected", [
    ("Zoë O'Brien!", "x", "Zoë O Brien"),
    ("  Lots   of   space  ", "x", "Lots of space"),
    ("A" * 40, "x", "A" * 32),
    ("", "jane.doe+vtt", "jane.doe vtt"),
    ("!", "j", "Investigator"),
])
def test_the_suggested_name_passes_the_username_rule(client, google, name, email_local, expected):
    r = google_sign_in(client, google.credential(name=name, email=f"{email_local}@{support.uid()}.test"))
    suggested = r.json()["suggested_name"]
    assert suggested == expected or suggested.startswith(expected[:27])
    assert check_new_username(suggested) == suggested


def test_a_taken_name_is_suggested_with_a_number(client, google):
    name = f"Ada {support.uid()}"
    support.make_user(username=name)
    support.make_user(username=f"{name} 2")
    assert google_sign_in(client, google.credential(name=name)).json()["suggested_name"] == f"{name} 3"


# --- POST /api/auth/google/link ------------------------------------------------------------

def test_link_with_the_right_password(client, google):
    u = support.make_user()
    credential = google.credential()
    r = google_sign_in(client, credential)
    body = assert_signed_in_as(link(client, r.json()["link_token"], u.username), u.id)
    body.pop("token")
    assert body == login_body(client, u)
    sub = google.identity(credential).sub
    assert google_sub_of(u.id) == sub
    # next time, Google alone signs them in
    assert_signed_in_as(google_sign_in(client, google.credential(sub=sub)), u.id)


def test_link_returns_the_gm_view_for_a_gm(client, google):
    u = support.make_user()
    camp = support.new_campaign(client, gm_user_id=u.id)
    body = assert_signed_in_as(link(client, needs_account(client, google), u.username), u.id)
    assert (body["role"], body["campaignId"]) == ("GM", camp["id"])


def test_link_with_the_wrong_password(client, google):
    u = support.make_user()
    token = needs_account(client, google)
    r = link(client, token, u.username, password="not-the-password")
    assert r.status_code == 401
    assert r.json() == {"detail": "That username and password do not match."}
    assert google_sub_of(u.id) is None
    # the link token is still good for the right password
    assert_signed_in_as(link(client, token, u.username), u.id)


def test_link_to_an_unknown_username(client, google):
    r = link(client, needs_account(client, google), f"ghost_{support.uid()}")
    assert r.status_code == 401
    assert r.json() == {"detail": "That username and password do not match."}


def test_link_refuses_an_account_that_has_a_google_account(client, google):
    other_sub = f"g{support.uid(20)}"
    u = support.make_user(google_sub=other_sub)
    token = needs_account(client, google)
    r = link(client, token, u.username)
    assert r.status_code == 409
    assert r.json() == {"detail": "That account is already linked to a Google account."}
    assert google_sub_of(u.id) == other_sub
    # without the password it is just a wrong password, so linking status does not leak
    assert link(client, token, u.username, password="wrong-password").status_code == 401


def test_a_link_token_links_only_once(client, google):
    first, second = support.make_user(), support.make_user()
    token = needs_account(client, google)
    assert_signed_in_as(link(client, token, first.username), first.id)
    r = link(client, token, second.username)
    assert r.status_code == 409
    assert r.json() == {"detail": "This Google account is already linked to an account. "
                                  "Please sign in with Google again."}
    assert google_sub_of(second.id) is None
    assert create(client, token, f"late_{support.uid()}").status_code == 409


def test_link_works_with_password_login_off(client, google, monkeypatch):
    """Players whose email differs still need it to bring their account over."""
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    u = support.make_user()
    assert_signed_in_as(link(client, needs_account(client, google), u.username), u.id)


# --- POST /api/auth/google/create ----------------------------------------------------------

def test_create_an_account(client, google):
    credential = google.credential(name=f"Nova {support.uid()}")
    identity = google.identity(credential)
    r = google_sign_in(client, credential)
    name = r.json()["suggested_name"]
    r = create(client, r.json()["link_token"], name)
    assert r.status_code == 201, r.text
    body = r.json()
    user_id = body["userId"]
    assert_signed_in_as(r, user_id, status=201)
    assert {k: v for k, v in body.items() if k != "token"} == {
        "role": "PLAYER", "name": name, "userId": user_id, "campaignCode": None, "campaignId": None,
        "pendingRejoinInvite": None}
    user = support.fetch(User, user_id)
    assert (user.username, user.email, user.google_sub) == (name, identity.email, identity.sub)
    # a random password nobody knows: the account works through Google only
    assert user.hashed_password.startswith("$2b$")
    for guess in ("", name, identity.email, identity.sub):
        assert support.login(client, name, guess).status_code in (401, 422)
    assert_signed_in_as(google_sign_in(client, google.credential(sub=identity.sub)), user_id)
    assert client.get(f"/api/users/{user_id}/campaigns", headers=support.bearer(body["token"])).status_code == 200


def test_create_with_a_taken_username(client, google):
    taken = support.make_user()
    credential = google.credential()
    token = google_sign_in(client, credential).json()["link_token"]
    r = create(client, token, taken.username)
    assert r.status_code == 400
    assert r.json() == {"detail": "That identification is already claimed."}
    assert support.fetch_all(User, google_sub=google.identity(credential).sub) == []
    # another name works with the same link token
    assert create(client, token, f"free_{support.uid()}").status_code == 201


@pytest.mark.parametrize("username", ["a", "x" * 33, "bad!name", "semi;colon"])
def test_create_checks_the_username_like_register(client, google, username):
    assert create(client, needs_account(client, google), username).status_code == 422


def test_create_refuses_an_email_that_has_an_account(client, google):
    local = f"dup.{support.uid()}"
    support.make_user(email=f"{local}@example.test")
    support.make_user(email=f"{local.upper()}@example.test")
    token = needs_account(client, google, email=f"{local}@example.test")
    r = create(client, token, f"new_{support.uid()}")
    assert r.status_code == 409
    assert r.json() == {"detail": "An account with this email address already exists. "
                                  "Please use Link my existing account instead."}


# --- link tokens are only link tokens ------------------------------------------------------------

def _link_claims(identity, **changes):
    now = int(time.time())
    claims = {"purpose": "google_link", "google_sub": identity.sub, "email": identity.email,
              "name": identity.name, "iat": now, "exp": now + 600}
    claims.update(changes)
    return claims


def _bad_link_token(kind, client, google):
    identity = GoogleIdentity(sub=f"g{support.uid(20)}", email=f"{support.uid()}@gmail.test", name="Mallory")
    now = int(time.time())
    if kind == "expired":
        return jwt.encode(_link_claims(identity, iat=now - 1200, exp=now - 600), config.SECRET_KEY, algorithm="HS256")
    if kind == "wrong purpose":
        return jwt.encode(_link_claims(identity, purpose="password_reset"), config.SECRET_KEY, algorithm="HS256")
    if kind == "other key":
        return jwt.encode(_link_claims(identity), "another-secret-key-of-enough-length", algorithm="HS256")
    if kind == "tampered":
        header, _, signature = needs_account(client, google).split(".")
        payload = jwt.encode(_link_claims(identity), "x" * 32, algorithm="HS256").split(".")[1]
        return f"{header}.{payload}.{signature}"
    if kind == "login token":
        return support.login(client, support.make_user().username, support.PASSWORD).json()["token"]
    if kind == "register token":
        return client.post("/api/auth/register", json={
            "username": f"reg_{support.uid()}", "email": f"{support.uid()}@example.test",
            "password": "long-enough-pw"}).json()["token"]
    if kind == "garbage":
        return "not-a-token"
    raise AssertionError(kind)


BAD_LINK_TOKENS = ["expired", "wrong purpose", "other key", "tampered", "login token", "register token", "garbage"]


@pytest.mark.parametrize("kind", BAD_LINK_TOKENS)
@pytest.mark.parametrize("route", ["link", "create"])
def test_a_bad_link_token_is_refused(client, google, route, kind):
    token = _bad_link_token(kind, client, google)
    u = support.make_user()
    users_before = len(support.fetch_all(User))
    if route == "link":
        r = link(client, token, u.username)
    else:
        r = create(client, token, f"new_{support.uid()}")
    assert r.status_code == 401
    assert r.json() == {"detail": "This Google sign-in has expired. Please sign in with Google again."}
    assert google_sub_of(u.id) is None
    assert len(support.fetch_all(User)) == users_before


def test_a_link_token_is_not_a_login_token(client, google):
    token = needs_account(client, google)
    u = support.make_user()
    r = client.get(f"/api/users/{u.id}/characters", headers=support.bearer(token))
    assert r.status_code == 401
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    assert support.ws_close_code(client, ch["id"], token=token) == 4401


def test_a_link_token_is_not_a_google_credential(client, google):
    """The stub refuses anything Google did not issue, and so does the real check."""
    assert google_sign_in(client, needs_account(client, google)).status_code == 401


# --- Google's answer ---------------------------------------------------------------------------

def test_a_credential_google_refuses_is_401(client, google):
    r = google_sign_in(client, "a-credential-google-never-issued")
    assert r.status_code == 401
    assert r.json() == {"detail": "Google could not confirm this sign-in. Please try again."}


def test_google_out_of_reach_is_503(client, google):
    google.error = GoogleUnavailableError("Could not fetch certificates")
    r = google_sign_in(client, google.credential())
    assert r.status_code == 503
    assert r.json() == {"detail": "Google could not be reached to check this sign-in. "
                                  "Please try again in a moment."}


def test_google_sign_in_off_without_a_client_id(client, google, monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "")
    r = google_sign_in(client, google.credential())
    assert r.status_code == 503
    assert r.json() == {"detail": "Sign in with Google is not set up on this server."}
    assert google.calls == 0


@pytest.mark.parametrize("body", [{}, {"credential": None}, {"credential": "x" * 8193}])
def test_google_sign_in_body_validation(client, google, body):
    assert client.post("/api/auth/google", json=body).status_code == 422
    assert google.calls == 0


@pytest.mark.parametrize("route,body", [
    ("link", {"link_token": "x" * 8193, "username": "u", "password": "p"}),
    ("link", {"link_token": "t", "username": "u" * 65, "password": "p"}),
    ("link", {"link_token": "t", "username": "u"}),
    ("create", {"link_token": "x" * 8193, "username": "valid name"}),
    ("create", {"username": "valid name"}),
])
def test_link_and_create_body_validation(client, route, body):
    assert client.post(f"/api/auth/google/{route}", json=body).status_code == 422


# --- ALLOW_PASSWORD_LOGIN ----------------------------------------------------------------------

def test_password_login_off(client, google, monkeypatch):
    u = support.make_user()
    headers = support.as_user(u.id)  # logs in while password login is still on
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    off = {"detail": "Password sign-in is turned off. Please use Sign in with Google."}
    r = support.login(client, u.username, support.PASSWORD)
    assert r.status_code == 403
    assert r.json() == off
    username = f"reg_{support.uid()}"
    r = client.post("/api/auth/register", json={
        "username": username, "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    assert r.status_code == 403
    assert r.json() == off
    assert support.fetch_all(User, username=username) == []
    # Google still signs people in, and tokens already issued keep working
    sub = f"g{support.uid(20)}"
    linked = support.make_user(google_sub=sub)
    assert_signed_in_as(google_sign_in(client, google.credential(sub=sub)), linked.id)
    assert client.get(f"/api/users/{u.id}/characters", headers=headers).status_code == 200


def test_password_login_on(client, monkeypatch):
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    u = support.make_user()
    assert support.login(client, u.username, support.PASSWORD).status_code == 200


# --- rate limits ---------------------------------------------------------------------------------

def test_google_sign_in_rate_limit_ten_per_minute(client, google, limiter_on):
    codes = [google_sign_in(client, "never-issued").status_code for _ in range(11)]
    assert codes == [401] * 10 + [429]


def test_link_rate_limit_ten_per_minute(client, google, limiter_on):
    """Linking checks a password, so it is limited like login."""
    u = support.make_user()
    codes = [link(client, "not-a-token", u.username, "guess").status_code for _ in range(11)]
    assert codes == [401] * 10 + [429]


def test_create_rate_limit_five_per_minute(client, google, limiter_on):
    codes = [create(client, "not-a-token", f"n_{support.uid()}").status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]


def test_config_is_not_rate_limited(client, limiter_on):
    assert all(client.get("/api/auth/config").status_code == 200 for _ in range(30))

