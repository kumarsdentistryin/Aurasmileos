import React, { useMemo, useState } from 'react';
import { Phone, Search, UserRound } from 'lucide-react';
import { Patient } from '../../domain/types';

interface PatientDirectoryProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  /** Front desk opens Bill / Rx / Consent packet for collection */
  onCollectPatient?: (patient: Patient) => void;
}

/**
 * Live front-desk patient directory — real clinic patients, not Bolna CRM theater.
 */
export const PatientDirectory: React.FC<PatientDirectoryProps> = ({
  patients,
  onSelectPatient,
  onCollectPatient,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const hay = [
        p.fullName,
        p.mrn,
        p.phoneNumber,
        p.assignedDoctorName,
        p.email ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [patients, query]);

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Patients</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clinic roster — open Today for a patient, or Collect for Bill / Rx / Consent.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients…"
            className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm"
            aria-label="Search patients"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-14 border border-dashed border-slate-200 rounded-lg bg-white">
          {patients.length === 0
            ? 'No patients yet — check in a walk-in from Today.'
            : 'No matches for that search.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-3.5">
                <button
                  type="button"
                  onClick={() => onSelectPatient?.(p)}
                  className="tactile-btn flex min-w-0 flex-1 items-start gap-3 text-left motion-colors hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-[var(--color-brand)]">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {p.fullName}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                      {p.mrn} · {p.gender}, {p.age}y
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {p.assignedDoctorName || 'Unassigned'}
                      {p.nextAppointmentDate ? ` · Next ${p.nextAppointmentDate}` : ''}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <Phone className="h-3 w-3" />
                    {p.phoneNumber}
                  </span>
                  {onCollectPatient && (
                    <button
                      type="button"
                      onClick={() => onCollectPatient(p)}
                      className="tactile-btn rounded-md bg-[var(--color-brand)] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--color-brand-hover)]"
                    >
                      Collect
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
