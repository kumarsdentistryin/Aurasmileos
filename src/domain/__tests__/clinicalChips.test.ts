import { describe, expect, it } from 'vitest';
import {
  buildComplaintNarrative,
  buildFindingsNarrative,
  macrosForCondition,
} from '../clinicalChips';
import { applyRxBundle, buildPostCareWhatsAppMessage } from '../rxBundles';

describe('clinicalChips', () => {
  it('builds complaint narrative from pain + duration chips', () => {
    const text = buildComplaintNarrative(['night-pain', 'temp-sens'], '1w', 16);
    expect(text).toContain('nocturnal');
    expect(text).toContain('#16');
    expect(text).toContain('one week');
  });

  it('suggests macros for caries', () => {
    const macros = macrosForCondition('CARIES');
    expect(macros.some((m) => m.id === 'composite')).toBe(true);
    expect(macros.some((m) => m.id === 'ssrct-crown')).toBe(true);
  });

  it('builds findings from chips', () => {
    expect(buildFindingsNarrative(['deep-dentinal'], 36)).toMatch(/#36/);
  });
});

describe('rxBundles', () => {
  it('applies adult pulpitis pack', () => {
    const result = applyRxBundle('adult-pulpitis', []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drugs.length).toBeGreaterThanOrEqual(2);
      expect(result.diagnosis.toLowerCase()).toContain('pulpitis');
    }
  });

  it('builds WhatsApp post-care without requiring typing', () => {
    const result = applyRxBundle('post-extraction', []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const msg = buildPostCareWhatsAppMessage({
      patientFirstName: 'Priya',
      clinicName: 'Aura Smile Dental',
      diagnosis: result.diagnosis,
      drugs: result.drugs,
      advice: result.advice,
    });
    expect(msg).toContain('Priya');
    expect(msg).toContain('Prescription:');
  });

  it('builds Hindi WhatsApp post-care from locale chip', () => {
    const result = applyRxBundle('adult-pulpitis', []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const msg = buildPostCareWhatsAppMessage({
      patientFirstName: 'Rajesh',
      clinicName: 'AuraSmile',
      diagnosis: result.diagnosis,
      drugs: result.drugs,
      advice: result.advice,
      locale: 'hi',
    });
    expect(msg).toContain('नमस्ते');
    expect(msg).toContain('Rajesh');
  });
});
