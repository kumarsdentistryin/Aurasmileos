import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsToCsv, listFunnelExport } from '../lib/funnelTracking';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

/** Simple CSV export for sales tracking — Sales OS ingest later. */
export const FunnelAdminPage: React.FC = () => {
  const [rows, setRows] = useState<
    Array<{
      email: string;
      clinic_name: string | null;
      status: string;
      city: string | null;
      created_at: string;
    }>
  >([]);
  const [note, setNote] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!isSupabaseConfigured()) {
        setNote('Supabase not configured');
        setReady(true);
        return;
      }
      const sb = getSupabase();
      if (!sb) {
        setNote('Supabase not configured');
        setReady(true);
        return;
      }
      const { data } = await sb.auth.getSession();
      const email = data.session?.user?.email?.trim().toLowerCase() ?? null;
      if (!email) {
        setAuthedEmail(null);
        setNote('Sign in required to view funnel export');
        setReady(true);
        return;
      }
      setAuthedEmail(email);
      const leads = await listFunnelExport(email);
      setRows(leads);
      setNote(leads.length === 0 ? 'No leads for your account yet' : null);
      setReady(true);
    })();
  }, []);

  const download = () => {
    const csv = leadsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurasmile-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canExport = Boolean(authedEmail) && rows.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/" className="text-xs text-teal-800 font-semibold">
              ← AuraSmile
            </Link>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Signup funnel</h1>
            <p className="text-[12px] text-slate-500">
              Export for Sales OS — scoped to your login (no platform admin yet).
            </p>
          </div>
          {authedEmail ? (
            <button
              type="button"
              onClick={download}
              disabled={!canExport}
              className="tactile-btn text-xs font-semibold px-3 py-2 rounded-md bg-teal-700 text-white disabled:opacity-40"
            >
              Export CSV
            </button>
          ) : null}
        </div>
        {ready && note && <p className="text-sm text-slate-500 mb-4">{note}</p>}
        {ready && !authedEmail ? (
          <p className="text-sm text-slate-600">
            <Link to="/login" className="text-teal-800 font-semibold underline">
              Sign in
            </Link>{' '}
            to view your funnel export.
          </p>
        ) : null}
        {authedEmail ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Clinic</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">City</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.email}-${r.created_at}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">{r.clinic_name ?? '—'}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.city ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};
