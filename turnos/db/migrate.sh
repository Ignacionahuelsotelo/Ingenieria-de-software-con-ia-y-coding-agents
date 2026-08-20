#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

PG_USER="${POSTGRES_USER:-turnos}"
PG_DB="${POSTGRES_DB:-turnos}"

run_sql() {
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" "$@"
}

run_sql -c "create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamp with time zone default now()
);" >/dev/null

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$file" ] || continue
  version="$(basename "$file")"
  already_applied="$(run_sql -tAc "select 1 from schema_migrations where version = '$version';")"
  if [ "$already_applied" = "1" ]; then
    echo "skip  $version (ya aplicada)"
    continue
  fi
  echo "apply $version"
  run_sql < "$file"
  run_sql -c "insert into schema_migrations (version) values ('$version');" >/dev/null
done

echo "Migraciones al día."
