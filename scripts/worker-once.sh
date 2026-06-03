#!/usr/bin/env sh
# One-shot worker entrypoint for Railway's cron service: run a single scrape
# cycle and exit. RUN_ONCE=true makes the process terminate after one run.
set -e
echo "[worker:once] single scrape cycle"
exec npm run worker:once
