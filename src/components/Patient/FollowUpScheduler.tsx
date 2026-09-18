import React, { useMemo, useState } from 'react';
import { CalendarClock, Check } from 'lucide-react';
import { Patient } from '../../domain/types';
import {
  FOLLOW_UP_PRESETS,
  addDaysDateOnly,
  toDateOnly,
} from '../../domain/followUp';

interface FollowUpSchedulerProps {
  patient: Patient;
  readOnly?: boolean;
  onSave: (nextDate: string) => void;
}

/**
 * Set / clear the patient's next follow-up date (stored on patient.nextAppointmentDate).
 */
export const FollowUpScheduler: React.FC<FollowUpSchedulerProps> = ({
  patient,
  readOnly = false,
  onSave,
}) => {
  const today = toDateOnly();
  const initial =
    patient.nextAppointmentDate && /^\d{4}-\d{2}-\d{2}/.test(patient.nextAppointmentDate)
      ? patient.nextAppointmentDate.slice(0, 10)
      : '';
  const [date, setDate] = useState(initial);
  const [savedFlash, setSavedFlash] = useState(false);

  const presets = useMemo(
    () =>
      FOLLOW_UP_PRESETS.map((p) => ({
        ...p,
        value: addDaysDateOnly(today, p.days),
      })),
    [today]
  );

  const handleSave = (value: string) => {
    if (readOnly || !value) return;
    setDate(value);
    onSave(value);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarClock className="h-4 w-4 text-[var(--color-brand)]" />
            Schedule follow-up
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Appears on Today → Follow-ups and in this patient&apos;s history.
          </p>
        </div>
        {savedFlash && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={readOnly}
            onClick={() => handleSave(p.value)}
            className={`tactile-btn rounded-md border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
              date === p.value
                ? 'border-teal-300 bg-teal-50 text-teal-900'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block min-w-[10rem] flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Date
          </span>
          <input
            type="date"
            value={date}
            min={today}
            disabled={readOnly}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm disabled:opacity-40"
          />
        </label>
        <button
          type="button"
          disabled={readOnly || !date}
          onClick={() => handleSave(date)}
          className="tactile-btn rounded-md bg-[var(--color-brand)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-40"
        >
          Save follow-up
        </button>
      </div>

      {patient.nextAppointmentDate && (
        <p className="mt-2 text-[11px] text-slate-500">
          Current:{' '}
          <span className="font-semibold text-slate-800">
            {patient.nextAppointmentDate}
          </span>
        </p>
      )}
    </div>
  );
};
