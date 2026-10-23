#!/bin/bash
# Stop the backend and site started by up.sh on <api_port>. Add --drop <db> to drop the database.
PORT=$1
for f in /tmp/pt5_api_$PORT.pid /tmp/pt5_site_$PORT.pid; do [ -f $f ] && kill $(cat $f) 2>/dev/null; rm -f $f; done
[ "$2" = "--drop" ] && psql -h localhost -p 5433 -U postgres -qc "drop database if exists $3"
echo stopped $PORT
