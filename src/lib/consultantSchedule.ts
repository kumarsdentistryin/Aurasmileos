import { getSupabase, isSupabaseConfigured } from './supabase';

export type ConsultantScheduleSlot = {
  daysOfWeek: number[]; // 0=Sun … 6=Sat
  startTime: string; // "10:00"
  endTime: string; // "14:00"
};

export type ConsultantScheduleMap = Record<string, ConsultantScheduleSlot>;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function storageKey(clinicId: string | null | undefined): string {
  return `consultant_schedule_${clinicId || 'demo'}`;
}

export function loadConsultantSchedule(
  clinicId: string | null | undefined
): ConsultantScheduleMap {
  try {
    const raw = localStorage.getItem(storageKey(clinicId));
    if (!raw) return {};
    return JSON.parse(raw) as ConsultantScheduleMap;
  } catch {
    return {};
  }
}

export function saveConsultantSchedule(
  clinicId: string | null | undefined,
  map: ConsultantScheduleMap
): void {
  localStorage.setItem(storageKey(clinicId), JSON.stringify(map));
}

export async function hydrateConsultantSchedule(
  clinicId: string | null | undefined
): Promise<ConsultantScheduleMap> {
  const local = loadConsultantSchedule(clinicId);
  if (!clinicId || !isSupabaseConfigured()) return local;
  const sb = getSupabase();
  if (!sb) return local;

  const { data, error } = await sb
    .from('consultant_schedules')
    .select('*')
    .eq('clinic_id', clinicId);

  if (error || !data?.length) return local;

  const map: ConsultantScheduleMap = { ...local };
  for (const row of data as {
    member_id: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
  }[]) {
    map[row.member_id] = {
      daysOfWeek: row.days_of_week || [],
      startTime: row.start_time || '10:00',
      endTime: row.end_time || '14:00',
    };
  }
  saveConsultantSchedule(clinicId, map);
  return map;
}

export async function persistConsultantSchedule(
  clinicId: string | null | undefined,
  map: ConsultantScheduleMap
): Promise<void> {
  saveConsultantSchedule(clinicId, map);
  if (!clinicId || !isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  const rows = Object.entries(map).map(([memberId, slot]) => ({
    clinic_id: clinicId,
    member_id: memberId,
    days_of_week: slot.daysOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
    updated_at: new Date().toISOString(),
  }));

  if (!rows.length) return;
  await sb.from('consultant_schedules').upsert(rows, {
    onConflict: 'clinic_id,member_id',
  });
}

export function isScheduledToday(
  slot: ConsultantScheduleSlot | undefined,
  day: number = new Date().getDay()
): boolean {
  if (!slot || !slot.daysOfWeek?.length) return true;
  return slot.daysOfWeek.includes(day);
}

export function nextAvailableDayLabel(
  slot: ConsultantScheduleSlot | undefined,
  fromDay: number = new Date().getDay()
): string {
  if (!slot || !slot.daysOfWeek?.length) return 'Available today';
  if (slot.daysOfWeek.includes(fromDay)) return 'Available today';
  for (let i = 1; i <= 7; i++) {
    const d = (fromDay + i) % 7;
    if (slot.daysOfWeek.includes(d)) return `Next: ${DAY_NAMES[d]}`;
  }
  return 'Not scheduled';
}

export function formatSlotTime(slot: ConsultantScheduleSlot): string {
  const fmt = (t: string) => {
    const [h] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const hr = ((h + 11) % 12) + 1;
    return `${hr}${ampm}`;
  };
  return `${fmt(slot.startTime)}–${fmt(slot.endTime)}`;
}

export { DAY_NAMES };
