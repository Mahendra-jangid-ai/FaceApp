import { addDifferentialPrivacy, estimatePrivacyLoss } from '../src/services/differentialPrivacy';

describe('Differential Privacy', () => {
  const embedding = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1));

  it('returns same-length embedding', () => {
    const noisy = addDifferentialPrivacy(embedding);
    expect(noisy.length).toBe(embedding.length);
  });

  it('adds noise (result differs from input)', () => {
    const noisy = addDifferentialPrivacy(embedding);
    const same = noisy.every((v, i) => v === embedding[i]);
    expect(same).toBe(false);
  });

  it('re-normalizes to unit sphere', () => {
    const noisy = addDifferentialPrivacy(embedding);
    const norm = Math.sqrt(noisy.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 1);
  });

  it('respects disabled flag', () => {
    const result = addDifferentialPrivacy(embedding, { enabled: false });
    expect(result).toEqual(embedding);
  });

  it('higher epsilon = less noise', () => {
    // Run multiple trials and check variance
    let totalDiffHigh = 0;
    let totalDiffLow = 0;
    const trials = 50;

    for (let t = 0; t < trials; t++) {
      const highEps = addDifferentialPrivacy(embedding, { epsilon: 10 });
      const lowEps = addDifferentialPrivacy(embedding, { epsilon: 0.5 });

      const diffHigh = embedding.reduce((s, v, i) => s + Math.abs(v - highEps[i]), 0);
      const diffLow = embedding.reduce((s, v, i) => s + Math.abs(v - lowEps[i]), 0);

      totalDiffHigh += diffHigh;
      totalDiffLow += diffLow;
    }

    // Low epsilon should produce more deviation on average
    expect(totalDiffLow / trials).toBeGreaterThan(totalDiffHigh / trials);
  });

  it('estimates privacy loss correctly', () => {
    expect(estimatePrivacyLoss(1, 1).privacyLevel).toBe('Strong');
    expect(estimatePrivacyLoss(2, 3).privacyLevel).toBe('Moderate');
    expect(estimatePrivacyLoss(5, 3).privacyLevel).toBe('Minimal');
  });
});
