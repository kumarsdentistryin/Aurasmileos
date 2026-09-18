/**
 * Shared WhatsApp day-reminder copy for Home queue cards and day-start dispatch.
 * English only for now; locale can be added later without changing call sites.
 */
export function buildAppointmentReminderMessage(input: {
  patientFirstName: string;
  clinicName: string;
  branchLabel: string;
  scheduledTime: string;
  chiefComplaint: string;
  doctorName: string;
}): string {
  return [
    `*${input.clinicName} — Day Reminder*`,
    '',
    `Namaste ${input.patientFirstName} ji,`,
    `Your visit today at *${input.scheduledTime}* for *${input.chiefComplaint}* is confirmed with ${input.doctorName}.`,
    '',
    `Branch: ${input.branchLabel}`,
    'Please arrive 10 minutes early.',
    'Reply STOP to opt out.',
  ].join('\n');
}
