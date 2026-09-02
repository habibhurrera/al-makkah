import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, NotAuthorizedError, writeAuditLog } from '@/server/auth';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/lib/storage';
import { storeMediaFile } from '@/server/services/media-upload';

/**
 * Admin upload of the agency's own photos and video onto a listing.
 *
 * Files here go straight into the PUBLIC media bucket, which is exactly why
 * this route is admin-only and re-checks authorization itself rather than
 * relying on the proxy.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return NextResponse.json({ message: 'Not authorized.' }, { status: 403 });
    }
    throw error;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const propertyId = String(form.get('propertyId') ?? '');
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, slug: true },
  });
  if (!property) {
    return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
  }

  const files = form
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ message: 'No files selected.' }, { status: 400 });
  }

  for (const file of files) {
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { message: `${file.name}: unsupported file type.` },
        { status: 400 },
      );
    }
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      return NextResponse.json(
        { message: `${file.name} is over ${cap / 1_048_576} MB.` },
        { status: 400 },
      );
    }
  }

  const existing = await prisma.propertyMedia.count({ where: { propertyId } });

  let uploaded = 0;
  for (const [index, file] of files.entries()) {
    const stored = await storeMediaFile({
      propertyId,
      fileName: file.name,
      mimeType: file.type,
      kind: ACCEPTED_VIDEO_TYPES.includes(file.type) ? 'VIDEO' : 'IMAGE',
      bytes: await file.arrayBuffer(),
    });

    if (!stored) continue;

    await prisma.propertyMedia.create({
      data: {
        propertyId,
        kind: stored.kind,
        storagePath: stored.storagePath,
        thumbnailPath: stored.thumbnailPath,
        width: stored.width,
        height: stored.height,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        sortOrder: existing + index,
        uploadStatus: 'READY',
      },
    });
    uploaded += 1;
  }

  await writeAuditLog({
    actorId: admin.adminId,
    action: 'media.upload',
    entityType: 'Property',
    entityId: propertyId,
    after: { uploaded, attempted: files.length },
  });

  return NextResponse.json({ ok: true, uploaded, attempted: files.length });
}
