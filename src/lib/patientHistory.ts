import { Patient } from '../domain/types';
import { formatPaiseToInr } from '../domain/financials';
import {
  listCaseSheetsForPatient,
  listLocalConsents,
  listPatientImages,
  type StoredCaseSheet,
  type StoredPrescription,
} from './clinicalPersistence';
import { listLocalReceipts, type StoredReceipt } from './receiptRepository';
import { getSupabase, isSupabaseConfigured } from './supabase';

const RX_KEY = 'aurasmile.prescriptions.v1';

/** All local prescriptions for a patient (newest first). */
export function listPrescriptionsForPatient(patientId: string): StoredPrescription[] {
  try {
    const raw = localStorage.getItem(RX_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as StoredPrescription[];
    return all.filter((r) => r.patientId === patientId);
  } catch {
    return [];
  }
}

export type PatientHistoryKind =
  | 'VISIT'
  | 'NOTE'
  | 'RX'
  | 'CONSENT'
  | 'RECEIPT'
  | 'IMAGE'
  | 'PLAN'
  | 'RECALL';

export type PatientHistoryEvent = {
  id: string;
  kind: PatientHistoryKind;
  atIso: string;
  title: string;
  detail: string;
  meta?: string;
};

function sortNewestFirst(a: PatientHistoryEvent, b: PatientHistoryEvent): number {
  return b.atIso.localeCompare(a.atIso);
}

function noteEvents(sheets: StoredCaseSheet[]): PatientHistoryEvent[] {
  return sheets.map((s) => ({
    id: `note-${s.id}`,
    kind: 'NOTE' as const,
    atIso: s.timestamp || s.persistedAt,
    title: s.provisionalDiagnosis?.trim() || s.chiefComplaint?.trim() || 'Clinical notes',
    detail: [
      s.targetToothId ? `Tooth #${s.targetToothId}` : null,
      s.chiefComplaint?.trim() || null,
      s.attendingDoctorName || null,
    ]
      .filter(Boolean)
      .join(' · '),
    meta: s.clinicalExaminationNotes?.slice(0, 120) || undefined,
  }));
}

function rxEventsFromLocal(patientId: string): PatientHistoryEvent[] {
  return listPrescriptionsForPatient(patientId).map(rxEvent);
}

function rxEvent(rx: StoredPrescription): PatientHistoryEvent {
  const drugLabels = rx.drugs
    .map((d) => d.brandName || d.genericName)
    .filter(Boolean)
    .slice(0, 4);
  return {
    id: `rx-${rx.id}`,
    kind: 'RX',
    atIso: rx.issuedAtIso || rx.persistedAt,
    title: rx.diagnosis?.trim() || 'Prescription',
    detail: [
      drugLabels.length ? drugLabels.join(', ') : 'No drugs listed',
      rx.doctorName || null,
    ]
      .filter(Boolean)
      .join(' · '),
    meta: rx.advice?.slice(0, 120) || undefined,
  };
}

function consentEvents(patientId: string): PatientHistoryEvent[] {
  return listLocalConsents()
    .filter((c) => c.patientId === patientId)
    .map((c, idx) => ({
      id: `consent-${c.patientId}-${c.signedAtIso}-${idx}`,
      kind: 'CONSENT' as const,
      atIso: c.signedAtIso,
      title: c.procedureTitle || 'Consent signed',
      detail: [c.doctorName, c.procedureCode].filter(Boolean).join(' · '),
      meta: c.auditHash ? `Audit ${c.auditHash.slice(0, 10)}…` : undefined,
    }));
}

function receiptEvents(receipts: StoredReceipt[]): PatientHistoryEvent[] {
  return receipts.map((r) => ({
    id: `rcp-${r.id}`,
    kind: 'RECEIPT' as const,
    atIso: r.issuedAtIso || r.persistedAt,
    title: r.procedureTitle || 'Receipt',
    detail: `${formatPaiseToInr(r.totalPaise, false)} · ${r.paidVia}${
      r.doctorName ? ` · ${r.doctorName}` : ''
    }`,
    meta: r.receiptNo ? `No. ${r.receiptNo}` : undefined,
  }));
}

function imageEvents(patientId: string): PatientHistoryEvent[] {
  return listPatientImages(patientId).map((img) => ({
    id: `img-${img.id}`,
    kind: 'IMAGE' as const,
    atIso: img.captureDate || img.persistedAt,
    title: img.title || 'Imaging',
    detail: [
      img.targetToothId ? `Tooth #${img.targetToothId}` : null,
      img.clinicalNotes?.slice(0, 80) || null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

function planEvents(patient: Patient): PatientHistoryEvent[] {
  const lines = patient.treatmentPlanLines ?? [];
  return lines.map((l) => ({
    id: `plan-${l.id}`,
    kind: 'PLAN' as const,
    atIso: l.decidedAtIso || l.createdAtIso,
    title: l.procedureLabel,
    detail: [
      l.toothId != null ? `Tooth #${l.toothId}` : null,
      l.acceptance,
      formatPaiseToInr(l.feePaise, false),
      l.attendingDoctorName || null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

function visitAnchorEvents(patient: Patient): PatientHistoryEvent[] {
  const out: PatientHistoryEvent[] = [];
  if (patient.lastVisitDate) {
    out.push({
      id: `visit-last-${patient.id}`,
      kind: 'VISIT',
      atIso: `${patient.lastVisitDate}T12:00:00.000Z`,
      title: 'Last visit',
      detail: patient.assignedDoctorName || 'Clinic visit',
    });
  }
  if (patient.nextAppointmentDate && patient.nextAppointmentDate !== 'Today') {
    const iso =
      /^\d{4}-\d{2}-\d{2}/.test(patient.nextAppointmentDate)
        ? `${patient.nextAppointmentDate.slice(0, 10)}T09:00:00.000Z`
        : new Date().toISOString();
    out.push({
      id: `recall-${patient.id}`,
      kind: 'RECALL',
      atIso: iso,
      title: 'Follow-up / next appointment',
      detail: patient.nextAppointmentDate,
      meta: patient.assignedDoctorName || undefined,
    });
  }
  return out;
}

/** Build lifetime clinical timeline from device stores (+ optional cloud merge). */
export function buildLocalPatientHistory(patient: Patient): PatientHistoryEvent[] {
  const events: PatientHistoryEvent[] = [
    ...visitAnchorEvents(patient),
    ...noteEvents(listCaseSheetsForPatient(patient.id)),
    ...rxEventsFromLocal(patient.id),
    ...consentEvents(patient.id),
    ...receiptEvents(listLocalReceipts(patient.id)),
    ...imageEvents(patient.id),
    ...planEvents(patient),
  ];
  return events.sort(sortNewestFirst);
}

type CloudBundle = {
  notes: PatientHistoryEvent[];
  rx: PatientHistoryEvent[];
  consents: PatientHistoryEvent[];
  receipts: PatientHistoryEvent[];
};

async function fetchCloudHistory(
  patientId: string,
  clinicDbId: string | null
): Promise<CloudBundle> {
  const empty: CloudBundle = { notes: [], rx: [], consents: [], receipts: [] };
  if (!clinicDbId || !isSupabaseConfigured()) return empty;
  const sb = getSupabase();
  if (!sb) return empty;

  const [notesRes, rxRes, consentRes, receiptRes] = await Promise.all([
    sb
      .from('clinical_case_sheets')
      .select(
        'id, timestamp, chief_complaint, provisional_diagnosis, target_tooth_id, attending_doctor_name, clinical_examination_notes'
      )
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .limit(40),
    sb
      .from('clinical_prescriptions')
      .select('id, issued_at, diagnosis, drugs, advice, doctor_name')
      .eq('patient_id', patientId)
      .order('issued_at', { ascending: false })
      .limit(40),
    sb
      .from('clinical_consents')
      .select('id, signed_at, procedure_title, procedure_code, doctor_name, audit_hash')
      .eq('patient_id', patientId)
      .order('signed_at', { ascending: false })
      .limit(40),
    sb
      .from('clinical_receipts')
      .select(
        'id, issued_at, procedure_title, total_paise, paid_via, doctor_name, receipt_no'
      )
      .eq('patient_id', patientId)
      .order('issued_at', { ascending: false })
      .limit(40),
  ]);

  const notes: PatientHistoryEvent[] = (notesRes.data ?? []).map((row) => ({
    id: `cloud-note-${row.id}`,
    kind: 'NOTE',
    atIso: String(row.timestamp),
    title:
      String(row.provisional_diagnosis || '').trim() ||
      String(row.chief_complaint || '').trim() ||
      'Clinical notes',
    detail: [
      row.target_tooth_id != null ? `Tooth #${row.target_tooth_id}` : null,
      String(row.chief_complaint || '').trim() || null,
      String(row.attending_doctor_name || '') || null,
    ]
      .filter(Boolean)
      .join(' · '),
    meta: String(row.clinical_examination_notes || '').slice(0, 120) || undefined,
  }));

  const rx: PatientHistoryEvent[] = (rxRes.data ?? []).map((row) => {
    const drugs = Array.isArray(row.drugs)
      ? (row.drugs as Array<{ brandName?: string; genericName?: string; name?: string }>)
          .map((d) => d.brandName || d.genericName || d.name)
          .filter(Boolean)
      : [];
    return {
      id: `cloud-rx-${row.id}`,
      kind: 'RX' as const,
      atIso: String(row.issued_at),
      title: String(row.diagnosis || '').trim() || 'Prescription',
      detail: [
        drugs.length ? drugs.slice(0, 4).join(', ') : 'No drugs listed',
        String(row.doctor_name || '') || null,
      ]
        .filter(Boolean)
        .join(' · '),
      meta: String(row.advice || '').slice(0, 120) || undefined,
    };
  });

  const consents: PatientHistoryEvent[] = (consentRes.data ?? []).map((row) => ({
    id: `cloud-consent-${row.id}`,
    kind: 'CONSENT' as const,
    atIso: String(row.signed_at),
    title: String(row.procedure_title || 'Consent signed'),
    detail: [String(row.doctor_name || ''), String(row.procedure_code || '')]
      .filter(Boolean)
      .join(' · '),
    meta: row.audit_hash ? `Audit ${String(row.audit_hash).slice(0, 10)}…` : undefined,
  }));

  const receipts: PatientHistoryEvent[] = (receiptRes.data ?? []).map((row) => ({
    id: `cloud-rcp-${row.id}`,
    kind: 'RECEIPT' as const,
    atIso: String(row.issued_at),
    title: String(row.procedure_title || 'Receipt'),
    detail: `${formatPaiseToInr(Number(row.total_paise) || 0, false)} · ${row.paid_via}${
      row.doctor_name ? ` · ${row.doctor_name}` : ''
    }`,
    meta: row.receipt_no ? `No. ${row.receipt_no}` : undefined,
  }));

  return { notes, rx, consents, receipts };
}

function mergeById(events: PatientHistoryEvent[]): PatientHistoryEvent[] {
  const seen = new Set<string>();
  const out: PatientHistoryEvent[] = [];
  for (const e of events) {
    const key = `${e.kind}|${e.atIso}|${e.title}`;
    if (seen.has(key) || seen.has(e.id)) continue;
    seen.add(key);
    seen.add(e.id);
    out.push(e);
  }
  return out.sort(sortNewestFirst);
}

/** Local timeline + cloud clinical rows when clinic is live. */
export async function loadPatientHistory(
  patient: Patient,
  clinicDbId: string | null
): Promise<PatientHistoryEvent[]> {
  const local = buildLocalPatientHistory(patient);
  try {
    const cloud = await fetchCloudHistory(patient.id, clinicDbId);
    return mergeById([
      ...local,
      ...cloud.notes,
      ...cloud.rx,
      ...cloud.consents,
      ...cloud.receipts,
    ]);
  } catch (err) {
    console.warn('[AuraSmile] cloud history merge failed:', err);
    return local;
  }
}
