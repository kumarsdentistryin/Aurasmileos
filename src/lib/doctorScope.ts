import { ClinicRole } from '../components/Auth/DoctorAuthModal';
import { Patient } from '../domain/types';

/** Short identity used for matching roster names, e.g. "Dr. Vikram Rao" */
export function doctorMatchKey(displayName: string): string {
  return displayName
    .replace(/,.*/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isAssignedToDoctor(
  assignedLabel: string | undefined | null,
  doctorDisplayName: string
): boolean {
  if (!assignedLabel) return false;
  const doctorKey = doctorMatchKey(doctorDisplayName);
  const assignedKey = doctorMatchKey(assignedLabel);
  if (!doctorKey || !assignedKey) return false;
  return (
    assignedKey.includes(doctorKey) ||
    doctorKey.includes(assignedKey) ||
    assignedKey.includes(doctorKey.replace(/^dr\.?\s*/, ''))
  );
}

export function isAssignedToMember(
  assignedMemberId: string | undefined | null,
  viewerMemberId: string | undefined | null
): boolean {
  if (!assignedMemberId || !viewerMemberId) return false;
  return assignedMemberId === viewerMemberId;
}

/** Front desk (and OWNER mapped to desk) see the full clinic roster. */
export function viewerSeesFullRoster(role: ClinicRole): boolean {
  return role === 'FRONT_DESK';
}

type AssignablePatient = {
  assignedDoctorName: string;
  assignedMemberId?: string | null;
};

type AssignableQueueItem = {
  assignedDoctor: string;
  assignedMemberId?: string | null;
};

/** Doctors see only their patients; front desk sees the full clinic roster. Prefers member id. */
export function filterPatientsForViewer<T extends AssignablePatient>(
  patients: T[],
  doctorDisplayName: string,
  role: ClinicRole,
  viewerMemberId?: string | null
): T[] {
  if (viewerSeesFullRoster(role)) return patients;
  return patients.filter((p) => {
    if (viewerMemberId && p.assignedMemberId) {
      return isAssignedToMember(p.assignedMemberId, viewerMemberId);
    }
    return isAssignedToDoctor(p.assignedDoctorName, doctorDisplayName);
  });
}

export function filterQueueForViewer<T extends AssignableQueueItem>(
  queue: T[],
  doctorDisplayName: string,
  role: ClinicRole,
  viewerMemberId?: string | null
): T[] {
  if (viewerSeesFullRoster(role)) return queue;
  return queue.filter((q) => {
    if (viewerMemberId && q.assignedMemberId) {
      return isAssignedToMember(q.assignedMemberId, viewerMemberId);
    }
    return isAssignedToDoctor(q.assignedDoctor, doctorDisplayName);
  });
}

/** Stable fingerprint for dirty-patient detection (avoids full-roster upserts). */
export function fingerprintPatient(patient: Patient): string {
  return JSON.stringify({
    id: patient.id,
    mrn: patient.mrn,
    fullName: patient.fullName,
    age: patient.age,
    gender: patient.gender,
    phoneNumber: patient.phoneNumber,
    email: patient.email ?? null,
    addressCity: patient.addressCity,
    medicalAlerts: patient.medicalAlerts,
    dentalChart: patient.dentalChart,
    bloodGroup: patient.bloodGroup,
    assignedDoctorName: patient.assignedDoctorName,
    assignedMemberId: patient.assignedMemberId ?? null,
    primaryChair: patient.primaryChair,
    lastVisitDate: patient.lastVisitDate,
    nextAppointmentDate: patient.nextAppointmentDate ?? null,
  });
}

/**
 * Patients that differ from the last persisted fingerprints.
 * Callers should pass only the viewer-visible set (doctor-scoped or full desk roster).
 */
export function collectDirtyPatients(
  patients: Patient[],
  previousFingerprints: ReadonlyMap<string, string>
): Patient[] {
  return patients.filter(
    (p) => previousFingerprints.get(p.id) !== fingerprintPatient(p)
  );
}

export function seedPatientFingerprints(
  patients: Patient[]
): Map<string, string> {
  return new Map(patients.map((p) => [p.id, fingerprintPatient(p)]));
}
