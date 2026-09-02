'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/server/auth';
import { propertyCreateSchema, propertyEditSchema } from '@/lib/validation/admin';
import { toSqFt } from '@/lib/units';
import type { ActionResult } from '@/server/actions/admin';

/**
 * Editing a listing.
 *
 * Three things this does NOT touch, by design:
 *   - status and verificationStatus, which have their own actions and audit
 *     entries, so an edit cannot quietly publish or verify a property;
 *   - refNo, the reference given out over the phone;
 *   - slug, because changing it would break every link and search result
 *     already pointing at the listing.
 */
export async function updateProperty(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { fieldErrors?: Record<string, string> }> {
  const admin = await requireAdmin();

  const raw = {
    ...Object.fromEntries(formData.entries()),
    amenityIds: formData.getAll('amenityIds').map(String),
  };

  const parsed = propertyEditSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      message: 'Please check the highlighted fields.',
      fieldErrors,
    };
  }

  const data = parsed.data;

  const before = await prisma.property.findUnique({
    where: { id: data.propertyId },
    select: {
      slug: true,
      title: true,
      price: true,
      areaValue: true,
      areaUnit: true,
      areaId: true,
      type: true,
      purpose: true,
    },
  });
  if (!before) return { ok: false, message: 'Property not found.' };

  // The area chosen must exist and be active; anything else is rejected rather
  // than written as a dangling reference.
  const area = await prisma.area.findFirst({
    where: { id: data.areaId, isActive: true },
    select: { id: true },
  });
  if (!area) return { ok: false, message: 'That area is not available.' };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: data.propertyId },
      data: {
        title: data.title,
        description: data.description,
        purpose: data.purpose,
        type: data.type,
        price: data.price,
        areaValue: data.areaValue,
        areaUnit: data.areaUnit,
        // Recomputed on every write. If this drifted from areaValue, sorting
        // and area filters would quietly return wrong results.
        areaSqFt: toSqFt(data.areaValue, data.areaUnit),
        areaId: data.areaId,
        addressLine: data.addressLine,
        latitude: data.latitude,
        longitude: data.longitude,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        floors: data.floors,
        parking: data.parking,
        yearBuilt: data.yearBuilt,
        furnishing: data.furnishing,
        facing: data.facing,
        hasElectricity: !!data.hasElectricity,
        hasGas: !!data.hasGas,
        hasWater: !!data.hasWater,
        hasSecurity: !!data.hasSecurity,
      },
    });

    // Amenities are replaced wholesale: the form always submits the complete
    // set, so a removed tick must actually remove the row.
    await tx.propertyAmenity.deleteMany({ where: { propertyId: data.propertyId } });
    if (data.amenityIds && data.amenityIds.length > 0) {
      await tx.propertyAmenity.createMany({
        data: data.amenityIds.map((amenityId) => ({
          propertyId: data.propertyId,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: admin.adminId,
        action: 'property.update',
        entityType: 'Property',
        entityId: data.propertyId,
        before: {
          title: before.title,
          price: Number(before.price),
          areaValue: Number(before.areaValue),
          areaUnit: before.areaUnit,
          type: before.type,
          purpose: before.purpose,
        },
        after: {
          title: data.title,
          price: data.price,
          areaValue: data.areaValue,
          areaUnit: data.areaUnit,
          type: data.type,
          purpose: data.purpose,
        },
        ipAddress: ip,
      },
    });
  });

  revalidatePath('/admin/properties');
  revalidatePath(`/admin/properties/${data.propertyId}/edit`);
  revalidatePath(`/property/${before.slug}`);
  revalidatePath('/buy');
  revalidatePath('/rent');
  revalidatePath('/');

  return { ok: true, message: 'Listing updated.' };
}

/**
 * Creates a listing directly, for a property the agency takes on in the office
 * with no public submission behind it.
 *
 * The listing is created as an unpublished, unverified DRAFT - identical to
 * one converted from a submission - and the admin is sent straight to its
 * media page, because a listing without photos is not worth publishing.
 */
export async function createProperty(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { fieldErrors?: Record<string, string> }> {
  const admin = await requireAdmin();

  const raw = {
    ...Object.fromEntries(formData.entries()),
    amenityIds: formData.getAll('amenityIds').map(String),
  };

  const parsed = propertyCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: 'Please check the highlighted fields.', fieldErrors };
  }

  const data = parsed.data;

  const area = await prisma.area.findFirst({
    where: { id: data.areaId, isActive: true },
    select: { id: true },
  });
  if (!area) return { ok: false, message: 'That area is not available.' };

  const count = await prisma.property.count();
  const refNo = `AMK-${1000 + count + 1}`;
  const slug = `${data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)}-${refNo.toLowerCase()}`;

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  let propertyId: string;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          refNo,
          slug,
          title: data.title,
          description: data.description,
          purpose: data.purpose,
          type: data.type,
          price: data.price,
          areaValue: data.areaValue,
          areaUnit: data.areaUnit,
          areaSqFt: toSqFt(data.areaValue, data.areaUnit),
          areaId: data.areaId,
          addressLine: data.addressLine,
          latitude: data.latitude,
          longitude: data.longitude,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          floors: data.floors,
          parking: data.parking,
          yearBuilt: data.yearBuilt,
          furnishing: data.furnishing,
          facing: data.facing,
          hasElectricity: !!data.hasElectricity,
          hasGas: !!data.hasGas,
          hasWater: !!data.hasWater,
          hasSecurity: !!data.hasSecurity,
          status: 'DRAFT',
          verificationStatus: 'UNVERIFIED',
        },
        select: { id: true },
      });

      if (data.amenityIds && data.amenityIds.length > 0) {
        await tx.propertyAmenity.createMany({
          data: data.amenityIds.map((amenityId) => ({
            propertyId: property.id,
            amenityId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.adminId,
          action: 'property.create',
          entityType: 'Property',
          entityId: property.id,
          after: { refNo, title: data.title, price: data.price },
          ipAddress: ip,
        },
      });

      return property;
    });
    propertyId = created.id;
  } catch {
    return { ok: false, message: 'Could not create the listing. Please try again.' };
  }

  revalidatePath('/admin/properties');
  // redirect() throws by design, so it must sit outside the try above.
  redirect(`/admin/properties/${propertyId}/media?created=1`);
}
