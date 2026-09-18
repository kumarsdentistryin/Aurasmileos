import React from 'react';
import { FileStack } from 'lucide-react';
import { Patient } from '../../domain/types';
import { ClinicBranding } from '../../lib/clinicBranding';
import { TreatmentPlanLine } from '../../domain/treatmentPlan';
import { PrescriptionPad } from '../Prescription/PrescriptionPad';
import { ConsentPad } from '../Consent/ConsentPad';
import { BillingReceiptPad } from './BillingReceiptPad';
import { FollowUpScheduler } from '../Patient/FollowUpScheduler';

interface VisitHandoffPadProps {
  patient: Patient;
  doctorName: string;
  doctorRegistration: string;
  branding: ClinicBranding;
  branchId: string;
  clinicDbId: string | null;
  readOnly?: boolean;
  suggestedProcedure?: string;
  acceptedPlanLines?: TreatmentPlanLine[];
  /** Front desk collection mode — same packet, desk-oriented copy */
  deskMode?: boolean;
  onClose?: () => void;
  onScheduleFollowUp?: (nextDate: string) => void;
  doctorMemberId?: string | null;
  doctorMemberRole?: string | null;
}

/**
 * Single patient handoff: Medicine + Consent + Bill on one page.
 */
export const VisitHandoffPad: React.FC<VisitHandoffPadProps> = ({
  patient,
  doctorName,
  doctorRegistration,
  branding,
  branchId,
  clinicDbId,
  readOnly = false,
  suggestedProcedure,
  acceptedPlanLines = [],
  deskMode = false,
  onClose,
  onScheduleFollowUp,
  doctorMemberId = null,
  doctorMemberRole = null,
}) => {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileStack className="h-4 w-4 text-[var(--color-brand)]" />
            {deskMode ? 'Front desk collection' : 'Patient handoff'}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500">
            {deskMode
              ? 'Collect Rx confirmation, consent if needed, and payment — same packet the doctor uses.'
              : 'Medicine, consent, and receipt in one place — print or save a copy for'}{' '}
            {!deskMode && (
              <strong className="text-slate-700">{patient.fullName}</strong>
            )}
            {deskMode && (
              <>
                Patient: <strong className="text-slate-700">{patient.fullName}</strong>
                {patient.assignedDoctorName
                  ? ` · ${patient.assignedDoctorName}`
                  : ''}
              </>
            )}
            {!deskMode && ' before they leave.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800">{patient.fullName}</div>
            <div className="font-mono text-slate-500">{patient.mrn}</div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
          )}
        </div>
      </div>

      <section className="space-y-2" id="handoff-medicine">
        <div className="flex items-baseline gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            1 · Medicine
          </span>
          <span className="text-[11px] text-slate-400">Rx + post-care</span>
        </div>
        <PrescriptionPad
          patient={patient}
          doctorName={doctorName || patient.assignedDoctorName || 'Doctor'}
          doctorRegistration={doctorRegistration}
          clinicName={branding.legalName}
          branding={branding}
          clinicDbId={clinicDbId}
        />
      </section>

      <section className="space-y-2" id="handoff-consent">
        <div className="flex items-baseline gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            2 · Consent
          </span>
          <span className="text-[11px] text-slate-400">Sign before procedure / exit</span>
        </div>
        <ConsentPad
          patient={patient}
          doctorName={doctorName}
          doctorRegistration={doctorRegistration}
          clinicName={branding.legalName}
          branding={branding}
          branchId={branchId}
          clinicDbId={clinicDbId}
          pendingConsentLabels={acceptedPlanLines
            .filter((l) => l.acceptance === 'ACCEPTED' && l.needsConsent)
            .map((l) => `${l.procedureLabel}${l.toothId ? ` #${l.toothId}` : ''}`)}
        />
      </section>

      <section className="space-y-2" id="handoff-bill">
        <div className="flex items-baseline gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            3 · Bill
          </span>
          <span className="text-[11px] text-slate-400">Receipt · UPI · print copy</span>
        </div>
        <BillingReceiptPad
          patient={patient}
          doctorName={doctorName}
          branding={branding}
          branchId={branchId}
          clinicDbId={clinicDbId}
          readOnly={readOnly}
          suggestedProcedure={suggestedProcedure}
          acceptedPlanLines={acceptedPlanLines}
          doctorMemberId={doctorMemberId}
          doctorMemberRole={doctorMemberRole}
        />
      </section>

      {onScheduleFollowUp && (
        <section className="space-y-2" id="handoff-followup">
          <div className="flex items-baseline gap-2 border-b border-slate-100 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">
              4 · Follow-up
            </span>
            <span className="text-[11px] text-slate-400">Recall date before they leave</span>
          </div>
          <FollowUpScheduler
            patient={patient}
            readOnly={readOnly}
            onSave={onScheduleFollowUp}
          />
        </section>
      )}
    </div>
  );
};
