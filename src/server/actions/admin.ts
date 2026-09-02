'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin, writeAuditLog } from '@/server/auth';
import { toSqFt } from '@/lib/units';
import type { AreaUnit } from '@/generated/prisma';
import { BRAND } from '@/lib/brand';

/**
 * Admin mutations.
 *
 * Rules enforced here and nowhere else:
 *   - requireAdmin() runs before every write. Middleware is not trusted.
 *   - Every consequential action writes an AuditLog row in the SAME
 *     transaction as the change, so an action cannot exist without its trail.
 *   - Publishing and verifying are separate decisions. Approving a submission
 *     does not publish it; publishing does not mark it verified.
 */

export type ActionResult = { ok: boolean; message: string };

async function actorIp() {
  return (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

/** Sequential, human-readable reference: AMK-1001, AMK-1002, ... */
async function nextRefNo(): Promise<string> {
  const count = await prisma.property.count();
  return `AMK-${1000 + count + 1}`;
}

// ---------------------------------------------------------------- submissions

const approveSchema = z.object({
  submissionId: z.cuid(),
  title: z.string().trim().min(5, 'Give the listing a title').max(140),
  description: z.string().trim().min(20, 'Write a description').max(6000),
  price: z.coerce.number().positive('Enter a price'),
  areaId: z.cuid('Choose an area'),
});

/**
 * Converts an approved submission into a Property.
 *
 * The new listing is created as DRAFT and UNVERIFIED. Nothing a member of the
 * public submitted becomes publicly visible as a side effect of approval - an
 * admin must still publish it deliberately.
 */
export async function approveSubmission(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = approveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const submission = await prisma.sellerSubmission.findUnique({
    where: { id: parsed.data.submissionId },
    select: {
      id: true,
      status: true,
      convertedPropertyId: true,
      type: true,
      purpose: true,
      areaValue: true,
      areaUnit: true,
      bedrooms: true,
      bathrooms: true,
      floors: true,
      addressLine: true,
      latitude: true,
      longitude: true,
    },
  });

  if (!submission) return { ok: false, message: 'Submission not found.' };
  if (submission.convertedPropertyId) {
    return { ok: false, message: 'This submission has already been converted.' };
  }

  const areaValue = Number(submission.areaValue ?? 0);
  const areaUnit = (submission.areaUnit ?? 'SQ_YD') as AreaUnit;
  if (areaValue <= 0) {
    return { ok: false, message: 'The submission has no usable size. Edit it first.' };
  }

  const refNo = await nextRefNo();
  const slug = `${slugify(parsed.data.title)}-${refNo.toLowerCase()}`;
  const ip = await actorIp();

  await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        refNo,
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        purpose: submission.purpose,
        type: submission.type,
        price: parsed.data.price,
        areaValue,
        areaUnit,
        areaSqFt: toSqFt(areaValue, areaUnit),
        bedrooms: submission.bedrooms,
        bathrooms: submission.bathrooms,
        floors: submission.floors,
        areaId: parsed.data.areaId,
        addressLine: submission.addressLine,
        latitude: submission.latitude,
        longitude: submission.longitude,
        // Explicit: a converted submission starts as an unpublished draft.
        status: 'DRAFT',
        verificationStatus: 'UNVERIFIED',
      },
      select: { id: true, refNo: true },
    });

    await tx.sellerSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        reviewedById: admin.adminId,
        convertedPropertyId: property.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.adminId,
        action: 'submission.approve',
        entityType: 'SellerSubmission',
        entityId: submission.id,
        after: { propertyId: property.id, refNo: property.refNo },
        ipAddress: ip,
      },
    });
  });

  revalidatePath('/admin/submissions');
  revalidatePath('/admin/properties');
  return {
    ok: true,
    message: `Created draft listing ${refNo}. Publish it from Properties when ready.`,
  };
}

const rejectSchema = z.object({
  submissionId: z.cuid(),
  reason: z.string().trim().min(5, 'Give a reason').max(500),
});

export async function rejectSubmission(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = rejectSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const ip = await actorIp();

  await prisma.$transaction(async (tx) => {
    await tx.sellerSubmission.update({
      where: { id: parsed.data.submissionId },
      data: {
        status: 'REJECTED',
        rejectionReason: parsed.data.reason,
        reviewedById: admin.adminId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.adminId,
        action: 'submission.reject',
        entityType: 'SellerSubmission',
        entityId: parsed.data.submissionId,
        after: { reason: parsed.data.reason },
        ipAddress: ip,
      },
    });
  });

  revalidatePath('/admin/submissions');
  return { ok: true, message: 'Submission rejected.' };
}

// ---------------------------------------------------------------- properties

const statusSchema = z.object({
  propertyId: z.cuid(),
  status: z.enum([
    'DRAFT',
    'PENDING_REVIEW',
    'UNDER_VERIFICATION',
    'APPROVED',
    'PUBLISHED',
    'SOLD',
    'RENTED',
    'REJECTED',
    'ARCHIVED',
  ]),
});

