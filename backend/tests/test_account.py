"""The account page: POST /api/auth/me/username, /api/auth/me/password, /api/auth/me/email
(with /resend, /cancel, /check and /confirm), /api/auth/me/google/remove, the undo link
POST /api/auth/email-change/undo, users.has_password and users.session_epoch, held
usernames, and the email_change_tokens and email_change_undos tables (vtt/email_change.py).

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
from models import EmailChangeToken, EmailChangeUndo, PasswordResetToken, User, UsernameHold
from vtt import config, email_change, mail, password_reset, security, usernames
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
_UNDO_LINK = re.compile(r"/undo-email-change\?token=([A-Za-z0-9_-]+)")
AUTO = object()


def detail(text):
    return {"detail": text}


PROOF_NEEDED = detail("Enter your current password, or confirm with Google.")
WRONG_PASSWORD = detail("That is not this account's password.")
GOOGLE_NOT_THIS_ACCOUNT = detail("That Google account is not the one linked to this account.")
GOOGLE_PROOF_OLD = detail("That Google sign-in is too old. Please confirm with Google again.")
GOOGLE_REFUSED = detail("Google could not confirm this sign-in. Please try again.")
ACCOUNT_CHANGED = detail("The account changed while this was being saved. Please try again.")
CHANGES_LIMITED = detail("This account has reached its limit of failed attempts. "
                         "The right password, Google sign-in or link still works.")
RENAMES_LIMITED = detail("You can change your username 3 times a day. Please try again tomorrow.")
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
MAIL_ADDRESS_LIMITED = detail("Too many confirmation emails went to that address today. Please try again tomorrow.")
UNDO_ADDRESS_TAKEN = detail("Another account has that address now, so the change cannot be undone.")
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


def check(client, headers, token):
    return call(client, "email/check", headers, token=token)


def undo(client, token, headers=None):
    """The undo link's request: no login needed."""
    return client.post("/api/auth/email-change/undo", json={"token": token}, headers=headers or {})


def remove_google(client, headers, password=support.PASSWORD):
    return call(client, "google/remove", headers, password=password)


def resend(client, headers, password=support.PASSWORD, credential=None):
    return call(client, "email/resend", headers, password=password, credential=credential)


def cancel(client, headers, password=support.PASSWORD, credential=None, token=None):
    return call(client, "email/cancel", headers, password=password, credential=credential, token=token)


def me(client, headers):
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def link_token_in(message):
    return _CONFIRM_LINK.search(message.text).group(1)


def undo_token_in(message):
    return _UNDO_LINK.search(message.text).group(1)


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


def undo_rows_of(user_id):
    return support.fetch_all(EmailChangeUndo, user_id=user_id)


