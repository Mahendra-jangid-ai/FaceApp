export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, opts: RetryOptions): number {
  let delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
  delay = Math.min(delay, opts.maxDelayMs);
  if (opts.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  return Math.round(delay);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < opts.maxAttempts - 1) {
        const delay = computeDelay(attempt, opts);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts exhausted');
}

export function isRetryableError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode;
  if (status && (status === 429 || status >= 500)) return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed')
  );
}
