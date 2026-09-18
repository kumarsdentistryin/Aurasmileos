/**
 * YOLOv8-style caries / periapical detection schema (AndreyGermanov pattern).
 * Demo overlays only — no live model required offline.
 *
 * Wire format from ai-dental-caries-detector POST /detect:
 *   [[x1, y1, x2, y2, object_type, probability], ...]
 * with pixel xyxy coordinates. AuraSmile stores normalized 0–1 boxes.
 */

export type DentalPathologyLabel =
  | 'CARIES'
  | 'PERIAPICAL_RADIOLUCENCY'
  | 'BONE_LOSS'
  | 'IMPACTED_THIRD_MOLAR'
  | 'FRACTURE';

export interface YoloBoundingBox {
  id: string;
  label: DentalPathologyLabel;
  /** Normalized 0–1 box relative to image width/height */
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  toothHint?: number;
}

export interface CariesDetectionResult {
  imageId: string;
  modelId: string;
  boxes: YoloBoundingBox[];
  inferredAt: string;
}

/** Pixel-space YOLO detection tuple from Flask /detect (GPL service — consume JSON only). */
export type RawYoloDetectTuple = [
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objectType: string,
  probability: number,
];

export function filterHighConfidenceBoxes(
  boxes: YoloBoundingBox[],
  minConfidence = 0.55
): YoloBoundingBox[] {
  return boxes.filter((b) => b.confidence >= minConfidence && Number.isFinite(b.confidence));
}

/**
 * Maps DentalAI / YOLOv8 class strings to AuraSmile pathology labels.
 * Unknown labels are dropped (null) — never invent a clinical finding.
 */
export function mapYoloClassToPathology(objectType: string): DentalPathologyLabel | null {
  const key = objectType.trim().toLowerCase();
  if (key === 'caries' || key === 'cavity' || key === 'decay') return 'CARIES';
  if (key === 'crack' || key === 'fracture' || key === 'cracked') return 'FRACTURE';
  if (key === 'periapical' || key === 'periapical_radiolucency' || key === 'lesion') {
    return 'PERIAPICAL_RADIOLUCENCY';
  }
  if (key === 'bone_loss' || key === 'boneloss') return 'BONE_LOSS';
  if (key === 'impacted' || key === 'impacted_third_molar') return 'IMPACTED_THIRD_MOLAR';
  return null;
}

/**
 * Converts pixel xyxy → normalized origin+size box (clamped to [0,1]).
 */
export function normalizeXyxyToBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  imageWidth: number,
  imageHeight: number
): Pick<YoloBoundingBox, 'x' | 'y' | 'width' | 'height'> | null {
  if (!(imageWidth > 0) || !(imageHeight > 0)) return null;
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);

  const x = Math.min(1, Math.max(0, left / imageWidth));
  const y = Math.min(1, Math.max(0, top / imageHeight));
  const width = Math.min(1 - x, Math.max(0, (right - left) / imageWidth));
  const height = Math.min(1 - y, Math.max(0, (bottom - top) / imageHeight));

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

export interface ParseYoloDetectOptions {
  imageWidth: number;
  imageHeight: number;
  minConfidence?: number;
  idPrefix?: string;
}

/**
 * Adapts ai-dental-caries-detector JSON into AuraSmile overlay boxes.
 * Assistive only — caller must require dentist confirmation before chart writes.
 */
export function parseYoloDetectResponse(
  raw: unknown,
  options: ParseYoloDetectOptions
): YoloBoundingBox[] {
  if (!Array.isArray(raw)) return [];

  const minConfidence = options.minConfidence ?? 0.55;
  const idPrefix = options.idPrefix ?? 'yolo';
  const out: YoloBoundingBox[] = [];

  raw.forEach((row, index) => {
    if (!Array.isArray(row) || row.length < 6) return;
    const [x1, y1, x2, y2, objectType, probability] = row as RawYoloDetectTuple;
    if (typeof objectType !== 'string' || typeof probability !== 'number') return;
    if (!Number.isFinite(probability) || probability < minConfidence) return;

    const label = mapYoloClassToPathology(objectType);
    if (!label) return;

    const box = normalizeXyxyToBox(
      Number(x1),
      Number(y1),
      Number(x2),
      Number(y2),
      options.imageWidth,
      options.imageHeight
    );
    if (!box) return;

    out.push({
      id: `${idPrefix}-${index + 1}`,
      label,
      ...box,
      confidence: probability,
    });
  });

  return out;
}

/**
 * Charting rule from dental-charting-odontogram: filling on a surface wins over caries.
 * Returns caries surfaces that remain after removing those already restored.
 */
export function cariesSurfacesAfterFilling(
  cariesSurfaces: string[],
  fillingSurfaces: string[]
): string[] {
  const filled = new Set(fillingSurfaces.map((s) => s.toUpperCase()));
  return cariesSurfaces.filter((s) => !filled.has(s.toUpperCase()));
}

/** Demo detection set for Indiranagar RVG #16 — offline fallback. */
export const DEMO_CARIES_DETECTIONS: CariesDetectionResult = {
  imageId: 'img-rvg-16',
  modelId: 'yolov8n-dental-caries-demo',
  inferredAt: '2026-09-15T10:30:00+05:30',
  boxes: [
    {
      id: 'bbox-1',
      label: 'CARIES',
      x: 0.42,
      y: 0.38,
      width: 0.18,
      height: 0.22,
      confidence: 0.91,
      toothHint: 16,
    },
    {
      id: 'bbox-2',
      label: 'PERIAPICAL_RADIOLUCENCY',
      x: 0.48,
      y: 0.62,
      width: 0.12,
      height: 0.14,
      confidence: 0.76,
      toothHint: 16,
    },
  ],
};
