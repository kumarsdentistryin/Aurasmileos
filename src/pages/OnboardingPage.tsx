import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  addClinicStaffInvite,
  createClinicWithOwner,
  getAuthSessionEmail,
  getAuthSessionUserId,
  listClinicStaff,
  listLiveMemberships,
  membershipToSession,
  updateClinicProfile,
} from '../lib/clinicAuth';
import { ClinicSpecialty, SPECIALTY_OPTIONS } from '../lib/clinicSpecialty';
import { trackOnboardingEvent, upsertClinicLead } from '../lib/funnelTracking';
import { saveClinicSession, setStaffLocked } from '../lib/clinicSession';
import { isSupabaseConfigured } from '../lib/supabase';
import { clampChairCount } from '../lib/entitlements';
import { BrandMark } from '../components/Brand/BrandMark';

type StaffDraft = {
  displayName: string;
  specialty: ClinicSpecialty;
  role: 'DOCTOR' | 'FRONT_DESK';
  inviteEmail: string;
};

const DEFAULT_STAFF: StaffDraft[] = [
  {
    displayName: 'Reception Desk',
    specialty: 'FRONT_DESK',
    role: 'FRONT_DESK',
    inviteEmail: '',
  },
  {
    displayName: 'Dr. Pedo',
    specialty: 'PEDIATRIC',
    role: 'DOCTOR',
    inviteEmail: '',
  },
  {
    displayName: 'Dr. Oral Surgery',
    specialty: 'ORAL_SURGERY',
    role: 'DOCTOR',
    inviteEmail: '',
  },
  {
    displayName: 'Dr. Micro Endo',
    specialty: 'MICRO_ENDO',
    role: 'DOCTOR',
    inviteEmail: '',
  },
];

const STEPS = ['Letterhead', 'Chairs', 'Team', 'Ready'] as const;

const fieldClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30';

