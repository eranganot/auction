import type { NormalizedAuction, NormalizedCar } from '@bidspirit/shared';

const upsertAuction = jest.fn();
const upsertCar = jest.fn();
jest.mock('@bidspirit/database', () => ({ upsertAuction, upsertCar }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { persistCatalog } = require('../src/pipeline');

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
};

const auction: NormalizedAuction = {
  externalId: '75783',
  houseCode: 'federlaw',
  title: 'cat',
  status: 'RUNNING',
  startsAt: null,
};

function car(lotId: string): NormalizedCar {
  return {
    lotId,
    lotUrl: `https://x/${lotId}`,
    makeModel: 'm',
    modelYear: 2025,
    dateOnRoad: null,
    mileage: 1000,
    transmission: 'AUTOMATIC',
    hand: 2,
    ownership: 'UNKNOWN',
    tariffPrice: null,
    openingPrice: null,
    imageUrl: null,
    status: 'RUNNING',
  } as NormalizedCar;
}

beforeEach(() => {
  upsertAuction.mockReset().mockResolvedValue({ id: 42 });
  upsertCar.mockReset().mockResolvedValue({ id: 1 });
});

describe('persistCatalog', () => {
  it('upserts the auction once and one car per lot', async () => {
    const res = await persistCatalog(auction, [car('1'), car('2')], logger);
    expect(upsertAuction).toHaveBeenCalledTimes(1);
    expect(upsertCar).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ auctionId: 42, carsUpserted: 2 });
  });

  it('is idempotent: re-running issues identical upsert calls (dedupe is by unique key)', async () => {
    await persistCatalog(auction, [car('1')], logger);
    const firstArgs = upsertCar.mock.calls[0][0];
    await persistCatalog(auction, [car('1')], logger);
    const secondArgs = upsertCar.mock.calls[1][0];
    expect(secondArgs.lotId).toBe(firstArgs.lotId);
    expect(secondArgs.lotUrl).toBe(firstArgs.lotUrl);
    expect(secondArgs.auctionId).toBe(42);
  });
});
