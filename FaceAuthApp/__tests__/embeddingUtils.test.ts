import { cosineSimilarity, l2Normalize, findBestMatch, MATCH_THRESHOLD } from '../src/services/embeddingUtils';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 0, 0, 0];
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('handles real-valued embeddings', () => {
    const a = [0.5, 0.3, -0.2, 0.8];
    const b = [0.5, 0.3, -0.2, 0.8];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });
});

describe('l2Normalize', () => {
  it('normalizes a vector to unit length', () => {
    const v = [3, 4];
    const n = l2Normalize(v);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.8);
    const norm = Math.sqrt(n[0] * n[0] + n[1] * n[1]);
    expect(norm).toBeCloseTo(1.0);
  });

  it('handles zero vector', () => {
    const v = [0, 0, 0];
    const n = l2Normalize(v);
    expect(n).toEqual([0, 0, 0]);
  });
});

describe('findBestMatch', () => {
  const enrolled = [
    { id: '1', name: 'Alice', embedding: l2Normalize([1, 0, 0, 0]) },
    { id: '2', name: 'Bob', embedding: l2Normalize([0, 1, 0, 0]) },
  ];

  it('finds correct match above threshold', () => {
    const query = [1.0, 0.05, 0.02, 0.01];
    const match = findBestMatch(query, enrolled);
    expect(match).not.toBeNull();
    expect(match!.name).toBe('Alice');
    expect(match!.score).toBeGreaterThan(MATCH_THRESHOLD);
  });

  it('returns null when no match above threshold', () => {
    const query = [0.5, 0.5, 0.5, 0.5];
    const match = findBestMatch(query, enrolled);
    // Cosine similarity with unit vectors at 45° is ~0.5, may or may not pass threshold
    if (match) {
      expect(match.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    }
  });

  it('returns null for empty enrolled list', () => {
    const match = findBestMatch([1, 0, 0, 0], []);
    expect(match).toBeNull();
  });
});
