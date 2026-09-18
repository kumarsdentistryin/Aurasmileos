# Master Architecture & Implementation Plan: AuraSmile OS

**AuraSmile OS** is an enterprise-grade, Pan-India Dental Operating System and Clinical AI Platform engineered specifically for Indian dental clinics, polyclinics, and multi-branch dental hospital chains.

It enforces the **Universal System Architect Framework (USAF 7-Layer Standard)** and the **Sovereign Architect Playbook**, guaranteeing that clinical records, FDI tooth charting, visiting consultant commission splits, billing ledgers, and AI diagnostics **never break**.

---

## 1. Which Specialized Skills We Will Use

To ensure world-class software engineering, security, UI polish, and clinical reliability, we activate the following 15 specialized skills:

| Skill | Category | Critical Role in AuraSmile OS |
| :--- | :--- | :--- |
| **`karpathy-guidelines`** | Engineering Discipline | Eliminates overcomplication, enforces surgical diffs, explicit assumptions, and strict verification. |
| **`mandatory-secure-web-skills`** | Security & Compliance | Prevents OWASP top 10 vulnerabilities, enforces SQL injection protection, zero trust RBAC, and clinical data encryption. |
| **`determine-threat-model`** | Healthtech Security | Establishes medical trust boundaries, patient health info (PHI) isolation, and DPDP Act 2023 compliance. |
| **`stitch-design-taste`** | Design System | Generates the institutional `DESIGN.md` for AuraSmile OS: clinical navy, pristine dental white, semantic FDI color coding, and typography. |
| **`ce-frontend-design`** | UI/UX Quality | Builds high-density clinical views (Odontogram, RVG canvas, chair scheduler) with zero "AI slop" or generic template patterns. |
| **`apple-design`** | Fluid Micro-interactions | Applies natural tactile feedback, spring physics, and keyboard shortcuts for rapid chairside tooth selection. |
| **`animate`** | Motion Polish | Smooth transitions between patient list, 3D odontogram, and treatment plan phases without DOM thrashing. |
| **`tdd`** | Test-Driven Development | Red-green-refactor loop for critical clinical math: visiting consultant commission shares, GST dental invoices, and tooth surface collision. |
| **`diagnose`** | Diagnostic Loop | Root-cause analysis and instrumentation for any canvas rendering or state synchronization regressions. |
| **`run-security-scanner`** | Pre-deployment Audit | Scans source files for security flaws before staging or production builds. |
| **`run-poc`** | Security Verification | Generates proof-of-concept tests verifying authorization barriers between clinic branches and roles. |
| **`brandkit`** | Visual Identity | Creates institutional clinical dashboards, icons, print-ready Rx headers, and lab slip layouts. |
| **`design-an-interface`** | API & Component Design | Explores clean, modular contract interfaces between the Odontogram, PACS viewer, and Case Sheet. |
| **`ce-code-review`** | Multi-persona Review | Tiered automated code review before any major milestone merge. |
| **`full-output-enforcement`** | Code Completeness | Blocks placeholder code (`// TODO`, `/* rest of code here */`), ensuring 100% production-ready files. |

---

## 2. Open-Source Models & Engines Utilized

