/**
 * Local Differential Privacy for facial embeddings.
 *
 * Adds calibrated Laplacian noise to embedding vectors before storage,
 * providing mathematical privacy guarantees while maintaining recognition
 * accuracy within acceptable bounds.
 *
 * Privacy parameter epsilon controls the noise-accuracy tradeoff.
 * Lower epsilon = more privacy but less accuracy.
 */

function laplacianNoise(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export interface PrivacyConfig {
  epsilon: number;        // Privacy budget (recommended: 1.0 - 5.0)
  sensitivity: number;    // L2 sensitivity of the embedding function
  enabled: boolean;
}

const DEFAULT_CONFIG: PrivacyConfig = {
  epsilon: 3.0,
  sensitivity: 1.0,      // Normalized embeddings have L2 norm = 1
  enabled: true,
};

export function addDifferentialPrivacy(
  embedding: number[],
  config: Partial<PrivacyConfig> = {},
): number[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.enabled) return embedding;

  const scale = cfg.sensitivity / cfg.epsilon;
  const noisy = new Array(embedding.length);

  for (let i = 0; i < embedding.length; i++) {
    noisy[i] = embedding[i] + laplacianNoise(scale);
  }

  // Re-normalize to unit sphere to maintain cosine similarity semantics
  let norm = 0;
  for (const v of noisy) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < noisy.length; i++) noisy[i] /= norm;
  }

  return noisy;
}

export function estimatePrivacyLoss(
  numQueries: number,
  epsilon: number,
): { totalEpsilon: number; privacyLevel: string } {
  // Sequential composition: total privacy loss is sum of individual epsilons
  const totalEpsilon = numQueries * epsilon;
  let privacyLevel: string;

  if (totalEpsilon <= 1) privacyLevel = 'Strong';
  else if (totalEpsilon <= 5) privacyLevel = 'Moderate';
  else if (totalEpsilon <= 10) privacyLevel = 'Weak';
  else privacyLevel = 'Minimal';

  return { totalEpsilon, privacyLevel };
}
