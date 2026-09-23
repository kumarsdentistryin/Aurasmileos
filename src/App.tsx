import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_PATIENTS } from './data/mockPatients';
import { ClinicalCaseSheet, Patient, ToothId, ToothState } from './domain/types';
import {
  MainWorkspaceTab,
  Navbar,
  OperatorySubTab,
  OpsSubTab,
} from './components/Header/Navbar';
import { PatientBanner } from './components/Patient/PatientBanner';
import { PatientHistoryTimeline } from './components/Patient/PatientHistoryTimeline';
import { Odontogram } from './components/Odontogram/Odontogram';
import { CaseSheet } from './components/CaseSheet/CaseSheet';
import { LabManager } from './components/Lab/LabManager';
import { ConsultantLedger } from './components/Consultants/ConsultantLedger';
import { ConsultantSchedulePanel } from './components/Consultants/ConsultantSchedulePanel';
import { DuesTracker } from './components/Billing/DuesTracker';
import { InventoryManager } from './components/Inventory/InventoryManager';
import { ImagingStudio } from './components/Imaging/ImagingStudio';
import { PrescriptionPad } from './components/Prescription/PrescriptionPad';
import { ConsentPad } from './components/Consent/ConsentPad';
import { ClinicOperationsDashboard } from './components/Operations/ClinicOperationsDashboard';
import { PatientDirectory } from './components/CRM/PatientDirectory';
import {
  ClinicDoctorOption,
  ClinicSessionSelection,
  DEFAULT_CLINIC_SESSION,
  DoctorAuthModal,
} from './components/Auth/DoctorAuthModal';
import { StaffLockScreen } from './components/Auth/StaffLockScreen';
import { settings } from './lib/settings';
import { ClinicBranding, getClinicBranding } from './lib/clinicBranding';
import {
  appendTreatmentAction,
  clearTreatmentSession,
  latestCaseSheetForPatient,
  loadTreatmentSession,
  persistCaseSheet,
  saveTreatmentSession,
} from './lib/clinicalPersistence';
import {
  buildSessionFromStation,
  clearClinicSession,
  isDemoMode,
  isStaffLocked,
  loadClinicSession,
  loadStationContext,
  saveClinicSession,
  setDemoMode,
  setStaffLocked,
} from './lib/clinicSession';
import {
  collectDirtyPatients,
  filterPatientsForViewer,
  filterQueueForViewer,
  fingerprintPatient,
  seedPatientFingerprints,
  viewerSeesFullRoster,
} from './lib/doctorScope';
import {
  HomeQueueAppointment,
  AuraSmileHomeDashboard,
} from './components/Home/AuraSmileHomeDashboard';
import { TreatmentPlanPad } from './components/TreatmentPlan/TreatmentPlanPad';
import { TreatmentPlanLine, createPlanLineFromMacro } from './domain/treatmentPlan';
import { listAppointmentsForClinicToday, upsertAppointmentsBatch } from './lib/appointmentRepository';
import {
  ClinicStaffOption,
  canUnlockAsStaff,
  getAuthSessionUserId,
  listClinicStaff,
  listDemoStaff,
  listLiveMemberships,
  membershipToSession,
  signOutLive,
  treatingStaff,
} from './lib/clinicAuth';
import {
  listPatientsForClinic,
  updatePatientNextAppointment,
  updatePatientTreatmentPlanLines,
  upsertPatient,
} from './lib/patientRepository';
import { isSupabaseConfigured } from './lib/supabase';
import { fetchClinicBranding, loadLocalBranding } from './lib/brandingRepository';
import { ClinicBrandingSettings } from './components/Settings/ClinicBrandingSettings';
import { StaffAdminPanel } from './components/Settings/StaffAdminPanel';
import { VisitHandoffPad } from './components/Billing/VisitHandoffPad';
import { WhatsAppDispatcher } from './components/WhatsApp/WhatsAppDispatcher';
import { ProfitabilityCalculator } from './components/Financials/ProfitabilityCalculator';
import { trackOnboardingEvent } from './lib/funnelTracking';
import {
  mergePatientPlanLines,
  resolveTreatmentPlanLines,
  saveTreatmentPlanLines,
} from './lib/treatmentPlanPersistence';
import {
  OPEN_TRIAL_ENTITLEMENT,
  canWriteClinicData,
  daysLeftInTrial,
  ClinicPlan,
} from './lib/entitlements';
import { updateClinicSubscription } from './lib/clinicAuth';
import { TrialBanner } from './components/TrialBanner';
import { ClinicSubscriptionModal } from './components/Billing/ClinicSubscriptionModal';

