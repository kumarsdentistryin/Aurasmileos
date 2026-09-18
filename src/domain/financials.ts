import { CaseProfitabilityBreakdown, ProcedureFinancialParams } from './types';

/**
 * Converts Indian Rupees (INR) to integer Paise.
 * Uses Math.round to guard against floating-point precision issues during user input parsing.
 */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Converts integer Paise to Indian Rupees (INR).
 */
export function paiseToInr(paise: number): number {
  return paise / 100;
}

/**
 * Formats integer Paise as an Indian Rupee currency string (e.g. ₹8,500.00 or ₹8,500).
 */
export function formatPaiseToInr(paise: number, showDecimals: boolean = false): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(inr);
}

/**
 * Pure calculation engine for dental case-level profitability and visiting specialist split.
 * Enforces USAF Layer 1 invariant: Zero floating-point loss via integer paise.
 */
export function calculateCaseProfitability(params: ProcedureFinancialParams): CaseProfitabilityBreakdown {
  const {
    grossFeePaise,
    isVisitingSpecialist,
    consultantSharePercentage,
    labFeePaise,
    materialsConsumableCostPaise,
  } = params;

  if (grossFeePaise < 0) {
    throw new Error('Gross fee in paise cannot be negative');
  }

  // Calculate doctor/consultant payout in integer paise
  let doctorConsultantPayoutPaise = 0;
  if (isVisitingSpecialist) {
    const validSharePercent = Math.min(Math.max(consultantSharePercentage, 0), 100);
    doctorConsultantPayoutPaise = Math.round((grossFeePaise * validSharePercent) / 100);
  }

  const labExpensePaise = Math.max(0, Math.round(labFeePaise));
  const consumablesExpensePaise = Math.max(0, Math.round(materialsConsumableCostPaise));

  const totalDirectCostPaise = doctorConsultantPayoutPaise + labExpensePaise + consumablesExpensePaise;
  const netClinicContributionMarginPaise = grossFeePaise - totalDirectCostPaise;

  const profitMarginPercentage = grossFeePaise > 0
    ? Number(((netClinicContributionMarginPaise / grossFeePaise) * 100).toFixed(2))
    : 0;

  return {
    grossFeePaise,
    doctorConsultantPayoutPaise,
    labExpensePaise,
    consumablesExpensePaise,
    totalDirectCostPaise,
    netClinicContributionMarginPaise,
    profitMarginPercentage,
  };
}

export type GstReceiptBreakdown = {
  taxablePaise: number;
  gstPercent: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
};

/**
 * Split GST into CGST+SGST (intra-state). Use gstPercent=0 for healthcare-exempt receipts.
 */
export function buildGstReceipt(taxablePaise: number, gstPercent: number): GstReceiptBreakdown {
  if (!Number.isInteger(taxablePaise) || taxablePaise < 0) {
    throw new Error('Taxable amount must be non-negative integer paise');
  }
  const pct = Math.min(Math.max(gstPercent, 0), 28);
  const gstTotal = Math.round((taxablePaise * pct) / 100);
  const cgstPaise = Math.floor(gstTotal / 2);
  const sgstPaise = gstTotal - cgstPaise;
  return {
    taxablePaise,
    gstPercent: pct,
    cgstPaise,
    sgstPaise,
    totalPaise: taxablePaise + gstTotal,
  };
}

/** SAC for dental healthcare services (India). Cosmetic lines still use this code with 18% GST. */
export const DENTAL_SAC_CODE = '999312';

/** Cosmetic treatments that typically attract 18% GST in India. */
export function isCosmeticDentalProcedure(procedureTitle: string): boolean {
  const t = procedureTitle.toLowerCase();
  return /whiten|bleach|veneer|aligner|cosmetic|aesthetic smile|laminate/.test(t);
}

/** Pull GSTIN from branding footer text like "… · GSTIN: 29AABCA1234D1Z5". */
export function extractGstin(registrationFooter: string): string | null {
  const m = registrationFooter.match(/GSTIN[:\s]*([0-9A-Z]{15})/i);
  return m?.[1]?.toUpperCase() ?? null;
}

/** WhatsApp tax-invoice body for patient collection / record. */
export function buildGstWhatsAppReceipt(input: {
  clinicName: string;
  gstin: string | null;
  sacCode: string;
  receiptNo: string;
  patientName: string;
  procedure: string;
  breakdown: GstReceiptBreakdown;
  paidVia: string;
}): string {
  const lines = [
    `*${input.clinicName} — Tax Invoice*`,
    `Receipt: ${input.receiptNo}`,
    `Patient: ${input.patientName}`,
    `SAC: ${input.sacCode}${input.gstin ? ` · GSTIN: ${input.gstin}` : ''}`,
    '',
    `${input.procedure}`,
    `Taxable: ${formatPaiseToInr(input.breakdown.taxablePaise, true)}`,
  ];
  if (input.breakdown.gstPercent > 0) {
    lines.push(
      `CGST (${input.breakdown.gstPercent / 2}%): ${formatPaiseToInr(input.breakdown.cgstPaise, true)}`,
      `SGST (${input.breakdown.gstPercent / 2}%): ${formatPaiseToInr(input.breakdown.sgstPaise, true)}`
    );
  } else {
    lines.push('GST: Exempt (healthcare dental service)');
  }
  lines.push(
    `*Total: ${formatPaiseToInr(input.breakdown.totalPaise, true)}*`,
    `Status: ${input.paidVia}`,
    '',
    '_Thank you — AuraSmile OS clinic receipt_'
  );
  return lines.join('\n');
}

/** Native UPI deep link for chairside collection (no Razorpay required). */
export function buildUpiPayUrl(params: {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  note?: string;
}): string {
  const vpa = params.vpa.trim();
  if (!vpa || !vpa.includes('@')) {
    throw new Error('Valid UPI VPA required (e.g. clinic@upi)');
  }
  if (!Number.isInteger(params.amountPaise) || params.amountPaise < 0) {
    throw new Error('Amount must be non-negative integer paise');
  }
  const am = (params.amountPaise / 100).toFixed(2);
  const q = new URLSearchParams({
    pa: vpa,
    pn: params.payeeName.slice(0, 50),
    am,
    cu: 'INR',
  });
  if (params.note?.trim()) {
    q.set('tn', params.note.trim().slice(0, 80));
  }
  return `upi://pay?${q.toString()}`;
}
