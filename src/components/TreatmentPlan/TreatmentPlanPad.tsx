import React, { useMemo, useState } from 'react';
import { Check, ClipboardList, Plus, X } from 'lucide-react';
import { Patient, ToothId } from '../../domain/types';
import { formatPaiseToInr } from '../../domain/financials';
import {
  TreatmentAcceptanceStatus,
  TreatmentPlanLine,
  createPlanLineFromMacro,
  createTreatmentPlanLine,
  estimateVisitsForProcedure,
  setTreatmentAcceptance,
  summarizeTreatmentAcceptance,
} from '../../domain/treatmentPlan';
import {
  proceduresForSpecialty,
  resolveSpecialtyKey,
  SpecialtyProcedureOption,
} from '../../lib/specialtyTemplates';
import {
  PLAN_QUICK_BUNDLES,
  TreatmentMacro,
} from '../../domain/clinicalChips';
import { QuickChip } from '../ui/QuickChip';

const TOOTH_OPTIONS: ToothId[] = [
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41,
  42, 43, 44, 45, 46, 47, 48, 54, 55, 64, 65, 74, 75, 84, 85,
];

const ACCEPT_ACTIONS: { id: TreatmentAcceptanceStatus; label: string }[] = [
  { id: 'ACCEPTED', label: 'Accept' },
  { id: 'DECLINED', label: 'Decline' },
  { id: 'DEFERRED', label: 'Defer' },
  { id: 'PROPOSED', label: 'Reset' },
];

interface TreatmentPlanPadProps {
  patient: Patient;
  doctorName: string;
  doctorSpecialty: string;
  lines: TreatmentPlanLine[];
  onChangeLines: (next: TreatmentPlanLine[]) => void;
  readOnly?: boolean;
}

