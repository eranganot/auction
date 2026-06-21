import request from 'supertest';
import type { CarWithAuction, ScrapeRun, UserFilter } from '@bidspirit/database';
import { createApp } from '../src/app';
import type { Store } from '../src/store';

const silentLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return silentLogger;
  },
} as never;

function mkFilter(over: Partial<UserFilter> = {}): UserFilter {
  return {
    id: 1,
    name: 'default',
    minModelYear: 2022,
    minDateOnRoad: null,
    maxMileage: 100000,
    maxHand: 3,
    maxPrice: null,
    transmission: ['AUTOMATIC'],
    ownership: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as UserFilter;
}

function mkCar(over: Partial<CarWithAuction>): CarWithAuction {
  return {
    id: 1,
    lotId: '1',
    lotUrl: 'https://x/1',
    makeModel: 'טויוטה',
    modelYear: 2024,
    dateOnRoad: null,
    mileage: 5000,
    transmission: 'AUTOMATIC',
    hand: 1,
    ownership: 'PRIVATE',
    tariffPrice: null,
    openingPrice: null,
    imageUrl: null,
    lastPrice: null,
    lastStatus: null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    notificationSentAt: null,
    auctionId: 1,
    auction: { externalId: 'a', title: 'catalog', status: 'READY' },
    ...over,
  } as CarWithAuction;
}

function fakeStore(over: Partial<Store> = {}): Store {
  let filter = mkFilter();
  return {
    getActiveFilter: async () => filter,
    updateActiveFilter: async (input) => {
      filter = mkFilter({ ...filter, ...input } as Partial<UserFilter>);
      return filter;
    },
    findCars: async () => [
      mkCar({ id: 1, modelYear: 2024, transmission: 'AUTOMATIC' }),
      mkCar({ id: 2, modelYear: 2019, transmission: 'AUTOMATIC' }), // too old → filtered out
      mkCar({ id: 3, modelYear: 2023, transmission: 'MANUAL' }), // wrong gear → filtered out
    ],
    getLatestRun: async () => null,
    listRecentRuns: async () => [],
    countNotifications: async () => 0,
    countCars: async () => 3,
    ...over,
  } as Store;
}

function app(store: Store) {
  return createApp({ store, logger: silentLogger });
}

describe('GET /api/cars', () => {
  it('returns only filter-matching cars', async () => {
    const res = await request(app(fakeStore())).get('/api/cars');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(1);
    expect(res.body.data[0].transmissionLabel).toBe('אוטומטי');
  });

  it('honors multi-column sort', async () => {
    const store = fakeStore({
      findCars: async () => [
        mkCar({ id: 1, modelYear: 2024, mileage: 50 }),
        mkCar({ id: 2, modelYear: 2024, mileage: 10 }),
        mkCar({ id: 3, modelYear: 2025, mileage: 80 }),
      ],
    });
    const res = await request(app(store)).get('/api/cars?sort=modelYear:desc,mileage:asc');
    expect(res.body.data.map((c: { id: number }) => c.id)).toEqual([3, 2, 1]);
  });

  it('paginates', async () => {
    const many = Array.from({ length: 5 }, (_, i) => mkCar({ id: i + 1 }));
    const res = await request(app(fakeStore({ findCars: async () => many }))).get(
      '/api/cars?pageSize=2&page=2',
    );
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(2);
  });
});

describe('filters round-trip', () => {
  it('GET returns the active filter', async () => {
    const res = await request(app(fakeStore())).get('/api/filters');
    expect(res.status).toBe(200);
    expect(res.body.minModelYear).toBe(2022);
    expect(res.body.transmission).toEqual(['AUTOMATIC']);
  });

  it('POST validates and persists, then re-filters results', async () => {
    const store = fakeStore();
    const a = app(store);
    const post = await request(a)
      .post('/api/filters')
      .send({ minModelYear: 2018, transmission: ['AUTOMATIC', 'MANUAL'] });
    expect(post.status).toBe(200);
    expect(post.body.minModelYear).toBe(2018);

    // Now the 2019 + manual cars should pass too.
    const cars = await request(a).get('/api/cars');
    expect(cars.body.total).toBe(3);
  });

  it('POST rejects invalid payloads with 400', async () => {
    const res = await request(app(fakeStore()))
      .post('/api/filters')
      .send({ minModelYear: 'soon', transmission: ['ROCKET'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('POST rejects unknown keys (strict schema)', async () => {
    const res = await request(app(fakeStore())).post('/api/filters').send({ hacker: true });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/status', () => {
  it('reports last successful run and totals', async () => {
    const run = {
      id: 7,
      status: 'SUCCESS',
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 1234,
      catalogsProcessed: 4,
      carsScraped: 40,
      carsMatched: 3,
      notificationsSent: 3,
      failures: 0,
      errorLog: null,
    } as ScrapeRun;
    const store = fakeStore({
      getLatestRun: async () => run,
      listRecentRuns: async () => [run],
      countCars: async () => 40,
      countNotifications: async () => 3,
    });
    const res = await request(app(store)).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.lastSuccessfulRun.id).toBe(7);
    expect(res.body.totals).toEqual({ cars: 40, notifications: 3 });
  });
});

describe('GET /api/cars — past/completed auctions excluded', () => {
  const T = new Date('2026-06-14T10:00:00Z'); // last successful run start
  const runs = [{ status: 'SUCCESS', startedAt: T }] as unknown as ScrapeRun[];

  function storeWithStale() {
    return fakeStore({
      listRecentRuns: async () => runs,
      findCars: async () =>
        [
          mkCar({ id: 1, lotUrl: 'https://x/1', lastSeenAt: new Date('2026-06-14T10:05:00Z') }), // seen this run → current
          mkCar({ id: 2, lotUrl: 'https://x/2', lastSeenAt: new Date('2026-06-10T10:00:00Z') }), // stale → excluded
          mkCar({
            id: 3,
            lotUrl: 'https://x/3',
            lastSeenAt: new Date('2026-06-14T10:05:00Z'),
            auction: { externalId: 'a', title: 'c', status: 'ENDED' },
          }), // ended → excluded
        ] as CarWithAuction[],
    });
  }

  it('hides stale and ended cars by default', async () => {
    const res = await request(app(storeWithStale())).get('/api/cars');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].lotUrl).toBe('https://x/1');
  });

  it('includes them when includeInactive=1', async () => {
    const res = await request(app(storeWithStale())).get('/api/cars?includeInactive=1');
    expect(res.body.total).toBe(3);
  });

  it('shows everything when there is no successful run yet (cannot tell)', async () => {
    const res = await request(app(fakeStore({ listRecentRuns: async () => [] }))).get('/api/cars');
    // default 3 fixtures: 1 matches filter (others fail year/gear), none excluded as stale
    expect(res.body.total).toBe(1);
  });
});
