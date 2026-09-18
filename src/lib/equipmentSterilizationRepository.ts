import type {
  AutoclaveSterilizationCycle,
  DentalEquipment,
  EquipmentCategory,
  EquipmentStatus,
} from '../domain/equipment-sterilization';
import { getSupabase, isSupabaseConfigured } from './supabase';

const EQUIP_KEY = 'aurasmile.clinicEquipment.v1';
const CYCLE_KEY = 'aurasmile.autoclaveCycles.v1';

function scope(clinicId: string | null | undefined): string {
  return clinicId || 'demo';
}

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

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

type DbEquipment = {
  id: string;
  clinic_id: string;
  name: string;
  category: string;
  model: string;
  serial_number: string;
  operatory_room: string;
  amc_vendor_name: string;
  amc_vendor_phone: string;
  amc_start_date: string | null;
  amc_expiry_date: string | null;
  last_service_date: string | null;
  status: string;
};

type DbCycle = {
  id: string;
  clinic_id: string;
  cycle_number: number;
  cycle_date: string;
  cycle_time: string;
  autoclave_equipment_id: string | null;
  temperature_celsius: number;
  pressure_psi: number;
  cycle_duration_minutes: number;
  biological_spore_test_passed: boolean;
  chemical_class5_integrator_passed: boolean;
  operator_name: string;
  pouches_processed_count: number;
  pouch_expiry_date: string | null;
};

function rowToEquipment(row: DbEquipment): DentalEquipment {
  return {
    id: row.id,
    name: row.name,
    category: row.category as EquipmentCategory,
    model: row.model || '',
    serialNumber: row.serial_number || '',
    operatoryRoom: row.operatory_room || '',
    amcVendorName: row.amc_vendor_name || '',
    amcVendorPhone: row.amc_vendor_phone || '',
    amcStartDate: row.amc_start_date || '',
    amcExpiryDate: row.amc_expiry_date || '',
    lastServiceDate: row.last_service_date || '',
    status: (row.status as EquipmentStatus) || 'OPERATIONAL',
  };
}

function rowToCycle(row: DbCycle): AutoclaveSterilizationCycle {
  const temp = row.temperature_celsius === 121 ? 121 : 134;
  const psi = row.pressure_psi === 15 ? 15 : 30;
  return {
    id: row.id,
    cycleNumber: row.cycle_number,
    date: row.cycle_date,
    time: row.cycle_time,
    autoclaveEquipmentId: row.autoclave_equipment_id || '',
    temperatureCelsius: temp,
    pressurePsi: psi,
    cycleDurationMinutes: row.cycle_duration_minutes,
    biologicalSporeTestPassed: row.biological_spore_test_passed,
    chemicalClass5IntegratorPassed: row.chemical_class5_integrator_passed,
    operatorName: row.operator_name,
    pouchesProcessedCount: row.pouches_processed_count,
    pouchExpiryDate: row.pouch_expiry_date || '',
  };
}

function useCloud(clinicId: string | null | undefined): boolean {
  return Boolean(clinicId && isSupabaseConfigured());
}

export async function listClinicEquipment(
  clinicId: string | null
): Promise<DentalEquipment[]> {
  if (!useCloud(clinicId)) {
    return readLocalJson<DentalEquipment[]>(`${EQUIP_KEY}:${scope(clinicId)}`, []);
  }
  const sb = getSupabase();
  if (!sb || !clinicId) return [];

  const { data, error } = await sb
    .from('clinic_equipment')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('name');

  if (error || !data) {
    return readLocalJson<DentalEquipment[]>(`${EQUIP_KEY}:${scope(clinicId)}`, []);
  }
  return (data as DbEquipment[]).map(rowToEquipment);
}

