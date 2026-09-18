-- AuraSmile OS — patient/appointment columns for live chairside sync
-- Run after 20260915_clinical_consents.sql

alter table public.patients
  add column if not exists email text,
  add column if not exists address_city text not null default '',
  add column if not exists last_visit_date date,
  add column if not exists next_appointment_date text;

alter table public.appointments
  add column if not exists age int not null default 0,
  add column if not exists gender text not null default 'OTHER'
    check (gender in ('M', 'F', 'OTHER')),
  add column if not exists phone text not null default '';

-- Members may update their own clinic's branding fields (logo / contact)
drop policy if exists "members update clinic profile" on public.clinics;
create policy "members update clinic profile"
  on public.clinics for update
  using (id in (select public.user_clinic_ids()))
  with check (id in (select public.user_clinic_ids()));