def changed(client, outbox, user, headers, new_email=None):
    """Asks for a change of the user's address and uses its link; (new address, token of
    the undo link mailed to the old address)."""
    old_email = support.fetch(User, user.id).email
    new_email, token = asked(client, outbox, user, headers, new_email=new_email)
    before = len(outbox)
    r = confirm(client, headers, token)
    assert r.status_code == 200, r.text
    [notice] = [m for m in outbox[before:] if m.to == old_email]
    return new_email, undo_token_in(notice)


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
            conn.execute(text("DROP TABLE email_change_undos"))
            conn.execute(text("DROP TABLE username_holds"))
            conn.execute(text("ALTER TABLE users DROP COLUMN has_password"))
            conn.execute(text("ALTER TABLE users DROP COLUMN session_epoch"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        insp = sa_inspect(eng)
        assert {"has_password", "session_epoch"} <= {c["name"] for c in insp.get_columns("users")}
        undo_indexes = {i["name"]: (i["column_names"], bool(i["unique"])) for i in insp.get_indexes("email_change_undos")}
        assert undo_indexes["ix_email_change_undos_token_hash"] == (["token_hash"], True)
        hold_indexes = {i["name"]: (i["column_names"], bool(i["unique"])) for i in insp.get_indexes("username_holds")}
        assert hold_indexes["ix_username_holds_name_key"] == (["name_key"], False)
        for table in ("email_change_undos", "username_holds"):
            [fk] = insp.get_foreign_keys(table)
            assert (fk["referred_table"], fk["options"].get("ondelete")) == ("users", "CASCADE")
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


def test_init_db_adds_the_recorded_google_link_to_an_older_undo_table(client, monkeypatch):
    """email_change_undos came before its google_sub column; a second start changes nothing
    and keeps the rows."""
    from sqlalchemy import inspect as sa_inspect, text
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("ALTER TABLE email_change_undos DROP COLUMN google_sub"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        assert "google_sub" in {c["name"] for c in sa_inspect(eng).get_columns("email_change_undos")}
        with Session() as s:
            s.add(User(id=7, username="u7", email="u7@candela-players.org", hashed_password="x"))
            s.commit()
            s.add(EmailChangeUndo(user_id=7, token_hash="h" * 64, old_email="a@candela-players.org",
                                  new_email="b@candela-players.org", google_sub="g-sub", created_at=1, expires_at=2))
            s.commit()
        main.init_db()
        with Session() as s:
            assert s.query(EmailChangeUndo.google_sub).filter(EmailChangeUndo.user_id == 7).scalar() == "g-sub"


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
    ("email/check", {"token": "t"}),
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
    ("username", {"username": "mi\u0456ra"}),       # a Cyrillic i
    ("username", {"username": "Jos\u00e9"}),
    ("username", {"username": "tab\there"}),
    ("username", {"username": " \n x \n "}),          # one character once stripped
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
    ("email/check", {}),
    ("email/check", {"token": "t" * 257}),
    ("email/resend", {"password": "p" * 1025}),
    ("email/cancel", {"password": "p" * 1025}),
    ("email/cancel", {"token": "t" * 257}),
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
    r = resend(client, headers)
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
    r = resend(client, signed_in(u))
    assert (r.status_code, r.json()) == (409, NO_PENDING_EMAIL)
    assert outbox == []


def test_cancel_drops_the_waiting_change(client, outbox):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    r = cancel(client, headers)
    assert (r.status_code, r.json()["pendingEmail"], r.json()["email"]) == (200, None, u.email)
    assert rows_of(u.id) == []
    assert confirm(client, headers, token).status_code == 400
    # a second cancel is fine
    assert cancel(client, headers).status_code == 200


def test_resend_and_cancel_need_a_proof(client, outbox, google):
    """The review's finding D: with a login token alone, a thief could use up the owner's
    confirmation emails, end the link the owner already had, or drop the owner's change."""
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    [row] = rows_of(u.id)
    before = len(outbox)
    for r in (resend(client, headers, password=None), cancel(client, headers, password=None),
              call(client, "email/cancel", headers, token="")):
        assert (r.status_code, r.json()) == (403, PROOF_NEEDED)
    for r in (resend(client, headers, password="a-guess"), cancel(client, headers, password="a-guess")):
        assert (r.status_code, r.json()) == (403, WRONG_PASSWORD)
    assert outbox[before:] == []
    [again] = rows_of(u.id)
    assert again.token_hash == row.token_hash  # the owner's link still works
    assert me(client, headers)["pendingEmail"] == new_email
    assert check(client, headers, token).json()["newEmail"] == new_email


def test_resend_and_cancel_take_a_google_proof(client, outbox, google):
    u, sub, headers = google_only()
    r = request_email(client, headers, address(), password=None, credential=google.credential(sub=sub))
    assert r.status_code == 202, r.text
    r = resend(client, headers, password=None, credential=google.credential(sub=sub))
    assert r.status_code == 202, r.text
    r = cancel(client, headers, password=None, credential=google.credential(sub=sub, age=6 * 60))
    assert (r.status_code, r.json()) == (403, GOOGLE_PROOF_OLD)
    r = cancel(client, headers, password=None, credential=google.credential(sub=sub))
    assert (r.status_code, r.json()["pendingEmail"]) == (200, None)


def test_cancel_takes_the_changes_own_link(client, outbox):
    """The page at /confirm-email offers Cancel change and sends the link as the proof."""
    u, other = player(), player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    for r, expected in ((cancel(client, headers, password=None, token="no-such-link"), (400, LINK_INVALID)),
                        (cancel(client, signed_in(other), password=None, token=token), (403, LINK_OTHER_ACCOUNT))):
        assert (r.status_code, r.json()) == expected
    assert len(rows_of(u.id)) == 1
    r = cancel(client, headers, password=None, token=token)
    assert (r.status_code, r.json()["pendingEmail"]) == (200, None)
    assert rows_of(u.id) == []
    # a password sent with it must still be right
    _, token = asked(client, outbox, u, headers)
    r = cancel(client, headers, password="a-guess", token=token)
    assert (r.status_code, r.json()) == (403, WRONG_PASSWORD)
    assert len(rows_of(u.id)) == 1


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
    done = email_change.changed_email("a@b.org", "<b>Mallory</b> & co", "new@b.org",
                                      "https://x.org/undo-email-change?token=abc")
    for message in (link, notice, done):
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
    assert set(r.json()) == ACCOUNT_KEYS | {"token"}
    assert (r.json()["googleLinked"], r.json()["googleEmail"], r.json()["hasPassword"]) == (False, None, True)
    row = support.fetch(User, u.id)
    assert (row.google_sub, row.google_email, row.session_epoch) == (None, None, 1)
    assert client.get("/api/auth/me", headers=headers).status_code == 401  # every other session ended
    assert me(client, support.bearer(r.json()["token"]))["userId"] == u.id  # this browser's new one works
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
    assert me(client, support.bearer(r.json()["token"]))["userId"] == u.id


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
    headers = signed_in(u)
    r = remove_google(client, headers)
    assert (r.status_code, r.json()["googleLinked"]) == (200, False)
    assert "token" not in r.json()
    assert me(client, headers)["userId"] == u.id  # nothing ended


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
    assert str(auth_router.FAILED_PROOF_LIMIT) == "10 per 1 hour"
    assert str(email_change.EMAIL_CHANGE_MAIL_LIMIT) == "3 per 1 hour"
    assert str(email_change.EMAIL_CHANGE_ADDRESS_LIMIT) == "3 per 1 day"
    assert [str(limit) for limit in email_change.EMAIL_CHANGE_MAIL_LIMITS] == ["15 per 1 hour", "30 per 1 day"]
    assert account_router.GOOGLE_PROOF_MAX_AGE_SECONDS == 300
    assert email_change.EMAIL_CHANGE_EXPIRE_MINUTES == 60
    assert email_change.EMAIL_UNDO_EXPIRE_DAYS == 7
    assert usernames.USERNAME_HOLD_DAYS == 90
    assert str(usernames.RENAME_LIMIT) == "3 per 1 day"
    assert usernames.MAX_HOLDS_PER_USER == 5


def test_the_limit_words_do_not_say_to_wait(client, outbox, limiter_on, monkeypatch):
    """Over the failed-proof limit the right password still works at once, so the 429 says
    that a limit was reached, not to try again in an hour."""
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("1/hour"))
    u = player()
    headers = signed_in(u)
    change_password(client, headers, password="guess-1")
    r = change_password(client, headers, password="guess-2")
    assert (r.status_code, r.json()) == (429, CHANGES_LIMITED)
    assert "hour" not in r.json()["detail"] and "limit of failed attempts" in r.json()["detail"]
    assert change_password(client, headers).status_code == 200


def test_each_route_is_limited_per_ip(client, outbox, limiter_on):
    """Ten a minute from one client, whoever is signed in (each request here is from
    another user, so the per-user limit does not come into it)."""
    codes = [change_username(client, signed_in(player()), f"n_{support.uid()}", password="a-guess").status_code
             for _ in range(11)]
    assert codes == [403] * 10 + [429]


def test_failed_proofs_are_limited_per_user(client, outbox, google, limiter_on, monkeypatch):
    """Counted for every failed proof on every route that takes one (linking Google
    included), so a stolen session cannot spread its guesses over routes or clients
    without a 429. A request with no proof at all counts nothing."""
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("5/hour"))
    u = player(google_sub=f"g{support.uid(20)}")
    headers = signed_in(u)
    for _ in range(3):
        r = change_username(client, headers, f"n_{support.uid()}", password=None)
        assert (r.status_code, r.json()) == (403, PROOF_NEEDED)
    answers = [
        change_username(client, headers, f"n_{support.uid()}", password="a-guess"),
        change_password(client, headers, password="a-guess"),
        request_email(client, headers, address(), password="a-guess"),
        remove_google(client, headers, password="a-guess"),
        client.post("/api/auth/me/google", json={"credential": "never-issued"}, headers=headers),
        confirm(client, headers, "no-such-link"),
        check(client, headers, "no-such-link"),
    ]
    assert [r.status_code for r in answers] == [403, 403, 403, 403, 400, 429, 429]
    assert answers[-1].json() == CHANGES_LIMITED
    other = player()
    r = change_username(client, signed_in(other), f"n_{support.uid()}", password="a-guess")
    assert (r.status_code, r.json()) == (403, WRONG_PASSWORD)  # another user's count


def test_a_right_proof_goes_through_when_the_limit_is_used_up(client, outbox, google, limiter_on, monkeypatch):
    """Only failures count, after the proof was checked, and a right proof is never
    refused for the limit: a stolen session cannot keep the owner from the changes."""
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("1/hour"))
    u, sub, _ = google_only()
    support.update(User, u.id, hashed_password=support.password_hash(), has_password=True)
    headers = signed_in(u)
    for guess in ("guess-1", "guess-2"):
        change_username(client, headers, f"n_{support.uid()}", password=guess)
    r = change_username(client, headers, f"n_{support.uid()}", password="guess-3")
    assert (r.status_code, r.json()) == (429, CHANGES_LIMITED)
    name = f"Right {support.uid()}"
    assert change_username(client, headers, name).json()["name"] == name
    r = change_username(client, headers, f"G {support.uid()}", password=None, credential=google.credential(sub=sub))
    assert r.status_code == 200, r.text
    new_email, _ = changed(client, outbox, u, headers)
    assert support.fetch(User, u.id).email == new_email
    r = remove_google(client, headers)
    assert r.status_code == 200, r.text


