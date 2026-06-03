import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NormalizedAuction, RawLot } from '@bidspirit/shared';
import { normalizeLot, normalizeLots } from '../src/extract';

const items = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'getItems.sample.json'), 'utf-8'),
) as RawLot[];

const auction: NormalizedAuction = {
  externalId: '75783',
  houseCode: 'federlaw',
  title: 'test catalog',
  status: 'RUNNING',
  startsAt: null,
};

describe('normalizeLot', () => {
  it('parses all Hebrew fields for the first fixture lot', () => {
    const car = normalizeLot(items[0]!, auction);
    expect(car).not.toBeNull();
    expect(car!.lotId).toBe('127106');
    expect(car!.makeModel).toContain('טיגו');
    expect(car!.modelYear).toBe(2025);
    expect(car!.mileage).toBe(27373);
    expect(car!.hand).toBe(2); // "שנייה" → 2 (ordinal word)
    expect(car!.transmission).toBe('AUTOMATIC'); // "אוטומטי"
    expect(car!.ownership).toBe('UNKNOWN'); // "" → UNKNOWN
  });

  it('keeps null prices null (does not coerce to 0)', () => {
    const car = normalizeLot(items[0]!, auction);
    expect(car!.openingPrice).toBeNull(); // startPrice: null
    expect(car!.tariffPrice).toBeNull(); // tariffPrice: null
  });

  it('maps empty dateOnRoad string to null', () => {
    const car = normalizeLot(items[0]!, auction);
    expect(car!.dateOnRoad).toBeNull();
  });

  it('builds a direct lot URL from houseCode/intKey/idInApp', () => {
    const car = normalizeLot(items[0]!, auction);
    expect(car!.lotUrl).toContain('federlaw');
    expect(car!.lotUrl).toContain('75783');
    expect(car!.lotUrl).toContain('127106');
  });

  it('returns null when carInfo is missing', () => {
    expect(normalizeLot({ idInApp: 9 } as RawLot, auction)).toBeNull();
  });

  it('returns null when there is no stable id', () => {
    expect(normalizeLot({ carInfo: { model: 'x' } } as unknown as RawLot, auction)).toBeNull();
  });
});

describe('normalizeLots', () => {
  it('normalizes every car lot in the fixture', () => {
    const cars = normalizeLots(items, auction);
    expect(cars).toHaveLength(3);
    expect(cars.map((c) => c.lotId)).toEqual(['127106', '127107', '127108']);
  });
});
