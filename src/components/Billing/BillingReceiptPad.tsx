import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, IndianRupee, Printer, QrCode, Save } from 'lucide-react';
import { Patient } from '../../domain/types';
import { ClinicBranding } from '../../lib/clinicBranding';
import {
  DENTAL_SAC_CODE,
  buildGstReceipt,
  buildGstWhatsAppReceipt,
  buildUpiPayUrl,
  extractGstin,
  formatPaiseToInr,
  inrToPaise,
  isCosmeticDentalProcedure,
  paiseToInr,
} from '../../domain/financials';
import { PrintPreviewModal } from '../Print/PrintPreviewModal';
import {
  listReceiptsForPatient,
  PaidVia,
  persistReceipt,
  StoredReceipt,
} from '../../lib/receiptRepository';
import { TreatmentPlanLine } from '../../domain/treatmentPlan';
import { listLocalConsents } from '../../lib/clinicalPersistence';
import { applyCaseSpendFromProcedure } from '../../lib/inventoryPersistence';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { buildPatientWhatsAppUrl } from '../../lib/settings';
import { saveDue } from '../../lib/duesRepository';
import { calculateConsultantPayout } from '../../domain/consultants';
import { createConsultantPayout } from '../../lib/consultantPayoutRepository';
import { getMaterialsForProcedure } from '../../data/procedureMaterials';
import { deductInventoryByItemNames } from '../../lib/inventoryPersistence';

interface BillingReceiptPadProps {
  patient: Patient;
  doctorName: string;
  branding: ClinicBranding;
  branchId: string;
  clinicDbId: string | null;
  readOnly?: boolean;
  suggestedProcedure?: string;
  acceptedPlanLines?: TreatmentPlanLine[];
  /** Treating doctor member id — for consultant payout auto-create */
  doctorMemberId?: string | null;
  /** Raw member role — OWNER skips consultant payout */
  doctorMemberRole?: string | null;
}

const PROCEDURE_OPTIONS = [
  'Consultation & examination',
  'Molar RCT + Zirconia crown',
  'Scaling & polishing',
  'Composite restoration',
  'Surgical extraction',
  'Teeth Whitening',
  'Ceramic Veneers',
  'Clear Aligners',
];

