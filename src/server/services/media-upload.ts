import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { BUCKET, mediaObjectPath, thumbnailObjectPath } from '@/lib/storage';
import { createThumbnail } from '@/lib/images';

/**
 * The one place a file becomes part of a listing's public gallery.
 *
 * Both routes into the gallery - an admin's direct upload and the import of an
 * approved seller submission - go through here, so a thumbnail is generated on
 * both paths and neither can drift from the other.
 */

export type StoredMediaFile = {
  storagePath: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  byteSize: number;
  mimeType: string;
  kind: 'IMAGE' | 'VIDEO';
};

export async function storeMediaFile({
  propertyId,
  fileName,
  mimeType,
  kind,
  bytes,
}: {
  propertyId: string;
  /** Used only for its extension; never as a path component. */
  fileName: string;
  mimeType: string;
  kind: 'IMAGE' | 'VIDEO';
  bytes: ArrayBuffer;
}): Promise<StoredMediaFile | null> {
  const supabase = createSupabaseAdminClient();
  const body = Buffer.from(bytes);
  const storagePath = mediaObjectPath(propertyId, fileName);

  const { error } = await supabase.storage
    .from(BUCKET.media)
    .upload(storagePath, body, { contentType: mimeType, upsert: false });

  // The original is the file that matters. If it did not land, there is
  // nothing to attach to the listing and the caller records a failure.
  if (error) return null;

  let thumbnailPath: string | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (kind === 'IMAGE') {
    const thumbnail = await createThumbnail(body);

    if (thumbnail) {
      width = thumbnail.sourceWidth;
      height = thumbnail.sourceHeight;

      const target = thumbnailObjectPath(propertyId);
      const { error: thumbError } = await supabase.storage
        .from(BUCKET.media)
        .upload(target, thumbnail.body, {
          contentType: thumbnail.contentType,
          // Derived files are safe to overwrite; the name is a fresh uuid anyway.
          upsert: true,
          cacheControl: '31536000',
        });

      // A failed thumbnail is a slower card, not a failed upload. The gallery
      // falls back to the original, and `npm run media:thumbnails` can fill
      // the gap later without re-uploading anything.
      if (!thumbError) thumbnailPath = target;
    }
  }

  return {
    storagePath,
    thumbnailPath,
    width,
    height,
    byteSize: body.byteLength,
    mimeType,
    kind,
  };
}

/**
 * Removes a gallery file and its derived thumbnail.
 *
 * Deleting the row without this would leave the objects orphaned in the public
 * bucket - still reachable by anyone who kept the URL.
 */
export async function removeMediaFile(paths: {
  storagePath: string;
  thumbnailPath: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const targets = [paths.storagePath];
  if (paths.thumbnailPath) targets.push(paths.thumbnailPath);
  await supabase.storage.from(BUCKET.media).remove(targets);
}
