-- Clinical notes + prescriptions (device already persists; cloud when clinic bound)
-- Run after 20260915_clinical_consents.sql

create table if not exists public.clinical_case_sheets (
  id text primary key,
  clinic_id uuid references public.clinics (id) on delete set null,
  patient_id text not null,
  target_tooth_id int,
  timestamp timestamptz not null,
  chief_complaint text not null default '',
  clinical_examination_notes text not null default '',
  provisional_diagnosis text not null default '',
  treatment_plan_summary jsonb not null default '[]'::jsonb,
  attending_doctor_name text not null default '',
  doctor_registration text not null default '',
  vitality_tests jsonb not null default '{}'::jsonb,
  endo_measurements jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clinical_case_sheets_clinic_idx
  on public.clinical_case_sheets (clinic_id, timestamp desc);

create index if not exists clinical_case_sheets_patient_idx
  on public.clinical_case_sheets (patient_id, timestamp desc);

alter table public.clinical_case_sheets enable row level security;

drop policy if exists "members read case sheets" on public.clinical_case_sheets;
create policy "members read case sheets"
  on public.clinical_case_sheets for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members insert case sheets" on public.clinical_case_sheets;
create policy "members insert case sheets"
  on public.clinical_case_sheets for insert
  with check (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

create table if not exists public.clinical_prescriptions (
  id text primary key,
  clinic_id uuid references public.clinics (id) on delete set null,
  patient_id text not null,
  patient_mrn text not null,
  patient_name text not null,
  doctor_name text not null,
  doctor_registration text not null default '',
  diagnosis text not null default '',
  drugs jsonb not null default '[]'::jsonb,
  advice text not null default '',
  issued_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists clinical_prescriptions_clinic_idx
  on public.clinical_prescriptions (clinic_id, issued_at desc);

create index if not exists clinical_prescriptions_patient_idx
  on public.clinical_prescriptions (patient_id, issued_at desc);

alter table public.clinical_prescriptions enable row level security;

drop policy if exists "members read prescriptions" on public.clinical_prescriptions;
create policy "members read prescriptions"
  on public.clinical_prescriptions for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members insert prescriptions" on public.clinical_prescriptions;
create policy "members insert prescriptions"
  on public.clinical_prescriptions for insert
  with check (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );
