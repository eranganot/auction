import request from 'supertest';
import { createApp } from '../src/app';
import type { Store } from '../src/store';

function baseStore(over: Partial<Store> = {}): Store {
  return {
    getActiveFilter: jest.fn(),
    updateActiveFilter: jest.fn(),
    findCars: jest.fn(),
    getLatestRun: jest.fn(),
    listRecentRuns: jest.fn(),
    countNotifications: jest.fn(),
    countCars: jest.fn(),
    listRecentChanges: jest.fn().mockResolvedValue([]),
    savePushSubscription: jest.fn().mockResolvedValue({}),
    listPushSubscriptions: jest.fn().mockResolvedValue([]),
    countPushSubscriptions: jest.fn().mockResolvedValue(0),
    ...over,
  } as unknown as Store;
}

describe('GET /api/changes', () => {
  it('returns recent changes serialized', async () => {
    const store = baseStore({
      listRecentChanges: jest.fn().mockResolvedValue([
        {
          id: 1,
          type: 'NEW',
          makeModel: 'טויוטה',
          lotUrl: 'https://x/1',
          reason: null,
          detectedAt: new Date('2026-06-14T06:00:00Z'),
        },
        {
          id: 2,
          type: 'REMOVED',
          makeModel: 'קיה',
          lotUrl: 'https://x/2',
          reason: 'AUCTION_ENDED',
          detectedAt: new Date('2026-06-14T06:00:00Z'),
        },
      ]),
    });
    const res = await request(createApp({ store })).get('/api/changes');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.changes[0]).toMatchObject({ type: 'NEW', makeModel: 'טויוטה' });
    expect(res.body.changes[1]).toMatchObject({ type: 'REMOVED', reason: 'AUCTION_ENDED' });
  });

  it('clamps the limit', async () => {
    const listRecentChanges = jest.fn().mockResolvedValue([]);
    const res = await request(createApp({ store: baseStore({ listRecentChanges }) })).get(
      '/api/changes?limit=99999',
    );
    expect(res.status).toBe(200);
    expect(listRecentChanges).toHaveBeenCalledWith(500);
  });
});

describe('push endpoints', () => {
  it('reports disabled when no VAPID key', async () => {
    const res = await request(createApp({ store: baseStore() })).get('/api/push/vapid');
    expect(res.body).toEqual({ enabled: false, publicKey: null, subscribers: 0 });
  });

  it('exposes the VAPID public key when configured', async () => {
    const res = await request(createApp({ store: baseStore(), vapidPublicKey: 'PUBKEY' })).get(
      '/api/push/vapid',
    );
    expect(res.body).toEqual({ enabled: true, publicKey: 'PUBKEY', subscribers: 0 });
  });

  it('rejects an invalid subscription', async () => {
    const res = await request(createApp({ store: baseStore() }))
      .post('/api/push/subscribe')
      .send({ endpoint: 'https://push/x' }); // missing keys
    expect(res.status).toBe(400);
  });

  it('saves a valid subscription', async () => {
    const savePushSubscription = jest.fn().mockResolvedValue({});
    const res = await request(createApp({ store: baseStore({ savePushSubscription }) }))
      .post('/api/push/subscribe')
      .send({ endpoint: 'https://push/x', keys: { p256dh: 'p', auth: 'a' } });
    expect(res.status).toBe(201);
    expect(savePushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push/x', p256dh: 'p', auth: 'a' }),
    );
  });
});
