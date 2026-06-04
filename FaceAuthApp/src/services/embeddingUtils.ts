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

export const MATCH_THRESHOLD = 0.45;
export const DUPLICATE_THRESHOLD = 0.75;

export function checkDuplicateEnrollment(
  newEmbedding: number[],
  existingEmbeddings: { id: string; name: string; embedding: number[] }[],
): { id: string; name: string; score: number } | null {
  const normalized = l2Normalize(newEmbedding);

  for (const enrolled of existingEmbeddings) {
    const enrolledNorm = l2Normalize(enrolled.embedding);
    const score = cosineSimilarity(normalized, enrolledNorm);
    if (score >= DUPLICATE_THRESHOLD) {
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
  threshold: number = MATCH_THRESHOLD,
): MatchResult | null {
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
  const privatized = addDifferentialPrivacy(embedding);
  const salt = generateSalt();
  const hash = bioHash(embedding, salt);
  return { embedding: privatized, hash, salt };
}
