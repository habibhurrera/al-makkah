import Link from 'next/link';
import { EmptyState } from '@/components/ui/states';
import { PropertyRow } from '@/components/admin/property-row';
import { listAdminProperties } from '@/server/queries/admin';

export const metadata = { title: 'Properties' };

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

export default async function AdminPropertiesPage({
  searchParams,
}: PageProps<'/admin/properties'>) {
  const { status } = await searchParams;
  const active = typeof status === 'string' ? status : 'ALL';
  const properties = await listAdminProperties(active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Properties</h1>
        <p className="text-text-muted">
          Publishing and verifying are separate decisions — a listing can be
          live without the verified badge.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/properties?status=${filter.value}`}
            aria-current={active === filter.value ? 'page' : undefined}
            className={
              active === filter.value
                ? 'px-3 py-2 text-sm rounded-md bg-accent text-accent-text'
                : 'px-3 py-2 text-sm rounded-md border border-border bg-surface hover:bg-surface-sunken'
            }
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {properties.length === 0 ? (
        <EmptyState
          title="No listings"
          description="Approve a submission to create your first listing, and it will appear here as a draft."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {properties.map((property) => (
            <PropertyRow
              key={property.id}
              property={{
                id: property.id,
                refNo: property.refNo,
                slug: property.slug,
                title: property.title,
                purpose: property.purpose,
                type: property.type,
                price: Number(property.price),
                areaValue: Number(property.areaValue),
                areaUnit: property.areaUnit,
                status: property.status,
                verificationStatus: property.verificationStatus,
                isFeatured: property.isFeatured,
                areaName: property.areaRelation.name,
                mediaCount: property._count.media,
                inquiryCount: property._count.inquiries,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
