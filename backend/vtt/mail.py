"""Sending email, through Resend's HTTP API (POST https://api.resend.com/emails).

send_email is the only way the app sends mail (today: password reset links). It never
raises for a mail problem: without RESEND_API_KEY it logs that the email was not sent,
and when Resend cannot be reached or refuses the email it logs that. It returns True
when Resend accepted the email.

Tests replace send_email with a fake, and tests/conftest.py replaces post (the HTTP
call) so that a test that gets past the fake fails instead of reaching Resend.
"""
import requests

from vtt import config
from vtt.config import logger

RESEND_URL = "https://api.resend.com/emails"
SENDER = "Candela Obscura <no-reply@mail.gatergrid.com>"
TIMEOUT_SECONDS = 10


def post(url, **kwargs):
    """The HTTP request to Resend (requests.post)."""
    return requests.post(url, **kwargs)


def send_email(to: str, subject: str, text: str, html: str) -> bool:
    """Sends one email from SENDER to one address, as plain text plus HTML. The log
    names the subject, never the address or the body (a reset email's body holds a
    working link)."""
    key = config.RESEND_API_KEY
    if not key:
        logger.warning("RESEND_API_KEY is not set, so the email %r was not sent", subject)
        return False
    try:
        response = post(
            RESEND_URL,
            json={"from": SENDER, "to": [to], "subject": subject, "text": text, "html": html},
            headers={"Authorization": f"Bearer {key}"},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.error("Could not reach Resend to send the email %r: %s", subject, exc)
        return False
    if not 200 <= response.status_code < 300:
        logger.error("Resend refused the email %r: HTTP %s %s", subject, response.status_code,
                     (response.text or "")[:300])
        return False
    return True
