"""The account page: POST /api/auth/me/username, /api/auth/me/password, /api/auth/me/email
(with /resend, /cancel and /confirm), /api/auth/me/google/remove, users.has_password, and
the email_change_tokens table (vtt/email_change.py).

vtt.mail.send_email is replaced by a fake (the outbox fixture) and vtt.google.verify_id_token
by a stub (the google fixture): nothing here reaches Resend or Google. Most requests carry a
login token minted with support.fresh_token instead of a login, so that the tests with the
rate limiter on do not spend the login route's per-IP limit.
"""
import hashlib
import logging
import re
import time
from types import SimpleNamespace

import pytest
from limits import parse as parse_limit

import main
import support
from models import EmailChangeToken, PasswordResetToken, User
from vtt import config, email_change, mail, password_reset
from vtt import db as vtt_db
from vtt import google as vtt_google
from vtt.google import GoogleIdentity, GoogleTokenError, GoogleUnavailableError
from vtt.routers import account as account_router
from vtt.routers import auth as auth_router
from vtt.security import user_id_from_token

CLIENT_ID = "test-client-id.apps.googleusercontent.com"
SITE = "https://candela-site.example-site.org"
NEW_PASSWORD = "a-new-password-1"
ACCOUNT_KEYS = {"userId", "name", "email", "googleLinked", "googleEmail", "hasPassword", "pendingEmail"}
_CONFIRM_LINK = re.compile(r"/confirm-email\?token=([A-Za-z0-9_-]+)")
_RESET_LINK = re.compile(r"/reset-password\?token=([A-Za-z0-9_-]+)")
AUTO = object()


def detail(text):
    return {"detail": text}


PROOF_NEEDED = detail("Enter your current password, or confirm with Google.")
WRONG_PASSWORD = detail("That is not this account's password.")
GOOGLE_NOT_THIS_ACCOUNT = detail("That Google account is not the one linked to this account.")
GOOGLE_PROOF_OLD = detail("That Google sign-in is too old. Please confirm with Google again.")
GOOGLE_REFUSED = detail("Google could not confirm this sign-in. Please try again.")
ACCOUNT_CHANGED = detail("The account changed while this was being saved. Please try again.")
CHANGES_LIMITED = detail("Too many account changes. Please try again in an hour.")
USERNAME_TAKEN = detail("That identification is already claimed.")
USERNAME_FIXED = detail("This account's username cannot be changed.")
EMAIL_SAME = detail("That is already your email address.")
EMAIL_NO_MAIL = detail("That email address cannot receive mail.")
EMAIL_UNAVAILABLE = detail("That email address cannot be used.")
EMAIL_CHANGE_OFF = detail("Email changes are not available on this server.")
NO_PENDING_EMAIL = detail("No email change is waiting.")
LINK_INVALID = detail("This link has expired or has already been used.")
LINK_OTHER_ACCOUNT = detail("This link is for another account.")
MAIL_LIMITED = detail("Too many confirmation emails. Please try again in an hour.")
MAIL_PAUSED = detail("Too many emails were sent from this site. Please try again later.")
REMOVE_NO_PASSWORD = detail("Set a password before you remove Google sign-in.")
REMOVE_LOGIN_OFF = detail("Password sign-in is turned off, so Google sign-in cannot be removed.")
PASSWORD_NEEDED = detail("Enter your current password.")


# --- fixtures and helpers -------------------------------------------------------------------

@pytest.fixture
def outbox(monkeypatch):
    """Every email the app sends, instead of sending it."""
    sent = []

    def fake_send(to, subject, text, html):
        sent.append(SimpleNamespace(to=to, subject=subject, text=text, html=html))
        return True

    monkeypatch.setattr(mail, "send_email", fake_send)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    monkeypatch.setattr(config, "RESET_URL_BASE", SITE)
    return sent


@pytest.fixture
def google(monkeypatch):
    """Sign in with Google, stubbed: google.credential(...) gives a credential that verifies
    as that Google account, issued `age` seconds ago (now by default)."""
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", CLIENT_ID)
    issued = {}
    state = SimpleNamespace(calls=0, error=None)

    def fake_verify(credential):
        state.calls += 1
        if state.error is not None:
            raise state.error
        if credential not in issued:
            raise GoogleTokenError("not a test credential")
        return issued[credential]

    def credential(sub=None, email=None, age=0, issued_at=AUTO):
        when = int(time.time()) - age if issued_at is AUTO else issued_at
        identity = GoogleIdentity(sub=sub or f"g{support.uid(20)}", email=email or f"{support.uid()}@gmail.test",
                                  name="Test Player", issued_at=when)
        token = f"credential-{support.uid(16)}"
        issued[token] = identity
        return token

    monkeypatch.setattr(vtt_google, "verify_id_token", fake_verify)
    state.credential = credential
    return state


def address():
    """A unique address on a domain that is not reserved (reserved ones never get mail)."""
    return f"player.{support.uid()}@candela-players.org"


def player(**fields):
    fields.setdefault("email", address())
    return support.make_user(**fields)


def signed_in(user):
    """Headers with a login token for the user's password as it is now (no login)."""
    return support.bearer(support.fresh_token(user.id))


def google_only(**fields):
    """An account made with Google: linked, its email proven, a password nobody knows.
    Returns (user, google_sub, headers)."""
    sub = f"g{support.uid(20)}"
    email = fields.pop("email", None) or address()
    u = support.make_user(email=email, google_sub=sub, google_email=email, email_proven=True,
                          has_password=False, **fields)
    support.update(User, u.id, hashed_password=support.cheap_hash(f"nobody-knows-{support.uid()}"))
    return support.fetch(User, u.id), sub, signed_in(u)


def call(client, route, headers, **body):
    """POST /api/auth/me/<route> with the fields that are not None."""
    return client.post(f"/api/auth/me/{route}", json={k: v for k, v in body.items() if v is not None},
                       headers=headers)


def change_username(client, headers, username, password=support.PASSWORD, credential=None):
    return call(client, "username", headers, username=username, password=password, credential=credential)


