# Phase 3 — Shared Package (Logic Core)

**Goal:** Centralize every cross-cutting piece of logic so nothing is duplicated.

## Modules (`/packages/shared/src`)
1. **config.ts** — load + validate all env vars (PLAN.md §7), typed, fail-fast with
   clear errors. Defaults for scraper delays/timeouts.
2. **logger.ts** — structured JSON logger (timestamp, level, context, scrape stats).
3. **types.ts** — shared DTOs (RawLot, NormalizedCar, FilterCriteria, MatchResult).
4. **normalize.ts**
   - `parseMileage` → Int (strip "ק\"מ", commas, spaces).
   - `parsePrice` → Int (strip ₪, commas).
   - `parseDate` → ISO (handle dd/mm/yyyy, mm/yyyy, partial).
   - graceful nulls on malformed input.
5. **enums.ts** — defensive mapping dictionaries:
   - Transmission: אוטומטי/אוטומטית/אוטומט→AUTOMATIC, ידני/ידנית→MANUAL,
     רובוטי/אוטומט-רובוטי→ROBOTIC, else UNKNOWN.
   - Ownership: פרטית→PRIVATE, חברה→COMPANY, ליסינג→LEASING, השכרה→RENTAL,
     ממשלתי→GOV, else UNKNOWN.
   - Trim whitespace + strip hidden/RTL control chars before matching.
6. **matching.ts** — pure function `matches(car, filter): MatchResult`. Each criterion
   (minModelYear, minDateOnRoad, maxMileage, transmission, maxHand, ownership, maxPrice)
   evaluated independently; returns pass/fail + per-criterion reasons. No DB, no side
   effects → fully unit-testable.
7. **notifiers/** — modular & reusable:
   - `TelegramNotifier`: Bot API, multiple chat IDs (comma-split), Hebrew message
     builder, direct lot links.
   - `EmailNotifier`: Nodemailer SMTP, multiple recipients, Hebrew HTML summary.
   - Common `Notifier` interface so new channels drop in.
8. **constants.ts** — centralized selectors + API endpoint constants (from Phase 0).

## Exit criteria
Each module independently importable & typed; matching + normalization + enum mapping
covered by unit tests in Phase 6; notifiers callable with injected config.
