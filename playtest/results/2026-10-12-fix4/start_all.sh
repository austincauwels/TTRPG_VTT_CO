#!/bin/bash
# Brings PostgreSQL back after a worker restart. Safe to run when it is already up.
if ! pg_isready -h localhost -p 5433 -q 2>/dev/null; then
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data -l /var/tmp/candela-pg/pg.log -o '-p 5433' start"
fi
pg_isready -h localhost -p 5433
