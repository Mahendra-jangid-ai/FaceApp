import type { FaceDetectionResult } from '../types';

export interface QualityCheck {
  passed: boolean;
  score: number;
  reasons: string[];
}

/**
 * If ML Kit found a face → quality passes. Period.
 * No angle checks, no eye checks — if a face is detected, it's good enough.
 * The liveness challenges handle everything else.
 */
export function checkFaceQuality(
  face: FaceDetectionResult,
  _imageWidth?: number,
  _thresholds?: any,
): QualityCheck {
  if (!face.found) {
    return { passed: false, score: 0, reasons: ['No face detected'] };
  }
  return { passed: true, score: 1, reasons: [] };
}

export function getQualityFeedback(check: QualityCheck): string {
  if (check.passed) return 'Good quality';
  return check.reasons[0] || 'No face detected';
}
