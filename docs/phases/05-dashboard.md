# Phase 5 — Dashboard (API + Hebrew UI)

**Goal:** Express REST API + static Hebrew RTL UI showing only matching vehicles, with a
live filter-settings form. Reads DB only through the API layer.

## API (`/apps/dashboard/src/api`)

- `GET  /api/cars` — matching vehicles only; supports multi-column sort
  (`?sort=modelYear:desc,openingPrice:asc`), pagination. Typed responses.
- `GET  /api/filters` — current active filter config.
- `POST /api/filters` — update filter config (הגדרות סינון). Validated; persists to DB;
  applies in real time. No auth (single-admin MVP).
- `GET  /api/status` — last successful run, last run time, scrape stats, notification
  counts.
- `POST /api/scrape` _(optional)_ — manual scrape trigger (enqueues a worker run).
- Middleware: request validation (zod), centralized error handler, JSON typed responses.

## UI (`/apps/dashboard/public`)

- Static `index.html`, RTL (`dir="rtl" lang="he"`), TailwindCSS via CDN, vanilla JS.
- **Sortable table** of matches: יצרן ודגם, שנת מודל, עליה לכביש, קילומטראז',
  תיבת הילוכים, יד, בעלות, מחיר פתיחה/מחירון, קישור ישיר, עודכן לאחרונה.
- Multi-column sort, mobile responsive, fast load (data via fetch to API).
- **Sidebar form "הגדרות סינון"** → POSTs to `/api/filters`; updates target constraints
  (max price, min year, max mileage, gear, max hand, ownership) without auth.
- Status strip: last successful run, last run time, notification stats.

## Conventions

- All labels, table headers, buttons, toasts in Hebrew.
- Server serves static files + API from one Express app (persistent service).
- DB access via `@bidspirit/database` repositories only.

## Exit criteria

UI renders matches in Hebrew RTL, sorting works across columns, filter form round-trips
to DB and re-filters results, status endpoint reflects latest ScrapeRun.
