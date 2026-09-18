-- AuraSmile OS — Critical RLS harden (2026-09-16)
-- Close: self-join membership, REVOKED still in user_clinic_ids,
-- funnel/consent/receipt clinic_id IS NULL reads, non-OWNER membership updates,
-- funnel insert with check (true) spam, doctor-scoped patients/appointments.
--
-- Checklist covered by this migration:
-- 1) No self-join any clinic (members insert → OWNER only; bootstrap via RPC)
-- 2) user_clinic_ids ACTIVE only; revoke_clinic_member nulls user_id
-- 3) Membership update/delete OWNER-only
-- 4) Funnel: drop clinic_id IS NULL select blanket; bind lead insert to jwt email
-- 5) Funnel insert with check NOT true (jwt email required on leads + events)
-- 6) Consent/receipts null clinic_id read policies tightened
-- 7) Doctor-scoped RLS on patients/appointments (DOCTOR = assigned_member_id match;
--    null assigned = desk/OWNER only; FRONT_DESK + OWNER see all)

-- 1) Membership helper: ACTIVE only (REVOKED lose PHI via user_clinic_ids)
create or replace function public.user_clinic_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id
  from public.clinic_members
  where user_id = auth.uid()
    and invite_status = 'ACTIVE';
$$;

-- OWNER check (security definer — avoids clinic_members RLS recursion in policies)
create or replace function public.is_clinic_owner(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members
    where clinic_id = p_clinic_id
      and user_id = auth.uid()
      and role = 'OWNER'
      and invite_status = 'ACTIVE'
  );
$$;

grant execute on function public.is_clinic_owner(uuid) to authenticated;

-- Desk / OWNER see full clinic PHI; DOCTOR is assignment-scoped
create or replace function public.clinic_member_sees_all(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members
    where clinic_id = p_clinic_id
      and user_id = auth.uid()
      and invite_status = 'ACTIVE'
      and role in ('OWNER', 'FRONT_DESK')
  );
$$;

grant execute on function public.clinic_member_sees_all(uuid) to authenticated;

