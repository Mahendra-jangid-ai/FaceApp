import { withRetry, isRetryableError } from '../src/services/retryPolicy';

describe('Retry Policy', () => {
  it('returns on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));
    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 10 }),
    ).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('identifies retryable errors', () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ message: 'network timeout' })).toBe(true);
    expect(isRetryableError({ message: 'fetch failed' })).toBe(true);
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ message: 'invalid json' })).toBe(false);
  });
});
