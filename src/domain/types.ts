/**
 * AuraSmile OS - Core Clinical & Financial Domain Entities
 * Universal System Architect Framework (USAF) - Layer 1 & 3
 */

import type { TreatmentPlanLine } from './treatmentPlan';

export type AdultToothId =
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38
  | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48;

export type DeciduousToothId =
  | 51 | 52 | 53 | 54 | 55
  | 61 | 62 | 63 | 64 | 65
  | 71 | 72 | 73 | 74 | 75
  | 81 | 82 | 83 | 84 | 85;

export type ToothId = AdultToothId | DeciduousToothId;

export type ToothSurface = 'M' | 'O' | 'D' | 'B' | 'L' | 'I';

export type ToothCondition =
  | 'SOUND'
  | 'CARIES'
  | 'COMPOSITE'
  | 'AMALGAM'
  | 'CROWN'
  | 'RCT'
  | 'EXTRACTION_INDICATED'
  | 'MISSING'
  | 'IMPLANT'
  | 'FRACTURE';

export interface ToothState {
  toothId: ToothId;
  condition: ToothCondition;
  affectedSurfaces: ToothSurface[];
  notes?: string;
  treatmentPlanned?: string;
  lastUpdated: string;
}

export type MedicalAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface MedicalAlert {
  id: string;
  category: 'ALLERGY' | 'SYSTEMIC_DISEASE' | 'MEDICATION' | 'PREGNANCY' | 'OTHER';
  label: string;
  severity: MedicalAlertSeverity;
  clinicalImplication: string;
}

export interface Patient {
  id: string;
  mrn: string; // e.g. "AS-BLR-0492"
  fullName: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  phoneNumber: string;
  email?: string;
  addressCity: string;
  medicalAlerts: MedicalAlert[];
  dentalChart: Record<number, ToothState>;
  /** Chairside plan lines; durable via patients.treatment_plan_lines or localStorage fallback */
  treatmentPlanLines?: TreatmentPlanLine[];
  bloodGroup: string;
  assignedDoctorName: string;
  /** clinic_members.id when assigned from live roster */
  assignedMemberId?: string | null;
  primaryChair: string;
  lastVisitDate: string;
  nextAppointmentDate?: string;
}

export type RootCanalName = 'MB1' | 'MB2' | 'ML' | 'DB' | 'Palatal' | 'Distal';

export interface EndoCanalMeasurement {
  canal: RootCanalName;
  referencePoint: string; // e.g. "MB Cusp Tip"
  workingLengthMm: number; // e.g. 21.5 mm
  apexLocatorReading: string; // e.g. "0.0 Apex", "-0.5mm"
  masterApicalFile: string; // e.g. "25/0.04"
  masterGuttaPerchaCone: string; // e.g. "25/0.04 taper"
  sealerType: string; // e.g. "AH Plus Bioceramic"
}

export interface PulpVitalityTests {
  coldTest: 'NORMAL' | 'HYPERSENSITIVE' | 'LINGERING' | 'NON_RESPONSIVE';
  electricPulpTest: string; // e.g. "Reading 64/80 (Necrotic)"
  percussionTest: 'NEGATIVE' | 'MILD_TENDERNESS' | 'SEVERE_PAIN';
  palpationTest: 'NEGATIVE' | 'TENDER' | 'SWELLING_PRESENT';
  periodontalProbingDepthMm: number;
  mobilityGrade: 'GRADE_0' | 'GRADE_I' | 'GRADE_II' | 'GRADE_III';
}

export interface ClinicalCaseSheet {
  id: string;
  patientId: string;
  targetToothId: ToothId;
  timestamp: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  clinicalExaminationNotes: string;
  vitalityTests: PulpVitalityTests;
  endoMeasurements: EndoCanalMeasurement[];
  radiographicFindings: string;
  provisionalDiagnosis: string;
  treatmentPlanSummary: string[];
  attendingDoctorName: string;
  doctorRegistrationNumber: string;
}

export interface SurgicalConsentRecord {
  id: string;
  patientId: string;
  procedureTitle: string;
  statutoryClauses: string[];
  acknowledgedRisks: string[];
  patientSignatureDataUrl: string | null;
  signedTimestamp: string | null;
  signedByRelation: 'SELF' | 'GUARDIAN' | 'SPOUSE';
  witnessDoctorName: string;
  witnessDoctorRegNo: string;
  isLocked: boolean;
}

export interface ProcedureFinancialParams {
  procedureName: string;
  grossFeePaise: number; // e.g. 850000 = ₹8,500.00
  isVisitingSpecialist: boolean;
  consultantSharePercentage: number; // e.g. 60 (for 60/40)
  labFeePaise: number; // e.g. 220000 = ₹2,200.00
  materialsConsumableCostPaise: number; // e.g. 45000 = ₹450.00
  gstApplicablePercent: number; // e.g. 0% for healthcare procedures
}

export interface CaseProfitabilityBreakdown {
  grossFeePaise: number;
  doctorConsultantPayoutPaise: number;
  labExpensePaise: number;
  consumablesExpensePaise: number;
  totalDirectCostPaise: number;
  netClinicContributionMarginPaise: number;
  profitMarginPercentage: number;
}

export interface AppointmentDispatchDetails {
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorPhone: string;
  chairName: string;
  appointmentDateTime: string;
  procedureName: string;
  toothId?: ToothId;
  specialInstructions: string;
}
