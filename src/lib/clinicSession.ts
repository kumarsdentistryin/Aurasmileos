import {

  CLINIC_BRANCHES,

  CLINIC_DOCTORS,

  ClinicDoctorOption,

  ClinicSessionSelection,

  DEFAULT_CLINIC_SESSION,

  OPERATORY_CHAIRS,

  ClinicScale,

} from '../components/Auth/DoctorAuthModal';



const CLINIC_SESSION_KEY = 'aurasmile.clinicSession.v1';

const STATION_KEY = 'aurasmile.station.v1';

const LOCKED_KEY = 'aurasmile.staffLocked.v1';

const DEMO_KEY = 'aurasmile.demoMode.v1';



export type StationContext = {

  branchId: string;

  chairId: string;

  clinicScale: ClinicScale;

  clinicDbId?: string | null;

};



type StoredClinicSession = {

  doctorId: string;

  branchId: string;

  chairId: string;

  clinicScale: ClinicScale;

  clinicDbId?: string | null;

  authUserId?: string | null;

  doctorSnapshot?: ClinicSessionSelection['doctor'];

  branchSnapshot?: ClinicSessionSelection['branch'];

};



function readJson<T>(key: string, fallback: T): T {

  try {

    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw) as T;

  } catch {

    return fallback;

  }

}



export function setDemoMode(enabled: boolean): void {

  if (enabled) localStorage.setItem(DEMO_KEY, '1');

  else localStorage.removeItem(DEMO_KEY);

}



export function isDemoMode(): boolean {

  return localStorage.getItem(DEMO_KEY) === '1';

}



export function saveClinicSession(selection: ClinicSessionSelection): void {

  const stored: StoredClinicSession = {

    doctorId: selection.doctor.id,

    branchId: selection.branch.id,

    chairId: selection.chair.id,

    clinicScale: selection.clinicScale,

    clinicDbId: selection.clinicDbId ?? null,

    authUserId: selection.authUserId ?? null,

    doctorSnapshot: selection.doctor,

    branchSnapshot: selection.branch,

  };

  localStorage.setItem(CLINIC_SESSION_KEY, JSON.stringify(stored));

  saveStationContext({

    branchId: selection.branch.id,

    chairId: selection.chair.id,

    clinicScale: selection.clinicScale,

    clinicDbId: selection.clinicDbId ?? null,

  });

  setStaffLocked(false);

}



export function loadClinicSession(): ClinicSessionSelection | null {

  const stored = readJson<StoredClinicSession | null>(CLINIC_SESSION_KEY, null);

  if (!stored) return null;



  const doctor =

    CLINIC_DOCTORS.find((d) => d.id === stored.doctorId) ??

    stored.doctorSnapshot ??

    null;

  const branch =

    CLINIC_BRANCHES.find((b) => b.id === stored.branchId) ??

    stored.branchSnapshot ??

    null;

  const chair = OPERATORY_CHAIRS.find((c) => c.id === stored.chairId);

  if (!doctor || !branch || !chair) return null;



  return {

    doctor,

    branch,

    chair,

    clinicScale: stored.clinicScale ?? 'MULTI',

    clinicDbId: stored.clinicDbId ?? null,

    authUserId: stored.authUserId ?? null,

  };

}



export function clearClinicSession(): void {

  localStorage.removeItem(CLINIC_SESSION_KEY);

}



export function saveStationContext(station: StationContext): void {

  localStorage.setItem(STATION_KEY, JSON.stringify(station));

}



export function loadStationContext(): StationContext | null {

  return readJson<StationContext | null>(STATION_KEY, null);

}



/** After logout: keep branch/chair sticky for this tablet. */

export function buildSessionFromStation(

  doctor: ClinicDoctorOption | string

): ClinicSessionSelection {

  const station = loadStationContext();

  const doctorOption =

    typeof doctor === 'string'

      ? CLINIC_DOCTORS.find((d) => d.id === doctor) ?? CLINIC_DOCTORS[0]

      : doctor;

  const branch =

    CLINIC_BRANCHES.find((b) => b.id === station?.branchId) ??

    DEFAULT_CLINIC_SESSION.branch;

  const allowed = OPERATORY_CHAIRS.filter((c) => branch.chairIds.includes(c.id));

  const chair =

    allowed.find((c) => c.id === station?.chairId) ??

    allowed[0] ??

    DEFAULT_CLINIC_SESSION.chair;



  return {

    doctor: doctorOption,

    branch,

    chair,

    clinicScale: station?.clinicScale ?? 'MULTI',

    clinicDbId: station?.clinicDbId ?? null,

    authUserId: null,

  };

}



export function setStaffLocked(locked: boolean): void {

  localStorage.setItem(LOCKED_KEY, locked ? '1' : '0');

}



/** Fresh install defaults to locked — never auto-open as Vikram. */

export function isStaffLocked(): boolean {

  const v = localStorage.getItem(LOCKED_KEY);

  if (v === null) return true;

  return v === '1';

}


