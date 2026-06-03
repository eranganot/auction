import { Ownership, Transmission } from '@bidspirit/database';
import {
  mapHand,
  mapOwnership,
  mapTransmission,
  ownershipLabelHe,
  transmissionLabelHe,
} from './enums';

describe('mapTransmission', () => {
  it('maps automatic variants', () => {
    expect(mapTransmission('אוטומטי')).toBe(Transmission.AUTOMATIC);
    expect(mapTransmission('אוטומטית')).toBe(Transmission.AUTOMATIC);
    expect(mapTransmission('אוטומט')).toBe(Transmission.AUTOMATIC);
  });
  it('maps manual variants', () => {
    expect(mapTransmission('ידני')).toBe(Transmission.MANUAL);
    expect(mapTransmission('ידנית')).toBe(Transmission.MANUAL);
  });
  it('prefers robotic over automatic in compound strings', () => {
    expect(mapTransmission('רובוטי')).toBe(Transmission.ROBOTIC);
    expect(mapTransmission('אוטומט-רובוטי')).toBe(Transmission.ROBOTIC);
    expect(mapTransmission('אוטומטית רובוטית')).toBe(Transmission.ROBOTIC);
  });
  it('strips hidden chars before matching', () => {
    expect(mapTransmission('‏אוטומטי‎')).toBe(Transmission.AUTOMATIC);
  });
  it('falls back to UNKNOWN', () => {
    expect(mapTransmission('')).toBe(Transmission.UNKNOWN);
    expect(mapTransmission('משהו אחר')).toBe(Transmission.UNKNOWN);
    expect(mapTransmission(null)).toBe(Transmission.UNKNOWN);
  });
});

describe('mapOwnership', () => {
  it('maps private (masculine source form)', () => {
    expect(mapOwnership('פרטי')).toBe(Ownership.PRIVATE);
    expect(mapOwnership('פרטית')).toBe(Ownership.PRIVATE);
  });
  it('maps company / leasing / rental / gov', () => {
    expect(mapOwnership('חברה')).toBe(Ownership.COMPANY);
    expect(mapOwnership('ליסינג')).toBe(Ownership.LEASING);
    expect(mapOwnership('השכרה')).toBe(Ownership.RENTAL);
    expect(mapOwnership('ממשלתי')).toBe(Ownership.GOV);
    expect(mapOwnership('מדינה')).toBe(Ownership.GOV);
  });
  it('falls back to UNKNOWN', () => {
    expect(mapOwnership('')).toBe(Ownership.UNKNOWN);
    expect(mapOwnership('???')).toBe(Ownership.UNKNOWN);
  });
});

describe('mapHand', () => {
  it('maps Hebrew ordinal words', () => {
    expect(mapHand('ראשונה')).toBe(1);
    expect(mapHand('שנייה')).toBe(2);
    expect(mapHand('שניה')).toBe(2);
    expect(mapHand('שלישית')).toBe(3);
    expect(mapHand('רביעית')).toBe(4);
    expect(mapHand('חמישית')).toBe(5);
  });
  it('maps an ordinal inside a longer phrase', () => {
    expect(mapHand('יד שנייה')).toBe(2);
  });
  it('falls back to a bare digit', () => {
    expect(mapHand('2')).toBe(2);
    expect(mapHand('יד 3')).toBe(3);
  });
  it('strips hidden chars', () => {
    expect(mapHand('‏ראשונה')).toBe(1);
  });
  it('returns null for absent/unknown', () => {
    expect(mapHand('')).toBeNull();
    expect(mapHand(null)).toBeNull();
    expect(mapHand('לא ידוע')).toBeNull();
  });
});

describe('label helpers', () => {
  it('returns Hebrew transmission labels', () => {
    expect(transmissionLabelHe(Transmission.AUTOMATIC)).toBe('אוטומטי');
    expect(transmissionLabelHe(Transmission.MANUAL)).toBe('ידני');
    expect(transmissionLabelHe(Transmission.ROBOTIC)).toBe('רובוטי');
    expect(transmissionLabelHe(Transmission.UNKNOWN)).toBe('לא ידוע');
  });
  it('returns Hebrew ownership labels', () => {
    expect(ownershipLabelHe(Ownership.PRIVATE)).toBe('פרטי');
    expect(ownershipLabelHe(Ownership.COMPANY)).toBe('חברה');
    expect(ownershipLabelHe(Ownership.LEASING)).toBe('ליסינג');
    expect(ownershipLabelHe(Ownership.RENTAL)).toBe('השכרה');
    expect(ownershipLabelHe(Ownership.GOV)).toBe('ממשלתי');
    expect(ownershipLabelHe(Ownership.UNKNOWN)).toBe('לא ידוע');
  });
});
