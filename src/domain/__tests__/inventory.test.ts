import { describe, expect, it } from 'vitest';
import {
  DentalMaterial,
  deductCaseMaterials,
  isExpiringSoon,
  isLowStock,
  ledgerEntryFromDeduction,
  procedureIdToPreset,
  recordPurchase,
  summarizeBoughtVsSpent,
} from '../inventory';

const materials: DentalMaterial[] = [
  {
    id: 'm1',
    sku: 'ENDO-PTG-F1',
    name: 'Protaper Gold',
    category: 'ENDODONTICS',
    manufacturer: 'Dentsply',
    batchNumber: 'B1',
    expiryDate: '2026-10-01',
    unitCostPaise: 120000,
    currentStock: 12,
    reorderThreshold: 5,
    packageUnit: 'pack',
  },
  {
    id: 'm2',
    sku: 'LA-LIG-2',
    name: 'Lignox 2%',
    category: 'LOCAL_ANESTHESIA',
    manufacturer: 'Indoco',
    batchNumber: 'B2',
    expiryDate: '2027-01-01',
    unitCostPaise: 4500,
    currentStock: 4,
    reorderThreshold: 10,
    packageUnit: 'carpule',
  },
  {
    id: 'm3',
    sku: 'ENDO-GP-25',
    name: 'GP 25',
    category: 'ENDODONTICS',
    manufacturer: 'Dentsply',
    batchNumber: 'B3',
    expiryDate: '2028-01-01',
    unitCostPaise: 800,
    currentStock: 50,
    reorderThreshold: 10,
    packageUnit: 'cone',
  },
  {
    id: 'm4',
    sku: 'ENDO-AHP-SEAL',
    name: 'AH Plus',
    category: 'ENDODONTICS',
    manufacturer: 'Dentsply',
    batchNumber: 'B4',
    expiryDate: '2028-01-01',
    unitCostPaise: 15000,
    currentStock: 20,
    reorderThreshold: 5,
    packageUnit: 'dose',
  },
  {
    id: 'm5',
    sku: 'REST-3M-Z250',
    name: 'Filtek Z250',
    category: 'RESTORATIVE',
    manufacturer: '3M',
    batchNumber: 'B5',
    expiryDate: '2028-01-01',
    unitCostPaise: 25000,
    currentStock: 30,
    reorderThreshold: 5,
    packageUnit: 'dose',
  },
  {
    id: 'm6',
    sku: 'REST-ETCH-37',
    name: 'Etch 37%',
    category: 'RESTORATIVE',
    manufacturer: '3M',
    batchNumber: 'B6',
    expiryDate: '2028-01-01',
    unitCostPaise: 5000,
    currentStock: 20,
    reorderThreshold: 5,
    packageUnit: 'dose',
  },
  {
    id: 'm7',
    sku: 'REST-BOND-SBU',
    name: 'SBU Bond',
    category: 'RESTORATIVE',
    manufacturer: '3M',
    batchNumber: 'B7',
    expiryDate: '2028-01-01',
    unitCostPaise: 8000,
    currentStock: 20,
    reorderThreshold: 5,
    packageUnit: 'dose',
  },
];

describe('inventory auto-deduction', () => {
  it('detects 45-day expiry window', () => {
    expect(isExpiringSoon(materials[0], 45, new Date('2026-09-15'))).toBe(true);
    expect(isExpiringSoon(materials[1], 45, new Date('2026-09-15'))).toBe(false);
  });

  it('detects low stock', () => {
    expect(isLowStock(materials[0])).toBe(false);
    expect(isLowStock(materials[1])).toBe(true);
  });

  it('deducts molar RCT recipe in paise', () => {
    const result = deductCaseMaterials(materials, 'MOLAR_RCT');
    expect(result.totalDeductedCostPaise).toBeGreaterThan(0);
    expect(result.deductedItems.length).toBeGreaterThan(0);
    expect(Number.isInteger(result.totalDeductedCostPaise)).toBe(true);
    const files = result.updatedMaterials.find((m) => m.sku === 'ENDO-PTG-F1');
    expect(files?.currentStock).toBe(11);
  });

  it('records purchases and summarizes bought vs spent', () => {
    const { materials: afterBuy, entry: buy } = recordPurchase(materials, 'LA-LIG-2', 10);
    expect(buy?.type).toBe('PURCHASE');
    expect(buy?.amountPaise).toBe(4500 * 10);
    const spend = deductCaseMaterials(afterBuy, 'CLASS_II_COMPOSITE');
    const spendEntry = ledgerEntryFromDeduction('CLASS_II_COMPOSITE', 'Composite', spend);
    const summary = summarizeBoughtVsSpent([buy!, spendEntry]);
    expect(summary.boughtPaise).toBe(buy!.amountPaise);
    expect(summary.spentPaise).toBe(spend.totalDeductedCostPaise);
    expect(summary.netPaise).toBe(buy!.amountPaise - spend.totalDeductedCostPaise);
    expect(procedureIdToPreset('ssrct-crown')).toBe('MOLAR_RCT');
  });
});
