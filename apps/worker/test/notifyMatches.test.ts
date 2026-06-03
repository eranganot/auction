import type { NotifiableCar, Notifier } from '@bidspirit/shared';

const getActiveFilter = jest.fn();
const findCars = jest.fn();
const markCarNotified = jest.fn();
const recordNotification = jest.fn();
jest.mock('@bidspirit/database', () => ({
  ...jest.requireActual('@bidspirit/database'),
  getActiveFilter,
  findCars,
  markCarNotified,
  recordNotification,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notifyNewMatches } = require('../src/notifyMatches');

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
};

// Default seed filter: year>=2022, mileage<=100000, hand<=3, AUTOMATIC only.
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
    notificationSentAt: null,
    auction: { externalId: 'a', title: 'cat', status: 'RUNNING' },
    ...over,
  };
}

function fakeNotifier(
  channel: 'TELEGRAM' | 'EMAIL',
  enabled = true,
): Notifier & { notify: jest.Mock } {
  const notify = jest.fn().mockResolvedValue({ channel, ok: true, skipped: false, detail: 'ok' });
  return { channel, isEnabled: () => enabled, notify } as unknown as Notifier & {
    notify: jest.Mock;
  };
}

beforeEach(() => {
  getActiveFilter.mockReset().mockResolvedValue(seedFilter);
  findCars.mockReset();
  markCarNotified.mockReset().mockResolvedValue(undefined);
  recordNotification.mockReset().mockResolvedValue({});
});

describe('notifyNewMatches', () => {
  it('only considers never-notified cars (query filter)', async () => {
    findCars.mockResolvedValue([]);
    await notifyNewMatches({ notifiers: [fakeNotifier('TELEGRAM')], logger });
    expect(findCars).toHaveBeenCalledWith({ where: { notificationSentAt: null } });
  });

  it('sends matched cars once per channel and marks each car notified once', async () => {
    findCars.mockResolvedValue([dbCar(1), dbCar(2)]);
    const tg = fakeNotifier('TELEGRAM');
    const em = fakeNotifier('EMAIL');

    const res = await notifyNewMatches({ notifiers: [tg, em], logger });

    expect(tg.notify).toHaveBeenCalledTimes(1);
    expect(em.notify).toHaveBeenCalledTimes(1);
    const batch = tg.notify.mock.calls[0][0] as NotifiableCar[];
    expect(batch).toHaveLength(2);
    expect(batch[0]!.auctionTitle).toBe('cat');

    expect(markCarNotified).toHaveBeenCalledTimes(2); // once per car
    expect(recordNotification).toHaveBeenCalledTimes(4); // 2 cars * 2 channels
    expect(res).toEqual({ matched: 2, notified: 2 });
  });

  it('excludes cars that fail the filter (non-AUTOMATIC / too old)', async () => {
    findCars.mockResolvedValue([
      dbCar(1, { transmission: 'MANUAL' }),
      dbCar(2, { modelYear: 2019 }),
      dbCar(3), // matches
    ]);
    const tg = fakeNotifier('TELEGRAM');
    const res = await notifyNewMatches({ notifiers: [tg], logger });
    expect(res.matched).toBe(1);
    expect((tg.notify.mock.calls[0][0] as NotifiableCar[]).length).toBe(1);
  });

  it('does not mark notified when no channel is enabled', async () => {
    findCars.mockResolvedValue([dbCar(1)]);
    const res = await notifyNewMatches({ notifiers: [fakeNotifier('TELEGRAM', false)], logger });
    expect(markCarNotified).not.toHaveBeenCalled();
    expect(res).toEqual({ matched: 1, notified: 0 });
  });

  it('does not mark notified when every channel fails (so it retries next run)', async () => {
    findCars.mockResolvedValue([dbCar(1)]);
    const failing = fakeNotifier('TELEGRAM');
    failing.notify.mockResolvedValue({
      channel: 'TELEGRAM',
      ok: false,
      skipped: false,
      detail: 'boom',
      error: 'network',
    });
    const res = await notifyNewMatches({ notifiers: [failing], logger });
    expect(markCarNotified).not.toHaveBeenCalled();
    expect(recordNotification).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ matched: 1, notified: 0 });
  });
});