def test_a_stolen_session_cannot_keep_the_owner_from_changing_the_password(client, outbox, limiter_on, monkeypatch):
    """The review's case: with password sign-in off both reset routes are 403, so a new
    password on the account page is the only way to end a stolen login token. Empty
    requests and wrong guesses from the thief used to use up the owner's limit."""
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("2/hour"))
    u = player()
    stolen = signed_in(u)  # the thief's copy of the owner's token
    for _ in range(5):
        assert call(client, "username", stolen, username=f"n_{support.uid()}").status_code == 403
    for n in range(3):
        change_username(client, stolen, f"n_{support.uid()}", password=f"guess-{n}")
    r = change_username(client, stolen, f"n_{support.uid()}", password="one-more-guess")
    assert (r.status_code, r.json()) == (429, CHANGES_LIMITED)
    r = change_password(client, stolen)  # the owner, who knows the password
    assert r.status_code == 200, r.text
    assert client.get("/api/auth/me", headers=stolen).status_code == 401
    assert me(client, support.bearer(r.json()["token"]))["userId"] == u.id


def test_a_working_email_link_goes_through_when_the_limit_is_used_up(client, outbox, limiter_on, monkeypatch):
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("1/hour"))
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    for guess in ("guess-1", "guess-2"):
        confirm(client, headers, guess)
    assert confirm(client, headers, "guess-3").status_code == 429
    assert check(client, headers, token).json()["newEmail"] == new_email
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()["email"]) == (200, new_email)


def test_confirmation_emails_are_limited_per_user(client, outbox, limiter_on):
    u = player()
    headers = signed_in(u)
    for _ in range(2):
        asked(client, outbox, u, headers)
    assert resend(client, headers).status_code == 202
    sent = len(outbox)
    r = request_email(client, headers, address())
    assert (r.status_code, r.json()) == (429, MAIL_LIMITED)
    r = resend(client, headers)
    assert (r.status_code, r.json()) == (429, MAIL_LIMITED)
    assert len(outbox) == sent
    v = player()
    asked(client, outbox, v, signed_in(v))  # another user's emails go on


def test_email_changes_have_overall_mail_caps_of_their_own(client, outbox, limiter_on, monkeypatch, caplog):
    """They used to share the reset emails' caps, so a few throwaway accounts asking for
    changes could stop every reset email for an hour. A request counts three emails
    (the link, this notice and the notice with the undo link) against caps of its own."""
    monkeypatch.setattr(email_change, "EMAIL_CHANGE_MAIL_LIMITS", (parse_limit("3/hour"), parse_limit("30/day")))
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    v = player()
    with caplog.at_level(logging.ERROR, logger="candela"):
        r = request_email(client, signed_in(v), address())
    assert (r.status_code, r.json()) == (429, MAIL_PAUSED)
    assert "overall cap on email change emails" in caplog.text
    assert rows_of(v.id) == []
    # reset emails go on
    target = player()
    before = len(outbox)
    assert client.post("/api/auth/password-reset", json={"email": target.email}).status_code == 202
    assert [m.to for m in outbox[before:]] == [target.email]
    # and the notice with the undo link was counted with the request, so it still goes out
    before = len(outbox)
    assert confirm(client, headers, token).status_code == 200
    assert [(m.to, m.subject) for m in outbox[before:]] == [(u.email, email_change.CHANGED_SUBJECT)]


def test_used_up_reset_email_caps_do_not_stop_email_changes(client, outbox, limiter_on, monkeypatch):
    monkeypatch.setattr(password_reset, "MAIL_LIMITS", (parse_limit("1/hour"), parse_limit("50/day")))
    assert client.post("/api/auth/password-reset", json={"email": player().email}).status_code == 202
    u = player()
    asked(client, outbox, u, signed_in(u))


