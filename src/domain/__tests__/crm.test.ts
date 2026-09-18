import { describe, expect, it } from 'vitest';
import {
  calculatePipelineValuePaise,
  formatCrmWhatsAppMessage,
  getDueFollowUpsCount,
  TreatmentPlanOpportunity,
} from '../crm';

const sample: TreatmentPlanOpportunity[] = [
  {
    id: '1',
    patientName: 'A',
    phone: '+919900000001',
    source: 'WALK_IN',
    procedureName: 'Aligners',
    estimatedValuePaise: 9500000,
    stage: 'TREATMENT_PRESENTED',
    notes: 'n',
    lastContactDate: '2026-09-12',
    nextFollowUpDate: '2026-09-14',
    assignedDoctor: 'Dr A',
  },
  {
    id: '2',
    patientName: 'B',
    phone: '+919900000002',
    source: 'PRACTO',
    procedureName: 'Scaling',
    estimatedValuePaise: 250000,
    stage: 'COMPLETED',
    notes: 'n',
    lastContactDate: '2026-09-10',
    nextFollowUpDate: '2026-09-10',
    assignedDoctor: 'Dr B',
  },
];

describe('CRM pipeline math', () => {
  it('sums open pipeline only', () => {
    expect(calculatePipelineValuePaise(sample)).toBe(9500000);
  });

  it('counts due follow-ups excluding completed', () => {
    expect(getDueFollowUpsCount(sample, '2026-09-15')).toBe(1);
  });

  it('formats quote WhatsApp template', () => {
    const msg = formatCrmWhatsAppMessage(sample[0], 'QUOTE');
    expect(msg).toContain('Aligners');
    expect(msg).toContain('AuraSmile');
  });
});
