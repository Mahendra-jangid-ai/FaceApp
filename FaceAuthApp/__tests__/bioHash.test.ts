import { bioHash, bioHashMatch, generateSalt, hammingDistance } from '../src/services/bioHash';

describe('BioHash (ISO/IEC 24745)', () => {
  const testEmbedding = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1));

  it('generates 512-bit hash from embedding', () => {
    const salt = generateSalt();
    const hash = bioHash(testEmbedding, salt);
    expect(hash.length).toBe(512);
    expect(hash).toMatch(/^[01]+$/);
  });

  it('same embedding + same salt = same hash', () => {
    const salt = generateSalt();
    const h1 = bioHash(testEmbedding, salt);
    const h2 = bioHash(testEmbedding, salt);
    expect(h1).toBe(h2);
  });

  it('different salt = different hash (cancellability)', () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    const h1 = bioHash(testEmbedding, s1);
    const h2 = bioHash(testEmbedding, s2);
    expect(h1).not.toBe(h2);
  });

  it('matches same person with same salt', () => {
    const salt = generateSalt();
    const storedHash = bioHash(testEmbedding, salt);
    const result = bioHashMatch(testEmbedding, storedHash, salt);
    expect(result.match).toBe(true);
    expect(result.normalizedDistance).toBe(0);
  });

  it('rejects different person', () => {
    const salt = generateSalt();
    const storedHash = bioHash(testEmbedding, salt);
    const different = Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.5));
    const result = bioHashMatch(different, storedHash, salt);
    // Different embeddings should have high hamming distance
    expect(result.normalizedDistance).toBeGreaterThan(0.2);
  });

  it('salt is 32 chars long', () => {
    const salt = generateSalt();
    expect(salt.length).toBe(32);
    expect(salt).toMatch(/^[a-z0-9]+$/);
  });

  it('hamming distance is 0 for identical hashes', () => {
    expect(hammingDistance('1010', '1010')).toBe(0);
  });

  it('hamming distance counts bit differences', () => {
    expect(hammingDistance('1010', '1001')).toBe(2);
    expect(hammingDistance('1111', '0000')).toBe(4);
  });
});
