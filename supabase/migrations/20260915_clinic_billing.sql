-- AuraSmile OS — clinic billing / trial entitlements (Supabase free tier)
-- Run after 20260915_aurasmile_free_tier.sql
-- From Product + Auth architect: clinic-level plan, soft paywall later.

alter table public.clinics
  add column if not exists plan text not null default 'free_trial'
    check (plan in ('free_trial', 'starter', 'pro')),
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'expired')),
  add column if not exists billing_provider text,
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text;

-- Owner-only updates to billing fields
drop policy if exists "owners update clinic billing" on public.clinics;
create policy "owners update clinic billing"
  on public.clinics for update
  using (
    id in (
      select clinic_id from public.clinic_members
      where user_id = auth.uid() and role = 'OWNER'
    )
  )
  with check (
    id in (
      select clinic_id from public.clinic_members
      where user_id = auth.uid() and role = 'OWNER'
    )
  );
