# Phase 1 — Monorepo Scaffold & Tooling

**Goal:** Stand up the npm-workspaces monorepo, TypeScript project references, and
shared tooling so every later phase has a clean home.

## Layout

```
/apps/worker
/apps/dashboard
/packages/shared
/packages/database
```

## Steps

1. Root `package.json` with npm workspaces (`apps/*`, `packages/*`) and root scripts:
   `build`, `test`, `lint`, `format`, `migrate`, `dev:dashboard`, `dev:worker`,
   `worker:once` (one-shot cron mode).
2. `tsconfig.base.json` (strict) + per-package `tsconfig.json` with project references.
3. ESLint + Prettier configs; `.editorconfig`; `.gitignore` (node_modules, dist, .env,
   Playwright artifacts, screenshots/snapshots).
4. `.env.example` with the full env contract from PLAN.md §7.
5. Each package/app gets its own `package.json` and `src/` entry stub.
6. Jest base config wired at root with per-package overrides.

## Conventions

- All packages publish a typed entry (`src/index.ts`).
- No hardcoded values — everything via `@bidspirit/shared` config.
- Path aliases: `@bidspirit/shared`, `@bidspirit/database`.

## Exit criteria

`npm install` then `npm run build` compiles all empty packages with zero TS errors;
`npm run lint` passes.
