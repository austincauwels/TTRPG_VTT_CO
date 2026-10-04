"""Password reset by email: POST /api/auth/password-reset and /api/auth/password-reset/confirm,
the password_reset_tokens table, and the email sender (vtt/mail.py).

vtt.mail.send_email is replaced by a fake (the outbox fixture) in the route tests; the
tests of send_email itself replace vtt.mail.post. Nothing here reaches Resend.
"""
import hashlib
import logging
import re
import time
from types import SimpleNamespace

import pytest
import requests
from limits import parse as parse_limit
from sqlalchemy import inspect as sa_inspect, text

import main
import support
from models import PasswordResetToken, User
from vtt import config, mail, password_reset, security
from vtt import google as vtt_google
from vtt.google import GoogleIdentity, GoogleTokenError

OK = {"ok": True}
LINK_INVALID = {"detail": "This link has expired or has already been used. Please ask for a new one."}
ADDRESS_LIMITED = {"detail": "Too many reset emails were asked for this address. Please wait an hour and try again."}
# What a used link answers: what login answers, plus googleUnlinked.
LOGIN_KEYS = {"PLAYER": {"role", "name", "userId", "campaignCode", "campaignId", "pendingRejoinInvite", "token",
                         "googleUnlinked"},
              "GM": {"role", "name", "userId", "campaignCode", "campaignId", "token", "googleUnlinked"}}
NEW_PASSWORD = "a-new-password-1"
_LINK = re.compile(r"/reset-password\?token=([A-Za-z0-9_-]+)")


@pytest.fixture
def outbox(monkeypatch):
    """Every email the app sends, instead of sending it."""
    sent = []

    def fake_send(to, subject, text, html):
        sent.append(SimpleNamespace(to=to, subject=subject, text=text, html=html))
        return True

    monkeypatch.setattr(mail, "send_email", fake_send)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    return sent


def address():
    """A unique address on a domain that is not reserved (the reserved ones never get mail)."""
    return f"player.{support.uid()}@candela-players.org"


def player(email=None, **fields):
    return support.make_user(email=email or address(), **fields)


def ask(client, email):
    return client.post("/api/auth/password-reset", json={"email": email})


def confirm(client, token, password=NEW_PASSWORD, headers=None):
    return client.post("/api/auth/password-reset/confirm", json={"token": token, "password": password},
                       headers=headers or {})


def token_in(message):
    return _LINK.search(message.text).group(1)


def reset_token(client, outbox, user):
    """Asks for a reset for the user's address; the token from the email."""
    before = len(outbox)
    assert ask(client, user.email).status_code == 202
    [message] = outbox[before:]
    assert message.to == user.email
    return token_in(message)


def rows_of(user_id):
    return support.fetch_all(PasswordResetToken, user_id=user_id)


# --- asking for a link -------------------------------------------------------------------------

def test_a_reset_email_goes_to_the_account(client, outbox):
    u = player()
    r = ask(client, u.email)
    assert r.status_code == 202
    assert r.json() == OK
    [message] = outbox
    assert message.to == u.email
    assert message.subject == "Set a new Candela Obscura password"
    token = token_in(message)
    link = f"{config.RESET_URL_BASE}/reset-password?token={token}"
    assert link in message.text
    assert f'href="{link}"' in message.html
    assert u.username in message.text and u.username in message.html
    assert "works once and expires in one hour" in message.text
    assert "—" not in message.text + message.html  # no em dashes in the copy


def test_the_link_uses_reset_url_base(client, outbox, monkeypatch):
    monkeypatch.setattr(config, "RESET_URL_BASE", "https://candela.example-site.org")
    ask(client, player().email)
    assert "https://candela.example-site.org/reset-password?token=" in outbox[0].text


def test_reset_url_base_default():
    """The setting is read at startup: RESET_URL_BASE, else beta, without a trailing slash."""
    import os
    expected = (os.environ.get("RESET_URL_BASE", "").strip() or "https://candela-beta.gatergrid.com").rstrip("/")
    assert config.RESET_URL_BASE == expected


def test_the_address_is_matched_ignoring_case_and_spaces(client, outbox):
    local = f"Mixed.{support.uid()}"
    u = player(email=f"{local}@Candela-Players.org")
    assert ask(client, f"  {local.lower()}@candela-players.ORG ").status_code == 202
    [message] = outbox
    assert message.to == u.email  # the address the account has, not the one typed