function branchCodeFromName(name: string): string {
  const letters = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const uuidSlice =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${letters || 'CLINIC'}-${uuidSlice}`;
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');

  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState(
    () => sessionStorage.getItem('aurasmile.onboarding.ownerName') || 'Clinic Owner'
  );
  const [chairCount, setChairCount] = useState<1 | 2 | 3>(3);
  const [staff, setStaff] = useState<StaffDraft[]>(DEFAULT_STAFF);

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured()) return;
      const uid = await getAuthSessionUserId();
      if (!uid) {
        navigate('/signup');
        return;
      }
      const email = await getAuthSessionEmail();
      if (email) setOwnerEmail(email);

      const memberships = await listLiveMemberships();
      if (memberships[0]) {
        setClinicId(memberships[0].clinic.id);
        setClinicName(memberships[0].clinic.name);
        setCity(memberships[0].clinic.city_line || '');
        setPhone(memberships[0].clinic.phone || '');
        if (memberships[0].clinic.onboarding_completed_at) {
          navigate('/app');
        }
      }
    })();
  }, [navigate]);

  const progress = useMemo(() => ((step + 1) / 4) * 100, [step]);

  const ensureClinic = async (): Promise<string> => {
    if (clinicId) return clinicId;
    const email = ownerEmail || (await getAuthSessionEmail()) || '';
    const created = await createClinicWithOwner({
      name: clinicName.trim(),
      branchCode: branchCodeFromName(clinicName),
      cityLine: city.trim(),
      phone: phone.trim(),
      chairCount,
      displayName: ownerDisplayName.trim(),
      email,
    });
    if (!created.ok) throw new Error(created.error);
    setClinicId(created.clinic.id);
    const lid = await upsertClinicLead({
      email,
      clinicId: created.clinic.id,
      clinicName: created.clinic.name,
      phone: phone.trim(),
      city: city.trim(),
      status: 'ONBOARDING',
    });
    setLeadId(lid);
    return created.clinic.id;
  };

  const finishBranding = async () => {
    setError(null);
    if (!clinicName.trim() || !city.trim()) {
      setError('Clinic name and city are required.');
      return;
    }
    setBusy(true);
    try {
      const id = await ensureClinic();
      await updateClinicProfile(id, {
        name: clinicName.trim(),
        city_line: city.trim(),
        phone: phone.trim() || undefined,
      });
      await trackOnboardingEvent({
        step: 'onboarding_branding',
        email: ownerEmail,
        clinicId: id,
        leadId,
      });
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save clinic');
    } finally {
      setBusy(false);
    }
  };

  const finishChairs = async () => {
    setError(null);
    setBusy(true);
    try {
      const id = await ensureClinic();
      const chairs = clampChairCount(chairCount, 'free_trial') as 1 | 2 | 3;
      setChairCount(chairs);
      await updateClinicProfile(id, { chair_count: chairs });
      await trackOnboardingEvent({
        step: 'onboarding_chairs',
        email: ownerEmail,
        clinicId: id,
        leadId,
        payload: { chairCount: chairs },
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save chairs');
    } finally {
      setBusy(false);
    }
  };

  const finishStaff = async (opts?: { skipInvites?: boolean }) => {
    setError(null);
    const skipInvites = opts?.skipInvites === true;
    const toInvite = skipInvites ? [] : staff.filter((s) => s.inviteEmail.trim());

    if (!skipInvites) {
      const incomplete = staff.filter(
        (s) => s.inviteEmail.trim() && !s.displayName.trim()
      );
      if (incomplete.length) {
        setError('Rows with an invite email also need a display name.');
        return;
      }
    }

    setBusy(true);
    try {
      const id = await ensureClinic();
      if (toInvite.length) {
        const existing = await listClinicStaff(id);
        const existingEmails = new Set(
          existing
            .map((s) => s.inviteEmail?.trim().toLowerCase())
            .filter((e): e is string => Boolean(e))
        );
        for (const row of toInvite) {
          const inviteEmail = row.inviteEmail.trim().toLowerCase();
          if (existingEmails.has(inviteEmail)) continue;
          const result = await addClinicStaffInvite({
            clinicId: id,
            displayName: row.displayName.trim(),
            role: row.role,
            specialty: row.specialty,
            inviteEmail,
          });
          if (!result.ok) {
            const msg = result.error.toLowerCase();
            if (
              msg.includes('duplicate') ||
              msg.includes('unique') ||
              msg.includes('clinic_members_clinic_invite_email')
            ) {
              existingEmails.add(inviteEmail);
              continue;
            }
            throw new Error(result.error);
          }
          existingEmails.add(inviteEmail);
        }
      }
      await trackOnboardingEvent({
        step: 'onboarding_staff',
        email: ownerEmail,
        clinicId: id,
        leadId,
        payload: { count: toInvite.length, skipped: skipInvites || toInvite.length === 0 },
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add staff');
    } finally {
      setBusy(false);
    }
  };

  const finishAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = clinicId ?? (await ensureClinic());
      await updateClinicProfile(id, {
        onboarding_completed_at: new Date().toISOString(),
      });
      await upsertClinicLead({
        email: ownerEmail,
        clinicId: id,
        clinicName: clinicName.trim(),
        status: 'ACTIVE',
      });
      await trackOnboardingEvent({
        step: 'onboarding_completed',
        email: ownerEmail,
        clinicId: id,
        leadId,
      });

      const memberships = await listLiveMemberships();
      if (memberships[0]) {
        const session = membershipToSession(memberships[0]);
        saveClinicSession(session);
      }
      setStaffLocked(false);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish onboarding');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center p-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600 shadow-sm">
          <BrandMark showWordmark />
          <p className="font-bold text-slate-900 mt-4 mb-2">Clinic cloud required</p>
          <p>
            Live onboarding needs clinic cloud configured. You can explore the demo workstation
            now.
          </p>
          <Link
            to="/app?demo=1&tab=operatory"
            className="inline-block mt-4 font-semibold text-[var(--color-brand)]"
          >
            Explore live workstation
          </Link>
          <Link to="/" className="mt-3 block text-[12px] font-semibold text-slate-500">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 40% at 10% 0%, rgba(15,118,110,0.08) 0%, transparent 55%)',
        }}
      />
      <header className="relative z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <BrandMark showWordmark size="w-8 h-8" />
          <span className="text-[11px] font-semibold text-slate-500">Setup · ~2 min</span>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3">
          <ol className="flex gap-1.5">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1 min-w-0">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    i <= step ? 'bg-[var(--color-brand)]' : 'bg-slate-200'
                  }`}
                />
                <p
                  className={`mt-1.5 truncate text-[10px] font-semibold ${
                    i === step
                      ? 'text-[var(--color-brand)]'
                      : i < step
                        ? 'text-slate-600'
                        : 'text-slate-400'
                  }`}
                >
                  {i + 1}. {label}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-0.5 bg-[var(--color-brand)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-lg w-full mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-[12px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {step === 0 && (
          <section className="space-y-4 animate-[workspaceIn_180ms_ease-out]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Step 1 · Letterhead
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Your clinic on every print
            </h1>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Legal name, phone, and city for Rx, consent, and tax invoices.
            </p>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Clinic legal name
              <input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Kumars Microscopic Dental Care"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Owner display name
              <input
                value={ownerDisplayName}
                onChange={(e) => setOwnerDisplayName(e.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={fieldClass}
                  placeholder="Bengaluru"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finishBranding()}
              className="tactile-btn w-full rounded-lg bg-[var(--color-brand)] text-white py-3 text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[var(--color-brand-hover)] active:scale-[0.97] disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit to home
            </Link>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4 animate-[workspaceIn_180ms_ease-out]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Step 2 · Chairs
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              How many chairs?
            </h1>
            <p className="text-[13px] text-slate-500">
              Shared operatories — doctors rotate across the day. Front desk seats the queue.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChairCount(n)}
                  className={`tactile-btn p-5 rounded-xl border text-center active:scale-[0.97] ${
                    chairCount === n
                      ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-display text-2xl font-extrabold text-slate-900">{n}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-1">
                    chair{n === 1 ? '' : 's'}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="tactile-btn flex-1 rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 active:scale-[0.97]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finishChairs()}
                className="tactile-btn flex-1 rounded-lg bg-[var(--color-brand)] text-white py-3 text-sm font-bold hover:bg-[var(--color-brand-hover)] active:scale-[0.97] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4 animate-[workspaceIn_180ms_ease-out]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Step 3 · Team
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Invite your floor
            </h1>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Optional — add desk and specialty doctors now, or continue owner-only and invite
              later. Staff claim seats by signing up with the invite email.
            </p>
            <div className="space-y-3">
              {staff.map((row, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand)]">
                    {SPECIALTY_OPTIONS.find((s) => s.value === row.specialty)?.shortLabel}
                    <span className="ml-1.5 font-medium normal-case tracking-normal text-slate-400">
                      · optional
                    </span>
                  </div>
                  <input
                    value={row.displayName}
                    onChange={(e) => {
                      const next = [...staff];
                      next[idx] = { ...row, displayName: e.target.value };
                      setStaff(next);
                    }}
                    className={`${fieldClass} mt-0`}
                    placeholder="Display name"
                  />
                  <input
                    type="email"
                    value={row.inviteEmail}
                    onChange={(e) => {
                      const next = [...staff];
                      next[idx] = { ...row, inviteEmail: e.target.value };
                      setStaff(next);
                    }}
                    className={`${fieldClass} mt-0`}
                    placeholder="Invite email (optional)"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="tactile-btn flex-1 rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 active:scale-[0.97]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void finishStaff()}
                  className="tactile-btn flex-1 rounded-lg bg-[var(--color-brand)] text-white py-3 text-sm font-bold hover:bg-[var(--color-brand-hover)] active:scale-[0.97] disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void finishStaff({ skipInvites: true })}
                className="tactile-btn w-full rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 active:scale-[0.97]"
              >
                Skip — continue with owner only
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5 text-center animate-[workspaceIn_180ms_ease-out]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 border border-teal-100">
              <CheckCircle2 className="w-8 h-8 text-[var(--color-brand)]" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Step 4 · Ready
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Floor is set
            </h1>
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-sm mx-auto">
              Next you’ll unlock as owner on this tablet. Invited staff claim seats by signing up
              with their invite email — add more anytime in Clinic → Staff.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finishAll()}
              className="tactile-btn w-full rounded-lg bg-[var(--color-brand)] text-white py-3 text-sm font-bold hover:bg-[var(--color-brand-hover)] active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? 'Opening workstation…' : 'Go to staff unlock'}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to team
            </button>
          </section>
        )}
      </main>
    </div>
  );
};
