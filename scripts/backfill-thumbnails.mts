/**
 * Generates the missing thumbnails for images already in the gallery.
 *
 * Thumbnails are created on upload, so this only matters for photos that were
 * published before thumbnail generation existed, or whose thumbnail failed to
 * upload at the time. Safe to run repeatedly: it skips every image that
 * already has one, and never touches the originals.
 *
 * Run: npm run media:thumbnails
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { PrismaClient } from '../src/generated/prisma/index.js';

loadEnv({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const bucket = process.env.SUPABASE_BUCKET_MEDIA ?? 'property-media';

if (!url || !serviceKey || !databaseUrl) {
  console.error('Missing environment variables. Check .env.local.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// Kept in step with src/lib/images.ts. If those numbers change, a re-run
// regenerates nothing on its own - delete the thumbnailPath values first.
const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_QUALITY = 72;

async function main() {
  const pending = await prisma.propertyMedia.findMany({
    where: { kind: 'IMAGE', thumbnailPath: null },
    select: { id: true, propertyId: true, storagePath: true },
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) {
    console.log('Every image already has a thumbnail. Nothing to do.');
    return;
  }

  console.log(`${pending.length} image(s) without a thumbnail.\n`);

  let done = 0;
  let failed = 0;

  for (const media of pending) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(media.storagePath);

    if (error || !data) {
      console.warn(`  skipped ${media.storagePath}: ${error?.message ?? 'not found'}`);
      failed += 1;
      continue;
    }

    try {
      const source = Buffer.from(await data.arrayBuffer());
      const image = sharp(source, { limitInputPixels: 40_000_000 });
      const metadata = await image.metadata();
      const body = await image
        .rotate()
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();

      const target = `${media.propertyId}/thumbs/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(target, body, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        });

      if (uploadError) throw new Error(uploadError.message);

      const rotated = !!metadata.orientation && metadata.orientation >= 5;

      await prisma.propertyMedia.update({
        where: { id: media.id },
        data: {
          thumbnailPath: target,
          width: rotated ? metadata.height : metadata.width,
          height: rotated ? metadata.width : metadata.height,
        },
      });

      done += 1;
      console.log(`  ${done}/${pending.length}  ${media.storagePath}`);
    } catch (thumbError) {
      failed += 1;
      console.warn(
        `  failed ${media.storagePath}: ${
          thumbError instanceof Error ? thumbError.message : 'unknown error'
        }`,
      );
    }
  }

  console.log(`\nGenerated ${done} thumbnail(s).${failed ? ` ${failed} failed.` : ''}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
