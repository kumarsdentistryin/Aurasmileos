# EMP-SAAS — Open-source enterprise stack adoptions for AuraSmile OS

Mined from `P:\crazy-ai-stack\08-saas-enterprise-apps`. Goal: turn AuraSmile into a **sellable multi-clinic product** without rewriting clinical UI — adopt OSS for billing, CRM handoff, support, automation, alerts, and ops.

**AuraSmile already has:** clinic onboarding funnel + `clinic_leads`, UPI/GST receipts (paise), staff invites / multi-clinic membership, branding, WhatsApp dispatcher hooks, soft entitlements (`free_trial` | `starter` | `pro`).

**Pilot gaps this pack addresses:** usage metering + SaaS invoices, support inbox, recall automation, appointment reminders, multi-branch ops board.

---

## Top 10 OSS systems (ranked for AuraSmile)

| Rank | System | Use-case for AuraSmile | Integration style | Effort | Why now vs later |
|------|--------|------------------------|-------------------|--------|------------------|
| 1 | **Lago** | SaaS subscription + usage metering (active chairs, WhatsApp sends, storage) → GST-friendly invoice export; maps onto existing `ClinicPlan` / soft paywall | **API / self-host** (events POST; keep AuraSmile UI as source of truth for entitlements) | **M** (2–3 weeks to first paid invoice) | **Now** — pilots need paid conversion; soft paywall already exists |
| 2 | **n8n** | WhatsApp recall + appointment reminders + lead→CRM sync; webhook sink for AuraSmile domain events | **Self-host + webhooks** (AuraSmile emits; n8n orchestrates) | **S–M** (days for first flow) | **Now** — highest leverage without product rewrite |
| 3 | **Chatwoot** | Clinic / owner support inbox (product help + billing disputes); optional WhatsApp channel for *support*, not clinical recall | **Self-host + API / embed** (widget or API inbox; shared WhatsApp number carefully partitioned) | **M** | **Now** for B2B trust during pilot support load |
| 4 | **Twenty** | Internal sales CRM: funnel leads (`clinic_leads`) → Person/Company/Opportunity handoff | **API / self-host** (batch upsert from funnel events) | **S–M** | **Now** if selling multi-clinic deals; else week 6+ |
| 5 | **ntfy** | Ops alerts: payment failed, trial ending, recall job failed, high queue | **API / self-host** (HTTP publish to topics) | **S** | **Now** — tiny cost, huge ops signal |
| 6 | **Plane** | Multi-branch rollout / pilot checklist board (not clinical queue) | **Self-host / SaaS** (manual + webhook create issues) | **S** | **Now** for internal ops; not customer-facing |
| 7 | **cal.com** | Steal booking/reminder/webhook patterns; optional public “book demo” for sales | **Inspire-only** for clinical appointments; **embed/API** for sales demos | **S** (patterns) / **M** (demo booking) | Patterns **now**; replace AuraSmile queue **later** (never) |
| 8 | **Nango** | Future third-party clinic integrations (Google Calendar, Zoho, Practo export, Meta WhatsApp Cloud OAuth) | **Self-host / embed Connect UI** | **M–L** | **Later** (post-pilot) when customers demand 2-way calendar sync |
| 9 | **listmonk** | Product/newsletter + transactional email for owners (not patient PHI bulk) | **Self-host + API** | **S** | **Later** after Chatwoot + funnel CRM; use for release notes / webinars |
| 10 | **Coolify** | Deploy/self-host the OSS satellite stack (Lago, n8n, Chatwoot, Twenty) on one VPS fleet | **Self-host PaaS** | **S–M** | **Now** if you self-host satellites; skip if Railway/managed |

### Honorable mentions (not top 10, still useful)

