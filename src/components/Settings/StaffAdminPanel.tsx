import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  MessageCircle,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  addClinicStaffInvite,
  ClinicStaffOption,
  listClinicStaff,
} from '../../lib/clinicAuth';
import { ClinicSpecialty, SPECIALTY_OPTIONS, specialtyFullLabel } from '../../lib/clinicSpecialty';
import { getSupabase } from '../../lib/supabase';

interface StaffAdminPanelProps {
  clinicDbId: string;
}

/**
 * OWNER-only: add, manage, and invite clinic staff members (Doctors, Specialists, Front Desk).
 * RLS enforces OWNER insert/update/delete; UI mirrors that gate.
 */
export const StaffAdminPanel: React.FC<StaffAdminPanelProps> = ({ clinicDbId }) => {
  const [staff, setStaff] = useState<ClinicStaffOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    displayName: '',
    inviteEmail: '',
    specialty: 'GENERAL' as ClinicSpecialty,
  });

  const reload = async () => {
    const rows = await listClinicStaff(clinicDbId);
    setStaff(rows);
  };

  useEffect(() => {
    void (async () => {
      const sb = getSupabase();
      if (!sb) {
        setIsOwner(false);
        setNote('Supabase not configured');
        return;
      }
      const { data: sessionData } = await sb.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setIsOwner(false);
        setNote('Sign in required');
        return;
      }
      const { data: mine, error } = await sb
        .from('clinic_members')
        .select('id, role')
        .eq('clinic_id', clinicDbId)
        .eq('user_id', uid)
        .eq('invite_status', 'ACTIVE')
        .maybeSingle();
      if (error) {
        setIsOwner(false);
        setNote(error.message);
        return;
      }
      const owner = mine?.role === 'OWNER';
      setIsOwner(owner);
      setMyMemberId(mine?.id ?? null);
      if (!owner) {
        setNote('Only the clinic OWNER can manage staff invites.');
        return;
      }
      await reload();
    })();
  }, [clinicDbId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !draft.displayName.trim() || !draft.inviteEmail.trim()) return;
    setBusy(true);
    setNote(null);
    const role =
      draft.specialty === 'FRONT_DESK' ? ('FRONT_DESK' as const) : ('DOCTOR' as const);
    const result = await addClinicStaffInvite({
      clinicId: clinicDbId,
      displayName: draft.displayName.trim(),
      role,
      specialty: draft.specialty,
      inviteEmail: draft.inviteEmail.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    setDraft({ displayName: '', inviteEmail: '', specialty: 'GENERAL' });
    await reload();
    setNote(`Invite created for ${draft.displayName.trim()}. Share the WhatsApp invite link below so they can claim their account.`);
  };

  const handleRevoke = async (memberId: string) => {
    if (!isOwner) return;
    setBusy(true);
    setNote(null);
    const sb = getSupabase();
    if (!sb) {
      setBusy(false);
      setNote('Supabase not configured');
      return;
    }
    const { error } = await sb.rpc('revoke_clinic_member', { p_member_id: memberId });
    setBusy(false);
    if (error) {
      setNote(error.message);
      return;
    }
    await reload();
    setNote('Staff member access revoked.');
  };

  const getInviteUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}`;
    }
    return 'https://aurasmileos-zeta.vercel.app';
  };

  const buildInviteMessage = (name: string, email: string) => {
    const url = getInviteUrl();
    return `Hello ${name}! You have been invited to join our dental clinic team on AuraSmile OS.\n\nPlease log in or sign up at ${url} using your email: ${email} to access your appointments and clinical records.`;
  };

  const handleCopyInvite = (s: ClinicStaffOption) => {
    if (!s.inviteEmail) return;
    const msg = buildInviteMessage(s.displayName, s.inviteEmail);
    void navigator.clipboard.writeText(msg);
    setCopiedMemberId(s.memberId);
    setTimeout(() => setCopiedMemberId(null), 3000);
  };

  const handleWhatsAppInvite = (s: ClinicStaffOption) => {
    if (!s.inviteEmail) return;
    const msg = buildInviteMessage(s.displayName, s.inviteEmail);
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (isOwner === null) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
        <Clock className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
        Checking staff admin access…
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="surface-card p-5 space-y-2 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Shield className="w-4 h-4 text-amber-600" />
          Staff Admin Access Restricted
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {note ?? 'Only the clinic OWNER has permissions to invite or manage staff members.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border border-slate-200 rounded-xl bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[var(--color-brand)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Clinic Staff & Team Roster</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Manage Associate Dentists, Visiting Specialists, and Front Desk Executives.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
          <Shield className="w-3.5 h-3.5" />
          Owner Privileges Active
        </div>
      </div>

      {note && (
        <div className="text-[12px] text-teal-900 bg-teal-50/80 border border-teal-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between">
          <span>{note}</span>
          <button
            type="button"
            onClick={() => setNote(null)}
            className="text-xs text-teal-700 hover:text-teal-900 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Roster list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
          <span>Team Members ({staff.length})</span>
          <span>Role & Invite Status</span>
        </div>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
          {staff.map((s) => {
            const isSelf = s.memberId === myMemberId;
            const isPending = s.inviteStatus === 'PENDING';
            const role = s.memberRole ?? (s.role === 'FRONT_DESK' ? 'FRONT_DESK' : 'DOCTOR');

            return (
              <li
                key={s.memberId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{s.displayName}</span>
                    {isSelf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>{specialtyFullLabel(s.specialtyCode)}</span>
                    <span>·</span>
                    <span className="font-mono text-slate-600">{s.inviteEmail || 'No email'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      role === 'OWNER'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : role === 'DOCTOR'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                    }`}
                  >
                    {role}
                  </span>

                  <span
                    className={`text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                      isPending
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3" />
                        Pending Claim
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Active
                      </>
                    )}
                  </span>

                  {isPending && s.inviteEmail && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleWhatsAppInvite(s)}
                        className="tactile-btn p-1.5 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 text-[11px]"
                        title="Send invite via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline font-medium">WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(s)}
                        className="tactile-btn p-1.5 rounded-md text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center gap-1 text-[11px]"
                        title="Copy invite text"
                      >
                        {copiedMemberId === s.memberId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline font-medium">
                          {copiedMemberId === s.memberId ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    </div>
                  )}

                  {!isSelf && role !== 'OWNER' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRevoke(s.memberId)}
                      className="tactile-btn p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      title="Revoke member access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {staff.length === 0 && (
            <li className="px-4 py-8 text-xs text-slate-500 text-center">
              No additional staff members added yet.
            </li>
          )}
        </ul>
      </div>

      {/* Add Staff Form */}
      <form
        onSubmit={(e) => void handleAdd(e)}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
          <Plus className="w-4 h-4 text-[var(--color-brand)]" />
          Add New Employee / Doctor
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Full Name / Doctor Title
            </label>
            <input
              required
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              placeholder="e.g. Dr. Ananya Iyer, BDS"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Login / Invite Email
            </label>
            <input
              required
              type="email"
              value={draft.inviteEmail}
              onChange={(e) => setDraft({ ...draft, inviteEmail: e.target.value })}
              placeholder="e.g. ananya.dentist@gmail.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Role & Clinical Specialty
            </label>
            <select
              value={draft.specialty}
              onChange={(e) =>
                setDraft({ ...draft, specialty: e.target.value as ClinicSpecialty })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            >
              {SPECIALTY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Staff will claim their membership automatically when signing in with this email.
          </p>
          <button
            type="submit"
            disabled={busy || !draft.displayName.trim() || !draft.inviteEmail.trim()}
            className="tactile-btn inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white px-5 py-2.5 text-xs font-bold disabled:opacity-50 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Staff Invite
          </button>
        </div>
      </form>

      {/* Role access breakdown */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-[11px] text-slate-600">
        <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
          Role Permissions Summary
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-bold text-teal-800">Associate & Specialist Doctors</span>
            <p className="mt-1 text-slate-500">
              Assigned operatory chairs, access to Patient EMR, Odontogram, Prescriptions, Treatment Plans, and Clinical Imaging.
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-bold text-sky-800">Front Desk & Receptionists</span>
            <p className="mt-1 text-slate-500">
              Patient check-in, Queue management, Appointment booking, Billing Receipt generation, and WhatsApp reminders.
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-bold text-purple-800">Clinic Owner</span>
            <p className="mt-1 text-slate-500">
              Full clinic authority: Financial reports, Inventory stock management, Staff onboarding & revocation, and GST settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

