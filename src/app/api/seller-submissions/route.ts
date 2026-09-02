import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { sellerSubmissionSchema } from '@/lib/validation/public';
import { clientIp, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  BUCKET,
  MAX_FILES_PER_SUBMISSION,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  submissionObjectPath,
} from '@/lib/storage';
import { notifyNewLead } from '@/server/services/notify';

/**
 * Public property submission.
 *
 * A submission NEVER becomes a Property and NEVER becomes publicly visible.
 * It lands in SellerSubmission with status SUBMITTED, and only an admin can
 * convert it into a listing after verification.
 *
 * Uploads are accepted as multipart and written to the PRIVATE submissions
 * bucket by the server. The browser is never handed storage credentials, and
 * the filename supplied by the uploader is never used as a storage path.
 */
export const maxDuration = 60;

function isAcceptedType(type: string) {
  return ACCEPTED_IMAGE_TYPES.includes(type) || ACCEPTED_VIDEO_TYPES.includes(type);
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = await rateLimit(`submission:${ip}`, RATE_LIMITS.sellerSubmission);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        message:
          'You have submitted several properties recently. Please try again later or call us directly.',
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const fields = Object.fromEntries(
    [...form.entries()]
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, value as string]),
  );

  const parsed = sellerSubmissionSchema.safeParse(fields);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (key === 'website') {
        return NextResponse.json({ message: 'Could not submit.' }, { status: 400 });
      }
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', fieldErrors },
      { status: 400 },
    );
  }

  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (files.length > MAX_FILES_PER_SUBMISSION) {
    return NextResponse.json(
      { message: `Please upload no more than ${MAX_FILES_PER_SUBMISSION} files.` },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (!isAcceptedType(file.type)) {
      return NextResponse.json(
        { message: `${file.name}: only photos (JPG, PNG, WebP) and video (MP4, MOV, WebM) are accepted.` },
        { status: 400 },
      );
    }
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      return NextResponse.json(
        {
          message: `${file.name} is too large. Limit is ${cap / 1_048_576} MB for ${isVideo ? 'video' : 'photos'}.`,
        },
        { status: 400 },
      );
    }
  }

  // The honeypot is validated then dropped; it is never stored.
  const { website, areaId, expectedPrice, ...data } = parsed.data;
  void website;

  try {
    // A supplied area must actually exist; anything else is discarded rather
    // than stored as an invalid reference.
    let validAreaId: string | undefined;
    if (areaId) {
      const area = await prisma.area.findFirst({
        where: { id: areaId, isActive: true },
        select: { id: true },
      });
      validAreaId = area?.id;
    }

    const submission = await prisma.sellerSubmission.create({
      data: {
        sellerName: data.sellerName,
        sellerPhone: data.sellerPhone,
        sellerEmail: data.sellerEmail,
        preferredContact: data.preferredContact,
        type: data.type,
        purpose: data.purpose,
        areaId: validAreaId,
        addressLine: data.addressLine,
        expectedPrice: expectedPrice ?? undefined,
        areaValue: data.areaValue,
        areaUnit: data.areaUnit,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        floors: data.floors,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        mediaPaths: [],
        // status defaults to SUBMITTED. There is no way to set it from here.
      },
      select: { id: true },
    });

    const uploadedPaths: string[] = [];

    if (files.length > 0) {
      const supabase = createSupabaseAdminClient();

      for (const file of files) {
        const path = submissionObjectPath(submission.id, file.name);
        const { error } = await supabase.storage
          .from(BUCKET.submissions)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (!error) uploadedPaths.push(path);
      }

      if (uploadedPaths.length > 0) {
        await prisma.sellerSubmission.update({
          where: { id: submission.id },
          data: { mediaPaths: uploadedPaths },
        });
      }
    }

    const reference = submission.id.slice(-8).toUpperCase();

    // Stored first, notified second. A mail failure never costs a submission.
    await notifyNewLead({
      kind: 'SELL',
      name: data.sellerName,
      phone: data.sellerPhone,
      email: data.sellerEmail,
      message: data.description,
      propertyRef: reference,
    });

    return NextResponse.json(
      {
        ok: true,
        reference,
        filesReceived: uploadedPaths.length,
        filesAttempted: files.length,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: 'Could not save your submission. Please try again.' },
      { status: 500 },
    );
  }
}
