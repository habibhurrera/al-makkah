import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/generated/prisma';
import type { PropertyCardData } from '@/types/property';
import type { PropertySearchInput } from '@/lib/validation/public';
import { publicMediaUrl } from '@/lib/storage';

/**
 * Public property queries.
 *
 * Two rules hold everywhere in this file:
 *
 * 1. Every query is constrained to status PUBLISHED. There is no parameter to
 *    relax that - admin views use a separate module.
 * 2. Filtering, sorting and pagination happen in Postgres against indexed
 *    columns. Nothing pulls a listing set into memory to filter it.
 */

const CARD_SELECT = {
  id: true,
  slug: true,
  refNo: true,
  title: true,
  purpose: true,
  type: true,
  price: true,
  areaValue: true,
  areaUnit: true,
  bedrooms: true,
  bathrooms: true,
  verificationStatus: true,
  isFeatured: true,
  areaRelation: { select: { name: true } },
  media: {
    where: { kind: 'IMAGE' as const, uploadStatus: 'READY' as const },
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
    select: { storagePath: true, thumbnailPath: true },
  },
  _count: {
    select: { media: { where: { kind: 'VIDEO' as const, uploadStatus: 'READY' as const } } },
  },
} satisfies Prisma.PropertySelect;

type CardRow = Prisma.PropertyGetPayload<{ select: typeof CARD_SELECT }>;

/**
 * Maps a database row to what a card renders.
 *
 * verificationStatus is collapsed to a boolean here, server-side. The client
 * never receives the raw status, so it cannot render a verified badge the
 * database did not authorise.
 */
function toCardData(row: CardRow): PropertyCardData {
  return {
    id: row.id,
    slug: row.slug,
    refNo: row.refNo,
    title: row.title,
    purpose: row.purpose,
    type: row.type,
    price: Number(row.price),
    areaValue: Number(row.areaValue),
    areaUnit: row.areaUnit,
    areaName: row.areaRelation.name,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    isVerified: row.verificationStatus === 'VERIFIED',
    isFeatured: row.isFeatured,
    hasVideo: row._count.media > 0,
    imageUrl: row.media[0] ? publicMediaUrl(row.media[0].storagePath) : null,
    thumbnailUrl: row.media[0]?.thumbnailPath
      ? publicMediaUrl(row.media[0].thumbnailPath)
      : null,
  };
}

const ORDER_BY: Record<
  PropertySearchInput['sort'],
  Prisma.PropertyOrderByWithRelationInput[]
> = {
  newest: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  area_asc: [{ areaSqFt: 'asc' }],
  area_desc: [{ areaSqFt: 'desc' }],
};

function buildWhere(filters: PropertySearchInput): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    status: 'PUBLISHED',
    purpose: filters.purpose,
  };

  if (filters.type) where.type = filters.type;
  if (filters.areaId) where.areaId = filters.areaId;
  if (filters.bedrooms !== undefined) where.bedrooms = { gte: filters.bedrooms };
  if (filters.bathrooms !== undefined) where.bathrooms = { gte: filters.bathrooms };
  if (filters.verifiedOnly) where.verificationStatus = 'VERIFIED';
  if (filters.withVideo) {
    where.media = { some: { kind: 'VIDEO', uploadStatus: 'READY' } };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.minAreaSqFt !== undefined || filters.maxAreaSqFt !== undefined) {
    where.areaSqFt = {
      ...(filters.minAreaSqFt !== undefined ? { gte: filters.minAreaSqFt } : {}),
      ...(filters.maxAreaSqFt !== undefined ? { lte: filters.maxAreaSqFt } : {}),
    };
  }

  return where;
}

export type PropertySearchResult = {
  items: PropertyCardData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function searchProperties(
  filters: PropertySearchInput,
): Promise<PropertySearchResult> {
  const where = buildWhere(filters);
  const skip = (filters.page - 1) * filters.perPage;

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      select: CARD_SELECT,
      orderBy: ORDER_BY[filters.sort],
      skip,
      take: filters.perPage,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items: rows.map(toCardData),
    total,
    page: filters.page,
    perPage: filters.perPage,
    totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
  };
}

/** Homepage strip. Featured first, then most recent. */
export async function getFeaturedProperties(limit = 3): Promise<PropertyCardData[]> {
  const rows = await prisma.property.findMany({
    where: { status: 'PUBLISHED' },
    select: CARD_SELECT,
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });
  return rows.map(toCardData);
}

/** Areas that actually have something published, for the filter dropdown. */
export async function getAreasWithCounts(purpose: 'SALE' | 'RENT') {
  const areas = await prisma.area.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      _count: { select: { properties: { where: { status: 'PUBLISHED', purpose } } } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    count: area._count.properties,
  }));
}

/**
 * Full listing for the detail page. Returns null for anything not published,
 * which the page turns into a 404 - an unpublished listing must not be
 * distinguishable from one that does not exist.
 */
export async function getPropertyBySlug(slug: string) {
  const property = await prisma.property.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      refNo: true,
      title: true,
      description: true,
      purpose: true,
      type: true,
      price: true,
      areaValue: true,
      areaUnit: true,
      bedrooms: true,
      bathrooms: true,
      floors: true,
      parking: true,
      yearBuilt: true,
      furnishing: true,
      facing: true,
      hasElectricity: true,
      hasGas: true,
      hasWater: true,
      hasSecurity: true,
      addressLine: true,
      latitude: true,
      longitude: true,
      verificationStatus: true,
      isFeatured: true,
      publishedAt: true,
      areaRelation: { select: { name: true, slug: true } },
      amenities: { select: { amenity: { select: { name: true } } } },
      media: {
        where: { uploadStatus: 'READY' },
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          kind: true,
          storagePath: true,
          thumbnailPath: true,
          width: true,
          height: true,
          altText: true,
        },
      },
      // Only the outcome and date - never adminNotes or internal remarks.
      verification: {
        select: {
          status: true,
          verifiedAt: true,
          ownershipChecked: true,
          documentsChecked: true,
          locationChecked: true,
          mediaChecked: true,
          priceConfirmed: true,
          siteVisited: true,
        },
      },
    },
  });

  if (!property) return null;

  return {
    ...property,
    price: Number(property.price),
    areaValue: Number(property.areaValue),
    isVerified: property.verificationStatus === 'VERIFIED',
    amenities: property.amenities.map((entry) => entry.amenity.name),
    media: property.media.map((item) => ({
      ...item,
      url: publicMediaUrl(item.storagePath),
      // Small tiles in the gallery use the derived file; the hero and the
      // lightbox-sized images use the original.
      thumbnailUrl: item.thumbnailPath ? publicMediaUrl(item.thumbnailPath) : null,
    })),
  };
}

/** Slugs for the sitemap. */
export async function getPublishedSlugs() {
  return prisma.property.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
  });
}
