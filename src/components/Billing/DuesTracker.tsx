import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, IndianRupee } from 'lucide-react';
import { formatPaiseToInr } from '../../domain/financials';
import {
  DuesRecord,
  hydrateDuesFromCloud,
  listOpenDues,
  markDueSettled,
  sumOpenDuesPaise,
} from '../../lib/duesRepository';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { buildPatientWhatsAppUrl } from '../../lib/settings';

interface DuesTrackerProps {
  clinicDbId: string | null;
  clinicName?: string;
}

export const DuesTracker: React.FC<DuesTrackerProps> = ({
  clinicDbId,
  clinicName = 'AuraSmile Clinic',
}) => {
  const [tick, setTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateDuesFromCloud(clinicDbId).then(() => {
      if (!cancelled) {
        setHydrated(true);
        setTick((t) => t + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clinicDbId]);

  const dues = useMemo(() => {
    void tick;
    void hydrated;
    return listOpenDues(clinicDbId);
  }, [clinicDbId, tick, hydrated]);
  const totalOutstanding = useMemo(() => sumOpenDuesPaise(clinicDbId), [clinicDbId, tick, hydrated]);

  const reminderUrl = (d: DuesRecord) => {
    const balance = formatPaiseToInr(d.balancePaise, false);
    const body = `Namaste ${d.patientName.split(' ')[0]} ji, your balance of ${balance} for ${d.procedureName} at ${clinicName} is due. Please visit us or pay via UPI. Thank you.`;
    return buildPatientWhatsAppUrl(d.phone || '', body);
  };

  const settle = (id: string) => {
    void markDueSettled(clinicDbId, id).then(() => setTick((t) => t + 1));
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-teal-700" />
            Outstanding dues
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Advances and balance payments · device ledger
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Open balance
          </div>
          <div className="font-mono text-sm font-bold text-amber-950">
            {formatPaiseToInr(totalOutstanding, false)}
          </div>
        </div>
      </div>

      {dues.length === 0 ? (
        <div className="surface-card p-10 text-center max-w-lg mx-auto">
          <CheckCircle2 className="mx-auto h-10 w-10 text-teal-600" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No outstanding balances</h3>
          <p className="mt-2 text-[13px] text-slate-500">
            When a bill is collected partially, the balance appears here for follow-up.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {dues.map((d) => (
            <div
              key={d.id}
              className="surface-card p-4 flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{d.patientName}</div>
                {d.phone && (
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">{d.phone}</div>
                )}
                <div className="text-[13px] text-slate-600 mt-1">{d.procedureName}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                  <span className="text-slate-500">
                    Total:{' '}
                    <strong className="font-mono text-slate-800">
                      {formatPaiseToInr(d.totalPaise, false)}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Paid:{' '}
                    <strong className="font-mono text-slate-800">
                      {formatPaiseToInr(d.collectedPaise, false)}
                    </strong>
                  </span>
                  <span className="text-amber-800">
                    Balance:{' '}
                    <strong className="font-mono">
                      {formatPaiseToInr(d.balancePaise, false)}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={reminderUrl(d)}
                  target="_blank"
                  rel="noreferrer"
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  WhatsApp Reminder
                </a>
                <button
                  type="button"
                  onClick={() => settle(d.id)}
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Mark Settled
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
