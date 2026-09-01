import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { AdminRole } from '@/generated/prisma';

/**
 * Authorization. Every admin action goes through requireAdmin().
 *
 * Two rules this file exists to enforce:
 *
 * 1. Middleware is NOT authorization. It runs before the request reaches the
 *    handler and can be bypassed by anything that does not route through it,
 *    so every privileged operation re-checks here, server-side.
 *
 * 2. The role comes from the database, never from the JWT claims or anything
 *    the client sent. A Supabase session proves identity; it does not prove
 *    what that identity is allowed to do.
 */

export type AdminContext = {
  adminId: string;
  authUserId: string;
  email: string;
  role: AdminRole;
};

/** Returns the admin context, or null if the caller is not an active admin. */
export async function getAdmin(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();

  // getUser() revalidates the token with Supabase. getSession() reads the
  // cookie without verifying it and must not be used for authorization.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { authUserId: user.id },
    select: { id: true, authUserId: true, email: true, role: true, isActive: true },
  });

  if (!admin || !admin.isActive) return null;

  return {
    adminId: admin.id,
    authUserId: admin.authUserId,
    email: admin.email,
    role: admin.role,
  };
}

export class NotAuthorizedError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

/**
 * Throws unless the caller is an active admin. Call this at the top of every
 * admin query and mutation - not once at the route boundary.
 */
export async function requireAdmin(
  minimumRole: AdminRole = 'ADMIN',
): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new NotAuthorizedError();

  if (minimumRole === 'SUPER_ADMIN' && admin.role !== 'SUPER_ADMIN') {
    throw new NotAuthorizedError('Requires super admin');
  }

  return admin;
}

/**
 * Append-only record of consequential admin actions. Called inside the same
 * transaction as the change it describes, so an action can never be applied
 * without its audit entry.
 */
export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  client?: Pick<typeof prisma, 'auditLog'>;
}): Promise<void> {
  const db = params.client ?? prisma;
  await db.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: (params.before ?? undefined) as never,
      after: (params.after ?? undefined) as never,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}
