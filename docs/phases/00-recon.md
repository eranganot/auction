# Phase 0 — Recon & Live API Discovery

**Goal:** Determine exactly how the Bidspirit Cars SPA loads catalogs and lots so the
scraper can prefer JSON/API interception over fragile DOM parsing. This phase de-risks
the entire scraper.

## Why first
The spec mandates API-interception-first extraction and explicit archive filtering.
Both require knowing the real network calls and how "live vs archived" is encoded.

## Steps
1. Load `https://cars.bidspirit.com/ui/home/?lang=he` in an instrumented browser.
2. Capture all XHR/fetch traffic while:
   - the home/catalog list renders,
   - a catalog is opened,
   - lots paginate / infinite-scroll,
   - a single lot detail opens.
3. Identify for each: URL pattern, method, query params, pagination mechanism
   (offset/cursor/page), auth headers/cookies (if any), and response JSON shape.
4. Locate every required field inside the JSON payloads:
   - יצרן ודגם, שנת מודל, עליה לכביש, קילומטראז', תיבת הילוכים, יד,
     בעלות נוכחית, מחיר מחירון / מחיר פתיחה, קישור ישיר ללוט.
5. Identify the catalog **status** field and the values that mean
   live / upcoming vs closed / past / archived.
6. Identify the **stable unique lot identifier** (id and/or canonical URL).
7. Save anonymized sample payloads as test fixtures.

## Deliverables
- `docs/RECON.md` — endpoints, params, pagination, status semantics, field map.
- `apps/worker/test/fixtures/*.json` + `*.html` — captured samples for tests.
- Decision recorded: primary path (API) + fallback path (DOM) per data type.

## Exit criteria
We can name the exact endpoint(s) that return catalogs and lots, know how to page
through them, know how to tell live from archived, and have fixtures saved.

## Risk / fallback
If endpoints are obfuscated or gated, fall back to DOM extraction with resilient
semantic locators (role/text based), still filtering archived catalogs by visible
status text. Document whichever path is chosen.
