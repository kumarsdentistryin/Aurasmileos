/**
 * AuraSmile → automation bus event contract (n8n / Lago / CRM).
 * Stub only: no HTTP. Future emitters should reuse these names + envelopes.
 */

/** Canonical outbound event names for satellite integrations. */
export type AuraSmileIntegrationEventName =
  | 'clinic.created'
  | 'clinic.branding_updated'
  | 'clinic.plan_changed'
  | 'clinic.trial_ending'
  | 'staff.invited'
  | 'staff.claimed'
  | 'funnel.step_completed'
  | 'appointment.booked'
  | 'appointment.reminder'
  | 'appointment.rescheduled'
  | 'appointment.cancelled'
  | 'appointment.completed'
  | 'recall.due'
  | 'recall.sent'
  | 'receipt.issued'
  | 'whatsapp.message_queued'
  | 'billing.entitlement_changed'
  | 'usage.metric_recorded';

export interface AuraSmileEventEnvelope<
  TName extends AuraSmileIntegrationEventName = AuraSmileIntegrationEventName,
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Stable event id (uuid). */
  id: string;
  type: TName;
  /** ISO-8601 with offset preferred (IST clinic ops). */
  occurred_at: string;
  clinic_id: string;
  /** Dedup key for n8n / Lago (e.g. `appointment:{id}:booked`). */
  idempotency_key: string;
  data: TData;
}

/** Payload shapes for the highest-priority pilot events. */
export type ClinicCreatedData = {
  clinic_name: string;
  owner_email: string;
  city?: string;
  plan: 'free_trial' | 'starter' | 'pro';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export type AppointmentBookedData = {
  appointment_id: string;
  patient_id: string;
  patient_phone?: string;
  scheduled_time: string;
  appt_date: string;
  assigned_member_id?: string | null;
  chair_label?: string | null;
  expected_fee_paise?: number;
};

export type AppointmentReminderData = {
  count: number;
  appointment_ids: string[];
  opened_appointment_id?: string;
  branch_label?: string;
  channel?: 'whatsapp';
};

export type RecallDueData = {
  patient_id: string;
  patient_phone?: string;
  recall_reason: string;
  due_date: string;
  channel_preference?: 'whatsapp' | 'sms' | 'none';
};

export type FunnelStepCompletedData = {
  step:
    | 'signup_started'
    | 'signup_completed'
    | 'clinic_created'
    | 'onboarding_branding'
    | 'onboarding_chairs'
    | 'onboarding_staff'
    | 'onboarding_completed'
    | 'demo_opened';
  lead_id?: string;
  email?: string;
};

export type UsageMetricRecordedData = {
  /** Lago billable metric code when wired. */
  code: 'whatsapp_messages' | 'active_staff_seats' | 'receipts_issued' | string;
  units: number;
  transaction_id: string;
  external_subscription_id?: string;
  properties?: Record<string, unknown>;
};

export type KnownAuraSmileEvent =
  | AuraSmileEventEnvelope<'clinic.created', ClinicCreatedData>
  | AuraSmileEventEnvelope<'appointment.booked', AppointmentBookedData>
  | AuraSmileEventEnvelope<'appointment.reminder', AppointmentReminderData>
  | AuraSmileEventEnvelope<'recall.due', RecallDueData>
  | AuraSmileEventEnvelope<'funnel.step_completed', FunnelStepCompletedData>
  | AuraSmileEventEnvelope<'usage.metric_recorded', UsageMetricRecordedData>
  | AuraSmileEventEnvelope;
