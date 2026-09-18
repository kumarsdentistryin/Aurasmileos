# Stack adoption: 18-healthtech-dental-os → AuraSmile OS

Mined from `P:\crazy-ai-stack\18-healthtech-dental-os` for EMP-DENTAL. Goal: accelerate AuraSmile clinical workflows without weakening Supabase RLS, without new migrations unless critical, and without GPL/BSL copy-paste into the product binary.

AuraSmile already has: FDI odontogram, caries-detection domain schema + tests, doctor-scoped patient/appointment RLS, Pedo deciduous defaults, billing/UPI receipts, clinic onboarding (Vite + React + TS + Supabase free tier, multi-clinic members).

---

## Ranked steal list (executive)

| Rank | Steal | Source | Fit for AuraSmile |
|------|--------|--------|-------------------|
| **P0** | YOLO `/detect` wire format → normalized overlay boxes + confidence gate | ai-dental-caries-detector | Domain already started; wire-format adapter is the missing piece |
| **P0** | Surface-level caries vs filling exclusivity; Pedo milktooth FDI remap on adult slots | dental-charting-odontogram | Matches chairside charting UX; Pedo already in product |
| **P0** | Treatment vs state taxonomy on tooth (caries = state, filling = both) | apexo-dental-clinic | Cleaner operatory palette semantics |
| **P1** | PHI redaction before any LLM/voice hop; write-actions require confirm | dentalpin-practice-management | Copilot / WhatsApp / Bolna path must not leak DPDP-sensitive data |
| **P1** | Bolna agent JSON: ASR→LLM→TTS pipeline + hangup-after-silence; Exotel/Plivo India telephony | bolna-ai-voice-receptionist | Front-desk voice without rebuilding orchestration |
| **P1** | Offline-first sync mental model + per-tooth ISO notes (ideas only; keep Supabase) | apexo-dental-clinic | Resilience for bad clinic Wi‑Fi; do **not** fork PocketBase |
| **P2** | Occlusal vs lateral visualization rules; multi-tooth bridge spans | dentalpin + odontogram | Richer chart later; not blocking 30-day MVP |
| **P2** | Periodontogram module pattern | dentalpin | Separate clinical mode after core odontogram stabilizes |
| **Avoid** | Vendoring GPL `best.pt` service into SaaS binary; BSL DentalPin as SaaS core | caries / dentalpin | License + liability risk for commercial multi-clinic |

---

## Per-repo inventory

### 1. `ai-dental-caries-detector`

| | |
|--|--|
| **What** | Flask + Waitress YOLOv8 web service; upload tooth image → JSON boxes. Trained on DentalAI (DatasetNinja). Ships `best.pt`, notebooks for convert/train/predict. |
| **License** | **GPL-3.0** (`LICENSE`) |
| **Stack** | Python, Ultralytics YOLO, Pillow, Flask |
| **API shape** | `POST /detect` multipart `image_file` → `[[x1,y1,x2,y2,object_type,probability], …]` (pixel xyxy). Filters `class_id != 0` (caries class only in shipped script). |
| **Stealable ideas** | (1) Wire format adapter into AuraSmile `YoloBoundingBox` (normalized 0–1). (2) Offline demo overlays when no model. (3) Confidence threshold before charting suggestion. (4) Separate **edge** inference process — never load weights in the Vite SPA. |
| **Do not steal** | Ship GPL model weights inside AuraSmile product distribution without counsel; claim CE/CDSCO diagnostic status. |
| **AuraSmile hook** | `src/domain/caries-detection.ts` (+ imaging pathology boxes). |

### 2. `apexo-dental-clinic`

| | |
|--|--|
| **What** | Full dental clinic PMS: patients, appointments, photo attachments, multi-doctor, offline sync, multilingual, backups. Flutter + FluentUI; PocketBase backend. |
| **License** | **GPL-3.0** (`LICENSE.md`) |
| **Stack** | Dart/Flutter, Hive local, PocketBase remote, DICOM toolkit, Sentry, FCM |
| **Clinical UX** | Teeth selector with ISO 3950 keys; `TxOption` list separates **state** (caries, missing, fractured…) vs **treatment** (extraction, filling, RCT…) vs **both**. Voice note: “Speak tooth numbers and conditions…” |
| **Stealable ideas** | (1) State vs treatment palette split. (2) Per-tooth note + extra-note maps. (3) Self-host PHI narrative in `hipaa.md` (inventory of PII fields, sync boundaries). (4) Offline local box + debounced sync pattern as *product idea* for India bandwidth — implement on Supabase, not PocketBase. |
| **Do not steal** | Fork Flutter/PocketBase stack; weaken AuraSmile doctor-scoped RLS to match looser single-clinic demos. |
| **AuraSmile hook** | Condition palette / `ToothCondition` taxonomy; future voice charting prompt. |