def test_two_accounts_that_share_an_address_each_get_a_link(client, outbox):
    """Register used to compare emails exactly, so older data can hold two accounts
    whose emails differ only in case."""
    local = f"twin.{support.uid()}"
    a = player(email=f"{local}@candela-players.org")
    b = player(email=f"{local.upper()}@candela-players.org")
    assert ask(client, f"{local}@candela-players.org").status_code == 202
    assert sorted(m.to for m in outbox) == sorted([a.email, b.email])
    by_to = {m.to: m for m in outbox}
    assert a.username in by_to[a.email].text and b.username in by_to[b.email].text
    assert confirm(client, token_in(by_to[a.email])).status_code == 200
    assert confirm(client, token_in(by_to[b.email])).status_code == 200


def test_only_a_hash_of_the_token_is_stored(client, outbox):
    u = player()
    before = int(time.time())
    token = reset_token(client, outbox, u)
    [row] = rows_of(u.id)
    assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in (row.token_hash, row.password_stamp)
    assert row.password_stamp == security.password_stamp(support.fetch(User, u.id).hashed_password)
    assert before <= row.created_at <= int(time.time())
    assert row.expires_at - row.created_at == 3600
    assert len(token) >= 43  # 32 random bytes


# --- the answer never tells whether an account exists ------------------------------------------

def _no_mail_cases():
    """(label, address) for every kind of address that gets no email."""
    test_domain = support.make_user(email=f"someone.{support.uid()}@example.test")
    example_domain = support.make_user(email=f"someone.{support.uid()}@mail.example.com")
    no_domain = support.make_user(email=f"someone.{support.uid()}@intranet")
    return [
        ("no account", address()),
        ("seeded admin", support.fetch(User, 1).email),
        ("reserved test domain", test_domain.email),
        ("reserved example domain", example_domain.email),
        ("no top-level domain", no_domain.email),
    ]


def test_the_answer_is_the_same_with_or_without_an_account(client, outbox):
    u = player()
    answer = ask(client, u.email)
    assert len(outbox) == 1
    for label, email in _no_mail_cases():
        r = ask(client, email)
        assert (r.status_code, r.json()) == (answer.status_code, answer.json()), label
        assert r.headers.get("content-type") == answer.headers.get("content-type"), label
    assert len(outbox) == 1


def test_seeded_accounts_never_get_a_link(client, outbox):
    """Their emails are seed data. admin@archive.com is on a real domain."""
    admin = support.fetch(User, 1)
    assert password_reset.usable_email(admin.email)
    assert ask(client, admin.email).status_code == 202
    rows = support.fetch_all(User, username="keeper_test")
    keeper = rows[0] if rows else support.make_user(username="keeper_test")
    support.update(User, keeper.id, email=address())
    assert ask(client, support.fetch(User, keeper.id).email).status_code == 202
    assert outbox == []
    assert rows_of(1) == [] and rows_of(keeper.id) == []


@pytest.mark.parametrize("email,usable", [
    ("ada@candela-players.org", True),
    ("Ada.Lovelace+notes@mail.candela-players.co.uk", True),
    ("ada@example.test", False),
    ("ada@example.com", False),
    ("ada@sub.example.org", False),
    ("ada@localhost", False),
    ("ada@printer.local", False),
    ("ada@host", False),
    ("ada", False),
    ("Ada <ada@candela-players.org>", False),
    ("ada@candela-players.org, eve@evil.org", False),
    ("ada @candela-players.org", False),
    ("adé@candela-players.org", False),
    ("a" * 65 + "@candela-players.org", False),
    ("ada@" + "a" * 250 + ".org", False),
    (None, False),
])
def test_usable_email(email, usable):
    assert password_reset.usable_email(email) is usable


# --- using a link ------------------------------------------------------------------------------

def test_a_link_sets_a_new_password_and_signs_in(client, outbox):
    u = player()
    token = reset_token(client, outbox, u)
    r = confirm(client, token)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == LOGIN_KEYS[body["role"]]
    assert (body["userId"], body["name"]) == (u.id, u.username)
    assert client.get(f"/api/users/{u.id}/characters", headers=support.bearer(body["token"])).status_code == 200
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200
    assert support.login(client, u.username, support.PASSWORD).status_code == 401
    assert rows_of(u.id) == []