def test_one_address_gets_few_confirmation_links(client, outbox, limiter_on):
    """Anyone can type any address, so one address gets at most three links a day,
    whoever asks for them (the per-user limit counts each asker on their own)."""
    target = address()
    for _ in range(3):
        u = player()
        asked(client, outbox, u, signed_in(u), new_email=target)
    u = player()
    for typed in (target, f"  {target.upper()} "):
        r = request_email(client, signed_in(u), typed)
        assert (r.status_code, r.json()) == (429, MAIL_ADDRESS_LIMITED)
    assert rows_of(u.id) == []
    asked(client, outbox, u, signed_in(u))  # another address goes on


def test_resend_counts_against_the_new_address(client, outbox, limiter_on):
    target = address()
    for _ in range(2):
        u = player()
        asked(client, outbox, u, signed_in(u), new_email=target)
    assert resend(client, signed_in(u)).status_code == 202
    v = player()
    r = request_email(client, signed_in(v), target)
    assert (r.status_code, r.json()) == (429, MAIL_ADDRESS_LIMITED)


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


def test_the_owner_can_always_cancel_or_resend(client, outbox, limiter_on, monkeypatch):
    """Resend and cancel take a proof now, and a right one goes through when a stolen
    session has used up the failed-proof limit, so the owner can always drop a change
    someone else asked for. Wrong guesses on them count like any other."""
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("2/hour"))
    u = player()
    headers = signed_in(u)
    asked(client, outbox, u, headers)
    assert [resend(client, headers, password="guess-1").status_code,
            cancel(client, headers, password="guess-2").status_code,
            cancel(client, headers, password="guess-3").status_code] == [403, 403, 429]
    assert resend(client, headers).status_code == 202
    assert cancel(client, headers).status_code == 200
    assert rows_of(u.id) == []


def test_the_per_user_limits_are_off_with_the_limiter(client, outbox, monkeypatch):
    monkeypatch.setattr(auth_router, "FAILED_PROOF_LIMIT", parse_limit("1/hour"))
    monkeypatch.setattr(email_change, "EMAIL_CHANGE_MAIL_LIMIT", parse_limit("1/hour"))
    u = player()
    headers = signed_in(u)
    for _ in range(3):
        asked(client, outbox, u, headers)


# --- the link's page asks first (POST /api/auth/me/email/check) -------------------------------

def test_check_shows_what_the_link_would_change_and_changes_nothing(client, outbox):
    """The page at /confirm-email shows the new address and the account's name, and sends
    the link only when the owner clicks Confirm new email: someone who got the link for a
    mistyped address cannot make the change go through just by having the owner open it."""
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    for _ in range(2):
        r = check(client, headers, token)
        assert r.status_code == 200, r.text
        assert r.json() == {"name": u.username, "email": u.email, "newEmail": new_email}
    assert support.fetch(User, u.id).email == u.email
    assert len(rows_of(u.id)) == 1 and undo_rows_of(u.id) == []
    assert confirm(client, headers, token).json()["email"] == new_email


