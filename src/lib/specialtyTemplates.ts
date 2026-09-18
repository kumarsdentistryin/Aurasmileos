/**
 * Specialty-aware clinical surfaces (blueprint §3 Clinical Case History Templates).
 * Treatments differ doctor × specialty × patient — templates switch with treating dentist.
 */

export type ClinicalSpecialtyKey =
  | 'ENDODONTICS'
  | 'ORAL_SURGERY'
  | 'GENERAL'
  | 'PEDIATRIC'
  | 'OTHER';

export interface SpecialtyProcedureOption {
  id: string;
  label: string;
  typicalFeePaise: number;
  needsConsent: boolean;
}

export function resolveSpecialtyKey(specialtyLabel: string): ClinicalSpecialtyKey {
  const s = specialtyLabel.toLowerCase();
  if (s.includes('endo')) return 'ENDODONTICS';
  if (s.includes('surg') || s.includes('omfs') || s.includes('oral')) return 'ORAL_SURGERY';
  if (s.includes('pedo') || s.includes('paed') || s.includes('pediatric')) return 'PEDIATRIC';
  if (s.includes('general')) return 'GENERAL';
  return 'OTHER';
}

export function specialtyCaseTitle(key: ClinicalSpecialtyKey): string {
  switch (key) {
    case 'ENDODONTICS':
      return 'Endodontic case sheet';
    case 'ORAL_SURGERY':
      return 'Oral surgery case sheet';
    case 'PEDIATRIC':
      return 'Pediatric dentistry case sheet';
    case 'GENERAL':
      return 'General dentistry case sheet';
    default:
      return 'Clinical case sheet';
  }
}

/** Common chairside procedures for this specialty (treatment planning seed). */
export function proceduresForSpecialty(key: ClinicalSpecialtyKey): SpecialtyProcedureOption[] {
  switch (key) {
    case 'ENDODONTICS':
      return [
        { id: 'rct-multi', label: 'Multi-canal RCT', typicalFeePaise: 850000, needsConsent: true },
        { id: 'rct-retreat', label: 'Re-RCT', typicalFeePaise: 1200000, needsConsent: true },
        { id: 'pulpectomy', label: 'Pulpectomy', typicalFeePaise: 450000, needsConsent: true },
        { id: 'apico', label: 'Apicoectomy', typicalFeePaise: 1500000, needsConsent: true },
      ];
    case 'ORAL_SURGERY':
      return [
        { id: 'ext-simple', label: 'Simple extraction', typicalFeePaise: 150000, needsConsent: true },
        { id: 'ext-surgical', label: 'Surgical extraction', typicalFeePaise: 450000, needsConsent: true },
        { id: 'implant-place', label: 'Implant placement', typicalFeePaise: 3500000, needsConsent: true },
        { id: 'biopsy', label: 'Biopsy', typicalFeePaise: 250000, needsConsent: true },
      ];
    case 'PEDIATRIC':
      return [
        { id: 'pedo-ssc', label: 'Stainless steel crown', typicalFeePaise: 350000, needsConsent: true },
        { id: 'pedo-pulp', label: 'Pulpotomy', typicalFeePaise: 300000, needsConsent: true },
        { id: 'pedo-sealant', label: 'Sealant', typicalFeePaise: 80000, needsConsent: false },
        { id: 'pedo-space', label: 'Space maintainer', typicalFeePaise: 500000, needsConsent: true },
      ];
    case 'GENERAL':
    default:
      return [
        { id: 'consult', label: 'Consultation', typicalFeePaise: 50000, needsConsent: false },
        { id: 'restoration', label: 'Composite restoration', typicalFeePaise: 250000, needsConsent: false },
        { id: 'crown-prep', label: 'Crown preparation', typicalFeePaise: 800000, needsConsent: true },
        { id: 'scaling', label: 'Scaling & polishing', typicalFeePaise: 150000, needsConsent: false },
      ];
  }
}
