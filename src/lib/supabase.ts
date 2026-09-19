import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * AuraSmile OS — Supabase free-tier client.
 * Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in `.env.local`.
 * Until keys exist, `isSupabaseConfigured()` is false and the app stays on mock data.
 */

const DEFAULT_SUPABASE_URL = 'https://axhmbluvfsylifsvachc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aG1ibHV2ZnN5bGlmc3ZhY2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzcyMTEsImV4cCI6MjEwNTIxMzIxMX0.Fy7FtXlzYFC9gMqUVL18WgmjvzyN9LSIJT3QrKgoxNI';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const url = rawUrl && rawUrl.startsWith('http') ? rawUrl : DEFAULT_SUPABASE_URL;
const anonKey =
  rawAnonKey && rawAnonKey.length > 20 && !rawAnonKey.includes('YOUR_')
    ? rawAnonKey
    : DEFAULT_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

/** Public table shapes for free-tier MVP (see supabase/migrations). */
export type DbClinic = {
  id: string;
  name: string;
  branch_code: string;
  city_line: string;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  tagline?: string | null;
  address_line?: string | null;
  registration_footer?: string | null;
  chair_count?: number;
  onboarding_completed_at?: string | null;
  /** Billing / trial — present after 20260915_clinic_billing.sql */
  plan?: 'free_trial' | 'starter' | 'pro' | null;
  trial_ends_at?: string | null;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'expired' | null;
};

export type DbClinicMember = {
  id: string;
  clinic_id: string;
  user_id: string | null;
  display_name: string;
  role: 'DOCTOR' | 'FRONT_DESK' | 'OWNER';
  specialty?: string;
  invite_email?: string | null;
  invite_status?: string;
  created_at: string;
};

export type DbPatient = {
  id: string;
  clinic_id: string;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  email: string | null;
  address_city: string;
  blood_group: string | null;
  assigned_doctor: string | null;
  assigned_member_id?: string | null;
  primary_chair: string | null;
  dental_chart: Record<string, unknown>;
  /** Present after 20260917 migration; omitted rows read as []. */
  treatment_plan_lines?: unknown;
  medical_alerts: unknown;
  last_visit_date: string | null;
  next_appointment_date: string | null;
  created_at?: string;
};

export type DbAppointment = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string;
  age: number;
  gender: string;
  phone: string;
  scheduled_time: string;
  chief_complaint: string;
  status: string;
  assigned_doctor: string | null;
  assigned_member_id?: string | null;
  chair_label: string | null;
  expected_fee_paise: number;
  appt_date: string;
  created_at?: string;
};
