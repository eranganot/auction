import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterLiveCarAuctions, mapAuctionStatus } from '../src/discovery';

const home = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'getHomePageData.sample.json'), 'utf-8'),
) as Parameters<typeof filterLiveCarAuctions>[0];

describe('mapAuctionStatus', () => {
  it('maps known states (case-insensitive)', () => {
    expect(mapAuctionStatus('RUNNING')).toBe('RUNNING');
    expect(mapAuctionStatus('ready')).toBe('READY');
    expect(mapAuctionStatus('Pending')).toBe('PENDING');
    expect(mapAuctionStatus('ENDED')).toBe('ENDED');
  });
  it('falls back to UNKNOWN for anything else', () => {
    expect(mapAuctionStatus('weird')).toBe('UNKNOWN');
    expect(mapAuctionStatus(null)).toBe('UNKNOWN');
    expect(mapAuctionStatus(undefined)).toBe('UNKNOWN');
  });
});

describe('filterLiveCarAuctions (archive filter)', () => {
  const result = filterLiveCarAuctions(home);

  it('keeps only UPCOMING CARS catalogs and drops ENDED + non-CARS', () => {
    expect(result).toHaveLength(6);
    expect(result.every((a) => a.externalId !== '')).toBe(true);
  });

  it('never includes the MACHINES catalog (76492)', () => {
    expect(result.find((a) => a.externalId === '76492')).toBeUndefined();
  });

  it('never includes ENDED-bucket catalogs (76344, 76232)', () => {
    expect(result.find((a) => a.externalId === '76344')).toBeUndefined();
    expect(result.find((a) => a.externalId === '76232')).toBeUndefined();
  });

  it('normalizes id/title/houseCode/status', () => {
    const running = result.find((a) => a.externalId === '75783');
    expect(running).toBeDefined();
    expect(running?.houseCode).toBe('federlaw');
    expect(running?.status).toBe('RUNNING');
    expect(running?.title).toContain('פדר');
  });

  it('drops hidden catalogs', () => {
    const hidden = filterLiveCarAuctions({
      auctionsLists: {
        UPCOMING: [
          { intKey: 1, contentType: 'CARS', hidden: true, name: 'x', state: 'READY' },
          { intKey: 2, contentType: 'CARS', hidden: false, name: 'y', state: 'READY' },
        ],
      },
    });
    expect(hidden).toHaveLength(1);
    expect(hidden[0]!.externalId).toBe('2');
  });
});
