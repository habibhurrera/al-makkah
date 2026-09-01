import 'server-only';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/server/auth';

/**
 * Admin reads.
 *
 * Every function here calls requireAdmin() first. That is deliberate
 * repetition: authorization lives with the data access, not at the route
 * boundary, so a new page cannot forget to check.
 */

export async function getDashboardStats() {
  await requireAdmin();

  const [
    totalProperties,
    forSale,
    forRent,
    sold,
    rented,
    pendingVerification,
    newSubmissions,
    newLeads,
    viewingRequests,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { purpose: 'SALE', status: 'PUBLISHED' } }),
    prisma.property.count({ where: { purpose: 'RENT', status: 'PUBLISHED' } }),
    prisma.property.count({ where: { status: 'SOLD' } }),
    prisma.property.count({ where: { status: 'RENTED' } }),
    prisma.property.count({
      where: { status: 'PUBLISHED', verificationStatus: { not: 'VERIFIED' } },
    }),
    prisma.sellerSubmission.count({ where: { status: 'SUBMITTED' } }),
    prisma.inquiry.count({ where: { status: 'NEW' } }),
    prisma.inquiry.count({ where: { kind: 'VIEWING', status: 'NEW' } }),
  ]);

  // Every number is a live count. Nothing here is estimated or hardcoded.
  return {
    totalProperties,
    forSale,
    forRent,
    sold,
    rented,
    pendingVerification,
    newSubmissions,
    newLeads,
    viewingRequests,
  };
}

export async function listSubmissions(status?: string) {
  await requireAdmin();

  return prisma.sellerSubmission.findMany({
    where: status && status !== 'ALL' ? { status: status as never } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      sellerName: true,
      sellerPhone: true,
      sellerEmail: true,
      preferredContact: true,
      type: true,
      purpose: true,
      addressLine: true,
      expectedPrice: true,
      areaValue: true,
      areaUnit: true,
      bedrooms: true,
      bathrooms: true,
      floors: true,
      latitude: true,
      longitude: true,
      description: true,
      mediaPaths: true,
      rejectionReason: true,
      convertedPropertyId: true,
      createdAt: true,
      areaId: true,
    },
  });
}

export async function listAdminProperties(status?: string) {
  await requireAdmin();

  return prisma.property.findMany({
    where: status && status !== 'ALL' ? { status: status as never } : undefined,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      refNo: true,
      slug: true,
      title: true,
      purpose: true,
      type: true,
      price: true,
      areaValue: true,
      areaUnit: true,
      status: true,
      verificationStatus: true,
      isFeatured: true,
      publishedAt: true,
      areaRelation: { select: { name: true } },
      _count: { select: { media: true, inquiries: true } },
    },
  });
}

export async function listLeads(status?: string) {
  await requireAdmin();

  return prisma.inquiry.findMany({
    where: status && status !== 'ALL' ? { status: status as never } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      kind: true,
      status: true,
      name: true,
      phone: true,
      email: true,
      message: true,
      preferredVisitAt: true,
      createdAt: true,
      property: { select: { refNo: true, slug: true, title: true } },
    },
  });
}

export async function getAreaOptions() {
  await requireAdmin();
  return prisma.area.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getSettingsForAdmin() {
  await requireAdmin();
  const settings = await prisma.siteSetting.findUnique({
    where: { id: 'singleton' },
  });
  return settings;
}
