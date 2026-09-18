-- Sales readiness: 14-day trial clock on clinic create; clamp chairs 1–3

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
  v_chairs int := greatest(1, least(3, coalesce(p_chair_count, 3)));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.clinics (
    name,
    branch_code,
    city_line,
    phone,
    chair_count,
    plan,
    subscription_status,
    trial_started_at,
    trial_ends_at
  )
  values (
    p_name,
    p_branch_code,
    coalesce(p_city_line, ''),
    p_phone,
    v_chairs,
    'free_trial',
    'trialing',
    now(),
    now() + interval '14 days'
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

-- Backfill open pilots that never received a trial clock (keep writable for 14 days from now)
update public.clinics
set
  trial_started_at = coalesce(trial_started_at, now()),
  trial_ends_at = coalesce(trial_ends_at, now() + interval '14 days'),
  plan = coalesce(plan, 'free_trial'),
  subscription_status = coalesce(subscription_status, 'trialing')
where subscription_status = 'trialing'
  and trial_ends_at is null;
