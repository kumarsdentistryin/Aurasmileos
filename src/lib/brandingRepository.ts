import { ClinicBranding, getClinicBranding } from './clinicBranding';
import { DbClinic, getSupabase, isSupabaseConfigured } from './supabase';

const LOCAL_KEY = 'aurasmile.branding.v1';

export type ClinicBrandingDraft = {
  legalName: string;
  tagline: string;
  phone: string;
  email: string;
  addressLine: string;
  cityLine: string;
  registrationFooter: string;
  logoDataUrl: string;
  googleReviewUrl?: string;
};

function readLocalMap(): Record<string, ClinicBranding> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClinicBranding>;
  } catch {
    return {};
  }
}

export function loadLocalBranding(branchId: string): ClinicBranding | null {
  return readLocalMap()[branchId] ?? null;
}

export function saveLocalBranding(branding: ClinicBranding): void {
  const map = readLocalMap();
  map[branding.clinicId] = branding;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
}

export function dbClinicToBranding(clinic: DbClinic, fallbackBranchId: string): ClinicBranding {
  const base = getClinicBranding(fallbackBranchId);
  return {
    clinicId: fallbackBranchId,
    legalName: clinic.name || base.legalName,
    tagline: clinic.tagline || base.tagline,
    phone: clinic.phone || base.phone,
    email: clinic.email || base.email,
    addressLine: clinic.address_line || base.addressLine,
    cityLine: clinic.city_line || base.cityLine,
    logoDataUrl: clinic.logo_url || base.logoDataUrl,
    registrationFooter: clinic.registration_footer || base.registrationFooter,
    googleReviewUrl: (clinic as any).google_review_url || base.googleReviewUrl,
  };
}

export async function fetchClinicBranding(
  clinicDbId: string,
  branchUiId: string
): Promise<ClinicBranding | null> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return null;

  const { data, error } = await sb.from('clinics').select('*').eq('id', clinicDbId).maybeSingle();
  if (error) {
    console.warn('[AuraSmile] fetchClinicBranding:', error.message);
    return null;
  }
  if (!data) return null;
  return dbClinicToBranding(data as DbClinic, branchUiId);
}

export async function updateClinicBrandingProfile(
  clinicDbId: string,
  draft: ClinicBrandingDraft
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const patch: Record<string, string> = {
    name: draft.legalName,
    tagline: draft.tagline,
    phone: draft.phone,
    email: draft.email,
    address_line: draft.addressLine,
    city_line: draft.cityLine,
    registration_footer: draft.registrationFooter,
  };
  if (draft.logoDataUrl.startsWith('http')) {
    patch.logo_url = draft.logoDataUrl;
  }

  const { error } = await sb.from('clinics').update(patch).eq('id', clinicDbId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadClinicLogo(
  clinicDbId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${clinicDbId}/logo.${ext || 'png'}`;

  const { error: uploadError } = await sb.storage.from('clinic-branding').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = sb.storage.from('clinic-branding').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await sb
    .from('clinics')
    .update({ logo_url: publicUrl })
    .eq('id', clinicDbId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, publicUrl };
}

/** File → data URL for demo-mode letterhead without Storage. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}
