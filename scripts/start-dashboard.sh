#!/usr/bin/env sh
# Dashboard service entrypoint: ensure the DB schema is current, then serve.
set -e
sh scripts/migrate.sh
echo "[dashboard] starting on port ${PORT:-3000}"
exec npm run start:dashboard
