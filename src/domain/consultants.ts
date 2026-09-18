export type SpecialistRole =
  | 'ENDODONTIST'
  | 'ORAL_SURGEON'
  | 'ORTHODONTIST'
  | 'PERIODONTIST'
  | 'IMPLANTOLOGIST'
  | 'PEDODONTIST';

export interface VisitingConsultant {
  id: string;
  fullName: string;
  role: SpecialistRole;
  qualifications: string;
  registrationNumber: string;
  panNumber: string; // Indian Income Tax PAN (e.g. ABCDE1234F)
  phone: string;
  email: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  defaultSharePercentage: number; // e.g. 60 for 60% consultant share
  activeCasesCount: number;
  totalSettledPaise: number;
  rating: number;
}

export interface ConsultantPayoutRecord {
  id: string;
  consultantId: string;
  consultantName: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  procedureDate: string; // YYYY-MM-DD
  grossFeePaise: number;
  consultantSharePercentage: number;
  grossPayoutPaise: number;
  tdsWithholdingPaise: number; // 10% under Section 194J
  netPayablePaise: number;
  paymentStatus: 'PENDING' | 'SETTLED';
  utrNumber?: string;
  settledDate?: string;
}

export interface PayoutCalculation {
  grossPayoutPaise: number;
  tdsWithholdingPaise: number;
  netPayablePaise: number;
}

/**
 * Calculates specialist consultant payout with mandatory Section 194J 10% TDS.
 * Enforces integer paise arithmetic to avoid rounding loss.
 */
export function calculateConsultantPayout(
  grossFeePaise: number,
  consultantSharePercentage: number,
  applySection194jTds: boolean = true
): PayoutCalculation {
  if (grossFeePaise < 0) {
    throw new Error('Gross fee in paise cannot be negative');
  }

  const validShare = Math.min(Math.max(consultantSharePercentage, 0), 100);
  const grossPayoutPaise = Math.round((grossFeePaise * validShare) / 100);

  // Section 194J of Indian Income Tax Act: 10% TDS on professional technical fees
  const tdsWithholdingPaise = applySection194jTds
    ? Math.round((grossPayoutPaise * 10) / 100)
    : 0;

  const netPayablePaise = grossPayoutPaise - tdsWithholdingPaise;

  return {
    grossPayoutPaise,
    tdsWithholdingPaise,
    netPayablePaise,
  };
}

/**
 * Validates standard Indian Income Tax Permanent Account Number (PAN) format:
 * 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. AABCV1234F).
 */
export function isValidPanNumber(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.trim().toUpperCase());
}
