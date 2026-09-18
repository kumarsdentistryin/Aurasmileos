import React, { useMemo } from 'react';
import { Armchair, Stethoscope } from 'lucide-react';
import {
  CalendarAppointment,
  buildChairDayGrid,
} from '../../domain/dayCalendar';

interface DayChairCalendarProps {
  appointments: CalendarAppointment[];
  chairLabels: string[];
  /** When set, only show this doctor's appointments (doctor login). */
  filterDoctorName?: string | null;
  title?: string;
}

const STATUS_DOT: Record<CalendarAppointment['status'], string> = {
  IN_CHAIR: 'bg-emerald-500',
  WAITING_IN_LOBBY: 'bg-amber-400',
  CONFIRMED: 'bg-sky-400',
  COMPLETED: 'bg-slate-300',
};

export const DayChairCalendar: React.FC<DayChairCalendarProps> = ({
  appointments,
  chairLabels,
  filterDoctorName = null,
  title = 'Chair calendar today',
}) => {
  const scoped = useMemo(() => {
    if (!filterDoctorName) return appointments;
    const key = filterDoctorName.replace(/,.*/, '').trim().toLowerCase();
    return appointments.filter((a) =>
      a.assignedDoctor.replace(/,.*/, '').trim().toLowerCase().includes(key.replace(/^dr\.?\s*/, ''))
    );
  }, [appointments, filterDoctorName]);

  const grid = useMemo(
    () => buildChairDayGrid(scoped, chairLabels),
    [scoped, chairLabels]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-800">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {grid.doctorCount} doctor(s) · chairs shared across the day · {scoped.length} visits
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {grid.chairs.map((chair) => {
          const lane = grid.lanes[chair] ?? [];
          return (
            <div key={chair} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
                <Armchair className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">{chair}</span>
                <span className="text-[10px] text-slate-400 ml-auto">
                  {lane.length === 0 ? 'Free all day' : `${lane.length} visit(s)`}
                </span>
              </div>
              {lane.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-3 py-3">No bookings on this chair</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lane.map((appt) => (
                    <li
                      key={appt.id}
                      className="px-3 py-2.5 flex flex-wrap items-start gap-2 justify-between"
                    >
                      <div className="min-w-0 flex items-start gap-2">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`}
                          aria-hidden
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            <span className="font-mono text-teal-700 mr-1.5">
                              {appt.scheduledTime}
                            </span>
                            {appt.patientName}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[240px]">
                            {appt.chiefComplaint}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            {appt.assignedDoctor.replace(/,.*/, '')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {appt.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
