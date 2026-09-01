/**
 * Storage path helpers.
 *
 * Only the media bucket is public, so only it gets a plain URL builder. The
 * document and submission buckets are private by design and must be reached
 * through signed URLs issued server-side to an authenticated admin - there is
 * deliberately no public URL function for them.
 */

export const BUCKET = {
  media: process.env.SUPABASE_BUCKET_MEDIA ?? 'property-media',
  documents: process.env.SUPABASE_BUCKET_DOCUMENTS ?? 'property-documents',
  submissions: process.env.SUPABASE_BUCKET_SUBMISSIONS ?? 'submissions',
} as const;

export function publicMediaUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/${BUCKET.media}/${storagePath}`;
}

/** Accepted uploads. Enforced again by the bucket itself, server-side. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_SUBMISSION = 12;

/**
 * Builds a storage key that cannot escape its folder.
 *
 * The original filename is never used as a path: it is reduced to a safe
 * extension and prefixed with a random id, so a name like
 * "../../etc/passwd.jpg" cannot write outside the submission's own folder.
 */
export function submissionObjectPath(
  submissionRef: string,
  originalName: string,
): string {
  const extension = (originalName.split('.').pop() ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5);
  const safeExtension = extension || 'bin';
  const unique = crypto.randomUUID();
  return `${submissionRef}/${unique}.${safeExtension}`;
}