def test_check_refuses_as_confirm_does(client, outbox):
    u, other = player(), player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    r = check(client, signed_in(other), token)
    assert (r.status_code, r.json()) == (403, LINK_OTHER_ACCOUNT)
    for bad in ("", "no-such-link"):
        r = check(client, headers, bad)
        assert (r.status_code, r.json()) == (400, LINK_INVALID)
    headers = support.bearer(change_password(client, headers).json()["token"])  # ends the waiting change
    r = check(client, headers, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


# --- the undo link mailed to the old address (POST /api/auth/email-change/undo) ---------------

def test_the_old_address_gets_an_undo_link_once_the_change_goes_through(client, outbox):
    u = player()
    headers = signed_in(u)
    new_email, token = asked(client, outbox, u, headers)
    before, created = len(outbox), int(time.time())
    assert confirm(client, headers, token).status_code == 200
    [notice] = outbox[before:]
    assert (notice.to, notice.subject) == (u.email, "Your Candela Obscura email address was changed")
    undo_token = undo_token_in(notice)
    assert f"{SITE}/undo-email-change?token={undo_token}" in notice.text
    assert f'href="{SITE}/undo-email-change?token={undo_token}"' in notice.html
    assert u.username in notice.text and "p***@candela-players.org" in notice.text
    assert "within 7 days" in notice.text and "set a new password" in notice.text
    assert new_email not in notice.text + notice.html
    assert "\u2014" not in notice.text + notice.html
    [row] = undo_rows_of(u.id)
    assert row.token_hash == hashlib.sha256(undo_token.encode()).hexdigest()
    assert (row.old_email, row.new_email) == (u.email, new_email)
    assert created <= row.created_at and row.expires_at - row.created_at == 7 * 24 * 60 * 60
    # the notice when the change was asked for says this one will come
    asked_notice = [m for m in outbox[:before] if m.to == u.email][-1]
    assert "another email with a link to undo the change" in asked_notice.text


def test_the_undo_link_takes_the_account_back(client, outbox):
    """Someone with the password moves the address to one they read, then changes the
    password. The undo link needs no login: the old address comes back, every session
    ends, and a link to set a new password goes to the old address."""
    u = player()
    thief = signed_in(u)
    new_email, undo_token = changed(client, outbox, u, thief)
    thief = support.bearer(change_password(client, thief).json()["token"])
    before = len(outbox)
    r = undo(client, undo_token)
    assert r.status_code == 200, r.text
    assert r.json() == {"userId": u.id, "name": u.username, "email": u.email, "passwordReset": True,
                        "googleKept": False, "googleEmail": None, "googleOnlyWayIn": False}
    row = support.fetch(User, u.id)
    assert (row.email, row.email_proven, row.has_password) == (u.email, True, False)
    assert client.get("/api/auth/me", headers=thief).status_code == 401
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 401
    assert undo_rows_of(u.id) == []
    [reset] = [m for m in outbox[before:] if m.to == u.email]
    assert reset.subject.startswith(password_reset.SUBJECT + " (")
    assert [m.to for m in outbox[before:]] == [u.email, new_email]  # and a notice to the address it took off
    reset_token = _RESET_LINK.search(reset.text).group(1)
    r = client.post("/api/auth/password-reset/confirm", json={"token": reset_token, "password": "mine-again-1"})
    assert r.status_code == 200, r.text
    assert support.login(client, u.username, "mine-again-1").status_code == 200


def test_the_undo_link_works_once_and_for_seven_days(client, outbox):
    u = player()
    _, first = changed(client, outbox, u, signed_in(u))
    assert undo(client, first).status_code == 200
    r = undo(client, first)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    v = player()
    v_new, second = changed(client, outbox, v, signed_in(v))
    [row] = undo_rows_of(v.id)
    support.update(EmailChangeUndo, row.id, expires_at=int(time.time()) - 1)
    r = undo(client, second)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.fetch(User, v.id).email == v_new


@pytest.mark.parametrize("token", ["", "x", "A" * 256])
def test_an_unknown_undo_link_is_400(client, token):
    r = undo(client, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


def test_the_undo_body_is_checked(client):
    assert client.post("/api/auth/email-change/undo", json={}).status_code == 422
    assert undo(client, "t" * 257).status_code == 422


def test_a_new_password_or_a_reset_leaves_the_undo_link_working(client, outbox):
    """Whoever made the change may change the password, or reset it from the new address."""
    u = player()
    headers = signed_in(u)
    new_email, undo_token = changed(client, outbox, u, headers)
    change_password(client, headers)
    assert client.post("/api/auth/password-reset", json={"email": new_email}).status_code == 202
    reset = _RESET_LINK.search(outbox[-1].text).group(1)
    r = client.post("/api/auth/password-reset/confirm", json={"token": reset, "password": "thiefs-own-1"})
    assert r.status_code == 200
    assert undo(client, undo_token).json()["email"] == u.email


def test_an_undo_removes_a_google_link_the_old_address_does_not_prove(client, outbox, google):
    u = player()
    headers = signed_in(u)
    _, undo_token = changed(client, outbox, u, headers)
    theirs = google.credential(email=f"someone.{support.uid()}@gmail.test")
    r = client.post("/api/auth/me/google", json={"credential": theirs, "password": support.PASSWORD}, headers=headers)
    assert r.json()["googleLinked"] is True
    r = undo(client, undo_token)
    assert r.status_code == 200
    assert (r.json()["googleKept"], r.json()["googleEmail"]) == (False, None)
    row = support.fetch(User, u.id)
    assert (row.google_sub, row.google_email) == (None, None)
    assert client.post("/api/auth/google", json={"credential": theirs}).json()["needs_account"] is True


def test_an_undo_keeps_a_google_link_of_the_old_address(client, outbox, google):
    u, sub, _ = google_only()
    support.update(User, u.id, hashed_password=support.password_hash(), has_password=True)
    _, undo_token = changed(client, outbox, u, signed_in(u))
    assert undo(client, undo_token).status_code == 200
    assert support.fetch(User, u.id).google_sub == sub
    assert client.post("/api/auth/google", json={"credential": google.credential(sub=sub)}).json()["userId"] == u.id


def test_an_undo_keeps_the_google_link_the_account_had_when_the_change_went_through(client, outbox, google,
                                                                                    monkeypatch):
    """The review's finding B: the owner's own Google link may use another address than
    the account's. The undo row records the link the account had when the change went
    through, and the undo keeps it, so that owner can still sign in, with password
    sign-in off too (no reset link then)."""
    sub, theirs = f"g{support.uid(20)}", f"other.{support.uid()}@gmail.test"
    u = player(google_sub=sub, google_email=theirs)
    new_email, undo_token = changed(client, outbox, u, signed_in(u))
    [row] = undo_rows_of(u.id)
    assert row.google_sub == sub
    support.update(User, u.id, hashed_password=support.cheap_hash("the-thief-changed-it"))
    before = len(outbox)
    r = undo(client, undo_token)
    assert r.status_code == 200, r.text
    masked = "o***@gmail.test"
    assert (r.json()["googleKept"], r.json()["googleEmail"], r.json()["googleOnlyWayIn"]) == (True, masked, False)
    assert (support.fetch(User, u.id).google_sub, support.fetch(User, u.id).google_email) == (sub, theirs)
    assert client.post("/api/auth/google", json={"credential": google.credential(sub=sub)}).json()["userId"] == u.id
    [notice] = [m for m in outbox[before:] if m.to == new_email]
    assert f"Google sign-in with {masked} still works." in notice.text
    assert theirs not in notice.text + notice.html
    # with password sign-in off as well
    v_sub = f"g{support.uid(20)}"
    v = player(google_sub=v_sub, google_email=f"other.{support.uid()}@gmail.test")
    _, undo_token = changed(client, outbox, v, signed_in(v))
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    r = undo(client, undo_token)
    assert (r.json()["passwordReset"], r.json()["googleKept"], r.json()["googleOnlyWayIn"]) == (False, True, False)
    assert support.fetch(User, v.id).google_sub == v_sub


def test_an_undo_removes_a_link_that_replaced_the_recorded_one(client, outbox, google):
    """Whoever made the change may have replaced the owner's link with their own since;
    that one is not the recorded link, so it goes (password sign-in is on: the old address
    gets a reset link)."""
    u = player(google_sub=f"g{support.uid(20)}", google_email=f"owner.{support.uid()}@gmail.test")
    headers = signed_in(u)
    _, undo_token = changed(client, outbox, u, headers)
    headers = support.bearer(remove_google(client, headers).json()["token"])
    theirs = google.credential(email=f"thief.{support.uid()}@gmail.test")
    r = client.post("/api/auth/me/google", json={"credential": theirs, "password": support.PASSWORD}, headers=headers)
    assert r.json()["googleLinked"] is True
    r = undo(client, undo_token)
    assert (r.json()["passwordReset"], r.json()["googleKept"]) == (True, False)
    assert support.fetch(User, u.id).google_sub is None


def test_with_password_sign_in_off_an_undo_keeps_the_only_way_in(client, outbox, google, monkeypatch):
    """No reset link can go out while password sign-in is off, so removing the Google link
    would leave the account no way in at all. It stays, and the answer says so."""
    u = player()
    headers = signed_in(u)
    _, undo_token = changed(client, outbox, u, headers)  # no link when the change went through
    sub, theirs = f"g{support.uid(20)}", f"linked.later.{support.uid()}@gmail.test"
    r = client.post("/api/auth/me/google", json={"credential": google.credential(sub=sub, email=theirs),
                                                 "password": support.PASSWORD}, headers=headers)
    assert r.json()["googleLinked"] is True
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    r = undo(client, undo_token)
    assert r.status_code == 200, r.text
    assert r.json() == {"userId": u.id, "name": u.username, "email": u.email, "passwordReset": False,
                        "googleKept": True, "googleEmail": "l***@gmail.test", "googleOnlyWayIn": True}
    assert support.fetch(User, u.id).google_sub == sub
    assert client.post("/api/auth/google", json={"credential": google.credential(sub=sub)}).json()["userId"] == u.id


def test_an_undo_tells_the_address_it_takes_off(client, outbox):
    """The review's finding C: the address the undo removes may be the real owner's (the
    old address was a lost or shared mailbox), signed out without a word."""
    u = player()
    new_email, undo_token = changed(client, outbox, u, signed_in(u))
    before = len(outbox)
    assert undo(client, undo_token).status_code == 200
    [notice] = [m for m in outbox[before:] if m.to == new_email]
    assert notice.subject == "Your Candela Obscura email address was changed back"
    assert u.username in notice.text and "p***@candela-players.org" in notice.text
    assert "no longer on the account" in notice.text and "Every sign-in to the account has ended" in notice.text
    assert "still works" not in notice.text
    assert u.email not in notice.text + notice.html and undo_token not in notice.text + notice.html
    assert "\u2014" not in notice.text + notice.html
    assert "/reset-password" not in notice.text and "/undo-email-change" not in notice.text


def test_the_notice_goes_to_the_address_the_account_has_when_undone(client, outbox):
    """A to B, then B to C: the first undo link takes C off, so C is told, not B."""
    u = player()
    headers = signed_in(u)
    _, undo_to_a = changed(client, outbox, u, headers)
    c, _ = changed(client, outbox, u, headers)
    before = len(outbox)
    assert undo(client, undo_to_a).status_code == 200
    assert [m.to for m in outbox[before:]] == [u.email, c]


def test_the_undone_notice_escapes_the_username():
    message = email_change.undone_email("x@candela-players.org", "<b>Mallory</b> & co", "old@candela-players.org")
    assert "<b>Mallory</b>" not in message.html
    assert "&lt;b&gt;Mallory&lt;/b&gt; &amp; co" in message.html


def test_an_undo_ends_the_undo_links_of_later_changes(client, outbox):
    """A to B, then B to C: whoever reads A takes the account back, and the link B got for
    the second change can no longer take it away again."""
    u = player()
    headers = signed_in(u)
    _, undo_to_a = changed(client, outbox, u, headers)
    _, undo_to_b = changed(client, outbox, u, headers)
    assert undo(client, undo_to_a).json()["email"] == u.email
    r = undo(client, undo_to_b)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.fetch(User, u.id).email == u.email


def test_an_undo_leaves_the_undo_links_of_earlier_changes(client, outbox):
    u = player()
    headers = signed_in(u)
    b, undo_to_a = changed(client, outbox, u, headers)
    _, undo_to_b = changed(client, outbox, u, headers)
    assert undo(client, undo_to_b).json()["email"] == b
    assert undo(client, undo_to_a).json()["email"] == u.email


def test_an_address_an_undo_link_can_put_back_is_held(client, outbox, google):
    """Nobody else may take the old address while its undo link works, or the undo could
    not put it back."""
    u = player()
    old = u.email
    changed(client, outbox, u, signed_in(u))
    v = player()
    r = request_email(client, signed_in(v), old.upper())
    assert (r.status_code, r.json()) == (409, EMAIL_UNAVAILABLE)
    r = client.post("/api/auth/register", json={"username": f"r_{support.uid()}", "email": old,
                                                "password": "registered-1"})
    assert r.status_code == 400
    r = client.post("/api/auth/google", json={"credential": google.credential(email=old)})
    r = client.post("/api/auth/google/create", json={"link_token": r.json()["link_token"],
                                                       "username": f"g_{support.uid()}"})
    assert r.status_code == 409
    # once the link has expired the address is free
    [row] = undo_rows_of(u.id)
    support.update(EmailChangeUndo, row.id, expires_at=int(time.time()) - 1)
    asked(client, outbox, v, signed_in(v), new_email=old)


def test_an_undo_when_another_account_has_the_address(client, outbox):
    """Only an account that had it before the hold (or a race) can; nothing changes."""
    u = player()
    old = u.email
    new_email, undo_token = changed(client, outbox, u, signed_in(u))
    support.update(User, player().id, email=old.upper())
    r = undo(client, undo_token)
    assert (r.status_code, r.json()) == (409, UNDO_ADDRESS_TAKEN)
    assert support.fetch(User, u.id).email == new_email
    assert len(undo_rows_of(u.id)) == 1


def test_an_undo_with_password_sign_in_off_sends_no_reset_link(client, outbox, monkeypatch):
    """The reset routes are off then; the old address signs in with Google (step 2 links
    an account by its address)."""
    u = player()
    new_email, undo_token = changed(client, outbox, u, signed_in(u))
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    before = len(outbox)
    r = undo(client, undo_token)
    assert (r.status_code, r.json()["passwordReset"], r.json()["googleKept"]) == (200, False, False)
    assert [m.to for m in outbox[before:]] == [new_email]  # the notice only, no reset link
    assert support.fetch_all(PasswordResetToken, user_id=u.id) == []


def test_an_undo_closes_the_users_sockets(client, outbox):
    u = player()
    ch = support.forge(client, user_id=u.id)
    _, undo_token = changed(client, outbox, u, signed_in(u))
    with support.ws_connect(client, ch["id"]) as ws:
        assert undo(client, undo_token).status_code == 200
        with pytest.raises(support.Closed) as closed:
            ws.recv()
        assert closed.value.code == 4401


def test_no_undo_link_where_no_notice_goes(client, outbox):
    reserved = support.make_user(email=f"someone.{support.uid()}@example.test")
    headers = signed_in(reserved)
    _, token = asked(client, outbox, reserved, headers)
    before = len(outbox)
    assert confirm(client, headers, token).status_code == 200
    assert outbox[before:] == [] and undo_rows_of(reserved.id) == []


def test_confirm_needs_the_site_address_for_the_undo_link(client, outbox, monkeypatch):
    u = player()
    headers = signed_in(u)
    _, token = asked(client, outbox, u, headers)
    monkeypatch.setattr(config, "RESET_URL_BASE", "")
    r = confirm(client, headers, token)
    assert (r.status_code, r.json()) == (503, EMAIL_CHANGE_OFF)
    assert support.fetch(User, u.id).email == u.email


def test_the_undo_log_names_no_address_or_token(client, outbox, caplog):
    u = player()
    new_email, undo_token = changed(client, outbox, u, signed_in(u))
    with caplog.at_level(logging.INFO, logger="candela"):
        assert undo(client, undo_token).status_code == 200
    assert f"Undid a change of the email address of user id={u.id}" in caplog.text
    for secret in (new_email, u.email, undo_token):
        assert secret not in caplog.text


# --- removing Google ends every session -------------------------------------------------------

def test_removing_google_ends_the_sessions_signed_in_with_it(client, outbox, google):
    """Login tokens were stamped with the password only, so a session from a Google
    sign-in outlived the link by up to 30 days. Now the session epoch goes up."""
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub, google_email=f"g.{support.uid()}@gmail.test")
    via_google = support.bearer(client.post("/api/auth/google", json={"credential": google.credential(sub=sub)})
                                .json()["token"])
    page = signed_in(u)
    ch = support.forge(client, user_id=u.id)
    asked(client, outbox, u, page)
    with support.ws_connect(client, ch["id"]) as ws:
        r = remove_google(client, page)
        assert r.status_code == 200, r.text
        with pytest.raises(support.Closed) as closed:
            ws.recv()
        assert closed.value.code == 4401
    for headers in (via_google, page):
        assert client.get("/api/auth/me", headers=headers).status_code == 401
    token = r.json()["token"]
    assert me(client, support.bearer(token))["googleLinked"] is False
    assert rows_of(u.id) == [] and me(client, support.bearer(token))["pendingEmail"] is None
    with support.ws_connect(client, ch["id"], token=token) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
    login = support.login(client, u.username, support.PASSWORD).json()["token"]
    assert me(client, support.bearer(login))["userId"] == u.id


def test_tokens_from_before_the_session_epoch_keep_working():
    h = support.password_hash()
    assert security.session_stamp(h, 0) == security.session_stamp(h, None) == security.password_stamp(h)
    assert security.session_stamp(h, 1) not in (security.password_stamp(h), security.session_stamp(h, 2))


def test_a_socket_checks_the_session_epoch_before_each_message(client):
    """A socket that close_user missed (the epoch raised in the database) ends at its
    next message."""
    u = player()
    ch = support.forge(client, user_id=u.id)
    with support.ws_connect(client, ch["id"]) as ws:
        support.update(User, u.id, session_epoch=5)
        ws.send("update_pen_font", pen_font="Kalam")
        with pytest.raises(support.Closed) as closed:
            ws.recv()
        assert closed.value.code == 4401


# --- usernames: look-alikes and freed names ---------------------------------------------------

@pytest.mark.parametrize("typed", ["{name} ", " {name}", "{name}\n", "{upper}", "  {upper}  "])
def test_a_look_alike_of_another_players_name_is_refused(client, typed):
    """"mira " and "mira\n" passed the old check ($ matches before a final newline) and
    were stored as sent, next to "mira"."""
    other = player(username=f"mira_{support.uid()}")
    u = player()
    r = change_username(client, signed_in(u), typed.format(name=other.username, upper=other.username.upper()))
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    assert support.fetch(User, u.id).username == u.username


def test_a_name_is_stored_stripped_with_single_spaces(client):
    u = player()
    base = f"Mira  Bell {support.uid(4)}"
    r = change_username(client, signed_in(u), f"  {base}\n")
    assert r.status_code == 200, r.text
    assert r.json()["name"] == support.fetch(User, u.id).username == " ".join(base.split())


@pytest.mark.parametrize("legacy", ["{base} ", "{base}\n", "{spaced}"])
def test_names_from_before_the_rule_are_compared_the_same_way(client, legacy):
    """Register used to store such names as they came. A new name that differs from one
    only in case or spaces is refused, on the account page and at register."""
    base = f"legacy {support.uid()}"
    player(username=legacy.format(base=base, spaced=base.replace(" ", "   ")))
    u = player()
    r = change_username(client, signed_in(u), base.upper())
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    r = client.post("/api/auth/register", json={"username": base, "email": address(), "password": "registered-1"})
    assert r.status_code == 400


@pytest.mark.parametrize("typed", ["admin ", " Admin", "admin\n", "KEEPER_TEST "])
def test_a_seeded_name_with_stray_spaces_is_refused(client, typed):
    u = player()
    r = change_username(client, signed_in(u), typed)
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)


