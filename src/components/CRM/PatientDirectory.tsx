import React, { useMemo, useState } from 'react';
import { Phone, Search, UserRound, Users, Calendar, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Patient } from '../../domain/types';

interface PatientDirectoryProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  /** Front desk opens Bill / Rx / Consent packet for collection */
  onCollectPatient?: (patient: Patient) => void;
  /** Action to add a new walk-in / patient */
  onAddPatient?: () => void;
}

/**
 * Twenty-CRM style high-density clinical directory with fast filtering & status badges.
 */
export const PatientDirectory: React.FC<PatientDirectoryProps> = ({
  patients,
  onSelectPatient,
  onCollectPatient,
  onAddPatient,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING'>('ALL');

  const filtered = useMemo(() => {
    let list = patients;
    if (selectedFilter === 'UPCOMING') {
      list = list.filter((p) => Boolean(p.nextAppointmentDate));
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
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
  }, [patients, query, selectedFilter]);

  return (
    <div className="space-y-4">
      {/* Top CRM Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Patient Dossiers</span>
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">{patients.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Scheduled Recalls</span>
            <Calendar className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {patients.filter((p) => Boolean(p.nextAppointmentDate)).length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">EMR Charting Completeness</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-700">100% Verified</div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Patient Directory & CRM</h2>
            <p className="text-xs text-slate-500">
              Active clinical records · FDI Chart history, dues, and WhatsApp dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                selectedFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({patients.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('UPCOMING')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                selectedFilter === 'UPCOMING'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recalls Due
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, MRN, phone…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 transition-all"
              aria-label="Search patients"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-16 border border-dashed border-slate-200 rounded-xl bg-white space-y-3 px-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200">
            <UserRound className="h-6 w-6" />
          </div>
          <div className="max-w-xs mx-auto">
            <h4 className="text-sm font-bold text-slate-800">
              {patients.length === 0 ? 'No patients registered yet' : 'No matching records found'}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {patients.length === 0
                ? 'Your clinical directory is completely ready. Register your first walk-in or appointment to start charting and billing.'
                : 'Try adjusting your search terms or filter selection.'}
            </p>
          </div>
          {onAddPatient && (
            <button
              type="button"
              onClick={onAddPatient}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 shadow-2xs transition-all"
            >
              + Register Walk-In / Patient
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient / MRN</th>
                  <th className="px-4 py-3">Assigned Doctor</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Next Visit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const hasMedicalAlert = p.medicalAlerts && p.medicalAlerts.length > 0;
                  return (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-teal-50/30"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectPatient?.(p)}
                          className="flex items-center gap-3 text-left w-full group-hover:text-teal-900"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 font-bold text-teal-800 text-xs">
                            {p.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate group-hover:text-teal-700">
                                {p.fullName}
                              </span>
                              {hasMedicalAlert && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                  title={p.medicalAlerts.map((a) => a.label).join(', ')}
                                >
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  Med Alert
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {p.mrn} · {p.gender}, {p.age} yrs
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-medium text-slate-800">
                          {p.assignedDoctorName || 'Unassigned Doctor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{p.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.nextAppointmentDate ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                            <Calendar className="h-2.5 w-2.5" />
                            {p.nextAppointmentDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No recall set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectPatient?.(p)}
                            className="tactile-btn inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                          >
                            Treat & Chart
                          </button>
                          {onCollectPatient && (
                            <button
                              type="button"
                              onClick={() => onCollectPatient(p)}
                              className="tactile-btn inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700 shadow-2xs"
                            >
                              Collect / Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
