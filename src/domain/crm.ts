/**
 * AuraSmile OS — Doctor-Friendly Dental CRM Domain
 * Pipeline, Bolna AI receptionist call logs, and WhatsApp follow-up templates.
 * USAF Layer 1 / Layer 3: type-safe integer paise arithmetic (zero floating-point loss).
 */

export type PipelineStage =
  | 'NEW_INQUIRY'
  | 'CONSULT_BOOKED'
  | 'TREATMENT_PRESENTED'
  | 'IN_TREATMENT'
  | 'RECALL_DUE'
  | 'COMPLETED';

export type LeadSource =
  | 'INSTAGRAM_AD'
  | 'GOOGLE_MAPS'
  | 'WALK_IN'
  | 'BOLNA_AI_RECEPTIONIST'
  | 'DOCTOR_REFERRAL'
  | 'PRACTO';

export type BolnaCallSentiment = 'POSITIVE' | 'NEUTRAL' | 'URGENT_PAIN';

export type CrmWhatsAppTemplate = 'QUOTE' | 'FOLLOWUP' | 'RECALL';

/**
 * High-value treatment plan opportunity tracked in the dental CRM pipeline
 * (Twenty CRM / Idurar-inspired board columns mapped to clinical stages).
 */
export interface TreatmentPlanOpportunity {
  id: string;
  patientName: string;
  phone: string;
  source: LeadSource;
  /** Clinical procedure label, e.g. "Full Arch Clear Aligners" */
  procedureName: string;
  /** Estimated case value in integer paise (INR × 100) */
  estimatedValuePaise: number;
  stage: PipelineStage;
  notes: string;
  /** ISO date YYYY-MM-DD */
  lastContactDate: string;
  /** ISO date YYYY-MM-DD — overdue when ≤ today and stage ≠ COMPLETED */
  nextFollowUpDate: string;
  assignedDoctor: string;
}

/**
 * Transcribed inbound call captured by Bolna AI Voice Receptionist
 * (Hindi / English / regional Indian languages → structured CRM summary).
 */
export interface BolnaCallLog {
  id: string;
  callerName: string;
  callerPhone: string;
  /** ISO-8601 timestamp, e.g. 2026-09-15T18:42:11+05:30 */
  timestamp: string;
  audioDurationSec: number;
  aiSummary: string;
  sentiment: BolnaCallSentiment;
  isConvertedToAppointment: boolean;
}

/** Stages counted toward open pipeline value (excludes closed won/lost completion). */
const OPEN_PIPELINE_STAGES: ReadonlySet<PipelineStage> = new Set([
  'NEW_INQUIRY',
  'CONSULT_BOOKED',
  'TREATMENT_PRESENTED',
  'IN_TREATMENT',
  'RECALL_DUE',
]);

/**
 * Sums estimated case values for open pipeline opportunities.
 * Enforces non-negative integer paise accumulation (no float INR math).
 */
export function calculatePipelineValuePaise(
  opportunities: TreatmentPlanOpportunity[]
): number {
  let totalPaise = 0;

  for (const opp of opportunities) {
    if (!OPEN_PIPELINE_STAGES.has(opp.stage)) {
      continue;
    }
    if (!Number.isInteger(opp.estimatedValuePaise)) {
      throw new Error(
        `Opportunity ${opp.id}: estimatedValuePaise must be an integer (paise)`
      );
    }
    if (opp.estimatedValuePaise < 0) {
      throw new Error(
        `Opportunity ${opp.id}: estimatedValuePaise cannot be negative`
      );
    }
    totalPaise += opp.estimatedValuePaise;
  }

  return totalPaise;
}

/**
 * Parses YYYY-MM-DD into a UTC midnight Date for calendar-day comparison.
 */
function parseIsoDateOnly(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error(`Invalid ISO date (expected YYYY-MM-DD): ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Counts opportunities whose next follow-up is due today or overdue.
 * COMPLETED opportunities are excluded. Optional `asOfDate` (YYYY-MM-DD)
 * defaults to today's calendar date in local timezone expressed as ISO date.
 */
export function getDueFollowUpsCount(
  opportunities: TreatmentPlanOpportunity[],
  asOfDate?: string
): number {
  const todayIso =
    asOfDate ??
    formatIsoDateOnly(
      new Date(
        Date.UTC(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate()
        )
      )
    );
  const today = parseIsoDateOnly(todayIso);

  let dueCount = 0;
  for (const opp of opportunities) {
    if (opp.stage === 'COMPLETED') {
      continue;
    }
    const followUp = parseIsoDateOnly(opp.nextFollowUpDate);
    if (followUp.getTime() <= today.getTime()) {
      dueCount += 1;
    }
  }
  return dueCount;
}

/**
 * Formats INR from integer paise for human-readable WhatsApp copy
 * (display only — never used for arithmetic).
 */
function formatPaiseAsInrDisplay(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise amount must be an integer');
  }
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(inr);
}

/**
 * Builds clinic-ready WhatsApp deep-link message bodies for quote chase,
 * treatment follow-up, and hygiene recall — doctor-friendly, India clinic tone.
 */
export function formatCrmWhatsAppMessage(
  opp: TreatmentPlanOpportunity,
  template: CrmWhatsAppTemplate
): string {
  const valueDisplay = formatPaiseAsInrDisplay(opp.estimatedValuePaise);
  const firstName = opp.patientName.trim().split(/\s+/)[0] ?? opp.patientName;

  if (template === 'QUOTE') {
    return `*AuraSmile Dental Hospital — Treatment Estimate*

Namaste ${firstName} ji,

Following your consultation with *${opp.assignedDoctor}*, here is the estimate for:

🦷 *${opp.procedureName}*
💰 *Estimated investment:* ${valueDisplay}

This plan is customized to your clinical findings. We have reserved chair time for discussion of payment options (UPI / EMI / staged treatment).

Reply *YES* to confirm a visit, or call the clinic if you have questions about the quote.

— AuraSmile Front Desk
📍 Indiranagar, Bengaluru`;
  }

  if (template === 'FOLLOWUP') {
    return `*AuraSmile Dental — Gentle Follow-up*

Namaste ${firstName} ji,

We are following up on *${opp.procedureName}* discussed with *${opp.assignedDoctor}*.

Estimated plan value: ${valueDisplay}
Next follow-up scheduled: ${opp.nextFollowUpDate}

Would you like us to hold an evening or weekend slot this week? Reply here on WhatsApp and our coordinator will confirm.

Clinical note on file: ${opp.notes}

— Care Team, AuraSmile OS`;
  }

  // RECALL
  return `*AuraSmile Dental — Hygiene / Clinical Recall*

Dear ${firstName},

It is time for your recall visit related to *${opp.procedureName}*.

👨‍⚕️ Doctor: ${opp.assignedDoctor}
📅 Suggested recall window: ${opp.nextFollowUpDate}
💰 Typical visit value: ${valueDisplay}

Regular recall protects treatment longevity and gum health. Reply *BOOK* to choose a morning or evening chair, or tap to reschedule.

— AuraSmile Recall Desk
WhatsApp care line active 9 AM – 8 PM IST`;
}
