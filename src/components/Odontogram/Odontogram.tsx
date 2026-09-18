import React, { useState } from 'react';
import { ToothCondition, ToothId, ToothState, ToothSurface } from '../../domain/types';
import {
  ADULT_TEETH_Q1,
  ADULT_TEETH_Q2,
  ADULT_TEETH_Q3,
  ADULT_TEETH_Q4,
  DECIDUOUS_TEETH_Q5,
  DECIDUOUS_TEETH_Q6,
  DECIDUOUS_TEETH_Q7,
  DECIDUOUS_TEETH_Q8,
  getAnatomicalToothName,
  getValidSurfacesForTooth,
  validateSurfaces,
} from '../../domain/fdi';
import { ToothSvg } from './ToothSvg';
import { ConditionPalette } from './ConditionPalette';
import { CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { formatMacroLine, macrosForCondition } from '../../domain/clinicalChips';
import { formatPaiseToInr } from '../../domain/financials';
import { QuickChip } from '../ui/QuickChip';

interface OdontogramProps {
  dentalChart: Record<number, ToothState>;
  onUpdateToothState: (toothId: ToothId, newState: ToothState) => void;
  onResetChart: () => void;
  /** When treating doctor is Pedo, open on deciduous dentition */
  defaultDentition?: 'adult' | 'deciduous';
  /** Soft-lock / expired trial — chart stays viewable but not editable. */
  readOnly?: boolean;
  /** Chart macro → also create a treatment plan line */
  onApplyMacro?: (macro: {
    id: string;
    label: string;
    typicalFeePaise: number;
    minutes: number;
    diagnosis: string;
    plan: string;
  }, toothId: ToothId) => void;
}

export const Odontogram: React.FC<OdontogramProps> = ({
  dentalChart,
  onUpdateToothState,
  onResetChart,
  defaultDentition = 'adult',
  readOnly = false,
  onApplyMacro,
}) => {
  const startPediatric = defaultDentition === 'deciduous';
  const [isPediatric, setIsPediatric] = useState<boolean>(startPediatric);
  const [selectedToothId, setSelectedToothId] = useState<ToothId>(
    startPediatric ? 55 : 16
  );
  const [activeCondition, setActiveCondition] = useState<ToothCondition>('CARIES');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);

  const selectedToothState: ToothState = dentalChart[selectedToothId] || {
    toothId: selectedToothId,
    condition: 'SOUND',
    affectedSurfaces: [],
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  const allowedSurfaces = getValidSurfacesForTooth(selectedToothId);

  // Surface toggle handler
  const handleToggleSurface = (toothId: ToothId, surface: ToothSurface) => {
    if (readOnly) return;
    setSelectedToothId(toothId);
    setValidationError(null);

    const current = dentalChart[toothId] || {
      toothId,
      condition: activeCondition,
      affectedSurfaces: [],
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    const hasSurface = current.affectedSurfaces.includes(surface);
    const updatedSurfaces: ToothSurface[] = hasSurface
      ? current.affectedSurfaces.filter((s) => s !== surface)
      : [...current.affectedSurfaces, surface];

    // Check domain invariants
    const check = validateSurfaces(toothId, updatedSurfaces);
    if (!check.valid) {
      setValidationError(check.error || 'Surface violates anatomical rules.');
      return;
    }

    const updatedCondition = updatedSurfaces.length > 0 ? (current.condition === 'SOUND' ? activeCondition : current.condition) : current.condition;

    onUpdateToothState(toothId, {
      ...current,
      condition: updatedCondition,
      affectedSurfaces: updatedSurfaces,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  // Direct condition application to selected tooth
  const handleApplyCondition = (cond: ToothCondition) => {
    if (readOnly) return;
    setActiveCondition(cond);
    setValidationError(null);

    const current = selectedToothState;
    let surfaces = current.affectedSurfaces;

    if (cond === 'SOUND') {
      surfaces = [];
    } else if (cond === 'MISSING' || cond === 'EXTRACTION_INDICATED' || cond === 'IMPLANT') {
      surfaces = [];
    } else if (
      surfaces.length === 0 &&
      (cond === 'CROWN' || cond === 'RCT')
    ) {
      surfaces = [...allowedSurfaces];
    } else if (surfaces.length === 0) {
      // Surface pathology: seed center (O/I) so the chart paints on first tap
      const center: ToothSurface = allowedSurfaces.includes('O')
        ? 'O'
        : allowedSurfaces.includes('I')
          ? 'I'
          : allowedSurfaces[0];
      surfaces = center ? [center] : [];
    }

    onUpdateToothState(selectedToothId, {
      ...current,
      condition: cond,
      affectedSurfaces: surfaces,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const handleNotesChange = (notes: string) => {
    if (readOnly) return;
    onUpdateToothState(selectedToothId, {
      ...selectedToothState,
      notes,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  const handleTreatmentChange = (treatmentPlanned: string) => {
    if (readOnly) return;
    onUpdateToothState(selectedToothId, {
      ...selectedToothState,
      treatmentPlanned,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  // Clinical Summary Totals
  const chartValues = Object.values(dentalChart);
  const cariesCount = chartValues.filter((t) => t.condition === 'CARIES').length;
  const rctCount = chartValues.filter((t) => t.condition === 'RCT').length;
  const crownCount = chartValues.filter((t) => t.condition === 'CROWN').length;
  const restoreCount = chartValues.filter((t) => t.condition === 'COMPOSITE' || t.condition === 'AMALGAM').length;
  const missingCount = chartValues.filter((t) => t.condition === 'MISSING' || t.condition === 'EXTRACTION_INDICATED').length;

  const summaryStats: { label: string; count: number; dot: string }[] = [
    { label: 'Caries', count: cariesCount, dot: 'bg-rose-600' },
    { label: 'RCT', count: rctCount, dot: 'bg-emerald-600' },
    { label: 'Crowns', count: crownCount, dot: 'bg-amber-600' },
    { label: 'Restored', count: restoreCount, dot: 'bg-[var(--color-brand)]' },
    { label: 'Missing', count: missingCount, dot: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => {
              setIsPediatric(false);
              setSelectedToothId(16);
            }}
            className={`tactile-btn rounded-md px-3 py-1.5 text-xs font-semibold motion-colors ${
              !isPediatric
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Adult · 32
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPediatric(true);
              setSelectedToothId(54);
            }}
            className={`tactile-btn rounded-md px-3 py-1.5 text-xs font-semibold motion-colors ${
              isPediatric
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pedo · 20
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
          {summaryStats.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
              <strong className="font-mono text-slate-900">{s.count}</strong>
            </span>
          ))}

          {!resetArmed ? (
            <button
              type="button"
              onClick={() => setResetArmed(true)}
              disabled={readOnly}
              className="tactile-btn ml-1 inline-flex min-h-[40px] items-center gap-1 rounded-md border border-slate-200 px-3 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:pointer-events-none disabled:opacity-40"
              title="Reset all teeth to sound"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          ) : (
            <div className="ml-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-rose-800">Clear entire chart?</span>
              <button
                type="button"
                onClick={() => {
                  onResetChart();
                  setResetArmed(false);
                }}
                className="tactile-btn inline-flex min-h-[40px] items-center rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-900"
              >
                Confirm clear
              </button>
              <button
                type="button"
                onClick={() => setResetArmed(false)}
                className="tactile-btn inline-flex min-h-[40px] items-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Condition Palette */}
      <ConditionPalette
        selectedCondition={activeCondition}
        onSelectCondition={handleApplyCondition}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="surface-card xl:col-span-8 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">FDI chart</h2>
              <p className="text-[11px] text-slate-500">Tap tooth · toggle surfaces</p>
            </div>
            <span className="text-[10px] font-medium text-slate-400">DCI standard</span>
          </div>

          {validationError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="mb-3">
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Upper
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-[var(--color-canvas-deep)] p-3">
              <div className="flex items-center justify-center space-x-1 overflow-x-auto pb-1 sm:space-x-1.5">
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  {(isPediatric ? DECIDUOUS_TEETH_Q5 : ADULT_TEETH_Q1).map((tId) => (
                    <ToothSvg
                      key={tId}
                      toothId={tId}
                      state={dentalChart[tId]}
                      isSelected={selectedToothId === tId}
                      onSelectTooth={setSelectedToothId}
                      onToggleSurface={handleToggleSurface}
                    />
                  ))}
                </div>
                <div className="relative mx-1 flex h-24 w-px flex-col items-center justify-center bg-slate-300">
                  <span className="absolute rounded bg-white px-1 text-[8px] font-bold tracking-wide text-slate-500">
                    MID
                  </span>
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  {(isPediatric ? DECIDUOUS_TEETH_Q6 : ADULT_TEETH_Q2).map((tId) => (
                    <ToothSvg
                      key={tId}
                      toothId={tId}
                      state={dentalChart[tId]}
                      isSelected={selectedToothId === tId}
                      onSelectTooth={setSelectedToothId}
                      onToggleSurface={handleToggleSurface}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Lower
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-[var(--color-canvas-deep)] p-3">
              <div className="flex items-center justify-center space-x-1 overflow-x-auto pb-1 sm:space-x-1.5">
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  {(isPediatric ? DECIDUOUS_TEETH_Q8 : ADULT_TEETH_Q4).map((tId) => (
                    <ToothSvg
                      key={tId}
                      toothId={tId}
                      state={dentalChart[tId]}
                      isSelected={selectedToothId === tId}
                      onSelectTooth={setSelectedToothId}
                      onToggleSurface={handleToggleSurface}
                    />
                  ))}
                </div>
                <div className="relative mx-1 flex h-24 w-px flex-col items-center justify-center bg-slate-300">
                  <span className="absolute rounded bg-white px-1 text-[8px] font-bold tracking-wide text-slate-500">
                    MID
                  </span>
                </div>
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  {(isPediatric ? DECIDUOUS_TEETH_Q7 : ADULT_TEETH_Q3).map((tId) => (
                    <ToothSvg
                      key={tId}
                      toothId={tId}
                      state={dentalChart[tId]}
                      isSelected={selectedToothId === tId}
                      onSelectTooth={setSelectedToothId}
                      onToggleSurface={handleToggleSurface}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card space-y-3 p-4 xl:col-span-4">
          <div className="border-b border-slate-100 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Selected
              </span>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-brand)]">
                #{selectedToothId}
              </span>
            </div>
            <h2 className="mt-1 text-sm font-bold tracking-tight text-slate-900">
              {getAnatomicalToothName(selectedToothId)}
            </h2>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Condition
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800">
                {selectedToothState.condition}
              </span>
              <button
                type="button"
                onClick={() => handleApplyCondition('SOUND')}
                disabled={readOnly}
                className="tactile-btn rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Mark sound
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Plan (1 tap)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {macrosForCondition(selectedToothState.condition).map((macro) => (
                <QuickChip
                  key={macro.id}
                  label={`${macro.label} · ${formatPaiseToInr(macro.typicalFeePaise, false)}`}
                  title={formatMacroLine(macro, selectedToothId)}
                  disabled={readOnly}
                  onClick={() => {
                    handleTreatmentChange(
                      `${formatMacroLine(macro, selectedToothId)} · Dx: ${macro.diagnosis}`
                    );
                    onApplyMacro?.(macro, selectedToothId);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Surfaces
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {allowedSurfaces.map((s) => {
                const isSelected = selectedToothState.affectedSurfaces.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleSurface(selectedToothId, s)}
                    disabled={readOnly}
                    className={`tactile-btn tooth-surface-chip min-h-[44px] min-w-[44px] rounded-lg border text-center font-mono text-sm font-bold motion-colors disabled:opacity-40 ${
                      isSelected
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Findings
            </label>
            <textarea
              rows={2}
              value={selectedToothState.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={readOnly}
              placeholder="Deep caries, cold sensitivity…"
              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 disabled:opacity-40"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Treatment
            </label>
            <input
              type="text"
              value={selectedToothState.treatmentPlanned || ''}
              onChange={(e) => handleTreatmentChange(e.target.value)}
              disabled={readOnly}
              placeholder="RCT + zirconia crown…"
              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/25 disabled:opacity-40"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>
              Updated{' '}
              <strong className="font-mono font-medium text-slate-600">
                {selectedToothState.lastUpdated}
              </strong>
            </span>
            <span className="inline-flex items-center font-medium text-[var(--color-brand)]">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> On chart
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