-- Active member row id for current user in a clinic (DOCTOR assignment match)
create or replace function public.my_clinic_member_id(p_clinic_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.clinic_members
  where clinic_id = p_clinic_id
    and user_id = auth.uid()
    and invite_status = 'ACTIVE'
  order by created_at asc
  limit 1;
$$;

grant execute on function public.my_clinic_member_id(uuid) to authenticated;

-- Row visible: desk/OWNER all; DOCTOR only when assigned_member_id = their member id
-- (assigned_member_id IS NULL is desk-only — doctors do not see unassigned rows)
create or replace function public.can_access_assigned_row(
  p_clinic_id uuid,
  p_assigned_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_clinic_id in (select public.user_clinic_ids())
    and (
      public.clinic_member_sees_all(p_clinic_id)
      or (
        p_assigned_member_id is not null
        and p_assigned_member_id = public.my_clinic_member_id(p_clinic_id)
      )
    );
$$;

grant execute on function public.can_access_assigned_row(uuid, uuid) to authenticated;

-- 2) clinic_members: no self-join; insert only as OWNER (invites) or via SECURITY DEFINER RPCs
drop policy if exists "members insert membership" on public.clinic_members;
drop policy if exists "owners insert membership" on public.clinic_members;
create policy "owners insert membership"
  on public.clinic_members for insert
  to authenticated
  with check (public.is_clinic_owner(clinic_id));

drop policy if exists "members update membership" on public.clinic_members;
drop policy if exists "owners update membership" on public.clinic_members;
create policy "owners update membership"
  on public.clinic_members for update
  to authenticated
  using (public.is_clinic_owner(clinic_id))
  with check (public.is_clinic_owner(clinic_id));

drop policy if exists "members delete membership" on public.clinic_members;
drop policy if exists "owners delete membership" on public.clinic_members;
create policy "owners delete membership"
  on public.clinic_members for delete
  to authenticated
  using (public.is_clinic_owner(clinic_id));

-- Revoke: OWNER path clears invite_status + user_id so PHI access dies
create or replace function public.revoke_clinic_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select clinic_id into v_clinic
  from public.clinic_members
  where id = p_member_id;

  if v_clinic is null then
    raise exception 'Member not found';
  end if;

  if not public.is_clinic_owner(v_clinic) then
    raise exception 'Only OWNER can revoke';
  end if;

  update public.clinic_members
  set
    invite_status = 'REVOKED',
    user_id = null
  where id = p_member_id
    and clinic_id = v_clinic;
end;
$$;

grant execute on function public.revoke_clinic_member(uuid) to authenticated;

-- 3) Funnel: drop global clinic_id IS NULL select; bind lead insert to jwt email
drop policy if exists "members read own clinic leads" on public.clinic_leads;
create policy "members read own clinic leads"
  on public.clinic_leads for select
  using (
    clinic_id in (select public.user_clinic_ids())
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 5) Funnel insert: NOT with check (true) — jwt email bind stops cross-email spam
drop policy if exists "auth insert own lead" on public.clinic_leads;
create policy "auth insert own lead"
  on public.clinic_leads for insert
  to authenticated
  with check (
    email is not null
    and length(trim(email)) > 0
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "members read onboarding events" on public.onboarding_events;
create policy "members read onboarding events"
  on public.onboarding_events for select
  using (
    clinic_id in (select public.user_clinic_ids())
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "auth insert onboarding events" on public.onboarding_events;
create policy "auth insert onboarding events"
  on public.onboarding_events for insert
  to authenticated
  with check (
    email is not null
    and length(trim(email)) > 0
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 4/6) Consents / receipts: drop clinic_id IS NULL read (and matching write loopholes)
drop policy if exists "members read consents" on public.clinical_consents;
create policy "members read consents"
  on public.clinical_consents for select
  using (clinic_id in (select public.user_clinic_ids()));

drop policy if exists "members insert consents" on public.clinical_consents;
create policy "members insert consents"
  on public.clinical_consents for insert
  with check (clinic_id in (select public.user_clinic_ids()));

drop policy if exists "members read receipts" on public.clinical_receipts;
create policy "members read receipts"
  on public.clinical_receipts for select
  using (clinic_id in (select public.user_clinic_ids()));

drop policy if exists "members insert receipts" on public.clinical_receipts;
create policy "members insert receipts"
  on public.clinical_receipts for insert
  with check (clinic_id in (select public.user_clinic_ids()));

drop policy if exists "members update receipts" on public.clinical_receipts;
create policy "members update receipts"
  on public.clinical_receipts for update
  using (clinic_id in (select public.user_clinic_ids()))
  with check (clinic_id in (select public.user_clinic_ids()));

-- 7) Doctor-scoped patients / appointments
-- Replace FOR ALL write policies (they also granted unrestricted SELECT via OR).
drop policy if exists "members read patients" on public.patients;
drop policy if exists "members write patients" on public.patients;
create policy "members read patients"
  on public.patients for select
  using (public.can_access_assigned_row(clinic_id, assigned_member_id));

create policy "members insert patients"
  on public.patients for insert
  with check (
    clinic_id in (select public.user_clinic_ids())
    and (
      public.clinic_member_sees_all(clinic_id)
      or assigned_member_id = public.my_clinic_member_id(clinic_id)
    )
  );

create policy "members update patients"
  on public.patients for update
  using (public.can_access_assigned_row(clinic_id, assigned_member_id))
  with check (
    clinic_id in (select public.user_clinic_ids())
    and (
      public.clinic_member_sees_all(clinic_id)
      or assigned_member_id = public.my_clinic_member_id(clinic_id)
    )
  );

create policy "members delete patients"
  on public.patients for delete
  using (
    public.clinic_member_sees_all(clinic_id)
  );

drop policy if exists "members read appointments" on public.appointments;
drop policy if exists "members write appointments" on public.appointments;
create policy "members read appointments"
  on public.appointments for select
  using (public.can_access_assigned_row(clinic_id, assigned_member_id));

create policy "members insert appointments"
  on public.appointments for insert
  with check (
    clinic_id in (select public.user_clinic_ids())
    and (
      public.clinic_member_sees_all(clinic_id)
      or assigned_member_id = public.my_clinic_member_id(clinic_id)
    )
  );

create policy "members update appointments"
  on public.appointments for update
  using (public.can_access_assigned_row(clinic_id, assigned_member_id))
  with check (
    clinic_id in (select public.user_clinic_ids())
    and (
      public.clinic_member_sees_all(clinic_id)
      or assigned_member_id = public.my_clinic_member_id(clinic_id)
    )
  );

create policy "members delete appointments"
  on public.appointments for delete
  using (
    public.clinic_member_sees_all(clinic_id)
  );
