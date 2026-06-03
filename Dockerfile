# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Bidspirit Cars auction monitor — single image, two entrypoints.
#
# Based on the official Playwright image so the browser fallback works out of
# the box (Chromium + system deps preinstalled). The same image runs either the
# dashboard service or the cron worker, selected by the start command.
# ---------------------------------------------------------------------------

# ---- Stage 1: install + build ----
FROM mcr.microsoft.com/playwright:v1.45.0-jammy AS build
WORKDIR /app

# Install all workspace deps using only manifests first (better layer caching).
COPY package.json package-lock.json ./
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/
COPY apps/dashboard/package.json apps/dashboard/
RUN npm ci

# Copy sources and build.
COPY tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
RUN npm -w @bidspirit/database run generate \
 && npm run build

# Drop dev dependencies for a leaner runtime image.
RUN npm prune --omit=dev

# ---- Stage 2: runtime ----
FROM mcr.microsoft.com/playwright:v1.45.0-jammy AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Bring over installed (pruned) deps, generated Prisma client, build output,
# manifests, migrations and scripts.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/tsconfig.base.json /app/tsconfig.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
COPY --from=build /app/scripts ./scripts

# Default to the dashboard; Railway's worker service overrides the start command.
EXPOSE 3000
CMD ["sh", "scripts/start-dashboard.sh"]
