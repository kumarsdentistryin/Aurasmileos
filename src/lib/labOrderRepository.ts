import type {
  LabOrder,
  LabOrderStatus,
  LabPartnerName,
  RestorationType,
  VitaShade,
} from '../domain/lab';
import { getSupabase, isSupabaseConfigured } from './supabase';

const LOCAL_KEY = 'aurasmile.labOrders.v1';

function scope(clinicId: string | null | undefined): string {
  return clinicId || 'demo';
}

function readLocal(clinicId: string | null | undefined): LabOrder[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${scope(clinicId)}`);
    if (!raw) return [];
    return JSON.parse(raw) as LabOrder[];
  } catch {
    return [];
  }
}

function writeLocal(clinicId: string | null | undefined, rows: LabOrder[]): void {
  localStorage.setItem(`${LOCAL_KEY}:${scope(clinicId)}`, JSON.stringify(rows.slice(0, 400)));
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `lab-${Date.now()}`;
}

function useCloud(clinicId: string | null | undefined): boolean {
  return Boolean(clinicId && isSupabaseConfigured());
}

type DbLab = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string;
  doctor_name: string;
  lab_partner: string;
  tooth_id: number;
  restoration_type: string;
  primary_shade: string;
  cervical_shade: string | null;
  incisal_translucency: string;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  patient_appointment_date: string;
  warranty_years: number;
  warranty_card_number: string | null;
  lab_cost_paise: number;
  notes: string | null;
};

function rowToOrder(row: DbLab): LabOrder {
  return {
    id: row.id,
    patientId: row.patient_id || '',
    patientName: row.patient_name,
    doctorName: row.doctor_name,
    labPartner: row.lab_partner as LabPartnerName,
    toothId: row.tooth_id as LabOrder['toothId'],
    restorationType: row.restoration_type as RestorationType,
    primaryShade: row.primary_shade as VitaShade,
    cervicalShade: (row.cervical_shade as VitaShade) || undefined,
    incisalTranslucency: (row.incisal_translucency as LabOrder['incisalTranslucency']) || 'HIGH',
    status: row.status as LabOrderStatus,
    orderDate: row.order_date,
    expectedDeliveryDate: row.expected_delivery_date,
    patientAppointmentDate: row.patient_appointment_date,
    warrantyYears: row.warranty_years,
    warrantyCardNumber: row.warranty_card_number || undefined,
    labCostPaise: Number(row.lab_cost_paise),
    notes: row.notes || undefined,
  };
}

function orderToInsert(clinicId: string, order: LabOrder) {
  return {
    id: order.id,
    clinic_id: clinicId,
    patient_id: order.patientId || null,
    patient_name: order.patientName,
    doctor_name: order.doctorName,
    lab_partner: order.labPartner,
    tooth_id: order.toothId,
    restoration_type: order.restorationType,
    primary_shade: order.primaryShade,
    cervical_shade: order.cervicalShade ?? null,
    incisal_translucency: order.incisalTranslucency,
    status: order.status,
    order_date: order.orderDate,
    expected_delivery_date: order.expectedDeliveryDate,
    patient_appointment_date: order.patientAppointmentDate,
    warranty_years: order.warrantyYears,
    warranty_card_number: order.warrantyCardNumber ?? null,
    lab_cost_paise: order.labCostPaise,
    notes: order.notes ?? null,
  };
}

export async function listLabOrders(clinicId: string | null): Promise<LabOrder[]> {
  if (!useCloud(clinicId)) return readLocal(clinicId);
  const sb = getSupabase();
  if (!sb || !clinicId) return readLocal(clinicId);

  const { data, error } = await sb
    .from('lab_orders')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('order_date', { ascending: false });

  if (error || !data) return readLocal(clinicId);
  const rows = (data as DbLab[]).map(rowToOrder);
  writeLocal(clinicId, rows);
  return rows;
}

export function countOpenLabOrders(orders: LabOrder[]): number {
  return orders.filter(
    (o) =>
      o.status === 'SENT_TO_LAB' ||
      o.status === 'IN_FABRICATION' ||
      o.status === 'RECEIVED_IN_CLINIC' ||
      o.status === 'TRY_IN_SCHEDULED'
  ).length;
}

export async function countPendingLabSlips(clinicId: string | null): Promise<number> {
  const orders = await listLabOrders(clinicId);
  return countOpenLabOrders(orders);
}

export async function createLabOrder(
  clinicId: string | null,
  input: Omit<LabOrder, 'id'>
): Promise<{ ok: true; order: LabOrder } | { ok: false; error: string }> {
  const order: LabOrder = { id: newId(), ...input };
  writeLocal(clinicId, [order, ...readLocal(clinicId)]);

  if (!useCloud(clinicId) || !clinicId) return { ok: true, order };
  const sb = getSupabase();
  if (!sb) return { ok: true, order };

  const { error } = await sb.from('lab_orders').insert(orderToInsert(clinicId, order));
  if (error) return { ok: false, error: error.message };
  return { ok: true, order };
}

export async function updateLabOrderStatus(
  clinicId: string | null,
  orderId: string,
  status: LabOrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const next = readLocal(clinicId).map((o) => (o.id === orderId ? { ...o, status } : o));
  writeLocal(clinicId, next);

  if (!useCloud(clinicId) || !clinicId) return { ok: true };
  const sb = getSupabase();
  if (!sb) return { ok: true };

  const { error } = await sb
    .from('lab_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('clinic_id', clinicId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
