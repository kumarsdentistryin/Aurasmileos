import { describe, expect, it } from 'vitest';
import {
  DEMO_CARIES_DETECTIONS,
  cariesSurfacesAfterFilling,
  filterHighConfidenceBoxes,
  mapYoloClassToPathology,
  normalizeXyxyToBox,
  parseYoloDetectResponse,
} from '../caries-detection';

describe('yolov8 caries detection schema', () => {
  it('keeps high-confidence demo boxes', () => {
    const kept = filterHighConfidenceBoxes(DEMO_CARIES_DETECTIONS.boxes, 0.55);
    expect(kept.length).toBe(2);
  });

  it('drops low confidence', () => {
    const kept = filterHighConfidenceBoxes(
      [
        ...DEMO_CARIES_DETECTIONS.boxes,
        {
          id: 'low',
          label: 'CARIES',
          x: 0.1,
          y: 0.1,
          width: 0.1,
          height: 0.1,
          confidence: 0.2,
        },
      ],
      0.55
    );
    expect(kept.every((b) => b.confidence >= 0.55)).toBe(true);
    expect(kept.find((b) => b.id === 'low')).toBeUndefined();
  });

  it('maps DentalAI class strings', () => {
    expect(mapYoloClassToPathology('caries')).toBe('CARIES');
    expect(mapYoloClassToPathology('Cavity')).toBe('CARIES');
    expect(mapYoloClassToPathology('crack')).toBe('FRACTURE');
    expect(mapYoloClassToPathology('unknown')).toBeNull();
  });

  it('normalizes pixel xyxy to 0–1 boxes', () => {
    const box = normalizeXyxyToBox(100, 50, 300, 150, 1000, 500);
    expect(box).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
  });

  it('parses AndreyGermanov /detect wire format', () => {
    const boxes = parseYoloDetectResponse(
      [
        [100, 50, 300, 150, 'caries', 0.91],
        [10, 10, 20, 20, 'caries', 0.2],
        [0, 0, 50, 50, 'not-a-class', 0.99],
      ],
      { imageWidth: 1000, imageHeight: 500, minConfidence: 0.55 }
    );
    expect(boxes).toHaveLength(1);
    expect(boxes[0].label).toBe('CARIES');
    expect(boxes[0].confidence).toBe(0.91);
    expect(boxes[0].width).toBeCloseTo(0.2);
  });

  it('prefers filling surfaces over overlapping caries', () => {
    expect(cariesSurfacesAfterFilling(['M', 'O', 'D'], ['O'])).toEqual(['M', 'D']);
  });
});
