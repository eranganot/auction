import {
  countCars,
  countNotifications,
  findCars,
  getActiveFilter,
  getLatestRun,
  listRecentRuns,
  updateActiveFilter,
} from '@bidspirit/database';

/**
 * Data-access seam for the dashboard. The default implementation delegates to
 * the @bidspirit/database repositories (the only module that touches Prisma).
 * Tests inject a fake store so the API can be exercised without a database.
 */
export interface Store {
  getActiveFilter: typeof getActiveFilter;
  updateActiveFilter: typeof updateActiveFilter;
  findCars: typeof findCars;
  getLatestRun: typeof getLatestRun;
  listRecentRuns: typeof listRecentRuns;
  countNotifications: typeof countNotifications;
  countCars: typeof countCars;
}

export const defaultStore: Store = {
  getActiveFilter,
  updateActiveFilter,
  findCars,
  getLatestRun,
  listRecentRuns,
  countNotifications,
  countCars,
};
