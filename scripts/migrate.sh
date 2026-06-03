#!/usr/bin/env sh
# Apply committed Prisma migrations to the database pointed at by DATABASE_URL.
# Safe to run on every deploy; it is a no-op when the schema is already current.
set -e
echo "[migrate] prisma migrate deploy"
npm -w @bidspirit/database run deploy
