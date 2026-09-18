import { describe, expect, it } from 'vitest';
import { buildEventEnvelope } from '../integrations/emit';

describe('integrations emit', () => {
  it('builds idempotent envelopes', () => {
    const evt = buildEventEnvelope({
      type: 'clinic.created',
      clinic_id: 'clinic-1',
      idempotency_key: 'clinic:clinic-1:created',
      data: {
        clinic_name: 'Aura Smile',
        owner_email: 'owner@clinic.in',
        plan: 'free_trial' as const,
      },
    });
    expect(evt.type).toBe('clinic.created');
    expect(evt.clinic_id).toBe('clinic-1');
    expect(evt.idempotency_key).toBe('clinic:clinic-1:created');
    expect(evt.id).toBeTruthy();
    expect(evt.occurred_at).toBeTruthy();
  });
});
