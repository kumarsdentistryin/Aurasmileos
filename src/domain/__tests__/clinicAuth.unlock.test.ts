import { describe, expect, it } from 'vitest';
import {
  canUnlockAsStaff,
  ClinicStaffOption,
  LiveMembership,
  memberToDoctor,
} from '../../lib/clinicAuth';
import { DbClinic, DbClinicMember } from '../../lib/supabase';

function stubClinic(id = 'clinic-1'): DbClinic {
  return {
    id,
    name: 'Test Clinic',
    branch_code: 'BLR-01',
    city_line: 'Bengaluru',
  };
}

function stubMember(
  partial: Partial<DbClinicMember> & Pick<DbClinicMember, 'id' | 'role'>
): DbClinicMember {
  return {
    clinic_id: 'clinic-1',
    user_id: null,
    display_name: 'Dr Test',
    specialty: 'GENERAL',
    invite_status: 'ACTIVE',
    created_at: '2026-01-01',
    ...partial,
  };
}

function staffFrom(member: DbClinicMember): ClinicStaffOption {
  return {
    ...memberToDoctor(member),
    memberId: member.id,
    specialtyCode: (member.specialty || 'GENERAL') as ClinicStaffOption['specialtyCode'],
    inviteEmail: member.invite_email,
    inviteStatus: member.invite_status,
    userId: member.user_id,
  };
}

describe('Critical #5 live unlock gate', () => {
  const clinic = stubClinic();
  const me = stubMember({
    id: 'mem-me',
    role: 'DOCTOR',
    user_id: 'auth-uid-me',
    display_name: 'Dr Me',
  });
  const other = stubMember({
    id: 'mem-other',
    role: 'DOCTOR',
    user_id: 'auth-uid-other',
    display_name: 'Dr Other',
  });
  const mine: LiveMembership[] = [{ member: me, clinic }];

  it('allows unlock only when memberId is own seat and user_id === auth.uid()', () => {
    expect(canUnlockAsStaff(staffFrom(me), 'auth-uid-me', mine, clinic.id)).toBe('ok');
  });

  it('forbids impersonating another member even if client forges userId', () => {
    const forged: ClinicStaffOption = {
      ...staffFrom(other),
      userId: 'auth-uid-me', // forged to match auth
    };
    expect(canUnlockAsStaff(forged, 'auth-uid-me', mine, clinic.id)).toBe('forbidden');
  });

  it('forbids unlocking another claimed seat', () => {
    expect(canUnlockAsStaff(staffFrom(other), 'auth-uid-me', mine, clinic.id)).toBe(
      'forbidden'
    );
  });

  it('requires auth for claimed seats', () => {
    expect(canUnlockAsStaff(staffFrom(me), null, [], clinic.id)).toBe('auth_required');
  });

  it('routes unclaimed seats to claim_invite', () => {
    const pending = stubMember({
      id: 'mem-pending',
      role: 'DOCTOR',
      user_id: null,
      invite_status: 'PENDING',
    });
    expect(canUnlockAsStaff(staffFrom(pending), 'auth-uid-me', mine, clinic.id)).toBe(
      'claim_invite'
    );
  });

  it('OWNER with non-desk specialty maps to DOCTOR session role', () => {
    const owner = stubMember({
      id: 'mem-owner',
      role: 'OWNER',
      specialty: 'ORAL_SURGERY',
      user_id: 'auth-owner',
      display_name: 'Dr Owner',
    });
    expect(memberToDoctor(owner).role).toBe('DOCTOR');
  });

  it('OWNER with FRONT_DESK specialty maps to FRONT_DESK', () => {
    const ownerDesk = stubMember({
      id: 'mem-owner-desk',
      role: 'OWNER',
      specialty: 'FRONT_DESK',
      user_id: 'auth-owner',
      display_name: 'Owner Desk',
    });
    expect(memberToDoctor(ownerDesk).role).toBe('FRONT_DESK');
  });
});
