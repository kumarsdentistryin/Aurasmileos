import React from 'react';
import { Patient } from '../../domain/types';
import { AlertTriangle, Calendar, Phone, Armchair, ChevronDown } from 'lucide-react';

interface PatientBannerProps {
  currentPatient: Patient;
  allPatients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Sticky treat-strip: critical alerts stay visible while charting.
 * Nav (52) + operatory subnav (36) ≈ 88px — banner sticks under that.
 */
export const PatientBanner: React.FC<PatientBannerProps> = ({
  currentPatient,
  allPatients,
  onSelectPatient,
}) => {
  const hasCritical = currentPatient.medicalAlerts.some((a) => a.severity === 'CRITICAL');
  const sortedAlerts = [...currentPatient.medicalAlerts].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'CRITICAL' ? -1 : 1;
  });

  return (
    <div
      className={`sticky top-[88px] z-40 border-b bg-[var(--color-surface)]/95 backdrop-blur-sm ${
        hasCritical ? 'border-b-2 border-[var(--alert-danger-border)]' : 'border-slate-200/90'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        {sortedAlerts.length > 0 && (
          <div className="mb-2.5 space-y-1.5">
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <AlertTriangle
                className={`h-3 w-3 ${hasCritical ? 'text-[var(--alert-danger-text)]' : 'text-amber-600'}`}
              />
              Medical alerts
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {sortedAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg border px-2.5 py-1.5 text-left ${
                      isCritical
                        ? 'border-[var(--alert-danger-border)] bg-[var(--alert-danger-bg)]'
                        : 'border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)]'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${
                        isCritical
                          ? 'text-[var(--alert-danger-text)]'
                          : 'text-[var(--alert-warning-text)]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          isCritical ? 'bg-rose-600' : 'bg-amber-600'
                        }`}
                      />
                      {alert.label}
                    </div>
                    {isCritical && alert.clinicalImplication && (
                      <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-[var(--alert-danger-text)]/90">
                        {alert.clinicalImplication}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)] text-[13px] font-bold tracking-wide text-white"
            aria-hidden
          >
            {initials(currentPatient.fullName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <div className="relative inline-block max-w-full">
                <select
                  aria-label="Select clinical patient"
                  value={currentPatient.id}
                  onChange={(e) => {
                    const found = allPatients.find((p) => p.id === e.target.value);
                    if (found) onSelectPatient(found);
                  }}
                  className="appearance-none max-w-[min(100%,18rem)] cursor-pointer truncate rounded bg-transparent pr-7 text-[15px] font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30"
                >
                  {allPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.gender}, {p.age}y)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>

              <span className="text-[11px] text-slate-500">
                <span className="font-medium text-slate-400">MRN</span>{' '}
                <span className="font-mono font-semibold text-slate-700">{currentPatient.mrn}</span>
              </span>
              <span className="text-[11px] text-slate-500">
                <span className="font-medium text-slate-400">Blood</span>{' '}
                <span className="font-semibold text-slate-700">{currentPatient.bloodGroup}</span>
              </span>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="font-mono text-slate-700">{currentPatient.phoneNumber}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Armchair className="h-3 w-3 text-[var(--color-brand)]" />
                <span className="text-slate-700">{currentPatient.primaryChair}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>
                  Next{' '}
                  <span className="font-medium text-slate-700">
                    {currentPatient.nextAppointmentDate || 'Not scheduled'}
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {sortedAlerts.length === 0 && (
          <p className="mt-1.5 text-[11px] text-slate-400">No known medical alerts</p>
        )}
      </div>
    </div>
  );
};
