"""Checks the ID token behind "Sign in with Google".

The browser gets an ID token (a JWT that Google signs) from Google Identity Services
and posts it to POST /api/auth/google. verify_id_token checks it with google-auth:
Google's signature, the expiry, the audience (GOOGLE_CLIENT_ID) and the issuer. It
then requires a subject, an email address and email_verified true. The server never
sees a Google password and uses no client secret.

google-auth downloads Google's public certificates for every check unless its
transport caches them. CachedCertsTransport keeps each successful download for the
max-age that Google sends in Cache-Control (usually several hours; at most a day
here), so most sign-ins make no request to Google.

Tests replace verify_id_token, or certs_transport, and never reach Google.
"""
import re
import threading
import time
from dataclasses import dataclass

import google.auth.exceptions
import google.auth.transport.requests
from google.oauth2 import id_token

from vtt import config

GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")

# Seconds of difference allowed between Google's clock and ours (iat and exp).
CLOCK_SKEW_SECONDS = 10
# How long one certificate download may take.
CERTS_TIMEOUT_SECONDS = 10
# How long a download is kept when Google sends no max-age, and the longest it is kept.
CERTS_DEFAULT_MAX_AGE = 300
CERTS_LONGEST_MAX_AGE = 24 * 60 * 60

_MAX_AGE_RE = re.compile(r"max-age\s*=\s*(\d+)", re.IGNORECASE)


class GoogleTokenError(Exception):
    """The ID token is not accepted. The message says why; it is for the log only."""


class GoogleUnavailableError(Exception):
    """Google's certificates could not be downloaded, so no token can be checked now."""


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str    # Google's id for the account; it never changes
    email: str  # an address Google has verified
    name: str   # the display name; may be empty


def _max_age(headers):
    for key, value in (headers or {}).items():
        if key.lower() == "cache-control":
            match = _MAX_AGE_RE.search(value or "")
            if match:
                return min(int(match.group(1)), CERTS_LONGEST_MAX_AGE)
    return CERTS_DEFAULT_MAX_AGE


class CachedCertsTransport:
    """A google-auth transport (a callable request) that answers a repeated GET from
    memory while the first answer's max-age lasts. Only answers with status 200 are
    kept, and a GET without a timeout gets CERTS_TIMEOUT_SECONDS. Anything else is
    passed through to the wrapped transport."""

    def __init__(self, transport):
        self._transport = transport
        self._lock = threading.Lock()
        self._cache = {}  # url -> (time.monotonic() when it expires, response)

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        if method != "GET" or body is not None:
            return self._transport(url, method=method, body=body, headers=headers, timeout=timeout, **kwargs)
        with self._lock:
            cached = self._cache.get(url)
        if cached is not None and cached[0] > time.monotonic():
            return cached[1]
        response = self._transport(url, method="GET", headers=headers,
                                   timeout=timeout or CERTS_TIMEOUT_SECONDS, **kwargs)
        if response.status == 200:
            with self._lock:
                self._cache[url] = (time.monotonic() + _max_age(response.headers), response)
        return response

    def clear(self):
        with self._lock:
            self._cache.clear()


certs_transport = CachedCertsTransport(google.auth.transport.requests.Request())


def verify_id_token(credential: str) -> GoogleIdentity:
    """The Google account behind an ID token from Google Identity Services.

    Raises GoogleTokenError when the token is not accepted (bad signature, expired,
    another audience or issuer, no verified email, GOOGLE_CLIENT_ID unset) and
    GoogleUnavailableError when Google's certificates cannot be downloaded. It may
    block on that download, so async code runs it in a worker thread."""
    client_id = config.GOOGLE_CLIENT_ID
    if not client_id:
        # google-auth skips the audience check when it is given none.
        raise GoogleTokenError("GOOGLE_CLIENT_ID is not set")
    try:
        claims = id_token.verify_oauth2_token(credential, certs_transport, audience=client_id,
                                              clock_skew_in_seconds=CLOCK_SKEW_SECONDS)
    except google.auth.exceptions.TransportError as exc:
        raise GoogleUnavailableError(str(exc)) from exc
    except (ValueError, google.auth.exceptions.GoogleAuthError) as exc:
        raise GoogleTokenError(str(exc)) from exc

    # google-auth has checked these; checking again costs nothing.
    if claims.get("aud") != client_id:
        raise GoogleTokenError("the token is for another audience")
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleTokenError("the token comes from another issuer")
    if claims.get("email_verified") not in (True, "true"):
        raise GoogleTokenError("Google has not verified the email address")
    sub, email, name = claims.get("sub"), claims.get("email"), claims.get("name")
    if not isinstance(sub, str) or not sub:
        raise GoogleTokenError("the token has no subject")
    if not isinstance(email, str) or "@" not in email:
        raise GoogleTokenError("the token has no email address")
    return GoogleIdentity(sub=sub, email=email, name=name if isinstance(name, str) else "")
