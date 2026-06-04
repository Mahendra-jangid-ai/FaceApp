import type { FaceDetectionResult } from '../types';

export interface QualityCheck {
  passed: boolean;
  score: number;
  reasons: string[];
}

interface QualityThresholds {
  minFaceWidthRatio: number;
  maxFaceWidthRatio: number;
  minBrightness: number;
  maxYawAngle: number;
  maxRollAngle: number;
  minEyeOpenProbability: number;
  minSharpness: number;
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  minFaceWidthRatio: 0.15,
  maxFaceWidthRatio: 0.85,
  minBrightness: 0.2,
  maxYawAngle: 25,
  maxRollAngle: 15,
  minEyeOpenProbability: 0.3,
  minSharpness: 0.4,
};

export function checkFaceQuality(
  face: FaceDetectionResult,
  imageWidth?: number,
  thresholds: Partial<QualityThresholds> = {},
): QualityCheck {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons: string[] = [];
  let totalScore = 0;
  let checks = 0;

  if (!face.found) {
    return { passed: false, score: 0, reasons: ['No face detected'] };
  }

  // Pose check - face should be roughly frontal
  const absYaw = Math.abs(face.headEulerAngleY);
  const absRoll = Math.abs(face.headEulerAngleZ);
  if (absYaw > t.maxYawAngle) {
    reasons.push(`Head turned too far (${absYaw.toFixed(0)}°)`);
  } else {
    totalScore += 1 - absYaw / t.maxYawAngle;
  }
  checks++;

  if (absRoll > t.maxRollAngle) {
    reasons.push(`Head tilted too far (${absRoll.toFixed(0)}°)`);
  } else {
    totalScore += 1 - absRoll / t.maxRollAngle;
  }
  checks++;

  // Eyes should be open
  if (face.leftEyeOpenProbability >= 0 && face.rightEyeOpenProbability >= 0) {
    const avgEyeOpen = (face.leftEyeOpenProbability + face.rightEyeOpenProbability) / 2;
    if (avgEyeOpen < t.minEyeOpenProbability) {
      reasons.push('Eyes appear closed');
    } else {
      totalScore += avgEyeOpen;
    }
    checks++;
  }

  // Face size check
  if (face.bounds && imageWidth) {
    const faceRatio = face.bounds.width / imageWidth;
    if (faceRatio < t.minFaceWidthRatio) {
      reasons.push('Face too small - move closer');
    } else if (faceRatio > t.maxFaceWidthRatio) {
      reasons.push('Face too close - move back');
    } else {
      totalScore += 1;
    }
    checks++;
  }

  const score = checks > 0 ? totalScore / checks : 0;
  const passed = reasons.length === 0 && score > 0.5;

  return { passed, score, reasons };
}

export function getQualityFeedback(check: QualityCheck): string {
  if (check.passed) return 'Good quality';
  if (check.reasons.length === 0) return 'Low quality image';
  return check.reasons[0];
}
