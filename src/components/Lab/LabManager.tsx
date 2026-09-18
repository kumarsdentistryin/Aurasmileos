import React, { useEffect, useMemo, useState } from 'react';
import {
  LabOrder,
  LabOrderStatus,
  LabPartnerName,
  RestorationType,
  VitaShade,
  VITA_SHADE_COLORS,
  VITA_SHADE_PICKER,
  RESTORATION_MATERIAL_OPTIONS,
  LAB_STATUS_BADGES,
  isLabOrderOverdue,
  getDaysUntilDelivery,
  isLabEligiblePlanLine,
  guessRestorationFromPlanLabel,
  defaultLabDueDateIso,
} from '../../domain/lab';
import { formatPaiseToInr } from '../../domain/financials';
import { Patient, ToothId } from '../../domain/types';
import { TreatmentPlanLine } from '../../domain/treatmentPlan';
import {
  createLabOrder,
  listLabOrders,
  updateLabOrderStatus,
} from '../../lib/labOrderRepository';
import { Sparkles, AlertTriangle, Plus, CheckCircle2, Award, FilePlus2 } from 'lucide-react';

interface LabManagerProps {
  patient?: Patient | null;
  doctorName?: string;
  planLines?: TreatmentPlanLine[];
  clinicDbId?: string | null;
}

