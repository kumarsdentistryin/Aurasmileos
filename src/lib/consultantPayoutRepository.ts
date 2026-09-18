import type { ConsultantPayoutRecord } from '../domain/consultants';
import { getSupabase, isSupabaseConfigured } from './supabase';

type DbPayoutRow = {
  id: string;
  clinic_id: string;
  consultant_member_id: string;
  consultant_name: string;
  patient_id: string | null;
  patient_name: string;
  procedure_name: string;
  procedure_date: string;
  gross_fee_paise: number;
  consultant_share_percentage: number;
  gross_payout_paise: number;
  tds_withholding_paise: number;
  net_payable_paise: number;
  payment_status: string;
  utr_number: string | null;
  settled_date: string | null;
};

const LOCAL_KEY = 'aurasmile.consultantPayouts.v1';

function readLocal(clinicId: string): ConsultantPayoutRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${clinicId}`);
    if (!raw) return [];
    return JSON.parse(raw) as ConsultantPayoutRecord[];
  } catch {
    return [];
  }
}

function writeLocal(clinicId: string, rows: ConsultantPayoutRecord[]): void {
  localStorage.setItem(`${LOCAL_KEY}:${clinicId}`, JSON.stringify(rows.slice(0, 500)));
}

function rowToRecord(row: DbPayoutRow): ConsultantPayoutRecord {
  return {
    id: row.id,
    consultantId: row.consultant_member_id,
    consultantName: row.consultant_name,
    patientId: row.patient_id ?? '',
    patientName: row.patient_name,
    procedureName: row.procedure_name,
    procedureDate: row.procedure_date,
    grossFeePaise: Number(row.gross_fee_paise),
    consultantSharePercentage: row.consultant_share_percentage,
    grossPayoutPaise: Number(row.gross_payout_paise),
    tdsWithholdingPaise: Number(row.tds_withholding_paise),
    netPayablePaise: Number(row.net_payable_paise),
    paymentStatus: row.payment_status === 'SETTLED' ? 'SETTLED' : 'PENDING',
    utrNumber: row.utr_number ?? undefined,
    settledDate: row.settled_date ?? undefined,
  };
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pay-${Date.now()}`;
}

export async function listConsultantPayouts(
  clinicId: string
): Promise<ConsultantPayoutRecord[]> {
  if (!isSupabaseConfigured()) {
    return readLocal(clinicId);
  }
  const sb = getSupabase();
  if (!sb) return readLocal(clinicId);

  const { data, error } = await sb
    .from('consultant_payouts')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return readLocal(clinicId);
  }
  return (data as DbPayoutRow[]).map(rowToRecord);
}

export async function createConsultantPayout(
  clinicId: string,
  record: Omit<ConsultantPayoutRecord, 'id'>
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = newId();
  const full: ConsultantPayoutRecord = { id, ...record };

  const local = readLocal(clinicId);
  writeLocal(clinicId, [full, ...local]);

  if (!isSupabaseConfigured()) {
    return { ok: true, id };
  }
  const sb = getSupabase();
  if (!sb) return { ok: true, id };

  const { error } = await sb.from('consultant_payouts').insert({
    id,
    clinic_id: clinicId,
    consultant_member_id: record.consultantId,
    consultant_name: record.consultantName,
    patient_id: record.patientId || null,
    patient_name: record.patientName,
    procedure_name: record.procedureName,
    procedure_date: record.procedureDate,
    gross_fee_paise: record.grossFeePaise,
    consultant_share_percentage: record.consultantSharePercentage,
    gross_payout_paise: record.grossPayoutPaise,
    tds_withholding_paise: record.tdsWithholdingPaise,
    net_payable_paise: record.netPayablePaise,
    payment_status: record.paymentStatus,
    utr_number: record.utrNumber ?? null,
    settled_date: record.settledDate ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id };
}

export async function settleConsultantPayout(
  clinicId: string,
  recordId: string,
  utrNumber: string,
  settledDate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const local = readLocal(clinicId).map((p) =>
    p.id === recordId
      ? { ...p, paymentStatus: 'SETTLED' as const, utrNumber, settledDate }
      : p
  );
  writeLocal(clinicId, local);

  if (!isSupabaseConfigured()) return { ok: true };
  const sb = getSupabase();
  if (!sb) return { ok: true };

  const { error } = await sb
    .from('consultant_payouts')
    .update({
      payment_status: 'SETTLED',
      utr_number: utrNumber,
      settled_date: settledDate,
    })
    .eq('id', recordId)
    .eq('clinic_id', clinicId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
