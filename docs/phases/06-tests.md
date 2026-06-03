# Phase 6 — Tests & CI

**Goal:** Production-grade Jest coverage with no dependency on live-site availability.

## Test types
1. **Unit — filtering** (`matching.ts`): every criterion pass/fail, boundary values,
   empty filter, multi-criteria combos.
2. **Unit — normalization & enums**: mileage/price/date parsing edge cases; Hebrew enum
   variants incl. whitespace/hidden-char stripping; UNKNOWN fallback.
3. **Integration — scraper parsing**: feed saved Phase 0 fixtures (JSON + HTML) into
   `extract.ts`/`pipeline.ts`; assert correct field extraction, archive filtering, and
   idempotent UPSERT. **Mocked** — no live calls.
4. **API tests** (supertest): `/api/cars` sorting, `/api/filters` GET+POST validation,
   `/api/status`. Uses a test DB (or Prisma mock).
5. **E2E smoke**: boot dashboard against seeded test DB, hit endpoints, assert HTML
   shell + JSON contracts.

## Tooling
- Jest projects per package; ts-jest.
- Fixtures committed under `apps/worker/test/fixtures`.
- Coverage thresholds on `shared` (matching/normalize) high.

## CI (`.github/workflows/ci.yml`)
- Install → lint → build → test on push/PR.
- Postgres service container for API/integration tests.
- Playwright browsers cached/installed for any integration step that needs them.

## Exit criteria
`npm test` green locally and in CI; live site never required for tests.
