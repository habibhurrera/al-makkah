import Link from 'next/link';
import Image from 'next/image';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatArea, formatPkr, formatRent } from '@/lib/units';
import { PROPERTY_TYPE_LABEL, type PropertyCardData } from '@/types/property';

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-medium text-text">{value}</span>
      <span className="text-text-muted">{label}</span>
    </span>
  );
}

/**
 * The single property card used by the homepage, Buy and Rent. One card
 * component for the whole property engine.
 */
export function PropertyCard({ property }: { property: PropertyCardData }) {
  const isRental = property.purpose === 'RENT';

  return (
    <Card interactive className="h-full">
      <Link href={`/property/${property.slug}`} className="flex flex-col h-full">
        <div className="relative aspect-[4/3] bg-surface-sunken">
          {property.imageUrl ? (
            <Image
              src={property.imageUrl}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-text-subtle">
              No image yet
            </div>
          )}

          {property.hasVideo && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-sm bg-ink-950/80 px-2 py-1 text-xs text-ink-50">
              <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
                <path d="M2 1l8 5-8 5z" />
              </svg>
              Video
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 p-5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <VerifiedBadge isVerified={property.isVerified} />
            {property.isFeatured && <Badge tone="accent">Featured</Badge>}
            <Badge tone="neutral">{PROPERTY_TYPE_LABEL[property.type]}</Badge>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-display text-xl leading-tight text-pretty">
              {property.title}
            </h3>
            <p className="text-sm text-text-muted">
              {property.areaName}, Hyderabad
            </p>
          </div>

          <p className="text-lg font-medium">
            {isRental ? formatRent(property.price) : formatPkr(property.price)}
          </p>

          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm border-t border-border">
            <span className="pt-3">
              <Spec
                label=""
                value={formatArea(property.areaValue, property.areaUnit)}
              />
            </span>
            {property.bedrooms !== null && (
              <span className="pt-3">
                <Spec label="beds" value={String(property.bedrooms)} />
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="pt-3">
                <Spec label="baths" value={String(property.bathrooms)} />
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}
