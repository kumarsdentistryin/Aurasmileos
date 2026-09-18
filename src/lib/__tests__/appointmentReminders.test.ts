import { describe, expect, it } from 'vitest';
import { buildAppointmentReminderMessage } from '../appointmentReminders';

describe('buildAppointmentReminderMessage', () => {
  it('includes clinic, branch, time, complaint, and doctor', () => {
    const msg = buildAppointmentReminderMessage({
      patientFirstName: 'Priya',
      clinicName: 'Aura Smile',
      branchLabel: 'Indiranagar (INDIR)',
      scheduledTime: '11:30 AM',
      chiefComplaint: 'E.max Crown Trial (#21)',
      doctorName: 'Dr. Ananya Iyer, BDS',
    });

    expect(msg).toContain('Aura Smile — Day Reminder');
    expect(msg).toContain('Namaste Priya ji');
    expect(msg).toContain('*11:30 AM*');
    expect(msg).toContain('*E.max Crown Trial (#21)*');
    expect(msg).toContain('Dr. Ananya Iyer, BDS');
    expect(msg).toContain('Branch: Indiranagar (INDIR)');
    expect(msg).toContain('Reply STOP to opt out');
  });
});
