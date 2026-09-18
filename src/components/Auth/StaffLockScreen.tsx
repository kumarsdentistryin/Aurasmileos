import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Lock,
  LogOut,
  Stethoscope,
  Users,
} from 'lucide-react';
import { CLINIC_BRANCHES, ClinicDoctorOption } from './DoctorAuthModal';
import { BrandMark } from '../Brand/BrandMark';
import { getClinicBranding } from '../../lib/clinicBranding';
import { loadLocalBranding } from '../../lib/brandingRepository';
import {
  clearClinicSession,
  isDemoMode,
  loadStationContext,
} from '../../lib/clinicSession';
import {
  ClinicStaffOption,
  isPendingUnclaimedStaff,
  listClinicStaff,
  listDemoStaff,
  signOutLive,
} from '../../lib/clinicAuth';
import { StaffRosterSkeleton } from '../ui/Skeleton';

/** Mask invite email for shared-tablet roster (a***@domain.com). */
function maskInviteEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '•••';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const head = local[0] ?? '•';
  return `${head}***@${domain}`;
}

interface StaffLockScreenProps {
  onUnlockRequest: (doctor: ClinicDoctorOption) => void;
  clinicDbId?: string | null;
  clinicNameHint?: string;
  unlockHint?: string | null;
}

/**
 * Clinic staff unlock gate — roster from clinic_members (or demo fallback).
 */
export const StaffLockScreen: React.FC<StaffLockScreenProps> = ({
  onUnlockRequest,
  clinicDbId: clinicDbIdProp,
  clinicNameHint,
  unlockHint,
}) => {
  const navigate = useNavigate();
  const station = loadStationContext();
  const clinicDbId = clinicDbIdProp ?? station?.clinicDbId ?? null;
  const branchId = station?.branchId ?? 'blr-01';
  const branding = loadLocalBranding(branchId) ?? getClinicBranding(branchId);
  const branch = CLINIC_BRANCHES.find((b) => b.id === branchId) ?? CLINIC_BRANCHES[0];
  const liveExpected = Boolean(clinicDbId) && !isDemoMode();
  const demo = !liveExpected;

  const [staff, setStaff] = useState<ClinicStaffOption[]>(() =>
    demo ? listDemoStaff() : []
  );
  const [loading, setLoading] = useState(liveExpected);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!liveExpected || !clinicDbId) {
      setStaff(listDemoStaff());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await listClinicStaff(clinicDbId);
      if (cancelled) return;
      setStaff(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicDbId, liveExpected]);

  const doctors = staff.filter((d) => d.role === 'DOCTOR');
  const desk = staff.filter((d) => d.role === 'FRONT_DESK');

  const handleLeaveStation = async (dest: '/' | '/login') => {
    setExiting(true);
    try {
      clearClinicSession();
      await signOutLive();
      navigate(dest);
    } finally {
      setExiting(false);
    }
  };

  const renderStaffButton = (doc: ClinicStaffOption, variant: 'doctor' | 'desk') => {
    const pendingClaim = liveExpected && isPendingUnclaimedStaff(doc);
    const baseStyles =
      variant === 'doctor'
        ? 'tactile-btn w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 active:scale-[0.99]'
        : 'tactile-btn w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]';

    return (
      <button
        key={doc.id}
        type="button"
        onClick={() => onUnlockRequest(doc)}
        className={pendingClaim ? `${baseStyles} border-dashed bg-slate-50/80` : baseStyles}
      >
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'doctor'
              ? 'bg-teal-50 text-teal-700 border border-teal-100'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {variant === 'doctor' ? (
            <Stethoscope className="w-4 h-4" />
          ) : (
            <Users className="w-4 h-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900 truncate">
            {doc.displayName}
          </span>
          <span
            className={`block text-[11px] mt-0.5 ${
              pendingClaim ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            {pendingClaim
              ? `Invite pending · claim via signup${
                  doc.inviteEmail ? ` · ${maskInviteEmail(doc.inviteEmail)}` : ''
                }`
              : variant === 'doctor'
                ? `${doc.specialty} · own patient list`
                : 'Full clinic queue today'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas-deep)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 45% at 12% 0%, rgba(15,118,110,0.1) 0%, transparent 55%), linear-gradient(180deg, #F1F5F9 0%, transparent 50%)',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Always-visible exit paths */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={exiting}
            onClick={() => void handleLeaveStation('/')}
            className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-white active:scale-[0.97] disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            Back to home
          </button>
          <div className="flex flex-wrap gap-2">
            {demo && (
              <Link
                to="/signup"
                className="tactile-btn inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12px] font-semibold text-teal-900 hover:bg-teal-100 active:scale-[0.97]"
              >
                Create clinic
              </Link>
            )}
            <button
              type="button"
              disabled={exiting}
              onClick={() => void handleLeaveStation('/login')}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-white active:scale-[0.97] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Switch account
            </button>
          </div>
        </div>

        {demo && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 text-center">
            Demo sandbox · tap a doctor to explore · create a real clinic anytime
          </div>
        )}

        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 pt-7 pb-5 border-b border-slate-100 text-center sm:text-left sm:flex sm:items-center sm:gap-4">
            <img
              src={branding.logoDataUrl}
              alt=""
              className="w-16 h-16 rounded-2xl border border-slate-100 object-contain mx-auto sm:mx-0 bg-slate-50"
            />
            <div className="min-w-0 mt-3 sm:mt-0">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 leading-snug">
                {clinicNameHint || branding.legalName}
              </h1>
              {branding.tagline && (
                <p className="text-[12px] text-slate-500 mt-1">{branding.tagline}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-center sm:justify-start gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {branch.name} · {branding.phone}
                </span>
              </p>
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-start gap-2 text-[11px] text-slate-600">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-brand)]" />
            <span>
              <strong>Who is on this station?</strong> Tap your name
              {liveExpected ? ', then enter your password to unlock.' : ' to open the workstation.'}
            </span>
          </div>

          {unlockHint && (
            <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              {unlockHint}
            </div>
          )}

          <div className="p-5 space-y-4">
            {loading ? (
              <StaffRosterSkeleton />
            ) : staff.length === 0 && liveExpected ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-slate-500">
                  No staff on this clinic roster yet. Unlock as owner after finishing setup, or
                  invite desk / doctors in Staff admin.
                </p>
                <Link
                  to="/onboarding"
                  className="inline-flex text-[13px] font-semibold text-[var(--color-brand)]"
                >
                  Resume clinic setup
                </Link>
              </div>
            ) : (
              <>
                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Doctors
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {doctors.map((doc) => renderStaffButton(doc, 'doctor'))}
                    {doctors.length === 0 && (
                      <p className="text-[12px] text-slate-500">No doctors on roster yet.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Front desk
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {desk.map((doc) => renderStaffButton(doc, 'desk'))}
                    {desk.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-500">
                        No desk staff yet — invite reception in{' '}
                        <strong className="font-semibold text-slate-700">Clinic → Staff</strong>{' '}
                        after you unlock as owner.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-400 tracking-wide">
          <BrandMark size="w-5 h-5" />
          Powered by AuraSmile OS · clinical workstation
        </p>
      </div>
    </div>
  );
};
