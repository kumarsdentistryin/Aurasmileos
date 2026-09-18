/**
 * AuraSmile integration event emitter.
 * No-op until VITE_INTEGRATIONS_WEBHOOK_URL is set (n8n webhook).
 * Never include odontogram / chart PHI in payloads.
 */
import type {
  AppointmentBookedData,
  AppointmentReminderData,
  AuraSmileEventEnvelope,
  AuraSmileIntegrationEventName,
  ClinicCreatedData,
  FunnelStepCompletedData,
} from './types';

export type EmitResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false }
  | { ok: false; error: string };

function webhookUrl(): string | undefined {
  const url = import.meta.env.VITE_INTEGRATIONS_WEBHOOK_URL as string | undefined;
  return url && url.startsWith('http') ? url : undefined;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildEventEnvelope<
  TName extends AuraSmileIntegrationEventName,
  TData extends Record<string, unknown>,
>(input: {
  type: TName;
  clinic_id: string;
  idempotency_key: string;
  data: TData;
  occurred_at?: string;
}): AuraSmileEventEnvelope<TName, TData> {
  return {
    id: newId(),
    type: input.type,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    clinic_id: input.clinic_id,
    idempotency_key: input.idempotency_key,
    data: input.data,
  };
}

/**
 * Queue/publish a domain event. Skips when no webhook URL configured.
 */
export async function emitIntegrationEvent<
  TName extends AuraSmileIntegrationEventName,
  TData extends Record<string, unknown>,
>(event: AuraSmileEventEnvelope<TName, TData>): Promise<EmitResult> {
  const url = webhookUrl();
  if (!url) return { ok: true, skipped: true };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': event.idempotency_key,
      },
      body: JSON.stringify(event),
      keepalive: true,
    });
    if (!res.ok) {
      return { ok: false, error: `webhook ${res.status}` };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'webhook failed';
    console.warn('[AuraSmile] integration emit:', message);
    return { ok: false, error: message };
  }
}

export async function emitClinicCreated(
  clinicId: string,
  data: ClinicCreatedData
): Promise<EmitResult> {
  return emitIntegrationEvent(
    buildEventEnvelope({
      type: 'clinic.created',
      clinic_id: clinicId,
      idempotency_key: `clinic:${clinicId}:created`,
      data,
    })
  );
}

export async function emitFunnelStep(
  clinicId: string | null | undefined,
  data: FunnelStepCompletedData
): Promise<EmitResult> {
  const cid = clinicId || 'funnel';
  return emitIntegrationEvent(
    buildEventEnvelope({
      type: 'funnel.step_completed',
      clinic_id: cid,
      idempotency_key: `funnel:${cid}:${data.step}:${data.lead_id ?? data.email ?? 'anon'}`,
      data,
    })
  );
}

export async function emitAppointmentBooked(
  clinicId: string,
  data: AppointmentBookedData
): Promise<EmitResult> {
  return emitIntegrationEvent(
    buildEventEnvelope({
      type: 'appointment.booked',
      clinic_id: clinicId,
      idempotency_key: `appointment:${data.appointment_id}:booked`,
      data,
    })
  );
}

export async function emitAppointmentReminder(
  clinicId: string,
  data: AppointmentReminderData
): Promise<EmitResult> {
  const day = new Date().toISOString().slice(0, 10);
  return emitIntegrationEvent(
    buildEventEnvelope({
      type: 'appointment.reminder',
      clinic_id: clinicId,
      idempotency_key: `appointment:day-reminder:${clinicId}:${day}`,
      data,
    })
  );
}