### 3. `bolna-ai-voice-receptionist`

| | |
|--|--|
| **What** | Open-source voice-agent orchestration: telephony ↔ ASR ↔ LLM ↔ TTS over websockets. Hosted APIs/UI are separate/closed. |
| **License** | **MIT** |
| **Stack** | Python package + Docker local_setup (Twilio/Plivo + Redis + ngrok) |
| **Providers** | Twilio, Plivo; Deepgram/Azure ASR; OpenAI/DeepSeek/etc LLM; Polly/ElevenLabs/Deepgram/Cartesia TTS. Exotel noted as coming — relevant for India. |
| **Stealable ideas** | (1) Agent config JSON (welcome message, silence hangup, toolchain pipeline). (2) Tool-calling receptionist that only books/cancels via AuraSmile APIs with **clinic + doctor scope**. (3) Keep secrets server-side; SPA only gets session tokens. |
| **Do not steal** | Hardcode API keys; send full PHI into LLM prompts without redaction. |
| **AuraSmile hook** | Stub: `src/lib/voiceReceptionist.ts` (no keys). Later: Edge Function + Exotel/Plivo. |

### 4. `dental-charting-odontogram`

| | |
|--|--|
| **What** | React/TS/Vite odontogram editor: layered SVG teeth, multi-select, FDI/Universal/Palmer labels, caries-by-surface, fillings, endo variants, Pedo/mixed dentition presets, JSON import/export. |
| **License** | **No root LICENSE file**; dependencies MIT. Treat as **ideas/UX only** until license clarified — do not copy SVG assets verbatim into commercial distribution. |
| **Stealable ideas** | (1) Adult slot → deciduous FDI remap when milktooth selected (`1x→5x`, `2x→6x`, …). (2) Filling wins over caries on same surface. (3) Multi-select + “select all present/missing/milk”. (4) Primary / mixed dentition one-click presets. (5) Occlusal + lateral dual view. (6) Numbering-system label converter (keep storage FDI). |
| **AuraSmile hook** | `src/domain/fdi.ts` + Odontogram UI (UI changes out of EMP-DENTAL ownership unless approved). |

### 5. `dentalpin-practice-management`

| | |
|--|--|
| **What** | Modular self-hosted PMS: patients, odontogram, schedule (week/kanban), treatment plans, billing, **agentic AI copilot**, WhatsApp/SMS with consent, GDPR module, periodontogram. |
| **License** | **BSL 1.1** (not OSI open source). Production SaaS competing with DentalPin is restricted; converts to Apache-2.0 after 4 years from publication. |
| **Stealable ideas (patterns only)** | (1) PHI redaction tokens before cloud LLM. (2) RBAC re-check at tool execution chokepoint. (3) Writes require explicit confirm. (4) Deterministic morning digest **without** LLM. (5) Odontogram visualization rules: pulp_fill / occlusal_surface / lateral_icon / pattern_fill. (6) Multi-tooth span treatments. (7) Consent trails for WhatsApp/SMS. |
| **Do not steal** | Copy modules into AuraSmile SaaS; ignore BSL Additional Use Grant. |
| **AuraSmile hook** | Future copilot + messaging; keep doctor-scoped RLS as hard floor. |

---

## 30-day adoption roadmap

### P0 (days 1–10) — clinical chart + AI assist foundation

1. **YOLO wire adapter** in domain (done in this EMP pass): parse pixel xyxy + class string → normalized `YoloBoundingBox`; confidence filter; never auto-write chart without dentist confirm.
2. **Pedo FDI display remap** helpers: when charting deciduous on adult grid slots, expose FDI 51–85 labels (AuraSmile already validates deciduous IDs).
3. **Surface exclusivity rule** documented + domain helper: if filling surfaces set, clear overlapping caries suggestion from AI.
4. **UI disclaimer** (separate UI EMP): “Assistive overlay — not a diagnosis; dentist confirms.”

