#!/bin/bash
# Run all migrations in order after init.sql
# This is called by Docker entrypoint

set -e

echo "=== Running Xending migrations ==="

MIGRATION_DIR="/migrations"

if [ -d "$MIGRATION_DIR" ]; then
  for f in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
    echo "  Applying: $(basename $f)"
    psql -U postgres -d postgres -f "$f"
  done
  echo "=== All migrations applied ==="
else
  echo "  No migrations directory found, skipping."
fi