export const LabManager: React.FC<LabManagerProps> = ({
  patient = null,
  doctorName = 'Doctor',
  planLines = [],
  clinicDbId = null,
}) => {
  const isLive = Boolean(clinicDbId);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newPatientName, setNewPatientName] = useState(patient?.fullName ?? '');
  const [newPatientId, setNewPatientId] = useState(patient?.id ?? '');
  const [newToothId, setNewToothId] = useState<ToothId>(16);
  const [newDoctorName, setNewDoctorName] = useState(doctorName);
  const [newPartner, setNewPartner] = useState<LabPartnerName>('DentCare Dental Lab');
  const [newRestoration, setNewRestoration] = useState<RestorationType>('ZIRCONIA_MONOLITHIC');
  const [newShade, setNewShade] = useState<VitaShade>('A2');
  const [newTranslucency, setNewTranslucency] = useState<'HIGH' | 'MEDIUM' | 'OPAQUE'>('HIGH');
  const [newDeliveryDate, setNewDeliveryDate] = useState(defaultLabDueDateIso(7));
  const [newApptDate, setNewApptDate] = useState(`${defaultLabDueDateIso(8)} 11:00`);
  const [newCostInr, setNewCostInr] = useState(2200);
  const [newPlanLineId, setNewPlanLineId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listLabOrders(clinicDbId).then((rows) => {
      if (cancelled) return;
      setOrders(rows);
      setSelectedOrder(rows[0] ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicDbId]);

  useEffect(() => {
    if (patient) {
      setNewPatientName(patient.fullName);
      setNewPatientId(patient.id);
    }
    setNewDoctorName(doctorName);
  }, [patient, doctorName]);

  const eligiblePlanLines = useMemo(() => {
    const scoped = patient
      ? planLines.filter((l) => l.patientId === patient.id)
      : planLines;
    return scoped.filter(
      (l) =>
        (l.acceptance === 'ACCEPTED' || l.acceptance === 'PROPOSED') &&
        isLabEligiblePlanLine(l)
    );
  }, [patient, planLines]);

  const openSlipFromPlan = (line: TreatmentPlanLine) => {
    const name = patient?.fullName ?? line.attendingDoctorName;
    setNewPatientName(patient?.fullName ?? name);
    setNewPatientId(patient?.id ?? line.patientId);
    setNewDoctorName(line.attendingDoctorName || doctorName);
    setNewToothId((line.toothId ?? 16) as ToothId);
    setNewRestoration(guessRestorationFromPlanLabel(line.procedureLabel));
    setNewCostInr(Math.max(500, Math.round(line.feePaise / 100 / 4)));
    setNewDeliveryDate(defaultLabDueDateIso(7));
    setNewApptDate(`${defaultLabDueDateIso(8)} 11:00`);
    setNewPlanLineId(line.id);
    setNewShade('A2');
    setShowNewModal(true);
  };

  const openBlankSlip = () => {
    if (patient) {
      setNewPatientName(patient.fullName);
      setNewPatientId(patient.id);
      const chartTooth = Number(Object.keys(patient.dentalChart)[0]);
      if (chartTooth) setNewToothId(chartTooth as ToothId);
    }
    setNewDoctorName(doctorName);
    setNewPlanLineId(null);
    setNewDeliveryDate(defaultLabDueDateIso(7));
    setShowNewModal(true);
  };

  const handleAdvanceStatus = (orderId: string, nextStatus: LabOrderStatus) => {
    void updateLabOrderStatus(clinicDbId, orderId, nextStatus).then(() => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updated = { ...o, status: nextStatus };
          if (selectedOrder?.id === orderId) setSelectedOrder(updated);
          return updated;
        })
      );
    });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    void createLabOrder(clinicDbId, {
      patientId: newPatientId,
      patientName: newPatientName.trim(),
      doctorName: newDoctorName,
      labPartner: newPartner,
      toothId: newToothId,
      restorationType: newRestoration,
      primaryShade: newShade,
      incisalTranslucency: newTranslucency,
      status: 'SENT_TO_LAB',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: newDeliveryDate,
      patientAppointmentDate: newApptDate,
      warrantyYears:
        newRestoration === 'ZIRCONIA_MONOLITHIC' || newRestoration === 'E_MAX_PRESS' ? 10 : 5,
      warrantyCardNumber: `WARR-${Math.floor(10000 + Math.random() * 90000)}`,
      labCostPaise: newCostInr * 100,
      notes: newPlanLineId
        ? `Linked treatment plan line ${newPlanLineId}.`
        : 'Standard marginal fit with anatomical occlusal anatomy.',
    }).then((result) => {
      if (!result.ok) return;
      setOrders((prev) => [result.order, ...prev]);
      setSelectedOrder(result.order);
      setShowNewModal(false);
      setNewPlanLineId(null);
    });
  };

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950"
      >
        {isLive
          ? patient
            ? `Lab slips for ${patient.fullName} — synced to clinic`
            : 'Live lab slips — create a slip or open a patient from Today'
          : 'Device / demo lab slips — not cloud-synced'}
      </div>

      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Dental Lab slips · VITA 3D-Master
              </h2>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                CAD/CAM · Zirconia · Aligners
              </span>
            </div>
            <p className="text-xs text-slate-500">
              1-click from crown / bridge / denture / aligner plan · shade · due date · status
              {loading ? ' · loading…' : isLive ? ' · live' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openBlankSlip}
          className="tactile-btn flex items-center space-x-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lab Slip</span>
        </button>
      </div>

      {!loading && orders.length === 0 && (
        <div className="surface-card p-10 text-center max-w-lg mx-auto">
          <Sparkles className="mx-auto h-9 w-9 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No lab slips yet</h3>
          <p className="mt-1.5 text-[13px] text-slate-500">
            Live clinics start empty. Create a slip from a crown/bridge plan line or use New Lab
            Slip.
          </p>
          <button
            type="button"
            onClick={openBlankSlip}
            className="tactile-btn mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Create first slip
          </button>
        </div>
      )}

      {eligiblePlanLines.length > 0 && (
        <div className="surface-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            From active treatment plan — Create Lab Slip
          </h3>
          <div className="space-y-2">
            {eligiblePlanLines.map((line) => (
              <div
                key={line.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 text-xs">
                  <div className="font-bold text-slate-900">
                    {line.procedureLabel}
                    {line.toothId != null && (
                      <span className="ml-1.5 font-mono text-[var(--color-brand)]">
                        #{line.toothId}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {line.attendingDoctorName} · {line.acceptance} ·{' '}
                    {formatPaiseToInr(line.feePaise, false)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSlipFromPlan(line)}
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  Create Lab Slip
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 surface-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Active lab slips ({orders.length})
            </h3>
            <span className="text-[11px] text-slate-400">Sorted by delivery urgency</span>
          </div>

          <div className="space-y-2.5">
            {orders.map((order) => {
              const isOverdue = isLabOrderOverdue(order);
              const daysLeft = getDaysUntilDelivery(order);
              const isSelected = selectedOrder?.id === order.id;
              const statusLabel =
                LAB_STATUS_BADGES.find((s) => s.status === order.status)?.label ?? order.status;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{order.patientName}</span>
                        <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          #{order.toothId}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {order.restorationType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          Dr: <strong className="text-slate-700">{order.doctorName}</strong>
                        </span>
                        <span>
                          Shade:{' '}
                          <strong className="font-mono text-slate-800">{order.primaryShade}</strong>
                        </span>
                        <span>
                          Bill:{' '}
                          <strong className="font-mono text-slate-800">
                            {formatPaiseToInr(order.labCostPaise)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded mb-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          OVERDUE
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {statusLabel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Due: {order.expectedDeliveryDate} (
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedOrder && (
        <div className="lg:col-span-5 surface-card p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Slip detail & status
            </h3>
            <span className="font-mono text-xs font-bold text-[var(--color-brand)]">
              {selectedOrder.id}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700">VITA shade</div>
            <div className="flex items-center space-x-3">
              <div
                style={{
                  backgroundColor: VITA_SHADE_COLORS[selectedOrder.primaryShade] || '#FAF4EB',
                }}
                className="w-12 h-12 rounded-lg border-2 border-slate-400 shadow-sm flex items-center justify-center font-mono font-bold text-xs text-slate-900"
              >
                {selectedOrder.primaryShade}
              </div>
              <div className="text-xs space-y-0.5 text-slate-600">
                <div>
                  Tooth:{' '}
                  <strong className="font-mono text-slate-900">#{selectedOrder.toothId}</strong>
                </div>
                <div>
                  Material:{' '}
                  <strong className="text-slate-900">
                    {selectedOrder.restorationType.replace(/_/g, ' ')}
                  </strong>
                </div>
                <div>
                  Translucency:{' '}
                  <strong className="text-slate-900">{selectedOrder.incisalTranslucency}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-700">Status badges</div>
            <div className="space-y-1">
              {LAB_STATUS_BADGES.map((stage, idx) => {
                const isCurrent = selectedOrder.status === stage.status;
                const isCompleted =
                  LAB_STATUS_BADGES.findIndex((s) => s.status === selectedOrder.status) >= idx;

                return (
                  <button
                    key={stage.status}
                    type="button"
                    onClick={() => handleAdvanceStatus(selectedOrder.id, stage.status)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-[var(--color-brand)] text-white font-bold shadow-xs'
                        : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span>{stage.label}</span>
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Warranty
              </span>
              <strong className="text-slate-900">{selectedOrder.warrantyYears} Years</strong>
            </div>
            {selectedOrder.warrantyCardNumber && (
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Card</span>
                <span className="font-bold text-[var(--color-brand)]">
                  {selectedOrder.warrantyCardNumber}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Try-in / fit appt</span>
              <strong className="font-mono text-slate-900">
                {selectedOrder.patientAppointmentDate}
              </strong>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {newPlanLineId ? 'Create Lab Slip from plan' : 'New lab slip'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient</label>
                  <input
                    type="text"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full p-1.5 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tooth FDI</label>
                  <input
                    type="number"
                    value={newToothId}
                    onChange={(e) => setNewToothId(Number(e.target.value) as ToothId)}
                    className="w-full p-1.5 border rounded font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dentist</label>
                <input
                  type="text"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  className="w-full p-1.5 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lab partner</label>
                  <select
                    value={newPartner}
                    onChange={(e) => setNewPartner(e.target.value as LabPartnerName)}
                    className="w-full p-1.5 border rounded bg-white"
                  >
                    <option value="DentCare Dental Lab">DentCare Dental Lab</option>
                    <option value="Katana Milling Center">Katana Milling Center</option>
                    <option value="Illusion Aligners">Illusion Aligners</option>
                    <option value="Confident Dental Care">Confident Dental Care</option>
                    <option value="Leixir Dental Lab">Leixir Dental Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Restoration material
                  </label>
                  <select
                    value={newRestoration}
                    onChange={(e) => setNewRestoration(e.target.value as RestorationType)}
                    className="w-full p-1.5 border rounded bg-white"
                  >
                    {RESTORATION_MATERIAL_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  VITA 3D Master shade
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {VITA_SHADE_PICKER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewShade(s)}
                      style={{ backgroundColor: VITA_SHADE_COLORS[s] }}
                      className={`p-1.5 text-center font-mono font-bold rounded border ${
                        newShade === s
                          ? 'ring-2 ring-[var(--color-brand)] border-teal-700'
                          : 'border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due date</label>
                  <input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="w-full p-1.5 border rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lab cost (INR)</label>
                  <input
                    type="number"
                    value={newCostInr}
                    onChange={(e) => setNewCostInr(Number(e.target.value))}
                    className="w-full p-1.5 border rounded font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Translucency</label>
                  <select
                    value={newTranslucency}
                    onChange={(e) =>
                      setNewTranslucency(e.target.value as 'HIGH' | 'MEDIUM' | 'OPAQUE')
                    }
                    className="w-full p-1.5 border rounded bg-white"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="OPAQUE">Opaque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient try-in appt
                  </label>
                  <input
                    type="text"
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    className="w-full p-1.5 border rounded font-mono"
                    placeholder="YYYY-MM-DD HH:mm"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[var(--color-brand)] text-white font-bold hover:bg-[var(--color-brand-hover)]"
                >
                  Dispatch lab slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
