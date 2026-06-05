import { bioHash, bioHashMatch, generateSalt, hammingDistance } from './bioHash';
import { addDifferentialPrivacy } from './differentialPrivacy';
import { recordMatchScore } from './adaptiveThreshold';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function l2Normalize(embedding: number[]): number[] {
  let norm = 0;
  for (const v of embedding) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return embedding;
  return embedding.map(v => v / norm);
}

export type EmbeddingMethod = 'onnx' | 'landmark';

// Thresholds are method-specific because the two embedding spaces behave
// very differently:
//  • onnx     — custom MobileFaceNet/ArcFace: discriminative, low cosine
//               separates identities (same ~0.5-0.8, different <0.3).
//  • landmark — geometric fallback: structurally similar across people,
//               so it needs a high threshold and is less discriminative.
export const THRESHOLDS: Record<EmbeddingMethod, { match: number; dup: number }> = {
  onnx: { match: 0.42, dup: 0.55 },
  landmark: { match: 0.80, dup: 0.88 },
};

// Defaults (used for UI display) reflect the primary CNN path.
export const MATCH_THRESHOLD = THRESHOLDS.onnx.match;
export const DUPLICATE_THRESHOLD = THRESHOLDS.onnx.dup;

export function checkDuplicateEnrollment(
  newEmbedding: number[],
  existingEmbeddings: { id: string; name: string; embedding: number[] }[],
  method: EmbeddingMethod = 'onnx',
): { id: string; name: string; score: number } | null {
  const normalized = l2Normalize(newEmbedding);
  const dupThreshold = THRESHOLDS[method].dup;

  for (const enrolled of existingEmbeddings) {
    const enrolledNorm = l2Normalize(enrolled.embedding);
    const score = cosineSimilarity(normalized, enrolledNorm);
    if (score >= dupThreshold) {
      return { id: enrolled.id, name: enrolled.name, score };
    }
  }
  return null;
}

export interface MatchResult {
  id: string;
  name: string;
  score: number;
  bioHashVerified: boolean;
}

export function findBestMatch(
  queryEmbedding: number[],
  enrolledEmbeddings: { id: string; name: string; embedding: number[]; bioHash?: string; bioHashSalt?: string }[],
  method: EmbeddingMethod = 'onnx',
): MatchResult | null {
  const threshold = THRESHOLDS[method].match;
  const normalized = l2Normalize(queryEmbedding);
  let bestScore = -1;
  let bestMatch: MatchResult | null = null;

  for (const enrolled of enrolledEmbeddings) {
    const enrolledNorm = l2Normalize(enrolled.embedding);
    const score = cosineSimilarity(normalized, enrolledNorm);

    if (score > bestScore) {
      bestScore = score;

      // Dual verification: cosine + bioHash
      let bioHashVerified = false;
      if (enrolled.bioHash && enrolled.bioHashSalt) {
        const bhResult = bioHashMatch(queryEmbedding, enrolled.bioHash, enrolled.bioHashSalt);
        bioHashVerified = bhResult.match;
      } else {
        // Legacy templates without bioHash: accept cosine-only
        bioHashVerified = true;
      }

      bestMatch = { id: enrolled.id, name: enrolled.name, score, bioHashVerified };
    }
  }

  if (bestMatch && bestMatch.score >= threshold) {
    // Record for adaptive threshold learning
    recordMatchScore(bestMatch.score, true).catch(() => {});
    return bestMatch;
  }

  // Record impostor score
  if (bestScore > 0) {
    recordMatchScore(bestScore, false).catch(() => {});
  }

  return null;
}

export function prepareEmbeddingForStorage(embedding: number[]): {
  embedding: number[];
  hash: string;
  salt: string;
} {
  // IMPORTANT: store the CLEAN, L2-normalized embedding for matching.
  // Differential-privacy noise (scale ~0.33 per dim) on a unit vector
  // completely destroys cosine similarity and breaks both matching and
  // duplicate detection. The cancellable-template privacy guarantee is
  // provided by the BioHash (ISO/IEC 24745) below, not by corrupting the
  // matching vector. DP remains available as an opt-in transform.
  const clean = l2Normalize(embedding);
  const salt = generateSalt();
  const hash = bioHash(clean, salt);
  return { embedding: clean, hash, salt };
}
