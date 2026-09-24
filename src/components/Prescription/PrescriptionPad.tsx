import React, { useMemo, useState } from 'react';
import { Patient } from '../../domain/types';
import {
  PrescribedDrug,
  INDIAN_DENTAL_DRUG_MASTER,
  assertPrescriptionSafeToIssue,
  buildSafeStarterRegimen,
  checkPrescriptionAllergies,
  interceptDrugAddition,
} from '../../domain/prescription';
import {
  RX_ADULT_BUNDLES,
  RX_PEDO_AGE_CHIPS,
  POST_CARE_LOCALES,
  applyRxBundle,
  buildPostCareWhatsAppMessage,
  type PostCareLocale,
  type RxBundleId,
} from '../../domain/rxBundles';
import { Pill, Plus, Trash2, Printer, ShieldAlert, CheckCircle2, ExternalLink, Save, Mic, MicOff, Sparkles } from 'lucide-react';
import { PrintPreviewModal } from '../Print/PrintPreviewModal';
import { ClinicBranding } from '../../lib/clinicBranding';
import { QuickChip } from '../ui/QuickChip';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { buildPatientWhatsAppUrl } from '../../lib/settings';
import { ADVICE_CHIPS, buildAdviceNarrative } from '../../domain/clinicalChips';
import {
  latestPrescriptionForPatient,
  persistPrescription,
} from '../../lib/clinicalPersistence';

interface PrescriptionPadProps {
  patient: Patient;
  doctorName?: string;
  doctorRegistration?: string;
  clinicName?: string;
  branding?: ClinicBranding;
  clinicDbId?: string | null;
}

