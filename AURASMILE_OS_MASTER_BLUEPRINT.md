# AURASMILE OS — Master Sovereign Architecture & Execution Blueprint
## The Pan-India Dental Operating System (Clinical Care · Odontogram · WhatsApp · Case Profitability)

> **Authoritative Standard**: This document is the permanent, turnkey implementation blueprint for **AuraSmile OS**.
> When Antigravity or any agentic coding model is opened in `P:\AuraSmile OS`, execute this exact specification from Day 1.
>
> 🏛️ Built on the **Universal System Architect Framework (USAF 7-Layer Standard)** and the **Sovereign Architect Playbook**.

---

## 1. Product Vision & Value Proposition

**AuraSmile OS** is a dental-specific clinic operating system connecting patient management, diagnosis, treatment, digital consent, appointments, inventory, laboratory, billing, follow-up, consultant management, and case profitability.

### The Five Core Differentiators:
1. **Case-Level Profitability**: Know exactly what every dental procedure costs and earns in real time ($\text{Profit} = \text{Revenue} - [\text{Doctor/Consultant Share} + \text{Lab Fee} + \text{Consumable Materials}]$).
2. **Intelligent Material Tracking**: Consumables (rotary files, composite, gutta-percha, anesthetics) automatically deducted per procedure.
3. **Direct WhatsApp Appointment Dispatcher**: Zero Cal.com/OAuth friction. Direct interactive 1-tap booking confirmation sent to the doctor's phone.
4. **Consultant Specialist Network**: Automated 60/40 commission splitting and monthly payout ledger for visiting Endodontists, Orthodontists, and Oral Surgeons.
5. **FDI 2-Digit Interactive Odontogram**: Pan-India standard (Dental Council of India compliant) interactive tooth chart for adult permanent (11–48) and pediatric deciduous (51–85) teeth.

---

## 2. Universal 7-Layer Architecture Standard (USAF)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 7: Observability, Audit Trail & Medical Invariant Guardrails     │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 6: Tactile Chairside UI (FDI Odontogram, E-Consent Canvas, PACS) │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 5: Strict Input Validation & Security Gateway (Zod & ABAC)       │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 4: External Ingestion (WhatsApp API, Razorpay UPI, PACS DICOM)   │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Pure Core Dental Calculation Engine (Framework-Free Math)     │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Persistence & Append-Only Medical Ledger (ACID / PostgreSQL)  │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: Domain Entity Model & Golden Invariants (FDI Standards)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Golden Invariants (Rules That Never Break)
1. **FDI Tooth Bounds**:
   - Permanent: Quadrant 1 (18–11), Quadrant 2 (21–28), Quadrant 3 (31–38), Quadrant 4 (41–48).
   - Deciduous: Quadrant 5 (55–51), Quadrant 6 (61–65), Quadrant 7 (71–75), Quadrant 8 (81–85).
   - Any tooth outside these 52 numbers is rejected immediately.