function newEntityId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Clinical workstation — only reached via /app (demo CTA or after auth/onboarding). */
export const WorkstationApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeMainTab, setActiveMainTab] = useState<MainWorkspaceTab>('home');
  const [activeOperatorySubTab, setActiveOperatorySubTab] =
    useState<OperatorySubTab>('odontogram');
  const [activeOpsSubTab, setActiveOpsSubTab] = useState<OpsSubTab>('whatsapp');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<HomeQueueAppointment[] | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string>('');
  const [treatmentPlanLines, setTreatmentPlanLines] = useState<TreatmentPlanLine[]>([]);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [branding, setBranding] = useState<ClinicBranding>(() =>
    loadLocalBranding(DEFAULT_CLINIC_SESSION.branch.id) ??
    getClinicBranding(DEFAULT_CLINIC_SESSION.branch.id)
  );
  const [rosterDoctors, setRosterDoctors] = useState<ClinicStaffOption[]>(() =>
    treatingStaff(listDemoStaff())
  );

  const [currentDoctor, setCurrentDoctor] =
    useState<ClinicSessionSelection>(DEFAULT_CLINIC_SESSION);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => isStaffLocked());
  const [bootReady, setBootReady] = useState(false);
  const [clinicNameHint, setClinicNameHint] = useState<string | undefined>();
  const [unlockHint, setUnlockHint] = useState<string | null>(null);
  /** Front desk Collect → Bill handoff for any patient */
  const [deskCollectPatientId, setDeskCollectPatientId] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  const handlePlanActivated = async (newPlan: ClinicPlan, paymentRef: string) => {
    // 1. Optimistically update local currentDoctor entitlement
    setCurrentDoctor((prev) => ({
      ...prev,
      entitlement: {
        ...clinicEntitlement,
        plan: newPlan,
        subscriptionStatus: 'active',
      },
    }));
    setSyncNote(`Subscription updated to ${newPlan.toUpperCase()} (Ref: ${paymentRef})`);

    // 2. Persist to Supabase if live clinic
    if (isLiveClinic && liveClinicId) {
      try {
        await updateClinicSubscription(liveClinicId, {
          plan: newPlan,
          subscription_status: 'active',
        });
      } catch (e) {
        console.warn('[AuraSmile] could not persist subscription update to Supabase:', e);
      }
    }
  };

  const patientsRef = useRef(patients);
  patientsRef.current = patients;
  const persistTimer = useRef<number | null>(null);
  const planPersistTimer = useRef<number | null>(null);
  const planHydratedFor = useRef<string | null>(null);
  const hydrateKey = useRef<string | null>(null);
  const persistedFingerprints = useRef<Map<string, string>>(new Map());

  const liveClinicId = currentDoctor.clinicDbId ?? loadStationContext()?.clinicDbId ?? null;
  const demo = isDemoMode();
  const isLiveClinic = Boolean(liveClinicId && isSupabaseConfigured() && !demo);
  const planClinicKey = liveClinicId ?? (demo ? 'demo' : `branch:${currentDoctor.branch.id}`);
  // Demo never soft-locks; missing billing columns → open trial (writable).
  const clinicEntitlement = currentDoctor.entitlement ?? OPEN_TRIAL_ENTITLEMENT;
  const clinicWritable = !isLiveClinic || canWriteClinicData(clinicEntitlement);
  const trialDaysLeft = daysLeftInTrial(clinicEntitlement.trialEndsAt);
  const showTrialEndingBanner =
    isLiveClinic &&
    clinicWritable &&
    clinicEntitlement.subscriptionStatus === 'trialing' &&
    trialDaysLeft !== null &&
    trialDaysLeft <= 7;

  const viewerMemberId = currentDoctor.doctor.memberId ?? null;
  const isFrontDesk = currentDoctor.doctor.role === 'FRONT_DESK';
  const isDoctor = currentDoctor.doctor.role === 'DOCTOR';
  /** Owner-dentist (common in India) keeps Treat + Clinic ops */
  const isClinicOwner = currentDoctor.doctor.memberRole === 'OWNER';
  const canAccessClinicOps = isFrontDesk || isClinicOwner;

  const visiblePatients = useMemo(
    () =>
      filterPatientsForViewer(
        patients,
        currentDoctor.doctor.displayName,
        currentDoctor.doctor.role,
        viewerMemberId,
        currentDoctor.doctor.memberRole
      ),
    [
      patients,
      currentDoctor.doctor.displayName,
      currentDoctor.doctor.role,
      viewerMemberId,
      currentDoctor.doctor.memberRole,
    ]
  );
  const treatPatient = visiblePatients.find((p) => p.id === currentPatientId) ?? null;
  const clinicBranchLabel = `${currentDoctor.branch.name} (${currentDoctor.branch.code})`;

  useEffect(() => {
    if (isFrontDesk) return;
    if (visiblePatients.length === 0) {
      if (currentPatientId) setCurrentPatientId('');
      return;
    }
    if (!visiblePatients.some((p) => p.id === currentPatientId)) {
      setCurrentPatientId(visiblePatients[0].id);
    }
  }, [currentDoctor.doctor.id, isFrontDesk, visiblePatients, currentPatientId]);

  // Load durable treatment plan lines when the active patient changes (DB JSON or localStorage).
  useEffect(() => {
    if (!currentPatientId) {
      planHydratedFor.current = null;
      return;
    }
    const patient = patients.find((p) => p.id === currentPatientId);
    const hydrateToken = `${planClinicKey}:${currentPatientId}:${
      patient ? 'hit' : patients.length === 0 ? 'empty' : 'miss'
    }:${patient?.treatmentPlanLines === undefined ? 'nocol' : 'col'}`;
    if (planHydratedFor.current === hydrateToken) return;
    if (!patient && isLiveClinic && patients.length === 0) return;
    if (!patient && patients.length > 0) return;
    planHydratedFor.current = hydrateToken;
    const own = resolveTreatmentPlanLines(
      planClinicKey,
      currentPatientId,
      patient?.treatmentPlanLines
    );
    setTreatmentPlanLines((prev) => mergePatientPlanLines(prev, currentPatientId, own));
  }, [currentPatientId, planClinicKey, patients, isLiveClinic]);

  useEffect(() => {
    if (isFrontDesk && activeMainTab === 'operatory') {
      setActiveMainTab('home');
    }
  }, [isFrontDesk, activeMainTab]);

  // Boot: demo CTA, live membership, or redirect home — never auto Vikram unlocked
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const wantsDemo = searchParams.get('demo') === '1';
      if (wantsDemo) {
        const wantOperatory =
          searchParams.get('tab') === 'operatory' ||
          searchParams.get('tab') === 'treat' ||
          !searchParams.get('tab');
        setDemoMode(true);
        setStaffLocked(false);
        saveClinicSession(DEFAULT_CLINIC_SESSION);
        setCurrentDoctor(DEFAULT_CLINIC_SESSION);
        setPatients(MOCK_PATIENTS);
        setAppointments(null);
        const firstPatientId = MOCK_PATIENTS[0]?.id ?? '';
        setCurrentPatientId(firstPatientId);
        setRosterDoctors(treatingStaff(listDemoStaff()));
        setIsLocked(false);
        if (wantOperatory) {
          setActiveMainTab('operatory');
          setActiveOperatorySubTab('odontogram');
          if (firstPatientId) {
            const now = new Date().toISOString();
            saveTreatmentSession({
              patientId: firstPatientId,
              doctorId: DEFAULT_CLINIC_SESSION.doctor.id,
              branchId: DEFAULT_CLINIC_SESSION.branch.id,
              chairId: DEFAULT_CLINIC_SESSION.chair.id,
              operatorySubTab: 'odontogram',
              startedAtIso: now,
              lastActionAtIso: now,
              lastActionLabel: 'Demo workstation',
              actions: [{ at: now, label: 'Demo workstation' }],
            });
          }
        }
        void trackOnboardingEvent({ step: 'demo_opened' });
        if (!cancelled) setBootReady(true);
        navigate('/app', { replace: true });
        return;
      }

      const locked = isStaffLocked();
      setIsLocked(locked);

      let clinic = loadClinicSession();
      const station = loadStationContext();

      if (isSupabaseConfigured() && !isDemoMode()) {
        try {
          const memberships = await listLiveMemberships();
          if (!cancelled && memberships[0]) {
            const restored = membershipToSession(
              memberships[0],
              clinic?.chair.id,
              clinic?.clinicScale ?? 'SINGLE'
            );
            // Keep station identity only if it is still this auth user's membership
            const keepMemberId = clinic?.doctor?.memberId;
            if (
              clinic &&
              keepMemberId &&
              clinic.clinicDbId === restored.clinicDbId &&
              memberships.some((m) => m.member.id === keepMemberId)
            ) {
              setCurrentDoctor({
                ...clinic,
                entitlement: restored.entitlement,
              });
            } else {
              clinic = restored;
              setCurrentDoctor(restored);
              if (!locked) saveClinicSession(restored);
            }
            setClinicNameHint(memberships[0].clinic.name);
            if (!memberships[0].clinic.onboarding_completed_at) {
              navigate('/onboarding');
              return;
            }
            const staff = await listClinicStaff(memberships[0].clinic.id);
            if (!cancelled) setRosterDoctors(treatingStaff(staff));
          } else if (clinic?.clinicDbId || station?.clinicDbId) {
            // Stale live session without auth — send to login, not demo chart
            if (!cancelled) {
              setStaffLocked(true);
              navigate('/login');
              return;
            }
          } else if (!clinic && !station?.clinicDbId) {
            navigate('/');
            return;
          } else if (clinic) {
            setCurrentDoctor(clinic);
          }
        } catch {
          if (clinic && !cancelled) setCurrentDoctor(clinic);
        }
      } else if (isDemoMode()) {
        setPatients(MOCK_PATIENTS);
        setRosterDoctors(treatingStaff(listDemoStaff()));
        if (clinic) setCurrentDoctor(clinic);
      } else if (clinic) {
        setCurrentDoctor(clinic);
      } else {
        // No session and not demo — sell home
        navigate('/');
        return;
      }

      if (!locked) {
        const treatment = loadTreatmentSession();
        const role = clinic?.doctor.role ?? currentDoctor.doctor.role;
        if (role === 'DOCTOR' && treatment) {
          setCurrentPatientId(treatment.patientId);
          setActiveMainTab('operatory');
          if (
            treatment.operatorySubTab === 'odontogram' ||
            treatment.operatorySubTab === 'plan' ||
            treatment.operatorySubTab === 'casesheet' ||
            treatment.operatorySubTab === 'history' ||
            treatment.operatorySubTab === 'imaging' ||
            treatment.operatorySubTab === 'prescriptions' ||
            treatment.operatorySubTab === 'consent' ||
            treatment.operatorySubTab === 'billing'
          ) {
            setActiveOperatorySubTab(treatment.operatorySubTab);
          }
        }
      }

      if (!cancelled) setBootReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate patients + today's appointments when live clinic / viewer identity is known
  useEffect(() => {
    if (!liveClinicId || !isSupabaseConfigured() || demo) {
      if (demo && hydrateKey.current !== 'demo') {
        hydrateKey.current = 'demo';
        setPatients(MOCK_PATIENTS);
        setAppointments(null);
        setCurrentPatientId((prev) => prev || MOCK_PATIENTS[0]?.id || '');
        setRosterDoctors(treatingStaff(listDemoStaff()));
        persistedFingerprints.current = seedPatientFingerprints(MOCK_PATIENTS);
      }
      return;
    }

    const role = currentDoctor.doctor.role;
    const displayName = currentDoctor.doctor.displayName;
    const memberId = viewerMemberId;
    const scopeKey = `${liveClinicId}:${role}:${memberId ?? ''}`;
    if (hydrateKey.current === scopeKey) return;
    hydrateKey.current = scopeKey;

    let cancelled = false;
    (async () => {
      setSyncNote('Loading clinic records…');
      try {
        const memberRole = currentDoctor.doctor.memberRole;
        const doctorMemberFilter =
          !viewerSeesFullRoster(role, memberRole) && memberId ? memberId : undefined;
        const [dbPatients, dbAppts, liveBranding, staff] = await Promise.all([
          listPatientsForClinic(liveClinicId, {
            assignedMemberId: doctorMemberFilter,
          }),
          listAppointmentsForClinicToday(liveClinicId, {
            assignedMemberId: doctorMemberFilter,
          }),
          fetchClinicBranding(liveClinicId, currentDoctor.branch.id),
          listClinicStaff(liveClinicId),
        ]);
        if (cancelled) return;
        // Client filter covers name fallback when member ids are sparse / legacy rows
        const scopedPatients = filterPatientsForViewer(
          dbPatients,
          displayName,
          role,
          memberId,
          memberRole
        );
        const scopedAppts = filterQueueForViewer(
          dbAppts,
          displayName,
          role,
          memberId,
          memberRole
        );
        setPatients(scopedPatients);
        setAppointments(scopedAppts);
        setCurrentPatientId('');
        setRosterDoctors(treatingStaff(staff));
        persistedFingerprints.current = seedPatientFingerprints(scopedPatients);
        if (liveBranding) setBranding(liveBranding);
        setSyncNote(
          scopedPatients.length === 0
            ? 'Live clinic ready — no patients yet. New walk-ins sync to clinical cloud.'
            : `Synced ${scopedPatients.length} patients · ${scopedAppts.length} appointments today`
        );
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Sync failed';
        setSyncNote(`Live sync error: ${message}`);
        setPatients([]);
        setAppointments([]);
        persistedFingerprints.current = new Map();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    liveClinicId,
    demo,
    currentDoctor.branch.id,
    currentDoctor.doctor.role,
    currentDoctor.doctor.displayName,
    viewerMemberId,
  ]);

  useEffect(() => {
    if (liveClinicId && !demo) return;
    const local =
      loadLocalBranding(currentDoctor.branch.id) ??
      getClinicBranding(currentDoctor.branch.id);
    setBranding(local);
  }, [currentDoctor.branch.id, liveClinicId, demo]);

  useEffect(() => {
    if (!liveClinicId || !isSupabaseConfigured() || isLocked || demo) return;

    if (persistTimer.current) {
      window.clearTimeout(persistTimer.current);
    }

    persistTimer.current = window.setTimeout(() => {
      const snapshot = patientsRef.current;
      const visible = filterPatientsForViewer(
        snapshot,
        currentDoctor.doctor.displayName,
        currentDoctor.doctor.role,
        viewerMemberId
      );
      const dirty = collectDirtyPatients(visible, persistedFingerprints.current);
      if (dirty.length === 0) return;
      if (!clinicWritable) return;

      void (async () => {
        for (const patient of dirty) {
          const result = await upsertPatient(liveClinicId, patient);
          if (!result.ok) {
            setSyncNote(`Patient save issue: ${result.error}`);
            return;
          }
          persistedFingerprints.current.set(patient.id, fingerprintPatient(patient));
        }
        setSyncNote(
          `Saved ${dirty.length} patient record(s) · ${new Date().toLocaleTimeString()}`
        );
      })();
    }, 900);

    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [
    patients,
    liveClinicId,
    isLocked,
    demo,
    clinicWritable,
    currentDoctor.doctor.displayName,
    currentDoctor.doctor.role,
    viewerMemberId,
  ]);

  const handleAppointmentsChange = (next: HomeQueueAppointment[]) => {
    setAppointments(next);
    if (!liveClinicId || !isSupabaseConfigured() || demo) return;
    void upsertAppointmentsBatch(liveClinicId, next).then((result) => {
      if (!result.ok) setSyncNote(`Appointment save issue: ${result.error}`);
    });
  };

  const flashReadOnly = () => {
    setSyncNote('Pilot ended — read-only. Contact AuraSmile to continue.');
  };

  const handleUpdateToothState = (toothId: ToothId, newState: ToothState) => {
    if (!treatPatient) return;
    if (!clinicWritable) {
      flashReadOnly();
      return;
    }
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== treatPatient.id) return p;
        return {
          ...p,
          dentalChart: {
            ...p.dentalChart,
            [toothId]: newState,
          },
        };
      })
    );
  };

  const handleResetChart = () => {
    if (!treatPatient) return;
    if (!clinicWritable) {
      flashReadOnly();
      return;
    }
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== treatPatient.id) return p;
        return {
          ...p,
          dentalChart: {},
        };
      })
    );
  };

  const handleTreatmentPlanLinesChange = (next: TreatmentPlanLine[]) => {
    if (!clinicWritable) {
      flashReadOnly();
      return;
    }
    setTreatmentPlanLines(next);
    if (!treatPatient) return;
    const patientId = treatPatient.id;
    const own = next.filter((l) => l.patientId === patientId);
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, treatmentPlanLines: own } : p))
    );
    saveTreatmentPlanLines(planClinicKey, patientId, own);
    if (planPersistTimer.current) window.clearTimeout(planPersistTimer.current);
    planPersistTimer.current = window.setTimeout(() => {
      if (!liveClinicId || !isSupabaseConfigured() || demo) return;
      void updatePatientTreatmentPlanLines(patientId, own);
    }, 500);
  };

  const handleChartMacroToPlan = (
    macro: {
      id: string;
      label: string;
      typicalFeePaise: number;
      minutes: number;
    },
    toothId: ToothId
  ) => {
    if (!treatPatient || !clinicWritable) return;
    const dup = treatmentPlanLines.some(
      (l) =>
        l.patientId === treatPatient.id &&
        l.toothId === toothId &&
        l.procedureId === macro.id &&
        l.acceptance === 'PROPOSED'
    );
    if (dup) return;
    const line = createPlanLineFromMacro({
      patientId: treatPatient.id,
      toothId,
      macro,
      attendingDoctorName: currentDoctor.doctor.displayName,
    });
    handleTreatmentPlanLinesChange([...treatmentPlanLines, line]);
    appendTreatmentAction(`Plan line from chart: ${macro.label} #${toothId}`);
  };

  const handleSaveCaseSheet = (sheet: ClinicalCaseSheet) => {
    if (!clinicWritable) {
      flashReadOnly();
      return;
    }
    void persistCaseSheet(sheet, isLiveClinic ? liveClinicId : null).then((result) => {
      appendTreatmentAction(`Saved notes · tooth #${sheet.targetToothId}`);
      setSyncNote(
        result.storage === 'local+supabase'
          ? 'Case notes saved locally + Supabase.'
          : 'Case notes saved on this device.'
      );
    });
  };

  const deskCollectPatient =
    deskCollectPatientId
      ? patients.find((p) => p.id === deskCollectPatientId) ?? null
      : null;

  const handleEnsurePatient = (draft: {
    idHint: string | null;
    fullName: string;
    age: number;
    gender: 'M' | 'F' | 'OTHER';
    phone: string;
    chiefComplaint: string;
    assignedDoctor: string;
    assignedMemberId?: string | null;
    chairLabel: string;
    /** Front desk must confirm before reusing a chart matched only by phone */
    confirmReuse?: boolean;
  }): string => {
    if (!clinicWritable) {
      flashReadOnly();
      return draft.idHint ?? '';
    }
    if (draft.idHint) {
      const existing = patients.find((p) => p.id === draft.idHint);
      if (existing) {
        setPatients((prev) =>
          prev.map((p) =>
            p.id === existing.id
              ? {
                  ...p,
                  assignedDoctorName: draft.assignedDoctor,
                  assignedMemberId: draft.assignedMemberId ?? p.assignedMemberId,
                  primaryChair: draft.chairLabel,
                }
              : p
          )
        );
        return existing.id;
      }
    }

    const byPhone = patients.find(
      (p) => p.phoneNumber.replace(/[^0-9]/g, '') === draft.phone.replace(/[^0-9]/g, '')
    );
    if (byPhone && draft.confirmReuse) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === byPhone.id
            ? {
                ...p,
                assignedDoctorName: draft.assignedDoctor,
                assignedMemberId: draft.assignedMemberId ?? p.assignedMemberId,
                primaryChair: draft.chairLabel,
              }
            : p
        )
      );
      return byPhone.id;
    }

    const newId = isLiveClinic ? newEntityId() : `pat-walkin-${Date.now()}`;
    const newPatient: Patient = {
      id: newId,
      mrn: `AS-${currentDoctor.branch.code}-WALK-${String(patients.length + 1).padStart(4, '0')}`,
      fullName: draft.fullName,
      age: draft.age,
      gender: draft.gender,
      phoneNumber: draft.phone,
      addressCity: currentDoctor.branch.cityLine,
      bloodGroup: 'Unknown',
      assignedDoctorName: draft.assignedDoctor,
      assignedMemberId: draft.assignedMemberId ?? null,
      primaryChair: draft.chairLabel,
      lastVisitDate: new Date().toISOString().split('T')[0],
      nextAppointmentDate: 'Today',
      medicalAlerts: [],
      dentalChart: {},
      treatmentPlanLines: [],
    };

    setPatients((prev) => [...prev, newPatient]);
    return newId;
  };

  const handleCallToChair = (patientId: string) => {
    if (currentDoctor.doctor.role !== 'DOCTOR') return;
    setCurrentPatientId(patientId);
    setActiveMainTab('operatory');
    setActiveOperatorySubTab('odontogram');
    const now = new Date().toISOString();
    saveTreatmentSession({
      patientId,
      doctorId: currentDoctor.doctor.id,
      branchId: currentDoctor.branch.id,
      chairId: currentDoctor.chair.id,
      operatorySubTab: 'odontogram',
      startedAtIso: now,
      lastActionAtIso: now,
      lastActionLabel: 'Started treatment',
      actions: [{ at: now, label: 'Started treatment' }],
    });
  };

  const handleOpenBilling = (patientId: string) => {
    setCurrentPatientId(patientId);
    setActiveMainTab('operatory');
    setActiveOperatorySubTab('billing');
  };

  const handleOpenPrescription = (patientId: string) => {
    setCurrentPatientId(patientId);
    setActiveMainTab('operatory');
    setActiveOperatorySubTab('prescriptions');
  };

  const handleOperatorySubTabChange = (tab: OperatorySubTab) => {
    setActiveOperatorySubTab(tab);
    appendTreatmentAction(`Opened ${tab}`);
    const session = loadTreatmentSession();
    if (session && session.patientId === currentPatientId) {
      saveTreatmentSession({
        ...session,
        operatorySubTab: tab,
        lastActionAtIso: new Date().toISOString(),
        lastActionLabel: `Opened ${tab}`,
      });
    }
  };

  const handleScheduleFollowUp = (patientId: string, nextDate: string) => {
    if (!clinicWritable) {
      flashReadOnly();
      return;
    }
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, nextAppointmentDate: nextDate } : p
      )
    );
    appendTreatmentAction(`Follow-up set · ${nextDate}`);
    setSyncNote(`Follow-up saved for ${nextDate}.`);
    if (liveClinicId && isSupabaseConfigured() && !demo) {
      void updatePatientNextAppointment(patientId, nextDate);
    }
  };

  const handleMainTabChange = (tab: MainWorkspaceTab) => {
    // Associate doctors: no Patients / Clinic. Owner-doctors may open Clinic ops.
    if (isDoctor && tab === 'crm') {
      setAccessNotice(
        'Patients directory is front-desk only. Ask reception to book or seat, or unlock as desk.'
      );
      setActiveMainTab('home');
      return;
    }
    if (isDoctor && tab === 'operations' && !isClinicOwner) {
      setAccessNotice(null);
      setActiveMainTab('operations');
      return;
    }
    if (isFrontDesk && tab === 'operatory') {
      setAccessNotice(
        'Treat (chart, Rx, consent) is dentist-only. Seat the patient to a doctor — they open Treat on their tablet.'
      );
      setActiveMainTab('home');
      return;
    }
    setAccessNotice(null);
    setActiveMainTab(tab);
  };

  const handleConfirmSession = (selection: ClinicSessionSelection) => {
    hydrateKey.current = null;
    setUnlockHint(null);
    setCurrentDoctor(selection);
    saveClinicSession(selection);
    setIsLocked(false);
    setStaffLocked(false);
    setIsAuthModalOpen(false);
    if (selection.clinicDbId) setDemoMode(false);

    const treatment = loadTreatmentSession();
    if (
      selection.doctor.role === 'DOCTOR' &&
      treatment &&
      treatment.doctorId === selection.doctor.id
    ) {
      setCurrentPatientId(treatment.patientId);
      setActiveMainTab('operatory');
      if (
        treatment.operatorySubTab === 'odontogram' ||
        treatment.operatorySubTab === 'plan' ||
        treatment.operatorySubTab === 'casesheet' ||
        treatment.operatorySubTab === 'history' ||
        treatment.operatorySubTab === 'imaging' ||
        treatment.operatorySubTab === 'prescriptions' ||
        treatment.operatorySubTab === 'consent' ||
        treatment.operatorySubTab === 'billing'
      ) {
        setActiveOperatorySubTab(treatment.operatorySubTab);
      }
    } else {
      if (treatment && treatment.doctorId !== selection.doctor.id) {
        clearTreatmentSession();
      }
      setActiveMainTab('home');
      setCurrentPatientId('');
    }
  };

  const handleOpenSwitcher = () => {
    clearTreatmentSession();
    setStaffLocked(true);
    setIsLocked(true);
    setIsAuthModalOpen(false);
  };

  const handleLock = () => {
    setStaffLocked(true);
    setIsLocked(true);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    clearTreatmentSession();
    clearClinicSession();
    void signOutLive();
    hydrateKey.current = null;
    setDemoMode(false);
    setUnlockHint(null);
    setPatients([]);
    setAppointments(null);
    setCurrentDoctor(DEFAULT_CLINIC_SESSION);
    setStaffLocked(true);
    setIsLocked(true);
    setActiveMainTab('home');
    setIsAuthModalOpen(false);
    navigate('/');
  };

  const handleUnlockRequest = (doctor: ClinicDoctorOption) => {
    void (async () => {
      const clinicId = liveClinicId;
      if (clinicId && !demo) {
        const staff = doctor as ClinicStaffOption;
        const [authUserId, memberships] = await Promise.all([
          getAuthSessionUserId(),
          listLiveMemberships(),
        ]);
        const verdict = canUnlockAsStaff(staff, authUserId, memberships, clinicId);

        if (verdict === 'ok') {
          const match = memberships.find((m) => m.member.id === staff.memberId);
          // Confirm only from server membership for this auth user — never forged roster pick
          if (
            !match ||
            !authUserId ||
            (match.member.user_id && match.member.user_id !== authUserId)
          ) {
            setUnlockHint(
              'You can only unlock as your own roster membership. Use Staff Admin (owner) to manage other seats.'
            );
            setIsAuthModalOpen(true);
            return;
          }
          // Always re-enter password on live unlock — never silent unlock from existing session
          setCurrentDoctor(membershipToSession(match, currentDoctor.chair.id));
          setUnlockHint('Enter your password to unlock this station.');
          setIsAuthModalOpen(true);
          return;
        }

        if (verdict === 'claim_invite') {
          setUnlockHint(
            'This roster seat is unclaimed. Sign up or sign in with the invite email to claim it — you cannot unlock as someone else.'
          );
          setIsAuthModalOpen(true);
          return;
        }

        if (verdict === 'auth_required') {
          setUnlockHint('Sign in with your clinic account to unlock this station.');
          setIsAuthModalOpen(true);
          return;
        }

        setUnlockHint(
          'You can only unlock as your own roster membership. Use Staff Admin (owner) to manage other seats.'
        );
        setIsAuthModalOpen(true);
        return;
      }

      setUnlockHint(null);
      const next = buildSessionFromStation(doctor);
      setCurrentDoctor(next);
      setIsAuthModalOpen(true);
    })();
  };

  if (!bootReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Loading clinic…
      </div>
    );
  }

  if (isLocked) {
    return (
      <>
        <StaffLockScreen
          onUnlockRequest={handleUnlockRequest}
          clinicDbId={liveClinicId}
          clinicNameHint={clinicNameHint}
          unlockHint={unlockHint}
        />
        <DoctorAuthModal
          open={isAuthModalOpen}
          initialSelection={currentDoctor}
          onClose={() => setIsAuthModalOpen(false)}
          onConfirm={handleConfirmSession}
          requirePasswordReentry={!demo}
        />
      </>
    );
  }

  const emptyTreat =
    isDoctor && activeMainTab === 'operatory' && visiblePatients.length === 0;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col font-sans text-slate-900">
      <Navbar
        activeMainTab={activeMainTab}
        onMainTabChange={handleMainTabChange}
        activeOperatorySubTab={activeOperatorySubTab}
        onOperatorySubTabChange={handleOperatorySubTabChange}
        activeOpsSubTab={activeOpsSubTab}
        onOpsSubTabChange={(sub) => {
          if (sub === 'subscription') {
            setIsSubscriptionModalOpen(true);
          } else {
            setActiveOpsSubTab(sub);
          }
        }}
        session={currentDoctor}
        branding={branding}
        onOpenSwitcher={handleOpenSwitcher}
        onLock={handleLock}
        onLogout={handleLogout}
        labelMockAsDemo={demo}
        isDemo={demo}
        entitlement={clinicEntitlement}
        onOpenSubscription={isClinicOwner ? () => setIsSubscriptionModalOpen(true) : undefined}
      />

      {isLiveClinic && !clinicWritable && (
        <TrialBanner
          mode="expired"
          onUpgrade={isClinicOwner ? () => setIsSubscriptionModalOpen(true) : undefined}
        />
      )}
      {showTrialEndingBanner && (
        <TrialBanner
          mode="ending"
          daysLeft={trialDaysLeft}
          onUpgrade={isClinicOwner ? () => setIsSubscriptionModalOpen(true) : undefined}
        />
      )}

      {isDoctor && activeMainTab === 'operatory' && visiblePatients.length > 0 && treatPatient && (
        <PatientBanner
          currentPatient={treatPatient}
          allPatients={visiblePatients}
          onSelectPatient={(p) => setCurrentPatientId(p.id)}
        />
      )}

      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-4 ${
          activeMainTab === 'operatory' ? 'py-3' : 'py-5'
        }`}
      >
        <div
          key={`${activeMainTab}-${activeOpsSubTab}-${currentPatientId ?? 'none'}`}
          className={activeMainTab === 'operatory' ? undefined : 'workspace-panel'}
        >
        {activeMainTab === 'home' && (
          <>
            {accessNotice && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="font-bold">Access restricted</strong>
                    <p className="mt-1 leading-relaxed">{accessNotice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccessNotice(null)}
                    className="tactile-btn shrink-0 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          <AuraSmileHomeDashboard
            clinicBranchLabel={clinicBranchLabel}
            clinicBrandName={branding.legalName}
            clinicDbId={liveClinicId}
            activeDoctorName={currentDoctor.doctor.displayName}
            activeMemberId={viewerMemberId}
            viewerRole={currentDoctor.doctor.role}
            isClinicOwner={isClinicOwner}
            rosterDoctors={rosterDoctors}
            availableChairs={currentDoctor.branch.chairIds}
            upcomingPatients={visiblePatients}
            appointments={appointments ?? undefined}
            onAppointmentsChange={appointments !== null ? handleAppointmentsChange : undefined}
            onEnsurePatient={handleEnsurePatient}
            onCallToChair={handleCallToChair}
            onOpenBilling={handleOpenBilling}
            onOpenPrescription={handleOpenPrescription}
            walkInDisabled={!clinicWritable}
            googleReviewUrl={branding.googleReviewUrl}
          />
          </>
        )}

        {activeMainTab === 'crm' && isFrontDesk && deskCollectPatient && (
          <VisitHandoffPad
            patient={deskCollectPatient}
            doctorName={deskCollectPatient.assignedDoctorName || 'Doctor'}
            doctorRegistration=""
            branding={branding}
            branchId={currentDoctor.branch.id}
            clinicDbId={isLiveClinic ? liveClinicId : null}
            readOnly={!clinicWritable}
            deskMode
            doctorMemberId={deskCollectPatient.assignedMemberId ?? null}
            doctorMemberRole={
              rosterDoctors.find(
                (d) =>
                  d.memberId === deskCollectPatient.assignedMemberId ||
                  d.displayName === deskCollectPatient.assignedDoctorName
              )?.memberRole ?? null
            }
            onClose={() => setDeskCollectPatientId(null)}
            onScheduleFollowUp={(nextDate) =>
              handleScheduleFollowUp(deskCollectPatient.id, nextDate)
            }
            acceptedPlanLines={treatmentPlanLines.filter(
              (l) => l.patientId === deskCollectPatient.id
            )}
            suggestedProcedure={
              Object.values(deskCollectPatient.dentalChart)
                .map((t) => t.treatmentPlanned?.trim())
                .find((t) => Boolean(t)) || undefined
            }
          />
        )}

        {activeMainTab === 'crm' && (isFrontDesk || isClinicOwner) && !deskCollectPatient && (
          <PatientDirectory
            patients={visiblePatients}
            onSelectPatient={(p) => {
              setCurrentPatientId(p.id);
              if (isDoctor) {
                setActiveMainTab('operatory');
                setActiveOperatorySubTab('odontogram');
              } else {
                setActiveMainTab('home');
              }
            }}
            onCollectPatient={(p) => {
              setDeskCollectPatientId(p.id);
              setCurrentPatientId(p.id);
            }}
            onAddPatient={() => setActiveMainTab('home')}
          />
        )}

        {emptyTreat && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto">
            <h2 className="text-sm font-bold text-slate-900">No patients assigned to you</h2>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              Front desk must walk-in or seat a patient to{' '}
              <strong>{currentDoctor.doctor.displayName}</strong>. Your Treat workspace stays empty
              until then — we never show another doctor&apos;s chart.
            </p>
            <button
              type="button"
              onClick={() => setActiveMainTab('home')}
              className="tactile-btn mt-4 text-xs font-semibold px-4 py-2 rounded-md bg-teal-700 text-white"
            >
              Back to Today
            </button>
          </div>
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'odontogram' && treatPatient && (
          <Odontogram
            key={currentDoctor.doctor.id}
            dentalChart={treatPatient.dentalChart}
            onUpdateToothState={handleUpdateToothState}
            onResetChart={handleResetChart}
            onApplyMacro={handleChartMacroToPlan}
            readOnly={!clinicWritable}
            defaultDentition={
              currentDoctor.doctor.specialtyCode === 'PEDIATRIC' ||
              /pedo|paed|pediatric/i.test(currentDoctor.doctor.specialty)
                ? 'deciduous'
                : 'adult'
            }
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'plan' && treatPatient && (
          <TreatmentPlanPad
            patient={treatPatient}
            doctorName={currentDoctor.doctor.displayName}
            doctorSpecialty={currentDoctor.doctor.specialty}
            lines={treatmentPlanLines}
            onChangeLines={handleTreatmentPlanLinesChange}
            readOnly={!clinicWritable}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'casesheet' && treatPatient && (
          <CaseSheet
            key={treatPatient.id}
            patient={treatPatient}
            doctorSpecialty={currentDoctor.doctor.specialty}
            doctorName={currentDoctor.doctor.displayName}
            doctorRegistration={currentDoctor.doctor.registrationLabel.replace(/^Reg:\s*/i, '')}
            onSaveCaseSheet={handleSaveCaseSheet}
            initialSheet={latestCaseSheetForPatient(treatPatient.id)}
            readOnly={!clinicWritable}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'imaging' && treatPatient && (
          <ImagingStudio
            key={treatPatient.id}
            isDemo={demo}
            patientId={treatPatient.id}
            patientName={treatPatient.fullName}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'history' && treatPatient && (
          <PatientHistoryTimeline
            key={treatPatient.id}
            patient={treatPatient}
            clinicDbId={isLiveClinic ? liveClinicId : null}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'prescriptions' && treatPatient && (
          <PrescriptionPad
            key={`rx-${treatPatient.id}`}
            patient={treatPatient}
            doctorName={currentDoctor.doctor.displayName}
            doctorRegistration={currentDoctor.doctor.registrationLabel.replace(/^Reg:\s*/i, '')}
            clinicName={branding.legalName}
            branding={branding}
            clinicDbId={isLiveClinic ? liveClinicId : null}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'consent' && treatPatient && (
          <ConsentPad
            key={`consent-${treatPatient.id}`}
            patient={treatPatient}
            doctorName={currentDoctor.doctor.displayName}
            doctorRegistration={currentDoctor.doctor.registrationLabel.replace(/^Reg:\s*/i, '')}
            clinicName={branding.legalName}
            branding={branding}
            branchId={currentDoctor.branch.id}
            clinicDbId={isLiveClinic ? liveClinicId : null}
            pendingConsentLabels={treatmentPlanLines
              .filter(
                (l) =>
                  l.patientId === treatPatient.id &&
                  l.acceptance === 'ACCEPTED' &&
                  l.needsConsent
              )
              .map((l) => `${l.procedureLabel}${l.toothId ? ` #${l.toothId}` : ''}`)}
          />
        )}

        {isDoctor && activeMainTab === 'operatory' && activeOperatorySubTab === 'billing' && treatPatient && (
          <VisitHandoffPad
            patient={treatPatient}
            doctorName={currentDoctor.doctor.displayName}
            doctorRegistration={currentDoctor.doctor.registrationLabel.replace(/^Reg:\s*/i, '')}
            branding={branding}
            branchId={currentDoctor.branch.id}
            clinicDbId={isLiveClinic ? liveClinicId : null}
            readOnly={!clinicWritable}
            doctorMemberId={currentDoctor.doctor.memberId ?? null}
            doctorMemberRole={currentDoctor.doctor.memberRole ?? null}
            onScheduleFollowUp={(nextDate) =>
              handleScheduleFollowUp(treatPatient.id, nextDate)
            }
            acceptedPlanLines={treatmentPlanLines.filter((l) => l.patientId === treatPatient.id)}
            suggestedProcedure={
              Object.values(treatPatient.dentalChart)
                .map((t) => t.treatmentPlanned?.trim())
                .find((t) => Boolean(t)) || undefined
            }
          />
        )}

        {activeMainTab === 'operations' && !canAccessClinicOps && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto mt-8">
            <h2 className="text-sm font-bold text-slate-900">Operations — Owner Access Required</h2>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              Stock, labs, consultant payouts, and clinic settings are visible to the clinic owner
              and front desk staff. Contact <strong>{branding.legalName}</strong> admin to change
              your access level.
            </p>
            <button
              type="button"
              onClick={() => setActiveMainTab('home')}
              className="tactile-btn mt-5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Today
            </button>
          </div>
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'labs' && (
          <LabManager
            patient={
              visiblePatients.find((p) => p.id === currentPatientId) ||
              patients[0] ||
              null
            }
            doctorName={currentDoctor.doctor.displayName}
            planLines={treatmentPlanLines}
            clinicDbId={isLiveClinic ? liveClinicId : null}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'inventory' && (
          <InventoryManager clinicDbId={isLiveClinic ? liveClinicId : null} />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'sterilization' && (
          <ClinicOperationsDashboard
            clinicDbId={isLiveClinic ? liveClinicId : null}
            rosterDoctors={rosterDoctors}
            defaultOperatorName={currentDoctor.doctor.displayName}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'consultants' && (
          <ConsultantLedger
            clinicDbId={isLiveClinic ? liveClinicId : null}
            rosterDoctors={rosterDoctors}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'schedule' && (
          <ConsultantSchedulePanel
            rosterDoctors={rosterDoctors}
            clinicDbId={isLiveClinic ? liveClinicId : null}
            isOwner={isClinicOwner}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'dues' && (
          <DuesTracker
            clinicDbId={isLiveClinic ? liveClinicId : null}
            clinicName={branding.legalName}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'branding' && (
          <ClinicBrandingSettings
            branding={branding}
            clinicDbId={isLiveClinic ? liveClinicId : null}
            onSaved={setBranding}
          />
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'staff' && (
          isLiveClinic && liveClinicId ? (
            <StaffAdminPanel clinicDbId={liveClinicId} />
          ) : (
            <p className="text-sm text-slate-500">
              Staff admin is available on live clinics after signup. Demo uses the sandbox roster.
            </p>
          )
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'whatsapp' && (
          patients[0] ? (
            <WhatsAppDispatcher
              patient={
                visiblePatients.find((p) => p.id === currentPatientId) ||
                patients[0]
              }
              clinicName={branding.legalName}
              defaultDoctorName={currentDoctor.doctor.displayName}
              clinicPhoneDisplay={branding.phone}
              clinicMapsQuery={`${branding.legalName}, ${branding.addressLine}, ${branding.cityLine}`}
            />
          ) : (
            <p className="text-sm text-slate-500">Add a patient first to dispatch WhatsApp messages.</p>
          )
        )}

        {canAccessClinicOps && activeMainTab === 'operations' && activeOpsSubTab === 'profit' && (
          <ProfitabilityCalculator />
        )}
        </div>
      </main>

      <footer className="bg-white text-slate-500 text-xs border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">{branding.legalName}</span>
            <span>·</span>
            <span>Workstation</span>
          </div>
          <div className="text-[11px] text-slate-400 text-right">
            {isLiveClinic
              ? syncNote || 'Encrypted Clinical Cloud · HIPAA/ABDM Compliant & Synced'
              : demo || settings.mode === 'demo'
                ? 'Interactive Sandbox · AuraSmile OS'
                : 'Encrypted Cloud Ready · Sign in to bind clinic'}
          </div>
        </div>
      </footer>

      <DoctorAuthModal
        open={isAuthModalOpen}
        initialSelection={currentDoctor}
        onClose={() => setIsAuthModalOpen(false)}
        onConfirm={handleConfirmSession}
      />

      <ClinicSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        clinicDbId={liveClinicId}
        clinicName={branding.legalName}
        doctorName={currentDoctor.doctor.displayName}
        clinicEmail="doctor@aurasmile.clinic"
        clinicPhone={branding.phone}
        entitlement={clinicEntitlement}
        onPlanActivated={handlePlanActivated}
      />
    </div>
  );
};
