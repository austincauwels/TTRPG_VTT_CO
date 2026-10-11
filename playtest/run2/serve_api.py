# Harness launcher for the backend under test: the same app, except that outgoing email
# (password reset, email change) is written to outbox.jsonl instead of going to Resend,
# so a playtester can "open their email". Never part of the site.
import json, os, sys, time
SRC_BACKEND = os.environ["SRC_BACKEND"]
OUTBOX = os.environ["OUTBOX"]
sys.path.insert(0, SRC_BACKEND)
os.chdir(SRC_BACKEND)
from vtt import mail  # noqa: E402

def send_email(to, subject, text, html):
    with open(OUTBOX, "a") as f:
        f.write(json.dumps({"t": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "to": to, "subject": subject, "text": text}) + "\n")
    return True

mail.send_email = send_email
import uvicorn  # noqa: E402
uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("PORT", "8300")))
