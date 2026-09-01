import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved connection URLs out of schema.prisma.
 *
 * - Migrations / introspection use DIRECT_URL (a direct Postgres connection).
 *   Supabase's pooled connection cannot run DDL reliably, so migrations must
 *   never go through the pooler.
 * - Application runtime uses DATABASE_URL via the driver adapter in src/lib/db.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // Read lazily rather than via prisma/config's env(), which throws at import
    // time - that would break `prisma generate` before Supabase is wired up.
    // Migration commands fail with a clear message if this is still empty.
    url: process.env.DIRECT_URL ?? '',
  },
});
