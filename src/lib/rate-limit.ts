import 'server-only';

/**
 * Fixed-window rate limiting for the public write paths.
 *
 * Two stores, one interface:
 *
 *  - **Upstash Redis**, used automatically when UPSTASH_REDIS_REST_URL and
 *    UPSTASH_REDIS_REST_TOKEN are set. Counters are shared by every serverless
 *    instance, so the budget below is the real budget.
 *  - **In memory**, the fallback. Per-instance state: on Vercel each instance
 *    keeps its own counter, so an attacker spread across instances gets more
 *    than the nominal budget. It stops casual form spam and accidental double
 *    submits, which is what the public forms actually face day to day.
 *
 * The distinction matters enough to be visible in production: GET /api/health
 * reports which store is active, so "we are rate limited" is a fact you can
 * check rather than assume.
 *
 * Upstash is reached over its REST API with plain fetch - no SDK, no extra
 * dependency, and it works unchanged in every runtime this app uses.
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

export type RateLimitOptions = { limit: number; windowMs: number };

/** True when a shared store is configured. */
export function isDurableRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Which store the running instance is actually using. */
export function rateLimitStore(): 'redis' | 'memory' {
  return isDurableRateLimitConfigured() ? 'redis' : 'memory';
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (isDurableRateLimitConfigured()) {
    const result = await redisRateLimit(key, options);
    // A Redis outage must not take the forms down with it. Falling back to the
    // in-memory counter keeps the endpoint working with a weaker guarantee,
    // which is the right failure direction for a contact form.
    if (result) return result;
  }
  return memoryRateLimit(key, options);
}

// ------------------------------------------------------------------- memory

function memoryRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
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
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

// -------------------------------------------------------------------- redis

/**
 * INCR the counter, and set its expiry only on the first hit of a window.
 *
 * Sending both commands in one pipeline keeps it to a single round trip. INCR
 * on a missing key creates it at 1, so `count === 1` is exactly the moment the
 * window opens and the only moment TTL should be (re)set - setting it on every
 * hit would slide the window forward forever and never let the counter reset.
 *
 * Returns null on any transport or protocol failure so the caller can fall
 * back rather than fail the request.
 */
async function redisRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const namespaced = `rl:${key}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', namespaced],
        ['TTL', namespaced],
      ]),
      // Never let a slow store hold a form submission open.
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const payload: Array<{ result?: unknown; error?: string }> =
      await response.json();

    const count = Number(payload[0]?.result);
    let ttl = Number(payload[1]?.result);
    if (!Number.isFinite(count)) return null;

    // -1 means the key exists with no expiry: the window just opened, or a
    // previous EXPIRE was lost. Either way, give it one.
    if (count === 1 || !Number.isFinite(ttl) || ttl < 0) {
      await fetch(`${url}/expire/${encodeURIComponent(namespaced)}/${windowSeconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      });
      ttl = windowSeconds;
    }

    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: allowed ? 0 : ttl,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------- key

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
