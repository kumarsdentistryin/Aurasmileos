-- AuraSmile OS — clinic onboarding, specialty roster, assign-by-member, funnel tracking
-- Run after 20260915_clinic_branding_storage.sql / clinical_receipts as needed.

-- Staff specialty + invite claim (user_id nullable until staff claims invite)
alter table public.clinic_members
  alter column user_id drop not null;

alter table public.clinic_members
  add column if not exists specialty text not null default 'GENERAL'
    check (specialty in (
      'PEDIATRIC',
      'ORAL_SURGERY',
      'MICRO_ENDO',
      'GENERAL',
      'FRONT_DESK'
    )),
  add column if not exists invite_email text,
  add column if not exists invite_status text not null default 'ACTIVE'
    check (invite_status in ('PENDING', 'ACTIVE', 'REVOKED'));

-- Unique invite email per clinic when present
create unique index if not exists clinic_members_clinic_invite_email_uidx
  on public.clinic_members (clinic_id, lower(invite_email))
  where invite_email is not null;

-- Chair count on clinic for onboarding
alter table public.clinics
  add column if not exists chair_count int not null default 3
    check (chair_count >= 1 and chair_count <= 3),
  add column if not exists onboarding_completed_at timestamptz;

-- Assign by clinic_members.id (keep assigned_doctor as display cache)
alter table public.patients
  add column if not exists assigned_member_id uuid references public.clinic_members (id) on delete set null;

alter table public.appointments
  add column if not exists assigned_member_id uuid references public.clinic_members (id) on delete set null;

create index if not exists patients_assigned_member_idx
  on public.patients (clinic_id, assigned_member_id);

create index if not exists appointments_assigned_member_idx
  on public.appointments (clinic_id, assigned_member_id);

-- Funnel / sales tracking
create table if not exists public.clinic_leads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics (id) on delete set null,
  email text not null,
  clinic_name text,
  phone text,
  city text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'SIGNED_UP'
    check (status in ('SIGNED_UP', 'ONBOARDING', 'ACTIVE', 'CHURNED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics (id) on delete set null,
  lead_id uuid references public.clinic_leads (id) on delete set null,
  email text,
  step text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clinic_leads_email_idx on public.clinic_leads (lower(email));
create index if not exists onboarding_events_clinic_idx on public.onboarding_events (clinic_id, created_at desc);

alter table public.clinic_leads enable row level security;
alter table public.onboarding_events enable row level security;

-- Authenticated user may insert their own lead/events during signup/onboarding
drop policy if exists "auth insert own lead" on public.clinic_leads;
create policy "auth insert own lead"
  on public.clinic_leads for insert
  to authenticated
  with check (true);

drop policy if exists "members read own clinic leads" on public.clinic_leads;
create policy "members read own clinic leads"
  on public.clinic_leads for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "auth update own lead" on public.clinic_leads;
create policy "auth update own lead"
  on public.clinic_leads for update
  using (
    clinic_id in (select public.user_clinic_ids())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "auth insert onboarding events" on public.onboarding_events;
create policy "auth insert onboarding events"
  on public.onboarding_events for insert
  to authenticated
  with check (true);

drop policy if exists "members read onboarding events" on public.onboarding_events;
create policy "members read onboarding events"
  on public.onboarding_events for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Allow authenticated users to create a clinic (OWNER path)
drop policy if exists "auth create clinic" on public.clinics;
create policy "auth create clinic"
  on public.clinics for insert
  to authenticated
  with check (true);

-- Members may insert/update/delete roster for their clinics (OWNER/desk staff admin)
drop policy if exists "members insert membership" on public.clinic_members;
create policy "members insert membership"
  on public.clinic_members for insert
  to authenticated
  with check (
    -- Self OWNER row on brand-new clinic (no members yet), or existing member adding staff
    user_id = auth.uid()
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members update membership" on public.clinic_members;
create policy "members update membership"
  on public.clinic_members for update
  using (
    user_id = auth.uid()
    or clinic_id in (select public.user_clinic_ids())
  )
  with check (
    user_id = auth.uid()
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members delete membership" on public.clinic_members;
create policy "members delete membership"
  on public.clinic_members for delete
  using (clinic_id in (select public.user_clinic_ids()));

-- Claim pending invite by matching auth email
create or replace function public.claim_clinic_invite()
returns setof public.clinic_members
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text;
begin
  auth_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if auth_email = '' or auth.uid() is null then
    return;
  end if;

  update public.clinic_members
  set
    user_id = auth.uid(),
    invite_status = 'ACTIVE'
  where
    lower(invite_email) = auth_email
    and (user_id is null or user_id = auth.uid())
    and invite_status in ('PENDING', 'ACTIVE');

  return query
    select *
    from public.clinic_members
    where user_id = auth.uid();
end;
$$;

grant execute on function public.claim_clinic_invite() to authenticated;

-- Atomic create clinic + OWNER membership (avoids RLS chicken-and-egg)
create or replace function public.create_clinic_with_owner(
  p_name text,
  p_branch_code text,
  p_city_line text default '',
  p_phone text default null,
  p_chair_count int default 3,
  p_display_name text default null
)
returns public.clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic public.clinics;
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.clinics (name, branch_code, city_line, phone, chair_count)
  values (
    p_name,
    p_branch_code,
    coalesce(p_city_line, ''),
    p_phone,
    greatest(1, least(3, coalesce(p_chair_count, 3)))
  )
  returning * into v_clinic;

  insert into public.clinic_members (
    clinic_id, user_id, display_name, role, specialty, invite_email, invite_status
  ) values (
    v_clinic.id,
    v_uid,
    coalesce(nullif(trim(p_display_name), ''), 'Clinic Owner'),
    'OWNER',
    'GENERAL',
    nullif(v_email, ''),
    'ACTIVE'
  );

  return v_clinic;
end;
$$;

grant execute on function public.create_clinic_with_owner(text, text, text, text, int, text) to authenticated;
