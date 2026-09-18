import type { DentalMaterial, StockLedgerEntry } from '../domain/inventory';
import {
  deductCaseMaterials,
  ledgerEntryFromDeduction,
  procedureIdToPreset,
} from '../domain/inventory';
import { MOCK_INVENTORY_MATERIALS } from '../data/mockPhase2Data';

const STOCK_KEY = 'aurasmile.inventoryStock.v1';
const LEDGER_KEY = 'aurasmile.inventoryLedger.v1';
const AUTO_DED_KEY = 'aurasmile.inventoryAutoDeductions.v1';

/** Active clinic scope for stock/ledger keys (set by InventoryManager / billing). */
let activeClinicScope: string = 'demo';

export function setInventoryClinicScope(clinicId: string | null | undefined): void {
  activeClinicScope = clinicId?.trim() || 'demo';
}

export function getInventoryClinicScope(): string {
  return activeClinicScope;
}

function stockKey(scope = activeClinicScope): string {
  return `${STOCK_KEY}:${scope}`;
}
function ledgerKey(scope = activeClinicScope): string {
  return `${LEDGER_KEY}:${scope}`;
}
function autoDedKey(scope = activeClinicScope): string {
  return `${AUTO_DED_KEY}:${scope}`;
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

/**
 * Load stock for the active clinic scope.
 * Live clinics: never auto-seed mock SKUs (empty until purchase / Load starter).
 * Demo scope: seed MOCK pack once if empty (sandbox UX).
 */
export function loadInventoryStock(opts?: { seedDemoIfEmpty?: boolean }): DentalMaterial[] {
  const seed = opts?.seedDemoIfEmpty ?? activeClinicScope === 'demo';
  const saved = readLocalJson<DentalMaterial[] | null>(stockKey(), null);
  if (saved?.length) return saved;
  if (!seed) return [];
  const seeded = MOCK_INVENTORY_MATERIALS.map((m) => ({ ...m }));
  writeLocalJson(stockKey(), seeded);
  return seeded;
}

export function saveInventoryStock(materials: DentalMaterial[]): void {
  writeLocalJson(stockKey(), materials);
}

export function loadInventoryLedger(): StockLedgerEntry[] {
  return readLocalJson<StockLedgerEntry[]>(ledgerKey(), []);
}

export function appendInventoryLedger(entry: StockLedgerEntry): StockLedgerEntry[] {
  const next = [entry, ...loadInventoryLedger()].slice(0, 300);
  writeLocalJson(ledgerKey(), next);
  return next;
}

/** Apply case material spend from a billed procedure (device ledger). */
export function applyCaseSpendFromProcedure(input: {
  procedureTitle: string;
  doctorName?: string;
  clinicDbId?: string | null;
}): { ok: boolean; spentPaise: number; label: string } {
  if (input.clinicDbId !== undefined) {
    setInventoryClinicScope(input.clinicDbId);
  }
  const preset = procedureIdToPreset(input.procedureTitle);
  if (!preset) return { ok: false, spentPaise: 0, label: input.procedureTitle };
  const materials = loadInventoryStock({ seedDemoIfEmpty: false });
  if (!materials.length) {
    return { ok: false, spentPaise: 0, label: input.procedureTitle };
  }
  const result = deductCaseMaterials(materials, preset);
  if (result.deductedItems.length === 0) {
    return { ok: false, spentPaise: 0, label: input.procedureTitle };
  }
  saveInventoryStock(result.updatedMaterials);
  appendInventoryLedger(
    ledgerEntryFromDeduction(
      preset,
      input.procedureTitle,
      result,
      input.doctorName
    )
  );
  appendAutoDeduction({
    atIso: new Date().toISOString(),
    patientName: input.doctorName,
    procedureTitle: input.procedureTitle,
    items: result.deductedItems.map((i) => ({
      itemName: i.name,
      quantity: i.quantity,
    })),
  });
  return {
    ok: true,
    spentPaise: result.totalDeductedCostPaise,
    label: input.procedureTitle,
  };
}

export type AutoDeductionEntry = {
  atIso: string;
  patientName?: string;
  procedureTitle: string;
  items: { itemName: string; quantity: number }[];
};

function appendAutoDeduction(entry: AutoDeductionEntry): void {
  const prev = readLocalJson<AutoDeductionEntry[]>(autoDedKey(), []);
  writeLocalJson(autoDedKey(), [entry, ...prev].slice(0, 50));
}

export function listRecentAutoDeductions(limit = 10): AutoDeductionEntry[] {
  return readLocalJson<AutoDeductionEntry[]>(autoDedKey(), []).slice(0, limit);
}

/** Name-based deduction fallback when SKU recipe does not match. */
export function deductInventoryByItemNames(
  deductions: { itemName: string; quantity: number }[],
  meta?: { patientName?: string; procedureTitle?: string; clinicDbId?: string | null }
): { ok: boolean; summary: string } {
  if (meta?.clinicDbId !== undefined) {
    setInventoryClinicScope(meta.clinicDbId);
  }
  if (!deductions.length) return { ok: false, summary: '' };
  const materials = loadInventoryStock({ seedDemoIfEmpty: false });
  if (!materials.length) return { ok: false, summary: '' };
  let changed = false;
  const applied: { itemName: string; quantity: number }[] = [];
  const next = materials.map((m) => {
    const hit = deductions.find(
      (d) =>
        m.name.toLowerCase().includes(d.itemName.toLowerCase()) ||
        d.itemName.toLowerCase().includes(m.name.toLowerCase().slice(0, 8))
    );
    if (!hit) return m;
    changed = true;
    applied.push({ itemName: m.name, quantity: hit.quantity });
    return {
      ...m,
      currentStock: Math.max(0, m.currentStock - Math.ceil(hit.quantity)),
    };
  });
  if (!changed) return { ok: false, summary: '' };
  saveInventoryStock(next);
  const label = meta?.procedureTitle || 'Procedure';
  appendInventoryLedger({
    id: `spend-name-${Date.now()}`,
    type: 'CASE_SPEND',
    label,
    quantity: applied.reduce((n, i) => n + i.quantity, 0),
    amountPaise: 0,
    atIso: new Date().toISOString(),
    doctorName: meta?.patientName,
  });
  appendAutoDeduction({
    atIso: new Date().toISOString(),
    patientName: meta?.patientName,
    procedureTitle: label,
    items: applied,
  });
  const summary = applied.map((a) => `${a.quantity} ${a.itemName}`).join(', ');
  return { ok: true, summary };
}

export function resetInventoryDemo(): {
  materials: DentalMaterial[];
  ledger: StockLedgerEntry[];
} {
  const materials = MOCK_INVENTORY_MATERIALS.map((m) => ({ ...m }));
  writeLocalJson(stockKey(), materials);
  writeLocalJson(ledgerKey(), []);
  writeLocalJson(autoDedKey(), []);
  return { materials, ledger: [] };
}

export function clearInventoryForClinic(): void {
  writeLocalJson(stockKey(), []);
  writeLocalJson(ledgerKey(), []);
  writeLocalJson(autoDedKey(), []);
}
