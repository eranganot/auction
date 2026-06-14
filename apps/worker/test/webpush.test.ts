import { WebPushNotifier } from '../src/webpush';
import type { DigestPayload } from '@bidspirit/shared';

// web-push is imported by the notifier; setVapidDetails must accept our fake keys.
const digest = (over: Partial<DigestPayload> = {}): DigestPayload => ({
  added: [
    {
      makeModel: 'טויוטה',
      modelYear: 2024,
      mileage: 1000,
      hand: 1,
      transmission: 'AUTOMATIC',
      ownership: 'PRIVATE',
      openingPrice: null,
      tariffPrice: null,
      lotUrl: 'https://x/1',
      auctionTitle: 'cat',
    },
  ],
  removed: [],
  totalMatches: 1,
  ...over,
});

// A valid-looking VAPID keypair shape (these are real test vectors from web-push docs format).
const KEYS = {
  publicKey:
    'BKoaIohCMoXPrM1Zp2b4k1P62WQpuSYmXxuOiAtcQyEQFsrzshaAMrV0jqC_rb9ioIq-avfxLTtE5Vuy3cOqAkg',
  privateKey: 'OPkiqPVUPGCxjUpNPVEHAgztqmB1JG4GvHuc9GokiW0',
};

describe('WebPushNotifier', () => {
  it('is disabled without VAPID keys', async () => {
    const n = new WebPushNotifier({
      publicKey: undefined,
      privateKey: undefined,
      subject: 'mailto:a@b.c',
      loadSubscriptions: async () => [],
      onExpired: async () => {},
    });
    expect(n.isEnabled()).toBe(false);
    const r = await n.notifyDigest(digest());
    expect(r.skipped).toBe(true);
  });

  it('skips when there are no subscribers', async () => {
    const n = new WebPushNotifier({
      ...KEYS,
      subject: 'mailto:a@b.c',
      loadSubscriptions: async () => [],
      onExpired: async () => {},
      sendImpl: async () => ({}),
    });
    const r = await n.notifyDigest(digest());
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });

  it('sends to each subscriber and prunes 410-gone endpoints', async () => {
    const expired: string[] = [];
    const sent: string[] = [];
    const n = new WebPushNotifier({
      ...KEYS,
      subject: 'mailto:a@b.c',
      loadSubscriptions: async () => [
        { endpoint: 'https://push/ok', p256dh: 'k', auth: 'a' },
        { endpoint: 'https://push/gone', p256dh: 'k', auth: 'a' },
      ],
      onExpired: async (e) => {
        expired.push(e);
      },
      sendImpl: async (sub) => {
        if (sub.endpoint.endsWith('/gone')) {
          const err = new Error('gone') as Error & { statusCode: number };
          err.statusCode = 410;
          throw err;
        }
        sent.push(sub.endpoint);
        return {};
      },
    });
    const r = await n.notifyDigest(digest());
    expect(sent).toEqual(['https://push/ok']);
    expect(expired).toEqual(['https://push/gone']);
    expect(r.ok).toBe(true);
    expect(r.detail).toContain('1/2');
  });

  it('skips when digest is empty', async () => {
    const n = new WebPushNotifier({
      ...KEYS,
      subject: 'mailto:a@b.c',
      loadSubscriptions: async () => [{ endpoint: 'e', p256dh: 'k', auth: 'a' }],
      onExpired: async () => {},
      sendImpl: async () => ({}),
    });
    const r = await n.notifyDigest({ added: [], removed: [], totalMatches: 0 });
    expect(r.skipped).toBe(true);
  });
});
