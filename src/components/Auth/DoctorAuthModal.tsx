import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Stethoscope, X, Info, KeyRound } from 'lucide-react';
import {
  getAuthSessionEmail,
  listLiveMemberships,
  LiveMembership,
  membershipToSession,
  signInWithPassword,
  signOutLive,
} from '../../lib/clinicAuth';
import { isDemoMode } from '../../lib/clinicSession';
import type { ClinicEntitlement } from '../../lib/entitlements';
import { isSupabaseConfigured } from '../../lib/supabase';

export type ClinicRole = 'DOCTOR' | 'FRONT_DESK';
export type ClinicScale = 'SINGLE' | 'MULTI';

export interface ClinicDoctorOption {
  id: string;
  displayName: string;
  specialty: string;
  registrationLabel: string;
  role: ClinicRole;
  /** clinic_members.id when live roster */
  memberId?: string;
  specialtyCode?: string;
  /** Raw DB role — OWNER doctor-owners keep clinical DOCTOR session but manage Clinic ops */
  memberRole?: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
}

export interface ClinicBranchOption {
  id: string;
  name: string;
  code: string;
  cityLine: string;
  /** How many chairs this location has */
  chairIds: string[];
}

export interface OperatoryChairOption {
  id: string;
  label: string;
  suiteName: string;
}

export interface ClinicSessionSelection {
  doctor: ClinicDoctorOption;
  branch: ClinicBranchOption;
  chair: OperatoryChairOption;
  clinicScale: ClinicScale;
  /** Supabase clinics.id when live auth is active */
  clinicDbId?: string | null;
  /** Supabase auth.users.id when live auth is active */
  authUserId?: string | null;
  /** Live clinic trial/plan — set from membership; omitted in demo. */
  entitlement?: ClinicEntitlement;
}

export const CLINIC_DOCTORS: ClinicDoctorOption[] = [
  {
    id: 'doc-vikram',
    displayName: 'Dr. Vikram Rao, MDS',
    specialty: 'Endodontics',
    registrationLabel: 'Reg: KDC/D-14290 (Endodontist)',
    role: 'DOCTOR',
  },
  {
    id: 'doc-priya',
    displayName: 'Dr. Priya Sharma, MDS',
    specialty: 'Oral Surgery',
    registrationLabel: 'Reg: KDC/D-18821 (OMFS)',
    role: 'DOCTOR',
  },
  {
    id: 'doc-ananya',
    displayName: 'Dr. Ananya Iyer, BDS',
    specialty: 'General Dentistry',
    registrationLabel: 'Reg: KDC/D-21044 (General)',
    role: 'DOCTOR',
  },
  {
    id: 'desk-reception',
    displayName: 'Front Desk Reception',
    specialty: 'Patient Coordination',
    registrationLabel: 'Role: Front Desk · No clinical charting',
    role: 'FRONT_DESK',
  },
];

export const OPERATORY_CHAIRS: OperatoryChairOption[] = [
  { id: 'chair-1', label: 'Chair 1', suiteName: 'Aseptic Surgi-Suite' },
  { id: 'chair-2', label: 'Chair 2', suiteName: 'Pedo & Ortho' },
  { id: 'chair-3', label: 'Chair 3', suiteName: 'General Operatory' },
];

/** Flagship = 3 chairs · Mid = 2 · Solo hub = 1 */
export const CLINIC_BRANCHES: ClinicBranchOption[] = [
  {
    id: 'blr-01',
    name: 'Indiranagar Flagship',
    code: 'BLR-01',
    cityLine: '100ft Road, Indiranagar, Bengaluru',
    chairIds: ['chair-1', 'chair-2', 'chair-3'],
  },
  {
    id: 'blr-02',
    name: 'Koramangala Center',
    code: 'BLR-02',
    cityLine: '80ft Road, Koramangala 5th Block, Bengaluru',
    chairIds: ['chair-1', 'chair-2'],
  },
  {
    id: 'blr-03',
    name: 'Whitefield Hub',
    code: 'BLR-03',
    cityLine: 'ITPL Main Road, Whitefield, Bengaluru',
    chairIds: ['chair-1'],
  },
];

