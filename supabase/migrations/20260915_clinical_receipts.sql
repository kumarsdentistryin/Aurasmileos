-- AuraSmile OS — clinical receipts (GST / UPI collection ledger)
-- Run after 20260915_clinic_branding_storage.sql

create table if not exists public.clinical_receipts (
  id text primary key,
  clinic_id uuid references public.clinics (id) on delete set null,
  branch_id text not null,
  receipt_no text not null,
  patient_id text not null,
  patient_mrn text not null,
  patient_name text not null,
  doctor_name text not null,
  procedure_title text not null,
  taxable_paise int not null check (taxable_paise >= 0),
  gst_percent numeric(5,2) not null default 0 check (gst_percent >= 0 and gst_percent <= 28),
  cgst_paise int not null default 0 check (cgst_paise >= 0),
  sgst_paise int not null default 0 check (sgst_paise >= 0),
  total_paise int not null check (total_paise >= 0),
  paid_via text not null check (paid_via in ('UPI', 'CASH', 'CARD', 'UNPAID')),
  upi_vpa text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists clinical_receipts_clinic_idx
  on public.clinical_receipts (clinic_id, issued_at desc);

create index if not exists clinical_receipts_patient_idx
  on public.clinical_receipts (patient_id, issued_at desc);

alter table public.clinical_receipts enable row level security;

drop policy if exists "members read receipts" on public.clinical_receipts;
create policy "members read receipts"
  on public.clinical_receipts for select
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members insert receipts" on public.clinical_receipts;
create policy "members insert receipts"
  on public.clinical_receipts for insert
  with check (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );

drop policy if exists "members update receipts" on public.clinical_receipts;
create policy "members update receipts"
  on public.clinical_receipts for update
  using (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  )
  with check (
    clinic_id is null
    or clinic_id in (select public.user_clinic_ids())
  );
