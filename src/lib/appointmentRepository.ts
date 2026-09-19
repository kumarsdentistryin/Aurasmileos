import {
  HomeQueueAppointment,
  QueueAppointmentStatus,
} from '../components/Home/AuraSmileHomeDashboard';
import { emitAppointmentBooked } from './integrations/emit';
import { DbAppointment, getSupabase, isSupabaseConfigured } from './supabase';

function todayIstDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function dbAppointmentToQueue(row: DbAppointment): HomeQueueAppointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    age: row.age,
    gender: (row.gender as HomeQueueAppointment['gender']) || 'OTHER',
    phone: row.phone,
    scheduledTime: row.scheduled_time,
    chiefComplaint: row.chief_complaint,
    status: row.status as QueueAppointmentStatus,
    assignedDoctor: row.assigned_doctor || '',
    assignedMemberId: row.assigned_member_id ?? null,
    chairLabel: row.chair_label || 'TBD',
    expectedFeePaise: row.expected_fee_paise,
  };
}

export function queueToDbAppointment(
  clinicId: string,
  appt: HomeQueueAppointment,
  apptDate = todayIstDate()
): Omit<DbAppointment, 'created_at'> {
  return {
    id: appt.id,
    clinic_id: clinicId,
    patient_id: appt.patientId,
    patient_name: appt.patientName,
    age: appt.age,
    gender: appt.gender,
    phone: appt.phone,
    scheduled_time: appt.scheduledTime,
    chief_complaint: appt.chiefComplaint,
    status: appt.status,
    assigned_doctor: appt.assignedDoctor || null,
    assigned_member_id: appt.assignedMemberId ?? null,
    chair_label: appt.chairLabel || null,
    expected_fee_paise: appt.expectedFeePaise,
    appt_date: apptDate,
  };
}

export type ListAppointmentsOptions = {
  /** When set, only rows assigned to this clinic_members.id (doctor scope). */
  assignedMemberId?: string | null;
};

export async function listAppointmentsForClinicToday(
  clinicId: string,
  options?: ListAppointmentsOptions
): Promise<HomeQueueAppointment[]> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return [];

  const day = todayIstDate();
  let query = sb
    .from('appointments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('appt_date', day)
    .order('scheduled_time', { ascending: true });

  if (options?.assignedMemberId) {
    query = query.eq('assigned_member_id', options.assignedMemberId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[AuraSmile] listAppointments failed:', error.message);
    throw new Error(error.message);
  }

  return (data as DbAppointment[] | null)?.map(dbAppointmentToQueue) ?? [];
}

export async function upsertAppointment(
  clinicId: string,
  appt: HomeQueueAppointment
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const row = queueToDbAppointment(clinicId, appt);
  const { error } = await sb.from('appointments').upsert(row, { onConflict: 'id' });

  if (error) {
    console.warn('[AuraSmile] upsertAppointment failed:', error.message);
    return { ok: false, error: error.message };
  }

  if (appt.status === 'WAITING_IN_LOBBY' || appt.status === 'CONFIRMED') {
    void emitAppointmentBooked(clinicId, {
      appointment_id: appt.id,
      patient_id: appt.patientId ?? appt.id,
      patient_phone: appt.phone,
      scheduled_time: appt.scheduledTime,
      appt_date: row.appt_date,
      assigned_member_id: appt.assignedMemberId ?? null,
      chair_label: appt.chairLabel ?? null,
      expected_fee_paise: appt.expectedFeePaise,
    });
  }

  return { ok: true };
}

export async function upsertAppointmentsBatch(
  clinicId: string,
  appts: HomeQueueAppointment[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const rows = appts.map((a) => queueToDbAppointment(clinicId, a));
  const { error } = await sb.from('appointments').upsert(rows, { onConflict: 'id' });

  if (error) {
    console.warn('[AuraSmile] upsertAppointmentsBatch failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
