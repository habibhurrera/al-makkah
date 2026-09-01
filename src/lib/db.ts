import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma';

/**
 * Single Prisma client for the whole app.
 *
 * Prisma 7 requires an explicit driver adapter; the pooled Supabase URL
 * (DATABASE_URL) is the runtime connection. Migrations use DIRECT_URL and are
 * configured separately in prisma.config.ts.
 *
 * The global cache prevents connection exhaustion from hot-reload in dev.
 *
 * Nothing outside src/server/ should import this. Keeping DB access behind
 * that boundary is what stops an authorization check being bypassed by an
 * accidental import into a component.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
