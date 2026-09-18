import React, { useMemo, useState } from 'react';
import { ClinicalCaseSheet, EndoCanalMeasurement, Patient, ToothId } from '../../domain/types';
import { getAnatomicalToothName } from '../../domain/fdi';
import { FileText, Save, CheckCircle, Stethoscope, Plus, Trash2 } from 'lucide-react';
import {
  proceduresForSpecialty,
  resolveSpecialtyKey,
  specialtyCaseTitle,
} from '../../lib/specialtyTemplates';
import { formatPaiseToInr } from '../../domain/financials';
import {
  ADVICE_CHIPS,
  DURATION_CHIPS,
  FINDING_CHIPS,
  PAIN_CHIPS,
  buildAdviceNarrative,
  buildComplaintNarrative,
  buildFindingsNarrative,
  formatMacroLine,
  macrosForCondition,
} from '../../domain/clinicalChips';
import { QuickChip } from '../ui/QuickChip';

const CANAL_OPTIONS = [
  'MB1',
  'MB2',
  'DB',
  'Palatal',
  'Mesial',
  'Distal',
  'ML',
  'MB',
  'DL',
  'DB2',
  'Single canal',
  'Other',
] as const;

const REFERENCE_POINT_OPTIONS = [
  'MB Cusp Tip',
  'DB Cusp Tip',
  'Palatal Cusp Tip',
  'ML Cusp Tip',
  'DL Cusp Tip',
  'Incisal Edge',
  'Cusp Tip',
] as const;

const SEALER_OPTIONS = [
  'Bioceramic Sealer',
  'AH Plus',
  'Sealapex',
  'Zinc Oxide Eugenol',
  'MTA-based Sealer',
] as const;

interface CaseSheetProps {
  patient: Patient;
  /** Treating dentist specialty — drives template + procedure list */
  doctorSpecialty?: string;
  doctorName?: string;
  doctorRegistration?: string;
  onSaveCaseSheet?: (caseSheet: ClinicalCaseSheet) => void;
  readOnly?: boolean;
  /** Latest saved sheet for this patient — hydrate on open */
  initialSheet?: ClinicalCaseSheet | null;
}

