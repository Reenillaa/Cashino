#!/usr/bin/env bash
# Runs the schema behaviour tests against a throw-away database on a local Postgres 15+.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
psql -q -c "drop database if exists ti_test" -c "create database ti_test" >/dev/null
for f in 00_stub_supabase.sql ../migrations/*.sql 10_behaviour.sql; do
  echo "→ $f"
  psql -q -d ti_test -v ON_ERROR_STOP=1 -f "$f"
done
