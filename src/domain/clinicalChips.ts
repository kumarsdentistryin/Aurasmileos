/**
 * Chairside zero-typing chips & treatment macros.
 * Tapping chips builds formal clinical narrative — no paragraph typing.
 */

import { ToothCondition } from './types';

export type ClinicalChip = { id: string; label: string; narrative: string };

export const PAIN_CHIPS: ClinicalChip[] = [
  {
    id: 'night-pain',
    label: 'Severe Night Pain',
    narrative: 'severe nocturnal throbbing pain disturbing sleep',
  },
  {
    id: 'food-impaction',
    label: 'Food Impaction',
    narrative: 'food impaction between teeth / in the cavity',
  },
  {
    id: 'temp-sens',
    label: 'Sensitivity to Cold/Hot',
    narrative: 'sensitivity to cold and hot stimuli',
  },
  {
    id: 'bleed-gums',
    label: 'Bleeding Gums',
    narrative: 'spontaneous gingival bleeding on brushing',
  },
  {
    id: 'broken',
    label: 'Broken Tooth/Restoration',
    narrative: 'fractured tooth or failed restoration with sharp edges',
  },
  {
    id: 'swelling',
    label: 'Swelling / Abscess',
    narrative: 'vestibular swelling suggestive of abscess',
  },
  {
    id: 'mobile',
    label: 'Mobile Tooth',
    narrative: 'increased tooth mobility',
  },
];

export const DURATION_CHIPS: ClinicalChip[] = [
  { id: '1-2d', label: '1-2 Days', narrative: 'for the past 1–2 days' },
  { id: '1w', label: '1 Week', narrative: 'for approximately one week' },
  { id: '1m', label: '1 Month', narrative: 'for about one month' },
  { id: 'intermittent', label: 'Intermittent', narrative: 'with intermittent / recurrent episodes' },
];

export const FINDING_CHIPS: ClinicalChip[] = [
  {
    id: 'deep-dentinal',
    label: 'Deep Dentinal Caries',
    narrative: 'Deep dentinal caries approaching the pulp chamber.',
  },
  {
    id: 'pulp-exp',
    label: 'Pulp Exposure',
    narrative: 'Clinical pulp exposure visible.',
  },
  {
    id: 'mobility-i-ii',
    label: 'Grade I/II Mobility',
    narrative: 'Grade I–II mobility present.',
  },
  {
    id: 'pa-tender',
    label: 'Periapical Tenderness',
    narrative: 'Tenderness on percussion / palpation over the apex.',
  },
  {
    id: 'calculus-recession',
    label: 'Calculus & Gingival Recession',
    narrative: 'Calculus deposits with gingival recession noted.',
  },
];

export const ADVICE_CHIPS: ClinicalChip[] = [
  { id: 'saline', label: 'Warm Saline Rinse', narrative: 'Warm saline rinses starting tomorrow.' },
  { id: 'soft-diet', label: 'Soft Diet', narrative: 'Soft diet; avoid hard chewing on treated side.' },
  { id: 'follow-up', label: 'Follow-up 7d', narrative: 'Review in 7 days or SOS if pain worsens.' },
  { id: 'crown', label: 'Crown Prep Next', narrative: 'Attend scheduled crown preparation visit.' },
];

export function buildComplaintNarrative(
  painIds: string[],
  durationId: string | null,
  toothId?: number
): string {
  const pains = PAIN_CHIPS.filter((c) => painIds.includes(c.id)).map((c) => c.narrative);
  const duration = DURATION_CHIPS.find((c) => c.id === durationId)?.narrative ?? '';
  const site = toothId ? ` in relation to tooth #${toothId}` : '';
  if (pains.length === 0) {
    return duration
      ? `Patient reports dental discomfort${site} ${duration}.`
      : `Patient reports dental discomfort${site}.`;
  }
  const painText = pains.join('; ');
  return `Patient reports ${painText}${site}${duration ? ` ${duration}` : ''}.`;
}

export function buildFindingsNarrative(findingIds: string[], toothId?: number): string {
  const lines = FINDING_CHIPS.filter((c) => findingIds.includes(c.id)).map((c) => c.narrative);
  if (lines.length === 0) {
    return toothId
      ? `Clinical examination of tooth #${toothId} recorded.`
      : 'Clinical examination recorded.';
  }
  const prefix = toothId ? `Tooth #${toothId}: ` : '';
  return `${prefix}${lines.join(' ')}`;
}

