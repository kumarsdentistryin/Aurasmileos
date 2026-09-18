import {
  CLINIC_BRANCHES,
  CLINIC_DOCTORS,
  ClinicDoctorOption,
  ClinicRole,
  ClinicSessionSelection,
  DEFAULT_CLINIC_SESSION,
  OPERATORY_CHAIRS,
} from '../components/Auth/DoctorAuthModal';
import { ClinicSpecialty, specialtyFullLabel } from './clinicSpecialty';
import {
  DbClinic,
  DbClinicMember,
  getSupabase,
  isSupabaseConfigured,
} from './supabase';
import { clampChairCount, clinicToEntitlement } from './entitlements';
import { trackOnboardingEvent, upsertClinicLead } from './funnelTracking';
import { emitClinicCreated } from './integrations/emit';
import { isPasswordValid, MIN_PASSWORD_LENGTH } from './onboardingHelpers';

export type LiveMembership = {
  member: DbClinicMember;
  clinic: DbClinic;
};

export type ClinicStaffOption = ClinicDoctorOption & {
  memberId: string;
  specialtyCode: ClinicSpecialty;
  inviteEmail?: string | null;
  inviteStatus?: string;
  userId?: string | null;
  /** Raw DB role (OWNER stays OWNER; session role is mapped separately). */
  memberRole?: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
};

function branchCodeToUiId(branchCode: string): string {
  return branchCode.trim().toLowerCase();
}

function chairIdsForCount(count: number): string[] {
  const n = Math.max(1, Math.min(3, count || 3));
  return OPERATORY_CHAIRS.slice(0, n).map((c) => c.id);
}

export function resolveBranch(clinic: DbClinic): ClinicSessionSelection['branch'] {
  const uiId = branchCodeToUiId(clinic.branch_code);
  const known = CLINIC_BRANCHES.find(
    (b) => b.id === uiId || b.code.toLowerCase() === uiId
  );
  const chairCount = clampChairCount(
    clinic.chair_count ?? known?.chairIds.length ?? 3,
    clinic.plan
  );
  const chairIds = chairIdsForCount(chairCount);
  if (known) {
    return {
      ...known,
      name: clinic.name || known.name,
      cityLine: clinic.city_line || known.cityLine,
      chairIds,
    };
  }
  return {
    id: uiId,
    name: clinic.name,
    code: clinic.branch_code,
    cityLine: clinic.city_line || '',
    chairIds,
  };
}

function roleFromMember(member: DbClinicMember): ClinicRole {
  if (member.role === 'FRONT_DESK') return 'FRONT_DESK';
  if (member.specialty === 'FRONT_DESK') return 'FRONT_DESK';
  // OWNER with clinical specialty → DOCTOR session; desk specialty already handled above
  return 'DOCTOR';
}

export function memberToDoctor(member: DbClinicMember): ClinicDoctorOption {
  const role = roleFromMember(member);
  const specialtyCode = (member.specialty || 'GENERAL') as ClinicSpecialty;
  const memberRole = member.role; // OWNER | DOCTOR | FRONT_DESK — keep OWNER for ops ACL
  return {
    id: `member-${member.id}`,
    displayName: member.display_name,
    specialty: specialtyFullLabel(specialtyCode),
    registrationLabel:
      role === 'FRONT_DESK'
        ? memberRole === 'OWNER'
          ? 'Role: Owner · Clinic ops + desk'
          : 'Role: Front Desk · No clinical charting'
        : memberRole === 'OWNER'
          ? `Owner · ${specialtyFullLabel(specialtyCode)}`
          : `Live · ${specialtyFullLabel(specialtyCode)}`,
    role,
    memberId: member.id,
    specialtyCode,
    memberRole,
  };
}

export function memberToStaffOption(member: DbClinicMember): ClinicStaffOption {
  const doctor = memberToDoctor(member);
  return {
    ...doctor,
    memberId: member.id,
    specialtyCode: (member.specialty || 'GENERAL') as ClinicSpecialty,
    inviteEmail: member.invite_email,
    inviteStatus: member.invite_status,
    userId: member.user_id,
    memberRole: member.role,
  };
}

export async function getAuthSessionUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function getAuthSessionEmail(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user?.email ?? null;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Clinic sign-in is not available right now. Try again later or use the demo.' };
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  await claimClinicInvite();
  return { ok: true };
}

/** Send a password-reset email. Calm copy — never surface env var names to end users. */
export async function resetPasswordForEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return {
      ok: false,
      error: 'Password reset is not available right now. Ask your clinic owner for help.',
    };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter the email on your clinic invite first.' };
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(trimmed, {
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) {
    return {
      ok: false,
      error: 'Could not send a reset email. Check the address and try again in a moment.',
    };
  }
  return { ok: true };
}

