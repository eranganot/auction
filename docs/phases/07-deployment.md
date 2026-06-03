# Phase 7 — Deployment Artifacts

**Goal:** Everything needed for near one-click Railway deployment with Postgres, a
persistent dashboard service, and a scheduled cron worker service.

## Artifacts

1. **Dockerfile** — based on official Playwright image (browsers preinstalled);
   multi-stage: install deps → build → run. Supports both `dashboard` and `worker`
   entrypoints via start command / env.
2. **railway.json** (or `railway.toml`) — declares:
   - **dashboard service**: persistent, runs migrations on deploy then `start:dashboard`,
     exposes `PORT`.
   - **worker cron service**: `cron` schedule (daily) running `worker:once` (one-shot).
   - shared Postgres plugin via `DATABASE_URL`.
3. **scripts/**
   - `migrate.sh` — `prisma migrate deploy`.
   - `start-dashboard.sh`, `start-worker.sh`, `worker-once.sh`.
4. **.env.example** — full contract (PLAN.md §7).
5. **.dockerignore**.

## README.md (English) — must cover

- Project overview & architecture diagram.
- Setup & local development (`npm install`, local Postgres, `prisma migrate dev`,
  `npm run dev:dashboard`, `npm run worker:once`).
- Environment variables table (all of §7, what each does).
- Railway deployment: create project, add Postgres, set env vars, deploy dashboard
  service, add cron service + schedule.
- Database setup & migrations.
- Cron configuration (daily; how to change cadence; persistent-mode alternative).
- Troubleshooting (scraper failures, screenshots/snapshots, lock stuck, notifications).
- Testing instructions.
- Note: app UI is Hebrew; README is English.

## Exit criteria

Clean checkout builds the Docker image; Railway config defines all three pieces;
README lets a new dev deploy unassisted.
