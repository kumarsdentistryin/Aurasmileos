# AuraSmile OS — domain context

For agents: run grill-with-docs against this file before non-trivial features.

## Product

Pan-India multi-clinic dental SaaS. Vite + React + TypeScript + Tailwind SPA. Supabase Auth + RLS + Storage. Two surfaces: **sell/onboarding funnel** (`/`, `/signup`, `/onboarding`) and **live workstation** (`/app`).

## Core entities

| Term | Meaning |
|------|---------|
| **Clinic** | Tenant branch (`clinics` row). Has `branch_code`, branding, chairs. |
| **Organization / group** | Multi-clinic ownership in product vision; today membership is per-clinic. |
| **Member** | `clinic_members` row: DOCTOR \| FRONT_DESK \| OWNER. OWNER maps to DOCTOR or desk session by specialty. |
| **Station unlock** | Lock screen → pick **your** roster seat; live requires `user_id === auth.uid()`. |
| **Doctor scope** | Doctors hydrate/persist only `assigned_member_id` patients; desk/OWNER see full roster. |
| **Paise** | All money is integer paise — never float INR. |
| **FDI** | Tooth IDs adult 11–48, deciduous 51–85. Pedo charts may remap adult slots → deciduous labels. |
| **Demo vs live** | `demo=1` or missing keys → mock data. Live = Supabase configured and not demo. |

## Hard rules

1. Do not weaken RLS. Apply `20260916_security_harden.sql` on Supabase for pilots.
2. Do not auto-write odontogram from AI caries overlays — dentist confirms.
3. PHI: redact before any LLM/voice hop; do not sync charts to CRM/Plane/listmonk.
4. Sell homepage layout is approved — polish only, no redesign.
5. Surgical diffs (karpathy-guidelines / Fable no-gold-plating).

## Stack adoptions (chosen)

See `docs/stack-adoptions/00-chosen-stack.md`.
