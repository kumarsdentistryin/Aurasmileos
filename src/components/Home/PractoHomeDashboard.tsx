import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  FlaskConical,
  IndianRupee,
  Plus,
  Stethoscope,
  X,
  Armchair,
} from 'lucide-react';
import { formatPaiseToInr } from '../../domain/financials';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import {
  ClinicDoctorOption,
  ClinicRole,
  OPERATORY_CHAIRS,
} from '../Auth/DoctorAuthModal';
import { buildAppointmentReminderMessage } from '../../lib/appointmentReminders';
import { filterPatientsForViewer, filterQueueForViewer } from '../../lib/doctorScope';
import { emitAppointmentReminder } from '../../lib/integrations/emit';
import { DayChairCalendar } from '../Schedule/DayChairCalendar';
import { ClinicStaffOption, listDemoStaff, treatingStaff } from '../../lib/clinicAuth';
import {
  buildFollowUpQueue,
  followUpWhatsAppMessage,
  type FollowUpStatus,
} from '../../domain/followUp';
import {
  loadConsultantSchedule,
  nextAvailableDayLabel,
} from '../../lib/consultantSchedule';
import { sumOpenDuesPaise } from '../../lib/duesRepository';
import { countPendingLabSlips } from '../../lib/labOrderRepository';

type HomeViewMode = 'QUEUE' | 'CALENDAR';

export type QueueAppointmentStatus =
  | 'IN_CHAIR'
  | 'WAITING_IN_LOBBY'
  | 'CONFIRMED'
  | 'COMPLETED';

export type QueueFilterTab = 'ALL' | 'WAITING_IN_LOBBY' | 'IN_CHAIR' | 'COMPLETED';

export interface HomeQueueAppointment {
  id: string;
  /** Links to `Patient.id` when known; null for walk-ins until created */
  patientId: string | null;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  phone: string;
  scheduledTime: string;
  chiefComplaint: string;
  status: QueueAppointmentStatus;
  assignedDoctor: string;
  assignedMemberId?: string | null;
  chairLabel: string;
  expectedFeePaise: number;
}

export interface WalkInPatientDraft {
  fullName: string;
  phone: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  chiefComplaint: string;
}

export interface ChairOccupancySlot {
  chairId: string;
  label: string;
  suiteName: string;
  status: 'BUSY' | 'FREE_SANITIZED';
  occupantName: string | null;
  doctorName: string | null;
}

const INITIAL_QUEUE: HomeQueueAppointment[] = [
  {
    id: 'appt-001',
    patientId: 'pat-001',
    patientName: 'Rajesh Sharma',
    age: 48,
    gender: 'M',
    phone: '+919845012345',
    scheduledTime: '10:30 AM',
    chiefComplaint: 'Severe Molar Pain (#16)',
    status: 'IN_CHAIR',
    assignedDoctor: 'Dr. Vikram Rao, MDS',
    chairLabel: 'Chair 1',
    expectedFeePaise: 850000,
  },
  {
    id: 'appt-002',
    patientId: 'pat-002',
    patientName: 'Priya Sundaram',
    age: 34,
    gender: 'F',
    phone: '+919731298765',
    scheduledTime: '11:30 AM',
    chiefComplaint: 'E.max Crown Trial (#21)',
    status: 'WAITING_IN_LOBBY',
    assignedDoctor: 'Dr. Ananya Iyer, BDS',
    chairLabel: 'Chair 2',
    expectedFeePaise: 280000,
  },
  {
    id: 'appt-003',
    patientId: 'pat-003',
    patientName: 'Master Aarav Patel',
    age: 8,
    gender: 'M',
    phone: '+919535001122',
    scheduledTime: '12:15 PM',
    chiefComplaint: 'Pediatric Space Maintainer',
    status: 'WAITING_IN_LOBBY',
    assignedDoctor: 'Dr. Ananya Iyer, BDS',
    chairLabel: 'Chair 2',
    expectedFeePaise: 500000,
  },
  {
    id: 'appt-004',
    patientId: 'pat-004',
    patientName: 'Sunita Devi',
    age: 56,
    gender: 'F',
    phone: '+919886644221',
    scheduledTime: '02:30 PM',
    chiefComplaint: 'Implant Surgical Guide Consultation',
    status: 'CONFIRMED',
    assignedDoctor: 'Dr. Priya Sharma, MDS',
    chairLabel: 'Chair 1',
    expectedFeePaise: 150000,
  },
  {
    id: 'appt-005',
    patientId: null,
    patientName: 'Rohan Kulkarni',
    age: 29,
    gender: 'M',
    phone: '+919611223344',
    scheduledTime: '09:30 AM',
    chiefComplaint: 'Post-Op Suture Removal',
    status: 'COMPLETED',
    assignedDoctor: 'Dr. Vikram Rao, MDS',
    chairLabel: 'Chair 3',
    expectedFeePaise: 80000,
  },
];

const STATUS_STYLES: Record<
  QueueAppointmentStatus,
  { label: string; className: string }
