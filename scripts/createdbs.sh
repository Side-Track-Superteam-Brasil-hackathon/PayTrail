#!/usr/bin/env bash
# Cria bancos extras no Postgres local. Uso: scripts/createdbs.sh db1 db2 ...
. "$(dirname "$0")/wsl-env.sh"
for db in "$@"; do
  psql -h localhost -U paytrail -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
    || createdb -h localhost -U paytrail "$db"
done
psql -h localhost -U paytrail -d postgres -tAc "select datname from pg_database where datname like 'paytrail%' order by 1"