### P1 (days 11–20) — front desk + safety

1. **Voice receptionist stub → Edge Function**: Bolna-style agent config; Exotel/Plivo; tools limited to availability + create appointment under caller clinic membership.
2. **PHI redaction policy** for any LLM: strip name/phone/MRN; pass tokenized IDs; log purpose under DPDP.
3. **Apexo-inspired palette split**: mark conditions as `state` | `treatment` | `both` in domain types (additive; no migration).
4. **WhatsApp consent trail** pattern from DentalPin docs — align with existing CRM/recall, no RLS weaken.

### P2 (days 21–30) — deepen charting, defer heavy PMS

1. Occlusal dual-view and bridge span presets (UX steal from odontogram/DentalPin).
2. Periodontogram as optional clinical mode (schema later — migration only if product commits).
3. Evaluate **local** YOLOv8n on clinic GPU/NUC vs shared edge worker pricing for Indian SMB clinics.

---

## Open-source / cost models for Indian clinics

| Capability | Local / edge | API | Recommendation |
|------------|--------------|-----|----------------|
| Caries box assist | YOLOv8n (`best.pt` pattern) on clinic PC or cheap VPS in India region; GPL isolation in separate process | Cloud vision APIs (cost + PHI leave India) | **Local/edge first**; SPA calls clinic-controlled URL; AuraSmile stores only overlays + dentist confirmation |
| Voice receptionist | Self-host Bolna + Plivo/Exotel; open TTS where quality OK | Bolna hosted / ElevenLabs / OpenAI Realtime | **Hybrid**: MIT Bolna orchestration self-host; cheapest India-friendly telephony; LLM with redaction |
| Charting NLP (“tooth 16 distal caries”) | Small local LLM optional | GPT-4o-mini / DeepSeek | Start with **structured buttons**; add voice dictation P1 |
| Copilot scheduling | Deterministic rules (DentalPin morning digest idea) | Agentic LLM with tool RBAC | Prefer **rules + confirm**; LLM only for language |

Cost posture: Supabase free tier + optional ₹0–few-thousand/month edge box beats per-radiograph cloud AI for high-volume RVG clinics.

---

## Risks (PHI, DPDP, clinical liability)

| Risk | Detail | Mitigation |
|------|--------|------------|
| **DPDP / PHI egress** | Radiographs, names, phones to foreign LLM/ASR | Keep inference in India or on-prem; redact; purpose limitation; clinic DPA |
| **Clinical liability** | YOLO false negative/positive treated as diagnosis | Soft-suggest only; mandatory dentist confirm; UI disclaimer; no auto chart mutate |
| **GPL contamination** | Linking GPL detector into proprietary SaaS distribution | Separate service/process; consume JSON API; counsel on `best.pt` redistribution |
| **BSL restriction** | DentalPin not usable as competing SaaS core | Ideas-only; reimplement patterns |
| **Voice recording consent** | Call recording may be sensitive personal data | Explicit consent; retention limits; opt-out |
| **RLS regression** | Copilot/voice tools querying cross-doctor patients | Every tool re-checks clinic membership + doctor scope (DentalPin pattern) |
| **Unlicensed odontogram assets** | SVG/templates without clear LICENSE | Re-draw or commission assets; steal **logic**, not binary art |

---

## Code touchpoints from this EMP pass

| File | Change |
|------|--------|
| `docs/stack-adoptions/03-dental-os.md` | This document |
| `src/domain/caries-detection.ts` | YOLO wire-format parse + normalize + class map |
| `src/domain/__tests__/caries-detection.test.ts` | Coverage for adapter |
| `src/domain/fdi.ts` | Numbering labels + adult→deciduous slot remap |
| `src/domain/__tests__/fdi.test.ts` | Coverage for remap / labels |
| `src/lib/voiceReceptionist.ts` | Bolna-inspired stub (no API keys) |

Forbidden (untouched): `App.tsx`, Auth, SellHomePage, supabase migrations, StaffAdminPanel, funnel pages.
