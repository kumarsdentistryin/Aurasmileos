import { MedicalAlert, ToothId } from './types';

export type DrugForm = 'TABLET' | 'CAPSULE' | 'SYRUP' | 'MOUTHWASH' | 'GEL';
export type DoseFrequency = 'TDS' | 'BD' | 'OD' | 'SOS' | 'QID';
export type DoseTiming = 'AFTER_FOOD' | 'BEFORE_FOOD' | 'WITH_FOOD';

export interface PrescribedDrug {
  id: string;
  brandName: string;
  genericName: string;
  drugClass:
    | 'PENICILLIN'
    | 'CEPHALOSPORIN'
    | 'MACROLIDE'
    | 'LINCOSAMIDE'
    | 'NSAID'
    | 'ANALGESIC'
    | 'NITROIMIDAZOLE'
    | 'ANTISEPTIC'
    | 'PPI'
    | 'CORTICOSTEROID'
    | 'ANTIFUNGAL'
    | 'HEMOSTATIC'
    | 'OTHER';
  strength: string;
  form: DrugForm;
  frequency: DoseFrequency;
  timing: DoseTiming;
  durationDays: number;
  instructions: string;
}

export interface DentalPrescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'M' | 'F' | 'OTHER';
  doctorName: string;
  doctorRegistrationNumber: string;
  clinicName: string;
  date: string; // YYYY-MM-DD
  provisionalDiagnosis: string;
  targetToothId?: ToothId;
  drugs: PrescribedDrug[];
  clinicalAdvice: string;
  isAllergyWarningOverridden?: boolean;
}

