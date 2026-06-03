import {
  AuctionStatus,
  NotificationChannel,
  NotificationStatus,
  Ownership,
  ScrapeStatus,
  Transmission,
  disconnect,
  getActiveFilter,
  findCars,
  prisma,
} from './index';

/**
 * DB-free smoke test: verifies the package re-exports the Prisma enum runtime
 * values and repository functions without opening a connection.
 */
describe('@bidspirit/database exports', () => {
  it('re-exports Transmission enum values', () => {
    expect(Transmission.AUTOMATIC).toBe('AUTOMATIC');
    expect(Transmission.MANUAL).toBe('MANUAL');
    expect(Transmission.ROBOTIC).toBe('ROBOTIC');
    expect(Transmission.UNKNOWN).toBe('UNKNOWN');
  });

  it('re-exports Ownership enum values', () => {
    expect(Ownership.PRIVATE).toBe('PRIVATE');
    expect(Ownership.COMPANY).toBe('COMPANY');
    expect(Ownership.LEASING).toBe('LEASING');
    expect(Ownership.RENTAL).toBe('RENTAL');
    expect(Ownership.GOV).toBe('GOV');
    expect(Ownership.UNKNOWN).toBe('UNKNOWN');
  });

  it('re-exports the remaining domain enums', () => {
    expect(Object.values(AuctionStatus)).toContain('RUNNING');
    expect(AuctionStatus.ENDED).toBe('ENDED');
    expect(Object.values(ScrapeStatus)).toContain('RUNNING');
    expect(NotificationChannel.TELEGRAM).toBe('TELEGRAM');
    expect(NotificationChannel.EMAIL).toBe('EMAIL');
    expect(NotificationStatus.SENT).toBe('SENT');
  });

  it('exposes repository functions and the prisma client', () => {
    expect(typeof getActiveFilter).toBe('function');
    expect(typeof findCars).toBe('function');
    expect(typeof disconnect).toBe('function');
    expect(prisma).toBeDefined();
  });
});