> = {
  IN_CHAIR: {
    label: 'In Chair',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  WAITING_IN_LOBBY: {
    label: 'Waiting in Lobby',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

interface PractoHomeDashboardProps {
  clinicBranchLabel: string;
  clinicBrandName?: string;
  /** Live clinic id for integration emits (optional) */
  clinicDbId?: string | null;
  activeDoctorName: string;
  activeMemberId?: string | null;
  viewerRole: ClinicRole;
  /** Owner treating clinicians — show floor overview (revenue / dues / consultants) */
  isClinicOwner?: boolean;
  /** Live or demo treating doctors for assign dropdowns */
  rosterDoctors?: ClinicStaffOption[] | ClinicDoctorOption[];
  /** Branch chair ids — one chair can host many doctors across the day */
  availableChairs?: string[];
  /** Patient records with nextAppointmentDate — for call-list / follow-ups */
  upcomingPatients?: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    nextAppointmentDate?: string;
    assignedDoctorName: string;
    assignedMemberId?: string | null;
    age: number;
    gender: 'M' | 'F' | 'OTHER';
  }>;
  /** When provided, Home uses this queue instead of demo seed */
  appointments?: HomeQueueAppointment[];
  onAppointmentsChange?: (next: HomeQueueAppointment[]) => void;
  onEnsurePatient: (draft: {
    idHint: string | null;
    fullName: string;
    age: number;
    gender: 'M' | 'F' | 'OTHER';
    phone: string;
    chiefComplaint: string;
    assignedDoctor: string;
    assignedMemberId?: string | null;
    chairLabel: string;
    confirmReuse?: boolean;
  }) => string;
  /** Dentist-only: opens clinical Treat workspace */
  onCallToChair: (patientId: string) => void;
  /** Soft-lock — hide/disable walk-in create when pilot expired */
  walkInDisabled?: boolean;
}

function buildStatusWhatsApp(
  appt: HomeQueueAppointment,
  clinicBrandName: string,
  clinicBranchLabel: string
): string {
  const first = appt.patientName.split(/\s+/)[0] ?? appt.patientName;
  if (appt.status === 'WAITING_IN_LOBBY') {
    return `Namaste ${first} ji,\n\nYou are checked in at ${clinicBrandName} (${appt.chairLabel} queue). We will call you to the chair shortly.\n\n— Front Desk`;
  }
  if (appt.status === 'IN_CHAIR') {
    return `Namaste ${first} ji,\n\nYou are currently with ${appt.assignedDoctor} in ${appt.chairLabel}. Please ask the coordinator if you need anything for your attendant.\n\n— ${clinicBrandName} Operatory`;
  }
  if (appt.status === 'COMPLETED') {
    return `Namaste ${first} ji,\n\nThank you for visiting ${clinicBrandName} today (${appt.chiefComplaint}). Post-care instructions are available on WhatsApp — reply if you need anything.\n\n— Care Team`;
  }
  return buildAppointmentReminderMessage({
    patientFirstName: first,
    clinicName: clinicBrandName,
    branchLabel: clinicBranchLabel,
    scheduledTime: appt.scheduledTime,
    chiefComplaint: appt.chiefComplaint,
    doctorName: appt.assignedDoctor,
  });
}

function waUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
}

function digitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export const PractoHomeDashboard: React.FC<PractoHomeDashboardProps> = ({
  clinicBranchLabel,
  clinicBrandName = 'Clinic',
  clinicDbId = null,
  activeDoctorName,
  activeMemberId = null,
  viewerRole,
  isClinicOwner = false,
  rosterDoctors,
  availableChairs,
  upcomingPatients = [],
  appointments,
  onAppointmentsChange,
  onEnsurePatient,
  onCallToChair,
  walkInDisabled = false,
}) => {
  const [localQueue, setLocalQueue] = useState<HomeQueueAppointment[]>(INITIAL_QUEUE);
  const queue = appointments ?? localQueue;
  const setQueue = (
    updater: HomeQueueAppointment[] | ((prev: HomeQueueAppointment[]) => HomeQueueAppointment[])
  ) => {
    const next = typeof updater === 'function' ? updater(queue) : updater;
    if (onAppointmentsChange) {
      onAppointmentsChange(next);
    } else {
      setLocalQueue(next);
    }
  };
  const [filter, setFilter] = useState<QueueFilterTab>('WAITING_IN_LOBBY');
  const [homeView, setHomeView] = useState<HomeViewMode>('QUEUE');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [seatApptId, setSeatApptId] = useState<string | null>(null);
  const [dispatchFlash, setDispatchFlash] = useState<string | null>(null);
  const [phoneReusePrompt, setPhoneReusePrompt] = useState<{
    source: 'walkin' | 'book';
    match: { id: string; fullName: string; phoneNumber: string };
  } | null>(null);

  const treatingDoctors = useMemo(() => {
    const source = rosterDoctors?.length
      ? rosterDoctors
      : treatingStaff(listDemoStaff());
    return source.filter((d) => d.role === 'DOCTOR');
  }, [rosterDoctors]);

  const isDesk = viewerRole === 'FRONT_DESK';
  const defaultDoctor = treatingDoctors[0];
  const defaultDoctorName = isDesk
    ? defaultDoctor?.displayName ?? activeDoctorName
    : activeDoctorName;
  const defaultMemberId = isDesk
    ? defaultDoctor?.memberId ?? null
    : activeMemberId;

  const branchChairs = useMemo(() => {
    const ids = availableChairs?.length
      ? availableChairs
      : OPERATORY_CHAIRS.map((c) => c.id);
    return OPERATORY_CHAIRS.filter((c) => ids.includes(c.id));
  }, [availableChairs]);

  const scopedQueue = useMemo(
    () => filterQueueForViewer(queue, activeDoctorName, viewerRole, activeMemberId),
    [queue, activeDoctorName, viewerRole, activeMemberId]
  );

  const [walkIn, setWalkIn] = useState<WalkInPatientDraft>({
    fullName: '',
    phone: '',
    age: 30,
    gender: 'M',
    chiefComplaint: '',
  });
  const [walkInDoctor, setWalkInDoctor] = useState(defaultDoctorName);
  const [walkInMemberId, setWalkInMemberId] = useState<string | null>(defaultMemberId);
  const [walkInChair, setWalkInChair] = useState(
    () => OPERATORY_CHAIRS[2]?.label ?? 'Chair 3'
  );

  const [bookDraft, setBookDraft] = useState({
    fullName: '',
    phone: '',
    scheduledTime: '04:00 PM',
    chiefComplaint: '',
    assignedDoctor: defaultDoctorName,
    assignedMemberId: defaultMemberId as string | null,
    chairLabel: 'TBD',
  });

  const [seatDraft, setSeatDraft] = useState({
    doctorName: defaultDoctorName,
    memberId: defaultMemberId as string | null,
    chairLabel: branchChairs[0]?.label ?? 'Chair 1',
  });

  const seatAppt = seatApptId
    ? scopedQueue.find((q) => q.id === seatApptId) ?? null
    : null;
  const counts = useMemo(() => {
    const waiting = scopedQueue.filter((q) => q.status === 'WAITING_IN_LOBBY').length;
    const inChair = scopedQueue.filter((q) => q.status === 'IN_CHAIR').length;
    const completed = scopedQueue.filter((q) => q.status === 'COMPLETED').length;
    const collectionsPaise = scopedQueue
      .filter((q) => q.status !== 'COMPLETED')
      .reduce((sum, q) => sum + q.expectedFeePaise, 0);
    return {
      scheduled: scopedQueue.length,
      waiting,
      inChair,
      completed,
      collectionsPaise,
      inChairPatient: scopedQueue.find((q) => q.status === 'IN_CHAIR') ?? null,
    };
  }, [scopedQueue]);

  const filteredQueue = useMemo(() => {
    if (filter === 'ALL') return scopedQueue;
    return scopedQueue.filter((q) => q.status === filter);
  }, [scopedQueue, filter]);

  const chairRadar: ChairOccupancySlot[] = useMemo(() => {
    const inChairRows = scopedQueue.filter((q) => q.status === 'IN_CHAIR');
    return branchChairs.map((chair) => {
      const occupant = inChairRows.find((q) => q.chairLabel === chair.label);
      return {
        chairId: chair.id,
        label: chair.label,
        suiteName: chair.suiteName,
        status: occupant ? 'BUSY' : 'FREE_SANITIZED',
        occupantName: occupant?.patientName ?? null,
        doctorName: occupant?.assignedDoctor ?? null,
      };
    });
  }, [scopedQueue, branchChairs]);

  const firstFreeChairLabel = useMemo(() => {
    const busy = new Set(
      scopedQueue.filter((q) => q.status === 'IN_CHAIR').map((q) => q.chairLabel)
    );
    return (
      branchChairs.find((c) => !busy.has(c.label))?.label ??
      branchChairs[0]?.label ??
      'Chair 1'
    );
  }, [scopedQueue, branchChairs]);

  const handleDayStartReminders = async () => {
    const todays = scopedQueue.filter((q) => q.status !== 'COMPLETED');
    if (todays.length === 0) {
      setDispatchFlash('No patients to remind');
      window.setTimeout(() => setDispatchFlash(null), 2200);
      return;
    }

    const lines = todays.map(
      (a, i) =>
        `${i + 1}. ${a.patientName} · ${a.phone} · ${a.scheduledTime} · ${a.chiefComplaint}`
    );
    const roster = `${clinicBrandName} day roster (${clinicBranchLabel})\nFor: ${activeDoctorName}\n\n${lines.join('\n')}\n\nOpen each patient WhatsApp from the queue card (green icon) — one chat at a time.`;

    try {
      await navigator.clipboard.writeText(roster);
      setDispatchFlash(
        `Copied ${todays.length} patients to clipboard — use each green WhatsApp icon (one tab)`
      );
    } catch {
      setDispatchFlash(`Ready: tap green WhatsApp on each patient card (${todays.length})`);
    }

    const first = todays.find((q) => q.status !== 'IN_CHAIR') ?? todays[0];
    const firstName = first.patientName.split(/\s+/)[0] ?? first.patientName;
    const msg = buildAppointmentReminderMessage({
      patientFirstName: firstName,
      clinicName: clinicBrandName,
      branchLabel: clinicBranchLabel,
      scheduledTime: first.scheduledTime,
      chiefComplaint: first.chiefComplaint,
      doctorName: first.assignedDoctor,
    });
    window.open(waUrl(first.phone, msg), '_blank', 'noopener,noreferrer');

    void emitAppointmentReminder(clinicDbId || 'local', {
      count: todays.length,
      appointment_ids: todays.map((a) => a.id),
      opened_appointment_id: first.id,
      branch_label: clinicBranchLabel,
      channel: 'whatsapp',
    });

    window.setTimeout(() => setDispatchFlash(null), 4000);
  };

  const applySeatToQueue = (
    appt: HomeQueueAppointment,
    doctorName: string,
    chairLabel: string,
    memberId?: string | null
  ) => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id === appt.id) {
          return {
            ...q,
            status: 'IN_CHAIR',
            assignedDoctor: doctorName,
            assignedMemberId: memberId ?? q.assignedMemberId ?? null,
            chairLabel,
          };
        }
        // One patient per chair — free previous occupant of this chair
        if (q.status === 'IN_CHAIR' && q.chairLabel === chairLabel && q.id !== appt.id) {
          return { ...q, status: 'WAITING_IN_LOBBY' };
        }
        return q;
      })
    );

    return onEnsurePatient({
      idHint: appt.patientId,
      fullName: appt.patientName,
      age: appt.age,
      gender: appt.gender,
      phone: appt.phone,
      chiefComplaint: appt.chiefComplaint,
      assignedDoctor: doctorName,
      assignedMemberId: memberId ?? null,
      chairLabel,
    });
  };

  /** Dentist: seat + open Treat. Desk: open seat picker (no clinical chart). */
  const handlePrimaryQueueAction = (appt: HomeQueueAppointment) => {
    if (isDesk) {
      setSeatDraft({
        doctorName: appt.assignedDoctor || defaultDoctorName,
        memberId: appt.assignedMemberId || defaultMemberId,
        chairLabel: firstFreeChairLabel,
      });
      setSeatApptId(appt.id);
      return;
    }

    const chairLabel = firstFreeChairLabel;
    const patientId = applySeatToQueue(
      appt,
      activeDoctorName,
      chairLabel,
      activeMemberId
    );
    onCallToChair(patientId);
  };

  const confirmDeskSeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatAppt) return;
    applySeatToQueue(
      seatAppt,
      seatDraft.doctorName,
      seatDraft.chairLabel,
      seatDraft.memberId
    );
    setSeatApptId(null);
    setDispatchFlash(
      `Seated ${seatAppt.patientName.split(' ')[0]} in ${seatDraft.chairLabel} for ${seatDraft.doctorName.replace(/,.*/, '')} — doctor opens Treat on their screen`
    );
    window.setTimeout(() => setDispatchFlash(null), 4000);
  };

  const findPatientByPhone = (phone: string) => {
    const digits = digitsOnly(phone);
    if (!digits) return null;
    return (
      upcomingPatients.find((p) => digitsOnly(p.phoneNumber) === digits) ?? null
    );
  };

  const commitWalkIn = (opts: { idHint: string | null; confirmReuse?: boolean }) => {
    const doctorName = isDesk ? walkInDoctor : activeDoctorName;
    const memberId = isDesk ? walkInMemberId : activeMemberId;
    const chairLabel = isDesk ? walkInChair : firstFreeChairLabel;

    const patientId = onEnsurePatient({
      idHint: opts.idHint,
      fullName: walkIn.fullName.trim(),
      age: walkIn.age,
      gender: walkIn.gender,
      phone: walkIn.phone.trim(),
      chiefComplaint: walkIn.chiefComplaint.trim() || 'Walk-in consultation',
      assignedDoctor: doctorName,
      assignedMemberId: memberId,
      chairLabel,
      confirmReuse: opts.confirmReuse,
    });

    const newAppt: HomeQueueAppointment = {
      id: onAppointmentsChange ? crypto.randomUUID() : `appt-walkin-${Date.now()}`,
      patientId,
      patientName: walkIn.fullName.trim(),
      age: walkIn.age,
      gender: walkIn.gender,
      phone: walkIn.phone.trim(),
      scheduledTime: 'Now',
      chiefComplaint: walkIn.chiefComplaint.trim() || 'Walk-in consultation',
      status: 'WAITING_IN_LOBBY',
      assignedDoctor: doctorName,
      assignedMemberId: memberId,
      chairLabel,
      expectedFeePaise: 50000,
    };

    setQueue((prev) => [newAppt, ...prev]);
    setPhoneReusePrompt(null);
    setWalkInOpen(false);
    setWalkIn({ fullName: '', phone: '', age: 30, gender: 'M', chiefComplaint: '' });
  };

  const commitBook = (opts: { idHint: string | null; confirmReuse?: boolean }) => {
    const doctorName = isDesk ? bookDraft.assignedDoctor : activeDoctorName;
    const memberId = isDesk ? bookDraft.assignedMemberId : activeMemberId;

    const patientId = onEnsurePatient({
      idHint: opts.idHint,
      fullName: bookDraft.fullName.trim(),
      age: 30,
      gender: 'M',
      phone: bookDraft.phone.trim(),
      chiefComplaint: bookDraft.chiefComplaint.trim() || 'Scheduled consultation',
      assignedDoctor: doctorName,
      assignedMemberId: memberId,
      chairLabel: bookDraft.chairLabel || 'TBD',
      confirmReuse: opts.confirmReuse,
    });

    const newAppt: HomeQueueAppointment = {
      id: onAppointmentsChange ? crypto.randomUUID() : `appt-book-${Date.now()}`,
      patientId,
      patientName: bookDraft.fullName.trim(),
      age: 30,
      gender: 'M',
      phone: bookDraft.phone.trim(),
      scheduledTime: bookDraft.scheduledTime,
      chiefComplaint: bookDraft.chiefComplaint.trim() || 'Scheduled consultation',
      status: 'CONFIRMED',
      assignedDoctor: doctorName,
      assignedMemberId: memberId,
      chairLabel: bookDraft.chairLabel || 'TBD',
      expectedFeePaise: 100000,
    };

    setQueue((prev) => [...prev, newAppt]);
    setPhoneReusePrompt(null);
    setBookOpen(false);
    setBookDraft({
      fullName: '',
      phone: '',
      scheduledTime: '04:00 PM',
      chiefComplaint: '',
      assignedDoctor: defaultDoctorName,
      assignedMemberId: defaultMemberId,
      chairLabel: 'TBD',
    });
  };

  const submitWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkIn.fullName.trim() || !walkIn.phone.trim()) return;

    const match = findPatientByPhone(walkIn.phone);
    if (match) {
      setPhoneReusePrompt({
        source: 'walkin',
        match: { id: match.id, fullName: match.fullName, phoneNumber: match.phoneNumber },
      });
      return;
    }

    commitWalkIn({ idHint: null });
  };

  const submitBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookDraft.fullName.trim() || !bookDraft.phone.trim()) return;

    const match = findPatientByPhone(bookDraft.phone);
    if (match) {
      setPhoneReusePrompt({
        source: 'book',
        match: { id: match.id, fullName: match.fullName, phoneNumber: match.phoneNumber },
      });
      return;
    }

    commitBook({ idHint: null });
  };

  const confirmPhoneReuse = () => {
    if (!phoneReusePrompt) return;
    const opts = { idHint: phoneReusePrompt.match.id, confirmReuse: true as const };
    if (phoneReusePrompt.source === 'walkin') commitWalkIn(opts);
    else commitBook(opts);
  };

  const createDespitePhoneMatch = () => {
    if (!phoneReusePrompt) return;
    const opts = { idHint: null as string | null, confirmReuse: false as const };
    if (phoneReusePrompt.source === 'walkin') commitWalkIn(opts);
    else commitBook(opts);
  };

  const filterTabs: { id: QueueFilterTab; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.scheduled },
    { id: 'WAITING_IN_LOBBY', label: 'Waiting in Lobby', count: counts.waiting },
    { id: 'IN_CHAIR', label: 'In Chair', count: counts.inChair },
    { id: 'COMPLETED', label: 'Completed', count: counts.completed },
  ];

  const recallList = useMemo(() => {
    const scoped = filterPatientsForViewer(
      upcomingPatients,
      activeDoctorName,
      viewerRole,
      activeMemberId
    );
    return buildFollowUpQueue(scoped);
  }, [upcomingPatients, activeDoctorName, viewerRole, activeMemberId]);

  const followUpStatusLabel = (status: FollowUpStatus): string => {
    if (status === 'OVERDUE') return 'Overdue';
    if (status === 'DUE_TODAY') return 'Due today';
    return 'Upcoming';
  };

  const followUpStatusClass = (status: FollowUpStatus): string => {
    if (status === 'OVERDUE') return 'border-rose-200 bg-rose-50 text-rose-800';
    if (status === 'DUE_TODAY') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-teal-200 bg-teal-50 text-teal-800';
  };

  const ownerTodayRevenuePaise = useMemo(
    () =>
      scopedQueue
        .filter((a) => a.status === 'COMPLETED')
        .reduce((s, a) => s + a.expectedFeePaise, 0),
    [scopedQueue]
  );
  const ownerOutstandingPaise = useMemo(() => {
    const fromDues = sumOpenDuesPaise(clinicDbId);
    if (fromDues > 0) return fromDues;
    return scopedQueue
      .filter(
        (a) =>
          a.status === 'WAITING_IN_LOBBY' ||
          a.status === 'CONFIRMED' ||
          a.status === 'IN_CHAIR'
      )
      .reduce((s, a) => s + a.expectedFeePaise, 0);
  }, [scopedQueue, clinicDbId]);
  const ownerConsultantsToday = useMemo(() => {
    const names = new Set(
      scopedQueue
        .map((a) => a.assignedDoctor)
        .filter((n) => n && n !== activeDoctorName)
    );
    return names.size;
  }, [scopedQueue, activeDoctorName]);
  const scheduleMap = useMemo(
    () => loadConsultantSchedule(clinicDbId),
    [clinicDbId]
  );
  const [openLabSlips, setOpenLabSlips] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void countPendingLabSlips(clinicDbId ?? null).then((n) => {
      if (!cancelled) setOpenLabSlips(n);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicDbId]);

  return (
    <div className="space-y-4">
      {isClinicOwner && (
        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">
            Owner Overview · Today
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative rounded-xl border border-slate-200 bg-white p-4">
              <IndianRupee className="absolute right-3 top-3 h-4 w-4 text-teal-700" />
              <div className="text-xl font-bold text-slate-900 font-mono pr-6">
                {formatPaiseToInr(ownerTodayRevenuePaise, false)}
              </div>
              <div className="text-xs text-slate-500 mt-1">collected today</div>
            </div>
            <div className="relative rounded-xl border border-slate-200 bg-white p-4">
              <Clock className="absolute right-3 top-3 h-4 w-4 text-teal-700" />
              <div className="text-xl font-bold text-slate-900 font-mono pr-6">
                {formatPaiseToInr(ownerOutstandingPaise, false)}
              </div>
              <div className="text-xs text-slate-500 mt-1">pending</div>
            </div>
            <div className="relative rounded-xl border border-slate-200 bg-white p-4">
              <Stethoscope className="absolute right-3 top-3 h-4 w-4 text-teal-700" />
              <div className="text-xl font-bold text-slate-900 font-mono pr-6">
                {ownerConsultantsToday}
              </div>
              <div className="text-xs text-slate-500 mt-1">consultants active</div>
            </div>
            <div className="relative rounded-xl border border-slate-200 bg-white p-4">
              <FlaskConical className="absolute right-3 top-3 h-4 w-4 text-teal-700" />
              <div className="text-xl font-bold text-slate-900 font-mono pr-6">
                {openLabSlips}
              </div>
              <div className="text-xs text-slate-500 mt-1">lab slips open</div>
            </div>
          </div>
        </section>
      )}

      <div className="surface-card p-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {isDesk ? 'Clinic queue today' : 'Your patients today'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isDesk
            ? 'Front desk — book, seat, WhatsApp. Clinical Treat is dentist-only.'
            : `Showing only patients assigned to ${activeDoctorName.replace(/,.*/, '')}`}
        </p>
      </div>

      {/* Compact status row — monochrome surgical */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[var(--color-surface)] border border-slate-200 rounded-lg px-3 py-2.5">
          <div className="text-[11px] text-slate-500">Today</div>
          <div className="text-lg font-bold text-slate-900 font-mono">{counts.scheduled}</div>
        </div>
        <div className="bg-[var(--color-surface)] border border-slate-200 rounded-lg px-3 py-2.5">
          <div className="text-[11px] text-slate-500">
            In lobby <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-600 align-middle" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">{counts.waiting}</div>
        </div>
        <div className="bg-[var(--color-surface)] border border-slate-200 rounded-lg px-3 py-2.5">
          <div className="text-[11px] text-slate-500">
            In chair <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] align-middle" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono truncate">
            {counts.inChairPatient ? counts.inChairPatient.patientName.split(' ')[0] : '—'}
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border border-slate-200 rounded-lg px-3 py-2.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" /> Collect today
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {formatPaiseToInr(counts.collectionsPaise, false)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={walkInDisabled}
          onClick={() => setWalkInOpen(true)}
          title={walkInDisabled ? 'Pilot ended — read-only' : undefined}
          className="tactile-btn inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-md bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] motion-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-4 h-4" />
          New walk-in
        </button>
        <button
          type="button"
          onClick={handleDayStartReminders}
          className="tactile-btn inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4" />
          WhatsApp reminders
        </button>
        <button
          type="button"
          onClick={() => setBookOpen(true)}
          className="tactile-btn inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Book slot
        </button>
        <div className="ml-auto inline-flex rounded-md border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setHomeView('QUEUE')}
            className={`tactile-btn text-xs font-semibold px-3 py-2 ${
              homeView === 'QUEUE'
                ? 'bg-teal-50 text-teal-800'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => setHomeView('CALENDAR')}
            className={`tactile-btn text-xs font-semibold px-3 py-2 border-l border-slate-200 ${
              homeView === 'CALENDAR'
                ? 'bg-teal-50 text-teal-800'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Chair calendar
          </button>
        </div>
        {dispatchFlash && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
            {dispatchFlash}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
        {/* Queue Board or Chair Calendar */}
        <div className="space-y-3">
          {homeView === 'CALENDAR' ? (
            <DayChairCalendar
              appointments={scopedQueue}
              chairLabels={branchChairs.map((c) => c.label)}
              filterDoctorName={isDesk ? null : activeDoctorName}
              title={isDesk ? 'All doctors · shared chairs today' : 'Your chair schedule today'}
            />
          ) : (
            <>
          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`tactile-btn text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-all ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5">
            {filteredQueue.map((appt) => {
              const status = STATUS_STYLES[appt.status];
              const genderLabel = appt.gender === 'M' ? 'M' : appt.gender === 'F' ? 'F' : 'O';
              return (
                <article
                  key={appt.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          {appt.scheduledTime}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {appt.patientName}{' '}
                          <span className="font-medium text-slate-500">
                            ({appt.age}y/{genderLabel})
                          </span>
                        </h3>
                        <span
                          className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mb-1.5">{appt.chiefComplaint}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          {appt.assignedDoctor}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Armchair className="w-3 h-3" />
                          {appt.chairLabel}
                        </span>
                        <span className="font-mono text-emerald-700">
                          {formatPaiseToInr(appt.expectedFeePaise, false)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {appt.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handlePrimaryQueueAction(appt)}
                          className="tactile-btn inline-flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm min-h-[48px]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isDesk ? 'Seat patient' : 'Start treatment'}
                        </button>
                      )}
                      <a
                        href={waUrl(appt.phone, buildStatusWhatsApp(appt, clinicBrandName, clinicBranchLabel))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tactile-btn inline-flex items-center justify-center w-9 h-9 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp status update"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}

            {filteredQueue.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-10 border border-dashed border-slate-200 rounded-lg bg-white">
                No appointments in this filter
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Chair Occupancy Radar */}
        <aside className="space-y-3 h-fit">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-slate-800 mb-3">Chairs</h3>
            <div className="space-y-2.5">
              {chairRadar.map((chair) => {
                const busy = chair.status === 'BUSY';
                return (
                  <div
                    key={chair.chairId}
                    className={`rounded-lg border p-3 transition-colors ${
                      busy
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{chair.label}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          busy
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {busy ? 'Busy' : 'Free / Sanitized'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{chair.suiteName}</p>
                    <p className="text-[11px] font-medium text-slate-700 mt-1 truncate">
                      {busy ? chair.occupantName : 'Ready for next patient'}
                    </p>
                    {busy && chair.doctorName && (
                      <p className="text-[10px] text-teal-700 mt-0.5 truncate">
                        with {chair.doctorName.replace(/,.*/, '')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Follow-up / recall queue from patient.nextAppointmentDate */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-slate-800 mb-1">Follow-ups</h3>
            <p className="text-[10px] text-slate-500 mb-3">
              Overdue first — call or WhatsApp to confirm. Set dates from Treat → Bill.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recallList.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 text-center">
                  No follow-ups scheduled
                </p>
              )}
              {recallList.map((row) => {
                const p = row.patient;
                const first = p.fullName.split(/\s+/)[0] ?? p.fullName;
                const nextLabel = row.nextDate || p.nextAppointmentDate || '';
                const msg = followUpWhatsAppMessage({
                  patientFirstName: first,
                  clinicName: clinicBrandName,
                  nextDate: nextLabel,
                  doctorName: p.assignedDoctorName,
                  branchLabel: clinicBranchLabel,
                });
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-slate-200 p-2.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {p.fullName}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${followUpStatusClass(
                          row.status
                        )}`}
                      >
                        {followUpStatusLabel(row.status)}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-teal-700 mt-0.5">
                      {nextLabel}
                      {row.daysUntil != null && row.daysUntil < 0
                        ? ` · ${Math.abs(row.daysUntil)}d late`
                        : row.daysUntil != null && row.daysUntil > 0
                          ? ` · in ${row.daysUntil}d`
                          : ''}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {p.assignedDoctorName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <a
                        href={`tel:${p.phoneNumber}`}
                        className="tactile-btn flex-1 text-center text-[10px] font-semibold py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      >
                        Call
                      </a>
                      <a
                        href={waUrl(p.phoneNumber, msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tactile-btn flex-1 inline-flex items-center justify-center gap-1 text-center text-[10px] font-semibold py-1.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        WhatsApp
                      </a>
                      {!isDesk && (
                        <button
                          type="button"
                          onClick={() => onCallToChair(p.id)}
                          className="tactile-btn text-[10px] font-semibold px-2 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700"
                          title="Open chairside chart"
                        >
                          Treat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Walk-in Modal */}
      {walkInOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close walk-in modal"
            onClick={() => setWalkInOpen(false)}
          />
          <form
            onSubmit={submitWalkIn}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">New Walk-In Patient</h3>
              <button type="button" onClick={() => setWalkInOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">15-second intake — Name, Mobile, Age/Gender, Chief Complaint</p>
            <input
              required
              value={walkIn.fullName}
              onChange={(e) => setWalkIn({ ...walkIn, fullName: e.target.value })}
              placeholder="Full name"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              required
              value={walkIn.phone}
              onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })}
              placeholder="Mobile (+91…)"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                max={120}
                value={walkIn.age}
                onChange={(e) => setWalkIn({ ...walkIn, age: Number(e.target.value) || 0 })}
                placeholder="Age"
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <select
                value={walkIn.gender}
                onChange={(e) =>
                  setWalkIn({ ...walkIn, gender: e.target.value as WalkInPatientDraft['gender'] })
                }
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <input
              value={walkIn.chiefComplaint}
              onChange={(e) => setWalkIn({ ...walkIn, chiefComplaint: e.target.value })}
              placeholder="Chief complaint"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {isDesk && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  aria-label="Assign treating doctor"
                  value={walkInDoctor}
                  onChange={(e) => {
                    const doc = treatingDoctors.find((d) => d.displayName === e.target.value);
                    setWalkInDoctor(e.target.value);
                    setWalkInMemberId(doc?.memberId ?? null);
                  }}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                >
                  {treatingDoctors.map((d) => {
                    const key = d.memberId || d.displayName;
                    const avail = nextAvailableDayLabel(scheduleMap[key]);
                    return (
                      <option key={d.id} value={d.displayName}>
                        {d.displayName.replace(/,.*/, '')} · {d.specialty} ({avail})
                      </option>
                    );
                  })}
                </select>
                <select
                  aria-label="Preferred chair"
                  value={walkInChair}
                  onChange={(e) => setWalkInChair(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                >
                  {branchChairs.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label} · {c.suiteName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              className="tactile-btn w-full text-xs font-semibold py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Add to Lobby Queue
            </button>
          </form>
        </div>
      )}

      {/* Book Appointment Modal */}
      {bookOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close book modal"
            onClick={() => setBookOpen(false)}
          />
          <form
            onSubmit={submitBook}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Book Appointment</h3>
              <button type="button" onClick={() => setBookOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              required
              value={bookDraft.fullName}
              onChange={(e) => setBookDraft({ ...bookDraft, fullName: e.target.value })}
              placeholder="Patient name"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              required
              value={bookDraft.phone}
              onChange={(e) => setBookDraft({ ...bookDraft, phone: e.target.value })}
              placeholder="Mobile"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              value={bookDraft.scheduledTime}
              onChange={(e) => setBookDraft({ ...bookDraft, scheduledTime: e.target.value })}
              placeholder="Time e.g. 04:00 PM"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              value={bookDraft.chiefComplaint}
              onChange={(e) => setBookDraft({ ...bookDraft, chiefComplaint: e.target.value })}
              placeholder="Reason / procedure"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {isDesk && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  aria-label="Book with doctor"
                  value={bookDraft.assignedDoctor}
                  onChange={(e) => {
                    const doc = treatingDoctors.find((d) => d.displayName === e.target.value);
                    setBookDraft({
                      ...bookDraft,
                      assignedDoctor: e.target.value,
                      assignedMemberId: doc?.memberId ?? null,
                    });
                  }}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                >
                  {treatingDoctors.map((d) => {
                    const key = d.memberId || d.displayName;
                    const avail = nextAvailableDayLabel(scheduleMap[key]);
                    return (
                      <option key={d.id} value={d.displayName}>
                        {d.displayName.replace(/,.*/, '')} · {d.specialty} ({avail})
                      </option>
                    );
                  })}
                </select>
                <select
                  aria-label="Preferred chair"
                  value={bookDraft.chairLabel}
                  onChange={(e) => setBookDraft({ ...bookDraft, chairLabel: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                >
                  <option value="TBD">Chair TBD</option>
                  {branchChairs.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              className="tactile-btn w-full text-xs font-semibold py-2.5 rounded-md bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            >
              Confirm Booking
            </button>
          </form>
        </div>
      )}

      {/* Front desk: seat patient to doctor + shared chair (no clinical Treat) */}
      {seatAppt && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close seat modal"
            onClick={() => setSeatApptId(null)}
          />
          <form
            onSubmit={confirmDeskSeat}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Seat patient</h3>
              <button
                type="button"
                onClick={() => setSeatApptId(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {seatAppt.patientName} · reception seats them; the treating doctor opens Treat on
              their own login. One chair can serve many doctors across the day.
            </p>
            <select
              aria-label="Treating doctor"
              value={seatDraft.doctorName}
              onChange={(e) => {
                const doc = treatingDoctors.find((d) => d.displayName === e.target.value);
                setSeatDraft({
                  ...seatDraft,
                  doctorName: e.target.value,
                  memberId: doc?.memberId ?? null,
                });
              }}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            >
              {treatingDoctors.map((d) => (
                <option key={d.id} value={d.displayName}>
                  {d.displayName} · {d.specialty}
                </option>
              ))}
            </select>
            <select
              aria-label="Chair"
              value={seatDraft.chairLabel}
              onChange={(e) => setSeatDraft({ ...seatDraft, chairLabel: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            >
              {branchChairs.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label} · {c.suiteName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="tactile-btn w-full text-xs font-semibold py-2.5 rounded-md bg-teal-600 text-white hover:bg-teal-700"
            >
              Confirm seat (no charting)
            </button>
          </form>
        </div>
      )}

      {/* Phone match — stop silent chart merge */}
      {phoneReusePrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Dismiss patient match confirm"
            onClick={() => setPhoneReusePrompt(null)}
          />
          <div
            role="alertdialog"
            aria-labelledby="phone-reuse-title"
            aria-describedby="phone-reuse-desc"
            className="relative w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="phone-reuse-title" className="text-sm font-bold text-slate-900">
                Existing patient with this mobile
              </h3>
              <button
                type="button"
                onClick={() => setPhoneReusePrompt(null)}
                className="p-1 text-slate-400 hover:text-slate-700 shrink-0"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p id="phone-reuse-desc" className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">
                {phoneReusePrompt.match.fullName}
              </span>{' '}
              already uses {phoneReusePrompt.match.phoneNumber}. Reuse their chart for this{' '}
              {phoneReusePrompt.source === 'walkin' ? 'walk-in' : 'booking'}, or create a new
              patient record?
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={confirmPhoneReuse}
                className="tactile-btn w-full text-xs font-semibold py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Reuse existing patient
              </button>
              <button
                type="button"
                onClick={createDespitePhoneMatch}
                className="w-full text-xs font-semibold py-2.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Create as new patient
              </button>
              <button
                type="button"
                onClick={() => setPhoneReusePrompt(null)}
                className="w-full text-[11px] font-medium py-2 text-slate-500 hover:text-slate-700"
              >
                Cancel — edit details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
