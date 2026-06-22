import request from 'supertest';
import express from 'express';
import { pushRouter } from '../src/routes/push';
import type { Store } from '../src/store';

function store(over: Partial<Store> = {}): Store {
  return {
    savePushSubscription: jest.fn().mockResolvedValue({}),
    listPushSubscriptions: jest.fn().mockResolvedValue([
      { endpoint: 'https://push/a', p256dh: 'p', auth: 'a' },
      { endpoint: 'https://push/gone', p256dh: 'p', auth: 'a' },
    ]),
    countPushSubscriptions: jest.fn().mockResolvedValue(2),
    deletePushSubscription: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as Store;
}

function app(router: express.Router) {
  const a = express();
  a.use(express.json());
  a.use('/api/push', router);
  return a;
}

describe('POST /api/push/test', () => {
  it('returns 400 when web push is not configured', async () => {
    const res = await request(app(pushRouter(store()))).post('/api/push/test');
    expect(res.status).toBe(400);
  });

  it('sends to all subscribers and prunes 410-gone endpoints', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const sent: string[] = [];
    const sendImpl = jest.fn(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith('/gone')) {
        const e = new Error('gone') as Error & { statusCode: number };
        e.statusCode = 410;
        throw e;
      }
      sent.push(sub.endpoint);
      return {};
    });
    const res = await request(
      app(pushRouter(store({ deletePushSubscription: del }), { sendImpl })),
    ).post('/api/push/test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subscribers: 2, sent: 1, failed: 1 });
    expect(res.body.errors).toHaveLength(1);
    expect(sent).toEqual(['https://push/a']);
    expect(del).toHaveBeenCalledWith('https://push/gone');
  });
});
