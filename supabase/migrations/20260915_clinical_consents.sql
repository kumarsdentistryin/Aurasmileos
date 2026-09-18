-- Clinical consents + treatment session audit (free-tier)
-- Run after 20260915_aurasmile_free_tier.sql

create table if not exists public.clinical_consents (
  id text primary key,
  clinic_id uuid references public.clinics (id) on delete set null,
  patient_id text not null,
  patient_mrn text not null,
  patient_name text not null,
  procedure_code text not null,
  procedure_title text not null,
  doctor_name text not null,
  doctor_registration text not null,
  branch_id text not null,
  signed_at timestamptz not null,
  audit_hash text not null,
  signature_data_url text,
  medical_alerts_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clinical_consents_patient_idx
  on public.clinical_consents (patient_id);

create index if not exists clinical_consents_branch_idx
  on public.clinical_consents (branch_id);

alter table public.clinical_consents enable row level security;

create policy "members read consents"
  on public.clinical_consents for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

create policy "members insert consents"
  on public.clinical_consents for insert
  with check (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

-- Optional clinic branding columns
alter table public.clinics
  add column if not exists logo_url text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists tagline text;