def test_a_link_answers_with_the_gm_view_for_a_gm(client, outbox):
    u = player()
    camp = support.new_campaign(client, gm_user_id=u.id)
    body = confirm(client, reset_token(client, outbox, u)).json()
    assert (body["role"], body["campaignId"]) == ("GM", camp["id"])


def test_a_new_password_ends_every_earlier_session(client, outbox):
    """The login tokens carry the password stamp (pwh), which the new password changes."""
    u = player()
    ch = support.forge(client, user_id=u.id)
    old_token = support.token_for(u.id)
    url = f"/api/users/{u.id}/characters"
    assert client.get(url, headers=support.bearer(old_token)).status_code == 200
    new_token = confirm(client, reset_token(client, outbox, u)).json()["token"]
    assert client.get(url, headers=support.bearer(old_token)).status_code == 401
    assert support.ws_close_code(client, ch["id"], token=old_token) == 4401
    assert client.get(url, headers=support.bearer(new_token)).status_code == 200


def test_a_link_works_once(client, outbox):
    u = player()
    token = reset_token(client, outbox, u)
    assert confirm(client, token).status_code == 200
    r = confirm(client, token, password="yet-another-password")
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200


def test_a_link_expires_after_an_hour(client, outbox):
    u = player()
    token = reset_token(client, outbox, u)
    [row] = rows_of(u.id)
    support.update(PasswordResetToken, row.id, expires_at=int(time.time()) - 1)
    r = confirm(client, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert support.login(client, u.username, support.PASSWORD).status_code == 200


def test_a_link_works_until_it_expires(client, outbox):
    u = player()
    token = reset_token(client, outbox, u)
    [row] = rows_of(u.id)
    support.update(PasswordResetToken, row.id, created_at=row.created_at - 3590, expires_at=int(time.time()) + 10)
    assert confirm(client, token).status_code == 200


def test_expired_links_are_forgotten(client, outbox):
    u = player()
    reset_token(client, outbox, u)
    [row] = rows_of(u.id)
    support.update(PasswordResetToken, row.id, expires_at=int(time.time()) - 1)
    ask(client, address())  # any request clears out expired links
    assert rows_of(u.id) == []


def test_a_newer_link_replaces_the_older_one(client, outbox):
    u = player()
    first = reset_token(client, outbox, u)
    second = reset_token(client, outbox, u)
    assert len(rows_of(u.id)) == 1
    assert (confirm(client, first).status_code, confirm(client, first).json()) == (400, LINK_INVALID)
    assert confirm(client, second).status_code == 200


def test_old_links_stop_working_after_a_reset(client, outbox):
    """A reset deletes every link of the user, and the new password changes the stamp
    an older link was issued with."""
    u = player()
    used = reset_token(client, outbox, u)
    other = "a-link-from-another-request"
    with main.SessionLocal() as s:  # as if a second request had issued one at the same moment
        s.add(PasswordResetToken(user_id=u.id, token_hash=password_reset.token_hash(other),
                                 password_stamp=security.password_stamp(support.fetch(User, u.id).hashed_password),
                                 created_at=int(time.time()), expires_at=int(time.time()) + 3600))
        s.commit()
    assert confirm(client, used).status_code == 200
    assert rows_of(u.id) == []
    for token in (used, other):
        assert (confirm(client, token).status_code, confirm(client, token).json()) == (400, LINK_INVALID)


def test_any_other_password_change_ends_the_link(client, outbox):
    u = player()
    token = reset_token(client, outbox, u)
    support.update(User, u.id, hashed_password=main.pwd_context.handler("bcrypt").using(rounds=4).hash("changed"))
    r = confirm(client, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)
    assert main.pwd_context.verify("changed", support.fetch(User, u.id).hashed_password)


def test_linking_google_by_email_ends_the_link(client, outbox, monkeypatch):
    """Sign in with Google replaces the password when it links an account by email."""
    from vtt import google as vtt_google
    from vtt.google import GoogleIdentity
    u = player()
    token = reset_token(client, outbox, u)
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(vtt_google, "verify_id_token",
                        lambda credential: GoogleIdentity(sub=f"g{support.uid(20)}", email=u.email, name="P"))
    assert client.post("/api/auth/google", json={"credential": "c"}).json()["userId"] == u.id
    r = confirm(client, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


@pytest.fixture
def google_accounts(monkeypatch):
    """Sign in with Google, stubbed: the credential c signs in as google_accounts[c]."""
    accounts = {}

    def fake_verify(credential):
        if credential not in accounts:
            raise GoogleTokenError("not a test credential")
        return accounts[credential]

    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(vtt_google, "verify_id_token", fake_verify)
    return accounts


def google_sign_in(client, google_accounts, sub, email):
    credential = f"credential-{support.uid(16)}"
    google_accounts[credential] = GoogleIdentity(sub=sub, email=email, name="P")
    return client.post("/api/auth/google", json={"credential": credential})


def test_a_proven_google_link_survives_a_reset(client, outbox, google_accounts):
    """Made with a Google account whose email is the account's: the same person reads
    that address, so the Google sign-in keeps working."""
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub)
    support.update(User, u.id, google_email=u.email.upper())
    r = confirm(client, reset_token(client, outbox, u))
    assert (r.status_code, r.json()["googleUnlinked"]) == (200, False)
    assert support.login(client, u.username, NEW_PASSWORD).status_code == 200
    assert support.fetch(User, u.id).google_sub == sub
    assert google_sign_in(client, google_accounts, sub, u.email).json()["userId"] == u.id


@pytest.mark.parametrize("google_email", [None, "someone.else.{uid}@gmail.test"])
def test_a_reset_removes_an_unproven_google_link(client, outbox, google_accounts, google_email):
    """A link made with another Google email, or from before the Google email was
    recorded, may be the work of someone who registered this address or stole a login
    token. It used to outlive the reset, so they kept signing in with Google."""
    sub = f"g{support.uid(20)}"
    u = player(google_sub=sub, google_email=google_email.format(uid=support.uid()) if google_email else None)
    r = confirm(client, reset_token(client, outbox, u))
    assert r.status_code == 200, r.text
    assert r.json()["googleUnlinked"] is True
    row = support.fetch(User, u.id)
    assert (row.google_sub, row.google_email) == (None, None)
    other = google_sign_in(client, google_accounts, sub, f"someone.{support.uid()}@gmail.test")
    assert other.json()["needs_account"] is True


def test_the_squatters_google_link_ends_with_the_owners_reset(client, outbox, google_accounts):
    """Someone registers another person's address and links their own Google account
    with the password they chose. The owner of the address resets the password."""
    email = address()
    squatter = f"squatter_{support.uid()}"
    r = client.post("/api/auth/register", json={"username": squatter, "email": email, "password": "squatters-pw"})
    user_id, squatter_token = r.json()["userId"], r.json()["token"]
    google_accounts["squatter"] = GoogleIdentity(sub=f"g{support.uid(20)}",
                                                 email=f"squatter.{support.uid()}@gmail.test", name="S")
    r = client.post("/api/auth/me/google", json={"credential": "squatter", "password": "squatters-pw"},
                    headers=support.bearer(squatter_token))
    assert r.status_code == 200, r.text
    body = confirm(client, reset_token(client, outbox, support.fetch(User, user_id))).json()
    assert (body["userId"], body["googleUnlinked"]) == (user_id, True)
    assert client.post("/api/auth/google", json={"credential": "squatter"}).json()["needs_account"] is True
    assert support.login(client, squatter, "squatters-pw").status_code == 401
    assert client.get("/api/auth/me", headers=support.bearer(squatter_token)).status_code == 401


def test_a_used_link_proves_the_email(client, outbox):
    u = player()
    assert support.fetch(User, u.id).email_proven is False
    body = confirm(client, reset_token(client, outbox, u)).json()
    assert body["googleUnlinked"] is False  # there was no link
    assert support.fetch(User, u.id).email_proven is True


@pytest.mark.parametrize("token", ["", "x", "not-a-real-token-at-all-0123456789abcdefghij", "A" * 256])
def test_an_unknown_token_is_400(client, outbox, token):
    r = confirm(client, token)
    assert (r.status_code, r.json()) == (400, LINK_INVALID)


def test_a_signed_in_browser_keeps_its_session_on_a_bad_link(client, outbox):
    """apiFetch sends the session's token along and logs out on any 401, so a bad link is 400."""
    u = player()
    r = confirm(client, "used-or-expired", headers=support.as_user(u.id))
    assert r.status_code == 400


@pytest.mark.parametrize("password,message", [
    ("short", "Password must be at least 8 characters"),
    ("p" * 129, "Password too long"),
])
def test_the_new_password_follows_the_register_rule(client, outbox, password, message):
    u = player()
    token = reset_token(client, outbox, u)
    r = confirm(client, token, password=password)
    assert r.status_code == 422
    assert message in r.text
    assert confirm(client, token).status_code == 200  # the link was not used up


@pytest.mark.parametrize("body", [{}, {"token": "t"}, {"password": NEW_PASSWORD}, {"token": "t" * 257, "password": NEW_PASSWORD}])
def test_confirm_body_validation(client, body):
    assert client.post("/api/auth/password-reset/confirm", json=body).status_code == 422


@pytest.mark.parametrize("email", ["", "   ", "no-at-sign", "two@@signs", "a b@c.org", "x" * 250 + "@c.org"])
def test_request_body_validation(client, outbox, email):
    assert ask(client, email).status_code == 422
    assert outbox == []


def test_bcrypt_runs_off_the_event_loop(client, outbox, monkeypatch):
    import asyncio
    on_loop = []
    real_hash = security.pwd_context.hash

    def spy(*args, **kwargs):
        try:
            asyncio.get_running_loop()
            on_loop.append("hash")
        except RuntimeError:
            pass
        return real_hash(*args, **kwargs)

    u = player()
    token = reset_token(client, outbox, u)
    monkeypatch.setattr(security.pwd_context, "hash", spy)
    assert confirm(client, token).status_code == 200
    assert on_loop == []


def test_use_token_lets_one_of_two_requests_through(client, outbox):
    """Two requests with the same link at once: the second finds the row gone."""
    u = player()
    token = reset_token(client, outbox, u)
    with main.SessionLocal() as first, main.SessionLocal() as second:
        row1, user1 = password_reset.find_token(first, token)
        row2, user2 = password_reset.find_token(second, token)
        assert password_reset.use_token(first, row1, user1, "hash-one")
        first.commit()
        assert not password_reset.use_token(second, row2, user2, "hash-two")
        second.rollback()
    assert support.fetch(User, u.id).hashed_password == "hash-one"


# --- password login off --------------------------------------------------------------------------

def test_reset_is_off_with_password_login(client, outbox, monkeypatch):
    u = player()
    token = reset_token(client, outbox, u)
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", False)
    off = {"detail": "Password sign-in is turned off. Please use Sign in with Google."}
    assert (ask(client, u.email).status_code, ask(client, u.email).json()) == (403, off)
    r = confirm(client, token)
    assert (r.status_code, r.json()) == (403, off)
    assert len(outbox) == 1


# --- rate limits ---------------------------------------------------------------------------------

def test_requests_are_limited_per_ip(client, outbox, limiter_on):
    codes = [ask(client, address()).status_code for _ in range(6)]
    assert codes == [202] * 5 + [429]


def test_requests_are_limited_per_address(client, outbox, limiter_on):
    """Three an hour for one address, however it is written; other addresses go on."""
    u = player()
    variants = [u.email, u.email.upper(), f"  {u.email} "]
    assert [ask(client, e).status_code for e in variants] == [202, 202, 202]
    r = ask(client, u.email)
    assert (r.status_code, r.json()) == (429, ADDRESS_LIMITED)
    assert len(outbox) == 3
    assert ask(client, address()).status_code == 202  # the fifth request from this IP


def test_the_address_limit_is_the_same_with_or_without_an_account(client, outbox, limiter_on):
    nobody = address()
    assert [ask(client, nobody).status_code for _ in range(3)] == [202, 202, 202]
    r = ask(client, nobody)
    assert (r.status_code, r.json()) == (429, ADDRESS_LIMITED)
    assert outbox == []


def test_the_address_limit_counts_the_address_only(client, limiter_on):
    """Kept per address, not per address and IP, so another IP gets no more for it."""
    email = address()
    assert [password_reset.address_allowed(email) for _ in range(4)] == [True, True, True, False]
    assert password_reset.address_allowed(email.upper()) is False
    assert password_reset.address_allowed(address()) is True


def test_confirm_is_limited_per_ip(client, outbox, limiter_on):
    codes = [confirm(client, f"guess-{n}").status_code for n in range(11)]
    assert codes == [400] * 10 + [429]


def test_the_address_limit_is_off_with_the_limiter(client):
    email = address()
    assert all(password_reset.address_allowed(email) for _ in range(10))


# --- caps on the emails themselves ---------------------------------------------------------------

def test_the_real_mail_caps():
    assert [str(x) for x in password_reset.MAIL_LIMITS] == ["20 per 1 hour", "50 per 1 day"]
    assert str(password_reset.UNPROVEN_ADDRESS_MAIL_LIMIT) == "3 per 1 day"


@pytest.mark.parametrize("hourly,daily", [("2/hour", "50/day"), ("50/hour", "2/day")])
def test_reset_emails_are_capped_overall(client, outbox, limiter_on, monkeypatch, caplog, hourly, daily):
    """The finding: no overall cap, so one client with a few registered addresses (and
    any client with many IPs) could use up the Resend quota, after which every real
    reset email failed while the answer stayed 202. Over the cap the answer is the
    same and nothing is sent."""
    monkeypatch.setattr(password_reset, "MAIL_LIMITS", (parse_limit(hourly), parse_limit(daily)))
    players = [player() for _ in range(3)]
    with caplog.at_level(logging.ERROR, logger="candela"):
        answers = [ask(client, p.email) for p in players]
    assert [(r.status_code, r.json()) for r in answers] == [(202, OK)] * 3
    assert [m.to for m in outbox] == [players[0].email, players[1].email]
    assert rows_of(players[2].id) == []  # no link was issued either
    assert "overall cap on reset emails" in caplog.text
    assert players[2].email not in caplog.text


def test_an_unproven_address_gets_few_emails_a_day(client, outbox, limiter_on, monkeypatch):
    """An address nobody has proven may be someone else's, typed by whoever registered
    it. It still gets reset emails (AUTH.md says why), but only a few a day."""
    monkeypatch.setattr(password_reset, "UNPROVEN_ADDRESS_MAIL_LIMIT", parse_limit("1/day"))
    unproven, proven = player(), player(email_proven=True)
    for p in (unproven, proven):
        assert [ask(client, p.email).status_code for _ in range(2)] == [202, 202]
    assert sorted(m.to for m in outbox) == sorted([unproven.email, proven.email, proven.email])


def test_a_used_link_lifts_the_unproven_cap(client, outbox, limiter_on, monkeypatch):
    monkeypatch.setattr(password_reset, "UNPROVEN_ADDRESS_MAIL_LIMIT", parse_limit("1/day"))
    u = player()
    assert confirm(client, reset_token(client, outbox, u)).status_code == 200
    reset_token(client, outbox, u)  # one more email, although the unproven cap is used up


def test_the_mail_caps_are_off_with_the_limiter(client, outbox, monkeypatch):
    monkeypatch.setattr(password_reset, "MAIL_LIMITS", (parse_limit("1/hour"), parse_limit("1/day")))
    for _ in range(3):
        ask(client, player().email)
    assert len(outbox) == 3


# --- sending through Resend (vtt/mail.py) ---------------------------------------------------------

class FakeResend:
    def __init__(self, status_code=200, text='{"id": "test"}', error=None):
        self.status_code, self.text, self.error = status_code, text, error
        self.calls = []

    def __call__(self, url, **kwargs):
        self.calls.append(SimpleNamespace(url=url, **kwargs))
        if self.error is not None:
            raise self.error
        return SimpleNamespace(status_code=self.status_code, text=self.text)


def test_send_email_posts_to_resend(monkeypatch):
    monkeypatch.setattr(config, "RESEND_API_KEY", "re_test_key")
    resend = FakeResend()
    monkeypatch.setattr(mail, "post", resend)
    assert mail.send_email("ada@candela-players.org", "Subject", "Plain", "<p>Html</p>") is True
    [call] = resend.calls
    assert call.url == "https://api.resend.com/emails"
    assert call.headers == {"Authorization": "Bearer re_test_key"}
    assert call.json == {"from": "Candela Obscura <no-reply@mail.gatergrid.com>", "to": ["ada@candela-players.org"],
                         "subject": "Subject", "text": "Plain", "html": "<p>Html</p>"}
    assert call.timeout == 10


def test_without_a_key_nothing_is_sent_and_the_log_says_so(monkeypatch, caplog):
    monkeypatch.setattr(config, "RESEND_API_KEY", "")
    resend = FakeResend()
    monkeypatch.setattr(mail, "post", resend)
    with caplog.at_level(logging.WARNING, logger="candela"):
        assert mail.send_email("ada@candela-players.org", "Subject", "Plain", "<p>Html</p>") is False
    assert resend.calls == []
    assert "RESEND_API_KEY is not set" in caplog.text


@pytest.mark.parametrize("resend,logged", [
    (FakeResend(status_code=422, text='{"message": "Invalid from address"}'), "HTTP 422"),
    (FakeResend(status_code=500, text=""), "HTTP 500"),
    (FakeResend(error=requests.ConnectionError("no route")), "Could not reach Resend"),
    (FakeResend(error=requests.Timeout("slow")), "Could not reach Resend"),
])
def test_a_failed_send_is_logged_not_raised(monkeypatch, caplog, resend, logged):
    monkeypatch.setattr(config, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(mail, "post", resend)
    with caplog.at_level(logging.ERROR, logger="candela"):
        assert mail.send_email("ada@candela-players.org", "Subject", "Plain", "<p>Html</p>") is False
    assert logged in caplog.text
    assert "re_test_key" not in caplog.text
    assert "ada@candela-players.org" not in caplog.text


def test_a_request_succeeds_without_a_key(client, monkeypatch, caplog):
    """The real send_email runs: no key, so it logs and sends nothing."""
    monkeypatch.setattr(config, "RESEND_API_KEY", "")
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    u = player()
    with caplog.at_level(logging.WARNING, logger="candela"):
        r = ask(client, u.email)
    assert (r.status_code, r.json()) == (202, OK)
    assert "RESEND_API_KEY is not set" in caplog.text
    assert len(rows_of(u.id)) == 1


def test_a_request_succeeds_when_resend_fails(client, monkeypatch, caplog):
    monkeypatch.setattr(config, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(config, "ALLOW_PASSWORD_LOGIN", True)
    resend = FakeResend(error=requests.ConnectionError("no route"))
    monkeypatch.setattr(mail, "post", resend)
    u = player()
    with caplog.at_level(logging.ERROR, logger="candela"):
        r = ask(client, u.email)
    assert (r.status_code, r.json()) == (202, OK)
    [call] = resend.calls
    assert call.json["to"] == [u.email]
    assert call.json["subject"] == "Set a new Candela Obscura password"
    assert "/reset-password?token=" in call.json["text"] and "/reset-password?token=" in call.json["html"]
    assert "Could not reach Resend" in caplog.text
    token = _LINK.search(call.json["text"]).group(1)
    assert token not in caplog.text


def test_the_email_escapes_the_username():
    html = password_reset.email_html("<b>Mallory</b> & co", "https://x.org/reset-password?token=abc")
    assert "<b>Mallory</b>" not in html
    assert "&lt;b&gt;Mallory&lt;/b&gt; &amp; co" in html


# --- the table -----------------------------------------------------------------------------------

def test_init_db_creates_the_table_on_an_older_database(client, monkeypatch):
    """main.py's create_all makes the table on a normal start; init_db makes it too, so
    it alone brings an older database up to date. A second run changes nothing and
    keeps the rows."""
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("DROP TABLE password_reset_tokens"))
        assert not sa_inspect(eng).has_table("password_reset_tokens")
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        insp = sa_inspect(eng)
        assert {c["name"] for c in insp.get_columns("password_reset_tokens")} == {
            "id", "user_id", "token_hash", "password_stamp", "created_at", "expires_at"}
        indexes = {i["name"]: (i["column_names"], bool(i["unique"])) for i in insp.get_indexes("password_reset_tokens")}
        assert indexes["ix_password_reset_tokens_token_hash"] == (["token_hash"], True)
        assert indexes["ix_password_reset_tokens_user_id"] == (["user_id"], False)
        [fk] = insp.get_foreign_keys("password_reset_tokens")
        assert (fk["constrained_columns"], fk["referred_table"], fk["options"].get("ondelete")) == (
            ["user_id"], "users", "CASCADE")
        with Session() as s:
            s.add(User(id=5, username="u", email="u@candela-players.org", hashed_password="x"))
            s.commit()
            s.add(PasswordResetToken(user_id=5, token_hash="h" * 64, password_stamp="s" * 32,
                                     created_at=1, expires_at=2))
            s.commit()
        main.init_db()
        with Session() as s:
            assert s.query(PasswordResetToken).count() == 1
