import { describe, expect, it } from 'vitest';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * Rate limiting, in its in-memory form.
 *
 * The durable Redis store is selected by configuration; what matters here is
 * that the fallback everyone gets by default actually counts, blocks, and
 * keeps separate callers separate.
 */
describe('rateLimit (memory store)', () => {
  it('allows exactly the budget, then blocks', async () => {
    const key = `test-${Math.random()}`;
    const options = { limit: 3, windowMs: 60_000 };

    const first = await rateLimit(key, options);
    const second = await rateLimit(key, options);
    const third = await rateLimit(key, options);
    const fourth = await rateLimit(key, options);

    expect([first.allowed, second.allowed, third.allowed]).toEqual([
      true,
      true,
      true,
    ]);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each caller separately', async () => {
    const options = { limit: 1, windowMs: 60_000 };
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;

    await rateLimit(a, options);
    const aBlocked = await rateLimit(a, options);
    const bAllowed = await rateLimit(b, options);

    expect(aBlocked.allowed).toBe(false);
    expect(bAllowed.allowed).toBe(true);
  });

  it('reports the remaining budget', async () => {
    const key = `rem-${Math.random()}`;
    const first = await rateLimit(key, { limit: 5, windowMs: 60_000 });
    expect(first.remaining).toBe(4);
  });

  it('lets the window expire', async () => {
    const key = `exp-${Math.random()}`;
    const options = { limit: 1, windowMs: 1 };
    await rateLimit(key, options);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const afterWindow = await rateLimit(key, options);
    expect(afterWindow.allowed).toBe(true);
  });
});

describe('clientIp', () => {
  it('takes the first entry of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(clientIp(headers)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip, then to a shared local key', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(clientIp(new Headers())).toBe('local');
  });
});
