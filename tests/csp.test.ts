import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createNonce } from '@/lib/security/csp';

/**
 * The Content-Security-Policy.
 *
 * The policy is the difference between an injected script running and being
 * blocked, and it is assembled from a string template - so the failure mode is
 * a typo that silently weakens it. These assertions pin the properties that
 * carry the security, not the exact string.
 */
const SUPABASE = 'https://project-ref.supabase.co';

// Set before the describe bodies evaluate, NOT in beforeEach. The policies
// below are built while the suite is being collected, which happens before any
// hook runs - a beforeEach here would silently test a policy with no Supabase
// host configured, and pass for the wrong reason.
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;

function directive(policy: string, name: string): string {
  const found = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + ' '));
  return found ?? '';
}

describe('production policy', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'test-nonce',
    isDevelopment: false,
  });

  it('carries the nonce and strict-dynamic on script-src', () => {
    const scriptSrc = directive(policy, 'script-src');
    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it('never allows eval in production', () => {
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('never allows inline script, which would defeat the nonce entirely', () => {
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('locks the directives that stop exfiltration and framing', () => {
    expect(directive(policy, 'form-action')).toBe("form-action 'self'");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
  });

  it('names the project Supabase host rather than wildcarding it', () => {
    expect(directive(policy, 'img-src')).toContain(SUPABASE);
    expect(directive(policy, 'connect-src')).toContain(SUPABASE);
    expect(policy).not.toContain('*.supabase.co');
  });

  it('upgrades insecure requests', () => {
    expect(policy).toContain('upgrade-insecure-requests');
  });
});

describe('development policy', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'dev-nonce',
    isDevelopment: true,
  });

  it('allows eval, which React needs only in development', () => {
    expect(directive(policy, 'script-src')).toContain("'unsafe-eval'");
  });

  it('allows the hot-reload socket', () => {
    expect(directive(policy, 'connect-src')).toContain('ws:');
  });

  it('does not upgrade insecure requests, which would break localhost', () => {
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});

describe('createNonce', () => {
  it('produces a different value every call', () => {
    const values = new Set(Array.from({ length: 50 }, () => createNonce()));
    expect(values.size).toBe(50);
  });

  it('produces enough entropy to be unguessable', () => {
    expect(createNonce().length).toBeGreaterThanOrEqual(22);
  });
});
