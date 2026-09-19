/** Clinic staff specialty labels for onboarding + roster. */

export type ClinicSpecialty =
  | 'PEDIATRIC'
  | 'ORAL_SURGERY'
  | 'MICRO_ENDO'
  | 'GENERAL'
  | 'FRONT_DESK';

export const SPECIALTY_OPTIONS: {
  value: ClinicSpecialty;
  label: string;
  shortLabel: string;
  defaultRole: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
}[] = [
  { value: 'GENERAL', label: 'General Dentistry', shortLabel: 'General', defaultRole: 'DOCTOR' },
  { value: 'MICRO_ENDO', label: 'Micro Endodontics', shortLabel: 'Micro', defaultRole: 'DOCTOR' },
  { value: 'ORAL_SURGERY', label: 'Oral Surgery', shortLabel: 'Oral', defaultRole: 'DOCTOR' },
  { value: 'PEDIATRIC', label: 'Pediatric Dentistry (Pedo)', shortLabel: 'Pedo', defaultRole: 'DOCTOR' },
  { value: 'FRONT_DESK', label: 'Front Desk / Reception', shortLabel: 'Desk', defaultRole: 'FRONT_DESK' },
];

export function specialtyLabel(specialty: string | null | undefined): string {
  const found = SPECIALTY_OPTIONS.find((s) => s.value === specialty);
  return found?.shortLabel ?? specialty ?? 'General';
}

export function specialtyFullLabel(specialty: string | null | undefined): string {
  const found = SPECIALTY_OPTIONS.find((s) => s.value === specialty);
  return found?.label ?? 'Clinic Doctor';
}
