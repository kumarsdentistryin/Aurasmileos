import { describe, expect, it } from 'vitest';
import {
  defaultLabDueDateIso,
  guessRestorationFromPlanLabel,
  isLabEligiblePlanLine,
} from '../lab';

describe('lab slip helpers', () => {
  it('flags crown / aligner / denture plan lines as lab-eligible', () => {
    expect(
      isLabEligiblePlanLine({
        procedureId: 'ssrct-crown',
        procedureLabel: 'Single-Sitting Rotary RCT + Core Buildup + Zirconia Crown',
      })
    ).toBe(true);
    expect(
      isLabEligiblePlanLine({
        procedureId: 'aligners',
        procedureLabel: 'Clear Aligners',
      })
    ).toBe(true);
    expect(
      isLabEligiblePlanLine({
        procedureId: 'composite',
        procedureLabel: 'Class II Micro-Hybrid Composite Restoration',
      })
    ).toBe(false);
  });

  it('guesses restoration material from plan label', () => {
    expect(guessRestorationFromPlanLabel('Zirconia Crown #16')).toBe('ZIRCONIA_MONOLITHIC');
    expect(guessRestorationFromPlanLabel('Acrylic Denture')).toBe('ACRYLIC_DENTURE');
    expect(guessRestorationFromPlanLabel('Clear Aligners stage 2')).toBe('CLEAR_ALIGNER');
  });

  it('returns ISO due date string', () => {
    expect(defaultLabDueDateIso(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