export async function createClinicEquipment(
  clinicId: string | null,
  input: Omit<DentalEquipment, 'id'>
): Promise<{ ok: true; equipment: DentalEquipment } | { ok: false; error: string }> {
  const id = newId('eq');
  const equipment: DentalEquipment = { id, ...input };

  const localKey = `${EQUIP_KEY}:${scope(clinicId)}`;
  writeLocalJson(localKey, [equipment, ...readLocalJson<DentalEquipment[]>(localKey, [])]);

  if (!useCloud(clinicId) || !clinicId) {
    return { ok: true, equipment };
  }

  const sb = getSupabase();
  if (!sb) return { ok: true, equipment };

  const { error } = await sb.from('clinic_equipment').insert({
    id,
    clinic_id: clinicId,
    name: input.name,
    category: input.category,
    model: input.model,
    serial_number: input.serialNumber,
    operatory_room: input.operatoryRoom,
    amc_vendor_name: input.amcVendorName,
    amc_vendor_phone: input.amcVendorPhone,
    amc_start_date: input.amcStartDate || null,
    amc_expiry_date: input.amcExpiryDate || null,
    last_service_date: input.lastServiceDate || null,
    status: input.status,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, equipment };
}

export async function updateClinicEquipmentStatus(
  clinicId: string | null,
  equipmentId: string,
  status: EquipmentStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const localKey = `${EQUIP_KEY}:${scope(clinicId)}`;
  const next = readLocalJson<DentalEquipment[]>(localKey, []).map((e) =>
    e.id === equipmentId ? { ...e, status } : e
  );
  writeLocalJson(localKey, next);

  if (!useCloud(clinicId) || !clinicId) return { ok: true };
  const sb = getSupabase();
  if (!sb) return { ok: true };

  const { error } = await sb
    .from('clinic_equipment')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', equipmentId)
    .eq('clinic_id', clinicId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listAutoclaveCycles(
  clinicId: string | null
): Promise<AutoclaveSterilizationCycle[]> {
  if (!useCloud(clinicId)) {
    return readLocalJson<AutoclaveSterilizationCycle[]>(
      `${CYCLE_KEY}:${scope(clinicId)}`,
      []
    );
  }
  const sb = getSupabase();
  if (!sb || !clinicId) return [];

  const { data, error } = await sb
    .from('autoclave_sterilization_cycles')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('cycle_date', { ascending: false })
    .order('cycle_number', { ascending: false });

  if (error || !data) {
    return readLocalJson<AutoclaveSterilizationCycle[]>(
      `${CYCLE_KEY}:${scope(clinicId)}`,
      []
    );
  }
  return (data as DbCycle[]).map(rowToCycle);
}

export async function createAutoclaveCycle(
  clinicId: string | null,
  input: Omit<AutoclaveSterilizationCycle, 'id'>
): Promise<{ ok: true; cycle: AutoclaveSterilizationCycle } | { ok: false; error: string }> {
  const id = newId('cyc');
  const cycle: AutoclaveSterilizationCycle = { id, ...input };

  const localKey = `${CYCLE_KEY}:${scope(clinicId)}`;
  writeLocalJson(localKey, [
    cycle,
    ...readLocalJson<AutoclaveSterilizationCycle[]>(localKey, []),
  ].slice(0, 400));

  if (!useCloud(clinicId) || !clinicId) {
    return { ok: true, cycle };
  }

  const sb = getSupabase();
  if (!sb) return { ok: true, cycle };

  const { error } = await sb.from('autoclave_sterilization_cycles').insert({
    id,
    clinic_id: clinicId,
    cycle_number: input.cycleNumber,
    cycle_date: input.date,
    cycle_time: input.time,
    autoclave_equipment_id: input.autoclaveEquipmentId || null,
    temperature_celsius: input.temperatureCelsius,
    pressure_psi: input.pressurePsi,
    cycle_duration_minutes: input.cycleDurationMinutes,
    biological_spore_test_passed: input.biologicalSporeTestPassed,
    chemical_class5_integrator_passed: input.chemicalClass5IntegratorPassed,
    operator_name: input.operatorName,
    pouches_processed_count: input.pouchesProcessedCount,
    pouch_expiry_date: input.pouchExpiryDate || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, cycle };
}

export function nextCycleNumber(existing: AutoclaveSterilizationCycle[]): number {
  if (!existing.length) return 1;
  return Math.max(...existing.map((c) => c.cycleNumber)) + 1;
}
