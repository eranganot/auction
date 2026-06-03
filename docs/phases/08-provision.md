# Phase 8 — Provision GitHub + Railway & Ship

**Goal:** Create the remote repo, push, and stand up the Railway project end-to-end.

## Prerequisites (from user)

- GitHub PAT (scope `repo`) — provided. Repo name + visibility (public/private) — confirm.
- Railway API token — **needed** (see below). Existing team or new — confirm.

## Steps — GitHub

1. `git init`, add `.gitignore` (ensure `.env`, artifacts excluded).
2. Create remote repo via GitHub API with the PAT.
3. Initial commit + push `main`.
4. Verify CI workflow runs.

## Steps — Railway

1. Authenticate Railway CLI / API with token.
2. Create new project.
3. Add **PostgreSQL** plugin → provides `DATABASE_URL`.
4. Create **dashboard service** from the repo (persistent): set env vars, deploy,
   run `prisma migrate deploy`.
5. Create **worker cron service** from the repo: set env vars, set daily cron schedule,
   command `worker:once`.
6. Set all env vars (PLAN.md §7) — secrets entered by user in Railway dashboard, not
   committed.
7. Smoke-check: dashboard reachable, migrations applied, manual worker run populates DB.

## Security

- Never commit secrets. GH token used only for provisioning; recommend rotation after.
- `.env` git-ignored; only `.env.example` committed.

## Exit criteria

Repo live on GitHub; Railway project with Postgres + dashboard + cron worker running;
dashboard serves Hebrew UI; migrations applied; documented in README.
