#!/bin/bash
# Restart only the backend on <api_port> (a server restart mid-session). Usage: bash restart_api.sh <main|control> <api_port> [db_name]
TREE=$1; PORT=$2; DB=${3:-pt4_${TREE}_${PORT}}; SITE=$((PORT-4000))
kill $(cat /tmp/pt4_api_$PORT.pid) 2>/dev/null; sleep 1
cd /home/user/wt/$TREE/backend
KEYLINE=$(grep -o 'SECRET_KEY=[0-9a-f]*' /home/user/pt4/up.sh)
env DATABASE_URL=postgresql://postgres@localhost:5433/$DB $KEYLINE CORS_ORIGINS=http://127.0.0.1:$SITE \
  nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port $PORT >> /tmp/pt4_api_$PORT.log 2>&1 &
echo $! > /tmp/pt4_api_$PORT.pid
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:$PORT/api/auth/me && break; sleep 1; done
echo restarted api $PORT pid $(cat /tmp/pt4_api_$PORT.pid)
