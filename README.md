# Bidspirit Cars — Auction Monitor

Automated monitor for car auctions on **[Bidspirit Cars](https://cars.bidspirit.com/ui/home/?lang=he)** (Israel).
It discovers active and upcoming car-auction catalogs, scrapes every lot, normalizes and stores
the data in PostgreSQL, matches lots against your configurable preferences, shows matches in a
sortable Hebrew (RTL) dashboard, and sends **Telegram + Email** notifications the first time a new
lot matches your filter. It runs automatically once per day.

> The application UI is in **Hebrew**. This README is in English.

---

## Architecture

A lean npm-workspaces monorepo. The scraper and the dashboard are fully independent: the scraper
writes to Postgres, the dashboard only ever reads through its own API.

```
                        +------------------------------+
                        |      Bidspirit JSON API      |
                        |  (getHomePageData, getItems) |
                        +--------------+---------------+
                                       | pure HTTP (Playwright fallback)
                                       v
+----------------------------------------------------------------+
|  apps/worker  - scrape + cron (no UI)                          |
|   discover live CARS catalogs -> extract lots -> normalize     |
|   -> upsert into Postgres -> match -> notify (Telegram + Email)|
+-------------------------------+--------------------------------+
                                | writes
                                v
                      +---------------------+        reads
                      |     PostgreSQL      |<-------------------+
                      |  (Prisma schema)    |                    |
                      +---------------------+                    |
                                ^                                |
                                | via @bidspirit/database        |
+---------------------------------------------------------------+|
|  apps/dashboard - Express API + static Hebrew RTL UI          ||
|   GET /api/cars . GET|POST /api/filters . GET /api/status     |+
+---------------------------------------------------------------+

packages/shared    - config, logging, normalization, enum mapping, matching engine, notifiers
packages/database  - Prisma client + schema + repository functions (the only DB access layer)
```

Design rules: stateless except for Postgres; all DB access is funneled through
`@bidspirit/database`; apps and shared import Prisma enums/types **only** via that package's
re-exports, never `@prisma/client` directly; everything is driven by environment variables.

### Tech stack

Node.js 20 + TypeScript, Playwright (HTTP-first, browser fallback), PostgreSQL, Prisma,
Express.js, static HTML + TailwindCSS (CDN) + vanilla JS, Jest, npm workspaces.

---

## Local development

Prerequisites: **Node.js >= 20**, **npm**, and a local **PostgreSQL** instance (or Docker).

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env          # then edit DATABASE_URL and any notification creds

# 3. database - create the schema and seed the default filter
npm run db:migrate            # prisma migrate dev (creates/updates local schema)
npm run db:seed               # seeds the default filter (year>=2022, km<=100k, hand<=3, AUTOMATIC)

# 4a. run the dashboard (http://localhost:3000)
npm run dev:dashboard

# 4b. run a single scrape cycle on demand
npm run worker:once
```

Other useful scripts: `npm run build` (compile all), `npm run lint`, `npm run format`,
`npm test` (full suite), `npm run dev:worker` (persistent node-cron scheduler).

---

## Environment variables

`DATABASE_URL` is the only hard requirement. Notification credentials are optional - each notifier
reports itself "not configured" and is skipped, so the dashboard and a credential-less worker boot
cleanly. See `.env.example` for a ready-to-copy template.

| Variable              | Default          | Purpose                                                        |
| --------------------- | ---------------- | -------------------------------------------------------------- |
| `PORT`                | `3000`           | Dashboard HTTP port (Railway sets this automatically).         |
| `DATABASE_URL`        | -                | **Required.** PostgreSQL connection string.                    |
| `LOG_LEVEL`           | `info`           | `debug` / `info` / `warn` / `error`.                           |
| `NODE_ENV`            | `development`    | Standard Node environment flag.                                |
| `SCRAPER_HEADLESS`    | `true`           | Run the Playwright fallback browser headless.                  |
| `SCRAPER_TIMEOUT`     | `30000`          | Per-request timeout (ms).                                      |
| `SCRAPER_DELAY_MIN`   | `800`            | Min randomized delay between requests (ms).                    |
| `SCRAPER_DELAY_MAX`   | `2500`           | Max randomized delay between requests (ms).                    |
| `SCRAPER_MAX_RETRIES` | `3`              | Retry attempts per request.                                    |
| `SCRAPER_CRON`        | `0 6 * * *`      | node-cron schedule (persistent worker mode only).              |
| `SCRAPER_TZ`          | `Asia/Jerusalem` | Timezone for the cron schedule.                                |
| `RUN_ONCE`            | `false`          | `true` -> worker runs one cycle and exits (cron-service mode). |
| `BIDSPIRIT_REGION`    | `IL`             | Bidspirit region.                                              |
| `BIDSPIRIT_CONTENT`   | `CARS`           | Content type to scrape.                                        |
| `TELEGRAM_BOT_TOKEN`  | -                | Telegram bot token (enables Telegram notifications).           |
| `TELEGRAM_CHAT_IDS`   | -                | Comma-separated chat IDs to notify.                            |
| `SMTP_HOST`           | -                | SMTP server host (enables email notifications).                |
| `SMTP_PORT`           | `587`            | SMTP port.                                                     |
| `SMTP_USER`           | -                | SMTP username.                                                 |
| `SMTP_PASS`           | -                | SMTP password.                                                 |
| `SMTP_FROM`           | `SMTP_USER`      | From header for outgoing mail.                                 |
| `NOTIFICATION_EMAILS` | -                | Comma-separated recipient list.                                |

---

## Railway deployment

The repo ships a `Dockerfile` (based on the official Playwright image) and two config-as-code
files. The dashboard runs as a persistent service; the scraper runs as a daily **cron** service.
Both build from the same image - only the start command differs.

1. **Create the project and add Postgres.** In Railway, create a new project from the
   `eranganot/auction` GitHub repo, then **+ New -> Database -> PostgreSQL**. Railway exposes the
   connection string as `DATABASE_URL`; reference it from both services.

2. **Dashboard service** (persistent).
   - Config file: `railway.json` (the default). It builds the Dockerfile and runs
     `sh scripts/start-dashboard.sh`, which applies migrations (`prisma migrate deploy`) and then
     starts Express.
   - Healthcheck path `/api/health` is preconfigured.
   - Set `DATABASE_URL` (reference the Postgres plugin) and any notification vars you want.
   - Railway provides `PORT` automatically.

3. **Worker cron service** (one-shot, daily).
   - Add a second service from the same repo.
   - Point its config-as-code path at **`railway.worker.json`**, which runs
     `sh scripts/worker-once.sh` on a `cronSchedule` of `0 6 * * *` (06:00 daily) with
     restart policy `NEVER` (a cron run is expected to exit).
   - Set the same `DATABASE_URL` and notification vars.
   - `RUN_ONCE=true` is implied by the `worker:once` script, so the process runs one scrape cycle
     and exits cleanly.

4. **Seed the default filter** once, after the first deploy (see below).

### Database setup & migrations

Migrations live in `packages/database/prisma/migrations` and are applied automatically on every
dashboard deploy via `scripts/migrate.sh` (`prisma migrate deploy` - idempotent). To seed the
default filter on Railway, run a one-off command against the dashboard service:

```bash
npm run db:seed
```

Locally, use `npm run db:migrate` (creates/edits migrations in dev) and `npm run db:seed`.

### Cron configuration

The daily schedule is defined in `railway.worker.json` (`"cronSchedule": "0 6 * * *"`). Change the
cron expression there to adjust cadence. **Alternative - persistent worker:** instead of the cron
service, you can run an always-on worker that schedules itself internally: set the service start
command to `sh scripts/start-worker.sh`, leave `RUN_ONCE` unset/`false`, and control timing with
`SCRAPER_CRON` and `SCRAPER_TZ`.

---

## How matching works

A lot is a match when it satisfies **every** active filter criterion. The default seed filter is:
model year >= 2022, mileage <= 100,000 km, hand <= 3, transmission = automatic, no price cap, any
ownership.

**Critical null rule:** a null/unknown value on a constrained scalar (price, year, mileage, hand)
never disqualifies a lot - most lots have no price before they go live, and we would rather surface
a "maybe" than hide it. An empty enum array (transmission/ownership) means "no constraint".

Notifications fire **only** when a lot newly matches **and** has never been notified before, so you
never get duplicate alerts for the same lot.

---

## Testing

```bash
npm test            # full suite across all 4 workspaces
npm run lint        # eslint
npm run format:check
npm run build       # tsc project references
```

The matching engine, normalization, and Hebrew enum mapping have unit tests with high coverage on
the logic core. Scraper parsing is tested against committed fixtures, the API with supertest, and
none of the tests require the live site. CI (`.github/workflows/ci.yml`) runs install -> prisma
generate -> migrate -> lint -> format -> build -> test against a Postgres service container on every
push and PR to `main`.

---

## Troubleshooting

- **Scraper failures / empty results.** On any failure the worker writes a diagnostic artifact
  (response body / screenshot) to the artifacts directory and records the error on the `ScrapeRun`
  row; check the dashboard status strip and `ScrapeRun.errorLog`. The scraper prefers the JSON API
  and only falls back to a Playwright browser when needed.
- **A run appears stuck.** Runs are guarded by a single `RUNNING` `ScrapeRun` lock. A stale lock
  older than 2 hours is automatically reaped on the next run, so a crashed process won't block
  future runs.
- **No notifications.** Confirm the relevant credentials are set (`TELEGRAM_BOT_TOKEN` +
  `TELEGRAM_CHAT_IDS`, or the `SMTP_*` vars + `NOTIFICATION_EMAILS`). A notifier with missing
  credentials is skipped silently rather than crashing the run. Remember alerts fire only the first
  time a lot matches.
- **Migrations didn't apply.** The dashboard runs `prisma migrate deploy` on boot; check the deploy
  logs. You can re-run `npm run db:deploy` manually.
