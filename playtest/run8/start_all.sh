#!/bin/bash
# Starts PostgreSQL on 5433 if it is down (a worker restart stops it).
if ! su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data status" >/dev/null 2>&1; then
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data -l /var/tmp/candela-pg/pg.log -o '-p 5433' start" >/dev/null
  sleep 2
fi
psql -h localhost -p 5433 -U postgres -tc "select 'pg up'"
