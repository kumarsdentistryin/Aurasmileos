export type EquipmentCategory =
  | 'DENTAL_CHAIR'
  | 'AUTOCLAVE'
  | 'AIR_COMPRESSOR'
  | 'RVG_SENSOR'
  | 'ENDOMOTOR'
  | 'ULTRASONIC_SCALER'
  | 'SUCTION_UNIT';

export type EquipmentStatus = 'OPERATIONAL' | 'NEEDS_SERVICE' | 'UNDER_REPAIR';

export interface DentalEquipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  model: string;
  serialNumber: string;
  operatoryRoom: string;
  amcVendorName: string;
  amcVendorPhone: string;
  amcStartDate: string;
  amcExpiryDate: string; // YYYY-MM-DD
  lastServiceDate: string;
  status: EquipmentStatus;
}

export interface AutoclaveSterilizationCycle {
  id: string;
  cycleNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  autoclaveEquipmentId: string;
  temperatureCelsius: 121 | 134;
  pressurePsi: 15 | 30;
  cycleDurationMinutes: number;
  biologicalSporeTestPassed: boolean; // Geobacillus stearothermophilus indicator
  chemicalClass5IntegratorPassed: boolean;
  operatorName: string;
  pouchesProcessedCount: number;
  pouchExpiryDate: string; // YYYY-MM-DD
}

/**
 * Checks if equipment AMC is expiring within specified threshold (default: 30 days).
 */
export function isAmcExpiringSoon(
  equipment: DentalEquipment,
  daysThreshold: number = 30,
  referenceDate: Date = new Date()
): boolean {
  const expiryTime = new Date(equipment.amcExpiryDate).getTime();
  const refTime = referenceDate.getTime();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  return expiryTime - refTime <= thresholdMs;
}

/**
 * Calculates remaining days of AMC coverage.
 */
export function getAmcRemainingDays(
  equipment: DentalEquipment,
  referenceDate: Date = new Date()
): number {
  const expiry = new Date(equipment.amcExpiryDate).getTime();
  const ref = referenceDate.getTime();
  return Math.ceil((expiry - ref) / (1000 * 60 * 60 * 24));
}

/**
 * Verifies if an autoclave cycle satisfies NABH / DCI sterilization standards:
 * - Temperature 134°C with 30 psi for >= 4 mins, OR 121°C with 15 psi for >= 15 mins.
 * - Chemical class 5 integrator indicator passed.
 * - Biological spore test passed.
 */
export function isSterilizationCycleValid(cycle: AutoclaveSterilizationCycle): boolean {
  if (!cycle.biologicalSporeTestPassed || !cycle.chemicalClass5IntegratorPassed) {
    return false;
  }

  if (cycle.temperatureCelsius === 134 && cycle.pressurePsi >= 30 && cycle.cycleDurationMinutes >= 4) {
    return true;
  }

  if (cycle.temperatureCelsius === 121 && cycle.pressurePsi >= 15 && cycle.cycleDurationMinutes >= 15) {
    return true;
  }

  return false;
}
