import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadTreatmentPlanLines,
  saveTreatmentPlanLines,
  mergePatientPlanLines,
  clearTreatmentPlanStore,
  resolveTreatmentPlanLines,
} from '../treatmentPlanPersistence';
import { TreatmentPlanLine } from '../../domain/treatmentPlan';

function sampleLine(patientId: string, id: string): TreatmentPlanLine {
  return {
    id,
    patientId,
    toothId: 16,
    procedureId: 'composite',
    procedureLabel: 'Composite',
    feePaise: 250000,
    needsConsent: false,
    estimatedVisits: 1,
    acceptance: 'PROPOSED',
    attendingDoctorName: 'Dr Test',
    createdAtIso: '2026-09-17T00:00:00.000Z',
  };
}

describe('treatmentPlanPersistence', () => {
  beforeEach(() => {
    clearTreatmentPlanStore();
  });

  it('saves and reloads plan lines for a patient', () => {
    const lines = [sampleLine('pat-1', 'tpl-1')];
    saveTreatmentPlanLines('clinic-a', 'pat-1', lines);
    expect(loadTreatmentPlanLines('clinic-a', 'pat-1')).toEqual(lines);
    expect(loadTreatmentPlanLines('clinic-a', 'pat-2')).toEqual([]);
  });

  it('scopes by clinic key', () => {
    saveTreatmentPlanLines('clinic-a', 'pat-1', [sampleLine('pat-1', 'a')]);
    saveTreatmentPlanLines('clinic-b', 'pat-1', [sampleLine('pat-1', 'b')]);
    expect(loadTreatmentPlanLines('clinic-a', 'pat-1')[0]?.id).toBe('a');
    expect(loadTreatmentPlanLines('clinic-b', 'pat-1')[0]?.id).toBe('b');
  });

  it('merges patient lines without dropping other patients', () => {
    const all = [sampleLine('pat-1', 'a'), sampleLine('pat-2', 'b')];
    const next = mergePatientPlanLines(all, 'pat-1', [sampleLine('pat-1', 'c')]);
    expect(next.map((l) => l.id).sort()).toEqual(['b', 'c']);
  });

  it('resolve prefers DB column when present (incl. empty)', () => {
    saveTreatmentPlanLines('clinic-a', 'pat-1', [sampleLine('pat-1', 'local')]);
    expect(resolveTreatmentPlanLines('clinic-a', 'pat-1', [])).toEqual([]);
    expect(loadTreatmentPlanLines('clinic-a', 'pat-1')).toEqual([]);
    saveTreatmentPlanLines('clinic-a', 'pat-1', [sampleLine('pat-1', 'local2')]);
    expect(resolveTreatmentPlanLines('clinic-a', 'pat-1', undefined)[0]?.id).toBe('local2');
  });
});
