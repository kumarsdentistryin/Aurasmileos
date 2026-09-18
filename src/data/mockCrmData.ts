import {
  BolnaCallLog,
  TreatmentPlanOpportunity,
} from '../domain/crm';

/**
 * Realistic Indian dental clinic CRM pipeline seed data.
 * All monetary values stored as integer paise (INR × 100).
 */

export const MOCK_OPPORTUNITIES: TreatmentPlanOpportunity[] = [
  {
    id: 'CRM-OPP-2026-001',
    patientName: 'Ananya Sen',
    phone: '+919900112233',
    source: 'INSTAGRAM_AD',
    procedureName: 'Full Arch Clear Aligners',
    estimatedValuePaise: 9500000, // ₹95,000
    stage: 'TREATMENT_PRESENTED',
    notes:
      'Mild Class I crowding upper anteriors. Invisalign comprehensive quote shared; patient comparing EMI vs full payment. Husband decision pending. FOLLOW-UP DUE.',
    lastContactDate: '2026-09-12',
    nextFollowUpDate: '2026-09-14', // overdue vs mid-Sep 2026 clinic clock
    assignedDoctor: 'Dr. Ananya Iyer, BDS (Orthodontics focus)',
  },
  {
    id: 'CRM-OPP-2026-002',
    patientName: 'Karthik Nambiar',
    phone: '+919845067890',
    source: 'GOOGLE_MAPS',
    procedureName: 'Single Tooth Immediate Implant with Zirconia Crown #21',
    estimatedValuePaise: 4500000, // ₹45,000
    stage: 'CONSULT_BOOKED',
    notes:
      'Traumatic avulsion risk on #21 after bike fall. CBCT slot booked. Discussed Straumann BLX + immediate provisional. Medical alert: none.',
    lastContactDate: '2026-09-15',
    nextFollowUpDate: '2026-09-17',
    assignedDoctor: 'Dr. Vikram Rao, MDS (Implantology / Endodontics)',
  },
  {
    id: 'CRM-OPP-2026-003',
    patientName: 'Dr. Sunita Rao',
    phone: '+919886644221',
    source: 'DOCTOR_REFERRAL',
    procedureName: 'Smile Makeover — 6 E.max Veneers',
    estimatedValuePaise: 12000000, // ₹1,20,000
    stage: 'TREATMENT_PRESENTED',
    notes:
      'Referred by Dr. Meenakshi (Koramangala GP). Diastema + enamel hypoplasia #11–#13 / #21–#23. Wax-up approved; shade BL2. Waiting on travel calendar.',
    lastContactDate: '2026-09-13',
    nextFollowUpDate: '2026-09-18',
    assignedDoctor: 'Dr. Ananya Iyer, BDS',
  },
  {
    id: 'CRM-OPP-2026-004',
    patientName: 'Rohan Kulkarni',
    phone: '+919611223344',
    source: 'WALK_IN',
    procedureName: 'Molar RCT & Zirconia Crown #36',
    estimatedValuePaise: 1450000, // ₹14,500
    stage: 'IN_TREATMENT',
    notes:
      'Irreversible pulpitis #36. MB2 negotiated; Ca(OH)₂ dressing placed. Crown prep pending after obturation. Lab slip queued for DentCare A2.',
    lastContactDate: '2026-09-15',
    nextFollowUpDate: '2026-09-20',
    assignedDoctor: 'Dr. Vikram Rao, MDS (Endodontist)',
  },
  {
    id: 'CRM-OPP-2026-005',
    patientName: 'Meera Nambisan',
    phone: '+919740556677',
    source: 'PRACTO',
    procedureName: 'Routine 6-Month Scaling & Polishing',
    estimatedValuePaise: 250000, // ₹2,500
    stage: 'RECALL_DUE',
    notes:
      'Last prophylaxis 2026-03-10. Mild gingival inflammation URQ. WhatsApp recall sequence day-1 sent. Prefers Saturday morning chairs.',
    lastContactDate: '2026-09-10',
    nextFollowUpDate: '2026-09-15',
    assignedDoctor: 'Dr. Ananya Iyer, BDS',
  },
  {
    id: 'CRM-OPP-2026-006',
    patientName: 'Alok Verma',
    phone: '+919916778899',
    source: 'BOLNA_AI_RECEPTIONIST',
    procedureName: 'Wisdom Tooth Surgical Disimpaction #38',
    estimatedValuePaise: 800000, // ₹8,000
    stage: 'NEW_INQUIRY',
    notes:
      'Inbound Bolna AI call: intermittent pain #38, difficulty opening mouth evenings. Converted from call log CALL-BOLNA-8841. Needs OPG + surgical consult.',
    lastContactDate: '2026-09-15',
    nextFollowUpDate: '2026-09-16',
    assignedDoctor: 'Dr. Vikram Rao, MDS (Oral Surgery cover)',
  },
  {
    id: 'CRM-OPP-2026-007',
    patientName: 'Deepa Krishnan',
    phone: '+919535001122',
    source: 'INSTAGRAM_AD',
    procedureName: 'Pediatric Space Maintainer (Band & Loop)',
    estimatedValuePaise: 500000, // ₹5,000
    stage: 'NEW_INQUIRY',
    notes:
      'Mother inquired after seeing pedo reel. Premature loss of #75; child age 7. Prefers female pedodontist chair. Insurance query: none (self-pay).',
    lastContactDate: '2026-09-14',
    nextFollowUpDate: '2026-09-19',
    assignedDoctor: 'Dr. Priya Menon, MDS (Pedodontist)',
  },
  {
    id: 'CRM-OPP-2026-008',
    patientName: 'Harish Patel',
    phone: '+919820334455',
    source: 'GOOGLE_MAPS',
    procedureName: 'Full Mouth Rehabilitation',
    estimatedValuePaise: 35000000, // ₹3,50,000
    stage: 'IN_TREATMENT',
    notes:
      'Phase 1 perio + provisionalization complete. Phase 2: 8 zirconia units + 2 implants #46/#36. Staged billing 40/30/30. High-touch CRM account.',
    lastContactDate: '2026-09-14',
    nextFollowUpDate: '2026-09-22',
    assignedDoctor: 'Dr. Vikram Rao, MDS + Dr. Ananya Iyer, BDS',
  },
];

