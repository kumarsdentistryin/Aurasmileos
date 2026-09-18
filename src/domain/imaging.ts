import { ToothId } from './types';

export type RadiographModality = 'RVG_IOPA' | 'OPG_PANORAMIC' | 'BITEWING' | 'INTRAORAL_PHOTO';

export interface CaliperMeasurement {
  id: string;
  label: string; // e.g. "Working Length MB1"
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMm: number;
}

export interface PathologyBoundingBox {
  id: string;
  label: 'CARIES' | 'PERIAPICAL_RADIOLUCENCY' | 'BONE_LOSS' | 'CALCULUS';
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number;
  height: number;
  confidence: number; // e.g. 0.94
}

export interface ClinicalDentalImage {
  id: string;
  patientId: string;
  patientName: string;
  targetToothId?: ToothId;
  modality: RadiographModality;
  title: string;
  captureDate: string; // YYYY-MM-DD HH:mm
  imageUrl: string;
  comparisonAfterUrl?: string; // Optional after-treatment photo
  contrastPercent: number; // 50 to 200 (default: 100)
  brightnessPercent: number; // 50 to 180 (default: 100)
  isInverted: boolean;
  calibratedMmPerPixel: number; // e.g. 0.05 mm per pixel
  measurements: CaliperMeasurement[];
  pathologyBoxes: PathologyBoundingBox[];
  clinicalNotes: string;
}

/**
 * Calculates real-world length in millimeters given two coordinates on a calibrated image canvas.
 */
export function calculateWorkingLengthMm(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  calibratedMmPerPixel: number = 0.05
): number {
  const pixelDistance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const lengthMm = pixelDistance * calibratedMmPerPixel;
  return Number(lengthMm.toFixed(1));
}
