import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { contactInquirySchema } from '@/lib/validation/public';
import { clientIp, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Public enquiry endpoint.
 *
 * Order matters: rate limit, then validate, then write. The schema has no field
 * for status or handledBy, so a caller cannot set them - only the columns it
 * defines reach the database.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`inquiry:${ip}`, RATE_LIMITS.inquiry);

  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Too many enquiries. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const parsed = contactInquirySchema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      // A tripped honeypot looks like an ordinary validation failure, so a bot
      // learns nothing about why it was rejected.
      if (key === 'website') {
        return NextResponse.json({ message: 'Could not send.' }, { status: 400 });
      }
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', fieldErrors },
      { status: 400 },
    );
  }

  // The honeypot is validated then dropped; it is never stored.
  const { website, propertyId, ...data } = parsed.data;
  void website;

  try {
    // A referenced property must exist and be published, otherwise the link is
    // dropped rather than storing a dangling or probing reference.
    let linkedPropertyId: string | undefined;
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, status: 'PUBLISHED' },
        select: { id: true },
      });
      linkedPropertyId = property?.id;
    }

    await prisma.inquiry.create({
      data: {
        kind: data.kind,
        name: data.name,
        phone: data.phone,
        email: data.email,
        message: data.message,
        propertyId: linkedPropertyId,
        sourcePath: request.headers.get('referer')?.slice(0, 500),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: 'Could not save your enquiry. Please try again.' },
      { status: 500 },
    );
  }
}
