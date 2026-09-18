import { MedicalAlert, Patient, ToothId, ToothState } from '../domain/types';
import { TreatmentPlanLine } from '../domain/treatmentPlan';
import { DbPatient, getSupabase, isSupabaseConfigured } from './supabase';

function chartFromDb(raw: Record<string, unknown> | null | undefined): Record<number, ToothState> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, ToothState> = {};
  for (const [key, value] of Object.entries(raw)) {
    const toothId = Number(key) as ToothId;
    if (!Number.isFinite(toothId) || !value || typeof value !== 'object') continue;
    out[toothId] = value as ToothState;
  }
  return out;
}

function chartToDb(chart: Record<number, ToothState>): Record<string, ToothState> {
  const out: Record<string, ToothState> = {};
  for (const [key, value] of Object.entries(chart)) {
    out[String(key)] = value;
  }
  return out;
}

function alertsFromDb(raw: unknown): MedicalAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as MedicalAlert[];
}

const PLAN_LINES_ACCEPTANCE = new Set([
  'PROPOSED',
  'ACCEPTED',
  'DECLINED',
  'DEFERRED',
]);

function planLinesFromDb(raw: unknown): TreatmentPlanLine[] {
  if (!Array.isArray(raw)) return [];
  const out: TreatmentPlanLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.patientId !== 'string') continue;
    if (typeof r.procedureId !== 'string' || typeof r.procedureLabel !== 'string') continue;
    if (typeof r.feePaise !== 'number' || typeof r.attendingDoctorName !== 'string') continue;
    if (typeof r.createdAtIso !== 'string') continue;
    if (typeof r.acceptance !== 'string' || !PLAN_LINES_ACCEPTANCE.has(r.acceptance)) continue;
    const toothRaw = r.toothId;
    const toothId =
      toothRaw === null || toothRaw === undefined
        ? null
        : (Number(toothRaw) as ToothId);
    if (toothId !== null && !Number.isFinite(toothId)) continue;
    out.push({
      id: r.id,
      patientId: r.patientId,
      toothId,
      procedureId: r.procedureId,
      procedureLabel: r.procedureLabel,
      feePaise: r.feePaise,
      needsConsent: Boolean(r.needsConsent),
      estimatedVisits: typeof r.estimatedVisits === 'number' ? r.estimatedVisits : 1,
      acceptance: r.acceptance as TreatmentPlanLine['acceptance'],
      attendingDoctorName: r.attendingDoctorName,
      createdAtIso: r.createdAtIso,
      decidedAtIso: typeof r.decidedAtIso === 'string' ? r.decidedAtIso : undefined,
    });
  }
  return out;
}

export function dbPatientToDomain(row: DbPatient): Patient {
  const hasPlanColumn = Object.prototype.hasOwnProperty.call(row, 'treatment_plan_lines');
  return {
    id: row.id,
    mrn: row.mrn,
    fullName: row.full_name,
    age: row.age,
    gender: (row.gender as Patient['gender']) || 'OTHER',
    phoneNumber: row.phone,
    email: row.email ?? undefined,
    addressCity: row.address_city || '',
    medicalAlerts: alertsFromDb(row.medical_alerts),
    dentalChart: chartFromDb(row.dental_chart),
    // undefined = column not migrated yet → App uses localStorage fallback
    treatmentPlanLines: hasPlanColumn ? planLinesFromDb(row.treatment_plan_lines) : undefined,
    bloodGroup: row.blood_group || 'Unknown',
    assignedDoctorName: row.assigned_doctor || '',
    assignedMemberId: row.assigned_member_id ?? null,
    primaryChair: row.primary_chair || '',
    lastVisitDate: row.last_visit_date || new Date().toISOString().slice(0, 10),
    nextAppointmentDate: row.next_appointment_date ?? undefined,
  };
}

export function domainPatientToDb(
  clinicId: string,
  patient: Patient
): Omit<DbPatient, 'created_at'> {
  return {
    id: patient.id,
    clinic_id: clinicId,
    mrn: patient.mrn,
    full_name: patient.fullName,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phoneNumber,
    email: patient.email ?? null,
    address_city: patient.addressCity,
    blood_group: patient.bloodGroup,
    assigned_doctor: patient.assignedDoctorName || null,
    assigned_member_id: patient.assignedMemberId ?? null,
    primary_chair: patient.primaryChair || null,
    dental_chart: chartToDb(patient.dentalChart),
    // Intentionally omit treatment_plan_lines so pre-migration upserts still work; saved via updatePatientTreatmentPlanLines.
    medical_alerts: patient.medicalAlerts,
    last_visit_date: patient.lastVisitDate || null,
    next_appointment_date: patient.nextAppointmentDate ?? null,
  };
}

export type ListPatientsOptions = {
  /** When set, only rows assigned to this clinic_members.id (doctor scope). */
  assignedMemberId?: string | null;
};

export async function listPatientsForClinic(
  clinicId: string,
  options?: ListPatientsOptions
): Promise<Patient[]> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return [];

  let query = sb
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: true });

  if (options?.assignedMemberId) {
    query = query.eq('assigned_member_id', options.assignedMemberId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[AuraSmile] listPatients failed:', error.message);
    throw new Error(error.message);
  }

  return (data as DbPatient[] | null)?.map(dbPatientToDomain) ?? [];
}

export async function upsertPatient(
  clinicId: string,
  patient: Patient
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const row = domainPatientToDb(clinicId, patient);
  const { error } = await sb.from('patients').upsert(row, { onConflict: 'id' });

  if (error) {
    console.warn('[AuraSmile] upsertPatient failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updatePatientDentalChart(
  patientId: string,
  dentalChart: Record<number, ToothState>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const { error } = await sb
    .from('patients')
    .update({ dental_chart: chartToDb(dentalChart) })
    .eq('id', patientId);

  if (error) {
    console.warn('[AuraSmile] updatePatientDentalChart failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Persist next follow-up / recall date on the patient row. */
export async function updatePatientNextAppointment(
  patientId: string,
  nextAppointmentDate: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const { error } = await sb
    .from('patients')
    .update({ next_appointment_date: nextAppointmentDate })
    .eq('id', patientId);

  if (error) {
    console.warn('[AuraSmile] updatePatientNextAppointment failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Writes plan lines to patients.treatment_plan_lines; caller should also saveTreatmentPlanLines (local). */
export async function updatePatientTreatmentPlanLines(
  patientId: string,
  lines: TreatmentPlanLine[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const { error } = await sb
    .from('patients')
    .update({ treatment_plan_lines: lines })
    .eq('id', patientId);

  if (error) {
    console.warn(
      '[AuraSmile] updatePatientTreatmentPlanLines failed (localStorage still holds copy):',
      error.message
    );
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
