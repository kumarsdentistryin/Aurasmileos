import React, { useEffect, useMemo, useState } from 'react';
import {
  DentalEquipment,
  AutoclaveSterilizationCycle,
  EquipmentCategory,
  EquipmentStatus,
  isAmcExpiringSoon,
  getAmcRemainingDays,
  isSterilizationCycleValid,
} from '../../domain/equipment-sterilization';
import {
  createAutoclaveCycle,
  createClinicEquipment,
  listAutoclaveCycles,
  listClinicEquipment,
  nextCycleNumber,
} from '../../lib/equipmentSterilizationRepository';
import type { ClinicStaffOption } from '../../lib/clinicAuth';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Flame,
  Plus,
  X,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface ClinicOperationsDashboardProps {
  clinicDbId: string | null;
  operatorOptions?: string[];
  rosterDoctors?: ClinicStaffOption[];
  defaultOperatorName?: string;
}

const CATEGORIES: { id: EquipmentCategory; label: string }[] = [
  { id: 'DENTAL_CHAIR', label: 'Dental chair' },
  { id: 'AUTOCLAVE', label: 'Autoclave' },
  { id: 'RVG_SENSOR', label: 'RVG sensor' },
  { id: 'ENDOMOTOR', label: 'Endomotor' },
  { id: 'ULTRASONIC_SCALER', label: 'Ultrasonic scaler' },
  { id: 'AIR_COMPRESSOR', label: 'Air compressor' },
  { id: 'SUCTION_UNIT', label: 'Suction unit' },
];

const emptyEquipmentDraft = (): Omit<DentalEquipment, 'id'> => ({
  name: '',
  category: 'DENTAL_CHAIR',
  model: '',
  serialNumber: '',
  operatoryRoom: 'Chair 1',
  amcVendorName: '',
  amcVendorPhone: '',
  amcStartDate: new Date().toISOString().slice(0, 10),
  amcExpiryDate: '',
  lastServiceDate: new Date().toISOString().slice(0, 10),
  status: 'OPERATIONAL',
});

