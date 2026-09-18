import { describe, expect, it } from 'vitest';
import {
  conditionTaxonomyKind,
  isFillingCondition,
  surfacesForConditionApply,
} from '../toothTaxonomy';

describe('toothTaxonomy', () => {
  it('classifies apexo-style state vs treatment', () => {
    expect(conditionTaxonomyKind('CARIES')).toBe('state');
    expect(conditionTaxonomyKind('COMPOSITE')).toBe('treatment');
    expect(conditionTaxonomyKind('EXTRACTION_INDICATED')).toBe('both');
    expect(isFillingCondition('AMALGAM')).toBe(true);
    expect(isFillingCondition('SOUND')).toBe(false);
  });

  it('blocks caries on surfaces already filled', () => {
    expect(
      surfacesForConditionApply('CARIES', ['M', 'O', 'D'], 'COMPOSITE', ['O'])
    ).toEqual(['M', 'D']);
  });

  it('lets filling replace caries surfaces', () => {
    expect(
      surfacesForConditionApply('COMPOSITE', ['O', 'D'], 'CARIES', ['M', 'O', 'D'])
    ).toEqual(['O', 'D']);
  });
});