def test_register_strips_the_name_and_takes_ascii_letters_only(client):
    name = f"Reg Name {support.uid(4)}"
    r = client.post("/api/auth/register", json={"username": f" {name}  ", "email": address(), "password": "registered-1"})
    assert (r.status_code, r.json()["name"]) == (201, name)
    for bad in (f"Jos\u00e9 {support.uid(4)}", f"mi\u0456ra {support.uid(4)}"):
        r = client.post("/api/auth/register", json={"username": bad, "email": address(), "password": "registered-1"})
        assert r.status_code == 422


def test_a_freed_name_is_held_for_its_former_owner(client, google):
    """A GM may still invite a player to rejoin by the name they knew, and the invite skips
    the GM's approval, so nobody else may take a freed name for USERNAME_HOLD_DAYS."""
    u = player(username=f"Old Name {support.uid(6)}")
    old, new = u.username, f"New Name {support.uid(6)}"
    before = int(time.time())
    assert change_username(client, signed_in(u), new).status_code == 200
    [hold] = support.fetch_all(UsernameHold, user_id=u.id)
    assert hold.name_key == old.lower()
    assert 90 * 24 * 60 * 60 <= hold.held_until - before <= 90 * 24 * 60 * 60 + 60
    v = player()
    for typed in (old, old.upper(), f" {old} "):
        r = change_username(client, signed_in(v), typed)
        assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    r = client.post("/api/auth/register", json={"username": old, "email": address(), "password": "registered-1"})
    assert r.status_code == 400
    r = client.post("/api/auth/google", json={"credential": google.credential()})
    r = client.post("/api/auth/google/create", json={"link_token": r.json()["link_token"], "username": old})
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)
    # its former owner may take it back, and then the other name is held
    assert change_username(client, signed_in(u), old).json()["name"] == old
    assert [h.name_key for h in support.fetch_all(UsernameHold, user_id=u.id)] == [new.lower()]
    r = change_username(client, signed_in(v), new)
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)


