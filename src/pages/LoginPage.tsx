import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicShell } from '../components/Public/PublicShell';
import {
  AuthStage,
  AuthPasswordInput,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
} from '../components/Public/AuthStage';
import {
  listLiveMemberships,
  LiveMembership,
  membershipToSession,
  resetPasswordForEmail,
  signInWithPassword,
  updatePassword,
} from '../lib/clinicAuth';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { saveClinicSession, setStaffLocked } from '../lib/clinicSession';
import { isPasswordValid, MIN_PASSWORD_LENGTH } from '../lib/onboardingHelpers';

type LoginStep = 'credentials' | 'pick-clinic' | 'no-membership' | 'set-password';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [memberships, setMemberships] = useState<LiveMembership[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('set-password');
        setError(null);
        setInfo('Choose a new password for your clinic account.');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const enterClinic = (live: LiveMembership) => {
    const session = membershipToSession(live);
    saveClinicSession(session);
    // saveClinicSession already unlocks — do not re-lock or DoctorAuthModal asks password again
    setStaffLocked(false);
    if (!live.clinic.onboarding_completed_at) {
      navigate('/onboarding');
      return;
    }
    navigate('/app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isSupabaseConfigured()) {
      setError(
        'Clinic sign-in is not available right now. Explore the demo clinic, or try again later.'
      );
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithPassword(email.trim(), password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const rows = await listLiveMemberships();
      if (rows.length === 0) {
        setMemberships([]);
        setStep('no-membership');
        return;
      }
      if (rows.length === 1) {
        enterClinic(rows[0]);
        return;
      }
      setMemberships(rows);
      setStep('pick-clinic');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password.');
      return;
    }
    setBusy(true);
    try {
      const result = await resetPasswordForEmail(email.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo('If that email is on file, we sent a reset link. Check your inbox shortly.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isPasswordValid(newPassword)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await updatePassword(newPassword);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setStep('credentials');
      setInfo('Password updated. Sign in with your new password.');
    } finally {
      setBusy(false);
    }
  };

  const footerLinks = (
    <p className="mt-6 text-[12px] text-slate-500">
      <Link to="/" className="font-semibold text-slate-700 hover:text-slate-900">
        ← Home
      </Link>
      {' · '}
      New clinic?{' '}
      <Link to="/signup" className="font-semibold text-[var(--color-brand)]">
        Create clinic
      </Link>
      {' · '}
      <Link to="/app?demo=1&tab=operatory" className="font-semibold text-slate-700">
        Explore workstation
      </Link>
    </p>
  );

  return (
    <PublicShell>
      <AuthStage>
        {step === 'credentials' && (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Staff log in
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              Owner account or the email from your clinic invite.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
              <label className={authLabelClass}>
                Email
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
                Password
                <AuthPasswordInput
                  required
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
              </label>
              {error && (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-[12px] text-teal-800">
                  {info}
                </p>
              )}
              <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
                {busy ? 'Signing in…' : 'Sign in to clinic'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleForgotPassword()}
                className="tactile-btn w-full py-1 text-[12px] font-medium text-slate-600 hover:text-[var(--color-brand)] disabled:opacity-50"
              >
                Forgot password?
              </button>
            </form>
            {footerLinks}
          </>
        )}

        {step === 'set-password' && (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Set new password
            </h1>
            <p className="mt-2 text-[13px] text-slate-500">
              From your reset email — then sign in again.
            </p>
            <form onSubmit={(e) => void handleSetPassword(e)} className="mt-8 space-y-4">
              <label className={authLabelClass}>
                New password
                <AuthPasswordInput
                  required
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </label>
              <label className={authLabelClass}>
                Confirm password
                <AuthPasswordInput
                  required
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </label>
              {error && (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-[12px] text-teal-800">
                  {info}
                </p>
              )}
              <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </form>
            {footerLinks}
          </>
        )}

        {step === 'pick-clinic' && (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Choose clinic
            </h1>
            <p className="mt-2 text-[13px] text-slate-500">
              You belong to more than one clinic. Pick which floor to open.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-2">
              {memberships.map((row) => (
                <button
                  key={row.member.id}
                  type="button"
                  onClick={() => enterClinic(row)}
                  className="tactile-btn rounded-xl border border-slate-200 bg-white p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-[var(--color-brand)] hover:ring-2 hover:ring-[var(--color-brand)]/15 active:scale-[0.99]"
                >
                  <div className="text-sm font-bold text-slate-900">{row.clinic.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {row.clinic.branch_code} · {row.member.role}
                    {row.member.display_name ? ` · ${row.member.display_name}` : ''}
                  </div>
                </button>
              ))}
            </div>
            {footerLinks}
          </>
        )}

        {step === 'no-membership' && (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              No clinic on this account
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              Signed in, but you are not on a clinic roster yet. Ask your owner for an invite, or
              create a new clinic.
            </p>
            <div className="mt-8 space-y-2">
              <Link to="/signup" className={`${authPrimaryBtnClass} inline-flex justify-center`}>
                Create clinic
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError(null);
                  setInfo(null);
                }}
                className="tactile-btn w-full rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
              >
                Back to sign in
              </button>
            </div>
            {footerLinks}
          </>
        )}
      </AuthStage>
    </PublicShell>
  );
};