def change_password(client, headers, new_password=NEW_PASSWORD, password=support.PASSWORD, credential=None):
    return call(client, "password", headers, new_password=new_password, password=password, credential=credential)


def request_email(client, headers, email, password=support.PASSWORD, credential=None):
    return call(client, "email", headers, email=email, password=password, credential=credential)


def confirm(client, headers, token):
    return call(client, "email/confirm", headers, token=token)


def remove_google(client, headers, password=support.PASSWORD):
    return call(client, "google/remove", headers, password=password)


def me(client, headers):
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def link_token_in(message):
    return _CONFIRM_LINK.search(message.text).group(1)


def asked(client, outbox, user, headers, new_email=None):
    """Asks for a change of the user's address; (new address, token from the link email)."""
    new_email = new_email or address()
    before = len(outbox)
    r = request_email(client, headers, new_email)
    assert r.status_code == 202, r.text
    [link] = [m for m in outbox[before:] if m.to == new_email]
    return new_email, link_token_in(link)


def rows_of(user_id):
    return support.fetch_all(EmailChangeToken, user_id=user_id)


# --- GET /api/auth/me: what the page shows --------------------------------------------------

def test_the_account_shows_whether_it_has_a_password(client, google):
    """has_password is null for an account from before it was recorded, true once a
    password was checked and worked, false for an account made with Google."""
    u = player()
    assert me(client, signed_in(u))["hasPassword"] is None
    token = support.login(client, u.username, support.PASSWORD).json()["token"]
    assert me(client, support.bearer(token))["hasPassword"] is True
    _, _, headers = google_only()
    assert me(client, headers)["hasPassword"] is False


def test_has_password_follows_how_the_password_was_set(client, google, outbox):
    r = client.post("/api/auth/register", json={"username": f"reg_{support.uid()}", "email": address(),
                                                "password": "registered-1"})
    assert me(client, support.bearer(r.json()["token"]))["hasPassword"] is True
    # made with Google: a password nobody knows
    r = client.post("/api/auth/google", json={"credential": google.credential()})
    r = client.post("/api/auth/google/create", json={"link_token": r.json()["link_token"],
                                                       "username": f"g_{support.uid()}"})
    assert me(client, support.bearer(r.json()["token"]))["hasPassword"] is False
    # linked by email by Google's sign-in: the password is replaced
    u = player()
    support.as_user(u.id)
    r = client.post("/api/auth/google", json={"credential": google.credential(email=u.email)})
    assert (r.json()["userId"], support.fetch(User, u.id).has_password) == (u.id, False)
    # a used reset link: the reader chose it
    assert client.post("/api/auth/password-reset", json={"email": u.email}).status_code == 202
    token = _RESET_LINK.search(outbox[-1].text).group(1)
    r = client.post("/api/auth/password-reset/confirm", json={"token": token, "password": NEW_PASSWORD})
    assert (r.status_code, support.fetch(User, u.id).has_password) == (200, True)


def test_a_retired_published_password_is_one_nobody_knows(client):
    rows = support.fetch_all(User, username="finn_ashcroft")
    finn = rows[0] if rows else support.make_user(username="finn_ashcroft")
    support.update(User, finn.id, hashed_password=support.cheap_hash("testpass"), has_password=True)
    assert "finn_ashcroft" in vtt_db.retire_published_passwords()
    assert support.fetch(User, finn.id).has_password is False