export function buildAdviceNarrative(adviceIds: string[]): string {
  const lines = ADVICE_CHIPS.filter((c) => adviceIds.includes(c.id)).map((c) => c.narrative);
  return lines.length ? lines.join(' ') : 'Follow prescribed medication and clinic instructions.';
}

export type TreatmentMacro = {
  id: string;
  label: string;
  diagnosis: string;
  plan: string;
  minutes: number;
  typicalFeePaise: number;
  forConditions: ToothCondition[];
};

export const TREATMENT_MACROS: TreatmentMacro[] = [
  {
    id: 'ssrct-crown',
    label: 'Single-Sitting Rotary RCT + Core Buildup + Zirconia Crown',
    diagnosis: 'Irreversible pulpitis / pulp exposure with restorative need',
    plan: 'Single-sitting rotary RCT + core buildup + monolithic zirconia crown',
    minutes: 90,
    typicalFeePaise: 1800000,
    forConditions: ['CARIES', 'FRACTURE', 'RCT'],
  },
  {
    id: 'composite',
    label: 'Class II Micro-Hybrid Composite Restoration',
    diagnosis: 'Dental caries requiring direct restoration',
    plan: 'Class II micro-hybrid composite restoration under isolation',
    minutes: 30,
    typicalFeePaise: 250000,
    forConditions: ['CARIES', 'FRACTURE'],
  },
  {
    id: 'scaling-curettage',
    label: 'Ultrasonic Scaling + Subgingival Curettage',
    diagnosis: 'Gingivitis / early periodontitis with deposits',
    plan: 'Ultrasonic scaling + subgingival curettage',
    minutes: 45,
    typicalFeePaise: 250000,
    forConditions: ['CARIES', 'COMPOSITE', 'SOUND'],
  },
  {
    id: 'surgical-disimpact',
    label: 'Surgical Disimpaction (Third Molar Extraction)',
    diagnosis: 'Impacted third molar indicated for surgical removal',
    plan: 'Surgical disimpaction of third molar under LA',
    minutes: 60,
    typicalFeePaise: 800000,
    forConditions: ['EXTRACTION_INDICATED', 'SOUND', 'CARIES', 'MISSING'],
  },
  {
    id: 'inlay',
    label: 'Inlay / Onlay',
    diagnosis: 'Extensive caries / cusp involvement',
    plan: 'Indirect ceramic inlay / onlay',
    minutes: 45,
    typicalFeePaise: 800000,
    forConditions: ['CARIES', 'FRACTURE'],
  },
  {
    id: 'extraction',
    label: 'Simple Extraction',
    diagnosis: 'Non-restorable tooth / extraction indicated',
    plan: 'Atraumatic extraction under LA + post-op instructions',
    minutes: 30,
    typicalFeePaise: 200000,
    forConditions: ['EXTRACTION_INDICATED', 'FRACTURE'],
  },
  {
    id: 'crown-only',
    label: 'Zirconia Crown',
    diagnosis: 'Post-endo / heavily restored tooth',
    plan: 'Full-coverage monolithic zirconia crown',
    minutes: 45,
    typicalFeePaise: 1200000,
    forConditions: ['CROWN', 'RCT', 'COMPOSITE'],
  },
];

/** Chairside plan chips always offered on Treatment Plan pad (1-tap bundles). */
export const PLAN_QUICK_BUNDLES: TreatmentMacro[] = [
  TREATMENT_MACROS.find((m) => m.id === 'ssrct-crown')!,
  TREATMENT_MACROS.find((m) => m.id === 'composite')!,
  TREATMENT_MACROS.find((m) => m.id === 'scaling-curettage')!,
  TREATMENT_MACROS.find((m) => m.id === 'surgical-disimpact')!,
];

export function macrosForCondition(condition: ToothCondition): TreatmentMacro[] {
  const matched = TREATMENT_MACROS.filter((m) => m.forConditions.includes(condition));
  if (matched.length) return matched;
  return TREATMENT_MACROS.filter((m) => m.id === 'composite');
}

export function formatMacroLine(macro: TreatmentMacro, toothId: number): string {
  return `${macro.plan} for tooth #${toothId} · ~${macro.minutes} min`;
}
