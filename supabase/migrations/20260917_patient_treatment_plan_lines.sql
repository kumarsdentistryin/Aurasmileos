-- AuraSmile OS — persist treatment plan lines on patient (mirrors dental_chart JSON)
-- App falls back to localStorage until this column is applied.

alter table public.patients
  add column if not exists treatment_plan_lines jsonb not null default '[]'::jsonb;
