import React, { useEffect, useMemo, useState } from 'react';
import {
  VisitingConsultant,
  ConsultantPayoutRecord,
  SpecialistRole,
  calculateConsultantPayout,
} from '../../domain/consultants';
import { MOCK_CONSULTANTS, MOCK_PAYOUT_RECORDS } from '../../data/mockPhase2Data';
import { formatPaiseToInr, inrToPaise } from '../../domain/financials';
import {
  createConsultantPayout,
  listConsultantPayouts,
  settleConsultantPayout,
} from '../../lib/consultantPayoutRepository';
import type { ClinicStaffOption } from '../../lib/clinicAuth';
import { UserCheck, CheckCircle2, Clock, Plus } from 'lucide-react';

interface ConsultantLedgerProps {
  clinicDbId?: string | null;
  /** Live clinic roster — used instead of mock consultants when clinicDbId is set */
  rosterDoctors?: ClinicStaffOption[];
}

function specialtyToRole(specialty?: string): SpecialistRole {
  const s = (specialty || '').toUpperCase();
  if (s.includes('ENDO')) return 'ENDODONTIST';
  if (s.includes('ORAL') || s.includes('SURG')) return 'ORAL_SURGEON';
  if (s.includes('ORTHO')) return 'ORTHODONTIST';
  if (s.includes('PERIO')) return 'PERIODONTIST';
  if (s.includes('IMPLANT')) return 'IMPLANTOLOGIST';
  if (s.includes('PEDO') || s.includes('PAED')) return 'PEDODONTIST';
  return 'ENDODONTIST';
}

/** Visiting consultants = treating doctors who are not the clinic owner. */
function rosterToConsultants(roster: ClinicStaffOption[]): VisitingConsultant[] {
  return roster
    .filter((d) => d.role === 'DOCTOR' && d.memberRole !== 'OWNER')
    .map((d) => ({
      id: d.memberId || d.id,
      fullName: d.displayName,
      role: specialtyToRole(d.specialtyCode || d.specialty),
      qualifications: d.specialty || 'BDS',
      registrationNumber: d.registrationLabel.replace(/^Reg:\s*/i, '') || '—',
      panNumber: '',
      phone: '',
      email: '',
      bankName: '',
      bankAccountNumber: '',
      ifscCode: '',
      defaultSharePercentage: 60,
      activeCasesCount: 0,
      totalSettledPaise: 0,
      rating: 0,
    }));
}

