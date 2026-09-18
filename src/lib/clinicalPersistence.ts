import { getSupabase, isSupabaseConfigured } from './supabase';
import type { ClinicalCaseSheet } from '../domain/types';
import type { PrescribedDrug } from '../domain/prescription';

export type ConsentPersistPayload = {
  patientId: string;
  patientMrn: string;
  patientName: string;
  procedureCode: string;
  procedureTitle: string;
  doctorName: string;
  doctorRegistration: string;
  branchId: string;
  /** Live clinic UUID — tenancy parity with clinical_receipts */
  clinicDbId?: string | null;
  signedAtIso: string;
  auditHash: string;
  signatureDataUrl: string | null;
  medicalAlertsSummary: string;
};

export type TreatmentSessionSnapshot = {
  patientId: string;
  doctorId: string;
  branchId: string;
  chairId: string;
  operatorySubTab: string;
  startedAtIso: string;
  lastActionAtIso: string;
  lastActionLabel: string;
  actions: Array<{ at: string; label: string }>;
};

const CONSENT_KEY = 'aurasmile.consents.v1';
const SESSION_KEY = 'aurasmile.treatmentSession.v1';
const CASE_SHEET_KEY = 'aurasmile.caseSheets.v1';
const RX_KEY = 'aurasmile.prescriptions.v1';
const IMAGING_KEY = 'aurasmile.patientImages.v1';

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export type StoredCaseSheet = ClinicalCaseSheet & {
  persistedAt: string;
};

export type StoredPrescription = {
  id: string;
  patientId: string;
  patientMrn: string;
  patientName: string;
  doctorName: string;
  doctorRegistration: string;
  diagnosis: string;
  drugs: PrescribedDrug[];
  advice: string;
  issuedAtIso: string;
  persistedAt: string;
  clinicDbId?: string | null;
};

export type StoredPatientImage = {
  id: string;
  patientId: string;
  patientName: string;
  targetToothId?: number;
  title: string;
  captureDate: string;
  imageUrl: string;
  clinicalNotes?: string;
  persistedAt: string;
};

/** Always write locally; also insert to Supabase when clinic bound. */
export async function persistCaseSheet(
  sheet: ClinicalCaseSheet,
  clinicDbId?: string | null
): Promise<{ ok: true; storage: 'local' | 'local+supabase'; id: string }> {
  const row: StoredCaseSheet = {
    ...sheet,
    persistedAt: new Date().toISOString(),
  };
  const existing = readLocalJson<StoredCaseSheet[]>(CASE_SHEET_KEY, []);
  writeLocalJson(CASE_SHEET_KEY, [row, ...existing].slice(0, 200));

  if (!clinicDbId || !isSupabaseConfigured()) {
    return { ok: true, storage: 'local', id: sheet.id };
  }
  const sb = getSupabase();
  if (!sb) return { ok: true, storage: 'local', id: sheet.id };

  const { error } = await sb.from('clinical_case_sheets').insert({
    id: sheet.id,
    clinic_id: clinicDbId,
    patient_id: sheet.patientId,
    target_tooth_id: sheet.targetToothId,
    timestamp: sheet.timestamp,
    chief_complaint: sheet.chiefComplaint,
    clinical_examination_notes: sheet.clinicalExaminationNotes,
    provisional_diagnosis: sheet.provisionalDiagnosis,
    treatment_plan_summary: sheet.treatmentPlanSummary,
    attending_doctor_name: sheet.attendingDoctorName,
    doctor_registration: sheet.doctorRegistrationNumber,
    vitality_tests: sheet.vitalityTests,
    endo_measurements: sheet.endoMeasurements,
    payload: sheet,
  });

  if (error) {
    console.warn('[AuraSmile] Case sheet local only:', error.message);
    return { ok: true, storage: 'local', id: sheet.id };
  }
  return { ok: true, storage: 'local+supabase', id: sheet.id };
}

export function listCaseSheetsForPatient(patientId: string): StoredCaseSheet[] {
  return readLocalJson<StoredCaseSheet[]>(CASE_SHEET_KEY, []).filter(
    (s) => s.patientId === patientId
  );
}

export function latestCaseSheetForPatient(patientId: string): StoredCaseSheet | null {
  return listCaseSheetsForPatient(patientId)[0] ?? null;
}