export const INDIAN_DENTAL_DRUG_MASTER: Omit<PrescribedDrug, 'id' | 'durationDays'>[] = [
  // ——— Antibiotics ———
  {
    brandName: 'Augmentin 625',
    genericName: 'Amoxicillin (500mg) + Potassium Clavulanate (125mg)',
    drugClass: 'PENICILLIN',
    strength: '625 mg',
    form: 'TABLET',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Complete full 5-day course. Take after food to prevent gastric discomfort.',
  },
  {
    brandName: 'Moxikind-CV 625',
    genericName: 'Amoxicillin (500mg) + Potassium Clavulanate (125mg)',
    drugClass: 'PENICILLIN',
    strength: '625 mg',
    form: 'TABLET',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Broad-spectrum antibiotic for odontogenic infections.',
  },
  {
    brandName: 'Amoxil 500',
    genericName: 'Amoxicillin',
    drugClass: 'PENICILLIN',
    strength: '500 mg',
    form: 'CAPSULE',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Standard odontogenic infection cover for 5 days.',
  },
  {
    brandName: 'Sporidex 500',
    genericName: 'Cephalexin',
    drugClass: 'CEPHALOSPORIN',
    strength: '500 mg',
    form: 'CAPSULE',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Alternative beta-lactam. Avoid if severe penicillin allergy.',
  },
  {
    brandName: 'Dalacin C 300 (Clindamycin)',
    genericName: 'Clindamycin Hydrochloride',
    drugClass: 'LINCOSAMIDE',
    strength: '300 mg',
    form: 'CAPSULE',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Preferred gold-standard antibiotic for Penicillin-allergic patients with bone penetration.',
  },
  {
    brandName: 'Azee 500 (Azithromycin)',
    genericName: 'Azithromycin',
    drugClass: 'MACROLIDE',
    strength: '500 mg',
    form: 'TABLET',
    frequency: 'OD',
    timing: 'BEFORE_FOOD',
    instructions: '1 tablet once daily 1 hour before food for 3 days (Penicillin-safe alternative).',
  },
  {
    brandName: 'Althrocin 500',
    genericName: 'Erythromycin Stearate',
    drugClass: 'MACROLIDE',
    strength: '500 mg',
    form: 'TABLET',
    frequency: 'QID',
    timing: 'BEFORE_FOOD',
    instructions: 'Macrolide alternative when azithromycin unavailable.',
  },
  {
    brandName: 'Metrogyl 400',
    genericName: 'Metronidazole',
    drugClass: 'NITROIMIDAZOLE',
    strength: '400 mg',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Anaerobic cover for pericoronitis / deep periodontal abscess. Avoid alcohol.',
  },
  {
    brandName: 'Flagyl 400',
    genericName: 'Metronidazole',
    drugClass: 'NITROIMIDAZOLE',
    strength: '400 mg',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Combine with amoxicillin for mixed odontogenic infections.',
  },
  // ——— Analgesics / NSAIDs ———
  {
    brandName: 'Zerodol-SP',
    genericName: 'Aceclofenac (100mg) + Paracetamol (325mg) + Serratiopeptidase (15mg)',
    drugClass: 'NSAID',
    strength: 'Standard',
    form: 'TABLET',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Potent anti-inflammatory and anti-edema for post-RCT and surgical swelling.',
  },
  {
    brandName: 'Ketorol-DT',
    genericName: 'Ketorolac Tromethamine (Dispersible)',
    drugClass: 'NSAID',
    strength: '10 mg',
    form: 'TABLET',
    frequency: 'SOS',
    timing: 'AFTER_FOOD',
    instructions: 'Dissolve in half a cup of water for acute breakthrough dental pain. Max 5 days.',
  },
  {
    brandName: 'Combiflam',
    genericName: 'Ibuprofen (400mg) + Paracetamol (325mg)',
    drugClass: 'NSAID',
    strength: 'Standard',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Post-extraction / pulpitis pain. Prefer PPI cover if gastric history.',
  },
  {
    brandName: 'Dolo 650',
    genericName: 'Paracetamol',
    drugClass: 'ANALGESIC',
    strength: '650 mg',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Safe analgesic when NSAIDs contraindicated (asthma, ulcer, renal risk).',
  },
  {
    brandName: 'Ibugesic Plus Syrup',
    genericName: 'Ibuprofen + Paracetamol (pediatric syrup)',
    drugClass: 'NSAID',
    strength: 'Per age/weight',
    form: 'SYRUP',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Pediatric dose by weight as labeled. Parent-supervised. Max 3 days unless reviewed.',
  },
  {
    brandName: 'Brufen 400',
    genericName: 'Ibuprofen',
    drugClass: 'NSAID',
    strength: '400 mg',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Anti-inflammatory analgesic. Avoid in asthmatics / peptic ulcer.',
  },
  {
    brandName: 'Voveran 50',
    genericName: 'Diclofenac Sodium',
    drugClass: 'NSAID',
    strength: '50 mg',
    form: 'TABLET',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Post-surgical pain. Short course only with gastric protection.',
  },
  // ——— GI protection ———
  {
    brandName: 'Pantocid 40',
    genericName: 'Pantoprazole Sodium',
    drugClass: 'PPI',
    strength: '40 mg',
    form: 'TABLET',
    frequency: 'OD',
    timing: 'BEFORE_FOOD',
    instructions: 'Take 30 minutes before breakfast to prevent NSAID-induced gastric irritation.',
  },
  {
    brandName: 'Pan 40',
    genericName: 'Pantoprazole',
    drugClass: 'PPI',
    strength: '40 mg',
    form: 'TABLET',
    frequency: 'OD',
    timing: 'BEFORE_FOOD',
    instructions: 'Gastric protection with NSAID / steroid courses.',
  },
  // ——— Local / rinse / topical ———
  {
    brandName: 'Hexidine 0.2% Rinse',
    genericName: 'Chlorhexidine Gluconate Solution 0.2% w/v',
    drugClass: 'ANTISEPTIC',
    strength: '0.2%',
    form: 'MOUTHWASH',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Swish 10ml undiluted for 60 seconds twice daily. Do not rinse with water for 30 mins.',
  },
  {
    brandName: 'Betadine Gargle',
    genericName: 'Povidone-Iodine 2%',
    drugClass: 'ANTISEPTIC',
    strength: '2%',
    form: 'MOUTHWASH',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Dilute as directed. Short-term peri-operative oral antisepsis.',
  },
  {
    brandName: 'Dologel CT',
    genericName: 'Choline Salicylate + Lidocaine + Benzalkonium',
    drugClass: 'OTHER',
    strength: 'Gel',
    form: 'GEL',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Apply thin layer on ulcer / sore mucosa. Avoid eating 30 mins after.',
  },
  {
    brandName: 'Rexidin-M Forte Gel',
    genericName: 'Chlorhexidine + Metronidazole Gel',
    drugClass: 'ANTISEPTIC',
    strength: 'Gel',
    form: 'GEL',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Apply into periodontal pocket / extraction socket as advised.',
  },
  // ——— Steroids / hemostatic / antifungal ———
  {
    brandName: 'Wysolone 5',
    genericName: 'Prednisolone',
    drugClass: 'CORTICOSTEROID',
    strength: '5 mg',
    form: 'TABLET',
    frequency: 'OD',
    timing: 'AFTER_FOOD',
    instructions: 'Short taper for severe post-op edema / pericoronitis. Morning dose preferred.',
  },
  {
    brandName: 'Tranexa 500',
    genericName: 'Tranexamic Acid',
    drugClass: 'HEMOSTATIC',
    strength: '500 mg',
    form: 'TABLET',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'For patients on anticoagulants / prolonged socket bleeding. Crush & apply locally if advised.',
  },
  {
    brandName: 'Canditral 100',
    genericName: 'Itraconazole',
    drugClass: 'ANTIFUNGAL',
    strength: '100 mg',
    form: 'CAPSULE',
    frequency: 'BD',
    timing: 'AFTER_FOOD',
    instructions: 'Oral candidiasis after prolonged antibiotics / denture stomatitis.',
  },
  {
    brandName: 'Candid Mouth Paint',
    genericName: 'Clotrimazole 1%',
    drugClass: 'ANTIFUNGAL',
    strength: '1%',
    form: 'GEL',
    frequency: 'TDS',
    timing: 'AFTER_FOOD',
    instructions: 'Paint on affected mucosa after meals. Continue 2 days after lesions clear.',
  },
  {
    brandName: 'Becosules',
    genericName: 'Vitamin B-Complex + Vitamin C',
    drugClass: 'OTHER',
    strength: 'Capsule',
    form: 'CAPSULE',
    frequency: 'OD',
    timing: 'AFTER_FOOD',
    instructions: 'Supportive for aphthous ulcers / post-surgical recovery.',
  },
];

