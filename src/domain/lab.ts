import { ToothId } from './types';

export type LabPartnerName =
  | 'DentCare Dental Lab'
  | 'Katana Milling Center'
  | 'Illusion Aligners'
  | 'Confident Dental Care'
  | 'Leixir Dental Lab';

export type RestorationType =
  | 'ZIRCONIA_MONOLITHIC'
  | 'E_MAX_PRESS'
  | 'PFM_HIGH_NOBLE'
  | 'ACRYLIC_DENTURE'
  | 'CLEAR_ALIGNER'
  | 'SURGICAL_GUIDE'
  | 'CAST_PARTIAL_DENTURE';

export type VitaShade =
  | 'A1' | 'A2' | 'A3' | 'A3.5' | 'A4'
  | 'B1' | 'B2' | 'B3' | 'B4'
  | 'C1' | 'C2' | 'C3' | 'C4'
  | 'D2' | 'D3' | 'D4'
  | 'BL1' | 'BL2' | 'BL3' | 'BL4';

export type LabOrderStatus =
  | 'SENT_TO_LAB'
  | 'IN_FABRICATION'
  | 'RECEIVED_IN_CLINIC'
  | 'TRY_IN_SCHEDULED'
  | 'DELIVERED_TO_PATIENT';

export interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  labPartner: LabPartnerName;
  toothId: ToothId;
  restorationType: RestorationType;
  primaryShade: VitaShade;
  cervicalShade?: VitaShade;
  incisalTranslucency: 'HIGH' | 'MEDIUM' | 'OPAQUE';
  status: LabOrderStatus;
  orderDate: string; // YYYY-MM-DD
  expectedDeliveryDate: string; // YYYY-MM-DD
  patientAppointmentDate: string; // YYYY-MM-DD HH:mm
  warrantyCardNumber?: string;
  warrantyYears: number;
  labCostPaise: number;
  notes?: string;
}

/**
 * Checks if a lab order is critically overdue or at risk.
 * Flags true if:
 * 1. Status is still SENT_TO_LAB or IN_FABRICATION, AND
 * 2. Current time is past the expected delivery date OR within 24 hours of the patient appointment.
 */
export function isLabOrderOverdue(order: LabOrder, referenceDate: Date = new Date()): boolean {
  if (order.status === 'RECEIVED_IN_CLINIC' || order.status === 'TRY_IN_SCHEDULED' || order.status === 'DELIVERED_TO_PATIENT') {
    return false;
  }

  const expectedTime = new Date(order.expectedDeliveryDate).getTime();
  const refTime = referenceDate.getTime();

  // If already past expected delivery date
  if (refTime >= expectedTime) {
    return true;
  }

  // If patient appointment is within 24 hours and item is not yet received
  const apptTime = new Date(order.patientAppointmentDate).getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  if (apptTime - refTime <= twentyFourHoursMs) {
    return true;
  }

  return false;
}

/**
 * Calculates remaining days until expected lab delivery.
 */
export function getDaysUntilDelivery(order: LabOrder, referenceDate: Date = new Date()): number {
  const expDate = new Date(order.expectedDeliveryDate);
  const expUtc = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return Math.round((expUtc - refUtc) / (1000 * 60 * 60 * 24));
}

export const VITA_SHADE_COLORS: Record<VitaShade, string> = {
  BL1: '#FCFDFE',
  BL2: '#F8F9FA',
  BL3: '#F3F4F6',
  BL4: '#EDEFEF',
  A1: '#FAF4EB',
  A2: '#F5ECE0',
  A3: '#EFE0CD',
  'A3.5': '#E8D4BB',
  A4: '#D8BE9E',
  B1: '#FBF5EE',
  B2: '#F4ECE0',
  B3: '#EADBC6',
  B4: '#DEC6A6',
  C1: '#EAE6E1',
  C2: '#DDD7CF',
  C3: '#CDC5B9',
  C4: '#BEB4A4',
  D2: '#EFEAE2',
  D3: '#E3DACD',
  D4: '#D6CABE',
};

/** Chairside shade picker — VITA 3D Master + bleach. */
export const VITA_SHADE_PICKER: VitaShade[] = [
  'A1',
  'A2',
  'A3',
  'A3.5',
  'A4',
  'B1',
  'B2',
  'BL1',
  'BL2',
  'BL3',
  'BL4',
];

export const RESTORATION_MATERIAL_OPTIONS: {
  id: RestorationType;
  label: string;
}[] = [
  { id: 'ZIRCONIA_MONOLITHIC', label: 'Monolithic Zirconia' },
  { id: 'PFM_HIGH_NOBLE', label: 'Layered PFM' },
  { id: 'E_MAX_PRESS', label: 'E.max Press' },
  { id: 'ACRYLIC_DENTURE', label: 'Acrylic Denture' },
  { id: 'CLEAR_ALIGNER', label: 'Clear Aligner' },
  { id: 'CAST_PARTIAL_DENTURE', label: 'Cast Partial Denture' },
  { id: 'SURGICAL_GUIDE', label: 'Surgical Guide' },
];

export const LAB_STATUS_BADGES: { status: LabOrderStatus; label: string }[] = [
  { status: 'SENT_TO_LAB', label: 'Sent to Lab' },
  { status: 'IN_FABRICATION', label: 'In Fabrication' },
  { status: 'RECEIVED_IN_CLINIC', label: 'Received in Clinic' },
  { status: 'TRY_IN_SCHEDULED', label: 'Trial Done' },
  { status: 'DELIVERED_TO_PATIENT', label: 'Fitted' },
];

/** Procedures that typically need an external lab slip. */
export function isLabEligiblePlanLine(input: {
  procedureId: string;
  procedureLabel: string;
}): boolean {
  const hay = `${input.procedureId} ${input.procedureLabel}`.toLowerCase();
  return /crown|bridge|denture|aligner|zirconia|e\.?max|pfm|veneer|inlay|onlay|prosthes|ssrct-crown|crown-only/.test(
    hay
  );
}

export function guessRestorationFromPlanLabel(label: string): RestorationType {
  const t = label.toLowerCase();
  if (/aligner/.test(t)) return 'CLEAR_ALIGNER';
  if (/denture|acrylic/.test(t)) return 'ACRYLIC_DENTURE';
  if (/e\.?max|lithium/.test(t)) return 'E_MAX_PRESS';
  if (/pfm|porcelain fused/.test(t)) return 'PFM_HIGH_NOBLE';
  if (/guide|implant/.test(t)) return 'SURGICAL_GUIDE';
  return 'ZIRCONIA_MONOLITHIC';
}

export function defaultLabDueDateIso(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
