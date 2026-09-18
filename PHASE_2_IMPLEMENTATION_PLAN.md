# AURASMILE OS — PHASE 2 IMPLEMENTATION PLAN
## Operations, Laboratory Management, Consultant Network & RVG Imaging Studio

> **Target Workspace**: `P:\AuraSmile OS`
> **Architecture Standard**: Universal System Architect Framework (USAF 7-Layer Standard)
> **Goal**: Build and integrate Phase 2 operations connecting clinical care to labs, visiting specialists, material stock, and radiography.

---

## 1. Scope of Phase 2 Modules

### Module 1: Dental Laboratory Management (CAD/CAM, Aligners & Shades)
- **Digital Lab Slips**: Lab Partner (DentCare, Katana Milling, Illusion Aligners), Patient Name, FDI Tooth #, Restoration Type (Zirconia Monolithic, E-Max Press, PFM High Noble, Clear Aligners, Surgical Guides).
- **VITA 3D-Master & Classical Shade Picker**: Primary shade (A1, A2, A3, B1, etc.), Cervical shade, Incisal translucency.
- **5-Stage Pipeline Tracking**: `SENT_TO_LAB` ➔ `IN_FABRICATION` ➔ `RECEIVED_IN_CLINIC` ➔ `TRY_IN_SCHEDULED` ➔ `DELIVERED_TO_PATIENT`.
- **Automated Overdue Warning Alerts**: Flags red if lab delivery is pending within 24 hours of scheduled patient appointment.
- **Warranty Tracking**: Digital warranty card barcode / tracking number (e.g. 10-year Zirconia warranty).

### Module 2: Visiting Specialist / Consultant Network & Payout Ledger
- **Specialist Directory**: On-call specialists (Endodontist, Oral & Maxillofacial Surgeon, Orthodontist, Periodontist, Implantologist, Pedodontist).
- **Commission Split Engine**: Automated 60/40 (60% Clinic / 40% Doctor) or 70/30 contractual revenue share calculation.
- **Section 194J TDS Withholding**: Automatically calculates mandatory 10% TDS withholding for professional payouts in India.
- **Payout Settlement Ledger**: Track case attribution, date, gross fee, net doctor payout in paise, and NEFT/UPI settlement UTR number.

### Module 3: Intelligent Consumable Inventory & Case-Wise Auto-Deduction
- **Dental Consumables Master**: SKU, Name, Category (Endodontics, Restorative Composite, Local Anesthesia, Sutures, Cements), Manufacturer (3M ESPE, Dentsply Sirona, Septodont), Batch Number, Expiry Date, Case Cost in Paise, Current Stock, Reorder Threshold.
- **Case-Wise Auto-Deduction Engine**:
  - Completing a Molar RCT automatically deducts: 1 Protaper Gold file pack, 1 Lignox 2% carpule, 1 AH Plus sealer dose.
  - Completing a Class II Composite automatically deducts: 1 dose 3M Filtek Z250, 1 Lignox carpule, 1 etching gel unit.
- **45-Day Expiry & Low Stock Alerts**: Highlights materials nearing expiration or dropping below reorder thresholds.

### Module 4: Clinical Photos & RVG / DICOM Radiography Studio
- **Intraoral RVG/IOPA Radiography Canvas**: Real-time CSS hardware-accelerated filters for intraoral digital X-rays:
  - Contrast Adjustment Slider (50% to 200%).
  - Brightness Adjustment Slider (50% to 180%).
  - Invert Radiograph Toggle (reverses radiopacity/radiolucency to reveal hidden apical lesions and root fractures).
- **Digital Apex Working Length Caliper**: Interactive measurement tool calibrated in millimeters (e.g. measures root canal working length from incisal edge/cusp tip to anatomical apex).
- **Before & After Aesthetic Photo Comparison**: Side-by-side split comparison for cosmetic veneers, crowns, and smile design.

---

## 2. Specialized Skills to Activate for Phase 2

| Skill | Role in Phase 2 |
| :--- | :--- |
| **`karpathy-guidelines`** | Enforces surgical diffs to existing `App.tsx` and `types.ts` without breaking Phase 1 odontogram or case sheet. |
| **`tdd`** | Drives test-first implementation of consultant 60/40 payout math, 10% TDS deductions, and lab overdue logic. |
| **`ce-frontend-design`** | Crafts high-density clinical lab tables, dark-theme radiology consoles, and tactile slider controls. |
| **`apple-design`** | Ensures smooth hardware-accelerated image adjustments (contrast/invert) with zero UI lag during patient review. |
| **`mandatory-secure-web-skills`** | Protects financial payout ledgers, doctor PAN numbers, and medical radiograph assets. |
| **`full-output-enforcement`** | Guarantees complete code generation with zero placeholder comments. |

---

## 3. Open-Source Models, Repos & Libraries to Use

1. **`DWV (DICOM Web Viewer)`** *(from `crazy-ai-stack/healthcare/04-medical-imaging-dicom`)*:
   - Zero-footprint web viewer logic for medical DICOM X-rays.
2. **`YOLOv8 Dental Caries Model`** *(from `crazy-ai-stack/18-healthtech-dental-os/ai-dental-caries-detector`)*:
   - Deep learning computer vision architecture for periapical pathology detection on RVG radiographs.
3. **`IDURAR ERP / Twenty CRM`** *(from `crazy-ai-stack/08-saas-enterprise-apps/idurar-erp-crm`)*:
   - Ledger architecture for commission splitting, accounts payable, and supplier invoice tracking.
4. **Lucide React & Canvas API**:
   - Feather-light icons and zero-latency client-side caliper tools.

---

## 4. Verification & Testing Criteria

1. **Unit Tests (`npm test`)**:
   - `lab.test.ts`: Verify due date calculation and overdue alert triggering.
   - `consultants.test.ts`: Verify 60/40 gross share, 10% TDS deduction, and net payout math in integer paise.
   - `inventory.test.ts`: Verify 45-day expiry alerts and low-stock detection.
2. **Production Build (`npm run build`)**:
   - Zero TypeScript compilation errors (`tsc && vite build`).