def test_a_held_name_is_free_once_the_hold_ends(client):
    u = player(username=f"Held {support.uid(6)}")
    old = u.username
    assert change_username(client, signed_in(u), f"Other {support.uid(6)}").status_code == 200
    [hold] = support.fetch_all(UsernameHold, user_id=u.id)
    support.update(UsernameHold, hold.id, held_until=int(time.time()) - 1)
    v = player()
    assert change_username(client, signed_in(v), old).json()["name"] == old


def test_a_rejoin_invite_by_a_freed_name_reaches_nobody(client):
    gm = player()
    camp = support.new_campaign(client, gm_user_id=gm.id)
    u = player(username=f"Invitee {support.uid(6)}")
    old = u.username
    assert change_username(client, signed_in(u), f"Renamed {support.uid(6)}").status_code == 200
    r = client.post(f"/campaign/{camp['id']}/invite-rejoin", json={"username": old}, headers=support.as_user(gm.id))
    assert r.status_code == 404
    assert support.fetch(User, u.id).pending_rejoin_campaign_id is None


def test_renames_are_limited_per_day(client, limiter_on):
    """The review's finding A: each rename holds a name for 90 days, so renames without a
    cap let one account keep hundreds of names from everyone. Three a day per user; a
    change of case frees no name and does not count."""
    u = player(username=f"Day {support.uid(6)}")
    headers = signed_in(u)
    for n in range(3):
        name = f"Day {n} {support.uid(6)}"
        assert change_username(client, headers, name).json()["name"] == name
    r = change_username(client, headers, f"Day 4 {support.uid(6)}")
    assert (r.status_code, r.json()) == (429, RENAMES_LIMITED)
    assert support.fetch(User, u.id).username == name
    assert change_username(client, headers, name.upper()).json()["name"] == name.upper()
    assert len(support.fetch_all(UsernameHold, user_id=u.id)) == 3
    # another user's renames are their own, and a failed proof is no rename
    # (ten requests a minute per client in all: this test sends nine)
    w = player()
    assert change_username(client, signed_in(w), f"W {support.uid(6)}", password="a-guess").status_code == 403
    for n in range(3):
        assert change_username(client, signed_in(w), f"W {n} {support.uid(6)}").status_code == 200