/** Set a new password after the user opens a recovery link (PASSWORD_RECOVERY session). */
export async function updatePassword(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return {
      ok: false,
      error: 'Password update is not available right now. Try again later.',
    };
  }
  if (!isPasswordValid(newPassword)) {
    return {
      ok: false,
      error: `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) {
    return {
      ok: false,
      error: 'Could not update password. Request a new reset link and try again.',
    };
  }
  return { ok: true };
}

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Clinic sign-up is not available right now. Try again later or use the demo.' };
  }
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'Sign-up did not return a user' };
  await claimClinicInvite();
  return { ok: true, userId: data.user.id };
}

export async function signOutLive(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function claimClinicInvite(): Promise<DbClinicMember[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('claim_clinic_invite');
  if (error) {
    console.warn('[AuraSmile] claim_clinic_invite:', error.message);
    return [];
  }
  return (data as DbClinicMember[]) ?? [];
}

export async function listLiveMemberships(): Promise<LiveMembership[]> {
  const sb = getSupabase();
  if (!sb) return [];

  await claimClinicInvite();

  const userId = await getAuthSessionUserId();
  if (!userId) return [];

  const { data: members, error } = await sb
    .from('clinic_members')
    .select('*')
    .eq('user_id', userId);

  if (error || !members?.length) {
    if (error) console.warn('[AuraSmile] clinic_members:', error.message);
    return [];
  }

  const clinicIds = (members as DbClinicMember[]).map((m) => m.clinic_id);
  // select('*') returns plan / subscription_status / trial_ends_at when
  // 20260915_clinic_billing.sql has been applied; missing columns stay undefined.
  const { data: clinics, error: clinicError } = await sb
    .from('clinics')
    .select('*')
    .in('id', clinicIds);

  if (clinicError || !clinics?.length) {
    if (clinicError) console.warn('[AuraSmile] clinics:', clinicError.message);
    return [];
  }

  const byId = new Map((clinics as DbClinic[]).map((c) => [c.id, c]));
  return (members as DbClinicMember[])
    .map((member) => {
      const clinic = byId.get(member.clinic_id);
      return clinic ? { member, clinic } : null;
    })
    .filter((row): row is LiveMembership => Boolean(row));
}

/** Roster for lock screen / walk-in assign — all members of a clinic. */
export async function listClinicStaff(clinicId: string): Promise<ClinicStaffOption[]> {
  const sb = getSupabase();
  if (!sb || !clinicId) return [];

  const { data, error } = await sb
    .from('clinic_members')
    .select('*')
    .eq('clinic_id', clinicId)
    .neq('invite_status', 'REVOKED')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[AuraSmile] listClinicStaff:', error.message);
    return [];
  }

  return ((data as DbClinicMember[]) ?? []).map(memberToStaffOption);
}

/** Demo roster fallback when not live. */
export function listDemoStaff(): ClinicStaffOption[] {
  return CLINIC_DOCTORS.map((d) => ({
    ...d,
    memberId: d.id,
    specialtyCode:
      d.id === 'doc-priya'
        ? 'ORAL_SURGERY'
        : d.id === 'doc-vikram'
          ? 'MICRO_ENDO'
          : d.id === 'desk-reception'
            ? 'FRONT_DESK'
            : 'GENERAL',
  }));
}

export function treatingStaff(staff: ClinicStaffOption[]): ClinicStaffOption[] {
  return staff.filter((s) => s.role === 'DOCTOR');
}

export type StaffUnlockVerdict =
  | 'ok'
  | 'claim_invite'
  | 'auth_required'
  | 'forbidden';

/**
 * Live station unlock: only your own clinic_members row.
 * Requires memberId ∈ myMemberships for this clinic AND (when bound) user_id === auth.uid().
 * Never OK from forged staff.userId alone — that would impersonate another memberId.
 * OWNER may unlock their own PENDING row; other pending seats → claim via invite email.
 */
export function canUnlockAsStaff(
  staff: ClinicStaffOption,
  authUserId: string | null,
  myMemberships: LiveMembership[],
  clinicId: string
): StaffUnlockVerdict {
  const mine = myMemberships.find((m) => m.clinic.id === clinicId);
  const pendingUnclaimed =
    !staff.userId || staff.inviteStatus === 'PENDING';
  const isOwnSeat = Boolean(mine && mine.member.id === staff.memberId);

  if (isOwnSeat && authUserId) {
    // Bound membership: user_id must match session (server-sourced via listLiveMemberships)
    if (mine!.member.user_id === authUserId) {
      return 'ok';
    }
    // Roster row may be fresher than membership cache — still require same memberId
    if (staff.userId === authUserId) {
      return 'ok';
    }
    // OWNER self PENDING (user_id not yet bound on row)
    if (pendingUnclaimed && mine!.member.role === 'OWNER' && !mine!.member.user_id) {
      return 'ok';
    }
  }

  if (pendingUnclaimed) return 'claim_invite';
  if (!authUserId) return 'auth_required';
  return 'forbidden';
}

export function isPendingUnclaimedStaff(staff: ClinicStaffOption): boolean {
  return !staff.userId || staff.inviteStatus === 'PENDING';
}

export async function createClinicWithOwner(input: {
  name: string;
  branchCode: string;
  cityLine: string;
  phone?: string;
  chairCount?: number;
  displayName?: string;
  email?: string;
}): Promise<{ ok: true; clinic: DbClinic } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const chairs = clampChairCount(input.chairCount ?? 3, 'free_trial');
  const { data, error } = await sb.rpc('create_clinic_with_owner', {
    p_name: input.name.trim(),
    p_branch_code: input.branchCode.trim().toUpperCase(),
    p_city_line: input.cityLine.trim(),
    p_phone: input.phone?.trim() || null,
    p_chair_count: chairs,
    p_display_name: input.displayName?.trim() || null,
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not create clinic' };
  }

  const clinic = data as DbClinic;
  if (input.email) {
    const leadId = await upsertClinicLead({
      email: input.email,
      clinicId: clinic.id,
      clinicName: clinic.name,
      phone: input.phone,
      city: input.cityLine,
      status: 'ONBOARDING',
    });
    await trackOnboardingEvent({
      step: 'clinic_created',
      email: input.email,
      clinicId: clinic.id,
      leadId,
      payload: { branch_code: clinic.branch_code },
    });
  }

  void emitClinicCreated(clinic.id, {
    clinic_name: clinic.name,
    owner_email: input.email?.trim().toLowerCase() || '',
    city: input.cityLine,
    plan: 'free_trial',
  });

  return { ok: true, clinic };
}

export async function updateClinicProfile(
  clinicId: string,
  patch: Partial<{
    name: string;
    city_line: string;
    phone: string;
    chair_count: number;
    tagline: string;
    address_line: string;
    onboarding_completed_at: string | null;
  }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase not configured' };

  const { error } = await sb.from('clinics').update(patch).eq('id', clinicId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addClinicStaffInvite(input: {
  clinicId: string;
  displayName: string;
  role: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
  specialty: ClinicSpecialty;
  inviteEmail: string;
}): Promise<{ ok: true; member: DbClinicMember } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase not configured' };

  const email = input.inviteEmail.trim().toLowerCase();
  const { data, error } = await sb
    .from('clinic_members')
    .insert({
      clinic_id: input.clinicId,
      user_id: null,
      display_name: input.displayName.trim(),
      role: input.role,
      specialty: input.specialty,
      invite_email: email,
      invite_status: 'PENDING',
    })
    .select('*')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not add staff' };
  }
  return { ok: true, member: data as DbClinicMember };
}

export async function updateClinicStaffMember(
  memberId: string,
  patch: Partial<{
    display_name: string;
    role: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
    specialty: ClinicSpecialty;
    invite_email: string;
    invite_status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase not configured' };
  const { error } = await sb.from('clinic_members').update(patch).eq('id', memberId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function membershipToSession(
  live: LiveMembership,
  chairId?: string,
  clinicScale: ClinicSessionSelection['clinicScale'] = 'SINGLE'
): ClinicSessionSelection {
  const branch = resolveBranch(live.clinic);
  const doctor = memberToDoctor(live.member);
  // Owner treating clinicians get DOCTOR workspace + OWNER ops ACL via memberRole
  if (live.member.role === 'OWNER') {
    doctor.memberRole = 'OWNER';
  }
  const allowed = OPERATORY_CHAIRS.filter((c) => branch.chairIds.includes(c.id));
  const chair =
    allowed.find((c) => c.id === chairId) ??
    allowed[0] ??
    DEFAULT_CLINIC_SESSION.chair;

  return {
    doctor,
    branch,
    chair,
    clinicScale: branch.chairIds.length > 1 ? clinicScale : 'SINGLE',
    clinicDbId: live.clinic.id,
    authUserId: live.member.user_id ?? null,
    entitlement: clinicToEntitlement(live.clinic),
  };
}

export function staffOptionToSession(
  staff: ClinicStaffOption,
  branch: ClinicSessionSelection['branch'],
  chairId?: string,
  clinicDbId?: string | null,
  clinicScale: ClinicSessionSelection['clinicScale'] = 'SINGLE'
): ClinicSessionSelection {
  const allowed = OPERATORY_CHAIRS.filter((c) => branch.chairIds.includes(c.id));
  const chair =
    allowed.find((c) => c.id === chairId) ??
    allowed[0] ??
    DEFAULT_CLINIC_SESSION.chair;

  return {
    doctor: staff,
    branch,
    chair,
    clinicScale: branch.chairIds.length > 1 ? clinicScale : 'SINGLE',
    clinicDbId: clinicDbId ?? null,
    authUserId: staff.userId ?? null,
  };
}

/** Build session from a staff roster pick (live or demo). */
export async function sessionFromStaffPick(
  staff: ClinicStaffOption,
  clinicDbId: string | null,
  chairId?: string
): Promise<ClinicSessionSelection> {
  if (clinicDbId && isSupabaseConfigured()) {
    const sb = getSupabase();
    if (sb) {
      const { data: clinic } = await sb.from('clinics').select('*').eq('id', clinicDbId).maybeSingle();
      if (clinic) {
        const branch = resolveBranch(clinic as DbClinic);
        return staffOptionToSession(staff, branch, chairId, clinicDbId, 'SINGLE');
      }
    }
  }
  return staffOptionToSession(
    staff,
    DEFAULT_CLINIC_SESSION.branch,
    chairId,
    clinicDbId,
    'MULTI'
  );
}