export async function persistPrescription(
  payload: Omit<StoredPrescription, 'id' | 'persistedAt'>
): Promise<{ ok: true; storage: 'local' | 'local+supabase'; id: string }> {
  const id = `rx-${Date.now()}`;
  const row: StoredPrescription = {
    id,
    ...payload,
    persistedAt: new Date().toISOString(),
  };
  const existing = readLocalJson<StoredPrescription[]>(RX_KEY, []);
  writeLocalJson(RX_KEY, [row, ...existing].slice(0, 200));

  if (!payload.clinicDbId || !isSupabaseConfigured()) {
    return { ok: true, storage: 'local', id };
  }
  const sb = getSupabase();
  if (!sb) return { ok: true, storage: 'local', id };

  const { error } = await sb.from('clinical_prescriptions').insert({
    id,
    clinic_id: payload.clinicDbId,
    patient_id: payload.patientId,
    patient_mrn: payload.patientMrn,
    patient_name: payload.patientName,
    doctor_name: payload.doctorName,
    doctor_registration: payload.doctorRegistration,
    diagnosis: payload.diagnosis,
    drugs: payload.drugs,
    advice: payload.advice,
    issued_at: payload.issuedAtIso,
  });

  if (error) {
    console.warn('[AuraSmile] Rx local only:', error.message);
    return { ok: true, storage: 'local', id };
  }
  return { ok: true, storage: 'local+supabase', id };
}

export function latestPrescriptionForPatient(patientId: string): StoredPrescription | null {
  const rows = readLocalJson<StoredPrescription[]>(RX_KEY, []).filter(
    (r) => r.patientId === patientId
  );
  return rows[0] ?? null;
}

export function listPatientImages(patientId: string): StoredPatientImage[] {
  return readLocalJson<StoredPatientImage[]>(IMAGING_KEY, []).filter(
    (i) => i.patientId === patientId
  );
}

export function persistPatientImage(
  image: Omit<StoredPatientImage, 'persistedAt'>
): StoredPatientImage {
  const row: StoredPatientImage = {
    ...image,
    persistedAt: new Date().toISOString(),
  };
  const existing = readLocalJson<StoredPatientImage[]>(IMAGING_KEY, []);
  writeLocalJson(IMAGING_KEY, [row, ...existing].slice(0, 80));
  return row;
}

/** Always write locally; also insert to Supabase when configured. */
export async function persistConsent(
  payload: ConsentPersistPayload
): Promise<{ ok: true; storage: 'local' | 'supabase' | 'local+supabase'; id: string }> {
  const id = `consent-${Date.now()}`;
  const localRow = { id, ...payload, persistedAt: new Date().toISOString() };
  const existing = readLocalJson<typeof localRow[]>(CONSENT_KEY, []);
  writeLocalJson(CONSENT_KEY, [localRow, ...existing].slice(0, 200));

  if (!isSupabaseConfigured()) {
    return { ok: true, storage: 'local', id };
  }

  const sb = getSupabase();
  if (!sb) return { ok: true, storage: 'local', id };

  const { error } = await sb.from('clinical_consents').insert({
    id,
    clinic_id: payload.clinicDbId || null,
    patient_id: payload.patientId,
    patient_mrn: payload.patientMrn,
    patient_name: payload.patientName,
    procedure_code: payload.procedureCode,
    procedure_title: payload.procedureTitle,
    doctor_name: payload.doctorName,
    doctor_registration: payload.doctorRegistration,
    branch_id: payload.branchId,
    signed_at: payload.signedAtIso,
    audit_hash: payload.auditHash,
    signature_data_url: payload.signatureDataUrl,
    medical_alerts_summary: payload.medicalAlertsSummary,
  });

  if (error) {
    console.warn('[AuraSmile] Consent saved locally; Supabase insert failed:', error.message);
    return { ok: true, storage: 'local', id };
  }

  return { ok: true, storage: 'local+supabase', id };
}

export function listLocalConsents(): ConsentPersistPayload[] {
  return readLocalJson(CONSENT_KEY, []);
}

export function saveTreatmentSession(snapshot: TreatmentSessionSnapshot): void {
  writeLocalJson(SESSION_KEY, snapshot);
}

export function loadTreatmentSession(): TreatmentSessionSnapshot | null {
  return readLocalJson<TreatmentSessionSnapshot | null>(SESSION_KEY, null);
}

export function clearTreatmentSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function appendTreatmentAction(label: string): TreatmentSessionSnapshot | null {
  const current = loadTreatmentSession();
  if (!current) return null;
  const now = new Date().toISOString();
  const next: TreatmentSessionSnapshot = {
    ...current,
    lastActionAtIso: now,
    lastActionLabel: label,
    actions: [...current.actions, { at: now, label }].slice(-80),
  };
  saveTreatmentSession(next);
  return next;
}
