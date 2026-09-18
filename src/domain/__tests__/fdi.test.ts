import { describe, expect, it } from 'vitest';
import {
  adultSlotToDeciduousFdi,
  getValidSurfacesForTooth,
  isAnteriorTooth,
  isPosteriorTooth,
  isValidFdiTooth,
  toNumberingLabel,
  validateSurfaces,
} from '../fdi';

describe('FDI tooth invariants', () => {
  it('accepts adult and deciduous FDI IDs', () => {
    expect(isValidFdiTooth(16)).toBe(true);
    expect(isValidFdiTooth(51)).toBe(true);
    expect(isValidFdiTooth(99)).toBe(false);
  });

  it('classifies anterior vs posterior', () => {
    expect(isAnteriorTooth(11)).toBe(true);
    expect(isPosteriorTooth(16)).toBe(true);
  });

  it('rejects occlusal on anterior teeth', () => {
    const check = validateSurfaces(11, ['O']);
    expect(check.valid).toBe(false);
  });

  it('allows occlusal on molars', () => {
    expect(validateSurfaces(16, ['M', 'O', 'D']).valid).toBe(true);
  });

  it('returns incisal surfaces for anteriors', () => {
    expect(getValidSurfacesForTooth(21)).toContain('I');
    expect(getValidSurfacesForTooth(21)).not.toContain('O');
  });

  it('remaps adult Pedo slots to deciduous FDI', () => {
    expect(adultSlotToDeciduousFdi(14)).toBe(54);
    expect(adultSlotToDeciduousFdi(21)).toBe(61);
    expect(adultSlotToDeciduousFdi(16)).toBeNull();
  });

  it('formats Universal and Palmer display labels', () => {
    expect(toNumberingLabel(16, 'FDI')).toBe('16');
    expect(toNumberingLabel(16, 'UNIVERSAL')).toBe('3');
    expect(toNumberingLabel(16, 'PALMER')).toBe('UR-6');
    expect(toNumberingLabel(51, 'UNIVERSAL')).toBe('E'); // primary UR central
    expect(toNumberingLabel(55, 'UNIVERSAL')).toBe('A'); // primary UR second molar
  });
});
