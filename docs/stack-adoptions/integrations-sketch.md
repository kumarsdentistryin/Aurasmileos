# Integrations sketch (AuraSmile → n8n / Lago / CRM)

Companion to [04-saas-enterprise.md](./04-saas-enterprise.md). Typed contract: `src/lib/integrations/types.ts`.

## Phase-1 wiring (no app HTTP yet)

1. Emitters call `emitIntegrationEvent()` (currently no-op / skipped).
2. Later: set `INTEGRATIONS_WEBHOOK_URL` → n8n Webhook node.
3. n8n routes by `type`:

| Event | Downstream |
|-------|------------|
| `clinic.created` | Twenty Company+Person+Opportunity; Plane “go-live” issue; ntfy ops |
| `funnel.step_completed` | Twenty opportunity stage update |
| `appointment.booked` | Reminder wait → WhatsApp template |
| `recall.due` | WhatsApp recall template; optional `usage.metric_recorded` |
| `usage.metric_recorded` | Lago event POST (`transaction_id`, `code`, `properties`) |
| `clinic.trial_ending` | Chatwoot private note + ntfy + owner email |

## Idempotency

Always send `idempotency_key`. Lago uses `transaction_id`; n8n should drop duplicates on the same key within 24h.

## PHI boundary

Patient names/phones may flow to WhatsApp providers via n8n. Do **not** sync charts, odontograms, or consent pads to Twenty, listmonk, or Plane.
