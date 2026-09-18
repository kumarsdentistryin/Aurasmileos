import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { ClinicStaffOption } from '../../lib/clinicAuth';
import {
  ConsultantScheduleMap,
  ConsultantScheduleSlot,
  DAY_NAMES,
  formatSlotTime,
  hydrateConsultantSchedule,
  isScheduledToday,
  persistConsultantSchedule,
} from '../../lib/consultantSchedule';

interface ConsultantSchedulePanelProps {
  rosterDoctors: ClinicStaffOption[];
  clinicDbId: string | null;
  isOwner: boolean;
}

const WEEKDAY_COLS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

function defaultSlot(): ConsultantScheduleSlot {
  return { daysOfWeek: [], startTime: '10:00', endTime: '14:00' };
}

export const ConsultantSchedulePanel: React.FC<ConsultantSchedulePanelProps> = ({
  rosterDoctors,
  clinicDbId,
  isOwner,
}) => {
  const doctors = useMemo(
    () => rosterDoctors.filter((d) => d.role === 'DOCTOR' || d.memberRole === 'OWNER'),
    [rosterDoctors]
  );

  const [schedule, setSchedule] = useState<ConsultantScheduleMap>({});

  useEffect(() => {
    let cancelled = false;
    void hydrateConsultantSchedule(clinicDbId).then((map) => {
      if (!cancelled) setSchedule(map);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicDbId]);

  const persist = (next: ConsultantScheduleMap) => {
    setSchedule(next);
    void persistConsultantSchedule(clinicDbId, next);
  };

  const toggleDay = (memberId: string, day: number) => {
    if (!isOwner) return;
    const cur = schedule[memberId] ?? defaultSlot();
    const has = cur.daysOfWeek.includes(day);
    const daysOfWeek = has
      ? cur.daysOfWeek.filter((d) => d !== day)
      : [...cur.daysOfWeek, day].sort((a, b) => a - b);
    persist({ ...schedule, [memberId]: { ...cur, daysOfWeek } });
  };

  const setTime = (memberId: string, field: 'startTime' | 'endTime', value: string) => {
    if (!isOwner) return;
    const cur = schedule[memberId] ?? defaultSlot();
    persist({ ...schedule, [memberId]: { ...cur, [field]: value } });
  };

  const today = new Date().getDay();
  const todaysConsultants = doctors.filter((d) => {
    const key = d.memberId || d.displayName;
    return isScheduledToday(schedule[key], today);
  });

  return (
    <div className="space-y-4">
      <div className="surface-card p-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-700" />
          Consultant weekly schedule
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {isOwner
            ? 'Tap days to set visiting slots. Front desk sees today\'s consultants on walk-in.'
            : 'Read-only schedule · ask the clinic owner to edit days.'}
        </p>
      </div>

      <div className="surface-card overflow-x-auto p-2">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="p-2.5">Consultant</th>
              {WEEKDAY_COLS.map((c) => (
                <th key={c.day} className="p-2.5 text-center">
                  {c.label}
                </th>
              ))}
              <th className="p-2.5">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {doctors.map((doc) => {
              const key = doc.memberId || doc.displayName;
              const slot = schedule[key] ?? defaultSlot();
              return (
                <tr key={key} className="bg-white">
                  <td className="p-2.5 font-semibold text-slate-900">
                    {doc.displayName}
                    {doc.memberRole === 'OWNER' && (
                      <span className="ml-1.5 text-[10px] font-medium text-teal-700">Owner</span>
                    )}
                  </td>
                  {WEEKDAY_COLS.map((c) => {
                    const on = slot.daysOfWeek.includes(c.day);
                    return (
                      <td key={c.day} className="p-2 text-center">
                        <button
                          type="button"
                          disabled={!isOwner}
                          onClick={() => toggleDay(key, c.day)}
                          className={`h-8 w-8 rounded-md border text-[10px] font-bold disabled:cursor-default ${
                            on
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}
                          title={on ? formatSlotTime(slot) : 'Off'}
                        >
                          {on ? '✓' : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-2.5">
                    {isOwner ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => setTime(key, 'startTime', e.target.value)}
                          className="rounded border border-slate-200 px-1 py-0.5 text-[11px]"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => setTime(key, 'endTime', e.target.value)}
                          className="rounded border border-slate-200 px-1 py-0.5 text-[11px]"
                        />
                      </div>
                    ) : slot.daysOfWeek.length ? (
                      <span className="text-slate-600">{formatSlotTime(slot)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="surface-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Today&apos;s consultants · {DAY_NAMES[today]}
        </h3>
        {todaysConsultants.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">No consultants marked for today.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {todaysConsultants.map((d) => {
              const key = d.memberId || d.displayName;
              const slot = schedule[key];
              return (
                <li
                  key={key}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-800"
                >
                  {d.displayName}
                  {slot?.daysOfWeek.length ? (
                    <span className="ml-1.5 font-normal text-slate-500">
                      {formatSlotTime(slot)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
