import React, { useEffect, useMemo, useState } from 'react';
import {
  DentalMaterial,
  isExpiringSoon,
  isLowStock,
  deductCaseMaterials,
  ClinicalProcedurePreset,
  MaterialDeductionItem,
  recordPurchase,
  summarizeBoughtVsSpent,
  ledgerEntryFromDeduction,
  StockLedgerEntry,
} from '../../domain/inventory';
import { formatPaiseToInr } from '../../domain/financials';
import {
  appendInventoryLedger,
  listRecentAutoDeductions,
  loadInventoryLedger,
  loadInventoryStock,
  resetInventoryDemo,
  saveInventoryStock,
  setInventoryClinicScope,
} from '../../lib/inventoryPersistence';
import { Package, AlertTriangle, ArrowDownRight, RefreshCw, ShieldAlert, Layers, ShoppingCart } from 'lucide-react';

interface InventoryManagerProps {
  clinicDbId?: string | null;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ clinicDbId = null }) => {
  const isLive = Boolean(clinicDbId);

  const hydrate = () => {
    setInventoryClinicScope(clinicDbId);
    const next = loadInventoryStock({ seedDemoIfEmpty: true });
    setMaterials(next);
    setLedger(loadInventoryLedger());
    setAutoDeductions(listRecentAutoDeductions(10));
    setBuySku(next[0]?.sku ?? '');
  };

  const [materials, setMaterials] = useState<DentalMaterial[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [autoDeductions, setAutoDeductions] = useState(() => listRecentAutoDeductions(10));
  const [lastDeductedItems, setLastDeductedItems] = useState<MaterialDeductionItem[]>([]);
  const [lastDeductedProcedure, setLastDeductedProcedure] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [buySku, setBuySku] = useState('');
  const [buyQty, setBuyQty] = useState(10);

  useEffect(() => {
    hydrate();
    const handleUpdate = () => hydrate();
    window.addEventListener('aurasmile:inventory_updated', handleUpdate);
    return () => {
      window.removeEventListener('aurasmile:inventory_updated', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicDbId]);

  const summary = useMemo(() => summarizeBoughtVsSpent(ledger), [ledger]);

  const persistStock = (next: DentalMaterial[]) => {
    setMaterials(next);
    saveInventoryStock(next);
  };

  const handleSimulateDeduction = (procedure: ClinicalProcedurePreset, label: string) => {
    const result = deductCaseMaterials(materials, procedure);
    persistStock(result.updatedMaterials);
    setLastDeductedItems(result.deductedItems);
    setLastDeductedProcedure(label);
    const entry = ledgerEntryFromDeduction(procedure, label, result);
    setLedger(appendInventoryLedger(entry));
    setAutoDeductions(listRecentAutoDeductions(10));
  };

  const handlePurchase = () => {
    const { materials: next, entry } = recordPurchase(materials, buySku, buyQty);
    if (!entry) return;
    persistStock(next);
    setLedger(appendInventoryLedger(entry));
  };

  const handleRestockAll = () => {
    setInventoryClinicScope(clinicDbId);
    const reset = resetInventoryDemo();
    setMaterials(reset.materials);
    setLedger(reset.ledger);
    setBuySku(reset.materials[0]?.sku ?? '');
    setLastDeductedItems([]);
    setLastDeductedProcedure(null);
    setAutoDeductions([]);
  };

  const filtered =
    filterCategory === 'ALL'
      ? materials
      : materials.filter((m) => m.category === filterCategory);

  const lowStockCount = materials.filter((m) => isLowStock(m)).length;
  const expiringSoonCount = materials.filter((m) => isExpiringSoon(m, 45)).length;

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950"
      >
        {isLive
          ? 'Stock ledger on this device for your clinic — bought vs spent is real here; not multi-tablet supplier ERP yet.'
          : 'Demo stock ledger on this device — bought vs spent is real for this tablet; not live supplier ERP yet.'}
      </div>

      {materials.length === 0 && (
        <div className="surface-card p-10 text-center max-w-lg mx-auto">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-900">
            {isLive ? 'No stock for this clinic yet' : 'No stock on this device yet'}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            {isLive
              ? 'Live clinics start empty — we do not import demo SKUs. Load a starter list, then record real purchases as consignments arrive.'
              : 'New clinics start empty. Load a starter SKU list for Indian operatories, then record purchases as consignments arrive.'}
          </p>
          <button
            type="button"
            onClick={handleRestockAll}
            className="tactile-btn mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)]"
          >
            <RefreshCw className="h-4 w-4" />
            Load starter inventory
          </button>
        </div>
      )}

      {materials.length > 0 && (
      <>
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-[var(--color-brand)]">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-base font-bold text-slate-900">Material inventory</h2>
            <p className="text-xs text-slate-500">
              Bought vs spent · recipe deduction · expiry / reorder
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestockAll}
          className="tactile-btn flex items-center space-x-1.5 rounded border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{isLive ? 'Reload starter SKUs' : 'Reset demo stock'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="surface-card p-3">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Bought</span>
          <div className="mt-0.5 font-mono text-base font-bold text-slate-900">
            {formatPaiseToInr(summary.boughtPaise)}
          </div>
          <p className="text-[11px] text-slate-400">{summary.purchaseCount} purchases</p>
        </div>
        <div className="surface-card p-3">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Spent (cases)</span>
          <div className="mt-0.5 font-mono text-base font-bold text-rose-800">
            {formatPaiseToInr(summary.spentPaise)}
          </div>
          <p className="text-[11px] text-slate-400">{summary.spendCount} case deductions</p>
        </div>
        <div className="surface-card p-3">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Net (bought − spent)</span>
          <div className="mt-0.5 font-mono text-base font-bold text-[var(--color-brand)]">
            {formatPaiseToInr(summary.netPaise)}
          </div>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-700 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold text-rose-900">
              Low stock items · {lowStockCount}
            </div>
            <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
              {materials
                .filter((m) => isLowStock(m))
                .slice(0, 5)
                .map((m) => m.name)
                .join(' · ')}
              {lowStockCount > 5 ? '…' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="surface-card space-y-3 p-4">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
          <ShoppingCart className="h-4 w-4 text-[var(--color-brand)]" />
          Record purchase (bought)
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-600">
            SKU
            <select
              value={buySku}
              onChange={(e) => setBuySku(e.target.value)}
              className="mt-1 block rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
            >
              {materials.map((m) => (
                <option key={m.sku} value={m.sku}>
                  {m.sku} · {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-slate-600">
            Qty
            <input
              type="number"
              min={1}
              value={buyQty}
              onChange={(e) => setBuyQty(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 block w-20 rounded-md border border-slate-200 px-2 py-1.5 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={handlePurchase}
            className="tactile-btn rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-brand-hover)]"
          >
            Add stock
          </button>
        </div>
      </div>

      <div className="surface-card space-y-3 border-slate-200 p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Layers className="h-4 w-4 text-[var(--color-brand)]" />
            Case spend (auto-deduct)
          </h3>
          <p className="text-[11px] text-slate-500">
            Simulates chairside completion — decrements recipe SKUs and logs spend
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSimulateDeduction('MOLAR_RCT', 'Molar Endodontic RCT')}
            className="tactile-btn flex items-center gap-1 rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-bold text-white"
          >
            <ArrowDownRight className="h-3.5 w-3.5" />
            Deduct Molar RCT
          </button>
          <button
            type="button"
            onClick={() =>
              handleSimulateDeduction('CLASS_II_COMPOSITE', 'Class II Composite Restoration')
            }
            className="tactile-btn flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <ArrowDownRight className="h-3.5 w-3.5" />
            Deduct Composite
          </button>
          <button
            type="button"
            onClick={() =>
              handleSimulateDeduction('SURGICAL_EXTRACTION', 'Surgical Extraction')
            }
            className="tactile-btn flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <ArrowDownRight className="h-3.5 w-3.5" />
            Deduct Surgical
          </button>
        </div>

        {lastDeductedProcedure && (
          <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div>
              <span className="font-bold text-slate-900">Spent for {lastDeductedProcedure}:</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {lastDeductedItems.map((item) => (
                  <span
                    key={item.sku}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-800"
                  >
                    <span>{item.name}:</span>
                    <strong className="text-rose-700">-{item.quantity}</strong>
                    <span className="text-slate-400">({formatPaiseToInr(item.costPaise)})</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[11px] text-slate-500">Case cost</span>
              <div className="font-mono text-sm font-bold text-slate-900">
                {formatPaiseToInr(lastDeductedItems.reduce((acc, i) => acc + i.costPaise, 0))}
              </div>
            </div>
          </div>
        )}
      </div>

      {ledger.length > 0 && (
        <div className="surface-card space-y-2 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Ledger (latest)
          </h3>
          <ul className="divide-y divide-slate-100 text-xs">
            {ledger.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      e.type === 'PURCHASE'
                        ? 'bg-teal-50 text-teal-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {e.type === 'PURCHASE' ? 'BUY' : 'SPEND'}
                  </span>
                  {e.label}
                  {e.doctorName ? (
                    <span className="text-slate-400"> · {e.doctorName}</span>
                  ) : null}
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {e.type === 'PURCHASE' ? '+' : '−'}
                  {formatPaiseToInr(e.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="surface-card flex items-center justify-between p-3">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">SKUs</span>
            <div className="mt-0.5 font-mono text-base font-bold text-slate-900">
              {materials.length}
            </div>
          </div>
          <Package className="h-6 w-6 text-slate-400" />
        </div>
        <div className="surface-card flex items-center justify-between p-3">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">
              45-day expiry
            </span>
            <div className="mt-0.5 font-mono text-base font-bold text-amber-700">
              {expiringSoonCount}
            </div>
          </div>
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <div className="surface-card flex items-center justify-between p-3">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500">Low stock</span>
            <div className="mt-0.5 font-mono text-base font-bold text-rose-700">
              {lowStockCount}
            </div>
          </div>
          <ShieldAlert className="h-6 w-6 text-rose-500" />
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Stock register
          </h3>
          <select
            aria-label="Filter material inventory by category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border border-slate-300 bg-white p-1 text-xs font-medium"
          >
            <option value="ALL">All categories</option>
            <option value="ENDODONTICS">Endodontics</option>
            <option value="LOCAL_ANESTHESIA">Local Anesthesia</option>
            <option value="RESTORATIVE">Restorative</option>
            <option value="SURGERY">Surgery</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full rounded-lg border border-slate-200 text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="p-2.5">SKU & material</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 font-mono">Batch</th>
                <th className="p-2.5">Expiry</th>
                <th className="p-2.5 text-right">Unit cost</th>
                <th className="p-2.5 text-center">Stock</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((m) => {
                const low = isLowStock(m);
                const expiring = isExpiringSoon(m, 45);
                return (
                  <tr key={m.id} className="bg-white">
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
                        {m.name}
                        {low && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-800">
                            LOW STOCK
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">{m.sku}</div>
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {m.category}
                      <div className="text-[10px] text-slate-400">{m.manufacturer}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-700">{m.batchNumber}</td>
                    <td className={`p-2.5 ${expiring ? 'font-semibold text-amber-700' : 'text-slate-700'}`}>
                      {m.expiryDate}
                    </td>
                    <td className="p-2.5 text-right font-mono">{formatPaiseToInr(m.unitCostPaise)}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{m.currentStock}</td>
                    <td className="p-2.5 text-center">
                      {low ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                          REORDER
                        </span>
                      ) : expiring ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          EXPIRING
                        </span>
                      ) : (
                        <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {autoDeductions.length > 0 && (
        <div className="surface-card space-y-2 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Recent auto-deductions
          </h3>
          <ul className="divide-y divide-slate-100">
            {autoDeductions.map((entry, idx) => (
              <li key={`${entry.atIso}-${idx}`} className="py-2 text-[12px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold text-slate-800">{entry.procedureTitle}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(entry.atIso).toLocaleString()}
                  </span>
                </div>
                {entry.patientName && (
                  <div className="text-slate-500 text-[11px]">{entry.patientName}</div>
                )}
                <div className="text-slate-600 mt-0.5">
                  {entry.items.map((i) => `${i.quantity}× ${i.itemName}`).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      </>
      )}
    </div>
  );
};
