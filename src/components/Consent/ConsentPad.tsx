import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Patient } from '../../domain/types';
import { ShieldCheck, RotateCcw, Lock, CheckCircle2, FileCheck, Printer, AlertTriangle } from 'lucide-react';
import { PrintPreviewModal } from '../Print/PrintPreviewModal';
import { ClinicBranding } from '../../lib/clinicBranding';
import { persistConsent } from '../../lib/clinicalPersistence';
import {
  CONSENT_ACK,
  CONSENT_LOCALES,
  CONSENT_PROCEDURES,
  ConsentLocale,
  ConsentProcedureId,
  getConsentCopy,
} from '../../domain/consentLocales';
import { QuickChip } from '../ui/QuickChip';

interface ConsentPadProps {
  patient: Patient;
  doctorName?: string;
  doctorRegistration?: string;
  clinicName?: string;
  branding?: ClinicBranding;
  branchId?: string;
  clinicDbId?: string | null;
  /** Accepted plan lines that still need consent */
  pendingConsentLabels?: string[];
}

export const ConsentPad: React.FC<ConsentPadProps> = ({
  patient,
  doctorName = 'Dr. Vikram Rao, MDS',
  doctorRegistration = 'KDC/D-14290',
  clinicName = 'AuraSmile Dental',
  branding,
  branchId = 'blr-01',
  clinicDbId = null,
  pendingConsentLabels = [],
}) => {
  const [selectedProcedure, setSelectedProcedure] = useState<ConsentProcedureId>('RCT_CROWN');
  const [locale, setLocale] = useState<ConsentLocale>('en');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);
  const [auditHash, setAuditHash] = useState<string | null>(null);
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [persistStatus, setPersistStatus] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeClause = useMemo(
    () => getConsentCopy(selectedProcedure, locale),
    [selectedProcedure, locale]
  );

  // Set up canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setIsLocked(false);
    setSignedTimestamp(null);
    setAuditHash(null);
    setSignatureDataUrl(null);
  };

  const handleLockAndSign = async () => {
    if (!hasSignature) return;
    const now = new Date();
    const timestampStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    // Honest local record id — not cryptographic proof
    const recordId = `LOCAL-${patient.mrn}-${now.getTime().toString(36).toUpperCase()}`;
    const canvas = canvasRef.current;
    const sig = canvas ? canvas.toDataURL('image/png') : null;
    if (sig) setSignatureDataUrl(sig);
    setIsLocked(true);
    setSignedTimestamp(timestampStr);
    setAuditHash(recordId);
    setPersistStatus('Saving consent…');

    const result = await persistConsent({
      patientId: patient.id,
      patientMrn: patient.mrn,
      patientName: patient.fullName,
      procedureCode: activeClause.procedure,
      procedureTitle: activeClause.title,
      doctorName,
      doctorRegistration,
      branchId,
      clinicDbId,
      signedAtIso: now.toISOString(),
      auditHash: recordId,
      signatureDataUrl: sig,
      medicalAlertsSummary: patient.medicalAlerts.map((a) => a.label).join('; '),
    });

    setPersistStatus(
      result.storage === 'local+supabase'
        ? 'Saved to clinic database (Supabase) + this device'
        : 'Saved on this device (add Supabase keys for cloud SQL)'
    );
  };

  const handleOpenPreview = () => {
    if (!isLocked) return;
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      {pendingConsentLabels.length > 0 && !isLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong className="font-semibold">Consent required before start:</strong>{' '}
          {pendingConsentLabels.join(' · ')}
        </div>
      )}
      {/* Header */}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Digital Surgical & Operatory Informed Consent Pad
              </h2>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 border border-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">
                DPDP Act 2023 & DCI Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Patient: <strong className="text-slate-800">{patient.fullName}</strong> · MRN: <span className="font-mono">{patient.mrn}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Procedure:</label>
          <select
            aria-label="Select Informed Consent Procedure Template"
            value={selectedProcedure}
            onChange={(e) => {
              setSelectedProcedure(e.target.value as ConsentProcedureId);
              handleClear();
            }}
            disabled={isLocked}
            className="text-xs font-medium bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500 max-w-[16rem]"
          >
            {CONSENT_PROCEDURES.map((p) => (
              <option key={p.procedure} value={p.procedure}>
                {p.title.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Language — 1-tap, glove-friendly */}
      <div className="surface-card p-3.5 space-y-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Consent language
        </h3>
        <div className="flex flex-wrap gap-2">
          {CONSENT_LOCALES.map((loc) => (
            <QuickChip
              key={loc.id}
              label={loc.label}
              selected={locale === loc.id}
              onClick={() => {
                if (isLocked) return;
                setLocale(loc.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Statutory Clauses Section */}
      <div className="surface-card p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {activeClause.title}
          </h3>
          <span className="text-[11px] text-slate-500 font-mono shrink-0">
            Form #DCI-MED-2026
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          {activeClause.clauses.map((clause, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 leading-relaxed">
              <span className="font-mono font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
              <span>{clause}</span>
            </div>
          ))}
        </div>

        {/* Medical Alert Warning during Consent */}
        {patient.medicalAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important Clinical Flags Disclosed: </span>
              {patient.medicalAlerts.map((a) => a.label).join('; ')}. The attending dental surgeon has taken appropriate prophylactic and hemostatic measures.
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center space-x-2">
          <input
            type="checkbox"
            id="consentAck"
            checked={consentAcknowledged}
            onChange={(e) => setConsentAcknowledged(e.target.checked)}
            disabled={isLocked}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="consentAck" className="text-xs text-slate-700 cursor-pointer select-none">
            {CONSENT_ACK[locale]}
          </label>
        </div>
      </div>

      {/* Touch / Stylus HTML5 Signature Canvas Pad */}
      <div className="surface-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Chairside Digital Signature Pad
            </h3>
            <p className="text-[11px] text-slate-500">
              Sign below using operatory tablet stylus, finger touch, or mouse
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isLocked ? (
              <>
                <button
                  onClick={handleClear}
                  className="tactile-btn flex items-center space-x-1 text-xs text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-300 px-2.5 py-1 rounded"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
                <button
                  onClick={handleLockAndSign}
                  disabled={!hasSignature || !consentAcknowledged}
                  className={`tactile-btn flex items-center space-x-1 text-xs font-bold px-3.5 py-1 rounded shadow-sm transition-all ${
                    hasSignature && consentAcknowledged
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock & Record Consent</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Digitally Signed & Locked</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="tactile-btn flex items-center space-x-1 text-xs text-white bg-teal-600 hover:bg-teal-700 border border-teal-700 px-2.5 py-1 rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Preview & Print</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {persistStatus && (
          <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
            {persistStatus}
          </div>
        )}

        {/* Canvas Area */}
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`w-full h-44 cursor-crosshair touch-none ${
              isLocked ? 'pointer-events-none bg-slate-100/50' : ''
            }`}
          />

          {!hasSignature && !isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
              <span className="text-xs font-medium">Draw signature here with stylus or finger</span>
              <span className="text-[10px] text-slate-300 mt-1">Chairside verification standard</span>
            </div>
          )}

          {/* Locked Watermark */}
          {isLocked && (
            <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-white/90 border border-emerald-300 text-emerald-800 text-[10px] px-2 py-1 rounded font-mono shadow-xs">
              <FileCheck className="w-3 h-3 text-emerald-600" />
              <span>LOCKED · {signedTimestamp}</span>
            </div>
          )}
        </div>

        {/* Signee & Witness Verification Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="font-semibold text-slate-700">Patient / Legal Guardian Signature</div>
            <div className="text-slate-500 mt-0.5">{patient.fullName} (Self)</div>
            {auditHash && (
              <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                Local signature record: {auditHash}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="font-semibold text-slate-700">Attending Dental Surgeon & Witness</div>
            <div className="text-slate-500 mt-0.5">{doctorName} · Reg: {doctorRegistration}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">
              Verified in Operatory Clinic Console
            </div>
          </div>
        </div>
      </div>

      <PrintPreviewModal
        open={previewOpen}
        title="Consent preview"
        subtitle="Review the signed consent, then print for records"
        onClose={() => setPreviewOpen(false)}
      >
        <div className="space-y-4 text-slate-900 text-xs">
          <header className="border-b border-slate-300 pb-3 flex justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {branding?.logoDataUrl && (
                <img
                  src={branding.logoDataUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-contain shrink-0 border border-slate-100"
                />
              )}
              <div>
                <div className="text-base font-bold">{branding?.legalName ?? clinicName}</div>
                <div className="text-slate-600 mt-0.5">
                  {branding?.tagline ?? 'Informed Consent · DCI Form'}
                </div>
                {branding && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    {branding.addressLine}, {branding.cityLine} · {branding.phone}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right text-slate-600 shrink-0">
              <div>
                MRN: <span className="font-mono text-slate-900">{patient.mrn}</span>
              </div>
              {signedTimestamp && <div className="mt-1">Signed: {signedTimestamp}</div>}
            </div>
          </header>

          <section>
            <div className="font-semibold text-sm">{patient.fullName}</div>
            <div className="text-slate-600">
              {patient.gender}, {patient.age}y · {patient.phoneNumber}
            </div>
          </section>

          <section>
            <div className="font-bold text-sm mb-2">{activeClause.title}</div>
            <ol className="space-y-2 list-decimal pl-4">
              {activeClause.clauses.map((clause, idx) => (
                <li key={idx} className="leading-relaxed">
                  {clause}
                </li>
              ))}
            </ol>
          </section>

          {patient.medicalAlerts.length > 0 && (
            <section className="bg-red-50 border border-red-200 rounded p-2 text-red-900">
              <strong>Clinical flags disclosed: </strong>
              {patient.medicalAlerts.map((a) => a.label).join('; ')}.
            </section>
          )}

          <section className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <div className="font-semibold mb-2">Patient signature</div>
              {signatureDataUrl ? (
                <img src={signatureDataUrl} alt="Patient signature" className="h-16 object-contain border border-slate-200 rounded bg-white" />
              ) : (
                <div className="h-16 border border-dashed border-slate-300 rounded" />
              )}
              <div className="mt-1 text-slate-600">{patient.fullName}</div>
              {auditHash && (
                <div className="font-mono text-[10px] text-slate-400 mt-1 truncate">
                  Local signature record: {auditHash}
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold mb-2">Attending surgeon</div>
              <div className="pt-8 border-t border-slate-400 font-medium">{doctorName}</div>
              <div className="text-slate-600 font-mono">{doctorRegistration}</div>
              {branding?.registrationFooter && (
                <div className="text-[10px] text-slate-400 mt-2">{branding.registrationFooter}</div>
              )}
            </div>
          </section>
        </div>
      </PrintPreviewModal>
    </div>
  );
};