export interface AllergyCheckResult {
  hasCriticalWarning: boolean;
  contraindicatedDrugs: string[];
  warningMessage: string | null;
  recommendedAlternatives: string[];
}

export function isPenicillinBetaLactamAllergic(patientAlerts: MedicalAlert[]): boolean {
  return patientAlerts.some((alert) => {
    const text = (alert.label + ' ' + alert.clinicalImplication).toLowerCase();
    return (
      text.includes('penicillin') ||
      text.includes('amoxicillin') ||
      text.includes('beta-lactam') ||
      text.includes('betalactam')
    );
  });
}

/**
 * Checks prescription against patient's medical alert list for drug allergies.
 * Specifically checks for Penicillin / Beta-lactam allergies against Amoxicillin/Penicillins.
 */
export function checkPrescriptionAllergies(
  patientAlerts: MedicalAlert[],
  prescribedDrugs: PrescribedDrug[]
): AllergyCheckResult {
  if (!isPenicillinBetaLactamAllergic(patientAlerts)) {
    return {
      hasCriticalWarning: false,
      contraindicatedDrugs: [],
      warningMessage: null,
      recommendedAlternatives: [],
    };
  }

  const contraindicated = prescribedDrugs
    .filter((d) => d.drugClass === 'PENICILLIN' || d.drugClass === 'CEPHALOSPORIN')
    .map((d) => `${d.brandName} (${d.genericName})`);

  if (contraindicated.length > 0) {
    return {
      hasCriticalWarning: true,
      contraindicatedDrugs: contraindicated,
      warningMessage: `CRITICAL ALLERGY CONTRAINDICATION: Patient has documented Penicillin/Amoxicillin hypersensitivity! Prescribing ${contraindicated.join(', ')} carries severe risk of anaphylaxis.`,
      recommendedAlternatives: [
        'Dalacin C 300mg (Clindamycin) TDS for 5 days',
        'Azee 500mg (Azithromycin) OD for 3 days',
      ],
    };
  }

  return {
    hasCriticalWarning: false,
    contraindicatedDrugs: [],
    warningMessage: null,
    recommendedAlternatives: [],
  };
}

export type DrugInterceptResult =
  | { allowed: true; drug: PrescribedDrug }
  | { allowed: false; reason: string; alternatives: string[] };

/** Domain-level add guard — usable from any surface, not only PrescriptionPad UI. */
export function interceptDrugAddition(
  patientAlerts: MedicalAlert[],
  candidate: Omit<PrescribedDrug, 'id'> | PrescribedDrug,
  _existingDrugs: PrescribedDrug[]
): DrugInterceptResult {
  const drug: PrescribedDrug = {
    ...candidate,
    id: 'id' in candidate && candidate.id ? candidate.id : `drg-${Date.now()}`,
    durationDays: candidate.durationDays ?? 5,
  };

  const check = checkPrescriptionAllergies(patientAlerts, [drug]);
  if (check.hasCriticalWarning) {
    return {
      allowed: false,
      reason:
        check.warningMessage ??
        'Blocked: penicillin-class drug on penicillin-allergic patient.',
      alternatives: check.recommendedAlternatives,
    };
  }

  return { allowed: true, drug };
}

/**
 * Hard malpractice guard — throws if penicillin-class drugs remain on an allergic Rx.
 * Call before print / finalize / persist.
 */
export function assertPrescriptionSafeToIssue(
  patientAlerts: MedicalAlert[],
  prescribedDrugs: PrescribedDrug[]
): void {
  const result = checkPrescriptionAllergies(patientAlerts, prescribedDrugs);
  if (result.hasCriticalWarning) {
    throw new Error(
      result.warningMessage ??
        'Cannot issue prescription: penicillin-class drug on penicillin-allergic patient.'
    );
  }
}

/** Safe default starter regimen — never seeds penicillin when patient is allergic. */
export function buildSafeStarterRegimen(patientAlerts: MedicalAlert[]): PrescribedDrug[] {
  const allergy = checkPrescriptionAllergies(patientAlerts, [
    {
      id: 'probe',
      brandName: 'Augmentin 625',
      genericName: 'Amoxicillin',
      drugClass: 'PENICILLIN',
      strength: '625 mg',
      form: 'TABLET',
      frequency: 'BD',
      timing: 'AFTER_FOOD',
      durationDays: 5,
      instructions: '',
    },
  ]);

  const antibiotic = allergy.hasCriticalWarning
    ? INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName.includes('Dalacin'))!
    : INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName.includes('Augmentin'))!;

  const nsaid = INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName.includes('Zerodol'))!;

  return [
    {
      ...antibiotic,
      id: `drg-abx-${Date.now()}`,
      durationDays: allergy.hasCriticalWarning ? 5 : 5,
    },
    {
      ...nsaid,
      id: `drg-nsaid-${Date.now()}`,
      durationDays: 3,
    },
  ];
}
