import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  FileSignature,
  History,
  ImageIcon,
  IndianRupee,
  Pill,
  CalendarClock,
  Stethoscope,
} from 'lucide-react';
import { Patient } from '../../domain/types';
import {
  loadPatientHistory,
  type PatientHistoryEvent,
  type PatientHistoryKind,
} from '../../lib/patientHistory';

interface PatientHistoryTimelineProps {
  patient: Patient;
  clinicDbId: string | null;
}

const KIND_META: Record<
  PatientHistoryKind,
  { label: string; Icon: React.FC<{ className?: string }>; tone: string }
> = {
  VISIT: {
    label: 'Visit',
    Icon: Stethoscope,
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  NOTE: {
    label: 'Notes',
    Icon: ClipboardList,
    tone: 'border-teal-200 bg-teal-50 text-teal-800',
  },
  RX: {
    label: 'Rx',
    Icon: Pill,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  CONSENT: {
    label: 'Consent',
    Icon: FileSignature,
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  RECEIPT: {
    label: 'Bill',
    Icon: IndianRupee,
    tone: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  IMAGE: {
    label: 'X-Ray',
    Icon: ImageIcon,
    tone: 'border-violet-200 bg-violet-50 text-violet-900',
  },
  PLAN: {
    label: 'Plan',
    Icon: ClipboardList,
    tone: 'border-slate-200 bg-white text-slate-700',
  },
  RECALL: {
    label: 'Follow-up',
    Icon: CalendarClock,
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
  },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Lifetime clinical timeline — notes, Rx, consent, receipts, imaging, plan, recall.
 */
export const PatientHistoryTimeline: React.FC<PatientHistoryTimelineProps> = ({
  patient,
  clinicDbId,
}) => {
  const [events, setEvents] = useState<PatientHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | PatientHistoryKind>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadPatientHistory(patient, clinicDbId).then((rows) => {
      if (!cancelled) {
        setEvents(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [patient, clinicDbId, patient.treatmentPlanLines, patient.nextAppointmentDate, patient.lastVisitDate]);

  const visible =
    filter === 'ALL' ? events : events.filter((e) => e.kind === filter);

  const filters: Array<{ id: 'ALL' | PatientHistoryKind; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'NOTE', label: 'Notes' },
    { id: 'RX', label: 'Rx' },
    { id: 'RECEIPT', label: 'Bills' },
    { id: 'CONSENT', label: 'Consent' },
    { id: 'RECALL', label: 'Follow-up' },
    { id: 'PLAN', label: 'Plan' },
    { id: 'IMAGE', label: 'X-Ray' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="surface-card p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <History className="h-4 w-4 text-[var(--color-brand)]" />
          Patient history
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Lifetime timeline for{' '}
          <span className="font-semibold text-slate-700">{patient.fullName}</span>
          {' · '}
          <span className="font-mono">{patient.mrn}</span>
          {clinicDbId ? ' · device + cloud' : ' · this device'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`tactile-btn rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
              filter === f.id
                ? 'border-teal-300 bg-teal-50 text-teal-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-400">Loading history…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-14 text-center text-xs text-slate-400">
          No clinical history yet — save notes, Rx, consent, or a bill to start the timeline.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-slate-200 pl-4">
          {visible.map((ev) => {
            const meta = KIND_META[ev.kind];
            const Icon = meta.Icon;
            return (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[1.35rem] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-600 shadow-sm" />
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.tone}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatWhen(ev.atIso)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-slate-900">
                        {ev.title}
                      </div>
                      {ev.detail && (
                        <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
                          {ev.detail}
                        </p>
                      )}
                      {ev.meta && (
                        <p className="mt-1 text-[11px] text-slate-400">{ev.meta}</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
