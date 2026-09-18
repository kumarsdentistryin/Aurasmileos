-- AuraSmile OS — clinic branding fields + public logo storage bucket
-- Run after 20260915_patient_appointment_live.sql

alter table public.clinics
  add column if not exists address_line text not null default '',
  add column if not exists registration_footer text not null default '';

-- Public bucket for letterhead logos (path: {clinic_uuid}/logo.*)
insert into storage.buckets (id, name, public)
values ('clinic-branding', 'clinic-branding', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "clinic branding public read" on storage.objects;
create policy "clinic branding public read"
  on storage.objects for select
  using (bucket_id = 'clinic-branding');

drop policy if exists "clinic branding member upload" on storage.objects;
create policy "clinic branding member upload"
  on storage.objects for insert
  with check (
    bucket_id = 'clinic-branding'
    and (storage.foldername(name))[1] in (
      select clinic_id::text from public.clinic_members where user_id = auth.uid()
    )
  );

drop policy if exists "clinic branding member update" on storage.objects;
create policy "clinic branding member update"
  on storage.objects for update
  using (
    bucket_id = 'clinic-branding'
    and (storage.foldername(name))[1] in (
      select clinic_id::text from public.clinic_members where user_id = auth.uid()
    )
  );

drop policy if exists "clinic branding member delete" on storage.objects;
create policy "clinic branding member delete"
  on storage.objects for delete
  using (
    bucket_id = 'clinic-branding'
    and (storage.foldername(name))[1] in (
      select clinic_id::text from public.clinic_members where user_id = auth.uid()
    )
  );
