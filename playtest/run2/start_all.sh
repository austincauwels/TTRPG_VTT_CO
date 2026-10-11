#!/bin/bash
# Brings the whole playtest back after a worker restart: PostgreSQL, the API on 8300, the site
# on 4300 and the five seats. Safe to run when some are already up.
PT=/home/user/pt2
pg_isready -h localhost -p 5433 -q || su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data -l /var/tmp/candela-pg/pg.log -o '-p 5433 -c max_connections=300' start" >/dev/null
sleep 2
curl -s -m 3 http://127.0.0.1:8300/api/auth/config >/dev/null || $PT/start_api.sh
curl -s -m 3 -o /dev/null http://127.0.0.1:4300/ || { cd /home/user/sut/frontend && nohup npx vite preview --config .vite.preview.8300.config.mjs --host 127.0.0.1 --port 4300 --strictPort --outDir /home/user/build_sut >> $PT/logs/preview.log 2>&1 & echo $! > $PT/preview.pid; }
if ! curl -s -m 2 http://127.0.0.1:9301/json/version >/dev/null; then
  rm -f $PT/profiles/*/SingletonLock
  cd $PT && nohup node seats_daemon.js >> logs/daemon.log 2>&1 & echo $! > $PT/daemon.pid
fi
sleep 10
curl -s -m 3 http://127.0.0.1:8300/api/auth/config; echo; curl -s -m 3 -o /dev/null -w "site %{http_code}\n" http://127.0.0.1:4300/; tail -1 $PT/logs/daemon.log
