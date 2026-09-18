import { AdultToothId, DeciduousToothId, ToothId, ToothSurface } from './types';

export const ADULT_TEETH_Q1: AdultToothId[] = [18, 17, 16, 15, 14, 13, 12, 11];
export const ADULT_TEETH_Q2: AdultToothId[] = [21, 22, 23, 24, 25, 26, 27, 28];
export const ADULT_TEETH_Q3: AdultToothId[] = [31, 32, 33, 34, 35, 36, 37, 38];
export const ADULT_TEETH_Q4: AdultToothId[] = [48, 47, 46, 45, 44, 43, 42, 41];

export const ALL_ADULT_TEETH: AdultToothId[] = [
  ...ADULT_TEETH_Q1,
  ...ADULT_TEETH_Q2,
  ...ADULT_TEETH_Q4,
  ...ADULT_TEETH_Q3,
];

export const DECIDUOUS_TEETH_Q5: DeciduousToothId[] = [55, 54, 53, 52, 51];
export const DECIDUOUS_TEETH_Q6: DeciduousToothId[] = [61, 62, 63, 64, 65];
export const DECIDUOUS_TEETH_Q7: DeciduousToothId[] = [71, 72, 73, 74, 75];
export const DECIDUOUS_TEETH_Q8: DeciduousToothId[] = [85, 84, 83, 82, 81];

export const ALL_DECIDUOUS_TEETH: DeciduousToothId[] = [
  ...DECIDUOUS_TEETH_Q5,
  ...DECIDUOUS_TEETH_Q6,
  ...DECIDUOUS_TEETH_Q8,
  ...DECIDUOUS_TEETH_Q7,
];

const VALID_ADULT_SET = new Set<number>(ALL_ADULT_TEETH);
const VALID_DECIDUOUS_SET = new Set<number>(ALL_DECIDUOUS_TEETH);

/**
 * Validates if a given number is a valid FDI adult tooth ID (11..48).
 */
export function isValidAdultTooth(num: number): num is AdultToothId {
  return VALID_ADULT_SET.has(num);
}

/**
 * Validates if a given number is a valid FDI deciduous tooth ID (51..85).
 */
export function isValidDeciduousTooth(num: number): num is DeciduousToothId {
  return VALID_DECIDUOUS_SET.has(num);
}

/**
 * Validates if a given number is a valid FDI 2-digit tooth ID.
 */
export function isValidFdiTooth(num: number): num is ToothId {
  return isValidAdultTooth(num) || isValidDeciduousTooth(num);
}

/**
 * Checks if tooth is an anterior tooth (Incisor or Canine).
 * Anterior teeth possess an Incisal (I) edge, never an Occlusal (O) surface.
 */
export function isAnteriorTooth(toothId: ToothId): boolean {
  const toothIndex = toothId % 10;
  return toothIndex >= 1 && toothIndex <= 3;
}

/**
 * Checks if tooth is posterior (Premolar or Molar).
 * Posterior teeth possess an Occlusal (O) table, never an Incisal (I) edge.
 */
export function isPosteriorTooth(toothId: ToothId): boolean {
  const toothIndex = toothId % 10;
  return toothIndex >= 4 && toothIndex <= 8;
}

/**
 * Checks if tooth belongs to the upper Maxillary arch.
 */
export function isMaxillaryArch(toothId: ToothId): boolean {
  const quadrant = Math.floor(toothId / 10);
  return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
}

/**
 * Checks if tooth belongs to the lower Mandibular arch.
 */
export function isMandibularArch(toothId: ToothId): boolean {
  const quadrant = Math.floor(toothId / 10);
  return quadrant === 3 || quadrant === 4 || quadrant === 7 || quadrant === 8;
}

/**
 * Returns permissible anatomical surfaces for a tooth according to USAF Layer 1 rules.
 */
export function getValidSurfacesForTooth(toothId: ToothId): ToothSurface[] {
  if (!isValidFdiTooth(toothId)) {
    throw new Error(`Invalid FDI tooth identifier: ${toothId}`);
  }

  // Anterior teeth: Mesial, Distal, Buccal/Labial, Lingual/Palatal, Incisal
  if (isAnteriorTooth(toothId)) {
    return ['M', 'I', 'D', 'B', 'L'];
  }

  // Posterior teeth: Mesial, Distal, Buccal, Lingual/Palatal, Occlusal
  return ['M', 'O', 'D', 'B', 'L'];
}

/**
 * Validates that an array of surfaces does not violate anatomical invariants.
 */
