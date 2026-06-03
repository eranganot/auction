#!/usr/bin/env sh
# Persistent worker entrypoint (internal node-cron scheduler mode).
# Use this only if you prefer an always-on worker over Railway's cron service.
set -e
echo "[worker] starting scheduler (cron='${SCRAPER_CRON:-0 6 * * *}', tz='${SCRAPER_TZ:-Asia/Jerusalem}')"
exec npm run start:worker
