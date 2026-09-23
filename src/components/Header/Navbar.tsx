import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock, LogOut } from 'lucide-react';
import { ClinicRole, ClinicSessionSelection } from '../Auth/DoctorAuthModal';
import { ClinicBranding } from '../../lib/clinicBranding';
import { BrandMark } from '../Brand/BrandMark';

export type MainWorkspaceTab = 'home' | 'operatory' | 'crm' | 'operations';

export type OperatorySubTab =
  | 'odontogram'
  | 'plan'
  | 'casesheet'
  | 'imaging'
  | 'history'
  | 'prescriptions'
  | 'consent'
  | 'billing';

export type OpsSubTab =
  | 'labs'
  | 'inventory'
  | 'sterilization'
  | 'consultants'
  | 'schedule'
  | 'branding'
  | 'staff'
  | 'whatsapp'
  | 'dues'
  | 'profit'
  | 'subscription';

interface NavbarProps {
  activeMainTab: MainWorkspaceTab;
  onMainTabChange: (tab: MainWorkspaceTab) => void;
  activeOperatorySubTab: OperatorySubTab;
  onOperatorySubTabChange: (tab: OperatorySubTab) => void;
  activeOpsSubTab: OpsSubTab;
  onOpsSubTabChange: (tab: OpsSubTab) => void;
  session: ClinicSessionSelection;
  branding: ClinicBranding;
  onOpenSwitcher: () => void;
  onLock: () => void;
  onLogout: () => void;
  /** Live clinic: mark mock ops tabs so they are not sold as synced */
  labelMockAsDemo?: boolean;
  /** Demo sandbox — institutional badge in nav (not yellow flashbang strip) */
  isDemo?: boolean;
  /** In-app subscription plan & trial status */
  entitlement?: import('../../lib/entitlements').ClinicEntitlement;
  /** Callback to trigger Razorpay / UPI subscription modal */
  onOpenSubscription?: () => void;
}

const ALL_PRIMARY_TABS: {
  id: MainWorkspaceTab;
  label: string;
  doctorLabel: string;
  roles: ClinicRole[];
  mock?: boolean;
}[] = [
  { id: 'home', label: 'Today', doctorLabel: 'Today', roles: ['DOCTOR', 'FRONT_DESK'] },
  // Clinical charting is dentist-only (blueprint §21 / §17)
  { id: 'operatory', label: 'Treat', doctorLabel: 'Treat', roles: ['DOCTOR'] },
  // Live: real PatientDirectory; demo: DentalPipelineCRM behind same tab
  // Desk and Owner doctors can view all Patients dossiers
  { id: 'crm', label: 'Patients', doctorLabel: 'Patients', roles: ['FRONT_DESK', 'DOCTOR'] },
  // Clinic ops: desk + OWNER doctors (owner is often the treating dentist)
  { id: 'operations', label: 'Clinic', doctorLabel: 'Clinic', roles: ['FRONT_DESK', 'DOCTOR'] },
];

const OPERATORY_SUB_TABS: { id: OperatorySubTab; label: string }[] = [
  { id: 'odontogram', label: 'Teeth Chart' },
  { id: 'plan', label: 'Plan' },
  { id: 'casesheet', label: 'Notes' },
  { id: 'history', label: 'History' },
  { id: 'imaging', label: 'X-Ray' },
  { id: 'prescriptions', label: 'Medicine' },
  { id: 'consent', label: 'Consent' },
  { id: 'billing', label: 'Bill' },
];

const OPS_SUB_TABS: { id: OpsSubTab; label: string; mock?: boolean }[] = [
  { id: 'labs', label: 'Labs', mock: false },
  // Device ledger is real enough for bought-vs-spent; not supplier ERP yet
  { id: 'inventory', label: 'Stock', mock: false },
  { id: 'sterilization', label: 'Sterile', mock: false },
  { id: 'consultants', label: 'Specialists', mock: false },
  { id: 'schedule', label: 'Schedule', mock: false },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'dues', label: 'Dues', mock: false },
  { id: 'profit', label: 'Estimator', mock: false },
  { id: 'branding', label: 'Branding' },
  { id: 'staff', label: 'Staff' },
  { id: 'subscription', label: 'Plan & Billing' },
];

