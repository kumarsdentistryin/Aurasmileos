import { describe, expect, it } from 'vitest';
import { MedicalAlert } from '../types';
import {
  assertPrescriptionSafeToIssue,
  buildSafeStarterRegimen,
  checkPrescriptionAllergies,
  interceptDrugAddition,
  PrescribedDrug,
} from '../prescription';

const penicillinAllergy: MedicalAlert = {
  id: 'a1',
  category: 'ALLERGY',
  label: 'Penicillin / Amoxicillin Allergy (Anaphylaxis Risk)',
  severity: 'CRITICAL',
  clinicalImplication: 'STRICTLY CONTRAINDICATED: Penicillins',
};

const augmentin: PrescribedDrug = {
  id: 'd1',
  brandName: 'Augmentin 625',
  genericName: 'Amoxicillin (500mg) + Potassium Clavulanate (125mg)',
  drugClass: 'PENICILLIN',
  strength: '625 mg',
  form: 'TABLET',
  frequency: 'BD',
  timing: 'AFTER_FOOD',
  durationDays: 5,
  instructions: 'After food',
};

const clindamycin: PrescribedDrug = {
  id: 'd2',
  brandName: 'Dalacin C 300',
  genericName: 'Clindamycin Hydrochloride',
  drugClass: 'LINCOSAMIDE',
  strength: '300 mg',
  form: 'CAPSULE',
  frequency: 'TDS',
  timing: 'AFTER_FOOD',
  durationDays: 5,
  instructions: 'Safe alternative',
};

describe('prescription allergy invariants', () => {
  it('flags penicillin on allergic patient', () => {
    const result = checkPrescriptionAllergies([penicillinAllergy], [augmentin]);
    expect(result.hasCriticalWarning).toBe(true);
    expect(result.contraindicatedDrugs.length).toBe(1);
  });

  it('allows clindamycin on allergic patient', () => {
    const result = checkPrescriptionAllergies([penicillinAllergy], [clindamycin]);
    expect(result.hasCriticalWarning).toBe(false);
  });

  it('hard-blocks issue when penicillin remains', () => {
    expect(() =>
      assertPrescriptionSafeToIssue([penicillinAllergy], [augmentin])
    ).toThrow(/CRITICAL ALLERGY|penicillin/i);
  });

  it('allows issue when regimen is safe', () => {
    expect(() =>
      assertPrescriptionSafeToIssue([penicillinAllergy], [clindamycin])
    ).not.toThrow();
  });

  it('starter regimen never seeds penicillin for allergic patient', () => {
    const regimen = buildSafeStarterRegimen([penicillinAllergy]);
    expect(regimen.some((d) => d.drugClass === 'PENICILLIN')).toBe(false);
    expect(regimen.some((d) => d.drugClass === 'LINCOSAMIDE')).toBe(true);
  });

  it('interceptDrugAddition denies penicillin add for allergic patient', () => {
    const result = interceptDrugAddition(
      [penicillinAllergy],
      {
        brandName: 'Moxikind-CV 625',
        genericName: 'Amoxicillin',
        drugClass: 'PENICILLIN',
        strength: '625 mg',
        form: 'TABLET',
        frequency: 'BD',
        timing: 'AFTER_FOOD',
        durationDays: 5,
        instructions: '',
      },
      []
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.alternatives.length).toBeGreaterThan(0);
    }
  });

  it('interceptDrugAddition allows clindamycin', () => {
    const result = interceptDrugAddition([penicillinAllergy], clindamycin, []);
    expect(result.allowed).toBe(true);
  });
});