def test_init_db_adds_has_password_and_the_table_to_an_older_database(client, monkeypatch):
    from sqlalchemy import inspect as sa_inspect, text
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("DROP TABLE email_change_tokens"))
            conn.execute(text("ALTER TABLE users DROP COLUMN has_password"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        insp = sa_inspect(eng)
        assert "has_password" in {c["name"] for c in insp.get_columns("users")}
        indexes = {i["name"]: (i["column_names"], bool(i["unique"])) for i in insp.get_indexes("email_change_tokens")}
        assert indexes["ix_email_change_tokens_token_hash"] == (["token_hash"], True)
        assert indexes["ix_email_change_tokens_user_id"] == (["user_id"], False)
        [fk] = insp.get_foreign_keys("email_change_tokens")
        assert (fk["referred_table"], fk["options"].get("ondelete")) == ("users", "CASCADE")
        # The seed runs before the ALTERs (the QUIRK in test_00_startup.py), so the admin
        # row comes with the next start. Its password is one nobody knows.
        main.init_db()
        with Session() as s:
            assert s.query(User.has_password).filter(User.username == "admin").scalar() is False


# --- the proof every change needs ------------------------------------------------------------

def test_a_login_token_alone_changes_nothing(client, google, outbox):
    """Tokens last 30 days and cannot be revoked one at a time, so a stolen one must not
    be enough to change the name, the password or the address."""
    u = player()
    headers = signed_in(u)
    for r in (change_username(client, headers, f"n_{support.uid()}", password=None),
              change_password(client, headers, password=None),
              request_email(client, headers, address(), password=None),
              change_password(client, headers, password="")):
        assert (r.status_code, r.json()) == (403, PROOF_NEEDED)
    row = support.fetch(User, u.id)
    assert (row.username, row.email, row.hashed_password) == (u.username, u.email, u.hashed_password)
    assert me(client, headers)["userId"] == u.id  # 403, not 401: the session stays


def test_a_wrong_password_changes_nothing(client, google, outbox, caplog):
    u = player()
    headers = signed_in(u)
    with caplog.at_level(logging.WARNING, logger="candela"):
        for r in (change_username(client, headers, f"n_{support.uid()}", password="a-guess-1"),
                  change_password(client, headers, password="a-guess-2"),
                  request_email(client, headers, address(), password="a-guess-3")):
            assert (r.status_code, r.json()) == (403, WRONG_PASSWORD)
    assert support.fetch(User, u.id).username == u.username
    assert support.login(client, u.username, support.PASSWORD).status_code == 200
    assert "a-guess" not in caplog.text
    assert f"user id={u.id}" in caplog.text


def test_a_wrong_password_is_refused_even_with_a_good_google_proof(client, google):
    u, sub, headers = google_only()
    r = change_username(client, headers, f"n_{support.uid()}", password="a-guess",
                        credential=google.credential(sub=sub))
    assert (r.status_code, r.json()) == (403, WRONG_PASSWORD)


def test_a_fresh_google_sign_in_of_the_linked_account_is_proof(client, google):
    u, sub, headers = google_only()
    name = f"Renamed {support.uid()}"
    r = change_username(client, headers, name, password=None, credential=google.credential(sub=sub, age=60))
    assert r.status_code == 200, r.text
    assert r.json()["name"] == name


def test_another_google_account_is_no_proof(client, google):
    u, sub, headers = google_only()
    r = change_username(client, headers, f"n_{support.uid()}", password=None,
                        credential=google.credential(email=u.email))  # same email, another account
    assert (r.status_code, r.json()) == (403, GOOGLE_NOT_THIS_ACCOUNT)
    # an account with no Google link has no Google proof at all
    v = player()
    r = change_username(client, signed_in(v), f"n_{support.uid()}", password=None,
                        credential=google.credential(email=v.email))
    assert (r.status_code, r.json()) == (403, GOOGLE_NOT_THIS_ACCOUNT)


@pytest.mark.parametrize("issued", ["six minutes ago", "unknown"])
def test_an_old_google_sign_in_is_no_proof(client, google, issued):
    """Only a sign-in made for this change: Google's ID tokens last an hour."""
    u, sub, headers = google_only()
    credential = (google.credential(sub=sub, age=6 * 60) if issued == "six minutes ago"
                  else google.credential(sub=sub, issued_at=None))
    r = change_password(client, headers, password=None, credential=credential)
    assert (r.status_code, r.json()) == (403, GOOGLE_PROOF_OLD)
    assert support.fetch(User, u.id).has_password is False


def test_a_google_proof_google_refuses_is_400_and_keeps_the_session(client, google):
    """Not 401 as on the sign-in routes: the browser ends the session on any 401."""
    u, sub, headers = google_only()
    r = change_username(client, headers, f"n_{support.uid()}", password=None, credential="never-issued")
    assert (r.status_code, r.json()) == (400, GOOGLE_REFUSED)
    assert me(client, headers)["userId"] == u.id


def test_a_google_proof_without_google(client, google, monkeypatch):
    u, sub, headers = google_only()
    google.error = GoogleUnavailableError("no certificates")
    r = change_username(client, headers, f"n_{support.uid()}", password=None, credential=google.credential(sub=sub))
    assert r.status_code == 503
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "")
    google.error = None
    calls = google.calls
    r = change_username(client, headers, f"n_{support.uid()}", password=None, credential=google.credential(sub=sub))
    assert (r.status_code, r.json()) == (503, detail("Sign in with Google is not set up on this server."))
    assert google.calls == calls


@pytest.mark.parametrize("route,body", [
    ("username", {"username": "Some Name"}),
    ("password", {"new_password": NEW_PASSWORD}),
    ("email", {"email": "someone@candela-players.org"}),
    ("email/resend", {}),
    ("email/cancel", {}),
    ("email/confirm", {"token": "t"}),
    ("google/remove", {"password": "p"}),
])
def test_every_route_needs_a_login_token_before_anything_else(client, google, route, body):
    calls = google.calls
    r = client.post(f"/api/auth/me/{route}", json={**body, "credential": google.credential()})
    assert (r.status_code, r.json()) == (401, detail("Not authenticated."))
    assert google.calls == calls


@pytest.mark.parametrize("route,body", [
    ("username", {}),
    ("username", {"username": "x"}),
    ("username", {"username": "n" * 33}),
    ("username", {"username": "bad/name"}),
    ("username", {"username": "Fine Name", "password": "p" * 1025}),
    ("username", {"username": "Fine Name", "credential": "c" * 8193}),
    ("password", {}),
    ("password", {"new_password": "short"}),
    ("password", {"new_password": "p" * 129}),
    ("email", {}),
    ("email", {"email": "no-at-sign"}),
    ("email", {"email": "a b@candela-players.org"}),
    ("email", {"email": "x" * 250 + "@c.org"}),
    ("email/confirm", {}),
    ("email/confirm", {"token": "t" * 257}),
    ("google/remove", {}),
    ("google/remove", {"password": "p" * 1025}),
])
def test_body_validation(client, google, route, body):
    u = player()
    r = client.post(f"/api/auth/me/{route}", json=body, headers=signed_in(u))
    assert r.status_code == 422, r.text
    assert google.calls == 0


def test_bcrypt_runs_off_the_event_loop(client, monkeypatch):
    import asyncio
    on_loop = []
    real_verify, real_hash = main.pwd_context.verify, main.pwd_context.hash

    def spy(real):
        def run(*args, **kwargs):
            try:
                asyncio.get_running_loop()
                on_loop.append(real.__name__)
            except RuntimeError:
                pass
            return real(*args, **kwargs)
        return run

    u = player()
    headers = signed_in(u)
    monkeypatch.setattr(main.pwd_context, "verify", spy(real_verify))
    monkeypatch.setattr(main.pwd_context, "hash", spy(real_hash))
    assert change_password(client, headers).status_code == 200
    assert on_loop == []


# --- username ---------------------------------------------------------------------------------

def test_change_the_username(client):
    u = player()
    headers = signed_in(u)
    name = f"New Name {support.uid()}"
    r = change_username(client, headers, name)
    assert r.status_code == 200, r.text
    assert set(r.json()) == ACCOUNT_KEYS
    assert (r.json()["userId"], r.json()["name"]) == (u.id, name)
    assert me(client, headers)["name"] == name  # the session goes on
    assert support.login(client, name, support.PASSWORD).json()["name"] == name
    assert support.login(client, u.username, support.PASSWORD).status_code == 401


def test_the_new_name_is_shown_where_the_name_appears(client):
    """The GM's notebook entries are signed with the username as it is when written."""
    u = player()
    camp = support.new_campaign(client, gm_user_id=u.id)
    name = f"Keeper {support.uid()}"
    assert change_username(client, signed_in(u), name).status_code == 200
    r = client.post(f"/api/notebook/{camp['id']}/entries", headers=signed_in(u), json={
        "title": "T", "content": "C", "author_name": "ignored", "author_type": "gm"})
    assert r.status_code == 201, r.text
    assert r.json()["author_name"] == name
    body = support.login(client, name, support.PASSWORD).json()
    assert (body["role"], body["name"]) == ("GM", name)


def test_a_taken_username_is_refused_ignoring_case(client):
    other = player(username=f"Taken_{support.uid()}")
    u = player()
    for name in (other.username, other.username.upper(), other.username.lower()):
        r = change_username(client, signed_in(u), name)
        assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    assert support.fetch(User, u.id).username == u.username


def test_a_change_of_case_of_ones_own_name_is_allowed(client):
    u = player(username=f"quiet_{support.uid()}")
    r = change_username(client, signed_in(u), u.username.upper())
    assert (r.status_code, r.json()["name"]) == (200, u.username.upper())


def test_the_same_name_changes_nothing(client):
    u = player()
    r = change_username(client, signed_in(u), u.username)
    assert (r.status_code, r.json()["name"]) == (200, u.username)


@pytest.mark.parametrize("name", ["admin", "Keeper_Test", "ELARA_VOSS"])
def test_nobody_takes_a_seeded_name(client, name):
    """The seeded accounts' protections go by their names (never linked by email, no
    reset emails), so no one else may wear one, even where the seed account is missing."""
    u = player()
    r = change_username(client, signed_in(u), name)
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)


