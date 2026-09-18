export type MaterialCategory =
  | 'ENDODONTICS'
  | 'RESTORATIVE'
  | 'LOCAL_ANESTHESIA'
  | 'SURGERY'
  | 'PROSTHODONTICS'
  | 'PREVENTIVE'
  | 'STERILIZATION';

export interface DentalMaterial {
  id: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  unitCostPaise: number;
  currentStock: number;
  reorderThreshold: number;
  packageUnit: string;
}

export interface MaterialDeductionItem {
  sku: string;
  name: string;
  quantity: number;
  costPaise: number;
}

export interface CaseDeductionResult {
  updatedMaterials: DentalMaterial[];
  deductedItems: MaterialDeductionItem[];
  totalDeductedCostPaise: number;
}

export type ClinicalProcedurePreset =
  | 'MOLAR_RCT'
  | 'CLASS_II_COMPOSITE'
  | 'SURGICAL_EXTRACTION'
  | 'SCALING_PROPHYLAXIS';

export const CASE_DEDUCTION_RECIPES: Record<ClinicalProcedurePreset, { sku: string; qty: number }[]> = {
  MOLAR_RCT: [
    { sku: 'ENDO-PTG-F1', qty: 1 }, // Protaper Gold Rotary Files
    { sku: 'LA-LIG-2', qty: 1 },    // Lignox 2% Adrenaline Carpule
    { sku: 'ENDO-GP-25', qty: 3 },  // Gutta Percha Cones
    { sku: 'ENDO-AHP-SEAL', qty: 1 }, // AH Plus Bioceramic Sealer dose
  ],
  CLASS_II_COMPOSITE: [
    { sku: 'REST-3M-Z250', qty: 1 }, // 3M Filtek Z250 Composite dose
    { sku: 'REST-ETCH-37', qty: 1 }, // 37% Phosphoric Acid Etch gel
    { sku: 'REST-BOND-SBU', qty: 1 }, // Single Bond Universal adhesive
    { sku: 'LA-LIG-2', qty: 1 },     // Lignox 2% Carpule
  ],
  SURGICAL_EXTRACTION: [
    { sku: 'LA-LIG-2', qty: 2 },     // Lignox 2% Carpules (block + infiltration)
    { sku: 'SURG-SUT-30', qty: 1 },  // 3-0 Silk Suture needle
    { sku: 'SURG-GEL-SPON', qty: 1 }, // Gelatamp Hemostatic sponge
  ],
  SCALING_PROPHYLAXIS: [
    { sku: 'PREV-PROPH-PST', qty: 1 }, // Zircate Prophy Paste cup
    { sku: 'PREV-FLUOR-VAR', qty: 1 }, // Fluoride Varnish unit
  ],
};

/**
 * Checks if a material is expiring within the specified threshold (default: 45 days).
 */
export function isExpiringSoon(material: DentalMaterial, daysThreshold: number = 45, referenceDate: Date = new Date()): boolean {
  const expiryTime = new Date(material.expiryDate).getTime();
  const refTime = referenceDate.getTime();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  return expiryTime - refTime <= thresholdMs;
}

/**
 * Checks if material stock has dropped below or equal to its reorder threshold.
 */
export function isLowStock(material: DentalMaterial): boolean {
  return material.currentStock <= material.reorderThreshold;
}

/**
 * Executes automatic material deduction for a completed clinical dental case.
 */
export function deductCaseMaterials(
  materials: DentalMaterial[],
  procedure: ClinicalProcedurePreset
): CaseDeductionResult {
  const recipe = CASE_DEDUCTION_RECIPES[procedure] || [];
  const materialMap = new Map(materials.map((m) => [m.sku, { ...m }]));
  const deductedItems: MaterialDeductionItem[] = [];
  let totalDeductedCostPaise = 0;

  for (const item of recipe) {
    const existing = materialMap.get(item.sku);
    if (existing) {
      existing.currentStock = Math.max(0, existing.currentStock - item.qty);
      const costPaise = existing.unitCostPaise * item.qty;
      totalDeductedCostPaise += costPaise;

      deductedItems.push({
        sku: item.sku,
        name: existing.name,
        quantity: item.qty,
        costPaise,
      });
    }
  }

  return {
    updatedMaterials: Array.from(materialMap.values()),
    deductedItems,
    totalDeductedCostPaise,
  };
}

export type StockLedgerEntryType = 'PURCHASE' | 'CASE_SPEND';

export interface StockLedgerEntry {
  id: string;
  type: StockLedgerEntryType;
  label: string;
  sku?: string;
  quantity: number;
  amountPaise: number;
  atIso: string;
  procedure?: ClinicalProcedurePreset;
  /** Treating doctor when spend is from a case / receipt */
  doctorName?: string;
}

export interface BoughtVsSpentSummary {
  boughtPaise: number;
  spentPaise: number;
  netPaise: number;
  purchaseCount: number;
  spendCount: number;
}

/** Map chart/plan procedure ids → inventory recipe presets. */
export function procedureIdToPreset(procedureId: string): ClinicalProcedurePreset | null {
  const id = procedureId.toLowerCase();
  if (id.includes('rct') || id.includes('ssrct')) return 'MOLAR_RCT';
  if (id.includes('composite') || id.includes('inlay')) return 'CLASS_II_COMPOSITE';
  if (id.includes('extract')) return 'SURGICAL_EXTRACTION';
  if (id.includes('scaling') || id.includes('curettage')) return 'SCALING_PROPHYLAXIS';
  return null;
}

export function recordPurchase(
  materials: DentalMaterial[],
  sku: string,
  quantity: number
): { materials: DentalMaterial[]; entry: StockLedgerEntry | null } {
  if (quantity <= 0) return { materials, entry: null };
  const next = materials.map((m) => {
    if (m.sku !== sku) return m;
    return { ...m, currentStock: m.currentStock + quantity };
  });
  const mat = materials.find((m) => m.sku === sku);
  if (!mat) return { materials, entry: null };
  const entry: StockLedgerEntry = {
    id: `buy-${Date.now()}`,
    type: 'PURCHASE',
    label: `Bought ${mat.name}`,
    sku,
    quantity,
    amountPaise: mat.unitCostPaise * quantity,
    atIso: new Date().toISOString(),
  };
  return { materials: next, entry };
}

export function summarizeBoughtVsSpent(entries: StockLedgerEntry[]): BoughtVsSpentSummary {
  let boughtPaise = 0;
  let spentPaise = 0;
  let purchaseCount = 0;
  let spendCount = 0;
  for (const e of entries) {
    if (e.type === 'PURCHASE') {
      boughtPaise += e.amountPaise;
      purchaseCount += 1;
    } else {
      spentPaise += e.amountPaise;
      spendCount += 1;
    }
  }
  return {
    boughtPaise,
    spentPaise,
    netPaise: boughtPaise - spentPaise,
    purchaseCount,
    spendCount,
  };
}

export function ledgerEntryFromDeduction(
  procedure: ClinicalProcedurePreset,
  label: string,
  result: CaseDeductionResult,
  doctorName?: string
): StockLedgerEntry {
  return {
    id: `spend-${Date.now()}`,
    type: 'CASE_SPEND',
    label,
    quantity: result.deductedItems.reduce((n, i) => n + i.quantity, 0),
    amountPaise: result.totalDeductedCostPaise,
    atIso: new Date().toISOString(),
    procedure,
    doctorName,
  };
}

/** Guess inventory recipe from free-text / plan procedure label. */
export function procedureLabelToPreset(label: string): ClinicalProcedurePreset | null {
  return procedureIdToPreset(label);
}
