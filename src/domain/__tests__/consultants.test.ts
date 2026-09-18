import { describe, expect, it } from 'vitest';
import { calculateConsultantPayout, isValidPanNumber } from '../consultants';

describe('consultant Section 194J payouts', () => {
  it('applies 60% share and 10% TDS in paise', () => {
    const calc = calculateConsultantPayout(1000000, 60, true);
    expect(calc.grossPayoutPaise).toBe(600000);
    expect(calc.tdsWithholdingPaise).toBe(60000);
    expect(calc.netPayablePaise).toBe(540000);
  });

  it('can skip TDS when disabled', () => {
    const calc = calculateConsultantPayout(1000000, 40, false);
    expect(calc.tdsWithholdingPaise).toBe(0);
    expect(calc.netPayablePaise).toBe(400000);
  });

  it('clamps share percentage to 0–100', () => {
    expect(calculateConsultantPayout(100000, 150, false).grossPayoutPaise).toBe(100000);
  });

  it('validates Indian PAN format', () => {
    expect(isValidPanNumber('AABCV1234F')).toBe(true);
    expect(isValidPanNumber('bad')).toBe(false);
  });

  it('rejects negative gross fee', () => {
    expect(() => calculateConsultantPayout(-10, 40)).toThrow(/negative/i);
  });
});
