-- AuraSmile OS — Supabase free-tier MVP schema
-- Run in Supabase SQL Editor (Dashboard → SQL) on your free project.
-- RLS enabled; policies use auth.uid() + clinic membership.

create extension if not exists "pgcrypto";

-- Clinics / branches
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_code text not null unique,
  city_line text not null default '',
  created_at timestamptz not null default now()
);

-- Staff membership (maps auth user → clinic + role)
create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('DOCTOR', 'FRONT_DESK', 'OWNER')),
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

-- Patients (PHI) — integer money elsewhere; chart JSON for odontogram
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  mrn text not null,
  full_name text not null,
  age int not null check (age >= 0 and age <= 120),
  gender text not null check (gender in ('M', 'F', 'OTHER')),
  phone text not null,
  blood_group text,
  assigned_doctor text,
  primary_chair text,
  dental_chart jsonb not null default '{}'::jsonb,
  medical_alerts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (clinic_id, mrn)
);

create index if not exists patients_clinic_id_idx on public.patients (clinic_id);
create index if not exists patients_phone_idx on public.patients (clinic_id, phone);

-- Today's queue appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete set null,
  patient_name text not null,
  scheduled_time text not null,
  chief_complaint text not null default '',
  status text not null check (
    status in ('IN_CHAIR', 'WAITING_IN_LOBBY', 'CONFIRMED', 'COMPLETED')
  ),
  assigned_doctor text,
  chair_label text,
  expected_fee_paise int not null default 0 check (expected_fee_paise >= 0),
  appt_date date not null default (timezone('Asia/Kolkata', now()))::date,
  created_at timestamptz not null default now()
);

create index if not exists appointments_clinic_day_idx
  on public.appointments (clinic_id, appt_date);

-- RLS
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

-- Helper: clinics the current user belongs to
create or replace function public.user_clinic_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.clinic_members where user_id = auth.uid();
$$;

create policy "members read own clinics"
  on public.clinics for select
  using (id in (select public.user_clinic_ids()));

create policy "members read membership"
  on public.clinic_members for select
  using (user_id = auth.uid() or clinic_id in (select public.user_clinic_ids()));

create policy "members read patients"
  on public.patients for select
  using (clinic_id in (select public.user_clinic_ids()));

create policy "members write patients"
  on public.patients for all
  using (clinic_id in (select public.user_clinic_ids()))
  with check (clinic_id in (select public.user_clinic_ids()));

create policy "members read appointments"
  on public.appointments for select
  using (clinic_id in (select public.user_clinic_ids()));

create policy "members write appointments"
  on public.appointments for all
  using (clinic_id in (select public.user_clinic_ids()))
  with check (clinic_id in (select public.user_clinic_ids()));

-- Seed one demo clinic (optional — run once)
insert into public.clinics (name, branch_code, city_line)
values (
  'Indiranagar Flagship',
  'BLR-01',
  '100ft Road, Indiranagar, Bengaluru'
)
on conflict (branch_code) do nothing;