def test_one_account_holds_only_a_few_names(client, monkeypatch):
    """At most MAX_HOLDS_PER_USER names are held for a user at a time; a rename that
    would hold one more waits until the oldest hold ends. Going back to a held name ends
    that hold, so it is always allowed. This cap lives in the database, so it holds with
    the rate limiter off and across restarts."""
    monkeypatch.setattr(usernames, "MAX_HOLDS_PER_USER", 2)
    names = [f"Hold {n} {support.uid(6)}" for n in range(5)]
    u = player(username=names[0])
    headers = signed_in(u)
    for name in names[1:3]:
        assert change_username(client, headers, name).status_code == 200
    r = change_username(client, headers, names[3])
    assert (r.status_code, r.json()) == (429, detail(
        "Your last 2 usernames are still held for you. You can change it again in 90 days, "
        "or go back to one of them."))
    assert support.fetch(User, u.id).username == names[2]
    assert change_username(client, headers, names[2].lower()).status_code == 200  # a change of case
    assert change_username(client, headers, names[0]).json()["name"] == names[0]  # back to a held name
    holds = {h.name_key: h for h in support.fetch_all(UsernameHold, user_id=u.id)}
    assert set(holds) == {names[1].lower(), names[2].lower()}
    support.update(UsernameHold, holds[names[1].lower()].id, held_until=int(time.time()) + 3600)
    r = change_username(client, headers, names[3])
    assert (r.status_code, r.json()["detail"]) == (429, "Your last 2 usernames are still held for you. "
                                                        "You can change it again in 1 day, or go back to one of them.")
    support.update(UsernameHold, holds[names[1].lower()].id, held_until=int(time.time()) - 1)
    assert change_username(client, headers, names[3]).json()["name"] == names[3]
    # nobody else can take a name held for u meanwhile
    r = change_username(client, signed_in(player()), names[0])
    assert (r.status_code, r.json()) == (400, USERNAME_TAKEN)


# --- password sign-in turned off later --------------------------------------------------------

def test_startup_counts_the_accounts_without_google_while_password_sign_in_is_off(client, monkeypatch, caplog):
    """An account that removed Google while password sign-in was on cannot sign in
    directly once it is turned off; the log says how many such accounts there are."""
    player()  # no Google link
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    with caplog.at_level(logging.WARNING, logger="candela"):
        assert vtt_db.warn_password_only_accounts() is None
    assert "have no Google sign-in" not in caplog.text
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    with main.SessionLocal() as s:
        expected = s.query(User).filter(User.google_sub.is_(None),
                                        User.username.notin_(list(vtt_db.PUBLISHED_PASSWORDS))).count()
    assert expected >= 1
    with caplog.at_level(logging.WARNING, logger="candela"):
        assert vtt_db.warn_password_only_accounts() == expected
        main.init_db()
    assert caplog.text.count(f"{expected} account(s) have no Google sign-in") == 2
