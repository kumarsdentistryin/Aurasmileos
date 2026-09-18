import { Patient } from './types';

/** Minimal fields needed for the follow-up queue (Home may pass a subset). */
export type FollowUpPatient = Pick<
  Patient,
  'id' | 'fullName' | 'phoneNumber' | 'assignedDoctorName' | 'assignedMemberId'
> & {
  nextAppointmentDate?: string;
};

/** ISO date-only YYYY-MM-DD in Asia/Kolkata-ish local calendar. */
export function toDateOnly(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysDateOnly(fromIso: string, days: number): string {
  const base = parseDateOnly(fromIso) ?? new Date();
  base.setDate(base.getDate() + days);
  return toDateOnly(base);
}

export function parseDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null;
  // Accept "2026-09-16" or "2026-09-16 10:30 AM" / ISO timestamps
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type FollowUpStatus = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'UNSCHEDULED';

export type FollowUpRow = {
  patient: FollowUpPatient;
  nextDate: string | null;
  status: FollowUpStatus;
  daysUntil: number | null;
};

export function classifyFollowUp(
  nextAppointmentDate: string | undefined,
  todayIso: string = toDateOnly()
): { status: FollowUpStatus; daysUntil: number | null; nextDate: string | null } {
  const next = parseDateOnly(nextAppointmentDate ?? null);
  if (!next) {
    return { status: 'UNSCHEDULED', daysUntil: null, nextDate: null };
  }
  const today = parseDateOnly(todayIso) ?? new Date();
  const ms = next.getTime() - today.getTime();
  const daysUntil = Math.round(ms / (24 * 60 * 60 * 1000));
  const nextDate = toDateOnly(next);
  if (daysUntil < 0) return { status: 'OVERDUE', daysUntil, nextDate };
  if (daysUntil === 0) return { status: 'DUE_TODAY', daysUntil, nextDate };
  return { status: 'UPCOMING', daysUntil, nextDate };
}

/** Patients with a dated next appointment, overdue first then soonest. */
export function buildFollowUpQueue(
  patients: FollowUpPatient[],
  todayIso: string = toDateOnly()
): FollowUpRow[] {
  const rows: FollowUpRow[] = patients.map((patient) => {
    const { status, daysUntil, nextDate } = classifyFollowUp(
      patient.nextAppointmentDate,
      todayIso
    );
    return { patient, nextDate, status, daysUntil };
  });

  const rank: Record<FollowUpStatus, number> = {
    OVERDUE: 0,
    DUE_TODAY: 1,
    UPCOMING: 2,
    UNSCHEDULED: 3,
  };

  return rows
    .filter((r) => r.status !== 'UNSCHEDULED')
    .sort((a, b) => {
      const rd = rank[a.status] - rank[b.status];
      if (rd !== 0) return rd;
      return String(a.nextDate).localeCompare(String(b.nextDate));
    });
}

export const FOLLOW_UP_PRESETS: { id: string; label: string; days: number }[] = [
  { id: '3d', label: '3 days', days: 3 },
  { id: '7d', label: '1 week', days: 7 },
  { id: '14d', label: '2 weeks', days: 14 },
  { id: '30d', label: '1 month', days: 30 },
  { id: '90d', label: '3 months', days: 90 },
  { id: '180d', label: '6 months', days: 180 },
];

export function followUpWhatsAppMessage(opts: {
  patientFirstName: string;
  clinicName: string;
  nextDate: string;
  doctorName: string;
  branchLabel?: string;
}): string {
  return (
    `Namaste ${opts.patientFirstName} ji,\n\n` +
    `Reminder from ${opts.clinicName}: your follow-up is on *${opts.nextDate}*` +
    (opts.doctorName ? ` with ${opts.doctorName}` : '') +
    `.\n\nPlease confirm or reply if you need to reschedule.\n\n` +
    `— ${opts.branchLabel || opts.clinicName}`
  );
}
