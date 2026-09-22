/**
 * Per-clinic print letterhead — logo, legal name, contact.
 * Live clinics: Clinic → Branding (Supabase + Storage). Demo: local override.
 */

export interface ClinicBranding {
  clinicId: string;
  legalName: string;
  tagline: string;
  phone: string;
  email: string;
  addressLine: string;
  cityLine: string;
  /** Inline SVG or PNG data URL for Rx / Consent letterhead */
  logoDataUrl: string;
  registrationFooter: string;
  /** Google My Business review link (e.g. https://g.page/r/.../review) */
  googleReviewUrl?: string;
}

/** Default AuraSmile letterhead — matches BrandMark (tooth + clinical pulse). */
export const AURASMILE_LETTERHEAD_LOGO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0F766E"/>
  <path d="M32 12c-5.5 0-10 3.8-11 9-.9 4.1.3 8.8 2.1 14.1 1.2 3.8 2.6 7.5 3.8 10.4.7 1.7 1.5 3.1 2.7 3.8.9.5 1.9.7 2.4.7s1.5-.2 2.4-.7c1.2-.7 2-2.1 2.7-3.8 1.2-2.9 2.6-6.6 3.8-10.4 1.8-5.3 3-10 2.1-14.1C42 15.8 37.5 12 32 12z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M14 31h7l3.5-7 5 14 4.5-9.5H50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

export const CLINIC_BRANDING_BY_BRANCH: Record<string, ClinicBranding> = {
  'blr-01': {
    clinicId: 'blr-01',
    legalName: 'AuraSmile Dental Care Pvt Ltd',
    tagline: 'Indiranagar Flagship · Multi-specialty dentistry',
    phone: '+91 80 4123 4567',
    email: 'indiranagar@aurasmile.clinic',
    addressLine: '100ft Road, Indiranagar',
    cityLine: 'Bengaluru 560038 · Karnataka',
    logoDataUrl: AURASMILE_LETTERHEAD_LOGO,
    registrationFooter: 'Clinic Reg: KDC/CL-44821 · GSTIN: 29AABCA1234D1Z5',
  },
  'blr-02': {
    clinicId: 'blr-02',
    legalName: 'AuraSmile Dental Care Pvt Ltd',
    tagline: 'Koramangala Center · Aesthetic & restorative',
    phone: '+91 80 4555 7788',
    email: 'koramangala@aurasmile.clinic',
    addressLine: '80ft Road, Koramangala 5th Block',
    cityLine: 'Bengaluru 560095 · Karnataka',
    logoDataUrl: AURASMILE_LETTERHEAD_LOGO,
    registrationFooter: 'Clinic Reg: KDC/CL-44822 · GSTIN: 29AABCA1234D1Z5',
  },
  'blr-03': {
    clinicId: 'blr-03',
    legalName: 'AuraSmile Dental Care Pvt Ltd',
    tagline: 'Whitefield Hub · Single-chair express care',
    phone: '+91 80 4666 9900',
    email: 'whitefield@aurasmile.clinic',
    addressLine: 'ITPL Main Road, Whitefield',
    cityLine: 'Bengaluru 560066 · Karnataka',
    logoDataUrl: AURASMILE_LETTERHEAD_LOGO,
    registrationFooter: 'Clinic Reg: KDC/CL-44823 · GSTIN: 29AABCA1234D1Z5',
  },
};

export function getClinicBranding(branchId: string): ClinicBranding {
  return CLINIC_BRANDING_BY_BRANCH[branchId] ?? CLINIC_BRANDING_BY_BRANCH['blr-01'];
}
