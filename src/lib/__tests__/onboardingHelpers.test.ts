import { describe, expect, it } from 'vitest';
import {
  canUnlockAsStaff,
  isPendingUnclaimedStaff,
  memberToDoctor,
  treatingStaff,
  type ClinicStaffOption,
  type LiveMembership,
} from '../clinicAuth';
import { specialtyFullLabel, specialtyLabel } from '../clinicSpecialty';
import {
  buildBranchCode,
  isPasswordValid,
  MIN_PASSWORD_LENGTH,
} from '../onboardingHelpers';
import type { DbClinic, DbClinicMember } from '../supabase';

function stubMember(
  partial: Partial<DbClinicMember> & Pick<DbClinicMember, 'id' | 'display_name' | 'role'>
): DbClinicMember {
  return {
    clinic_id: 'clinic-1',
    user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    specialty: 'GENERAL',
    ...partial,
  };
}

function stubStaff(
  partial: Partial<ClinicStaffOption> & Pick<ClinicStaffOption, 'memberId' | 'role'>
): ClinicStaffOption {
  return {
    id: `member-${partial.memberId}`,
    displayName: 'Staff',
    specialty: 'General Dentistry',
    registrationLabel: 'Live',
    specialtyCode: 'GENERAL',
    ...partial,
  };
}

describe('onboardingHelpers', () => {
  it('builds branch code from clinic name letters + clock suffix', () => {
    expect(buildBranchCode('Aura Smile Dental', 1726500001234)).toBe('AURASM-1234');
  });

  it('falls back to CLINIC prefix when name has no alphanumerics', () => {
    expect(buildBranchCode('!!!', 1000000000009)).toBe('CLINIC-0009');
  });

  it('validates password against minimum length', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(isPasswordValid('short')).toBe(false);
    expect(isPasswordValid('123456789')).toBe(false);
    expect(isPasswordValid('1234567890')).toBe(true);
  });
});

describe('clinicSpecialty labels', () => {
  it('maps known specialty codes to short and full labels', () => {
    expect(specialtyLabel('PEDIATRIC')).toBe('Pedo');
    expect(specialtyFullLabel('PEDIATRIC')).toBe('Pediatric Dentistry (Pedo)');
    expect(specialtyLabel('FRONT_DESK')).toBe('Desk');
  });

  it('falls back for unknown or empty specialty', () => {
    expect(specialtyLabel(null)).toBe('General');
    expect(specialtyLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(specialtyFullLabel(undefined)).toBe('Clinic Doctor');
  });
});

describe('clinicAuth role mapping (pure)', () => {
  it('maps FRONT_DESK role and specialty to desk session role', () => {
    expect(memberToDoctor(stubMember({ id: '1', display_name: 'Desk', role: 'FRONT_DESK' })).role).toBe(
      'FRONT_DESK'
    );
    expect(
      memberToDoctor(
        stubMember({
          id: '2',
          display_name: 'Owner Desk',
          role: 'OWNER',
          specialty: 'FRONT_DESK',
        })
      ).role
    ).toBe('FRONT_DESK');
  });

  it('maps OWNER with clinical specialty to DOCTOR session', () => {
    const doctor = memberToDoctor(
      stubMember({
        id: '3',
        display_name: 'Dr. Pedo',
        role: 'OWNER',
        specialty: 'PEDIATRIC',
      })
    );
    expect(doctor.role).toBe('DOCTOR');
    expect(doctor.specialtyCode).toBe('PEDIATRIC');
    expect(doctor.specialty).toContain('Pediatric');
  });

  it('filters treating staff to doctors only', () => {
    const roster = [
      stubStaff({ memberId: 'd1', role: 'DOCTOR', displayName: 'Dr A' }),
      stubStaff({ memberId: 'f1', role: 'FRONT_DESK', displayName: 'Desk' }),
    ];
    expect(treatingStaff(roster).map((s) => s.memberId)).toEqual(['d1']);
  });

  it('detects pending unclaimed staff and unlock verdicts', () => {
    const pending = stubStaff({
      memberId: 'm1',
      role: 'DOCTOR',
      userId: null,
      inviteStatus: 'PENDING',
    });
    expect(isPendingUnclaimedStaff(pending)).toBe(true);

    const clinic: DbClinic = {
      id: 'clinic-1',
      name: 'Aura',
      branch_code: 'AURA',
      city_line: 'Bengaluru',
    };
    const memberships: LiveMembership[] = [
      {
        clinic,
        member: stubMember({
          id: 'm1',
          display_name: 'Owner',
          role: 'OWNER',
          clinic_id: 'clinic-1',
        }),
      },
    ];

    expect(canUnlockAsStaff(pending, 'uid-1', memberships, 'clinic-1')).toBe('ok');
    expect(
      canUnlockAsStaff(
        stubStaff({ memberId: 'other', role: 'DOCTOR', userId: null, inviteStatus: 'PENDING' }),
        'uid-1',
        memberships,
        'clinic-1'
      )
    ).toBe('claim_invite');
    expect(
      canUnlockAsStaff(
        stubStaff({ memberId: 'x', role: 'DOCTOR', userId: 'other-uid' }),
        null,
        memberships,
        'clinic-1'
      )
    ).toBe('auth_required');
  });
});