export function validateSurfaces(toothId: ToothId, surfaces: ToothSurface[]): { valid: boolean; error?: string } {
  const validSurfaces = new Set(getValidSurfacesForTooth(toothId));
  for (const s of surfaces) {
    if (!validSurfaces.has(s)) {
      if (s === 'O' && isAnteriorTooth(toothId)) {
        return {
          valid: false,
          error: `Anterior tooth ${toothId} cannot have an Occlusal ('O') surface. Use Incisal ('I').`,
        };
      }
      if (s === 'I' && isPosteriorTooth(toothId)) {
        return {
          valid: false,
          error: `Posterior tooth ${toothId} cannot have an Incisal ('I') edge. Use Occlusal ('O').`,
        };
      }
      return {
        valid: false,
        error: `Surface '${s}' is not valid for tooth ${toothId}.`,
      };
    }
  }
  return { valid: true };
}

/**
 * Numbering systems for display labels only — storage remains FDI (ISO 3950).
 * Pattern from dental-charting-odontogram `utils/numbering.ts`.
 */
export type ToothNumberingSystem = 'FDI' | 'UNIVERSAL' | 'PALMER';

/**
 * When a permanent grid slot is marked deciduous (Pedo), remap FDI quadrant
 * 1→5, 2→6, 3→7, 4→8 while keeping tooth index (e.g. 16 → 56).
 * Wisdom slots (x6–x8) are invalid for milk teeth — returns null.
 */
export function adultSlotToDeciduousFdi(adultSlot: number): DeciduousToothId | null {
  if (!isValidAdultTooth(adultSlot)) return null;
  const position = adultSlot % 10;
  if (position < 1 || position > 5) return null;
  const adultQuad = Math.floor(adultSlot / 10);
  const deciduousQuad = adultQuad + 4;
  const candidate = deciduousQuad * 10 + position;
  return isValidDeciduousTooth(candidate) ? candidate : null;
}

/**
 * Display label for an FDI id under FDI / Universal / Palmer.
 * AuraSmile keeps ToothId storage as FDI; convert only for UI/export.
 */
export function toNumberingLabel(toothId: ToothId, system: ToothNumberingSystem = 'FDI'): string {
  if (system === 'FDI') return String(toothId);

  const quadrant = Math.floor(toothId / 10);
  const position = toothId % 10;

  if (system === 'UNIVERSAL') {
    if (isValidDeciduousTooth(toothId)) {
      if (quadrant === 5) return String.fromCharCode(65 + (5 - position));
      if (quadrant === 6) return String.fromCharCode(70 + (position - 1));
      if (quadrant === 7) return String.fromCharCode(75 + (5 - position));
      if (quadrant === 8) return String.fromCharCode(80 + (position - 1));
    }
    if (quadrant === 1) return String(9 - position);
    if (quadrant === 2) return String(8 + position);
    if (quadrant === 3) return String(25 - position);
    if (quadrant === 4) return String(24 + position);
  }

  if (system === 'PALMER') {
    const quadLabel =
      quadrant === 1 || quadrant === 5
        ? 'UR'
        : quadrant === 2 || quadrant === 6
          ? 'UL'
          : quadrant === 3 || quadrant === 7
            ? 'LL'
            : quadrant === 4 || quadrant === 8
              ? 'LR'
              : '';
    if (!quadLabel) return String(toothId);
    if (isValidDeciduousTooth(toothId)) {
      return `${quadLabel}-${String.fromCharCode(65 + (position - 1))}`;
    }
    return `${quadLabel}-${position}`;
  }

  return String(toothId);
}

/**
 * Comprehensive anatomical name for any FDI tooth.
 */
export function getAnatomicalToothName(toothId: ToothId): string {
  const quadrant = Math.floor(toothId / 10);
  const position = toothId % 10;

  const quadrantNames: Record<number, string> = {
    1: 'Maxillary Right',
    2: 'Maxillary Left',
    3: 'Mandibular Left',
    4: 'Mandibular Right',
    5: 'Deciduous Maxillary Right',
    6: 'Deciduous Maxillary Left',
    7: 'Deciduous Mandibular Left',
    8: 'Deciduous Mandibular Right',
  };

  const adultToothTypes: Record<number, string> = {
    1: 'Central Incisor',
    2: 'Lateral Incisor',
    3: 'Canine',
    4: 'First Premolar',
    5: 'Second Premolar',
    6: 'First Molar',
    7: 'Second Molar',
    8: 'Third Molar (Wisdom Tooth)',
  };

  const deciduousToothTypes: Record<number, string> = {
    1: 'Central Incisor',
    2: 'Lateral Incisor',
    3: 'Canine',
    4: 'First Molar',
    5: 'Second Molar',
  };

  const quad = quadrantNames[quadrant] || `Quadrant ${quadrant}`;
  const isPedo = quadrant >= 5 && quadrant <= 8;
  const toothType = isPedo
    ? (deciduousToothTypes[position] || `Tooth ${position}`)
    : (adultToothTypes[position] || `Tooth ${position}`);

  return `${quad} ${toothType} (#${toothId})`;
}
