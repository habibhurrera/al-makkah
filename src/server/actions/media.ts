'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin, writeAuditLog } from '@/server/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { BUCKET } from '@/lib/storage';
import type { ActionResult } from '@/server/actions/admin';

/**
 * Gallery management for a listing.
 *
 * The one rule that shapes this file: a seller's upload never becomes public
 * on its own. Moving a file from the private submissions bucket to the public
 * media bucket is an explicit, per-file admin decision, recorded in the audit
 * log. That is what stops an unverified photo - or someone's ownership
 * document - appearing on the website.
 */

function extensionOf(path: string): string {
  return (path.split('.').pop() ?? 'bin').toLowerCase();
}

function kindFor(path: string): 'IMAGE' | 'VIDEO' {
  return ['mp4', 'mov', 'webm', 'quicktime'].includes(extensionOf(path))
    ? 'VIDEO'
    : 'IMAGE';
}

function mimeFor(path: string): string {
  const extension = extensionOf(path);
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  };
  return map[extension] ?? 'application/octet-stream';
}

const importSchema = z.object({
  propertyId: z.cuid(),
  paths: z.array(z.string().min(1)).min(1, 'Select at least one file'),
});

/**
 * Copies chosen submission files into the public gallery.
 *
 * Cross-bucket copying is a download-then-upload: Supabase can only copy
 * within a bucket. The source file is left in place, so the original
 * submission stays intact as evidence of what was sent.
 */
export async function importSubmissionMedia(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = importSchema.safeParse({
    propertyId: formData.get('propertyId'),
    paths: formData.getAll('paths').map(String),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const property = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { id: true, slug: true, submission: { select: { mediaPaths: true } } },
  });

  if (!property) return { ok: false, message: 'Property not found.' };

  // Only files that genuinely belong to this listing's own submission may be
  // imported. Without this, a crafted request could copy any object out of the
  // private bucket - including another seller's documents - into public view.
  const allowed = new Set(property.submission?.mediaPaths ?? []);
  const paths = parsed.data.paths.filter((path) => allowed.has(path));

  if (paths.length === 0) {
    return { ok: false, message: 'Those files do not belong to this listing.' };
  }

  const supabase = createSupabaseAdminClient();
  const existingCount = await prisma.propertyMedia.count({
    where: { propertyId: property.id },
  });

  let imported = 0;
  const failures: string[] = [];

  for (const [index, path] of paths.entries()) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET.submissions)
      .download(path);

    if (downloadError || !file) {
      failures.push(path);
      continue;
    }

    const target = `${property.id}/${crypto.randomUUID()}.${extensionOf(path)}`;
    const mimeType = mimeFor(path);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET.media)
      .upload(target, file, { contentType: mimeType, upsert: false });

    if (uploadError) {
      failures.push(path);
      continue;
    }

    await prisma.propertyMedia.create({
      data: {
        propertyId: property.id,
        kind: kindFor(path),
        storagePath: target,
        mimeType,
        byteSize: file.size,
        sortOrder: existingCount + index,
        uploadStatus: 'READY',
      },
    });
    imported += 1;
  }

  await writeAuditLog({
    actorId: admin.adminId,
    action: 'media.import',
    entityType: 'Property',
    entityId: property.id,
    after: { imported, failed: failures.length },
  });

  revalidatePath(`/admin/properties/${property.id}/media`);
  revalidatePath(`/property/${property.slug}`);
  revalidatePath('/buy');
  revalidatePath('/rent');
  revalidatePath('/');

  return {
    ok: imported > 0,
    message:
      failures.length > 0
        ? `Published ${imported} file(s); ${failures.length} could not be copied.`
        : `Published ${imported} file(s) to the listing.`,
  };
}

const deleteSchema = z.object({ mediaId: z.cuid() });

export async function deletePropertyMedia(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const media = await prisma.propertyMedia.findUnique({
    where: { id: parsed.data.mediaId },
    select: { id: true, storagePath: true, property: { select: { id: true, slug: true } } },
  });
  if (!media) return { ok: false, message: 'File not found.' };

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(BUCKET.media).remove([media.storagePath]);
  await prisma.propertyMedia.delete({ where: { id: media.id } });

  await writeAuditLog({
    actorId: admin.adminId,
    action: 'media.delete',
    entityType: 'PropertyMedia',
    entityId: media.id,
  });

  revalidatePath(`/admin/properties/${media.property.id}/media`);
  revalidatePath(`/property/${media.property.slug}`);
  revalidatePath('/buy');
  revalidatePath('/rent');

  return { ok: true, message: 'File removed from the listing.' };
}

const moveSchema = z.object({
  mediaId: z.cuid(),
  direction: z.enum(['up', 'down', 'cover']),
});

/**
 * Reordering. "cover" promotes a file to first, which is the image used on
 * cards, the detail hero and social previews.
 */
export async function reorderPropertyMedia(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = moveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const media = await prisma.propertyMedia.findUnique({
    where: { id: parsed.data.mediaId },
    select: { id: true, propertyId: true, property: { select: { slug: true } } },
  });
  if (!media) return { ok: false, message: 'File not found.' };

  const siblings = await prisma.propertyMedia.findMany({
    where: { propertyId: media.propertyId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });

  const order = siblings.map((item) => item.id);
  const from = order.indexOf(media.id);
  if (from === -1) return { ok: false, message: 'File not found.' };

  const to =
    parsed.data.direction === 'cover'
      ? 0
      : parsed.data.direction === 'up'
        ? Math.max(0, from - 1)
        : Math.min(order.length - 1, from + 1);

  order.splice(to, 0, ...order.splice(from, 1));

  // Rewrite the whole sequence so sortOrder stays dense and unambiguous.
  await prisma.$transaction(
    order.map((id, index) =>
      prisma.propertyMedia.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath(`/admin/properties/${media.propertyId}/media`);
  revalidatePath(`/property/${media.property.slug}`);
  revalidatePath('/buy');
  revalidatePath('/rent');
  revalidatePath('/');

  return { ok: true, message: 'Order updated.' };
}