def test_a_seeded_account_keeps_its_name(client):
    rows = support.fetch_all(User, username="sable_devereux")
    sable = rows[0] if rows else support.make_user(username="sable_devereux")
    support.update(User, sable.id, hashed_password=support.password_hash())
    r = change_username(client, signed_in(sable), f"free_{support.uid()}")
    assert (r.status_code, r.json()) == (403, USERNAME_FIXED)
    assert support.fetch(User, sable.id).username == "sable_devereux"


def test_a_name_taken_by_another_request_meanwhile(client, monkeypatch):
    """The unique index catches what the check before the write missed."""
    other = player()
    u = player()
    monkeypatch.setattr(account_router, "name_taken_by_another", lambda db, user, name: False)
    r = change_username(client, signed_in(u), other.username)
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    assert support.fetch(User, u.id).username == u.username


def test_a_change_after_the_password_changed_meanwhile_writes_nothing(client, monkeypatch):
    """Every write is conditional on the password hash the proof checked."""
    u = player()

    async def stale_proof(user, body, action):
        return account_router.Proof("password", "a hash from before")

    monkeypatch.setattr(account_router, "proven", stale_proof)
    r = change_username(client, signed_in(u), f"n_{support.uid()}")
    assert (r.status_code, r.json()) == (409, ACCOUNT_CHANGED)
    assert support.fetch(User, u.id).username == u.username


def test_a_name_change_touches_only_the_caller(client):
    u, bystander = player(), player()
    assert change_username(client, signed_in(u), f"n_{support.uid()}").status_code == 200
    assert support.fetch(User, bystander.id).username == bystander.username


# --- password ---------------------------------------------------------------------------------

def test_change_the_password(client):
    u = player()
    old_headers = support.as_user(u.id)
    r = change_password(client, old_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == ACCOUNT_KEYS | {"token"}
    assert (body["userId"], body["hasPassword"]) == (u.id, True)
    assert user_id_from_token(body["token"]) == u.id
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200
    assert support.login(client, u.username, support.PASSWORD).status_code == 401


def test_a_new_password_ends_the_other_sessions_and_keeps_this_one(client):
    u = player()
    ch = support.forge(client, user_id=u.id)
    this_tab, other_tab = support.as_user(u.id), signed_in(u)
    new_token = change_password(client, this_tab).json()["token"]
    url = f"/api/users/{u.id}/characters"
    for headers in (this_tab, other_tab):
        assert client.get(url, headers=headers).status_code == 401
    assert support.ws_close_code(client, ch["id"], token=support.token_for(u.id)) == 4401
    assert client.get(url, headers=support.bearer(new_token)).status_code == 200
    with support.ws_connect(client, ch["id"], token=new_token) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]


def test_a_new_password_closes_the_users_open_sockets(client):
    """As a reset does: a socket only checks its token when it connects, so it would
    otherwise stay open. Other users' sockets stay."""
    u = player()
    camp = support.new_campaign(client, gm_user_id=u.id)
    ch = support.forge(client, user_id=u.id)
    fellow = support.active_member(client, camp)
    headers = support.as_user(u.id)
    with support.ws_connect(client, ch["id"]) as own, \
            support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, fellow["id"]) as other:
        assert change_password(client, headers).status_code == 200
        for ws in (own, gm):
            with pytest.raises(support.Closed) as closed:
                ws.recv()
            assert closed.value.code == 4401
        assert support.server_sockets(ch["id"]) == []
        assert support.server_sockets(camp["campaign_code"]) == []
        other.send("update_pen_font", pen_font="Kalam")
        assert other.recv()["payload"]["pen_font"] == "Kalam"


def test_a_failed_password_change_closes_nothing(client):
    u = player()
    ch = support.forge(client, user_id=u.id)
    with support.ws_connect(client, ch["id"]) as ws:
        assert change_password(client, support.as_user(u.id), password="a-guess").status_code == 403
        ws.send("update_pen_font", pen_font="Kalam")
        assert ws.recv()["payload"]["pen_font"] == "Kalam"


def test_set_a_password_with_a_fresh_google_sign_in(client, google):
    """An account made with Google has a password nobody knows. It sets one with a
    Google sign-in of its own Google account, then can sign in with it."""
    u, sub, headers = google_only()
    assert me(client, headers)["hasPassword"] is False
    r = change_password(client, headers, password=None, credential=google.credential(sub=sub))
    assert r.status_code == 200, r.text
    assert r.json()["hasPassword"] is True
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401  # the old session ended
    # Google still signs in to the account
    r = client.post("/api/auth/google", json={"credential": google.credential(sub=sub)})
    assert r.json()["userId"] == u.id


