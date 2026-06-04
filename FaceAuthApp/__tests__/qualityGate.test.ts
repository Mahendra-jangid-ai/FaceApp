import { checkFaceQuality } from '../src/services/qualityGate';
import type { FaceDetectionResult } from '../src/types';

function makeFace(overrides: Partial<FaceDetectionResult> = {}): FaceDetectionResult {
  return {
    found: true,
    smilingProbability: 0.1,
    leftEyeOpenProbability: 0.9,
    rightEyeOpenProbability: 0.9,
    headEulerAngleY: 0,
    headEulerAngleZ: 0,
    ...overrides,
  };
}

describe('Quality Gate', () => {
  it('passes good frontal face', () => {
    const result = checkFaceQuality(makeFace());
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('fails when no face detected', () => {
    const result = checkFaceQuality(makeFace({ found: false }));
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain('No face detected');
  });

  it('fails when head turned too far', () => {
    const result = checkFaceQuality(makeFace({ headEulerAngleY: 35 }));
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('turned'))).toBe(true);
  });

  it('fails when head tilted too far', () => {
    const result = checkFaceQuality(makeFace({ headEulerAngleZ: 20 }));
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('tilted'))).toBe(true);
  });

  it('fails when eyes are closed', () => {
    const result = checkFaceQuality(makeFace({
      leftEyeOpenProbability: 0.1,
      rightEyeOpenProbability: 0.1,
    }));
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('closed'))).toBe(true);
  });
});
