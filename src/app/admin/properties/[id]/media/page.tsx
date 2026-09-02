import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaManager } from '@/components/admin/media-manager';
import { getPropertyForMedia, getSubmissionMedia } from '@/server/queries/media';

export const metadata = { title: 'Listing media' };

export default async function PropertyMediaPage({
  params,
}: PageProps<'/admin/properties/[id]/media'>) {
  const { id } = await params;

  const property = await getPropertyForMedia(id);
  if (!property) notFound();

  // Signed links are minted per request and expire in ten minutes, so a stale
  // page cannot keep exposing private files.
  const submissionMedia = property.submission
    ? await getSubmissionMedia(property.submission.id)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/properties"
          className="text-sm text-text-muted hover:text-text w-fit"
        >
          ← Back to properties
        </Link>
        <h1 className="font-display text-3xl">{property.title}</h1>
        <p className="text-text-muted">
          {property.refNo} · {property.status.toLowerCase()}
        </p>
      </div>

      <MediaManager
        propertyId={property.id}
        gallery={property.media.map((item) => ({
          id: item.id,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          kind: item.kind,
          isVideo: item.isVideo,
          sortOrder: item.sortOrder,
        }))}
        submissionMedia={submissionMedia}
      />
    </div>
  );
}
