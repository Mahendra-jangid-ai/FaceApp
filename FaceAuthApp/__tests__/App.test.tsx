import { cosineSimilarity, l2Normalize } from '../src/services/embeddingUtils';

describe('FaceAuth App Core', () => {
  it('embedding similarity computation is correct', () => {
    const a = l2Normalize([1, 2, 3, 4]);
    const b = l2Normalize([1, 2, 3, 4]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it('different faces produce low similarity', () => {
    const a = l2Normalize([1, 0, 0, 0]);
    const b = l2Normalize([0, 0, 0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });
});
