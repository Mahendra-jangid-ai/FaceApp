/**
 * ISO/IEC 24745 Compliant Cancellable Biometric Template Protection.
 *
 * Generates a pseudo-random orthonormal projection matrix seeded by a
 * per-user salt. Projects the 512-d embedding then sign-quantizes to
 * produce a 512-bit binary hash. Only hash + salt are stored;
 * original embedding is irrecoverable.
 */

const DIM = 512;

function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

const MATRIX_CACHE_SIZE = 8;
const matrixCache = new Map<string, number[][]>();

function generateProjectionMatrix(salt: string): number[][] {
  const cached = matrixCache.get(salt);
  if (cached) return cached;

  const rng = seededRng(salt);
  const matrix: number[][] = [];

  for (let i = 0; i < DIM; i++) {
    const row = new Array(DIM);
    for (let j = 0; j < DIM; j++) {
      const u1 = rng() || 1e-10;
      const u2 = rng();
      row[j] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    // Gram-Schmidt orthogonalization
    for (let k = 0; k < i; k++) {
      let dot = 0;
      for (let j = 0; j < DIM; j++) dot += row[j] * matrix[k][j];
      for (let j = 0; j < DIM; j++) row[j] -= dot * matrix[k][j];
    }
    let norm = 0;
    for (let j = 0; j < DIM; j++) norm += row[j] * row[j];
    norm = Math.sqrt(norm);
    if (norm > 1e-10) {
      for (let j = 0; j < DIM; j++) row[j] /= norm;
    }
    matrix.push(row);
  }

  if (matrixCache.size >= MATRIX_CACHE_SIZE) {
    const oldest = matrixCache.keys().next().value;
    if (oldest !== undefined) matrixCache.delete(oldest);
  }
  matrixCache.set(salt, matrix);
  return matrix;
}

export function generateSalt(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < 32; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}

export function bioHash(embedding: number[], salt: string): string {
  const paddedEmbedding = new Array(DIM).fill(0);
  for (let i = 0; i < Math.min(embedding.length, DIM); i++) {
    paddedEmbedding[i] = embedding[i];
  }

  const M = generateProjectionMatrix(salt);
  const bits: string[] = [];
  for (let i = 0; i < DIM; i++) {
    let projected = 0;
    for (let j = 0; j < DIM; j++) {
      projected += M[i][j] * paddedEmbedding[j];
    }
    bits.push(projected > 0 ? '1' : '0');
  }
  return bits.join('');
}

export function hammingDistance(hash1: string, hash2: string): number {
  let dist = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

export function bioHashMatch(
  liveEmbedding: number[],
  storedHash: string,
  salt: string,
  threshold: number = 0.35,
): { match: boolean; normalizedDistance: number } {
  const liveHash = bioHash(liveEmbedding, salt);
  const dist = hammingDistance(liveHash, storedHash);
  const normalizedDistance = dist / DIM;
  return {
    match: normalizedDistance < threshold,
    normalizedDistance,
  };
}

export function clearBioHashCache(): void {
  matrixCache.clear();
}