export const PrescriptionPad: React.FC<PrescriptionPadProps> = ({
  patient,
  doctorName = '',
  doctorRegistration = '',
  clinicName = 'AuraSmile Dental',
  branding,
  clinicDbId = null,
}) => {
  const saved = latestPrescriptionForPatient(patient.id);
  const [drugs, setDrugs] = useState<PrescribedDrug[]>(() =>
    saved?.drugs?.length ? saved.drugs : buildSafeStarterRegimen(patient.medicalAlerts)
  );
  const [issueError, setIssueError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(
    saved ? `Loaded Rx from ${new Date(saved.issuedAtIso).toLocaleString()}` : null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDrugBrand, setSelectedDrugBrand] = useState(
    INDIAN_DENTAL_DRUG_MASTER[0]?.brandName ?? ''
  );

  const [diagnosis, setDiagnosis] = useState<string>(saved?.diagnosis ?? '');
  const [adviceChipIds, setAdviceChipIds] = useState<string[]>(['saline', 'soft-diet', 'follow-up']);
  const advice = useMemo(() => buildAdviceNarrative(adviceChipIds), [adviceChipIds]);
  const [waLocale, setWaLocale] = useState<PostCareLocale>('en');

  const allergyCheck = useMemo(
    () => checkPrescriptionAllergies(patient.medicalAlerts, drugs),
    [patient.medicalAlerts, drugs]
  );

  const handleApplyBundle = (bundleId: RxBundleId) => {
    const result = applyRxBundle(bundleId, patient.medicalAlerts);
    if (!result.ok) {
      setIssueError(result.error);
      return;
    }
    setIssueError(null);
    setDrugs(result.drugs);
    setDiagnosis(result.diagnosis);
  };

  const postCareWaUrl = useMemo(() => {
    const first = patient.fullName.split(' ')[0] || 'Patient';
    const msg = buildPostCareWhatsAppMessage({
      patientFirstName: first,
      clinicName: branding?.legalName ?? clinicName,
      diagnosis,
      drugs,
      advice,
      locale: waLocale,
    });
    return buildPatientWhatsAppUrl(patient.phoneNumber, msg);
  }, [patient, branding, clinicName, diagnosis, drugs, advice, waLocale]);

  const handleAddSelectedDrug = () => {
    const masterDrug = INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName === selectedDrugBrand);
    if (!masterDrug) return;
    handleAddDrug(masterDrug);
  };

  const handleAddDrug = (masterDrug: (typeof INDIAN_DENTAL_DRUG_MASTER)[0]) => {
    setIssueError(null);
    const result = interceptDrugAddition(
      patient.medicalAlerts,
      { ...masterDrug, durationDays: 5 },
      drugs
    );
    if (!result.allowed) {
      setIssueError(result.reason);
      return;
    }
    setDrugs([...drugs, result.drug]);
  };

  const handleRemoveDrug = (drugId: string) => {
    setIssueError(null);
    setDrugs(drugs.filter((d) => d.id !== drugId));
  };

  const handleSubstituteAlternative = (targetAlternative: string) => {
    setIssueError(null);
    const filtered = drugs.filter(
      (d) => d.drugClass !== 'PENICILLIN' && d.drugClass !== 'CEPHALOSPORIN'
    );
    const isAzithro = targetAlternative.includes('Azithromycin');
    const substitute = isAzithro
      ? INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName.includes('Azee'))!
      : INDIAN_DENTAL_DRUG_MASTER.find((d) => d.brandName.includes('Dalacin'))!;

    setDrugs([
      ...filtered,
      {
        ...substitute,
        id: `drg-${Date.now()}`,
        durationDays: isAzithro ? 3 : 5,
      },
    ]);
  };

  // VoiceRx Chairside Prescription Dictation
  const [isVoiceRxListening, setIsVoiceRxListening] = useState(false);
  const [voiceRxFeedback, setVoiceRxFeedback] = useState<string | null>(null);

  const startVoiceRxDictation = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsVoiceRxListening(true);
        setVoiceRxFeedback('Listening... Speak medicine name (e.g. "Augmentin 625 with Zerodol-SP for 5 days")');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceRxFeedback(`Transcribed: "${transcript}"`);
        parseAndAddVoiceDrugs(transcript);
      };

      recognition.onerror = () => {
        setIsVoiceRxListening(false);
        setVoiceRxFeedback('Could not capture audio. Please try again.');
      };

      recognition.onend = () => {
        setIsVoiceRxListening(false);
      };

      recognition.start();
    } catch {
      setIsVoiceRxListening(false);
      setVoiceRxFeedback('Audio capture error.');
    }
  };

  const parseAndAddVoiceDrugs = (spokenText: string) => {
    const lower = spokenText.toLowerCase();
    const matchedDrugs: (typeof INDIAN_DENTAL_DRUG_MASTER)[0][] = [];

    for (const master of INDIAN_DENTAL_DRUG_MASTER) {
      const brandWord = master.brandName.toLowerCase().split(/\s+/)[0];
      const genericWord = master.genericName.toLowerCase().split(/\s+/)[0];
      if (lower.includes(brandWord) || (genericWord.length > 4 && lower.includes(genericWord))) {
        matchedDrugs.push(master);
      }
    }

    if (matchedDrugs.length === 0) {
      // Check for common synonyms
      if (lower.includes('pain') || lower.includes('analgesic') || lower.includes('combiflam')) {
        const d = INDIAN_DENTAL_DRUG_MASTER.find((m) => m.brandName.includes('Zerodol'));
        if (d) matchedDrugs.push(d);
      }
      if (lower.includes('antibiotic') || lower.includes('amox') || lower.includes('augmentin')) {
        const d = INDIAN_DENTAL_DRUG_MASTER.find((m) => m.brandName.includes('Moxikind'));
        if (d) matchedDrugs.push(d);
      }
      if (lower.includes('mouthwash') || lower.includes('rinse')) {
        const d = INDIAN_DENTAL_DRUG_MASTER.find((m) => m.brandName.includes('Hexidine'));
        if (d) matchedDrugs.push(d);
      }
    }

    if (matchedDrugs.length === 0) {
      setVoiceRxFeedback(`Could not identify drug brand from: "${spokenText}". Try "Moxikind", "Zerodol-SP", or "Azee".`);
      return;
    }

    let addedCount = 0;
    matchedDrugs.forEach((d) => {
      const result = interceptDrugAddition(
        patient.medicalAlerts,
        { ...d, durationDays: lower.includes('3 day') ? 3 : 5 },
        drugs
      );
      if (result.allowed) {
        setDrugs((prev) => [...prev, result.drug]);
        addedCount++;
      } else {
        setIssueError(result.reason);
      }
    });

    if (addedCount > 0) {
      setVoiceRxFeedback(`Added ${addedCount} medicine(s) via VoiceRx AI.`);
    }
  };

  const handleOpenPreview = () => {
    try {
      assertPrescriptionSafeToIssue(patient.medicalAlerts, drugs);
      setIssueError(null);
      setPreviewOpen(true);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Cannot preview unsafe prescription');
    }
  };

  const handleSaveRx = () => {
    try {
      assertPrescriptionSafeToIssue(patient.medicalAlerts, drugs);
      setIssueError(null);
      persistPrescription({
        patientId: patient.id,
        patientMrn: patient.mrn,
        patientName: patient.fullName,
        doctorName: doctorName || 'Doctor',
        doctorRegistration,
        diagnosis: diagnosis || 'Dental treatment',
        drugs,
        advice,
        issuedAtIso: new Date().toISOString(),
        clinicDbId,
      }).then((result) => {
        setSaveNote(
          result.storage === 'local+supabase'
            ? 'Prescription saved locally + Supabase.'
            : 'Prescription saved on this device.'
        );
      });
      setSaveNote('Saving prescription…');
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Cannot save unsafe prescription');
    }
  };

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-4 animate-[workspaceIn_180ms_ease-out]">
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[var(--color-aegean)]">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-sans">Prescription (Rx)</h2>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">
                1-tap packs
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Patient: <strong className="text-slate-800">{patient.fullName}</strong> ({patient.gender},{' '}
              {patient.age}y) · MRN: <span className="font-mono">{patient.mrn}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {POST_CARE_LOCALES.map((loc) => (
              <QuickChip
                key={loc.id}
                label={loc.label}
                selected={waLocale === loc.id}
                muted
                onClick={() => setWaLocale(loc.id)}
              />
            ))}
          </div>
          <a
            href={postCareWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-[var(--color-sage-muted)] hover:bg-slate-100"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            Send Rx & post-care
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
          <button
            type="button"
            onClick={startVoiceRxDictation}
            disabled={isVoiceRxListening}
            className={`tactile-btn flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-all shadow-2xs ${
              isVoiceRxListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:opacity-95'
            }`}
            title="Speech-to-Prescription with Indian Dental Drug Master"
          >
            {isVoiceRxListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Listening...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>VoiceRx AI</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSaveRx}
            disabled={allergyCheck.hasCriticalWarning || drugs.length === 0}
            className="tactile-btn flex items-center space-x-1.5 text-xs border border-slate-200 bg-white text-slate-700 font-semibold px-3 py-1.5 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Rx</span>
          </button>
          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={allergyCheck.hasCriticalWarning || drugs.length === 0}
            className="tactile-btn flex items-center space-x-1.5 text-xs bg-[var(--color-aegean)] hover:bg-[var(--color-aegean-hover)] text-white font-semibold px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Preview & Print</span>
          </button>
        </div>
      </div>

      {voiceRxFeedback && (
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs text-teal-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="font-medium">{voiceRxFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceRxFeedback(null)}
            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveNote && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
          {saveNote}
        </div>
      )}

      {issueError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-medium">
          {issueError}
        </div>
      )}

      {allergyCheck.hasCriticalWarning && (
        <div className="p-4 rounded-lg bg-red-50 border-2 border-red-400 text-red-900 space-y-2">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-red-950">
                Critical allergy — print blocked
              </h3>
              <p className="text-xs mt-0.5 leading-relaxed font-medium">{allergyCheck.warningMessage}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-red-200 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-red-950">Safe substitution:</span>
            <button
              type="button"
              onClick={() => handleSubstituteAlternative('Clindamycin')}
              className="tactile-btn text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded"
            >
              Use Dalacin C (Clindamycin)
            </button>
            <button
              type="button"
              onClick={() => handleSubstituteAlternative('Azithromycin')}
              className="tactile-btn text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
            >
              Use Azee 500 (Azithromycin)
            </button>
          </div>
        </div>
      )}

      <div className="surface-card p-4 space-y-3">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
          1-tap Rx packs (no typing)
        </label>
        <div className="flex flex-wrap gap-2">
          {RX_ADULT_BUNDLES.map((b) => (
            <QuickChip
              key={b.id}
              label={b.label}
              title={b.summary}
              onClick={() => handleApplyBundle(b.id)}
            />
          ))}
        </div>
        <div className="pt-1">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">
            Pediatric Pain Pack · Ibugesic-Plus by age
          </p>
          <div className="flex flex-wrap gap-2">
            {RX_PEDO_AGE_CHIPS.map((b) => (
              <QuickChip
                key={b.id}
                label={b.id === 'pedo-pain-3-5' ? '3-5 yrs' : '6-10 yrs'}
                title={b.summary}
                muted
                onClick={() => handleApplyBundle(b.id)}
              />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Allergy guard still blocks unsafe antibiotics when the pack is applied.
        </p>
      </div>

      <div className="surface-card p-4">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
          Add single medicine (optional)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select medicine to add"
            value={selectedDrugBrand}
            onChange={(e) => setSelectedDrugBrand(e.target.value)}
            className="flex-1 min-w-[220px] text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-aegean)]/25"
          >
            {INDIAN_DENTAL_DRUG_MASTER.map((drug) => (
              <option key={drug.brandName} value={drug.brandName}>
                {drug.brandName} — {drug.genericName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddSelectedDrug}
            className="tactile-btn inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[var(--color-aegean)] text-white hover:bg-[var(--color-aegean-hover)]"
          >
            <Plus className="w-4 h-4" />
            Add to Rx
          </button>
        </div>
      </div>

      <div className="surface-card p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Prescribed medications
          </h3>
          <span className="font-mono text-xs text-slate-500">{drugs.length} drugs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5">Brand</th>
                <th className="p-2.5">Generic</th>
                <th className="p-2.5">Strength</th>
                <th className="p-2.5">Freq</th>
                <th className="p-2.5">Timing</th>
                <th className="p-2.5">Days</th>
                <th className="p-2.5">Instructions</th>
                <th className="p-2.5 text-center">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {drugs.map((drug) => (
                <tr
                  key={drug.id}
                  className={
                    (drug.drugClass === 'PENICILLIN' || drug.drugClass === 'CEPHALOSPORIN') &&
                    allergyCheck.hasCriticalWarning
                      ? 'bg-red-50/80'
                      : 'hover:bg-slate-50/80'
                  }
                >
                  <td className="p-2.5">
                    <strong className="text-slate-900">{drug.brandName}</strong>
                  </td>
                  <td className="p-2.5 text-slate-600 max-w-xs">{drug.genericName}</td>
                  <td className="p-2.5 font-mono font-medium">{drug.strength}</td>
                  <td className="p-2.5">
                    <span className="font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[11px]">
                      {drug.frequency}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px] font-medium text-slate-700">
                    {drug.timing.replace('_', ' ')}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">{drug.durationDays}</td>
                  <td className="p-2.5 text-slate-600 max-w-xs truncate">{drug.instructions}</td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveDrug(drug.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Diagnosis
            </label>
            <p className="w-full text-xs p-2 rounded border border-slate-200 bg-slate-50 min-h-[2.5rem]">
              {diagnosis}
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Advice chips
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ADVICE_CHIPS.map((c) => (
                <QuickChip
                  key={c.id}
                  label={c.label}
                  selected={adviceChipIds.includes(c.id)}
                  muted
                  onClick={() =>
                    setAdviceChipIds((ids) =>
                      ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]
                    )
                  }
                />
              ))}
            </div>
            <p className="text-xs text-slate-600">{advice}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Doctor: <strong className="text-slate-800">{doctorName}</strong> ·{' '}
            <span className="font-mono">{doctorRegistration}</span>
          </div>
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready when allergy-safe
          </span>
        </div>
      </div>

      <PrintPreviewModal
        open={previewOpen}
        title="Prescription preview"
        subtitle="Check the Rx, then print for the patient"
        onClose={() => setPreviewOpen(false)}
      >
        <div className="space-y-5 text-slate-900">
          <header className="border-b border-slate-300 pb-4 flex justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {branding?.logoDataUrl && (
                <img
                  src={branding.logoDataUrl}
                  alt=""
                  className="w-14 h-14 rounded-xl object-contain shrink-0 border border-slate-100"
                />
              )}
              <div className="min-w-0">
                <div className="text-lg font-bold tracking-tight">
                  {branding?.legalName ?? clinicName}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {branding?.tagline ?? 'Dental Prescription'}
                </div>
                {branding && (
                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {branding.addressLine}, {branding.cityLine}
                    <br />
                    {branding.phone} · {branding.email}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 shrink-0">
              <div className="font-semibold text-teal-700 uppercase tracking-wide text-[10px]">
                Prescription
              </div>
              <div className="mt-1">
                Date: <strong className="text-slate-900">{todayLabel}</strong>
              </div>
              <div className="mt-1 font-mono">{patient.mrn}</div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 uppercase text-[10px] font-semibold">Patient</div>
              <div className="font-semibold text-sm mt-0.5">
                {patient.fullName} ({patient.gender}, {patient.age}y)
              </div>
              <div className="text-slate-600">{patient.phoneNumber}</div>
            </div>
            <div>
              <div className="text-slate-500 uppercase text-[10px] font-semibold">Doctor</div>
              <div className="font-semibold text-sm mt-0.5">{doctorName}</div>
              <div className="font-mono text-slate-600">{doctorRegistration}</div>
            </div>
          </section>

          <section className="text-xs">
            <div className="text-slate-500 uppercase text-[10px] font-semibold">Diagnosis</div>
            <p className="mt-1 font-medium">{diagnosis}</p>
          </section>

          <section>
            <div className="text-slate-500 uppercase text-[10px] font-semibold mb-2">Rx</div>
            <ol className="space-y-3">
              {drugs.map((drug, idx) => (
                <li key={drug.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="font-semibold">
                    {idx + 1}. {drug.brandName}{' '}
                    <span className="font-normal text-slate-600">({drug.genericName})</span>
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    {drug.strength} · {drug.form} · {drug.frequency} · {drug.timing.replace('_', ' ')} ·{' '}
                    {drug.durationDays} days
                  </div>
                  {drug.instructions && (
                    <div className="text-xs text-slate-500 mt-0.5">{drug.instructions}</div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="text-xs">
            <div className="text-slate-500 uppercase text-[10px] font-semibold">Advice</div>
            <p className="mt-1">{advice}</p>
          </section>

          <footer className="pt-8 text-xs text-slate-600 flex justify-between gap-4">
            <div>
              {branding?.registrationFooter ?? 'Patient copy'}
              <div className="mt-1 text-slate-400">Not for medico-legal without signature</div>
            </div>
            <div className="text-right">
              <div className="border-t border-slate-400 w-44 ml-auto pt-1 font-medium text-slate-900">
                {doctorName}
              </div>
              <div className="font-mono text-[10px] mt-0.5">{doctorRegistration}</div>
            </div>
          </footer>
        </div>
      </PrintPreviewModal>
    </div>
  );
};
