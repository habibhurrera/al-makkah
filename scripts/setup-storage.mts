/**
 * Creates the three storage buckets, idempotently.
 *
 * Only property-media is public. Documents and raw seller submissions stay
 * private and are reached exclusively through short-lived signed URLs issued
 * to authenticated admins.
 *
 * Run: npm run db:storage
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local', quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const DOC_TYPES = ['application/pdf', ...IMAGE_TYPES];

const buckets = [
  {
    id: process.env.SUPABASE_BUCKET_MEDIA ?? 'property-media',
    public: true,
    fileSizeLimit: 52_428_800, // 50 MB - covers a short property video
    allowedMimeTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
  },
  {
    id: process.env.SUPABASE_BUCKET_DOCUMENTS ?? 'property-documents',
    public: false,
    fileSizeLimit: 20_971_520, // 20 MB
    allowedMimeTypes: DOC_TYPES,
  },
  {
    id: process.env.SUPABASE_BUCKET_SUBMISSIONS ?? 'submissions',
    public: false,
    fileSizeLimit: 52_428_800,
    allowedMimeTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, 'application/pdf'],
  },
];

for (const bucket of buckets) {
  const { error } = await supabase.storage.createBucket(bucket.id, {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes,
  });

  if (error && !/already exists/i.test(error.message)) {
    console.error(`${bucket.id}: FAILED - ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  // Re-apply settings even when the bucket already existed, so the limits in
  // this file remain the single source of truth.
  const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes,
  });

  console.log(
    updateError
      ? `${bucket.id}: created but settings failed - ${updateError.message}`
      : `${bucket.id}: ready (${bucket.public ? 'public' : 'private'}, ${
          bucket.fileSizeLimit / 1_048_576
        } MB)`,
  );
}

const { data } = await supabase.storage.listBuckets();
console.log(
  'buckets now:',
  data?.map((b) => `${b.name}${b.public ? '' : ' (private)'}`).join(', '),
);