| System | Verdict |
|--------|---------|
| **refine** | **Inspire-only** for future internal admin CRUD (clinic ops console). Do not replace clinical UI. |
| **Appwrite / InsForge** | **Compare-only** vs current Supabase BaaS. Stay on Supabase unless a hard blocker appears. |
| **HospitalRun** | **Inspire-only** health scheduling model (`startDateTime`/`endDateTime`/`patient`/`location`/`reason`/`type`). AuraSmile queue already richer (chair, doctor scope, paise). |
| **idurar-erp-crm** | **Inspire-only** for invoice/party CRUD patterns; Lago covers SaaS billing better. |
| **OpenOutreach** | **Later / careful** — LinkedIn outreach for *selling* AuraSmile; legal/ToS risk; steal CRM stage machine ideas only. |
| **laudspeaker** | **Later** — event-triggered patient journeys if n8n becomes unwieldy. |
| **postiz-app** | **Later** — clinic social scheduling product feature, not core SaaS. |
| **hotel-qloapps / wger / education-lms / linkedin-carousel** | **Skip** unless a single transferable pattern is needed (none critical for dental SaaS). |

---

## Recommended 90-day stack

```text
AuraSmile (Supabase) ──events──► n8n ──► WhatsApp / ntfy / Lago / Twenty / Chatwoot
         ▲                              │
         └──── entitlement webhooks ◄───┘ Lago invoices / payment status
```

| Window | Adopt | Concrete outcome |
|--------|-------|------------------|
| **Days 0–30** | Coolify (or managed hosts) + **n8n** + **ntfy** + event contract (`src/lib/integrations/types.ts`) | `appointment.booked` / `recall.due` / `clinic.created` emitted (even if no-op sink); first reminder + trial-ending alert |
| **Days 30–60** | **Lago** plans mirroring `starter`/`pro`; billable metrics for seats/WhatsApp; **Chatwoot** for owner support | First subscription invoice; support SLA for pilots |
| **Days 60–90** | **Twenty** synced from `clinic_leads` + funnel steps; Plane board for multi-branch rollout | Sales pipeline from onboarding funnel; ops board for 3+ clinic groups |

**Out of 90-day scope:** Nango calendar OAuth, laudspeaker journeys, listmonk growth mail, postiz, Appwrite migration.

### Suggested Lago mapping (AuraSmile ↔ Lago)

| AuraSmile | Lago |
|-----------|------|
| `clinic.id` | `external_customer_id` / customer metadata |
| Subscription / membership row | `external_subscription_id` |
| Plan `starter` / `pro` | Lago `Plan` codes |
| Soft paywall `subscriptionStatus` | Driven by Lago invoice paid / past_due webhooks |
| Metric ideas | `active_staff_seats` (unique_count), `whatsapp_messages` (sum), `receipts_issued` (count) |

Lago event shape to steal (from `Events::Common`): `transaction_id`, `external_subscription_id`, `timestamp`, `code`, `properties` — idempotent by `transaction_id`.

### Suggested Twenty mapping (funnel → CRM)

| AuraSmile | Twenty core object |
|-----------|-------------------|
| Owner contact | `person` |
| Clinic / group | `company` |
| Pilot / paid deal | `opportunity` |
| Funnel steps / notes | `note` / `task` / `activity` |

Status bridge: `SIGNED_UP` → `ONBOARDING` → `ACTIVE` → `CHURNED` ≈ opportunity stages.

### Suggested Chatwoot partitioning

- **Inbox A — Product support:** AuraSmile owners / staff (email + widget).
- **Inbox B — WhatsApp clinical (optional):** patient-facing; do **not** mix with support agents without clinic_id custom attributes.
- Automation events to mirror: `conversation_created`, `conversation_updated`, `message_created`.

---

## Steal patterns (models & webhooks — do not fork codebases)

### 1. Lago — usage event envelope

```json
{
  "transaction_id": "as_wa_send_01HQ…",
  "external_subscription_id": "clinic_sub_…",
  "code": "whatsapp_messages",
  "timestamp": 1710000000.0,
  "properties": {
    "clinic_id": "…",
    "channel": "whatsapp",
    "template": "recall_due",
    "units": 1
  }
}
```

Aggregation types worth adopting later: `count_agg`, `sum_agg`, `unique_count_agg` (seats). Keep money in **integer paise** inside AuraSmile; Lago amounts stay in its currency model for *SaaS* invoices (separate from patient UPI receipts).

### 2. AuraSmile → n8n domain events

Canonical names live in `src/lib/integrations/types.ts`. Envelope:

