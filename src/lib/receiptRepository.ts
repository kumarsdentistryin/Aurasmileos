import { getSupabase, isSupabaseConfigured } from './supabase';

export type PaidVia = 'UPI' | 'CASH' | 'CARD' | 'UNPAID';

export type ReceiptPersistPayload = {
  receiptNo: string;
  patientId: string;
  patientMrn: string;
  patientName: string;
  doctorName: string;
  branchId: string;
  clinicDbId: string | null;
  procedureTitle: string;
  taxablePaise: number;
  gstPercent: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
  paidVia: PaidVia;
  upiVpa: string;
  issuedAtIso: string;
};

export type StoredReceipt = ReceiptPersistPayload & {
  id: string;
  persistedAt: string;
  storage: 'local' | 'supabase' | 'local+supabase';
};

const RECEIPT_KEY = 'aurasmile.receipts.v1';

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

export function listLocalReceipts(patientId?: string): StoredReceipt[] {
  const all = readLocalJson<StoredReceipt[]>(RECEIPT_KEY, []);
  if (!patientId) return all;
  return all.filter((r) => r.patientId === patientId);
}

/** Always write locally; also insert to Supabase when live clinic is bound. */
export async function persistReceipt(
  payload: ReceiptPersistPayload
): Promise<{ ok: true; storage: StoredReceipt['storage']; id: string } | { ok: false; error: string }> {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `rcp-${Date.now()}`;

  const localRow: StoredReceipt = {
    id,
    ...payload,
    persistedAt: new Date().toISOString(),
    storage: 'local',
  };

  const existing = readLocalJson<StoredReceipt[]>(RECEIPT_KEY, []);
  writeLocalJson(RECEIPT_KEY, [localRow, ...existing].slice(0, 300));

  if (!isSupabaseConfigured() || !payload.clinicDbId) {
    return { ok: true, storage: 'local', id };
  }

  const sb = getSupabase();
  if (!sb) return { ok: true, storage: 'local', id };

  const { error } = await sb.from('clinical_receipts').insert({
    id,
    clinic_id: payload.clinicDbId,
    branch_id: payload.branchId,
    receipt_no: payload.receiptNo,
    patient_id: payload.patientId,
    patient_mrn: payload.patientMrn,
    patient_name: payload.patientName,
    doctor_name: payload.doctorName,
    procedure_title: payload.procedureTitle,
    taxable_paise: payload.taxablePaise,
    gst_percent: payload.gstPercent,
    cgst_paise: payload.cgstPaise,
    sgst_paise: payload.sgstPaise,
    total_paise: payload.totalPaise,
    paid_via: payload.paidVia,
    upi_vpa: payload.upiVpa || null,
    issued_at: payload.issuedAtIso,
  });

  if (error) {
    console.warn('[AuraSmile] Receipt saved locally; Supabase insert failed:', error.message);
    return { ok: true, storage: 'local', id };
  }

  const withRemote: StoredReceipt = { ...localRow, storage: 'local+supabase' };
  writeLocalJson(
    RECEIPT_KEY,
    [withRemote, ...existing.filter((r) => r.id !== id)].slice(0, 300)
  );

  return { ok: true, storage: 'local+supabase', id };
}

export async function listReceiptsForPatient(
  patientId: string,
  clinicDbId: string | null
): Promise<StoredReceipt[]> {
  const local = listLocalReceipts(patientId);

  if (!clinicDbId || !isSupabaseConfigured()) {
    return local;
  }

  const sb = getSupabase();
  if (!sb) return local;

  const { data, error } = await sb
    .from('clinical_receipts')
    .select('*')
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicDbId)
    .order('issued_at', { ascending: false })
    .limit(20);

  if (error || !data?.length) {
    if (error) console.warn('[AuraSmile] listReceipts:', error.message);
    return local;
  }

  const remote: StoredReceipt[] = data.map((row) => ({
    id: row.id as string,
    receiptNo: row.receipt_no as string,
    patientId: row.patient_id as string,
    patientMrn: row.patient_mrn as string,
    patientName: row.patient_name as string,
    doctorName: row.doctor_name as string,
    branchId: row.branch_id as string,
    clinicDbId: (row.clinic_id as string) ?? null,
    procedureTitle: row.procedure_title as string,
    taxablePaise: row.taxable_paise as number,
    gstPercent: Number(row.gst_percent),
    cgstPaise: row.cgst_paise as number,
    sgstPaise: row.sgst_paise as number,
    totalPaise: row.total_paise as number,
    paidVia: row.paid_via as PaidVia,
    upiVpa: (row.upi_vpa as string) || '',
    issuedAtIso: row.issued_at as string,
    persistedAt: (row.created_at as string) || (row.issued_at as string),
    storage: 'supabase',
  }));

  const byId = new Map<string, StoredReceipt>();
  for (const row of [...remote, ...local]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.issuedAtIso).getTime() - new Date(a.issuedAtIso).getTime()
  );
}
