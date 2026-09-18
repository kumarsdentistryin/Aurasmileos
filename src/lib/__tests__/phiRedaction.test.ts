import { describe, expect, it } from 'vitest';
import { looksLikeRawPhi, redactPhiForLlm } from '../phiRedaction';

describe('phiRedaction', () => {
  it('redacts phone, email, and MRN', () => {
    const raw =
      'Call patient: Priya Sharma at +91 98450 99887 or asha@clinic.in — MRN AS-BLR-0492';
    const { text, redactedCount, map } = redactPhiForLlm(raw);
    expect(redactedCount).toBeGreaterThanOrEqual(3);
    expect(text).not.toMatch(/98450/);
    expect(text).not.toMatch(/asha@clinic/);
    expect(text).not.toMatch(/AS-BLR-0492/);
    expect(Object.keys(map).length).toBe(redactedCount);
  });

  it('leaves clinical chart language intact', () => {
    const raw = 'Tooth 16 distal caries; WL MB1 21.5 mm';
    const { text, redactedCount } = redactPhiForLlm(raw);
    expect(redactedCount).toBe(0);
    expect(text).toBe(raw);
  });

  it('detects remaining raw PHI', () => {
    expect(looksLikeRawPhi('no secrets here')).toBe(false);
    expect(looksLikeRawPhi('email me at desk@aurasmile.in')).toBe(true);
  });
});