AuraSmile OS connects the proven engines already in `crazy-ai-stack` with the newly pulled dental modules:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          AURASMILE OS ENGINE SUITE                                          │
├───────────────────────────────┬──────────────────────────────┬──────────────────────────────────────────────┤
│ Clinical & Imaging            │ Practice & Operations        │ AI Models & Speech                           │
├───────────────────────────────┼──────────────────────────────┼──────────────────────────────────────────────┤
│ • React-Odontogram-Modul      │ • Direct WhatsApp Doctor     │ • YOLOv8 Caries & Periapical Detection       │
│   (FDI 2-Digit Charting)      │   Dispatcher (1-Tap Confirm) │   (ai-dental-caries-detector)                │
│                               │ • Internal Chair Scheduler   │                                              │
│ • DWV (DICOM Web Viewer)      │ • Chatwoot + Baileys         │ • Bolna Conversational Voice Agent           │
│   (RVG / IOPA / OPG PACS)     │   (1-Click Patient Care)     │   (Indian Multi-lingual Receptionist)        │
│                               │                              │                                              │
│ • Medplum FHIR Engine         │ • IDURAR ERP / Twenty CRM    │ • Faster-Whisper + Ollama Qwen 2.5           │
│   (ABDM / ABHA Compliance)    │   (Case Profits & Payouts)   │   (Ambient Clinical Voice Scribe)            │
└───────────────────────────────┴──────────────────────────────┴──────────────────────────────────────────────┘
```

1. **Clinical Vision AI**: **`YOLOv8 Caries Model`** (running via ONNX/FastAPI) analyzes uploaded RVG and bitewing X-rays to highlight caries and bone loss.
2. **AI Telephony Receptionist**: **`Bolna`** handles inbound clinic phone calls via Twilio/Exotel with **Sarvam AI** (Indian voice models in Hindi, English, Tamil, Kannada, Telugu).
3. **Ambient AI Voice Scribe**: **`Faster-Whisper`** + local **`Ollama (Qwen 2.5:7b)`** transcribes chairside doctor dictation directly into structured FDI dental case sheets.
4. **Imaging PACS Engine**: **`DWV`** renders DICOM format X-rays with zoom, contrast enhancement, and working length measurements.
5. **Core Database & API**: **Next.js 16 (React 19) + TypeScript 7 + PostgreSQL (Supabase)**.

---

## 3. The 7-Layer USAF Architecture (Why It Never Breaks)

To guarantee 100% data integrity and zero crashes:

### Layer 1: Domain Entity Model & Mathematical Invariants
- **FDI Tooth Invariant**: Tooth IDs must strictly belong to the set of valid adult teeth (`11..18, 21..28, 31..38, 41..48`) or deciduous teeth (`51..55, 61..65, 71..75, 81..85`).
- **Surface Invariant**: Surfaces must be a subset of `['M', 'O', 'D', 'B', 'L', 'I']`. An incisor cannot have an 'O' (occlusal) surface.
- **Consultant Split Invariant**:
  $$\text{Total Case Fee} = \text{Clinic Share} + \text{Visiting Consultant Share} + \text{Lab Fee} + \text{Material Cost} + \text{Net Profit}$$
  All currency stored in integer paise ($\text{INR} \times 100$) to prevent floating-point rounding errors.
- **Immutable Clinical History**: Dental case sheets, signed consent PDFs, and diagnostic notes are strictly **append-only**. Prior revisions are archived with timestamps.

### Layer 2: Persistence & Ledger Layer
- Multi-tenant schema with `clinic_id`, `branch_id`, and `doctor_id` foreign keys.
- Row-Level Security (RLS) ensuring Branch A doctors cannot view Branch B records unless granted chain-level admin access.

### Layer 3: Pure Core Business Engine
- Framework-free TypeScript functions for treatment plan cost calculation, GST slab generation, and consultant commission statements.

### Layer 4: External Integrations & Circuit Breakers
- **Razorpay / UPI**: Idempotent webhook handling for token payments and multi-stage EMIs.
- **WhatsApp API**: Message queue with retry backoff and rate-limit smoothing.

### Layer 5: API, Transport & Security
- Strict Zod schemas validating all incoming requests. No raw payloads reach the database.

### Layer 6: Latency-Masked Clinical UI
- Optimistic UI updates on the odontogram: clicking a tooth toggles state instantly on the SVG canvas while syncing in the background.

### Layer 7: Observability & Audit Trail
- Medical audit logs capturing every doctor prescription edit, X-ray deletion attempt, and bill modification.

---

## 4. Realistic Timeline & Milestone Breakdown

| Phase | Milestone Name | Scope of Work | Estimated Delivery |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Core Clinical Engine & Odontogram** | • Scaffold `P:\AuraSmile OS`<br>• Interactive SVG Odontogram (FDI notation)<br>• Patient Profile & Digital Case History<br>• Digital Consent Signature Pad | **Days 1–5** |
| **Phase 2** | **Imaging, Scheduling & WhatsApp Dispatch** | • DWV DICOM Viewer integration for RVG/OPG<br>• Internal Chair Grid + Direct WhatsApp Doctor Dispatcher<br>• Automated 1-Tap Doctor Confirmation & Patient Care reminders | **Days 6–10** |
| **Phase 3** | **Financials, Labs & Consultant Network** | • Case-level profit & loss engine<br>• Visiting specialist commission rev-share (60/40)<br>• Dental Lab Slip (Zirconia/Crown/Aligner tracker) | **Days 11–15** |
| **Phase 4** | **AI Scribe, Voice Receptionist & ABDM** | • Ambient Voice Scribe (dictation to case sheet)<br>• Bolna Indian multilingual phone receptionist<br>• YOLOv8 AI Caries detection overlay<br>• ABDM / ABHA ID integration | **Days 16–22** |

---

## Verification Plan

### Automated Testing
- `npm run test`: Vitest unit tests verifying FDI tooth validation, financial split math, and Zod schemas.
- `npx tsc --noEmit`: Strict TypeScript compilation with zero type errors.

### Clinical & Functional Verification
- Verify that clicking tooth 16 on the odontogram correctly updates multi-surface state and reflects in the treatment plan.
- Verify RVG DICOM loading in DWV canvas with measurement calibration.
- Verify visiting consultant 60/40 commission splitting on a test case.
