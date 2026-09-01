import 'server-only';

/**
 * Fixed-window rate limiter, in memory.
 *
 * Honest about its limits: this is per-instance state. On Vercel, each serverless
 * instance keeps its own counter, so a determined attacker spread across
 * instances gets more than the nominal budget. It stops casual form spam and
 * accidental double-submits, which is what the public forms actually face.
 *
 * When submission volume justifies it, swap the store for Upstash Redis; the
 * call signature does not change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Bounded so a flood of unique keys cannot grow the map without limit. */
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: allowed
      ? 0
      : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Client IP from Vercel's proxy headers.
 *
 * x-forwarded-for is client-controllable in general, but on Vercel the platform
 * overwrites it, so the first entry is trustworthy in production. Falls back to
 * a shared key locally, which is fine because local traffic is one developer.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'local';
}

/** Budgets for the public write endpoints. */
export const RATE_LIMITS = {
  inquiry: { limit: 5, windowMs: 10 * 60 * 1000 },
  sellerSubmission: { limit: 3, windowMs: 60 * 60 * 1000 },
  viewingRequest: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
