import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Deployment health check.
 *
 * Confirms the running instance can reach the database and that reference data
 * is present. Returns only counts of data that is already public on the site -
 * no configuration values, no connection details, no error internals.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [areas, amenities, published] = await Promise.all([
      prisma.area.count(),
      prisma.amenity.count(),
      prisma.property.count({ where: { status: 'PUBLISHED' } }),
    ]);

    return NextResponse.json(
      { status: 'ok', database: 'connected', areas, amenities, published },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Deliberately opaque: a failing health check must not leak the reason.
    return NextResponse.json(
      { status: 'error', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
