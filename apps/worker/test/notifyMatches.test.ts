import type { DigestPayload, Notifier } from '@bidspirit/shared';

const getActiveFilter = jest.fn();
const findCars = jest.fn();
const applyMatchDiff = jest.fn();
const markCarNotified = jest.fn();
const recordNotification = jest.fn();
jest.mock('@bidspirit/database', () => ({
  ...jest.requireActual('@bidspirit/database'),
  getActiveFilter,
  findCars,
  applyMatchDiff,
  markCarNotified,
  recordNotification,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notifyDailyChanges } = require('../src/notifyMatches');

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
};

const RUN_STARTED = new Date('2026-06-14T06:00:00Z');
const SEEN = new Date('2026-06-14T06:01:00Z'); // after run start → "active"

const seedFilter = {
  id: 1,
  minModelYear: 2022,
  minDateOnRoad: null,
  maxMileage: 100000,
  maxHand: 3,
  maxPrice: null,
  transmission: ['AUTOMATIC'],
  ownership: [],
};

function dbCar(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    lotId: String(id),
    lotUrl: `https://x/${id}`,
    makeModel: 'm',
    modelYear: 2025,
    dateOnRoad: null,
    mileage: 1000,
    transmission: 'AUTOMATIC',
    hand: 2,
    ownership: 'UNKNOWN',
    tariffPrice: null,
    openingPrice: null,
    lastSeenAt: SEEN,
    auction: { externalId: 'a', title: 'cat', status: 'RUNNING' },
    ...over,
  };
}

function fakeNotifier(channel: 'TELEGRAM' | 'EMAIL' | 'WEBPUSH', enabled = true) {
  const notifyDigest = jest
    .fn()
    .mockResolvedValue({ channel, ok: true, skipped: false, detail: 'ok' });
  const notify = jest.fn();
  return { channel, isEnabled: () => enabled, notify, notifyDigest } as unknown as Notifier & {
    notifyDigest: jest.Mock;
  };
}

beforeEach(() => {
  getActiveFilter.mockReset().mockResolvedValue(seedFilter);
  findCars.mockReset();
  applyMatchDiff.mockReset();
  markCarNotified.mockReset().mockResolvedValue(undefined);
  recordNotification.mockReset().mockResolvedValue({});
});

function call(notifiers: Notifier[]) {
  return notifyDailyChanges({ notifiers, logger, runId: 7, runStartedAt: RUN_STARTED });
}

describe('notifyDailyChanges', () => {
  it('passes only matching+active car ids to the diff', async () => {
    findCars.mockResolvedValue([
      dbCar(1), // matches + active
      dbCar(2, { transmission: 'MANUAL' }), // fails filter
      dbCar(3, { modelYear: 2019 }), // too old
      dbCar(4, { auction: { externalId: 'a', title: 'c', status: 'ENDED' } }), // ended
      dbCar(5, { lastSeenAt: new Date('2026-06-13T06:00:00Z') }), // not seen this run
    ]);
    applyMatchDiff.mockResolvedValue({ added: [], removed: [] });
    await call([fakeNotifier('TELEGRAM')]);
    expect(applyMatchDiff).toHaveBeenCalledWith({
      matchingActiveCarIds: [1],
      runId: 7,
      runStartedAt: RUN_STARTED,
    });
  });

  it('does nothing (no send) when there are no changes', async () => {
    findCars.mockResolvedValue([dbCar(1)]);
    applyMatchDiff.mockResolvedValue({ added: [], removed: [] });
    const tg = fakeNotifier('TELEGRAM');
    const res = await call([tg]);
    expect(tg.notifyDigest).not.toHaveBeenCalled();
    expect(res).toEqual({ matched: 1, added: 0, removed: 0, notified: 0 });
  });

  it('sends a digest with new + removed and marks added cars notified', async () => {
    findCars.mockResolvedValue([dbCar(1), dbCar(2)]);
    applyMatchDiff.mockResolvedValue({
      added: [
        { carId: 1, type: 'NEW', makeModel: 'm', lotUrl: 'https://x/1', reason: null },
        { carId: 2, type: 'NEW', makeModel: 'm', lotUrl: 'https://x/2', reason: null },
      ],
      removed: [
        {
          carId: 9,
          type: 'REMOVED',
          makeModel: 'old',
          lotUrl: 'https://x/9',
          reason: 'AUCTION_ENDED',
        },
      ],
    });
    const tg = fakeNotifier('TELEGRAM');
    const em = fakeNotifier('EMAIL');
    const res = await call([tg, em]);

    expect(tg.notifyDigest).toHaveBeenCalledTimes(1);
    const digest = tg.notifyDigest.mock.calls[0][0] as DigestPayload;
    expect(digest.added).toHaveLength(2);
    expect(digest.removed).toHaveLength(1);
    expect(digest.added[0]!.auctionTitle).toBe('cat');
    expect(markCarNotified).toHaveBeenCalledTimes(2); // only added cars
    expect(recordNotification).toHaveBeenCalledTimes(4); // 2 added * 2 channels
    expect(res).toEqual({ matched: 2, added: 2, removed: 1, notified: 2 });
  });

  it('does not mark notified when no channel is enabled', async () => {
    findCars.mockResolvedValue([dbCar(1)]);
    applyMatchDiff.mockResolvedValue({
      added: [{ carId: 1, type: 'NEW', makeModel: 'm', lotUrl: 'https://x/1', reason: null }],
      removed: [],
    });
    const res = await call([fakeNotifier('TELEGRAM', false)]);
    expect(markCarNotified).not.toHaveBeenCalled();
    expect(res.notified).toBe(0);
  });

  it('does not mark notified when every channel fails', async () => {
    findCars.mockResolvedValue([dbCar(1)]);
    applyMatchDiff.mockResolvedValue({
      added: [{ carId: 1, type: 'NEW', makeModel: 'm', lotUrl: 'https://x/1', reason: null }],
      removed: [],
    });
    const failing = fakeNotifier('TELEGRAM');
    failing.notifyDigest.mockResolvedValue({
      channel: 'TELEGRAM',
      ok: false,
      skipped: false,
      detail: 'boom',
      error: 'network',
    });
    const res = await call([failing]);
    expect(markCarNotified).not.toHaveBeenCalled();
    expect(recordNotification).toHaveBeenCalledTimes(1);
    expect(res.notified).toBe(0);
  });
});
