/**
 * Blueprint §7 — calendar for dentists + chairs.
 * One chair hosts many doctors/procedures across the day.
 */

export type CalendarVisitStatus =
  | 'IN_CHAIR'
  | 'WAITING_IN_LOBBY'
  | 'CONFIRMED'
  | 'COMPLETED';

export interface CalendarAppointment {
  id: string;
  patientName: string;
  scheduledTime: string;
  chiefComplaint: string;
  assignedDoctor: string;
  chairLabel: string;
  status: CalendarVisitStatus;
}

export interface ChairDayGrid {
  chairs: string[];
  lanes: Record<string, CalendarAppointment[]>;
  doctorCount: number;
  timedCount: number;
}

/** Parse "10:30 AM" / "02:30 PM" → minutes from midnight. */
export function parseTimeToMinutes(label: string): number | null {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function buildChairDayGrid(
  appointments: CalendarAppointment[],
  chairLabels: string[]
): ChairDayGrid {
  const lanes: Record<string, CalendarAppointment[]> = {};
  for (const chair of chairLabels) {
    lanes[chair] = [];
  }

  const doctors = new Set<string>();
  let timedCount = 0;

  const sorted = [...appointments].sort((a, b) => {
    const ta = parseTimeToMinutes(a.scheduledTime);
    const tb = parseTimeToMinutes(b.scheduledTime);
    if (ta == null && tb == null) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });

  for (const appt of sorted) {
    doctors.add(appt.assignedDoctor);
    if (parseTimeToMinutes(appt.scheduledTime) != null) timedCount += 1;
    const chair = chairLabels.includes(appt.chairLabel)
      ? appt.chairLabel
      : chairLabels[0] ?? appt.chairLabel;
    if (!lanes[chair]) lanes[chair] = [];
    lanes[chair].push(appt);
  }

  return {
    chairs: chairLabels,
    lanes,
    doctorCount: doctors.size,
    timedCount,
  };
}