export const TreatmentPlanPad: React.FC<TreatmentPlanPadProps> = ({
  patient,
  doctorName,
  doctorSpecialty,
  lines,
  onChangeLines,
  readOnly = false,
}) => {
  const specialtyKey = useMemo(
    () => resolveSpecialtyKey(doctorSpecialty),
    [doctorSpecialty]
  );
  const catalog = useMemo(() => proceduresForSpecialty(specialtyKey), [specialtyKey]);
  const patientLines = useMemo(
    () => lines.filter((l) => l.patientId === patient.id),
    [lines, patient.id]
  );
  const summary = useMemo(
    () => summarizeTreatmentAcceptance(patientLines),
    [patientLines]
  );

  const chartTeeth = Object.keys(patient.dentalChart).map(Number) as ToothId[];
  const [toothId, setToothId] = useState<ToothId | ''>(
    (chartTeeth[0] as ToothId | undefined) ?? 16
  );
  const [procedureId, setProcedureId] = useState(catalog[0]?.id ?? 'consult');

  const selectedProc = catalog.find((p) => p.id === procedureId) ?? catalog[0];

  const addProcedure = (procedure: SpecialtyProcedureOption, tooth: ToothId | '') => {
    if (readOnly) return;
    const line = createTreatmentPlanLine({
      patientId: patient.id,
      toothId: tooth === '' ? null : tooth,
      procedure,
      attendingDoctorName: doctorName,
    });
    onChangeLines([...lines, line]);
  };

  const handleAdd = () => {
    if (readOnly || !selectedProc) return;
    addProcedure(selectedProc, toothId);
  };

  const handleBundle = (macro: TreatmentMacro) => {
    if (readOnly) return;
    const tooth = toothId === '' ? 18 : toothId;
    const line = createPlanLineFromMacro({
      patientId: patient.id,
      toothId: tooth,
      macro,
      attendingDoctorName: doctorName,
    });
    onChangeLines([...lines, line]);
  };

  const handleAccept = (id: string, status: TreatmentAcceptanceStatus) => {
    if (readOnly) return;
    onChangeLines(
      lines.map((l) => (l.id === id ? setTreatmentAcceptance(l, status) : l))
    );
  };

  const handleRemove = (id: string) => {
    if (readOnly) return;
    onChangeLines(lines.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[var(--color-brand)]">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Treatment plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.fullName} · 1-tap bundles · fee · acceptance ·{' '}
              <span className="text-[var(--color-brand)] font-medium">{doctorSpecialty}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 rounded border border-slate-200 bg-slate-50 font-mono">
            Proposed {formatPaiseToInr(summary.proposedFeePaise, false)}
          </span>
          <span className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 font-mono">
            Accepted {formatPaiseToInr(summary.acceptedFeePaise, false)}
          </span>
          <span className="px-2 py-1 rounded border border-teal-200 bg-teal-50 text-teal-800 font-semibold">
            Acceptance {summary.acceptanceRatePercent}%
          </span>
        </div>
      </div>

      <div className="surface-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1-tap treatment bundles
          </h3>
          <select
            aria-label="Tooth for bundle"
            value={toothId}
            onChange={(e) =>
              setToothId(e.target.value === '' ? '' : (Number(e.target.value) as ToothId))
            }
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">Full mouth</option>
            {[...new Set([...chartTeeth, ...TOOTH_OPTIONS])].map((t) => (
              <option key={t} value={t}>
                Tooth #{t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLAN_QUICK_BUNDLES.map((macro) => (
            <QuickChip
              key={macro.id}
              label={macro.label}
              title={`${macro.minutes} min · ${formatPaiseToInr(macro.typicalFeePaise, false)}`}
              onClick={() => handleBundle(macro)}
            />
          ))}
        </div>
      </div>

      <div className="surface-card p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Add line
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            aria-label="Tooth"
            value={toothId}
            onChange={(e) =>
              setToothId(e.target.value === '' ? '' : (Number(e.target.value) as ToothId))
            }
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white"
          >
            <option value="">No tooth (full mouth)</option>
            {[...new Set([...chartTeeth, ...TOOTH_OPTIONS])].map((t) => (
              <option key={t} value={t}>
                Tooth #{t}
              </option>
            ))}
          </select>
          <select
            aria-label="Procedure"
            value={procedureId}
            onChange={(e) => setProcedureId(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white"
          >
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · {formatPaiseToInr(p.typicalFeePaise, false)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={readOnly}
            className="tactile-btn inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-md bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4" />
            Add to plan
          </button>
        </div>
        {selectedProc && (
          <p className="text-[11px] text-slate-500">
            ~{estimateVisitsForProcedure(selectedProc.id)} visit(s)
            {selectedProc.needsConsent ? ' · consent required before start' : ''}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {patientLines.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-10 border border-dashed border-slate-200 rounded-lg bg-white">
            No planned treatments yet — tap a bundle above
          </div>
        )}
        {patientLines.map((line) => {
          const bundleMins = PLAN_QUICK_BUNDLES.find((m) => m.id === line.procedureId)?.minutes;
          return (
          <article
            key={line.id}
            className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-3 justify-between"
          >
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">
                {line.procedureLabel}
                {line.toothId != null && (
                  <span className="font-mono text-[var(--color-brand)]"> · #{line.toothId}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono text-emerald-700">
                  {formatPaiseToInr(line.feePaise, false)}
                </span>
                {bundleMins != null && <span>~{bundleMins} min</span>}
                <span>{line.estimatedVisits} visit(s)</span>
                {line.needsConsent && <span className="text-amber-700">Consent needed</span>}
                <span
                  className={`font-semibold ${
                    line.acceptance === 'ACCEPTED'
                      ? 'text-emerald-700'
                      : line.acceptance === 'DECLINED'
                        ? 'text-red-600'
                        : line.acceptance === 'DEFERRED'
                          ? 'text-amber-700'
                          : 'text-slate-500'
                  }`}
                >
                  {line.acceptance}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ACCEPT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleAccept(line.id, action.id)}
                  className={`tactile-btn text-[10px] font-semibold px-2 py-1.5 rounded border ${
                    line.acceptance === action.id
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {action.id === 'ACCEPTED' && <Check className="w-3 h-3 inline mr-0.5" />}
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleRemove(line.id)}
                className="tactile-btn p-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200"
                aria-label="Remove plan line"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
};
