#!/bin/bash
# Starts the backend under test on 8300 (harness: mail goes to outbox.jsonl). Writes its PID to api.pid.
PT=/home/user/pt2
set -a; . $PT/.api.env; set +a
export CORS_ORIGINS=http://127.0.0.1:4300 DATABASE_URL=postgresql://postgres@localhost:5433/candela_playtest \
  RESET_URL_BASE=http://127.0.0.1:4300 SRC_BACKEND=/home/user/sut/backend OUTBOX=$PT/outbox.jsonl PORT=8300
nohup /home/user/.venv-candela/bin/python $PT/serve_api.py >> $PT/logs/api.log 2>&1 &
echo $! > $PT/api.pid
