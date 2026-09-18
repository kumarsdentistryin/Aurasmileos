/**
 * Treatment plan persistence — localStorage first (works before any DB migration).
 * Keyed by clinic scope + patient so refresh keeps chairside plan lines.
 * After migration, patients.treatment_plan_lines is source of truth when present on the row.
 */
import { TreatmentPlanLine } from '../domain/treatmentPlan';

const STORAGE_KEY = 'aurasmile.treatmentPlans.v1';

type PlanStore = Record<string, TreatmentPlanLine[]>;

/** In-memory fallback for Node/vitest (no localStorage). */
let memoryStore: PlanStore = {};

function scopeKey(clinicKey: string, patientId: string): string {
  return `${clinicKey}::${patientId}`;
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function readStore(): PlanStore {
  if (!canUseLocalStorage()) return { ...memoryStore };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PlanStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: PlanStore): void {
  memoryStore = store;
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadTreatmentPlanLines(
  clinicKey: string,
  patientId: string
): TreatmentPlanLine[] {
  if (!patientId) return [];
  const store = readStore();
  return store[scopeKey(clinicKey, patientId)] ?? [];
}

export function saveTreatmentPlanLines(
  clinicKey: string,
  patientId: string,
  lines: TreatmentPlanLine[]
): void {
  if (!patientId) return;
  const store = readStore();
  const forPatient = lines.filter((l) => l.patientId === patientId);
  store[scopeKey(clinicKey, patientId)] = forPatient;
  writeStore(store);
}

export function clearTreatmentPlanStore(): void {
  memoryStore = {};
  if (!canUseLocalStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * DB column present → use patient lines (incl. []); else localStorage fallback.
 * `fromPatient === undefined` means the column was not on the row yet.
 */
export function resolveTreatmentPlanLines(
  clinicKey: string,
  patientId: string,
  fromPatient?: TreatmentPlanLine[]
): TreatmentPlanLine[] {
  if (fromPatient !== undefined) {
    saveTreatmentPlanLines(clinicKey, patientId, fromPatient);
    return fromPatient;
  }
  return loadTreatmentPlanLines(clinicKey, patientId);
}

/** Merge patient-scoped lines into a full lines array (other patients preserved in RAM). */
export function mergePatientPlanLines(
  allLines: TreatmentPlanLine[],
  patientId: string,
  patientLines: TreatmentPlanLine[]
): TreatmentPlanLine[] {
  return [...allLines.filter((l) => l.patientId !== patientId), ...patientLines];
}
