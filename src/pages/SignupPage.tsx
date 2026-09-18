import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicShell } from '../components/Public/PublicShell';
import {
  AuthStage,
  AuthPasswordInput,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '../components/Public/AuthStage';
import { getAuthSessionUserId, signUpWithPassword } from '../lib/clinicAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { trackOnboardingEvent, upsertClinicLead } from '../lib/funnelTracking';
import { setStaffLocked } from '../lib/clinicSession';
import { isPasswordValid, MIN_PASSWORD_LENGTH } from '../lib/onboardingHelpers';
import { Armchair, ShieldCheck, Users } from 'lucide-react';

const SIGNUP_FUNNEL = [
  'Owner account',
  'Clinic letterhead & chairs',
  'Invite team · unlock',
] as const;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(
        'Live clinic signup needs clinic cloud configured. Explore the demo workstation meanwhile.'
      );
      return;
    }
    if (!isPasswordValid(password)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      await trackOnboardingEvent({ step: 'signup_started', email: trimmedEmail });
      const result = await signUpWithPassword(trimmedEmail, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const sessionUserId = await getAuthSessionUserId();
      if (!sessionUserId) {
        setSignedUpEmail(trimmedEmail);
        setAwaitingEmailConfirm(true);
        sessionStorage.setItem(
          'aurasmile.onboarding.ownerName',
          ownerName.trim() || 'Clinic Owner'
        );
        await upsertClinicLead({
          email: trimmedEmail,
          status: 'SIGNED_UP',
        });
        await trackOnboardingEvent({
          step: 'signup_completed',
          email: trimmedEmail,
          payload: { ownerName: ownerName.trim(), awaitingEmailConfirm: true },
        });
        return;
      }

      const leadId = await upsertClinicLead({
        email: trimmedEmail,
        status: 'SIGNED_UP',
      });
      await trackOnboardingEvent({
        step: 'signup_completed',
        email: trimmedEmail,
        leadId,
        payload: { ownerName: ownerName.trim() },
      });
      sessionStorage.setItem(
        'aurasmile.onboarding.ownerName',
        ownerName.trim() || 'Clinic Owner'
      );
      setStaffLocked(false);
      navigate('/onboarding');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <AuthStage
        panelLine="Owner account first — then letterhead, chairs, and your multi-specialty roster in about two minutes."
        funnelSteps={SIGNUP_FUNNEL}
        activeFunnelStep={0}
      >
        {awaitingEmailConfirm ? (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Confirm your email
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              We sent a link to{' '}
              <span className="font-semibold text-slate-800">{signedUpEmail}</span>. Open it, then
              log in to finish clinic setup.
            </p>
            <Link
              to="/login"
              className={`${authPrimaryBtnClass} mt-8 inline-flex justify-center`}
            >
              Go to log in
            </Link>
            <Link
              to="/"
              className="mt-4 block text-center text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to home
            </Link>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Step 1 of 3 · Account
            </p>
            <h1 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              Create your clinic
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              Free pilot · up to 3 chairs. No card at signup.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
              <label className={authLabelClass}>
                Your name
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Dr. / Owner name"
                  className={authInputClass}
                />
              </label>
              <label className={authLabelClass}>
                Work email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authInputClass}
                  autoComplete="username"
                />
              </label>
              <label className={authLabelClass}>
                Password · min {MIN_PASSWORD_LENGTH} characters
                <AuthPasswordInput
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </label>
              {error && (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
                {busy ? 'Creating account…' : 'Continue to clinic setup'}
              </button>
            </form>

            <ul className="mt-8 space-y-2.5 rounded-xl border border-slate-200 bg-white p-4">
              <li className="flex gap-2.5 text-[12px] text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                Your clinic brand on Rx & consent — not AuraSmile’s
              </li>
              <li className="flex gap-2.5 text-[12px] text-slate-600">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                Invite Pedo, Oral, Micro Endo, and Desk when you’re ready
              </li>
              <li className="flex gap-2.5 text-[12px] text-slate-600">
                <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                Shared chairs — doctors rotate; desk keeps the day moving
              </li>
            </ul>

            <p className="mt-6 text-[12px] text-slate-500">
              <Link to="/" className="font-semibold text-slate-700 hover:text-slate-900">
                ← Home
              </Link>
              {' · '}
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[var(--color-brand)]">
                Log in
              </Link>
              {' · '}
              <Link to="/app?demo=1" className="font-semibold text-slate-700">
                Explore workstation
              </Link>
            </p>
          </>
        )}
      </AuthStage>
    </PublicShell>
  );
};
