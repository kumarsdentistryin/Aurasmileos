import { DbClinic, getSupabase, isSupabaseConfigured } from './supabase';
import { emitFunnelStep } from './integrations/emit';
import type { FunnelStepCompletedData } from './integrations/types';

export type FunnelStep =
  | 'signup_started'
  | 'signup_completed'
  | 'clinic_created'
  | 'onboarding_branding'
  | 'onboarding_chairs'
  | 'onboarding_staff'
  | 'onboarding_completed'
  | 'demo_opened';

function readUtm(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

export async function upsertClinicLead(input: {
  email: string;
  clinicId?: string | null;
  clinicName?: string;
  phone?: string;
  city?: string;
  status?: 'SIGNED_UP' | 'ONBOARDING' | 'ACTIVE' | 'CHURNED';
}): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return null;

  const utm = readUtm();
  // RLS requires jwt email — never insert under a mismatched / unauthenticated email
  const { data: sessionData } = await sb.auth.getSession();
  const jwtEmail = sessionData.session?.user?.email?.trim().toLowerCase() ?? '';
  if (!jwtEmail) return null;
  const email = jwtEmail;

  const { data: existing } = await sb
    .from('clinic_leads')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existing?.id) {
    await sb
      .from('clinic_leads')
      .update({
        clinic_id: input.clinicId ?? undefined,
        clinic_name: input.clinicName,
        phone: input.phone,
        city: input.city,
        status: input.status ?? 'SIGNED_UP',
        updated_at: new Date().toISOString(),
        ...utm,
      })
      .eq('id', existing.id);
    return existing.id as string;
  }

  const { data, error } = await sb
    .from('clinic_leads')
    .insert({
      email,
      clinic_id: input.clinicId ?? null,
      clinic_name: input.clinicName ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      status: input.status ?? 'SIGNED_UP',
      ...utm,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[AuraSmile] clinic_leads insert:', error.message);
    return null;
  }
  return (data?.id as string) ?? null;
}

export async function trackOnboardingEvent(input: {
  step: FunnelStep | string;
  email?: string;
  clinicId?: string | null;
  leadId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return;

  const { data: sessionData } = await sb.auth.getSession();
  const jwtEmail = sessionData.session?.user?.email?.trim().toLowerCase() ?? '';
  // RLS: email must match jwt (null / spoofed inserts rejected)
  if (!jwtEmail) return;

  const { error } = await sb.from('onboarding_events').insert({
    step: input.step,
    email: jwtEmail,
    clinic_id: input.clinicId ?? null,
    lead_id: input.leadId ?? null,
    payload: input.payload ?? {},
  });

  if (error) {
    console.warn('[AuraSmile] onboarding_events:', error.message);
  }

  const funnelSteps: FunnelStepCompletedData['step'][] = [
    'signup_started',
    'signup_completed',
    'clinic_created',
    'onboarding_branding',
    'onboarding_chairs',
    'onboarding_staff',
    'onboarding_completed',
    'demo_opened',
  ];
  if (funnelSteps.includes(input.step as FunnelStepCompletedData['step'])) {
    void emitFunnelStep(input.clinicId, {
      step: input.step as FunnelStepCompletedData['step'],
      lead_id: input.leadId ?? undefined,
      email: jwtEmail,
    });
  }
}

export async function listFunnelExport(authEmail?: string | null): Promise<
  Array<{
    email: string;
    clinic_name: string | null;
    status: string;
    city: string | null;
    created_at: string;
  }>
> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return [];

  // No platform admin claim yet — filter to caller email (RLS also enforces)
  const email = authEmail?.trim().toLowerCase();
  if (!email) return [];

  const { data, error } = await sb
    .from('clinic_leads')
    .select('email, clinic_name, status, city, created_at')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[AuraSmile] listFunnelExport:', error.message);
    return [];
  }
  return (data as Array<{
    email: string;
    clinic_name: string | null;
    status: string;
    city: string | null;
    created_at: string;
  }>) ?? [];
}

export function leadsToCsv(
  rows: Array<{
    email: string;
    clinic_name: string | null;
    status: string;
    city: string | null;
    created_at: string;
  }>
): string {
  const header = 'email,clinic_name,status,city,created_at';
  const lines = rows.map((r) =>
    [r.email, r.clinic_name ?? '', r.status, r.city ?? '', r.created_at]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export type { DbClinic };
