# Phase 4 — Worker (Scraper + Cron)

**Goal:** The independent scraping engine: discover live catalogs, scrape lots
(API-first), normalize, UPSERT, match, notify — on a daily schedule with locking.

## Modules (`/apps/worker/src`)
1. **browser.ts** — Playwright launcher with stealth flags, rotating user agents,
   randomized delays (`SCRAPER_DELAY_MIN/MAX`), timeouts (`SCRAPER_TIMEOUT`),
   headless toggle (`SCRAPER_HEADLESS`).
2. **discovery.ts** — load home, capture catalog list. **Archive filter**: keep only
   live/current/upcoming; explicitly drop closed/past/archived. Returns catalog list.
3. **extract.ts** — per catalog:
   - **Primary:** intercept/replay JSON API endpoints (from Phase 0), page through all
     lots (offset/cursor/page).
   - **Fallback:** DOM extraction via resilient semantic locators if API fails.
   - Continue to next catalog on failure (per-catalog try/catch).
4. **pipeline.ts** — normalize raw lots → `NormalizedCar`, UPSERT by lotUrl/lotId,
   update firstSeenAt/lastSeenAt/lastPrice/lastStatus.
5. **notifyMatches.ts** — load active filter; find new matches with
   `notificationSentAt IS NULL`; send Telegram + Email; record Notification rows;
   set `notificationSentAt`. No repeat alerts.
6. **run.ts** — orchestrates a full run inside a `ScrapeRun` record; collects stats
   (catalogs, cars, matched, notifications, failures, duration); writes summary.
7. **lock.ts** — execution lock via single RUNNING `ScrapeRun` row / Postgres advisory
   lock → **prevents overlapping executions**.
8. **scheduler.ts** — `node-cron` daily trigger (persistent mode) **or** `worker:once`
   entrypoint for Railway cron service (one-shot then exit).
9. **failure capture** — on scrape error: screenshot + HTML snapshot to artifacts dir +
   detailed error context logged and stored in `ScrapeRun.errorLog`.

## Resilience checklist
retry logic ▸ randomized delays ▸ graceful recovery ▸ anti-bot stealth ▸ rotating UA ▸
timeouts ▸ responsible throttling ▸ per-catalog isolation.

## Exit criteria
Against Phase 0 fixtures: discovery filters archived, extraction parses all fields,
pipeline upserts idempotently, matching+notify fire once per new match, ScrapeRun
stats populated, lock prevents concurrent runs.