2. **Anatomical Surface Bounds**:
   - Anterior teeth (#11–13, 21–23, 31–33, 41–43) have Incisal (`I`) edges, never Occlusal (`O`).
   - Posterior teeth (#14–18, 24–28, 34–38, 44–48) have Occlusal (`O`) tables, never Incisal (`I`).
3. **Financial Split Math**:
   - All financial amounts stored as integers in **Paise** ($\text{INR} \times 100$) to prevent floating-point loss.
   - $\text{Total Bill} = \text{Clinic Margin} + \text{Consultant Fee} + \text{Lab Fee} + \text{Materials Cost}$.
4. **Immutable Clinical History**:
   - Case sheets, surgical consent records, and X-ray attachments are **append-only**. Revisions create a new version with an audit timestamp.

---

## 3. The 15 Specialized Skills Activated

When developing AuraSmile OS, apply these 15 skills:
1. `karpathy-guidelines`: Surgical diffs, no unnecessary refactors, explicit assumptions.
2. `mandatory-secure-web-skills`: OWASP prevention, medical record encryption, SQL injection protection.
3. `determine-threat-model`: PHI data boundaries, DPDP Act 2023 compliance.
4. `stitch-design-taste`: Clinical Navy (`#0A192F`), pristine surgical white/slate background, semantic FDI colors.
5. `ce-frontend-design`: High-density chairside UI without generic AI slop.
6. `apple-design`: Tactile tooth selection, spring physics on modal dialogs.
7. `animate`: Smooth arch transitions (permanent vs pedo) without layout shift.
8. `tdd`: Red-green-refactor testing for FDI tooth validation and commission calculations.
9. `diagnose`: Fast diagnosis of any canvas/SVG state regressions.
10. `run-security-scanner`: Pre-commit security scanning.
11. `run-poc`: Verification of multi-branch and role-based data isolation.
12. `brandkit`: Professional dental icons, prescription headers, lab slip layouts.
13. `design-an-interface`: Clean API contracts between Odontogram, PACS, and Billing.
14. `ce-code-review`: Automated persona code review.
15. `full-output-enforcement`: Zero placeholder code; 100% complete files.

---

## 4. Open-Source Ecosystem Connections

AuraSmile OS leverages these battle-tested open-source modules located in `p:\crazy-ai-stack`:

| Component | Source / Engine | Role in AuraSmile OS |
| :--- | :--- | :--- |
| **Interactive Odontogram** | `18-healthtech-dental-os/dental-charting-odontogram` | SVG-based FDI tooth grid with multi-surface selection. |
| **Clinical Practice Core** | `18-healthtech-dental-os/dentalpin-practice-management` | FastAPI + Next.js practice management with native Razorpay gateway. |
| **AI Caries Model** | `18-healthtech-dental-os/ai-dental-caries-detector` | YOLOv8 ONNX model detecting caries and bone loss on digital X-rays. |
| **AI Voice Receptionist** | `18-healthtech-dental-os/bolna-ai-voice-receptionist` | Indian multilingual voice bot (Hindi, English, Tamil, Telugu, Kannada). |
| **RVG / OPG PACS Viewer** | `healthcare/04-medical-imaging-dicom` (DWV) | Web DICOM viewer for digital intraoral X-rays and measurements. |
| **ABDM / ABHA FHIR EHR** | `healthcare/03-fhir-ehr-platform` (Medplum) | Ayushman Bharat Digital Mission (M1/M2/M3) compliant health records. |
| **WhatsApp Patient Care** | `08-saas-enterprise-apps/chatwoot` + Baileys | 1-Click WhatsApp pre/post-op care instructions & reminders. |
| **Case Profitability & ERP**| `08-saas-enterprise-apps/idurar-erp-crm` | Financial ledger and visiting specialist commission payouts. |

---

## 5. Phased Delivery Roadmap

### Phase 1: MVP Core (Days 1–5)
- [x] Patient Master Profile with Prominent Medical Alerts (Allergies, Diabetes, Hypertension, Bleeding disorders).
- [x] Interactive FDI Odontogram (Adult 32 teeth, Pedo 20 teeth, surface tagging).
- [x] General & Endodontic Clinical Case Sheet.
- [x] Digital Surgical Consent Pad (Touch/Stylus HTML5 canvas signature).
- [x] Direct WhatsApp Appointment Dispatcher (1-tap Doctor confirm, zero Cal.com).
- [x] Case-Level Contribution Margin & Profitability Engine.

### Phase 2: Operations & Labs (Days 6–10)
- DWV DICOM Web Viewer for RVG sensors (Carestream, Vatech) and OPG panoramic X-rays.
- Dental Lab Slip & Aligner Tracker (Zirconia, PFM, VITA shades, warranty cards).
- Visiting Specialist (Endodontist / Orthodontist / Surgeon) commission ledger.
- Material Inventory with automatic case-level deduction.

### Phase 3: Clinical AI & Enterprise Multi-Clinic (Days 11–20)
- Ambient AI Voice Scribe (Faster-Whisper + Ollama Qwen 2.5:7b chairside voice-to-case sheet).
- Bolna AI Phone Receptionist via Twilio/Exotel with Sarvam AI Indian voices.
- YOLOv8 AI Caries detection bounding box overlay on uploaded RVGs.
- Multi-branch clinic chain management and centralized analytics.
