import 'server-only';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/server/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { BUCKET, publicMediaUrl } from '@/lib/storage';
import { ACCEPTED_VIDEO_TYPES } from '@/lib/storage';

/**
 * Reading media that lives in the private buckets.
 *
 * Submission uploads are unverified material from the public - they can hold
 * someone's ownership papers or a photo of the wrong house - so the bucket has
 * no public URLs at all. An admin views them through short-lived signed links
 * minted per request, which expire on their own.
 */

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

export type SignedMedia = {
  path: string;
  url: string | null;
  isVideo: boolean;
};

function looksLikeVideo(path: string): boolean {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  return ['mp4', 'mov', 'webm', 'quicktime'].includes(extension);
}

/** Signed links for one submission's uploads. Admin only. */
export async function getSubmissionMedia(
  submissionId: string,
): Promise<SignedMedia[]> {
  await requireAdmin();

  const submission = await prisma.sellerSubmission.findUnique({
    where: { id: submissionId },
    select: { mediaPaths: true },
  });

  if (!submission || submission.mediaPaths.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET.submissions)
    .createSignedUrls(submission.mediaPaths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return submission.mediaPaths.map((path) => ({
      path,
      url: null,
      isVideo: looksLikeVideo(path),
    }));
  }

  return data.map((item) => ({
    path: item.path ?? '',
    url: item.signedUrl ?? null,
    isVideo: looksLikeVideo(item.path ?? ''),
  }));
}

/** Everything an admin needs to manage one listing's gallery. */
export async function getPropertyForMedia(propertyId: string) {
  await requireAdmin();

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      refNo: true,
      slug: true,
      title: true,
      status: true,
      media: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          kind: true,
          storagePath: true,
          sortOrder: true,
          mimeType: true,
          uploadStatus: true,
        },
      },
      submission: { select: { id: true, mediaPaths: true } },
    },
  });

  if (!property) return null;

  return {
    ...property,
    media: property.media.map((item) => ({
      ...item,
      url: publicMediaUrl(item.storagePath),
      isVideo: ACCEPTED_VIDEO_TYPES.includes(item.mimeType ?? ''),
    })),
  };
}
