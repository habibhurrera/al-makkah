'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  deletePropertyMedia,
  importSubmissionMedia,
  reorderPropertyMedia,
} from '@/server/actions/media';
import type { ActionResult } from '@/server/actions/admin';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/lib/storage';

export type GalleryItem = {
  id: string;
  url: string;
  /** Derived WebP thumbnail; null for videos and pre-thumbnail uploads. */
  thumbnailUrl: string | null;
  kind: string;
  isVideo: boolean;
  sortOrder: number;
};

export type SubmissionItem = {
  path: string;
  url: string | null;
  isVideo: boolean;
};

const ACCEPT = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',');

export function MediaManager({
  propertyId,
  gallery,
  submissionMedia,
}: {
  propertyId: string;
  gallery: GalleryItem[];
  submissionMedia: SubmissionItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [importState, importAction, importing] = useActionState<
    ActionResult | null,
    FormData
  >(importSubmissionMedia, null);
  const [deleteState, deleteAction] = useActionState<ActionResult | null, FormData>(
    deletePropertyMedia,
    null,
  );
  const [orderState, orderAction] = useActionState<ActionResult | null, FormData>(
    reorderPropertyMedia,
    null,
  );

  const message = importState ?? deleteState ?? orderState;

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
      const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > cap) {
        setUploadState(`${file.name} is over ${cap / 1_048_576} MB.`);
        return;
      }
    }

    setUploading(true);
    setUploadState(null);

    const body = new FormData();
    body.set('propertyId', propertyId);
    for (const file of files) body.append('files', file);

    try {
      const response = await fetch('/api/admin/property-media', {
        method: 'POST',
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        setUploadState(result.message ?? 'Upload failed.');
      } else {
        setUploadState(`Uploaded ${result.uploaded} of ${result.attempted}.`);
        router.refresh();
      }
    } catch {
      setUploadState('Could not reach the server.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <p
          role="status"
          className={`text-sm ${message.ok ? 'text-success-500' : 'text-danger-500'}`}
        >
          {message.message}
        </p>
      )}

      {/* ------------------------------------------------------ live gallery */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Listing gallery</h2>
          <span className="text-sm text-text-muted">
            {gallery.length === 0
              ? 'Nothing published yet'
              : `${gallery.length} file(s) · first one is the cover`}
          </span>
        </div>

        {gallery.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-text-muted">
                This listing has no photos. It will show a grey placeholder on
                the website, and buyers routinely skip listings without images.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((item, index) => (
              <Card key={item.id}>
                <div className="relative aspect-[4/3] bg-surface-sunken">
                  {item.isVideo ? (
                    <video src={item.url} className="size-full object-cover" muted />
                  ) : (
                    <Image
                      src={item.thumbnailUrl ?? item.url}
                      alt=""
                      fill
                      sizes="25vw"
                      className="object-cover"
                    />
                  )}
                  {index === 0 && (
                    <span className="absolute top-2 left-2">
                      <Badge tone="accent">Cover</Badge>
                    </span>
                  )}
                  {item.isVideo && (
                    <span className="absolute bottom-2 left-2">
                      <Badge tone="neutral">Video</Badge>
                    </span>
                  )}
                </div>
                <CardBody className="flex flex-wrap gap-1 p-3">
                  {index !== 0 && (
                    <form action={orderAction}>
                      <input type="hidden" name="mediaId" value={item.id} />
                      <input type="hidden" name="direction" value="cover" />
                      <Button type="submit" size="sm" variant="ghost">
                        Make cover
                      </Button>
                    </form>
                  )}
                  <form action={orderAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Move earlier">
                      ←
                    </Button>
                  </form>
                  <form action={orderAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Move later">
                      →
                    </Button>
                  </form>
                  <form action={deleteAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-danger-500">
                      Remove
                    </Button>
                  </form>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------- seller's submission */}
      {submissionMedia.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl">Files the seller sent</h2>
            <p className="text-sm text-text-muted max-w-[70ch]">
              These are private and visible only to you. Tick the ones fit to
              publish — check for other people&apos;s watermarks, phone numbers
              burned into the image, and whether the photo actually shows this
              property. Publishing copies the file; the original stays here.
            </p>
          </div>

          <form action={importAction} className="flex flex-col gap-4">
            <input type="hidden" name="propertyId" value={propertyId} />
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {submissionMedia.map((item) => {
                const isSelected = selected.includes(item.path);
                return (
                  <label
                    key={item.path}
                    className={`relative block rounded-lg overflow-hidden border-2 cursor-pointer ${
                      isSelected ? 'border-accent' : 'border-border'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="paths"
                      value={item.path}
                      checked={isSelected}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, item.path]
                            : current.filter((path) => path !== item.path),
                        )
                      }
                      className="absolute top-2 left-2 z-10 size-5"
                    />
                    <div className="relative aspect-[4/3] bg-surface-sunken">
                      {item.url === null ? (
                        <div className="grid place-items-center size-full text-xs text-text-subtle">
                          Preview unavailable
                        </div>
                      ) : item.isVideo ? (
                        <video src={item.url} controls className="size-full object-cover" />
                      ) : (
                        // Signed URLs are short-lived and one-off, so they are
                        // not worth routing through the image optimiser.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt="Submitted by the seller"
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={selected.length === 0 || importing}
                aria-busy={importing}
              >
                {importing
                  ? 'Publishing…'
                  : `Publish ${selected.length || ''} selected file${selected.length === 1 ? '' : 's'}`}
              </Button>
              {selected.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setSelected([])}>
                  Clear selection
                </Button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* ---------------------------------------------------- direct upload */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Upload your own photos</h2>
        <p className="text-sm text-text-muted max-w-[70ch]">
          Photos taken by your own team go straight onto the listing. Images up to{' '}
          {MAX_IMAGE_BYTES / 1_048_576} MB, video up to{' '}
          {MAX_VIDEO_BYTES / 1_048_576} MB.
        </p>
        <input
          type="file"
          multiple
          accept={ACCEPT}
          onChange={upload}
          disabled={uploading}
          className="block w-full text-sm file:mr-4 file:h-11 file:rounded-md file:border-0 file:bg-accent file:px-5 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent-hover"
        />
        {uploading && <p className="text-sm text-text-muted">Uploading…</p>}
        {uploadState && <p className="text-sm text-text-muted">{uploadState}</p>}
      </section>
    </div>
  );
}
