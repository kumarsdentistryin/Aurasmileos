import { describe, expect, it } from 'vitest';
import { addDaysDateOnly, buildFollowUpQueue, classifyFollowUp, toDateOnly } from '../followUp';
import type { FollowUpPatient } from '../followUp';

function stubPatient(
  partial: Partial<FollowUpPatient> & Pick<FollowUpPatient, 'id' | 'fullName'>
): FollowUpPatient {
  return {
    phoneNumber: '+919900000000',
    assignedDoctorName: 'Dr Test',
    ...partial,
  };
}

describe('follow-up queue', () => {
  it('classifies overdue / today / upcoming', () => {
    expect(classifyFollowUp('2026-09-10', '2026-09-17').status).toBe('OVERDUE');
    expect(classifyFollowUp('2026-09-17', '2026-09-17').status).toBe('DUE_TODAY');
    expect(classifyFollowUp('2026-09-20', '2026-09-17').status).toBe('UPCOMING');
    expect(classifyFollowUp(undefined, '2026-09-17').status).toBe('UNSCHEDULED');
  });

  it('orders overdue before upcoming and skips unscheduled', () => {
    const rows = buildFollowUpQueue(
      [
        stubPatient({ id: 'a', fullName: 'A', nextAppointmentDate: '2026-09-20' }),
        stubPatient({ id: 'b', fullName: 'B', nextAppointmentDate: '2026-09-10' }),
        stubPatient({ id: 'c', fullName: 'C' }),
        stubPatient({ id: 'd', fullName: 'D', nextAppointmentDate: '2026-09-17' }),
      ],
      '2026-09-17'
    );
    expect(rows.map((r) => r.patient.id)).toEqual(['b', 'd', 'a']);
  });

  it('adds days for presets', () => {
    expect(addDaysDateOnly('2026-09-17', 7)).toBe('2026-09-24');
    expect(toDateOnly(new Date(2026, 8, 17))).toBe('2026-09-17');
  });

  it('parses dated strings with time suffix', () => {
    expect(classifyFollowUp('2026-09-16 10:30 AM', '2026-09-17').status).toBe('OVERDUE');
  });
});
