import React, { useEffect, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { ClinicBranding } from '../../lib/clinicBranding';
import {
  ClinicBrandingDraft,
  fileToDataUrl,
  saveLocalBranding,
  updateClinicBrandingProfile,
  uploadClinicLogo,
} from '../../lib/brandingRepository';

interface ClinicBrandingSettingsProps {
  branding: ClinicBranding;
  clinicDbId: string | null;
  onSaved: (next: ClinicBranding) => void;
}

export const ClinicBrandingSettings: React.FC<ClinicBrandingSettingsProps> = ({
  branding,
  clinicDbId,
  onSaved,
}) => {
  const [draft, setDraft] = useState<ClinicBrandingDraft>({
    legalName: branding.legalName,
    tagline: branding.tagline,
    phone: branding.phone,
    email: branding.email,
    addressLine: branding.addressLine,
    cityLine: branding.cityLine,
    registrationFooter: branding.registrationFooter,
    logoDataUrl: branding.logoDataUrl,
    googleReviewUrl: branding.googleReviewUrl || '',
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      legalName: branding.legalName,
      tagline: branding.tagline,
      phone: branding.phone,
      email: branding.email,
      addressLine: branding.addressLine,
      cityLine: branding.cityLine,
      registrationFooter: branding.registrationFooter,
      logoDataUrl: branding.logoDataUrl,
      googleReviewUrl: branding.googleReviewUrl || '',
    });
  }, [branding]);

  const setField = <K extends keyof ClinicBrandingDraft>(key: K, value: ClinicBrandingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoPick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Please choose a PNG, JPG, or SVG logo.');
      return;
    }
    if (file.size > 2_000_000) {
      setStatus('Logo must be under 2 MB.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      if (clinicDbId) {
        const uploaded = await uploadClinicLogo(clinicDbId, file);
        if (!uploaded.ok) {
          setStatus(uploaded.error);
          return;
        }
        setField('logoDataUrl', uploaded.publicUrl);
        setStatus('Logo uploaded to clinic Storage.');
      } else {
        const dataUrl = await fileToDataUrl(file);
        setField('logoDataUrl', dataUrl);
        setStatus('Logo ready (demo — saved on this device when you click Save).');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    const next: ClinicBranding = {
      clinicId: branding.clinicId,
      legalName: draft.legalName.trim() || branding.legalName,
      tagline: draft.tagline.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      addressLine: draft.addressLine.trim(),
      cityLine: draft.cityLine.trim(),
      logoDataUrl: draft.logoDataUrl,
      registrationFooter: draft.registrationFooter.trim(),
      googleReviewUrl: draft.googleReviewUrl?.trim() || undefined,
    };

    try {
      if (clinicDbId) {
        const result = await updateClinicBrandingProfile(clinicDbId, {
          ...draft,
          logoDataUrl: next.logoDataUrl,
        });
        if (!result.ok) {
          setStatus(result.error);
          return;
        }
        // Keep logo_url if we already uploaded; also persist text fields
        onSaved(next);
        setStatus('Clinic branding saved to Supabase.');
      } else {
        saveLocalBranding(next);
        onSaved(next);
        setStatus('Demo branding saved on this device (add Supabase for pan-India sync).');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Clinic branding</h2>
        <p className="text-[12px] text-slate-500 mt-1">
          Letterhead for Rx, consent, and lock screen. {clinicDbId ? 'Live clinic profile.' : 'Demo mode — local only.'}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
            {draft.logoDataUrl ? (
              <img src={draft.logoDataUrl} alt="Clinic logo" className="w-full h-full object-contain" />
            ) : (
              <ImagePlus className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Logo
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={busy}
              onChange={(e) => void handleLogoPick(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-teal-50 file:text-teal-800 file:font-semibold"
            />
            <p className="text-[11px] text-slate-400">PNG / JPG / SVG · max 2 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[11px] text-slate-600 space-y-1 sm:col-span-2">
            <span>Legal clinic name</span>
            <input
              value={draft.legalName}
              onChange={(e) => setField('legalName', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1 sm:col-span-2">
            <span>Tagline</span>
            <input
              value={draft.tagline}
              onChange={(e) => setField('tagline', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1">
            <span>Phone</span>
            <input
              value={draft.phone}
              onChange={(e) => setField('phone', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1">
            <span>Email</span>
            <input
              value={draft.email}
              onChange={(e) => setField('email', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1">
            <span>Address line</span>
            <input
              value={draft.addressLine}
              onChange={(e) => setField('addressLine', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1">
            <span>City / state line</span>
            <input
              value={draft.cityLine}
              onChange={(e) => setField('cityLine', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1 sm:col-span-2">
            <span>Registration / GST footer</span>
            <input
              value={draft.registrationFooter}
              onChange={(e) => setField('registrationFooter', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Clinic Reg · GSTIN"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1 sm:col-span-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="text-amber-500">★</span> Google My Business (GMB) Review Link
            </span>
            <input
              value={draft.googleReviewUrl || ''}
              onChange={(e) => setField('googleReviewUrl', e.target.value)}
              className="w-full rounded-md border border-amber-300 bg-amber-50/30 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              placeholder="e.g. https://g.page/r/YOUR_CLINIC_ID/review or https://maps.app.goo.gl/..."
            />
            <span className="block text-[11px] text-slate-500">
              Enables 1-tap WhatsApp 5-star review collection upon patient checkout to boost your clinic's Google Maps ranking.
            </span>
          </label>
        </div>

        {status && (
          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {busy ? 'Saving…' : 'Save branding'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Print preview
        </p>
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <img src={draft.logoDataUrl} alt="" className="w-12 h-12 object-contain rounded-md" />
          <div>
            <div className="text-sm font-bold text-slate-900">{draft.legalName || 'Clinic name'}</div>
            <div className="text-[11px] text-slate-500">{draft.tagline}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {draft.addressLine}, {draft.cityLine} · {draft.phone}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-2">{draft.registrationFooter}</div>
      </div>
    </div>
  );
};
