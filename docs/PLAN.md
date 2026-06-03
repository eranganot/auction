# Bidspirit Cars — Auction Discovery & Monitoring Platform

**Master Execution Plan**

This document is the single source of truth for what we are building, why, and in
what order. Each phase has its own detailed file under [`docs/phases/`](./phases/).
Check items off as they are completed. If we ever lose context, start here.

---

## 1. Goal (one paragraph)

A production-grade, one-click-deployable (Railway) platform that **discovers** all
live/upcoming car-auction catalogs from Bidspirit Cars, **scrapes** every relevant
vehicle lot, **normalizes & stores** it in PostgreSQL, **filters** lots against
configurable user preferences, **displays** matches in a sortable Hebrew dashboard,
and **notifies** (Telegram + Email) about newly matching vehicles — running
automatically once per day. UI, notifications, and user-facing values are in Hebrew;
the README and code comments are in English.

Root URL: `https://cars.bidspirit.com/ui/home/?lang=he`

---

## 2. Confirmed decisions

| Decision            | Choice                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Repo/Deploy         | User provides GitHub + Railway tokens; agent provisions end-to-end                         |
| Extraction strategy | Probe live site first; **API/network interception primary**, DOM fallback                  |
| Secrets             | `.env.example` placeholders only — no real secrets committed                               |
| Test depth          | Full per spec: unit + integration + API + e2e smoke, plus ESLint/Prettier + CI             |
| Railway topology    | **Persistent dashboard service** + **separate scheduled cron service** for the scraper     |
| Code location       | `C:\Users\erang\OneDrive\Desktop\Eran's dev\Bidspirit`                                     |
| GitHub repo         | `eranganot/auction` — **public** — https://github.com/eranganot/auction                    |
| Railway account     | User's **personal** account; new project                                                   |
| Per-phase workflow  | After each phase: **full QA + validation**, then **commit to production** (push to `main`) |

### Default seed filter (`UserFilter`)

| Criterion                        | Value              |
| -------------------------------- | ------------------ |
| שנת מודל מינימלית (min year)     | **2022**           |
| קילומטראז' מקסימלי (max mileage) | **100,000 ק"מ**    |
| מספר יד מקסימלי (max hand)       | **3**              |
| מחיר מקסימלי (max price)         | **none (no cap)**  |
| סוג גיר (transmission)           | **AUTOMATIC only** |
| בעלות (ownership)                | all                |

---

## 3. Architecture (lean, production-grade)

```
/apps
  /worker        Scraper + node-cron scheduler + notification trigger (no UI)
  /dashboard     Express REST API + static Hebrew RTL UI (Tailwind CDN + vanilla JS)
/packages
  /shared        config, logger, types, normalization, enum-mapping, matching, notifiers
  /database      Prisma schema, generated client, migrations
```

Principles enforced:

- Scraper worker runs **independently** of the web dashboard.
- Dashboard reads data **only through its API layer** (never the worker renders UI).
- Notification service is **modular & reusable** (shared package).
- All services **stateless** except PostgreSQL.
- Shared logic centralized; DB access abstracted through `/packages/database`.
- Configuration **fully environment-variable driven**.

---

## 4. Technology stack (fixed — no substitutions)

- Node.js + TypeScript
- Playwright (stealth-configured) for scraping
- PostgreSQL (Railway `DATABASE_URL`)
- Prisma ORM + migrations
- Express.js API server
- Static HTML + TailwindCSS (CDN) + vanilla JS dashboard (no React/Next)
- Jest for tests
- npm workspaces for the monorepo (no Turbo/Nx — keep it lean)

---

## 5. Phase index

| #   | Phase                             | File                                          | Status |
| --- | --------------------------------- | --------------------------------------------- | ------ |
| 0   | Recon & live API discovery        | [00-recon.md](./phases/00-recon.md)           | ☐      |
| 1   | Monorepo scaffold & tooling       | [01-scaffold.md](./phases/01-scaffold.md)     | ☐      |
| 2   | Database & Prisma schema          | [02-database.md](./phases/02-database.md)     | ☐      |
| 3   | Shared package (logic core)       | [03-shared.md](./phases/03-shared.md)         | ☐      |
| 4   | Worker (scraper + cron)           | [04-worker.md](./phases/04-worker.md)         | ☐      |
| 5   | Dashboard (API + Hebrew UI)       | [05-dashboard.md](./phases/05-dashboard.md)   | ☐      |
| 6   | Tests & CI                        | [06-tests.md](./phases/06-tests.md)           | ☐      |
| 7   | Deployment artifacts              | [07-deployment.md](./phases/07-deployment.md) | ☐      |
| 8   | Provision GitHub + Railway & ship | [08-provision.md](./phases/08-provision.md)   | ☐      |

---

## 6. Cross-cutting requirements (apply to every phase)

- **Resilience:** retries, randomized delays, graceful per-catalog recovery, timeouts,
  rotating user agents, responsible throttling.
- **Archive filtering:** only live/current/upcoming catalogs are scraped; closed/past/
  archived are explicitly skipped.
- **Idempotency:** UPSERT on stable lot ID or stable lot URL; no duplicate inserts,
  notifications, or scrape records.
- **State tracking:** `firstSeenAt`, `lastSeenAt`, `notificationSentAt`, `lastPrice`,
  `lastStatus`.
- **Resilient enum mapping:** Hebrew variants → clean internal enums, `UNKNOWN` fallback,
  never crash ingestion.
- **Observability:** structured logs + `ScrapeRun` history (catalogs processed, cars
  scraped, matched, notifications sent, failures, duration).
- **Hebrew everywhere user-facing;** English README & comments.

---

## 7. Environment variables (contract)

```
PORT=
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_IDS=          # comma-separated
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
NOTIFICATION_EMAILS=       # comma-separated
SCRAPER_HEADLESS=
SCRAPER_TIMEOUT=
SCRAPER_DELAY_MIN=
SCRAPER_DELAY_MAX=
```

---

## 8. Definition of Done

- `npm install && npm run build` succeeds from clean checkout.
- `npm test` green (unit + integration + API + smoke).
- Worker run populates DB, filters, and (with real creds) notifies — verified against
  fixtures without live-site dependency in CI.
- Dashboard serves Hebrew RTL UI with sortable matches + working filter form.
- Pushed to GitHub; Railway project live with Postgres, dashboard service, and cron
  service; migrations applied.
- README complete in English.
