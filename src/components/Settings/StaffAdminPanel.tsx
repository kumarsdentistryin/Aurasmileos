import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  addClinicStaffInvite,
  ClinicStaffOption,
  listClinicStaff,
} from '../../lib/clinicAuth';
import { ClinicSpecialty, SPECIALTY_OPTIONS } from '../../lib/clinicSpecialty';
import { getSupabase } from '../../lib/supabase';

interface StaffAdminPanelProps {
  clinicDbId: string;
}

/**
 * OWNER-only: add or revoke clinic_members after onboarding.
 * RLS enforces OWNER insert/update/delete; UI mirrors that gate.
 */
export const StaffAdminPanel: React.FC<StaffAdminPanelProps> = ({ clinicDbId }) => {
  const [staff, setStaff] = useState<ClinicStaffOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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
    setNote('Staff invite added');
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
    // Clears invite_status + user_id so REVOKED rows leave user_clinic_ids()
    const { error } = await sb.rpc('revoke_clinic_member', { p_member_id: memberId });
    setBusy(false);
    if (error) {
      setNote(error.message);
      return;
    }
    await reload();
  };

  if (isOwner === null) {
    return (
      <p className="text-[12px] text-slate-500">Checking staff admin access…</p>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900">Staff admin</h2>
        <p className="text-[12px] text-slate-500">
          {note ?? 'Only the clinic OWNER can manage staff invites.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Staff admin</h2>
        <p className="text-[12px] text-slate-500 mt-0.5">
          Add Pedo / Oral / Micro / Desk. They claim by signing up with the invite email.
        </p>
      </div>

      {note && (
        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          {note}
        </p>
      )}

      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {staff.map((s) => (
          <li key={s.memberId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{s.displayName}</div>
              <div className="text-[11px] text-slate-500">
                {s.specialty} · {s.inviteEmail || 'no email'} · {s.inviteStatus || 'ACTIVE'}
              </div>
            </div>
            {s.memberRole !== 'OWNER' && s.memberId !== myMemberId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRevoke(s.memberId)}
                className="tactile-btn p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Revoke"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </li>
        ))}
        {staff.length === 0 && (
          <li className="px-4 py-6 text-sm text-slate-500 text-center">No staff yet</li>
        )}
      </ul>

      <form
        onSubmit={(e) => void handleAdd(e)}
        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <Plus className="w-3.5 h-3.5" />
          Add staff
        </div>
        <input
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          placeholder="Display name"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={draft.inviteEmail}
          onChange={(e) => setDraft({ ...draft, inviteEmail: e.target.value })}
          placeholder="Invite email"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={draft.specialty}
          onChange={(e) =>
            setDraft({ ...draft, specialty: e.target.value as ClinicSpecialty })
          }
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {SPECIALTY_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="tactile-btn w-full rounded-md bg-teal-700 text-white py-2 text-xs font-bold disabled:opacity-50"
        >
          Add invite
        </button>
      </form>
    </div>
  );
};