```json
{
  "id": "evt_…",
  "type": "appointment.booked",
  "occurred_at": "2026-09-16T05:30:00+05:30",
  "clinic_id": "…",
  "idempotency_key": "appointment:…:booked",
  "data": { }
}
```

n8n Webhook node URL is the only sink in phase 1 — no in-app HTTP client required yet.

### 3. cal.com — booking & reminder ideas (inspire)

From `Booking`: `uid`, `idempotencyKey`, `startTime`/`endTime`, `status`, `smsReminderNumber`, `scheduledTriggers` / webhook fan-out, `metadata` JSON. Steal **idempotent booking keys** and **scheduled reminder triggers**; keep AuraSmile’s chair/doctor queue as product core.

### 4. HospitalRun — minimal appointment fields (inspire)

`startDateTime`, `endDateTime`, `patient`, `location`, `reason`, `type` — useful for API stability docs; AuraSmile already extends with chair, assigned member, `expected_fee_paise`.

### 5. Chatwoot — inbox automation

Conditions on `conversation_created` / `message_created`; custom attributes: `clinic_id`, `plan`, `city`. Route billing disputes to a “Billing” team.

### 6. Twenty — CRM object graph

Person ↔ Company ↔ Opportunity (+ Note/Task). Sync on `clinic.created` and `funnel.step_completed`; do not put PHI patient charts in Twenty.

### 7. listmonk — owner marketing lists (later)

`Subscriber` + `List` + opt-in status + `attribs` JSON. Segment by plan/city from clinic metadata — never patient lists.

### 8. OpenOutreach — stage machine (inspire only)

Lead stages + deal outcomes (`converted`, `not_interested`, `no_budget`, …) + reconcile-on-idle task queue. Useful for **sales** of AuraSmile, not for patient outreach automation (ToS/compliance).

### 9. ntfy — alert topics

Topics like `aurasmile-ops`, `aurasmile-billing`. Message = short title + clinic_id + link. Fire from n8n on failed workflows / Lago `invoice.payment_failure`.

### 10. Plane — multi-branch ops

Workspace = AuraSmile internal; Project per enterprise customer; Issues = “Branch X go-live checklist”. Create issues from `clinic.created` when `membership` indicates multi-clinic group.

### 11. Nango (later) — connection model

`providerConfigKey` + `connectionId` per clinic for Google Calendar / Meta. AuraSmile stores only Nango connection ids, never raw OAuth tokens.

### 12. Coolify — satellite topology

One Coolify control plane; separate app services: `lago`, `n8n`, `chatwoot`, `twenty`, `ntfy`. AuraSmile app stays on current host (e.g. Vercel/Railway) and talks outbound HTTPS only.

### 13. Appwrite vs InsForge vs Supabase

Stay on **Supabase**. Revisit only if Auth/RLS/storage limits block multi-clinic; InsForge/Appwrite are alternatives, not complements.

### 14. refine — admin shell (inspire)

Resource-based CRUD for internal “Clinic Ops Admin” (list clinics, plans, invites). Do not introduce refine into chairside operatory.

---

## Anti-patterns

- Do not embed Chatwoot / Twenty / Lago UIs inside the clinical operatory.
- Do not send patient PHI to Twenty, listmonk, or OpenOutreach.
- Do not replace UPI patient receipts with Lago — Lago bills **clinics** for software.
- Do not run LinkedIn automation against doctor personal accounts without legal review.
- Do not install new npm deps or rewrite billing UI under this EMP lane (docs + event stubs only).

---

## Definition of done (this EMP)

- [x] This adoption plan
- [x] Typed event stub: `src/lib/integrations/types.ts` (+ thin `emit.ts` no-op)
- [ ] Runtime Lago/n8n/Chatwoot deploy — follow-up EMP / infra

## Source paths mined

`P:\crazy-ai-stack\08-saas-enterprise-apps\{lago,twenty,chatwoot,n8n,ntfy,plane,cal.com,nango,refine,appwrite,InsForge,hospitalrun,idurar-erp-crm,OpenOutreach,listmonk,laudspeaker,postiz-app,coolify}`