export const ClinicOperationsDashboard: React.FC<ClinicOperationsDashboardProps> = ({
  clinicDbId,
  operatorOptions = [],
  rosterDoctors = [],
  defaultOperatorName = '',
}) => {
  const isLive = Boolean(clinicDbId);
  const [equipmentList, setEquipmentList] = useState<DentalEquipment[]>([]);
  const [cycles, setCycles] = useState<AutoclaveSterilizationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showLogCycle, setShowLogCycle] = useState(false);
  const [equipDraft, setEquipDraft] = useState(emptyEquipmentDraft);
  const [busy, setBusy] = useState(false);

  const autoclaves = useMemo(
    () => equipmentList.filter((e) => e.category === 'AUTOCLAVE'),
    [equipmentList]
  );

  const operators = useMemo(() => {
    const fromRoster = rosterDoctors.map((d) => d.displayName);
    const merged = [...new Set([...operatorOptions, ...fromRoster, defaultOperatorName].filter(Boolean))];
    return merged.length ? merged : [defaultOperatorName || 'Clinic staff'];
  }, [operatorOptions, rosterDoctors, defaultOperatorName]);

  const [cycleDraft, setCycleDraft] = useState(() => ({
    autoclaveEquipmentId: '',
    temperatureCelsius: 134 as 121 | 134,
    pressurePsi: 30 as 15 | 30,
    cycleDurationMinutes: 6,
    biologicalSporeTestPassed: true,
    chemicalClass5IntegratorPassed: true,
    operatorName: defaultOperatorName || '',
    pouchesProcessedCount: 12,
    pouchExpiryDate: '',
  }));

  const reload = async () => {
    setLoading(true);
    const [eq, cy] = await Promise.all([
      listClinicEquipment(clinicDbId),
      listAutoclaveCycles(clinicDbId),
    ]);
    setEquipmentList(eq);
    setCycles(cy);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicDbId]);

  useEffect(() => {
    setCycleDraft((d) => ({
      ...d,
      autoclaveEquipmentId: d.autoclaveEquipmentId || autoclaves[0]?.id || '',
      operatorName: d.operatorName || operators[0] || '',
    }));
  }, [autoclaves, operators]);

  const equipmentNameById = (id: string) =>
    equipmentList.find((e) => e.id === id)?.name || 'Autoclave';

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipDraft.name.trim()) {
      setStatusMsg('Equipment name is required.');
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    const result = await createClinicEquipment(clinicDbId, {
      ...equipDraft,
      name: equipDraft.name.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setStatusMsg(result.error);
      return;
    }
    setEquipmentList((prev) => [result.equipment, ...prev]);
    setShowAddEquipment(false);
    setEquipDraft(emptyEquipmentDraft());
    setStatusMsg(isLive ? 'Equipment saved to clinic.' : 'Equipment saved on this device.');
  };

  const handleLogCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleDraft.autoclaveEquipmentId && autoclaves.length === 0) {
      setStatusMsg('Add an autoclave under equipment first.');
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    const now = new Date();
    const payload: Omit<AutoclaveSterilizationCycle, 'id'> = {
      cycleNumber: nextCycleNumber(cycles),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      autoclaveEquipmentId: cycleDraft.autoclaveEquipmentId || autoclaves[0]?.id || '',
      temperatureCelsius: cycleDraft.temperatureCelsius,
      pressurePsi: cycleDraft.pressurePsi,
      cycleDurationMinutes: Math.max(1, cycleDraft.cycleDurationMinutes),
      biologicalSporeTestPassed: cycleDraft.biologicalSporeTestPassed,
      chemicalClass5IntegratorPassed: cycleDraft.chemicalClass5IntegratorPassed,
      operatorName: cycleDraft.operatorName || operators[0] || 'Staff',
      pouchesProcessedCount: Math.max(0, cycleDraft.pouchesProcessedCount),
      pouchExpiryDate: cycleDraft.pouchExpiryDate || '',
    };
    const result = await createAutoclaveCycle(clinicDbId, payload);
    setBusy(false);
    if (!result.ok) {
      setStatusMsg(result.error);
      return;
    }
    setCycles((prev) => [result.cycle, ...prev]);
    setShowLogCycle(false);
    const valid = isSterilizationCycleValid(result.cycle);
    setStatusMsg(
      valid
        ? `Cycle #${result.cycle.cycleNumber} logged — NABH parameters OK.`
        : `Cycle #${result.cycle.cycleNumber} logged — FAILED validation (check strip/spore/params).`
    );
  };

  return (
    <div className="space-y-4">
      {!isLive && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950"
        >
          Demo / device mode — equipment & cycles stay on this tablet until you open a live clinic.
        </div>
      )}

      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">
              Equipment AMC & sterilization log
            </h2>
            <p className="text-xs text-slate-500">
              AMC tracking and autoclave cycle verification
              {loading ? ' · loading…' : isLive ? ' · live clinic' : ' · this device'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddEquipment(true)}
            className="tactile-btn flex items-center space-x-1.5 border border-slate-200 bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add equipment</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLogCycle(true)}
            className="tactile-btn flex items-center space-x-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-1.5 rounded"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log autoclave cycle</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          {statusMsg}
        </div>
      )}

      {/* Equipment Register */}
      <div className="surface-card p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-teal-700" />
            <span>Operatory equipment AMC ({equipmentList.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">Expiry alerts ≤ 30 days</span>
        </div>

        {!loading && equipmentList.length === 0 ? (
          <div className="py-10 text-center max-w-md mx-auto">
            <Wrench className="mx-auto h-9 w-9 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-900">No equipment registered</h4>
            <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
              Add your dental chair, autoclave, RVG, and endomotor with AMC vendor and expiry.
              Empty on purpose for a new live clinic — nothing is seeded from demo data.
            </p>
            <button
              type="button"
              onClick={() => setShowAddEquipment(true)}
              className="tactile-btn mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add first unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {equipmentList.map((eq) => {
              const isExpiring = eq.amcExpiryDate ? isAmcExpiringSoon(eq, 30) : false;
              const daysLeft = eq.amcExpiryDate ? getAmcRemainingDays(eq) : null;
              return (
                <div
                  key={eq.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">{eq.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {eq.model || eq.category}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        eq.status === 'OPERATIONAL'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {eq.status}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[11px] text-slate-600">
                    <div>
                      Location: <strong className="text-slate-700">{eq.operatoryRoom || '—'}</strong>
                    </div>
                    <div>
                      Vendor: <span className="text-slate-800">{eq.amcVendorName || '—'}</span>
                    </div>
                    {eq.amcVendorPhone && (
                      <div>
                        Contact:{' '}
                        <span className="font-mono text-teal-800">{eq.amcVendorPhone}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">AMC expiry</span>
                    <span
                      className={`font-mono font-bold ${
                        isExpiring || (daysLeft !== null && daysLeft <= 0)
                          ? 'text-red-700 bg-red-50 px-1 rounded border border-red-200'
                          : 'text-slate-800'
                      }`}
                    >
                      {eq.amcExpiryDate
                        ? `${eq.amcExpiryDate}${
                            daysLeft !== null
                              ? ` (${daysLeft > 0 ? `${daysLeft}d left` : 'Expired'})`
                              : ''
                          }`
                        : 'Not set'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Autoclave log */}
      <div className="surface-card p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-teal-700" />
            <span>Autoclave sterilization & spore log</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">NABH / Class B</span>
        </div>

        {cycles.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-slate-500">
            No cycles logged yet. Use <strong>Log autoclave cycle</strong> after each run.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5 font-mono">Cycle #</th>
                  <th className="p-2.5">Date & time</th>
                  <th className="p-2.5">Autoclave</th>
                  <th className="p-2.5 text-center">Parameters</th>
                  <th className="p-2.5 text-center">Class 5 strip</th>
                  <th className="p-2.5 text-center">Spore test</th>
                  <th className="p-2.5 text-center">NABH</th>
                  <th className="p-2.5 text-center">Pouches</th>
                  <th className="p-2.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cycles.map((cyc) => {
                  const valid = isSterilizationCycleValid(cyc);
                  return (
                    <tr key={cyc.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-mono font-bold text-teal-800">
                        #{cyc.cycleNumber}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {cyc.date} {cyc.time}
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">
                        {equipmentNameById(cyc.autoclaveEquipmentId)}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                        {cyc.temperatureCelsius}°C · {cyc.pressurePsi} psi ·{' '}
                        {cyc.cycleDurationMinutes}m
                      </td>
                      <td className="p-2.5 text-center">
                        {cyc.chemicalClass5IntegratorPassed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                            <XCircle className="w-3 h-3" />
                            FAIL
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {cyc.biologicalSporeTestPassed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            FAIL
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {valid ? (
                          <span className="font-bold text-[10px] text-emerald-800">OK</span>
                        ) : (
                          <span className="font-bold text-[10px] text-rose-800">INVALID</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                        {cyc.pouchesProcessedCount}
                      </td>
                      <td className="p-2.5 text-slate-700 font-medium">{cyc.operatorName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add equipment modal */}
      {showAddEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setShowAddEquipment(false)}
          />
          <form
            onSubmit={(e) => void handleAddEquipment(e)}
            className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add equipment</h3>
              <button type="button" onClick={() => setShowAddEquipment(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Name *</span>
              <input
                required
                value={equipDraft.name}
                onChange={(e) => setEquipDraft({ ...equipDraft, name: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. Chair 1 · Gnatus / Autoclave W&H Lisa"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Category</span>
                <select
                  value={equipDraft.category}
                  onChange={(e) =>
                    setEquipDraft({
                      ...equipDraft,
                      category: e.target.value as EquipmentCategory,
                    })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Status</span>
                <select
                  value={equipDraft.status}
                  onChange={(e) =>
                    setEquipDraft({
                      ...equipDraft,
                      status: e.target.value as EquipmentStatus,
                    })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="OPERATIONAL">Operational</option>
                  <option value="NEEDS_SERVICE">Needs service</option>
                  <option value="UNDER_REPAIR">Under repair</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Model</span>
                <input
                  value={equipDraft.model}
                  onChange={(e) => setEquipDraft({ ...equipDraft, model: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Serial</span>
                <input
                  value={equipDraft.serialNumber}
                  onChange={(e) =>
                    setEquipDraft({ ...equipDraft, serialNumber: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </label>
            </div>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Location / room</span>
              <input
                value={equipDraft.operatoryRoom}
                onChange={(e) =>
                  setEquipDraft({ ...equipDraft, operatoryRoom: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>AMC vendor</span>
                <input
                  value={equipDraft.amcVendorName}
                  onChange={(e) =>
                    setEquipDraft({ ...equipDraft, amcVendorName: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Vendor phone</span>
                <input
                  value={equipDraft.amcVendorPhone}
                  onChange={(e) =>
                    setEquipDraft({ ...equipDraft, amcVendorPhone: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>AMC start</span>
                <input
                  type="date"
                  value={equipDraft.amcStartDate}
                  onChange={(e) =>
                    setEquipDraft({ ...equipDraft, amcStartDate: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>AMC expiry</span>
                <input
                  type="date"
                  value={equipDraft.amcExpiryDate}
                  onChange={(e) =>
                    setEquipDraft({ ...equipDraft, amcExpiryDate: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEquipment(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save equipment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log cycle modal */}
      {showLogCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setShowLogCycle(false)}
          />
          <form
            onSubmit={(e) => void handleLogCycle(e)}
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Log autoclave cycle</h3>
              <button type="button" onClick={() => setShowLogCycle(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {autoclaves.length === 0 ? (
              <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Add an equipment row with category <strong>Autoclave</strong> first.
              </p>
            ) : (
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Autoclave unit</span>
                <select
                  value={cycleDraft.autoclaveEquipmentId}
                  onChange={(e) =>
                    setCycleDraft({ ...cycleDraft, autoclaveEquipmentId: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  {autoclaves.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Operator</span>
              <select
                value={cycleDraft.operatorName}
                onChange={(e) => setCycleDraft({ ...cycleDraft, operatorName: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                {operators.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Temp °C</span>
                <select
                  value={cycleDraft.temperatureCelsius}
                  onChange={(e) => {
                    const t = Number(e.target.value) === 121 ? 121 : 134;
                    setCycleDraft({
                      ...cycleDraft,
                      temperatureCelsius: t,
                      pressurePsi: t === 121 ? 15 : 30,
                      cycleDurationMinutes: t === 121 ? 15 : 6,
                    });
                  }}
                  className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm bg-white"
                >
                  <option value={134}>134</option>
                  <option value={121}>121</option>
                </select>
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>psi</span>
                <input
                  type="number"
                  value={cycleDraft.pressurePsi}
                  onChange={(e) =>
                    setCycleDraft({
                      ...cycleDraft,
                      pressurePsi: (Number(e.target.value) === 15 ? 15 : 30) as 15 | 30,
                    })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                />
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Minutes</span>
                <input
                  type="number"
                  min={1}
                  value={cycleDraft.cycleDurationMinutes}
                  onChange={(e) =>
                    setCycleDraft({
                      ...cycleDraft,
                      cycleDurationMinutes: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-700">
                <input
                  type="checkbox"
                  checked={cycleDraft.chemicalClass5IntegratorPassed}
                  onChange={(e) =>
                    setCycleDraft({
                      ...cycleDraft,
                      chemicalClass5IntegratorPassed: e.target.checked,
                    })
                  }
                />
                Class 5 strip passed
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-700">
                <input
                  type="checkbox"
                  checked={cycleDraft.biologicalSporeTestPassed}
                  onChange={(e) =>
                    setCycleDraft({
                      ...cycleDraft,
                      biologicalSporeTestPassed: e.target.checked,
                    })
                  }
                />
                Spore test passed
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Pouches</span>
                <input
                  type="number"
                  min={0}
                  value={cycleDraft.pouchesProcessedCount}
                  onChange={(e) =>
                    setCycleDraft({
                      ...cycleDraft,
                      pouchesProcessedCount: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[11px] text-slate-600 space-y-1">
                <span>Pouch expiry</span>
                <input
                  type="date"
                  value={cycleDraft.pouchExpiryDate}
                  onChange={(e) =>
                    setCycleDraft({ ...cycleDraft, pouchExpiryDate: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogCycle(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || autoclaves.length === 0}
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save cycle'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
