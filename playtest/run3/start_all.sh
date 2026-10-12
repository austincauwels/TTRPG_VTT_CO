#!/bin/bash
# Brings the seats back (one browser per AI seat, held open by seats_daemon.js), for example
# after a worker restart. Beta itself runs on Robert's server: nothing to start for it.
# Safe to run when the seats are already up.
PT=/home/user/pt3
cd $PT
env | grep -q '^CANDELA_BETA_PASS=' || echo "warning: CANDELA_BETA_USER/CANDELA_BETA_PASS are not set; the site's pages will answer 401"
if ! curl -s -m 2 http://127.0.0.1:9301/json/version >/dev/null; then
  rm -f $PT/profiles/*/SingletonLock
  nohup node seats_daemon.js >> logs/daemon.log 2>&1 &
  echo $! > $PT/daemon.pid
  sleep 12
fi
tail -2 logs/daemon.log
echo "site pages: $(curl -s -m 10 -o /dev/null -w '%{http_code}' -u "$CANDELA_BETA_USER:$CANDELA_BETA_PASS" "$(cat site.txt)/") (200 is right)"
