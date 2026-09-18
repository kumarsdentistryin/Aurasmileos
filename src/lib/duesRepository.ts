import { getSupabase, isSupabaseConfigured } from './supabase';

export type DuesRecord = {
  id: string;
  patientId: string;
  patientName: string;
  phone?: string;
  totalPaise: number;
  collectedPaise: number;
  balancePaise: number;
  procedureName: string;
  dueDate: string;
  createdAt: string;
  paymentMode?: string;
  settled?: boolean;
};

function storageKey(clinicId: string | null | undefined): string {
  return `aurasmile_dues_${clinicId || 'demo'}`;
}

function readAll(clinicId: string | null | undefined): DuesRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(clinicId));
    if (!raw) return [];
    return JSON.parse(raw) as DuesRecord[];
  } catch {
    return [];
  }
}

function writeAll(clinicId: string | null | undefined, rows: DuesRecord[]): void {
  localStorage.setItem(storageKey(clinicId), JSON.stringify(rows.slice(0, 400)));
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `due-${Date.now()}`;
}

function useCloud(clinicId: string | null | undefined): boolean {
  return Boolean(clinicId && isSupabaseConfigured());
}

type DbDue = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  phone: string | null;
  total_paise: number;
  collected_paise: number;
  balance_paise: number;
  procedure_name: string;
  due_date: string | null;
  payment_mode: string | null;
  settled: boolean;
  created_at: string;
};

function rowToDue(row: DbDue): DuesRecord {
  return {
    id: row.id,
    patientId: row.patient_id || '',
    patientName: row.patient_name,
    phone: row.phone || undefined,
    totalPaise: Number(row.total_paise),
    collectedPaise: Number(row.collected_paise),
    balancePaise: Number(row.balance_paise),
    procedureName: row.procedure_name,
    dueDate: row.due_date || '',
    createdAt: row.created_at,
    paymentMode: row.payment_mode || undefined,
    settled: row.settled,
  };
}

/** Sync read from local cache (after listDuesFromCloud / save). */
export function listOpenDues(clinicId: string | null | undefined): DuesRecord[] {
  return readAll(clinicId).filter((d) => !d.settled && d.balancePaise > 0);
}

export function sumOpenDuesPaise(clinicId: string | null | undefined): number {
  return listOpenDues(clinicId).reduce((s, d) => s + d.balancePaise, 0);
}

export async function hydrateDuesFromCloud(
  clinicId: string | null | undefined
): Promise<DuesRecord[]> {
  if (!useCloud(clinicId) || !clinicId) return listOpenDues(clinicId);
  const sb = getSupabase();
  if (!sb) return listOpenDues(clinicId);

  const { data, error } = await sb
    .from('patient_dues')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error || !data) return listOpenDues(clinicId);
  const rows = (data as DbDue[]).map(rowToDue);
  writeAll(clinicId, rows);
  return rows.filter((d) => !d.settled && d.balancePaise > 0);
}

export async function saveDue(
  clinicId: string | null | undefined,
  record: Omit<DuesRecord, 'id' | 'createdAt' | 'settled'>
): Promise<DuesRecord> {
  const full: DuesRecord = {
    ...record,
    id: newId(),
    createdAt: new Date().toISOString(),
    settled: false,
  };
  if (full.balancePaise <= 0) return full;
  writeAll(clinicId, [full, ...readAll(clinicId)]);

  if (useCloud(clinicId) && clinicId) {
    const sb = getSupabase();
    if (sb) {
      await sb.from('patient_dues').insert({
        id: full.id,
        clinic_id: clinicId,
        patient_id: full.patientId || null,
        patient_name: full.patientName,
        phone: full.phone ?? null,
        total_paise: full.totalPaise,
        collected_paise: full.collectedPaise,
        balance_paise: full.balancePaise,
        procedure_name: full.procedureName,
        due_date: full.dueDate || null,
        payment_mode: full.paymentMode ?? null,
        settled: false,
      });
    }
  }
  return full;
}

export async function markDueSettled(
  clinicId: string | null | undefined,
  dueId: string
): Promise<void> {
  const next = readAll(clinicId).map((d) =>
    d.id === dueId
      ? { ...d, settled: true, balancePaise: 0, collectedPaise: d.totalPaise }
      : d
  );
  writeAll(clinicId, next);

  if (useCloud(clinicId) && clinicId) {
    const sb = getSupabase();
    if (sb) {
      await sb
        .from('patient_dues')
        .update({ settled: true, balance_paise: 0 })
        .eq('id', dueId)
        .eq('clinic_id', clinicId);
    }
  }
}