export const ConsultantLedger: React.FC<ConsultantLedgerProps> = ({
  clinicDbId = null,
  rosterDoctors = [],
}) => {
  const isLive = Boolean(clinicDbId);
  const consultants = useMemo(
    () => (isLive ? rosterToConsultants(rosterDoctors) : MOCK_CONSULTANTS),
    [isLive, rosterDoctors]
  );
  const [payouts, setPayouts] = useState<ConsultantPayoutRecord[]>(
    isLive ? [] : MOCK_PAYOUT_RECORDS
  );
  const [loading, setLoading] = useState(isLive);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [targetConsultantId, setTargetConsultantId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [grossFeeInr, setGrossFeeInr] = useState(0);

  useEffect(() => {
    if (consultants.length && !targetConsultantId) {
      setTargetConsultantId(consultants[0].id);
    }
  }, [consultants, targetConsultantId]);

  useEffect(() => {
    if (!clinicDbId) {
      setPayouts(MOCK_PAYOUT_RECORDS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listConsultantPayouts(clinicDbId).then((rows) => {
      if (!cancelled) {
        setPayouts(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clinicDbId]);

  const handleSettlePayment = async (recordId: string) => {
    const utr = `NEFT${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const today = new Date().toISOString().split('T')[0];

    if (clinicDbId) {
      await settleConsultantPayout(clinicDbId, recordId, utr, today);
    }

    setPayouts((prev) =>
      prev.map((p) => {
        if (p.id !== recordId) return p;
        return {
          ...p,
          paymentStatus: 'SETTLED',
          utrNumber: utr,
          settledDate: today,
        };
      })
    );
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const consultant = consultants.find((c) => c.id === targetConsultantId) || consultants[0];
    if (!consultant) return;
    const grossFeePaise = inrToPaise(grossFeeInr);
    const calc = calculateConsultantPayout(grossFeePaise, consultant.defaultSharePercentage, true);

    const payload: Omit<ConsultantPayoutRecord, 'id'> = {
      consultantId: consultant.id,
      consultantName: consultant.fullName,
      patientId: '',
      patientName: patientName.trim() || 'Patient',
      procedureName: procedureName.trim() || 'Procedure',
      procedureDate: new Date().toISOString().split('T')[0],
      grossFeePaise,
      consultantSharePercentage: consultant.defaultSharePercentage,
      grossPayoutPaise: calc.grossPayoutPaise,
      tdsWithholdingPaise: calc.tdsWithholdingPaise,
      netPayablePaise: calc.netPayablePaise,
      paymentStatus: 'PENDING',
    };

    if (clinicDbId) {
      const result = await createConsultantPayout(clinicDbId, payload);
      if (result.ok) {
        setPayouts((prev) => [{ id: result.id, ...payload }, ...prev]);
      }
    } else {
      setPayouts((prev) => [
        { id: `PAY-2026-0${prev.length + 50}`, ...payload },
        ...prev,
      ]);
    }
    setShowAddModal(false);
  };

  const filteredPayouts =
    selectedConsultantId === 'ALL'
      ? payouts
      : payouts.filter((p) => p.consultantId === selectedConsultantId);

  const totalGrossPaise = payouts.reduce((acc, p) => acc + p.grossFeePaise, 0);
  const totalDoctorPaise = payouts.reduce((acc, p) => acc + p.grossPayoutPaise, 0);
  const totalTdsPaise = payouts.reduce((acc, p) => acc + p.tdsWithholdingPaise, 0);
  const totalNetPayablePaise = payouts.reduce((acc, p) => acc + p.netPayablePaise, 0);

  return (
    <div className="space-y-4">
      {!isLive && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950"
        >
          Demo data — not synced
        </div>
      )}

      {consultants.length === 0 ? (
        <div className="surface-card p-10 text-center max-w-lg mx-auto">
          <UserCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-900">No visiting consultants yet</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            {isLive
              ? 'Your clinic only has the owner on staff. Add visiting doctors under Clinic → Staff — they will appear here for Section 194J payouts (60/40 with TDS).'
              : 'One chair, many MDS — add visiting specialists here for Section 194J payouts (60/40, 70/30) with TDS.'}
          </p>
          {!isLive && (
            <button
              type="button"
              onClick={() => {
                setPayouts(MOCK_PAYOUT_RECORDS);
                setTargetConsultantId(MOCK_CONSULTANTS[0]?.id ?? '');
              }}
              className="tactile-btn mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)]"
            >
              <Plus className="h-4 w-4" />
              Load demo consultants
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-sans text-base font-bold text-slate-900">Consultant ledger</h2>
              <p className="text-xs text-slate-500">
                60/40 split · Section 194J 10% TDS
                {loading ? ' · loading…' : isLive ? ' · live clinic' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Case Payout
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'Gross fees', value: totalGrossPaise },
              { label: 'Doctor share', value: totalDoctorPaise },
              { label: 'TDS withheld', value: totalTdsPaise },
              { label: 'Net payable', value: totalNetPayablePaise },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {formatPaiseToInr(card.value, false)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedConsultantId('ALL')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                selectedConsultantId === 'ALL'
                  ? 'bg-teal-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              All
            </button>
            {consultants.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConsultantId(c.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                  selectedConsultantId === c.id
                    ? 'bg-teal-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {c.fullName.split(' ')[1] || c.fullName}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredPayouts.map((p) => (
              <div
                key={p.id}
                className="surface-card flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">{p.consultantName}</div>
                  <div className="text-[13px] text-slate-600 mt-0.5">
                    {p.procedureName} · {p.patientName}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {p.procedureDate} · {p.consultantSharePercentage}% share · TDS{' '}
                    {formatPaiseToInr(p.tdsWithholdingPaise, false)}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                    Net {formatPaiseToInr(p.netPayablePaise, false)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.paymentStatus === 'SETTLED' ? (
                    <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                      <CheckCircle2 className="h-3 w-3" />
                      SETTLED {p.utrNumber ? `· ${p.utrNumber}` : ''}
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock className="h-3 w-3" />
                        PENDING
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleSettlePayment(p.id)}
                        className="tactile-btn rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Settle
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredPayouts.length === 0 && !loading && (
              <p className="text-center text-[13px] text-slate-500 py-8">
                No payout records yet.
              </p>
            )}
          </div>
        </>
      )}

      {showAddModal && consultants.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setShowAddModal(false)}
          />
          <form
            onSubmit={(e) => void handleCreatePayout(e)}
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-900">Add case payout</h3>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Consultant</span>
              <select
                value={targetConsultantId}
                onChange={(e) => setTargetConsultantId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Patient</span>
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Patient name"
              />
            </label>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Procedure</span>
              <input
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. Molar RCT"
              />
            </label>
            <label className="block text-[11px] text-slate-600 space-y-1">
              <span>Gross fee (INR)</span>
              <input
                type="number"
                min={0}
                value={grossFeeInr}
                onChange={(e) => setGrossFeeInr(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
