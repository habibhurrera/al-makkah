import { z } from 'zod';

/**
 * Environment validation.
 *
 * Parsed lazily rather than at module load, so `next build` still works with no
 * database configured (which is how the site deploys today). The first call
 * that actually needs a value fails loudly with the missing variable named,
 * instead of throwing an opaque undefined error deep in a query.
 */

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL must be a URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

/**
 * Server-only secrets. Calling this from client code is a build error because
 * the values are not inlined into the browser bundle.
 */
export function serverEnv() {
  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Missing server environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.message}`)
        .join('\n')}\nCopy .env.example to .env.local and fill it in.`,
    );
  }
  return parsed.data;
}

/** Values safe to expose to the browser. */
export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Missing public environment variables:\n${parsed.error.issues
        .map((issue) => `  - ${issue.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}

/**
 * The site's public origin, used for canonical URLs, Open Graph images and the
 * sitemap.
 *
 * NEXT_PUBLIC_SITE_URL wins when it is set to a real domain. If it is missing
 * or still points at localhost (easy to leave behind when copying a local env
 * file into a host), Vercel's own production URL is used instead - so a
 * deployed sitemap can never advertise localhost to search engines.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured && !configured.includes('localhost')) return configured;

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;

  const vercelDeployment = process.env.VERCEL_URL;
  if (vercelDeployment) return `https://${vercelDeployment}`;

  return configured ?? 'http://localhost:3000';
}

export const siteUrl = resolveSiteUrl();
