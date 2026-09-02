import 'server-only';
import sharp from 'sharp';

/**
 * Thumbnail generation for property photos.
 *
 * Why this exists: a listing photo straight off a phone is 3-8 MB. Cards on
 * /buy show twelve of them at a time. Without a derived thumbnail the image
 * optimiser has to fetch every full-size original before it can resize it, so
 * the first uncached view of a results page pulls tens of megabytes through
 * the server on a Hyderabad mobile connection.
 *
 * The thumbnail is generated once, on upload, and stored beside the original.
 * The original is never modified - it stays available for the detail-page hero
 * and for anyone who needs the full-resolution file later.
 */

/** Wide enough for a 3-across card grid on a 2x display, small enough to be cheap. */
const THUMBNAIL_WIDTH = 800;

/** WebP at this quality is visually indistinguishable at card size. */
const THUMBNAIL_QUALITY = 72;

/**
 * Guard against decompression bombs: a small file can declare enormous
 * dimensions and exhaust memory when decoded. sharp refuses anything larger.
 */
const MAX_INPUT_PIXELS = 40_000_000; // 40 MP

export type GeneratedThumbnail = {
  body: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
  /** Dimensions of the ORIGINAL, not the thumbnail - that is what layout needs. */
  sourceWidth: number | null;
  sourceHeight: number | null;
};

/**
 * Produces a WebP thumbnail from image bytes.
 *
 * Returns null rather than throwing when the input is not a decodable image -
 * a video, a corrupt file, or a format sharp was built without. A missing
 * thumbnail is a degraded card, not a failed upload, so callers fall back to
 * the original and carry on.
 */
export async function createThumbnail(
  input: ArrayBuffer | Buffer | Uint8Array,
): Promise<GeneratedThumbnail | null> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer);

  try {
    const image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await image.metadata();

    // Not an image sharp can read.
    if (!metadata.width || !metadata.height) return null;

    const body = await image
      .rotate() // honour the EXIF orientation before discarding the metadata
      .resize({
        width: THUMBNAIL_WIDTH,
        // Never upscale: a small original stays its own size.
        withoutEnlargement: true,
      })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    // EXIF from a phone carries GPS coordinates. The resize above drops all
    // metadata by default, which is exactly what we want on a public file.
    const rotated = metadata.orientation && metadata.orientation >= 5;

    return {
      body,
      contentType: 'image/webp',
      extension: 'webp',
      sourceWidth: rotated ? metadata.height : metadata.width,
      sourceHeight: rotated ? metadata.width : metadata.height,
    };
  } catch {
    return null;
  }
}
