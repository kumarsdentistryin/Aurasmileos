import { describe, expect, it } from 'vitest';
import {
  createPlanLineFromMacro,
  createTreatmentPlanLine,
  estimateVisitsForProcedure,
  setTreatmentAcceptance,
  summarizeTreatmentAcceptance,
} from '../treatmentPlan';

const rct = {
  id: 'rct-multi',
  label: 'Multi-canal RCT',
  typicalFeePaise: 850000,
  needsConsent: true,
};

describe('treatmentPlan', () => {
  it('creates a proposed line with fee, consent, and visit estimate', () => {
    const line = createTreatmentPlanLine({
      patientId: 'pat-1',
      toothId: 16,
      procedure: rct,
      attendingDoctorName: 'Dr. Vikram Rao, MDS',
      nowIso: '2026-09-15T10:00:00.000Z',
    });

    expect(line.acceptance).toBe('PROPOSED');
    expect(line.feePaise).toBe(850000);
    expect(line.needsConsent).toBe(true);
    expect(line.toothId).toBe(16);
    expect(line.estimatedVisits).toBe(2);
    expect(estimateVisitsForProcedure('consult')).toBe(1);
  });

  it('tracks acceptance and rate excluding still-proposed lines', () => {
    const a = createTreatmentPlanLine({
      patientId: 'pat-1',
      toothId: 16,
      procedure: rct,
      attendingDoctorName: 'Dr. V',
    });
    const b = createTreatmentPlanLine({
      patientId: 'pat-1',
      toothId: 26,
      procedure: { ...rct, id: 'scaling', label: 'Scaling', typicalFeePaise: 150000, needsConsent: false },
      attendingDoctorName: 'Dr. V',
    });
    const c = createTreatmentPlanLine({
      patientId: 'pat-1',
      toothId: null,
      procedure: { ...rct, id: 'consult', label: 'Consult', typicalFeePaise: 50000, needsConsent: false },
      attendingDoctorName: 'Dr. V',
    });

    const lines = [
      setTreatmentAcceptance(a, 'ACCEPTED', '2026-09-15T11:00:00.000Z'),
      setTreatmentAcceptance(b, 'DECLINED', '2026-09-15T11:05:00.000Z'),
      c,
    ];

    const summary = summarizeTreatmentAcceptance(lines);
    expect(summary.accepted).toBe(1);
    expect(summary.declined).toBe(1);
    expect(summary.proposed).toBe(1);
    expect(summary.acceptedFeePaise).toBe(850000);
    expect(summary.acceptanceRatePercent).toBe(50);
  });

  it('maps chart macro into a proposed plan line', () => {
    const line = createPlanLineFromMacro({
      patientId: 'pat-1',
      toothId: 16,
      macro: {
        id: 'ssrct-crown',
        label: 'SS RCT + Core + Zirconia Crown',
        typicalFeePaise: 1800000,
        minutes: 90,
      },
      attendingDoctorName: 'Dr. V',
    });
    expect(line.procedureId).toBe('ssrct-crown');
    expect(line.feePaise).toBe(1800000);
    expect(line.needsConsent).toBe(true);
    expect(line.acceptance).toBe('PROPOSED');
  });
});
