#!/bin/bash
# Start a private backend + site. Usage: bash up.sh <main|control> <api_port> [db_name]
# The site is on api_port-4000. Prints the PIDs; stop them with: bash down.sh <api_port>
set -e
TREE=$1; PORT=$2; DB=${3:-pt5_${TREE}_${PORT}}; SITE=$((PORT-4000))
DIR=/home/user/wt/$TREE
bash /home/user/pt5/start_all.sh >/dev/null
psql -h localhost -p 5433 -U postgres -tc "select 1 from pg_database where datname='$DB'" | grep -q 1 || psql -h localhost -p 5433 -U postgres -qc "create database $DB"
cd $DIR/backend
DATABASE_URL=postgresql://postgres@localhost:5433/$DB SECRET_KEY=$(cat /home/user/pt5/secret_key) CORS_ORIGINS=http://127.0.0.1:$SITE \
  nohup /root/.venv-candela/bin/python -m uvicorn main:app --host 127.0.0.1 --port $PORT > /tmp/pt5_api_$PORT.log 2>&1 &
echo $! > /tmp/pt5_api_$PORT.pid
cd $DIR/frontend
sed "s/127.0.0.1:8000/127.0.0.1:$PORT/g" vite.config.js > .vite.preview.$PORT.config.mjs
nohup npx vite preview --config .vite.preview.$PORT.config.mjs --host 127.0.0.1 --port $SITE --strictPort --outDir dist > /tmp/pt5_site_$PORT.log 2>&1 &
echo $! > /tmp/pt5_site_$PORT.pid
for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:$PORT/api/auth/me && curl -s -o /dev/null http://127.0.0.1:$SITE/ && break; sleep 1; done
echo "$TREE: api http://127.0.0.1:$PORT (pid $(cat /tmp/pt5_api_$PORT.pid), log /tmp/pt5_api_$PORT.log), site http://127.0.0.1:$SITE (pid $(cat /tmp/pt5_site_$PORT.pid)), database $DB"