/**
 * Bolna AI Voice Receptionist call transcripts with appointment conversion flags.
 */
export const MOCK_BOLNA_CALLS: BolnaCallLog[] = [
  {
    id: 'CALL-BOLNA-8841',
    callerName: 'Alok Verma',
    callerPhone: '+919916778899',
    timestamp: '2026-09-15T11:08:42+05:30',
    audioDurationSec: 146,
    aiSummary:
      'Patient inquiring about wisdom tooth pain on lower left; reported intermittent night pain and difficulty chewing; requested earliest surgical consultation. Bolna offered Indiranagar evening slot and captured consent for WhatsApp OPG reminder.',
    sentiment: 'URGENT_PAIN',
    isConvertedToAppointment: true,
  },
  {
    id: 'CALL-BOLNA-8842',
    callerName: 'Sneha Iyer',
    callerPhone: '+919880221100',
    timestamp: '2026-09-15T16:22:05+05:30',
    audioDurationSec: 98,
    aiSummary:
      'Patient inquiring about aligner pricing; reported mild anterior crowding; requested evening consultation after 6 PM. Compared approx. package range ₹80,000–₹1,20,000; asked for EMI options. Appointment booked with Dr. Ananya Iyer for 2026-09-18 18:30.',
    sentiment: 'POSITIVE',
    isConvertedToAppointment: true,
  },
  {
    id: 'CALL-BOLNA-8843',
    callerName: 'Mohammed Irfan',
    callerPhone: '+919449887766',
    timestamp: '2026-09-14T19:41:18+05:30',
    audioDurationSec: 71,
    aiSummary:
      'Caller asked clinic address and Sunday timings only; no treatment intent stated. Bolna shared Indiranagar map pin and emergency helpline. Soft lead tagged NEUTRAL — not converted to chair booking.',
    sentiment: 'NEUTRAL',
    isConvertedToAppointment: false,
  },
];
