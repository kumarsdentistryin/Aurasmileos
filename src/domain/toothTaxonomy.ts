/**
 * Apexo-inspired tooth condition taxonomy: state vs treatment vs both.
 * Additive metadata — does not change stored ToothCondition values.
 */
import { ToothCondition } from './types';

export type ConditionTaxonomyKind = 'state' | 'treatment' | 'both';

export const TOOTH_CONDITION_TAXONOMY: Record<ToothCondition, ConditionTaxonomyKind> = {
  SOUND: 'state',
  CARIES: 'state',
  FRACTURE: 'state',
  MISSING: 'state',
  EXTRACTION_INDICATED: 'both',
  COMPOSITE: 'treatment',
  AMALGAM: 'treatment',
  CROWN: 'treatment',
  RCT: 'treatment',
  IMPLANT: 'treatment',
};

export function conditionTaxonomyKind(condition: ToothCondition): ConditionTaxonomyKind {
  return TOOTH_CONDITION_TAXONOMY[condition];
}

export function isFillingCondition(condition: ToothCondition): boolean {
  return condition === 'COMPOSITE' || condition === 'AMALGAM';
}

/**
 * When applying a filling treatment, overlapping caries surfaces should clear.
 * Returns the surfaces to keep on the tooth for the new condition.
 */
export function surfacesForConditionApply(
  condition: ToothCondition,
  requestedSurfaces: string[],
  priorCondition: ToothCondition,
  priorSurfaces: string[]
): string[] {
  if (isFillingCondition(condition) && priorCondition === 'CARIES') {
    // Filling replaces caries on those surfaces — keep requested only
    return requestedSurfaces;
  }
  if (condition === 'CARIES' && isFillingCondition(priorCondition)) {
    const filled = new Set(priorSurfaces.map((s) => s.toUpperCase()));
    return requestedSurfaces.filter((s) => !filled.has(s.toUpperCase()));
  }
  return requestedSurfaces;
}
