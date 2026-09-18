import { ToothId } from './types';
import {
  ClinicalSpecialtyKey,
  SpecialtyProcedureOption,
  proceduresForSpecialty,
} from '../lib/specialtyTemplates';

/**
 * Blueprint §4 Treatment Planning + §23 Treatment Acceptance Analytics.
 * Tooth + procedure → fee, visits, consent flag, patient acceptance.
 */

export type TreatmentAcceptanceStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'DEFERRED';

export interface TreatmentPlanLine {
  id: string;
  patientId: string;
  toothId: ToothId | null;
  procedureId: string;
  procedureLabel: string;
  feePaise: number;
  needsConsent: boolean;
  estimatedVisits: number;
  acceptance: TreatmentAcceptanceStatus;
  attendingDoctorName: string;
  createdAtIso: string;
  decidedAtIso?: string;
}

export interface TreatmentAcceptanceSummary {
  totalLines: number;
  proposed: number;
  accepted: number;
  declined: number;
  deferred: number;
  proposedFeePaise: number;
  acceptedFeePaise: number;
  declinedFeePaise: number;
  /** Accepted / (accepted + declined + deferred). Proposed excluded. */
  acceptanceRatePercent: number;
}

export function estimateVisitsForProcedure(procedureId: string): number {
  if (procedureId.includes('implant') || procedureId.includes('apico')) return 3;
  if (procedureId.includes('rct') || procedureId.includes('crown') || procedureId.includes('retreat'))
    return 2;
  if (procedureId.includes('consult') || procedureId.includes('sealant') || procedureId.includes('scaling'))
    return 1;
  return 1;
}

export function createTreatmentPlanLine(input: {
  patientId: string;
  toothId: ToothId | null;
  procedure: SpecialtyProcedureOption;
  attendingDoctorName: string;
  nowIso?: string;
}): TreatmentPlanLine {
  const now = input.nowIso ?? new Date().toISOString();
  return {
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    patientId: input.patientId,
    toothId: input.toothId,
    procedureId: input.procedure.id,
    procedureLabel: input.procedure.label,
    feePaise: input.procedure.typicalFeePaise,
    needsConsent: input.procedure.needsConsent,
    estimatedVisits: estimateVisitsForProcedure(input.procedure.id),
    acceptance: 'PROPOSED',
    attendingDoctorName: input.attendingDoctorName,
    createdAtIso: now,
  };
}

/** Chart 1-tap macro → plan line (closes chart→plan money loop). */
export function createPlanLineFromMacro(input: {
  patientId: string;
  toothId: ToothId;
  macro: {
    id: string;
    label: string;
    typicalFeePaise: number;
    minutes: number;
  };
  attendingDoctorName: string;
}): TreatmentPlanLine {
  return createTreatmentPlanLine({
    patientId: input.patientId,
    toothId: input.toothId,
    procedure: {
      id: input.macro.id,
      label: input.macro.label,
      typicalFeePaise: input.macro.typicalFeePaise,
      needsConsent:
        input.macro.minutes >= 45 ||
        input.macro.id.includes('rct') ||
        input.macro.id.includes('extract'),
    },
    attendingDoctorName: input.attendingDoctorName,
  });
}

export function setTreatmentAcceptance(
  line: TreatmentPlanLine,
  acceptance: TreatmentAcceptanceStatus,
  nowIso?: string
): TreatmentPlanLine {
  if (acceptance === 'PROPOSED') {
    return { ...line, acceptance, decidedAtIso: undefined };
  }
  return {
    ...line,
    acceptance,
    decidedAtIso: nowIso ?? new Date().toISOString(),
  };
}

export function summarizeTreatmentAcceptance(
  lines: TreatmentPlanLine[]
): TreatmentAcceptanceSummary {
  let proposed = 0;
  let accepted = 0;
  let declined = 0;
  let deferred = 0;
  let proposedFeePaise = 0;
  let acceptedFeePaise = 0;
  let declinedFeePaise = 0;

  for (const line of lines) {
    if (line.acceptance === 'PROPOSED') {
      proposed += 1;
      proposedFeePaise += line.feePaise;
    } else if (line.acceptance === 'ACCEPTED') {
      accepted += 1;
      acceptedFeePaise += line.feePaise;
    } else if (line.acceptance === 'DECLINED') {
      declined += 1;
      declinedFeePaise += line.feePaise;
    } else {
      deferred += 1;
    }
  }

  const decided = accepted + declined + deferred;
  const acceptanceRatePercent =
    decided > 0 ? Number(((accepted / decided) * 100).toFixed(1)) : 0;

  return {
    totalLines: lines.length,
    proposed,
    accepted,
    declined,
    deferred,
    proposedFeePaise,
    acceptedFeePaise,
    declinedFeePaise,
    acceptanceRatePercent,
  };
}

export function catalogForSpecialty(specialtyKey: ClinicalSpecialtyKey): SpecialtyProcedureOption[] {
  return proceduresForSpecialty(specialtyKey);
}