/**
 * Light clinical top bar — teal accents, day-long readable.
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeMainTab,
  onMainTabChange,
  activeOperatorySubTab,
  onOperatorySubTabChange,
  activeOpsSubTab,
  onOpsSubTabChange,
  session,
  branding,
  onOpenSwitcher,
  onLock,
  onLogout,
  labelMockAsDemo = false,
  isDemo = false,
  entitlement,
  onOpenSubscription,
}) => {
  const role = session.doctor.role;
  const isOwnerDoctor =
    role === 'DOCTOR' && session.doctor.memberRole === 'OWNER';
  // Live clinic: keep all ops modules visible; Demo label when sandbox
  const primaryTabs = ALL_PRIMARY_TABS.filter((t) => {
    if (!t.roles.includes(role)) return false;
    // Associate doctors cannot open Clinic ops — owners can
    if (t.id === 'operations' && role === 'DOCTOR' && !isOwnerDoctor) return false;
    return isDemo || !t.mock;
  });
  const opsSubTabs = OPS_SUB_TABS;
  const showOperatorySubNav = activeMainTab === 'operatory';
  const showOpsSubNav = activeMainTab === 'operations';
  const branchShort = session.branch.name.split(' ')[0] ?? session.branch.code;
  const clinicShort =
    branding.legalName.replace(/\s+(Pvt\.?\s*Ltd\.?|Private Limited|Clinic|Dental Care).*$/i, '').trim() ||
    branding.legalName;
  const doctorShort = session.doctor.displayName.replace(/,.*$/, '').trim();
  const isDesk = role === 'FRONT_DESK';

  // Format subscription pill label
  const isTrial = entitlement?.subscriptionStatus === 'trialing';
  const planLabel = entitlement?.plan === 'ai_voice' 
    ? 'AI Voice Plan' 
    : entitlement?.plan === 'growth' 
      ? 'Growth Plan' 
      : entitlement?.plan === 'starter' || (entitlement?.plan as string) === 'core'
        ? 'Core Plan' 
        : 'Active Plan';

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-slate-200 text-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-[52px] flex items-center gap-3 flex-nowrap">
        <button
          type="button"
          onClick={() => onMainTabChange('home')}
          className="tactile-btn shrink-0 text-left leading-tight flex items-center gap-2 max-w-[220px]"
          aria-label={`${clinicShort} — Today`}
        >
          <BrandMark size="w-8 h-8" />
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-slate-900 truncate">
              {clinicShort}
            </span>
            <span className="block text-[11px] text-slate-500 font-medium truncate">
              {branchShort}
            </span>
          </span>
        </button>

        <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
          {primaryTabs.map((tab) => {
            const isActive = activeMainTab === tab.id;
            const base = role === 'DOCTOR' ? tab.doctorLabel : tab.label;
            const label =
              labelMockAsDemo && tab.mock ? `${base} · Demo` : base;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onMainTabChange(tab.id)}
                className={`tactile-btn relative h-10 px-3.5 text-sm font-semibold whitespace-nowrap rounded-md motion-colors ${
                  isActive
                    ? 'bg-teal-50 text-[var(--color-brand)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-2 h-9 pl-2.5 pr-2.5 rounded-lg bg-[#0F172A] text-slate-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />
              Demo
              <Link to="/" className="text-slate-400 hover:text-white underline-offset-2 hover:underline">
                Home
              </Link>
              <span className="text-slate-600">·</span>
              <Link to="/signup" className="text-slate-400 hover:text-white underline-offset-2 hover:underline">
                Create clinic
              </Link>
            </div>
          )}

          {onOpenSubscription && (
            <button
              type="button"
              onClick={onOpenSubscription}
              className={`tactile-btn hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold border motion-colors ${
                isTrial
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
              }`}
              title="Manage Clinic Subscription & Billing"
            >
              <span className={`w-2 h-2 rounded-full ${isTrial ? 'bg-amber-500 animate-pulse' : 'bg-teal-600'}`} />
              <span>{isTrial ? 'Free Trial · Upgrade' : planLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSwitcher}
            className="tactile-btn inline-flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 motion-colors"
            title="Switch Doctor / Profile"
          >
            <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                {isDesk ? 'Front desk' : doctorShort}
              </span>
              <span className="text-[10px] text-teal-700 font-medium truncate max-w-[130px]">
                {isDesk ? 'Reception' : session.doctor.memberRole === 'OWNER' ? 'Clinic Owner' : (session.doctor.specialty || 'Dentist')}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onLock}
            className="tactile-btn h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="Lock screen"
            aria-label="Lock screen"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="tactile-btn h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {(showOperatorySubNav || showOpsSubNav) && (
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto flex h-9 max-w-7xl items-center gap-1 overflow-x-auto px-4">
            {showOperatorySubNav &&
              OPERATORY_SUB_TABS.map((item) => {
                const isActive = activeOperatorySubTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOperatorySubTabChange(item.id)}
                    className={`tactile-btn h-8 whitespace-nowrap rounded-md px-3 text-xs font-semibold motion-colors ${
                      isActive
                        ? 'bg-slate-100 text-[var(--color-brand)]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

            {showOpsSubNav &&
              opsSubTabs.map((item) => {
                const isActive = activeOpsSubTab === item.id;
                const label =
                  labelMockAsDemo && item.mock
                    ? `${item.label} · Demo`
                    : item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpsSubTabChange(item.id)}
                    className={`tactile-btn h-8 whitespace-nowrap rounded-md px-3 text-xs font-semibold motion-colors ${
                      isActive
                        ? 'bg-slate-100 text-[var(--color-brand)]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </header>
  );
};
