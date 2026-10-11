#!/usr/bin/env bash
# Postgres local (WSL, sem Docker). Uso: scripts/pg.sh start|stop|status
# Cria os bancos paytrail e paytrail_test com o usuário paytrail (auth trust, só localhost).
set -euo pipefail
. "$(dirname "$0")/wsl-env.sh"

case "${1:-start}" in
  start)
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      mkdir -p "$PGDATA"
      initdb -D "$PGDATA" -U paytrail --auth=trust -E UTF8 >/dev/null
    fi
    if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
      pg_ctl -D "$PGDATA" -l "$PGDATA/../pg.log" -o "-p 5432 -k /tmp -c listen_addresses=localhost" -w start >/dev/null
    fi
    for db in paytrail paytrail_test; do
      psql -h localhost -U paytrail -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
        || createdb -h localhost -U paytrail "$db"
    done
    echo "postgres up on localhost:5432 (dbs: paytrail, paytrail_test)"
    ;;
  stop) pg_ctl -D "$PGDATA" stop ;;
  status) pg_ctl -D "$PGDATA" status ;;
esac