export const DEFAULT_CLINIC_SESSION: ClinicSessionSelection = {
  doctor: CLINIC_DOCTORS[0],
  branch: CLINIC_BRANCHES[0],
  chair: OPERATORY_CHAIRS[0],
  clinicScale: 'MULTI',
};

interface DoctorAuthModalProps {
  open: boolean;
  initialSelection?: ClinicSessionSelection;
  onClose: () => void;
  onConfirm: (selection: ClinicSessionSelection) => void;
  /** Live station unlock: demand password even if a Supabase session already exists */
  requirePasswordReentry?: boolean;
}

export const DoctorAuthModal: React.FC<DoctorAuthModalProps> = ({
  open,
  initialSelection = DEFAULT_CLINIC_SESSION,
  onClose,
  onConfirm,
  requirePasswordReentry = false,
}) => {
  const liveMode = isSupabaseConfigured() && !isDemoMode();
  const [clinicScale, setClinicScale] = useState<ClinicScale>(
    initialSelection.clinicScale ?? 'MULTI'
  );
  const [doctorId, setDoctorId] = useState(initialSelection.doctor.id);
  const [branchId, setBranchId] = useState(initialSelection.branch.id);
  const [chairId, setChairId] = useState(initialSelection.chair.id);
  /** Single-clinic only: how many chairs this location runs */
  const [singleChairCount, setSingleChairCount] = useState<1 | 2 | 3>(3);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<LiveMembership[]>([]);
  const [selectedMembershipKey, setSelectedMembershipKey] = useState<string | null>(null);
  const [liveReady, setLiveReady] = useState(!liveMode);

  useEffect(() => {
    if (!open) return;
    setClinicScale(initialSelection.clinicScale ?? 'MULTI');
    setDoctorId(initialSelection.doctor.id);
    setBranchId(initialSelection.branch.id);
    setChairId(initialSelection.chair.id);
    const n = initialSelection.branch.chairIds.length;
    setSingleChairCount(n === 1 || n === 2 || n === 3 ? n : 3);
    setAuthError(null);
    setAuthPassword('');

    if (!liveMode) {
      setLiveReady(true);
      return;
    }

    let cancelled = false;

    // Station unlock: never treat a warm session as enough — demand password first
    if (requirePasswordReentry) {
      setLiveReady(false);
      setMemberships([]);
      setSelectedMembershipKey(initialSelection.doctor.memberId ?? null);
      void getAuthSessionEmail().then((email) => {
        if (!cancelled && email) setAuthEmail(email);
      });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setAuthBusy(true);
      try {
        const rows = await listLiveMemberships();
        if (cancelled) return;
        setMemberships(rows);
        setLiveReady(rows.length > 0);
        if (rows[0]) {
          setSelectedMembershipKey(`${rows[0].member.id}`);
        }
      } finally {
        if (!cancelled) setAuthBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, initialSelection, liveMode, requirePasswordReentry]);

  const activeBranch =
    CLINIC_BRANCHES.find((b) => b.id === branchId) ?? CLINIC_BRANCHES[0];

  const chairsForBranch = useMemo(() => {
    if (liveMode && selectedMembershipKey) {
      const live = memberships.find((m) => m.member.id === selectedMembershipKey);
      if (live) {
        const branch = membershipToSession(live, chairId, clinicScale).branch;
        return OPERATORY_CHAIRS.filter((c) => branch.chairIds.includes(c.id));
      }
    }
    if (clinicScale === 'SINGLE') {
      return OPERATORY_CHAIRS.slice(0, singleChairCount);
    }
    return OPERATORY_CHAIRS.filter((c) => activeBranch.chairIds.includes(c.id));
  }, [
    clinicScale,
    activeBranch,
    singleChairCount,
    liveMode,
    selectedMembershipKey,
    memberships,
    chairId,
  ]);

  useEffect(() => {
    if (!chairsForBranch.some((c) => c.id === chairId) && chairsForBranch[0]) {
      setChairId(chairsForBranch[0].id);
    }
  }, [chairsForBranch, chairId]);

  if (!open) return null;

  const handleScaleChange = (scale: ClinicScale) => {
    setClinicScale(scale);
    if (scale === 'SINGLE') {
      setBranchId(CLINIC_BRANCHES[0].id);
      setSingleChairCount(1);
      setChairId(OPERATORY_CHAIRS[0].id);
    }
  };

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    const branch = CLINIC_BRANCHES.find((b) => b.id === id) ?? CLINIC_BRANCHES[0];
    if (!branch.chairIds.includes(chairId)) {
      setChairId(branch.chairIds[0]);
    }
  };

  const handleLiveAuth = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const result = await signInWithPassword(authEmail.trim(), authPassword);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      const rows = await listLiveMemberships();
      setMemberships(rows);
      setLiveReady(rows.length > 0);
      const preferredId = initialSelection.doctor.memberId;
      const pick =
        (preferredId && rows.find((r) => r.member.id === preferredId)) || rows[0];
      if (pick) {
        setSelectedMembershipKey(pick.member.id);
      } else {
        setAuthError(
          'Signed in, but no clinic membership found. Complete onboarding or claim your invite email.'
        );
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleConfirm = () => {
    if (liveMode) {
      if (!liveReady || !selectedMembershipKey) return;
      const live = memberships.find((m) => m.member.id === selectedMembershipKey);
      if (!live) return;
      onConfirm(membershipToSession(live, chairId, clinicScale));
      return;
    }

    const doctor = CLINIC_DOCTORS.find((d) => d.id === doctorId) ?? CLINIC_DOCTORS[0];
    const branchBase =
      clinicScale === 'SINGLE'
        ? CLINIC_BRANCHES[0]
        : CLINIC_BRANCHES.find((b) => b.id === branchId) ?? CLINIC_BRANCHES[0];

    const chairIds =
      clinicScale === 'SINGLE'
        ? OPERATORY_CHAIRS.slice(0, singleChairCount).map((c) => c.id)
        : branchBase.chairIds;

    const branch = { ...branchBase, chairIds };
    const allowedChairs = OPERATORY_CHAIRS.filter((c) => chairIds.includes(c.id));
    const chair =
      allowedChairs.find((c) => c.id === chairId) ?? allowedChairs[0] ?? OPERATORY_CHAIRS[0];
    onConfirm({
      doctor,
      branch,
      chair,
      clinicScale,
      clinicDbId: null,
      authUserId: null,
    });
  };

  const showDemoStaffPicker = !liveMode;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close doctor switcher backdrop"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-[authPop_160ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              {liveMode
                ? requirePasswordReentry
                  ? 'Unlock station'
                  : 'Clinic login'
                : 'Who is working today?'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {liveMode
                ? requirePasswordReentry
                  ? 'Re-enter your password to unlock this workstation'
                  : 'Sign in with your clinic credentials to enter workstation'
                : 'Select doctor profile to enter clinical workstation'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 bg-slate-50 max-h-[80vh] overflow-y-auto">
          {liveMode && (
            <section className="space-y-3">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Clinic staff login
                </h3>
              </div>
              {!liveReady && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-[11px] text-slate-600 space-y-1">
                    <span>Email</span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      autoComplete="username"
                    />
                  </label>
                  <label className="text-[11px] text-slate-600 space-y-1">
                    <span>Password</span>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                      autoComplete="current-password"
                    />
                  </label>
                </div>
              )}
              {authError && (
                <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
                  {authError}
                </p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                {!liveReady ? (
                  <>
                    <button
                      type="button"
                      disabled={authBusy || !authEmail || !authPassword}
                      onClick={() => void handleLiveAuth()}
                      className="tactile-btn text-xs font-semibold px-3 py-1.5 rounded-md bg-teal-600 text-white disabled:opacity-50"
                    >
                      {authBusy ? 'Working…' : 'Sign in'}
                    </button>
                    <p className="text-[11px] text-slate-500">
                      New account? Use clinic signup, not station unlock.
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void signOutLive().then(() => {
                        setLiveReady(false);
                        setMemberships([]);
                        setSelectedMembershipKey(null);
                      });
                    }}
                    className="tactile-btn text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 bg-white"
                  >
                    Sign out account
                  </button>
                )}
              </div>

              {liveReady && memberships.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {memberships.map((row) => {
                    const selected = selectedMembershipKey === row.member.id;
                    return (
                      <button
                        key={row.member.id}
                        type="button"
                        onClick={() => setSelectedMembershipKey(row.member.id)}
                        className={`tactile-btn text-left p-3 rounded-lg border transition-all ${
                          selected
                            ? 'bg-white border-teal-500 ring-2 ring-teal-500/30'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {row.member.display_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {row.clinic.name} · {row.clinic.branch_code} · {row.member.role}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <div className="flex gap-2.5 p-3 rounded-lg border border-teal-100 bg-teal-50/70 text-[11px] text-teal-900 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            <div>
              <strong>How this works:</strong> Each tablet logs in as one doctor or front desk.
              Doctors open Treat (chart, Rx, consent). Front desk books, seats patients, and runs
              Clinic/Patients — they cannot chart or prescribe. Chairs are shared: many doctors
              and procedures rotate through the same chair across the day.
            </div>
          </div>

          {showDemoStaffPicker && (
            <>
          {/* Clinic size */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
              Your clinic size
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleScaleChange('SINGLE')}
                className={`tactile-btn text-left p-3 rounded-lg border transition-all ${
                  clinicScale === 'SINGLE'
                    ? 'bg-white border-teal-500 ring-2 ring-teal-500/25'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Single clinic</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  One address · choose how many chairs you run
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleScaleChange('MULTI')}
                className={`tactile-btn text-left p-3 rounded-lg border transition-all ${
                  clinicScale === 'MULTI'
                    ? 'bg-white border-teal-500 ring-2 ring-teal-500/25'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Multi-branch</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Several locations · each with its own chairs
                </div>
              </button>
            </div>
          </section>

          {/* Doctors */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                1. Who is on this screen?
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CLINIC_DOCTORS.map((doc) => {
                const selected = doctorId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setDoctorId(doc.id)}
                    className={`tactile-btn text-left p-3 rounded-lg border transition-all ${
                      selected
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {doc.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{doc.specialty}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {doc.registrationLabel}
                        </div>
                      </div>
                      {selected && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Branches — only when multi */}
          {clinicScale === 'MULTI' && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Which branch are you at today?
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CLINIC_BRANCHES.map((branch) => {
                  const selected = branchId === branch.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleBranchChange(branch.id)}
                      className={`tactile-btn text-left p-3 rounded-lg border transition-all ${
                        selected
                          ? 'bg-white border-teal-500 ring-2 ring-teal-500/25'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{branch.name}</div>
                      <div className="text-[10px] font-mono text-teal-700 mt-0.5">{branch.code}</div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-snug">{branch.cityLine}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
            </>
          )}
        </div>

        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {liveMode && !liveReady
              ? 'Sign in with a clinic membership to start a live session.'
              : 'Cancel anytime — defaults stay as last session.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={liveMode && !liveReady}
              className="tactile-btn text-xs font-semibold px-4 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Start session
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes authPop {
          from { transform: translateY(8px) scale(0.98); opacity: 0.7; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
