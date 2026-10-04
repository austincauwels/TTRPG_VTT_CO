"""vtt/google.py (the check of a Google ID token), the link tokens in vtt/security.py,
and the users.google_sub column.

Nothing here reaches Google: google-auth is either mocked, or runs for real with a
fake transport that serves the certificate of a key made for the test.
"""
import json
import time
from types import SimpleNamespace

import pytest
import rsa
from google.auth import crypt
from google.auth import exceptions as google_exceptions
from google.auth import jwt as google_jwt
from jose import jwt
from sqlalchemy import inspect as sa_inspect, text
from sqlalchemy.exc import IntegrityError

import main
import support
from models import Circle, User
from vtt import config, security
from vtt import google as vtt_google
from vtt.google import GoogleIdentity, GoogleTokenError, GoogleUnavailableError

CLIENT_ID = "test-client-id.apps.googleusercontent.com"
DROP = object()  # a claim to leave out


@pytest.fixture
def client_id(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", CLIENT_ID)
    return CLIENT_ID


def _claims(**changes):
    now = int(time.time())
    claims = {
        "iss": "https://accounts.google.com", "aud": CLIENT_ID, "azp": CLIENT_ID,
        "sub": "110169484474386276334", "email": "ada@example.test", "email_verified": True,
        "name": "Ada Lovelace", "iat": now, "exp": now + 3600,
    }
    claims.update(changes)
    return {k: v for k, v in claims.items() if v is not DROP}


# --- google-auth mocked -------------------------------------------------------------

@pytest.fixture
def google_auth(monkeypatch, client_id):
    """Replaces google-auth's verify_oauth2_token. answer(claims) makes it return
    those claims, answer(error=...) makes it raise. Every call is recorded."""
    state = SimpleNamespace(calls=[], claims=_claims(), error=None)

    def fake_verify(credential, request, audience=None, clock_skew_in_seconds=0):
        state.calls.append(SimpleNamespace(credential=credential, request=request, audience=audience))
        if state.error is not None:
            raise state.error
        return state.claims

    def answer(claims=None, error=None):
        state.claims, state.error = claims, error

    monkeypatch.setattr(vtt_google.id_token, "verify_oauth2_token", fake_verify)
    state.answer = answer
    return state


def test_a_good_token_gives_the_google_account(google_auth):
    identity = vtt_google.verify_id_token("the-credential")
    assert identity == GoogleIdentity(sub="110169484474386276334", email="ada@example.test", name="Ada Lovelace")
    [call] = google_auth.calls
    assert call.credential == "the-credential"
    assert call.audience == CLIENT_ID
    assert call.request is vtt_google.certs_transport


@pytest.mark.parametrize("issuer", ["accounts.google.com", "https://accounts.google.com"])
def test_both_google_issuers_are_accepted(google_auth, issuer):
    google_auth.answer(_claims(iss=issuer))
    assert vtt_google.verify_id_token("t").sub == "110169484474386276334"


def test_a_missing_name_is_empty(google_auth):
    google_auth.answer(_claims(name=DROP))
    assert vtt_google.verify_id_token("t").name == ""


@pytest.mark.parametrize("verified", [False, "false", None, DROP])
def test_an_email_google_has_not_verified_is_refused(google_auth, verified):
    google_auth.answer(_claims(email_verified=verified))
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


def test_wrong_audience_refused_by_google_auth(google_auth):
    google_auth.answer(error=ValueError("Token has wrong audience other-client, expected one of [...]"))
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


@pytest.mark.parametrize("audience", ["other-client.apps.googleusercontent.com", "", [CLIENT_ID], DROP])
def test_wrong_audience_refused_by_the_wrapper(google_auth, audience):
    """Even if google-auth let it through, the wrapper checks the audience itself."""
    google_auth.answer(_claims(aud=audience))
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


@pytest.mark.parametrize("issuer", ["https://evil.example", "accounts.google.com.evil", DROP])
def test_another_issuer_is_refused(google_auth, issuer):
    google_auth.answer(_claims(iss=issuer))
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


@pytest.mark.parametrize("changes", [{"sub": DROP}, {"sub": ""}, {"sub": 42},
                                     {"email": DROP}, {"email": ""}, {"email": "no-at-sign"}])
def test_a_token_without_subject_or_email_is_refused(google_auth, changes):
    google_auth.answer(_claims(**changes))
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


@pytest.mark.parametrize("error", [
    ValueError("Token expired"),
    google_exceptions.GoogleAuthError("Wrong issuer"),
    google_exceptions.MalformedError("Wrong number of segments"),
])
def test_google_auth_errors_become_a_refusal(google_auth, error):
    google_auth.answer(error=error)
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")


def test_google_out_of_reach_is_not_a_refusal(google_auth):
    google_auth.answer(error=google_exceptions.TransportError("Could not fetch certificates"))
    with pytest.raises(GoogleUnavailableError):
        vtt_google.verify_id_token("t")


def test_no_client_id_refuses_without_asking_google_auth(google_auth, monkeypatch):
    """google-auth skips the audience check when it gets no audience."""
    monkeypatch.setattr(config, "GOOGLE_CLIENT_ID", "")
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token("t")
    assert google_auth.calls == []


# --- google-auth for real, with a fake Google -----------------------------------------

def _signer(private_key):
    return crypt.RSASigner.from_string(private_key.save_pkcs1().decode(), key_id="test-key")


@pytest.fixture(scope="module")
def keys():
    """Key pairs made for these tests (small, so they are quick to make): the signer
    whose public key the fake Google publishes, and another signer with the same key id."""
    public, private = rsa.newkeys(1024)
    other = _signer(rsa.newkeys(1024)[1])
    return SimpleNamespace(signer=_signer(private), public_pem=public.save_pkcs1().decode(), other=other)


class FakeGoogle:
    """Stands in for requests to Google: serves a certificate list and counts calls."""

    def __init__(self, certs):
        self.certs = certs
        self.status = 200
        self.headers = {"Cache-Control": "public, max-age=19842, must-revalidate, no-transform"}
        self.calls = []

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        self.calls.append(SimpleNamespace(url=url, method=method, timeout=timeout))
        return SimpleNamespace(status=self.status, headers=dict(self.headers),
                               data=json.dumps(self.certs).encode())


@pytest.fixture
def fake_google(monkeypatch, client_id, keys):
    fake = FakeGoogle({"test-key": keys.public_pem})
    monkeypatch.setattr(vtt_google, "certs_transport", vtt_google.CachedCertsTransport(fake))
    fake.sign = lambda claims, signer=keys.signer: google_jwt.encode(signer, claims).decode()
    fake.other_signer = keys.other
    return fake


def test_real_check_accepts_a_token_signed_by_the_published_key(fake_google):
    identity = vtt_google.verify_id_token(fake_google.sign(_claims()))
    assert identity == GoogleIdentity(sub="110169484474386276334", email="ada@example.test", name="Ada Lovelace")
    [call] = fake_google.calls
    assert call.method == "GET"
    assert call.url.startswith("https://www.googleapis.com/oauth2/")
    assert call.timeout == vtt_google.CERTS_TIMEOUT_SECONDS


@pytest.mark.parametrize("changes", [
    {"aud": "other-client.apps.googleusercontent.com"},
    {"iss": "https://evil.example"},
    {"email_verified": False},
    {"iat": int(time.time()) - 7200, "exp": int(time.time()) - 3600},
])
def test_real_check_refuses_bad_claims(fake_google, changes):
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token(fake_google.sign(_claims(**changes)))


def test_real_check_refuses_a_token_signed_by_another_key(fake_google):
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token(fake_google.sign(_claims(), signer=fake_google.other_signer))


def test_real_check_refuses_a_tampered_token(fake_google):
    header, _, signature = fake_google.sign(_claims()).split(".")
    other_payload = fake_google.sign(_claims(sub="someone-else")).split(".")[1]
    with pytest.raises(GoogleTokenError):
        vtt_google.verify_id_token(f"{header}.{other_payload}.{signature}")


def test_certificates_are_downloaded_once_while_fresh(fake_google):
    for _ in range(3):
        vtt_google.verify_id_token(fake_google.sign(_claims()))
    assert len(fake_google.calls) == 1


def test_certificates_are_downloaded_again_when_stale(fake_google):
    fake_google.headers = {"Cache-Control": "public, max-age=0"}
    vtt_google.verify_id_token(fake_google.sign(_claims()))
    vtt_google.verify_id_token(fake_google.sign(_claims()))
    assert len(fake_google.calls) == 2


def test_a_failed_download_is_not_kept(fake_google):
    fake_google.status = 503
    with pytest.raises(GoogleUnavailableError):
        vtt_google.verify_id_token(fake_google.sign(_claims()))
    fake_google.status = 200
    assert vtt_google.verify_id_token(fake_google.sign(_claims())).email == "ada@example.test"
    assert len(fake_google.calls) == 2


@pytest.mark.parametrize("headers,seconds", [
    ({"Cache-Control": "public, max-age=19842, must-revalidate"}, 19842),
    ({"cache-control": "max-age=600"}, 600),
    ({"Cache-Control": "max-age=99999999"}, vtt_google.CERTS_LONGEST_MAX_AGE),
    ({"Cache-Control": "no-store"}, vtt_google.CERTS_DEFAULT_MAX_AGE),
    ({}, vtt_google.CERTS_DEFAULT_MAX_AGE),
])
def test_certificate_max_age(headers, seconds):
    assert vtt_google._max_age(headers) == seconds


def test_the_transport_passes_other_requests_through():
    fake = FakeGoogle({})
    transport = vtt_google.CachedCertsTransport(fake)
    transport("https://example.test/a", method="POST", body=b"x")
    transport("https://example.test/a", method="POST", body=b"x")
    assert [c.method for c in fake.calls] == ["POST", "POST"]


# --- link tokens ----------------------------------------------------------------------

ADA = GoogleIdentity(sub="110169484474386276334", email="ada@example.test", name="Ada Lovelace")


def _signed(claims, key=None, algorithm="HS256"):
    return jwt.encode(claims, key or config.SECRET_KEY, algorithm=algorithm)


def _link_claims(**changes):
    now = int(time.time())
    claims = {"purpose": "google_link", "google_sub": ADA.sub, "email": ADA.email, "name": ADA.name,
              "iat": now, "exp": now + 600}
    claims.update(changes)
    return {k: v for k, v in claims.items() if v is not DROP}


def test_link_token_round_trip():
    token = security.create_link_token(ADA)
    assert security.identity_from_link_token(token) == ADA
    claims = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
    assert claims["purpose"] == "google_link"
    assert "sub" not in claims
    assert claims["exp"] - claims["iat"] == 10 * 60
    assert abs(claims["iat"] - time.time()) < 60


def test_a_link_token_is_not_a_login_token():
    assert security.user_id_from_token(security.create_link_token(ADA)) is None


def test_a_login_token_is_not_a_link_token():
    assert security.identity_from_link_token(security.create_access_token(1, "some hash")) is None


def test_a_login_token_with_a_purpose_is_refused():
    """A token that carries both a user id and a purpose is no login token."""
    now = int(time.time())
    token = _signed({"sub": "1", "pwh": security.password_stamp("some hash"), "iat": now, "exp": now + 60,
                     "purpose": "google_link"})
    assert security.user_id_from_token(token) is None


@pytest.mark.parametrize("token", [
    _signed(_link_claims(iat=int(time.time()) - 1200, exp=int(time.time()) - 600)),
    _signed(_link_claims(purpose="something_else")),
    _signed(_link_claims(purpose=DROP)),
    _signed(_link_claims(google_sub=DROP)),
    _signed(_link_claims(google_sub="")),
    _signed(_link_claims(email=DROP)),
    _signed(_link_claims(exp=DROP)),
    _signed(_link_claims(iat=DROP)),
    _signed(_link_claims(), key="some-other-secret-that-is-long-enough"),
    _signed(_link_claims(), algorithm="HS512"),
    None, "", "not-a-jwt", 12345,
], ids=["expired", "wrong purpose", "no purpose", "no google_sub", "empty google_sub", "no email",
        "no exp", "no iat", "other key", "HS512", "None", "empty", "garbage", "number"])
def test_bad_link_tokens_are_refused(token):
    assert security.identity_from_link_token(token) is None


def test_a_tampered_link_token_is_refused():
    header, payload, signature = security.create_link_token(ADA).split(".")
    other_payload = _signed(_link_claims(google_sub="someone-else")).split(".")[1]
    assert security.identity_from_link_token(f"{header}.{other_payload}.{signature}") is None


# --- users.google_sub -------------------------------------------------------------------

def test_google_sub_is_optional_and_unique(client):
    sub = f"sub-{support.uid()}"
    support.make_user()  # without one
    support.make_user()
    support.make_user(google_sub=sub)
    with pytest.raises(IntegrityError):
        support.make_user(google_sub=sub)


def test_init_db_seeds_a_users_table_without_google_sub(client, monkeypatch):
    """A database from before Google sign-in: the seed (which runs before the ALTERs)
    still works, and init_db adds the column and its unique index."""
    with support.isolated_schema() as (eng, Session, schema):
        with eng.begin() as conn:
            conn.execute(text("ALTER TABLE users DROP COLUMN google_sub"))  # drops its index too
            conn.execute(text("INSERT INTO users (id, username, email, hashed_password) "
                              "VALUES (1, 'admin', 'admin@archive.com', 'x')"))
        monkeypatch.setattr(main, "db_engine", eng)
        monkeypatch.setattr(main, "SessionLocal", Session)
        main.init_db()
        with Session() as s:
            assert s.get(Circle, 1).name == "The Order of Light"
            assert s.get(User, 1).google_sub is None
        indexes = {i["name"]: i for i in sa_inspect(eng).get_indexes("users")}
        assert indexes["ix_users_google_sub"]["unique"]
        assert indexes["ix_users_google_sub"]["column_names"] == ["google_sub"]