export const CaseSheet: React.FC<CaseSheetProps> = ({
  patient,
  doctorSpecialty = 'General Dentistry',
  doctorName = '',
  doctorRegistration = '',
  onSaveCaseSheet,
  readOnly = false,
  initialSheet = null,
}) => {
  const specialtyKey = useMemo(
    () => resolveSpecialtyKey(doctorSpecialty),
    [doctorSpecialty]
  );
  const specialtyProcedures = useMemo(
    () => proceduresForSpecialty(specialtyKey),
    [specialtyKey]
  );
  const showEndoMatrix = specialtyKey === 'ENDODONTICS';
  const [selectedProcedureId, setSelectedProcedureId] = useState(
    specialtyProcedures[0]?.id ?? 'consult'
  );
  const [selectedTooth, setSelectedTooth] = useState<ToothId>(
    initialSheet?.targetToothId ?? 16
  );
  const [painChipIds, setPainChipIds] = useState<string[]>([]);
  const [durationChipId, setDurationChipId] = useState<string | null>(null);
  const [findingChipIds, setFindingChipIds] = useState<string[]>([]);
  const [adviceChipIds, setAdviceChipIds] = useState<string[]>([]);
  const [coldTest, setColdTest] = useState<string>(
    initialSheet?.vitalityTests.coldTest ?? 'NORMAL'
  );
  const [eptReading, setEptReading] = useState<string>(
    initialSheet?.vitalityTests.electricPulpTest ?? 'Not recorded'
  );
  const [percussion, setPercussion] = useState<string>(
    initialSheet?.vitalityTests.percussionTest ?? 'NEGATIVE'
  );
  const [palpation, setPalpation] = useState<string>(
    initialSheet?.vitalityTests.palpationTest ?? 'NEGATIVE'
  );
  const [probingDepth, setProbingDepth] = useState<number>(
    initialSheet?.vitalityTests.periodontalProbingDepthMm ?? 0
  );
  const [mobility, setMobility] = useState<string>(
    initialSheet?.vitalityTests.mobilityGrade ?? 'GRADE_0'
  );

  const toothCondition = patient.dentalChart[selectedTooth]?.condition ?? 'CARIES';
  // Only build narrative once chips are tapped — no invented complaint/findings text
  const chiefComplaint = useMemo(
    () =>
      painChipIds.length === 0 && !durationChipId
        ? ''
        : buildComplaintNarrative(painChipIds, durationChipId, selectedTooth),
    [painChipIds, durationChipId, selectedTooth]
  );
  const clinicalNotes = useMemo(
    () =>
      findingChipIds.length === 0
        ? ''
        : buildFindingsNarrative(findingChipIds, selectedTooth),
    [findingChipIds, selectedTooth]
  );
  const adviceText = useMemo(
    () => (adviceChipIds.length === 0 ? '' : buildAdviceNarrative(adviceChipIds)),
    [adviceChipIds]
  );

  const [canals, setCanals] = useState<EndoCanalMeasurement[]>(
    initialSheet?.endoMeasurements ?? []
  );

  const [diagnosis, setDiagnosis] = useState<string>(
    initialSheet?.provisionalDiagnosis ?? ''
  );
  const [treatmentPlan, setTreatmentPlan] = useState<string>(
    initialSheet?.treatmentPlanSummary?.[0] ?? ''
  );
  const [savedNotification, setSavedNotification] = useState<boolean>(false);
  const [hydrateNote] = useState<string | null>(() =>
    initialSheet
      ? `Loaded notes from ${new Date(initialSheet.timestamp).toLocaleString()}`
      : null
  );

  const toggleId = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

  const handleUpdateCanal = (index: number, field: keyof EndoCanalMeasurement, value: any) => {
    const updated = [...canals];
    updated[index] = { ...updated[index], [field]: value };
    setCanals(updated);
  };

  const handleAddCanal = () => {
    setCanals([
      ...canals,
      {
        canal: 'Distal',
        referencePoint: 'Cusp Tip',
        workingLengthMm: 21.0,
        apexLocatorReading: '0.0 (Apex)',
        masterApicalFile: '25 / 0.04',
        masterGuttaPerchaCone: '25 / 0.04',
        sealerType: 'Bioceramic Sealer',
      },
    ]);
  };

  const handleRemoveCanal = (index: number) => {
    setCanals(canals.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (readOnly || !onSaveCaseSheet) return;
    onSaveCaseSheet({
      id: `cs-${Date.now()}`,
      patientId: patient.id,
      targetToothId: selectedTooth,
      timestamp: new Date().toISOString(),
      chiefComplaint,
      historyOfPresentIllness: '',
      clinicalExaminationNotes: clinicalNotes,
      vitalityTests: {
        coldTest: coldTest as any,
        electricPulpTest: eptReading,
        percussionTest: percussion as any,
        palpationTest: palpation as any,
        periodontalProbingDepthMm: probingDepth,
        mobilityGrade: mobility as any,
      },
      endoMeasurements: canals,
      radiographicFindings: '',
      provisionalDiagnosis: diagnosis,
      treatmentPlanSummary: [treatmentPlan, adviceText].filter(Boolean),
      attendingDoctorName: doctorName || doctorSpecialty,
      doctorRegistrationNumber: doctorRegistration,
    });
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className={`space-y-4 ${readOnly ? 'pointer-events-none opacity-70' : ''}`}>
      {/* Header Banner */}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[var(--color-aegean)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-sans">
                {specialtyCaseTitle(specialtyKey)}
              </h2>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">
                1-tap chart
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Target Patient: <strong className="text-slate-800">{patient.fullName}</strong> ({patient.gender}, {patient.age}y) · MRN: {patient.mrn}
              {' · '}
              <span className="text-[var(--color-aegean)] font-medium">{doctorSpecialty}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-semibold text-slate-600">Target Tooth:</label>
            <select
              aria-label="Select Target Tooth for Case Sheet"
              value={selectedTooth}
              onChange={(e) => setSelectedTooth(Number(e.target.value) as ToothId)}
              className="font-mono font-bold text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-900"
            >
              {Object.keys(patient.dentalChart).map((tId) => (
                <option key={tId} value={tId}>
                  Tooth #{tId} ({patient.dentalChart[Number(tId)]?.condition})
                </option>
              ))}
              <option value="16">Tooth #16</option>
              <option value="21">Tooth #21</option>
              <option value="36">Tooth #36</option>
              <option value="46">Tooth #46</option>
              <option value="54">Tooth #54</option>
              <option value="64">Tooth #64</option>
            </select>
          </div>

          {readOnly ? (
            <span className="text-[11px] text-slate-500 font-medium px-2">
              Pilot ended — notes are read-only
            </span>
          ) : onSaveCaseSheet ? (
            <button
              type="button"
              onClick={handleSave}
              className="tactile-btn flex items-center space-x-1.5 bg-[var(--color-aegean)] hover:bg-[var(--color-aegean-hover)] text-white text-xs font-semibold px-3 py-1.5 rounded-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Case Sheet</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Persistence not wired yet"
              className="flex items-center space-x-1.5 bg-slate-100 text-slate-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Autosave pending</span>
            </button>
          )}
        </div>
      </div>

      {savedNotification && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-[var(--color-sage)] flex-shrink-0" />
          <span>Case sheet saved — narrative built from chips (no free typing).</span>
        </div>
      )}

      {/* Specialty procedure picker */}
      <div className="surface-card p-3.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Stethoscope className="w-3.5 h-3.5 text-[var(--color-aegean)]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Today&apos;s procedure ({doctorSpecialty})
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {specialtyProcedures.map((proc) => {
            const active = selectedProcedureId === proc.id;
            return (
              <QuickChip
                key={proc.id}
                label={`${proc.label} · ${formatPaiseToInr(proc.typicalFeePaise, false)}`}
                selected={active}
                onClick={() => {
                  setSelectedProcedureId(proc.id);
                  setTreatmentPlan(
                    `${proc.label} for tooth #${selectedTooth}${
                      proc.needsConsent ? ' · consent required' : ''
                    }`
                  );
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Condition-aware treatment macros */}
      <div className="surface-card p-3.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Smart plan for #{selectedTooth} ({toothCondition})
        </h3>
        <div className="flex flex-wrap gap-2">
          {macrosForCondition(toothCondition).map((macro) => (
            <QuickChip
              key={macro.id}
              label={`${macro.label} · ${macro.minutes}m · ${formatPaiseToInr(macro.typicalFeePaise, false)}`}
              onClick={() => {
                setDiagnosis(`${macro.diagnosis} in relation to #${selectedTooth}`);
                setTreatmentPlan(formatMacroLine(macro, selectedTooth));
              }}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs">
        <div>
          <span className="text-slate-500">Selected Clinical Site: </span>
          <strong className="text-slate-900 font-bold">{getAnatomicalToothName(selectedTooth)}</strong>
        </div>
        <div className="flex items-center space-x-3 text-slate-600">
          <span>
            Operating Specialist:{' '}
            <strong>{doctorName || doctorSpecialty}</strong>
          </span>
          {doctorRegistration ? (
            <span>
              Reg: <strong>{doctorRegistration}</strong>
            </span>
          ) : null}
        </div>
      </div>

      {(hydrateNote || savedNotification) && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
          {savedNotification ? 'Notes saved on this device.' : hydrateNote}
        </div>
      )}

      {/* Zero-typing complaint + findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card p-4 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Chief complaints
          </label>
          <div className="flex flex-wrap gap-2">
            {PAIN_CHIPS.map((c) => (
              <QuickChip
                key={c.id}
                label={c.label}
                selected={painChipIds.includes(c.id)}
                onClick={() => setPainChipIds(toggleId(painChipIds, c.id))}
              />
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duration</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_CHIPS.map((c) => (
              <QuickChip
                key={c.id}
                label={c.label}
                selected={durationChipId === c.id}
                muted
                onClick={() => setDurationChipId(durationChipId === c.id ? null : c.id)}
              />
            ))}
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2 min-h-[1.25rem]">
            {chiefComplaint || (
              <span className="text-slate-400 italic">Tap chips to build chief complaint</span>
            )}
          </p>
        </div>

        <div className="surface-card p-4 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Clinical examination
          </label>
          <div className="flex flex-wrap gap-2">
            {FINDING_CHIPS.map((c) => (
              <QuickChip
                key={c.id}
                label={c.label}
                selected={findingChipIds.includes(c.id)}
                onClick={() => setFindingChipIds(toggleId(findingChipIds, c.id))}
              />
            ))}
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2 min-h-[1.25rem]">
            {clinicalNotes || (
              <span className="text-slate-400 italic">Tap chips to build findings</span>
            )}
          </p>
        </div>
      </div>

      {/* Section 2: Chairside Pulp Vitality Tests */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>Pulp Vitality & Periapical Diagnostic Tests</span>
          </h3>
          <span className="text-[11px] text-slate-500">Thermal · Electric · Mechanical</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cold Test (Endo-Frost):</label>
            <select
              aria-label="Cold Test Result"
              value={coldTest}
              onChange={(e) => setColdTest(e.target.value)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-medium bg-slate-50"
            >
              <option value="NORMAL">Normal (Transient)</option>
              <option value="HYPERSENSITIVE">Hypersensitive</option>
              <option value="LINGERING">Lingering Pain (&gt;10s)</option>
              <option value="NON_RESPONSIVE">Non-Responsive (Necrotic)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Electric Pulp Test:</label>
            <select
              aria-label="Electric Pulp Test Result"
              value={eptReading}
              onChange={(e) => setEptReading(e.target.value)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-medium bg-slate-50"
            >
              <option value="1-20 / Normal">1–20 / Normal response</option>
              <option value="21-40 / Mild delay">21–40 / Mild delay</option>
              <option value="41-60 / Delayed">41–60 / Delayed</option>
              <option value="72/80 (Delayed / Degenerating)">72/80 · Delayed / Degenerating</option>
              <option value="80/80 Non-responsive (Necrotic)">80/80 · Non-responsive (Necrotic)</option>
              <option value="False positive (metal restoration)">False positive (metal restoration)</option>
              <option value="Not recorded">Not recorded</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vertical Percussion:</label>
            <select
              aria-label="Vertical Percussion Test Result"
              value={percussion}
              onChange={(e) => setPercussion(e.target.value)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-medium bg-slate-50"
            >
              <option value="NEGATIVE">Negative (No Pain)</option>
              <option value="MILD_TENDERNESS">Mild Tenderness</option>
              <option value="SEVERE_PAIN">Severe Pain (Acute Periodontitis)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vestibular Palpation:</label>
            <select
              aria-label="Vestibular Palpation Test Result"
              value={palpation}
              onChange={(e) => setPalpation(e.target.value)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-medium bg-slate-50"
            >
              <option value="NEGATIVE">Negative</option>
              <option value="TENDER">Tender at Apex</option>
              <option value="SWELLING_PRESENT">Fluctuant Swelling</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Probing Depth (mm):</label>
            <input
              type="number"
              step="0.5"
              value={probingDepth}
              onChange={(e) => setProbingDepth(parseFloat(e.target.value) || 0)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-mono bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mobility Grade:</label>
            <select
              aria-label="Mobility Grade Test Result"
              value={mobility}
              onChange={(e) => setMobility(e.target.value)}
              className="w-full text-xs p-1.5 rounded border border-slate-200 font-medium bg-slate-50"
            >
              <option value="GRADE_0">Grade 0 (Physiologic)</option>
              <option value="GRADE_I">Grade I (&lt;1mm horizontal)</option>
              <option value="GRADE_II">Grade II (&gt;1mm horizontal)</option>
              <option value="GRADE_III">Grade III (Vertical depressible)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Endodontic canal matrix — only for endodontists */}
      {showEndoMatrix && (
      <div className="surface-card p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Endodontic Working Length & Canal Preparation Matrix
            </h3>
            <p className="text-[11px] text-slate-500">
              Electronic Apex Locator + Radiographic verification log for root canal obturation
            </p>
          </div>
          <button
            onClick={handleAddCanal}
            className="tactile-btn flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded border border-slate-300 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Canal</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2">Canal</th>
                <th className="p-2">Reference Point</th>
                <th className="p-2">Working Length (mm)</th>
                <th className="p-2">Apex Locator Reading</th>
                <th className="p-2">Master Apical File (MAF)</th>
                <th className="p-2">Master Cone (GP)</th>
                <th className="p-2">Sealer</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {canals.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-2">
                    <select
                      aria-label={`Canal name row ${idx + 1}`}
                      value={c.canal}
                      onChange={(e) => handleUpdateCanal(idx, 'canal', e.target.value)}
                      className="w-full min-w-[96px] font-mono font-bold text-xs p-1.5 rounded border border-slate-200 bg-blue-50 text-blue-900 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                    >
                      {!CANAL_OPTIONS.includes(c.canal as (typeof CANAL_OPTIONS)[number]) && (
                        <option value={c.canal}>{c.canal}</option>
                      )}
                      {CANAL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      aria-label={`Reference point row ${idx + 1}`}
                      value={c.referencePoint}
                      onChange={(e) => handleUpdateCanal(idx, 'referencePoint', e.target.value)}
                      className="w-full min-w-[120px] text-xs p-1.5 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                    >
                      {!REFERENCE_POINT_OPTIONS.includes(
                        c.referencePoint as (typeof REFERENCE_POINT_OPTIONS)[number]
                      ) && <option value={c.referencePoint}>{c.referencePoint}</option>}
                      {REFERENCE_POINT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.5"
                      value={c.workingLengthMm}
                      onChange={(e) => handleUpdateCanal(idx, 'workingLengthMm', parseFloat(e.target.value) || 0)}
                      className="w-20 font-mono font-bold text-xs p-1 rounded border border-slate-200 bg-emerald-50 text-emerald-900"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={c.apexLocatorReading}
                      onChange={(e) => handleUpdateCanal(idx, 'apexLocatorReading', e.target.value)}
                      className="w-full text-xs p-1 rounded border border-slate-200 font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={c.masterApicalFile}
                      onChange={(e) => handleUpdateCanal(idx, 'masterApicalFile', e.target.value)}
                      className="w-full text-xs p-1 rounded border border-slate-200 font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={c.masterGuttaPerchaCone}
                      onChange={(e) => handleUpdateCanal(idx, 'masterGuttaPerchaCone', e.target.value)}
                      className="w-full text-xs p-1 rounded border border-slate-200 font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      aria-label={`Sealer row ${idx + 1}`}
                      value={c.sealerType}
                      onChange={(e) => handleUpdateCanal(idx, 'sealerType', e.target.value)}
                      className="w-full min-w-[130px] text-xs p-1.5 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                    >
                      {!SEALER_OPTIONS.includes(c.sealerType as (typeof SEALER_OPTIONS)[number]) && (
                        <option value={c.sealerType}>{c.sealerType}</option>
                      )}
                      {SEALER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveCanal(idx)}
                      className="tactile-btn text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title="Remove Canal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Section 4: Diagnosis & Treatment Plan (read-only narrative from chips/macros) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Diagnosis (from smart plan tap)
          </label>
          <p className="text-xs p-2.5 rounded border border-slate-200 bg-slate-50 leading-relaxed min-h-[3rem] text-slate-600">
            {diagnosis || (
              <span className="text-slate-400 italic">Tap a smart plan chip to set diagnosis</span>
            )}
          </p>
        </div>

        <div className="surface-card p-4 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Plan + advice chips
          </label>
          <p className="text-xs p-2.5 rounded border border-slate-200 bg-slate-50 leading-relaxed text-slate-600">
            {treatmentPlan || (
              <span className="text-slate-400 italic">Tap procedure or smart plan to set plan</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {ADVICE_CHIPS.map((c) => (
              <QuickChip
                key={c.id}
                label={c.label}
                selected={adviceChipIds.includes(c.id)}
                muted
                onClick={() => setAdviceChipIds(toggleId(adviceChipIds, c.id))}
              />
            ))}
          </div>
          {adviceText ? (
            <p className="text-[12px] text-slate-600">{adviceText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