export const BillingReceiptPad: React.FC<BillingReceiptPadProps> = ({
  patient,
  doctorName,
  branding,
  branchId,
  clinicDbId,
  readOnly = false,
  suggestedProcedure,
  acceptedPlanLines = [],
  doctorMemberId = null,
  doctorMemberRole = null,
}) => {
  const accepted = acceptedPlanLines.filter((l) => l.acceptance === 'ACCEPTED');
  const needsConsentUnsigned = accepted.filter((l) => l.needsConsent);
  const hasLocalConsent = listLocalConsents().some((c) => c.patientId === patient.id);
  const consentMissing = needsConsentUnsigned.length > 0 && !hasLocalConsent;
  const fromAcceptedPlan =
    accepted.length > 0
      ? {
          procedure: accepted
            .map((l) => `${l.procedureLabel}${l.toothId ? ` #${l.toothId}` : ''}`)
            .join('; '),
          feeInr: paiseToInr(accepted.reduce((sum, l) => sum + l.feePaise, 0)),
        }
      : null;

  const chartPlan =
    suggestedProcedure?.trim() ||
    Object.values(patient.dentalChart)
      .map((t) => t.treatmentPlanned?.trim())
      .find((t) => Boolean(t));

  const initialProcedure =
    fromAcceptedPlan?.procedure || chartPlan || PROCEDURE_OPTIONS[0];
  const initialFee = fromAcceptedPlan?.feeInr ?? (chartPlan ? 0 : 8500);

  const [procedure, setProcedure] = useState(initialProcedure);
  const [feeInr, setFeeInr] = useState(initialFee);
  const [applyGst18, setApplyGst18] = useState(() =>
    isCosmeticDentalProcedure(initialProcedure)
  );
  const [upiVpa, setUpiVpa] = useState('');
  const [paidVia, setPaidVia] = useState<PaidVia>('UNPAID');
  const [collectedInr, setCollectedInr] = useState<number | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<StoredReceipt[]>([]);

  useEffect(() => {
    if (fromAcceptedPlan) {
      setProcedure(fromAcceptedPlan.procedure);
      setFeeInr(fromAcceptedPlan.feeInr);
      setApplyGst18(isCosmeticDentalProcedure(fromAcceptedPlan.procedure));
      return;
    }
    if (chartPlan) {
      setProcedure(chartPlan);
      setApplyGst18(isCosmeticDentalProcedure(chartPlan));
    }
  }, [patient.id, fromAcceptedPlan?.procedure, fromAcceptedPlan?.feeInr, chartPlan]);

  const gstPercent = applyGst18 ? 18 : 0;
  const taxablePaise = inrToPaise(feeInr);
  const receipt = useMemo(
    () => buildGstReceipt(taxablePaise, gstPercent),
    [taxablePaise, gstPercent]
  );
  const collectedPaise =
    collectedInr == null ? receipt.totalPaise : inrToPaise(Math.max(0, collectedInr));
  const balancePaise = Math.max(0, receipt.totalPaise - collectedPaise);

  const gstin = extractGstin(branding.registrationFooter);
  const receiptNo = `RCP-${patient.mrn.replace(/[^A-Z0-9]/gi, '').slice(-8)}-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listReceiptsForPatient(patient.id, clinicDbId);
      if (!cancelled) setHistory(rows.slice(0, 8));
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.id, clinicDbId]);

  let upiUrl: string | null = null;
  let upiError: string | null = null;
  if (!upiVpa.trim()) {
    upiError = 'Enter your clinic UPI VPA to generate a pay link';
  } else {
    try {
      upiUrl = buildUpiPayUrl({
        vpa: upiVpa,
        payeeName: branding.legalName,
        amountPaise: receipt.totalPaise,
        note: `${receiptNo} ${patient.fullName}`,
      });
    } catch (err) {
      upiError = err instanceof Error ? err.message : 'Invalid UPI';
    }
  }

  const waReceiptUrl = useMemo(() => {
    const body = buildGstWhatsAppReceipt({
      clinicName: branding.legalName,
      gstin,
      sacCode: DENTAL_SAC_CODE,
      receiptNo,
      patientName: patient.fullName,
      procedure,
      breakdown: receipt,
      paidVia,
    });
    return buildPatientWhatsAppUrl(patient.phoneNumber, body);
  }, [branding.legalName, gstin, receiptNo, patient, procedure, receipt, paidVia]);

  const handleSave = async () => {
    if (readOnly) {
      setStatus('Pilot ended — read-only. Contact AuraSmile to continue.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const effectivePaidVia: PaidVia =
        paidVia === 'UNPAID' && collectedPaise > 0 && balancePaise > 0
          ? 'CASH'
          : paidVia;
      const result = await persistReceipt({
        receiptNo,
        patientId: patient.id,
        patientMrn: patient.mrn,
        patientName: patient.fullName,
        doctorName,
        branchId,
        clinicDbId,
        procedureTitle: procedure,
        taxablePaise: receipt.taxablePaise,
        gstPercent: receipt.gstPercent,
        cgstPaise: receipt.cgstPaise,
        sgstPaise: receipt.sgstPaise,
        totalPaise: receipt.totalPaise,
        paidVia: effectivePaidVia,
        upiVpa,
        issuedAtIso: new Date().toISOString(),
      });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      let note =
        result.storage === 'local+supabase'
          ? 'Receipt saved locally + Supabase.'
          : clinicDbId
            ? 'Receipt saved locally (Supabase insert pending — check membership/RLS).'
            : 'Receipt saved on this device (demo). Add Supabase clinic login for cloud ledger.';

      if (balancePaise > 0) {
        await saveDue(clinicDbId, {
          patientId: patient.id,
          patientName: patient.fullName,
          phone: patient.phoneNumber,
          totalPaise: receipt.totalPaise,
          collectedPaise,
          balancePaise,
          procedureName: procedure,
          dueDate: new Date().toISOString().slice(0, 10),
          paymentMode: effectivePaidVia,
        });
        note += ` · Balance due ${formatPaiseToInr(balancePaise, false)}.`;
      }

      const spend = applyCaseSpendFromProcedure({
        procedureTitle: procedure,
        doctorName,
        clinicDbId,
      });
      if (spend.ok) {
        note += ` · Materials spent ${formatPaiseToInr(spend.spentPaise)} (Stock ledger).`;
      } else {
        const named = getMaterialsForProcedure(procedure);
        if (named.length) {
          const ded = deductInventoryByItemNames(named, {
            patientName: patient.fullName,
            procedureTitle: procedure,
            clinicDbId,
          });
          if (ded.ok) {
            note += ` · Inventory updated: ${ded.summary}.`;
          }
        }
      }

      if (
        clinicDbId &&
        doctorMemberRole &&
        doctorMemberRole !== 'OWNER' &&
        doctorMemberId &&
        receipt.totalPaise > 0
      ) {
        const share = 60;
        const calc = calculateConsultantPayout(receipt.totalPaise, share, true);
        await createConsultantPayout(clinicDbId, {
          consultantId: doctorMemberId,
          consultantName: doctorName,
          patientId: patient.id,
          patientName: patient.fullName,
          procedureName: procedure,
          procedureDate: new Date().toISOString().slice(0, 10),
          grossFeePaise: receipt.totalPaise,
          consultantSharePercentage: share,
          grossPayoutPaise: calc.grossPayoutPaise,
          tdsWithholdingPaise: calc.tdsWithholdingPaise,
          netPayablePaise: calc.netPayablePaise,
          paymentStatus: 'PENDING',
        });
        note += ' · Consultant payout queued.';
      }

      setStatus(note);
      const rows = await listReceiptsForPatient(patient.id, clinicDbId);
      setHistory(rows.slice(0, 8));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {consentMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>Sign consent first:</strong>{' '}
          {needsConsentUnsigned
            .map((l) => `${l.procedureLabel}${l.toothId ? ` #${l.toothId}` : ''}`)
            .join(' · ')}
          . Scroll up to section 2 · Consent before collecting payment.
        </div>
      )}
      {fromAcceptedPlan && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
          Fee seeded from <strong>accepted plan</strong> ({formatPaiseToInr(inrToPaise(feeInr))}).
        </div>
      )}
      <div>
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-teal-700" />
          Tax invoice · UPI · GST
        </h2>
        <p className="text-[12px] text-slate-500 mt-1">
          Healthcare dental services are GST-exempt. Cosmetic lines (whitening, veneers, aligners)
          can apply 18% (9% CGST + 9% SGST). SAC {DENTAL_SAC_CODE}
          {gstin ? ` · GSTIN ${gstin}` : ''}.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-[11px] text-slate-600 space-y-1 sm:col-span-2">
          <span>Procedure / line item</span>
          <input
            list="bill-procedure-options"
            value={procedure}
            onChange={(e) => {
              const next = e.target.value;
              setProcedure(next);
              if (isCosmeticDentalProcedure(next)) setApplyGst18(true);
            }}
            disabled={readOnly}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white disabled:opacity-40"
            placeholder="From chart plan or type procedure"
          />
          <datalist id="bill-procedure-options">
            {PROCEDURE_OPTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
            {chartPlan && !PROCEDURE_OPTIONS.includes(chartPlan) && (
              <option value={chartPlan} />
            )}
          </datalist>
        </label>
        <label className="text-[11px] text-slate-600 space-y-1">
          <span>Fee (INR)</span>
          <input
            type="number"
            min={0}
            value={feeInr}
            onChange={(e) => setFeeInr(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="text-[11px] text-slate-600 space-y-1">
          <span className="block">GST on cosmetic line</span>
          <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyGst18}
              onChange={(e) => setApplyGst18(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[var(--color-brand)]"
            />
            <span className="leading-snug text-slate-700">
              <strong className="text-slate-900">Apply 18% GST (9% CGST + 9% SGST)</strong>
              <span className="block text-slate-500 mt-0.5">
                Off = healthcare exempt (0%). On for whitening / veneers / clear aligners.
              </span>
            </span>
          </label>
        </div>
        <label className="text-[11px] text-slate-600 space-y-1">
          <span>Clinic UPI VPA</span>
          <input
            value={upiVpa}
            onChange={(e) => setUpiVpa(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono"
            placeholder="clinic@upi"
          />
        </label>
        <label className="text-[11px] text-slate-600 space-y-1">
          <span>Payment status</span>
          <select
            value={paidVia}
            onChange={(e) => setPaidVia(e.target.value as PaidVia)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            <option value="UNPAID">Unpaid / collect now</option>
            <option value="UPI">Paid · UPI</option>
            <option value="CASH">Paid · Cash</option>
            <option value="CARD">Paid · Card</option>
          </select>
        </label>
        <label className="text-[11px] text-slate-600 space-y-1">
          <span>Amount collected today (INR)</span>
          <input
            type="number"
            min={0}
            value={collectedInr ?? paiseToInr(receipt.totalPaise)}
            onChange={(e) => {
              const v = e.target.value;
              setCollectedInr(v === '' ? 0 : Math.max(0, Number(v) || 0));
            }}
            disabled={readOnly}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Can be less than total (advance)"
          />
        </label>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
          <span>SAC {DENTAL_SAC_CODE}</span>
          <span>{gstin ? `GSTIN ${gstin}` : 'GSTIN not set on branding'}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Taxable</span>
          <span className="font-mono">{formatPaiseToInr(receipt.taxablePaise, true)}</span>
        </div>
        {receipt.gstPercent > 0 ? (
          <>
            <div className="flex justify-between text-slate-600">
              <span>CGST (9%)</span>
              <span className="font-mono">{formatPaiseToInr(receipt.cgstPaise, true)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9%)</span>
              <span className="font-mono">{formatPaiseToInr(receipt.sgstPaise, true)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-slate-500 text-xs">
            <span>GST</span>
            <span>Exempt (healthcare)</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2">
          <span>Total bill</span>
          <span className="font-mono">{formatPaiseToInr(receipt.totalPaise, true)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Collected today</span>
          <span className="font-mono">{formatPaiseToInr(collectedPaise, true)}</span>
        </div>
        <div
          className={`flex justify-between font-semibold ${
            balancePaise > 0 ? 'text-amber-800' : 'text-teal-800'
          }`}
        >
          <span>Outstanding due</span>
          <span className="font-mono">{formatPaiseToInr(balancePaise, true)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || readOnly}
          onClick={() => void handleSave()}
          className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md bg-teal-600 text-white disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {busy ? 'Saving…' : 'Save receipt'}
        </button>
        <button
          type="button"
          onClick={() => setPrintOpen(true)}
          className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-800"
        >
          <Printer className="w-3.5 h-3.5" />
          Print tax invoice
        </button>
        <a
          href={waReceiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          WhatsApp receipt
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
        {upiUrl && (
          <a
            href={upiUrl}
            className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-800"
          >
            <QrCode className="w-3.5 h-3.5" />
            Open UPI pay
          </a>
        )}
      </div>
      {upiError && <p className="text-[11px] text-rose-600">{upiError}</p>}
      {status && (
        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
          {status}
        </p>
      )}

      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            Recent receipts · {patient.fullName.split(' ')[0]}
          </h3>
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{row.procedureTitle}</div>
                  <div className="text-slate-400 font-mono">
                    {row.receiptNo} · GST {row.gstPercent}% · {row.paidVia}
                  </div>
                </div>
                <div className="font-mono font-semibold text-slate-900 shrink-0">
                  {formatPaiseToInr(row.totalPaise, true)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PrintPreviewModal
        open={printOpen}
        title="Tax invoice"
        subtitle={receiptNo}
        onClose={() => setPrintOpen(false)}
      >
        <div className="print-sheet p-6 text-slate-900 space-y-4">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
            {branding.logoDataUrl && (
              <img src={branding.logoDataUrl} alt="" className="w-14 h-14 object-contain" />
            )}
            <div>
              <div className="text-base font-bold">{branding.legalName}</div>
              <div className="text-[11px] text-slate-500">{branding.tagline}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {branding.addressLine}, {branding.cityLine} · {branding.phone}
              </div>
              <div className="text-[11px] font-mono text-slate-600 mt-1">
                SAC: {DENTAL_SAC_CODE}
                {gstin ? ` · GSTIN: ${gstin}` : ''}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs">
            <div>
              <div className="font-semibold">Tax Invoice {receiptNo}</div>
              <div className="text-slate-500">Doctor: {doctorName}</div>
            </div>
            <div className="text-right text-slate-500">
              {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </div>
          </div>

          <div className="text-xs bg-slate-50 border border-slate-100 rounded-md p-3">
            <div className="font-semibold">{patient.fullName}</div>
            <div className="text-slate-500">
              MRN {patient.mrn} · {patient.phoneNumber}
            </div>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2">
                  {procedure}
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    HSN/SAC {DENTAL_SAC_CODE}
                  </div>
                </td>
                <td className="py-2 text-right font-mono">
                  {formatPaiseToInr(receipt.taxablePaise, true)}
                </td>
              </tr>
              {receipt.gstPercent > 0 ? (
                <>
                  <tr className="border-b border-slate-100">
                    <td className="py-2">CGST (9%)</td>
                    <td className="py-2 text-right font-mono">
                      {formatPaiseToInr(receipt.cgstPaise, true)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2">SGST (9%)</td>
                    <td className="py-2 text-right font-mono">
                      {formatPaiseToInr(receipt.sgstPaise, true)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">GST (healthcare exempt)</td>
                  <td className="py-2 text-right font-mono">₹0.00</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-end">
            <div className="text-[11px] text-slate-500">
              Status: <strong>{paidVia}</strong>
              {upiUrl && paidVia === 'UNPAID' && (
                <div className="mt-1 font-mono break-all text-[10px]">{upiUrl}</div>
              )}
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-[11px] text-slate-500">
                Collected: <span className="font-mono font-semibold text-slate-800">{formatPaiseToInr(collectedPaise, true)}</span>
              </div>
              <div className={`text-[11px] ${balancePaise > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                Balance Due: <span className="font-mono font-bold">{formatPaiseToInr(balancePaise, true)}</span>
              </div>
              <div className="text-[11px] text-slate-500">Total bill</div>
              <div className="text-lg font-bold font-mono">
                {formatPaiseToInr(receipt.totalPaise, true)}
              </div>
            </div>
          </div>

          {branding.registrationFooter && (
            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
              {branding.registrationFooter}
            </div>
          )}
        </div>
      </PrintPreviewModal>
    </div>
  );
};