export async function setPropertyStatus(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = statusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const before = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { status: true, publishedAt: true, slug: true },
  });
  if (!before) return { ok: false, message: 'Property not found.' };

  const ip = await actorIp();
  const isPublishing = parsed.data.status === 'PUBLISHED';

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: parsed.data.propertyId },
      data: {
        status: parsed.data.status,
        // Set once, on first publish, so the "newest" sort stays stable if a
        // listing is later unpublished and published again.
        publishedAt:
          isPublishing && !before.publishedAt ? new Date() : before.publishedAt,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.adminId,
        action: `property.status.${parsed.data.status.toLowerCase()}`,
        entityType: 'Property',
        entityId: parsed.data.propertyId,
        before: { status: before.status },
        after: { status: parsed.data.status },
        ipAddress: ip,
      },
    });
  });

  revalidatePath('/admin/properties');
  revalidatePath('/buy');
  revalidatePath('/rent');
  revalidatePath('/');
  revalidatePath(`/property/${before.slug}`);

  return { ok: true, message: `Listing is now ${parsed.data.status.toLowerCase()}.` };
}

export async function toggleFeatured(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const propertyId = String(formData.get('propertyId') ?? '');

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { isFeatured: true },
  });
  if (!property) return { ok: false, message: 'Property not found.' };

  await prisma.property.update({
    where: { id: propertyId },
    data: { isFeatured: !property.isFeatured },
  });
  await writeAuditLog({
    actorId: admin.adminId,
    action: 'property.feature',
    entityType: 'Property',
    entityId: propertyId,
    before: { isFeatured: property.isFeatured },
    after: { isFeatured: !property.isFeatured },
    ipAddress: await actorIp(),
  });

  revalidatePath('/admin/properties');
  revalidatePath('/');
  return {
    ok: true,
    message: property.isFeatured ? 'Removed from featured.' : 'Marked as featured.',
  };
}

// -------------------------------------------------------------- verification

const verifySchema = z.object({
  propertyId: z.cuid(),
  ownershipChecked: z.coerce.boolean().optional(),
  documentsChecked: z.coerce.boolean().optional(),
  locationChecked: z.coerce.boolean().optional(),
  mediaChecked: z.coerce.boolean().optional(),
  priceConfirmed: z.coerce.boolean().optional(),
  siteVisited: z.coerce.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Records a verification and sets the badge.
 *
 * The badge is not a free choice: a property is only marked VERIFIED when
 * ownership, location and price have all been checked. Anything less is stored
 * as IN_PROGRESS, so the verified badge always means the same thing.
 */
export async function saveVerification(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const checks = {
    ownershipChecked: !!parsed.data.ownershipChecked,
    documentsChecked: !!parsed.data.documentsChecked,
    locationChecked: !!parsed.data.locationChecked,
    mediaChecked: !!parsed.data.mediaChecked,
    priceConfirmed: !!parsed.data.priceConfirmed,
    siteVisited: !!parsed.data.siteVisited,
  };

  const meetsBar =
    checks.ownershipChecked && checks.locationChecked && checks.priceConfirmed;
  const status = meetsBar ? 'VERIFIED' : 'IN_PROGRESS';

  const property = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { slug: true, verificationStatus: true },
  });
  if (!property) return { ok: false, message: 'Property not found.' };

  const ip = await actorIp();

  await prisma.$transaction(async (tx) => {
    await tx.verification.upsert({
      where: { propertyId: parsed.data.propertyId },
      create: {
        propertyId: parsed.data.propertyId,
        status,
        ...checks,
        notes: parsed.data.notes,
        verifiedById: admin.adminId,
        verifiedAt: meetsBar ? new Date() : null,
      },
      update: {
        status,
        ...checks,
        notes: parsed.data.notes,
        verifiedById: admin.adminId,
        verifiedAt: meetsBar ? new Date() : null,
      },
    });

    await tx.property.update({
      where: { id: parsed.data.propertyId },
      data: { verificationStatus: status },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.adminId,
        action: 'property.verify',
        entityType: 'Property',
        entityId: parsed.data.propertyId,
        before: { verificationStatus: property.verificationStatus },
        after: { verificationStatus: status, ...checks },
        ipAddress: ip,
      },
    });
  });

  revalidatePath('/admin/properties');
  revalidatePath(`/property/${property.slug}`);
  revalidatePath('/buy');
  revalidatePath('/rent');

  return {
    ok: true,
    message: meetsBar
      ? `Property marked as ${BRAND.name} Verified.`
      : 'Saved. Ownership, location and price must all be checked before the verified badge is shown.',
  };
}

// -------------------------------------------------------------------- leads

export async function setLeadStatus(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = z
    .object({
      inquiryId: z.cuid(),
      status: z.enum(['NEW', 'IN_PROGRESS', 'CLOSED', 'SPAM']),
    })
    .safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  await prisma.inquiry.update({
    where: { id: parsed.data.inquiryId },
    data: { status: parsed.data.status, handledById: admin.adminId },
  });

  revalidatePath('/admin/leads');
  return { ok: true, message: 'Lead updated.' };
}

// ----------------------------------------------------------------- settings

const settingsSchema = z.object({
  officeAddress: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().max(120).optional(),
});

export async function saveSettings(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: 'Check the fields.' };

  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...parsed.data },
    update: parsed.data,
  });

  await writeAuditLog({
    actorId: admin.adminId,
    action: 'settings.update',
    entityType: 'SiteSetting',
    entityId: 'singleton',
    after: parsed.data,
    ipAddress: await actorIp(),
  });

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Contact details saved.' };
}
