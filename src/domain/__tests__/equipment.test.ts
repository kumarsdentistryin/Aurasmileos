import { describe, expect, it } from 'vitest';
import {
  AutoclaveSterilizationCycle,
  DentalEquipment,
  getAmcRemainingDays,
  isAmcExpiringSoon,
  isSterilizationCycleValid,
} from '../equipment-sterilization';

const chair: DentalEquipment = {
  id: 'eq-1',
  name: 'Chair 1',
  category: 'DENTAL_CHAIR',
  model: 'A-dec 300',
  serialNumber: 'SN1',
  operatoryRoom: 'A',
  amcVendorName: 'Vendor',
  amcVendorPhone: '+910000000000',
  amcStartDate: '2026-01-01',
  amcExpiryDate: '2026-10-05',
  lastServiceDate: '2026-08-01',
  status: 'OPERATIONAL',
};

const validCycle: AutoclaveSterilizationCycle = {
  id: 'cyc-1',
  cycleNumber: 1,
  date: '2026-09-15',
  time: '08:00',
  autoclaveEquipmentId: 'ac-1',
  temperatureCelsius: 134,
  pressurePsi: 30,
  cycleDurationMinutes: 5,
  biologicalSporeTestPassed: true,
  chemicalClass5IntegratorPassed: true,
  operatorName: 'Nurse',
  pouchesProcessedCount: 12,
  pouchExpiryDate: '2026-10-15',
};

describe('equipment & sterilization invariants', () => {
  it('flags AMC expiring within 30 days', () => {
    expect(isAmcExpiringSoon(chair, 30, new Date('2026-09-15'))).toBe(true);
    expect(isAmcExpiringSoon(chair, 10, new Date('2026-09-15'))).toBe(false);
  });

  it('computes remaining AMC days', () => {
    expect(getAmcRemainingDays(chair, new Date('2026-09-15'))).toBe(20);
  });

  it('validates NABH 134°C cycle', () => {
    expect(isSterilizationCycleValid(validCycle)).toBe(true);
  });

  it('rejects failed spore test', () => {
    expect(
      isSterilizationCycleValid({ ...validCycle, biologicalSporeTestPassed: false })
    ).toBe(false);
  });

  it('validates 121°C long cycle', () => {
    expect(
      isSterilizationCycleValid({
        ...validCycle,
        temperatureCelsius: 121,
        pressurePsi: 15,
        cycleDurationMinutes: 15,
      })
    ).toBe(true);
  });
});