def test_a_new_password_ends_a_waiting_email_change(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    new_token = change_password(client, headers).json()["token"]
    assert rows_of(u.id) == []
    assert me(client, support.bearer(new_token))["pendingEmail"] is None
    r = confirm(client, support.bearer(new_token), token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


def test_a_new_password_ends_earlier_reset_links(client, outbox):
    u = player()
    assert client.post("/api/auth/password-reset", json={"email": u.email}).status_code == 202
    reset = _RESET_LINK.search(outbox[-1].text).group(1)
    assert change_password(client, signed_in(u)).status_code == 200
    r = client.post("/api/auth/password-reset/confirm", json={"token": reset, "password": "yet-another-1"})
    assert r.status_code == 400
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200


# --- email address ----------------------------------------------------------------------------

def test_asking_for_a_new_address_mails_a_link_and_a_notice(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email = address()
    before = int(time.time())
    r = request_email(client, headers, f"  {new_email} ")
    assert r.status_code == 202, r.text
    assert set(r.json()) == ACCOUNT_KEYS
    assert (r.json()["email"], r.json()["pendingEmail"]) == (u.email, new_email)
    link, notice = sorted(outbox, key=lambda m: m.to != new_email)
    assert (link.to, link.subject) == (new_email, "Confirm your new Candela Obscura email address")
    token = link_token_in(link)
    assert f"{SITE}/confirm-email?token={token}" in link.text
    assert f'href="{SITE}/confirm-email?token={token}"' in link.html
    assert u.username in link.text and "expires in one hour" in link.text
    assert (notice.to, notice.subject) == (u.email, "Your Candela Obscura email address is being changed")
    assert u.username in notice.text and "p***@candela-players.org" in notice.text
    assert new_email not in notice.text + notice.html and token not in notice.text + notice.html
    for message in (link, notice):
        assert "—" not in message.text + message.html  # no em dashes in the copy
    # nothing changes until the link is used
    assert support.fetch(User, u.id).email == u.email
    assert me(client, headers)["pendingEmail"] == new_email
    [row] = rows_of(u.id)
    assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in (row.token_hash, row.password_stamp)
    assert (row.new_email, row.old_email) == (new_email, u.email)
    assert before <= row.created_at <= int(time.time()) and row.expires_at - row.created_at == 3600
    assert len(token) >= 43


def test_the_link_changes_the_address(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    r = confirm(client, headers, token)
    assert r.status_code == 200, r.text
    assert set(r.json()) == ACCOUNT_KEYS
    assert (r.json()["email"], r.json()["pendingEmail"]) == (new_email, None)
    row = support.fetch(User, u.id)
    assert (row.email, row.email_proven) == (new_email, True)
    assert rows_of(u.id) == []
    assert me(client, headers)["email"] == new_email  # sessions stay
    # reset emails now go to the new address only
    before = len(outbox)
    client.post("/api/auth/password-reset", json={"email": u.email})
    client.post("/api/auth/password-reset", json={"email": new_email})
    assert [m.to for m in outbox[before:]] == [new_email]


def test_a_link_works_once(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    assert confirm(client, headers, token).status_code == 200
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


def test_a_link_expires_after_an_hour(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    [row] = rows_of(u.id)
    support.update(EmailChangeToken, row.id, expires_at=int(time.time()) - 1)
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.fetch(User, u.id).email == u.email
    assert me(client, headers)["pendingEmail"] is None


def test_a_link_works_until_it_expires(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    [row] = rows_of(u.id)
    support.update(EmailChangeToken, row.id, expires_at=int(time.time()) + 10)
    assert confirm(client, headers, token).status_code == 200


def test_expired_links_are_forgotten(client, outbox):
    u = player()
    asked(client, outbox, u, signed_in(u))
    [row] = rows_of(u.id)
    support.update(EmailChangeToken, row.id, expires_at=int(time.time()) - 1)
    v = player()
    asked(client, outbox, v, signed_in(v))  # any request clears out expired links
    assert rows_of(u.id) == []


def test_another_users_session_cannot_use_the_link(client, outbox):
    """The link alone is not enough: the user who asked must be signed in. Whoever reads
    another person's mail, or a link scanner, changes nothing."""
    u, other = player(), player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    r = confirm(client, signed_in(other), token)
    assert (r.status_code, r.json()) == (403, LINK_OTHER_ACCOUNT)
    assert (support.fetch(User, u.id).email, support.fetch(User, other.id).email) == (u.email, other.email)
    assert confirm(client, headers, token).status_code == 200  # still good for its owner


@pytest.mark.parametrize("token", ["", "x", "not-a-real-token-at-all-0123456789abcdefghij", "A" * 256])
def test_an_unknown_link_is_400(client, token):
    u = player()
    r = confirm(client, signed_in(u), token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


def test_a_password_change_by_any_way_ends_the_link(client, outbox):
    u = player()
    _, token = asked(client, outbox, u, signed_in(u))
    support.update(User, u.id, hashed_password=support.cheap_hash("changed-elsewhere"))
    r = confirm(client, signed_in(u), token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.fetch(User, u.id).email == u.email


def test_an_address_changed_meanwhile_ends_the_link(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    elsewhere = address()
    support.update(User, u.id, email=elsewhere)
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.fetch(User, u.id).email == elsewhere


def test_asking_again_replaces_the_older_link(client, outbox):
    u = player()
    headers = signed_in(u)
    _, first = asked(client, outbox, u, headers)
    second_email, second = asked(client, outbox, u, headers)
    assert len(rows_of(u.id)) == 1
    assert me(client, headers)["pendingEmail"] == second_email
    assert (confirm(client, headers, first).status_code, confirm(client, headers, first).json()) == (400, LINK_INVALID)
    assert confirm(client, headers, second).json()["email"] == second_email


def test_resend_mails_a_new_link_to_the_same_address(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email, first = asked(client, outbox, u, headers)
    [row] = rows_of(u.id)
    before = len(outbox)
    r = call(client, "email/resend", headers)
    assert (r.status_code, r.json()["pendingEmail"]) == (202, new_email)
    [message] = outbox[before:]  # no second notice to the old address
    assert message.to == new_email
    second = link_token_in(message)
    assert second != first
    [again] = rows_of(u.id)
    assert (again.expires_at, again.new_email) == (row.expires_at, new_email)  # no longer than the first
    assert confirm(client, headers, first).status_code == 400
    assert confirm(client, headers, second).json()["email"] == new_email


def test_resend_without_a_waiting_change(client, outbox):
    u = player()
    r = call(client, "email/resend", signed_in(u))
    assert (r.status_code, r.json()) == (409, NO_PENDING_EMAIL)
    assert outbox == []


def test_cancel_drops_the_waiting_change(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    r = call(client, "email/cancel", headers)
    assert (r.status_code, r.json()["pendingEmail"], r.json()["email"]) == (200, None, u.email)
    assert rows_of(u.id) == []
    assert confirm(client, headers, token).status_code == 400
    # a second cancel is fine
    assert call(client, "email/cancel", headers).status_code == 200


def test_the_same_address_is_refused(client, outbox):
    u = player()
    r = request_email(client, signed_in(u), f"  {u.email.upper()} ")
    assert (r.status_code, r.json()) == (400, EMAIL_SAME)
    assert outbox == []


@pytest.mark.parametrize("new_email", ["someone@example.test", "someone@example.com", "someone@intranet",
                                       "soméone@candela-players.org"])
def test_an_address_mail_cannot_reach_is_refused(client, outbox, new_email):
    u = player()
    r = request_email(client, signed_in(u), new_email)
    assert (r.status_code, r.json()) == (422, EMAIL_NO_MAIL)
    assert outbox == [] and rows_of(u.id) == []


def test_an_address_another_account_has_is_refused(client, outbox):
    other = player()
    u = player()
    r = request_email(client, signed_in(u), other.email.upper())
    assert (r.status_code, r.json()) == (409, EMAIL_UNAVAILABLE)
    assert outbox == [] and rows_of(u.id) == []


def test_an_address_taken_before_the_link_is_used(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    player(email=new_email.upper())
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (409, EMAIL_UNAVAILABLE)
    assert support.fetch(User, u.id).email == u.email


def test_an_address_taken_by_another_request_meanwhile(client, outbox, monkeypatch):
    """The unique index on the address catches what the check before the write missed."""
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    player(email=new_email)
    monkeypatch.setattr(email_change, "address_taken", lambda db, user, address: False)
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (409, EMAIL_UNAVAILABLE)
    assert support.fetch(User, u.id).email == u.email


def test_use_lets_one_of_two_requests_through(client, outbox):
    u = player()
    _, token = asked(client, outbox, u, signed_in(u))
    with main.SessionLocal() as first, main.SessionLocal() as second:
        row1, row2 = email_change.find(first, token), email_change.find(second, token)
        user1, user2 = first.get(User, u.id), second.get(User, u.id)
        assert email_change.use(first, row1, user1)
        first.commit()
        assert not email_change.use(second, row2, user2)
        second.rollback()


def test_a_used_link_ends_the_reset_links_sent_to_the_old_address(client, outbox):
    u = player()
    headers = signed_in(u)
    assert client.post("/api/auth/password-reset", json={"email": u.email}).status_code == 202
    reset = _RESET_LINK.search(outbox[-1].text).group(1)
    _, token = asked(client, outbox, u, headers)
    assert confirm(client, headers, token).status_code == 200
    assert support.fetch_all(PasswordResetToken, user_id=u.id) == []
    r = client.post("/api/auth/password-reset/confirm", json={"token": reset, "password": "a-takeover-1"})
    assert r.status_code == 400


def test_a_reset_ends_a_waiting_change(client, outbox):
    """Whoever reads the current address owns the account; a change someone else asked
    for with the password ends with the reset."""
    u = player()
    _, token = asked(client, outbox, u, signed_in(u))
    assert client.post("/api/auth/password-reset", json={"email": u.email}).status_code == 202
    reset = _RESET_LINK.search(outbox[-1].text).group(1)
    body = client.post("/api/auth/password-reset/confirm", json={"token": reset, "password": NEW_PASSWORD}).json()
    assert rows_of(u.id) == []
    assert confirm(client, support.bearer(body["token"]), token).status_code == 400


def test_a_google_only_account_changes_its_address_with_google(client, outbox, google):
    u, sub, headers = google_only()
    r = request_email(client, headers, address(), password=None, credential=google.credential(sub=sub))
    assert r.status_code == 202, r.text


def test_a_proven_google_link_becomes_unproven_with_a_new_address(client, outbox, google):
    """The link was proven by the old address. With another address it is unproven, so a
    reset by whoever reads the new address removes it (AUTH.md, Data)."""
    u, sub, headers = google_only()
    support.update(User, u.id, hashed_password=support.password_hash(), has_password=True)
    headers = signed_in(u)
    assert auth_router.proven_link(support.fetch(User, u.id))
    new_email, token = asked(client, outbox, u, headers)
    assert confirm(client, headers, token).status_code == 200
    row = support.fetch(User, u.id)
    assert (row.google_sub, row.email) == (sub, new_email)
    assert not auth_router.proven_link(row)
    assert client.post("/api/auth/password-reset", json={"email": new_email}).status_code == 202
    reset = _RESET_LINK.search(outbox[-1].text).group(1)
    r = client.post("/api/auth/password-reset/confirm", json={"token": reset, "password": NEW_PASSWORD})
    assert r.json()["googleUnlinked"] is True


def test_an_unproven_google_link_is_proven_by_its_own_address(client, outbox):
    gmail = address()
    u = player(google_sub=f"g{support.uid(20)}", google_email=gmail)
    headers = signed_in(u)
    assert not auth_router.proven_link(support.fetch(User, u.id))
    _, token = asked(client, outbox, u, headers, new_email=gmail.upper())
    assert confirm(client, headers, token).status_code == 200
    assert auth_router.proven_link(support.fetch(User, u.id))


def test_seeded_and_reserved_old_addresses_get_no_notice(client, outbox):
    rows = support.fetch_all(User, username="rook_halcyon")
    rook = rows[0] if rows else support.make_user(username="rook_halcyon")
    support.update(User, rook.id, hashed_password=support.password_hash(), email=address())
    reserved = support.make_user(email=f"someone.{support.uid()}@example.test")
    for u in (support.fetch(User, rook.id), reserved):
        before = len(outbox)
        new_email, _ = asked(client, outbox, u, signed_in(u))
        assert [m.to for m in outbox[before:]] == [new_email]


def test_without_reset_url_base_no_link_is_issued(client, outbox, monkeypatch):
    monkeypatch.setattr(config, "RESET_URL_BASE", "")
    u = player()
    headers = signed_in(u)
    r = request_email(client, headers, address())
    assert (r.status_code, r.json()) == (503, EMAIL_CHANGE_OFF)
    assert outbox == [] and rows_of(u.id) == []


def test_a_request_succeeds_without_a_resend_key(client, monkeypatch, caplog):
    """The real send_email runs: no key, so it logs and sends nothing."""
    monkeypatch.setattr(config, "RESEND_API_KEY", "")
    monkeypatch.setattr(config, "RESET_URL_BASE", SITE)
    u = player()
    with caplog.at_level(logging.WARNING, logger="candela"):
        r = request_email(client, signed_in(u), address())
    assert r.status_code == 202
    assert "RESEND_API_KEY is not set" in caplog.text
    assert len(rows_of(u.id)) == 1


def test_the_log_names_no_address_token_or_password(client, outbox, caplog):
    u = player()
    headers = signed_in(u)
    with caplog.at_level(logging.INFO, logger="candela"):
        new_email, token = asked(client, outbox, u, headers)
        assert confirm(client, headers, token).status_code == 200
        new_token = change_password(client, headers).json()["token"]
        assert change_username(client, support.bearer(new_token), f"n_{support.uid()}", password=NEW_PASSWORD
                               ).status_code == 200
    for secret in (new_email, u.email, token, NEW_PASSWORD, support.PASSWORD, new_token):
        assert secret not in caplog.text
    for line in ("Sent an email change link", "Changed the email address", "Set a new password",
                 "Changed the username"):
        assert f"{line}" in caplog.text


def test_the_emails_escape_the_username():
    link = email_change.link_email("a@b.org", "<b>Mallory</b> & co", "https://x.org/confirm-email?token=abc")
    notice = email_change.notice_email("a@b.org", "<b>Mallory</b> & co", "new@b.org")
    for message in (link, notice):
        assert "<b>Mallory</b>" not in message.html
        assert "&lt;b&gt;Mallory&lt;/b&gt; &amp; co" in message.html


@pytest.mark.parametrize("given,shown", [("nora@candela-players.org", "n***@candela-players.org"),
                                         ("x@y.org", "x***@y.org")])
def test_the_notice_masks_the_new_address(given, shown):
    assert email_change.masked(given) == shown


# --- Google sign-in -----------------------------------------------------------------------------

def test_remove_google_sign_in(client, google):
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub, google_email="mine@gmail.test")
    headers = signed_in(u)
    r = remove_google(client, headers)
    assert r.status_code == 200, r.text
    assert (r.json()["googleLinked"], r.json()["googleEmail"], r.json()["hasPassword"]) == (False, None, True)
    row = support.fetch(User, u.id)
    assert (row.google_sub, row.google_email) == (None, None)
    assert me(client, headers)["userId"] == u.id  # sessions stay
    assert client.post("/api/auth/google", json={"credential": google.credential(sub=sub)}).json()["needs_account"]
    assert support.login(client, u.username, support.PASSWORD).status_code == 200


def test_remove_google_needs_the_right_password(client, google):
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub)
    headers = signed_in(u)
    for password, answer in (("a-guess", WRONG_PASSWORD), ("", PASSWORD_NEEDED)):
        r = remove_google(client, headers, password=password)
        assert (r.status_code, r.json()) == (403, answer)
    assert support.fetch(User, u.id).google_sub == sub


def test_remove_google_takes_no_google_proof(client, google):
    u, sub, headers = google_only()
    r = client.post("/api/auth/me/google/remove", json={"credential": google.credential(sub=sub)}, headers=headers)
    assert r.status_code == 422
    assert support.fetch(User, u.id).google_sub == sub


def test_removing_google_from_an_account_without_a_password_is_refused(client, google):
    """It would lock the account: nobody knows its password."""
    u, sub, headers = google_only()
    r = remove_google(client, headers, password="anything")
    assert (r.status_code, r.json()) == (409, REMOVE_NO_PASSWORD)
    assert support.fetch(User, u.id).google_sub == sub
    # once it has a password of its own, Google can go
    r = change_password(client, headers, password=None, credential=google.credential(sub=sub))
    headers = support.bearer(r.json()["token"])
    r = remove_google(client, headers, password=NEW_PASSWORD)
    assert (r.status_code, r.json()["googleLinked"]) == (200, False)


def test_removing_google_with_password_sign_in_off_is_refused(client, google, monkeypatch):
    """With password sign-in off, Google is the only way in."""
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub)
    headers = signed_in(u)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    r = remove_google(client, headers)
    assert (r.status_code, r.json()) == (409, REMOVE_LOGIN_OFF)
    assert support.fetch(User, u.id).google_sub == sub


def test_removing_google_where_none_is_linked_changes_nothing(client):
    u = player()
    r = remove_google(client, signed_in(u))
    assert (r.status_code, r.json()["googleLinked"]) == (200, False)


def test_remove_google_after_the_account_changed_meanwhile(client, monkeypatch):
    """Conditional on the link and the password the route checked."""
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub)
    real_check = auth_router.check_password

    def check_then_relink(password, user):
        ok = real_check(password, user)
        support.update(User, user.id, google_sub=f"g{support.uid(20)}")
        return ok

    monkeypatch.setattr(account_router, "check_password", check_then_relink)
    r = remove_google(client, signed_in(u))
    assert (r.status_code, r.json()) == (409, ACCOUNT_CHANGED)
    assert support.fetch(User, u.id).google_sub is not None


def test_add_google_sign_in_still_needs_a_proof(client, google):
    """"Add Google sign-in" is POST /api/auth/me/google (test_auth_google.py): a password,
    or a Google account with the account's own address."""
    u = player()
    r = client.post("/api/auth/me/google", json={"credential": google.credential()}, headers=signed_in(u))
    assert r.status_code == 403
    r = client.post("/api/auth/me/google", json={"credential": google.credential(), "password": support.PASSWORD},
                    headers=signed_in(u))
    assert (r.status_code, r.json()["googleLinked"], r.json()["hasPassword"]) == (200, True, True)


# --- rate limits ------------------------------------------------------------------------------

def test_the_real_limits():
    assert str(auth_router.ACCOUNT_CHANGE_LIMIT) == "10 per 1 hour"
    assert str(email_change.EMAIL_CHANGE_MAIL_LIMIT) == "3 per 1 hour"
    assert account_router.GOOGLE_PROOF_MAX_AGE_SECONDS == 300
    assert email_change.EMAIL_CHANGE_EXPIRE_MINUTES == 60


def test_each_route_is_limited_per_ip(client, outbox, limiter_on):
    """Ten a minute from one client, whoever is signed in (each request here is from
    another user, so the per-user limit does not come into it)."""
    codes = [change_username(client, signed_in(player()), f"n_{support.uid()}", password="a-guess").status_code
             for _ in range(11)]
    assert codes == [403] * 10 + [429]


def test_changes_are_limited_per_user(client, outbox, google, limiter_on, monkeypatch):
    """Counted for every request, refused ones too, on every route that changes the
    account (linking Google included), so a stolen session cannot guess the password
    faster by spreading over routes or clients."""
    monkeypatch.setattr(auth_router, "ACCOUNT_CHANGE_LIMIT", parse_limit("5/hour"))
    u = player(google_sub=f"g{support.uid(20)}")
    headers = signed_in(u)
    answers = [
        change_username(client, headers, f"n_{support.uid()}", password="a-guess"),
        change_password(client, headers, password="a-guess"),
        request_email(client, headers, address(), password="a-guess"),
        remove_google(client, headers, password="a-guess"),
        client.post("/api/auth/me/google", json={"credential": "never-issued"}, headers=headers),
        confirm(client, headers, "no-such-link"),
    ]
    assert [r.status_code for r in answers] == [403, 403, 403, 403, 400, 429]
    assert answers[-1].json() == CHANGES_LIMITED
    r = change_username(client, headers, f"n_{support.uid()}")  # even with the right password
    assert (r.status_code, r.json()) == (429, CHANGES_LIMITED)
    other = player()
    assert change_username(client, signed_in(other), f"n_{support.uid()}").status_code == 200


def test_confirmation_emails_are_limited_per_user(client, outbox, limiter_on):
    u = player()
    headers = signed_in(u)
    for _ in range(2):
        asked(client, outbox, u, headers)
    assert call(client, "email/resend", headers).status_code == 202
    sent = len(outbox)
    r = request_email(client, headers, address())
    assert (r.status_code, r.json()) == (429, MAIL_LIMITED)
    r = call(client, "email/resend", headers)
    assert (r.status_code, r.json()) == (429, MAIL_LIMITED)
    assert len(outbox) == sent
    v = player()
    asked(client, outbox, v, signed_in(v))  # another user's emails go on


def test_the_overall_mail_caps_are_shared_with_reset_emails(client, outbox, limiter_on, monkeypatch, caplog):
    """The same Resend quota, so the same caps: one email change (a link and a notice)
    and one reset email use up three."""
    monkeypatch.setattr(password_reset, "MAIL_LIMITS", (parse_limit("3/hour"), parse_limit("50/day")))
    u = player()
    asked(client, outbox, u, signed_in(u))
    reset_target = player()
    assert client.post("/api/auth/password-reset", json={"email": reset_target.email}).status_code == 202
    assert len(outbox) == 3
    v = player()
    with caplog.at_level(logging.ERROR, logger="candela"):
        r = request_email(client, signed_in(v), address())
    assert (r.status_code, r.json()) == (429, MAIL_PAUSED)
    assert "overall cap on emails" in caplog.text
    assert client.post("/api/auth/password-reset", json={"email": player().email}).status_code == 202
    assert len(outbox) == 3 and rows_of(v.id) == []


def test_taken_addresses_count_as_register_refusals(client, outbox, limiter_on, monkeypatch):
    """Whether an address has an account is what register's refusal limit guards."""
    monkeypatch.setattr(auth_router, "REGISTER_REFUSAL_LIMIT", parse_limit("2/hour"))
    u = player()
    headers = signed_in(u)
    for _ in range(2):
        assert request_email(client, headers, player().email).status_code == 409
    r = request_email(client, headers, address())
    assert (r.status_code, r.json()) == (429, detail("Too many accounts could not be created from here. "
                                                     "Please try again in an hour."))
    r = client.post("/api/auth/register", json={"username": f"r_{support.uid()}", "email": address(),
                                                "password": "registered-1"})
    assert r.status_code == 429


def test_confirm_is_limited_per_ip(client, limiter_on):
    codes = [confirm(client, signed_in(player()), f"guess-{n}").status_code for n in range(11)]
    assert codes == [400] * 10 + [429]


def test_cancel_is_not_limited_per_user(client, limiter_on, monkeypatch):
    """The owner can always drop a change someone else asked for."""
    monkeypatch.setattr(auth_router, "ACCOUNT_CHANGE_LIMIT", parse_limit("1/hour"))
    u = player()
    headers = signed_in(u)
    change_username(client, headers, f"n_{support.uid()}", password="a-guess")
    assert change_username(client, headers, f"n_{support.uid()}").status_code == 429
    assert call(client, "email/cancel", headers).status_code == 200


def test_the_per_user_limits_are_off_with_the_limiter(client, outbox, monkeypatch):
    monkeypatch.setattr(auth_router, "ACCOUNT_CHANGE_LIMIT", parse_limit("1/hour"))
    monkeypatch.setattr(email_change, "EMAIL_CHANGE_MAIL_LIMIT", parse_limit("1/hour"))
    u = player()
    headers = signed_in(u)
    for _ in range(3):
        asked(client, outbox, u, headers)
