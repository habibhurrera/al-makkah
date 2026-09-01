import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Section } from '@/components/ui/layout';
import { Card, CardBody } from '@/components/ui/card';
import { Container as Wrap } from '@/components/ui/layout';
import { getPropertyBySlug, getPublishedSlugs } from '@/server/queries/properties';
import { formatArea, formatPkr, formatRent } from '@/lib/units';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import { getSiteSettings } from '@/server/queries/settings';
import { PropertyContact } from '@/components/property/property-contact';
import { siteUrl } from '@/lib/env';

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    // No database at build time (e.g. a preview build without env vars).
    // Pages still render on demand.
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<'/property/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: 'Property not found' };

  const price =
    property.purpose === 'RENT'
      ? formatRent(property.price)
      : formatPkr(property.price);
  const description = `${property.title} in ${property.areaRelation.name}, Hyderabad. ${price}. ${formatArea(
    property.areaValue,
    property.areaUnit,
  )}.`;

  return {
    title: property.title,
    description,
    alternates: { canonical: `${siteUrl}/property/${property.slug}` },
    openGraph: {
      title: property.title,
      description,
      type: 'website',
      images: property.media.find((m) => m.kind === 'IMAGE')?.url
        ? [{ url: property.media.find((m) => m.kind === 'IMAGE')!.url }]
        : undefined,
    },
  };
}

function Spec({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-border">
      <dt className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

const FURNISHING_LABEL = {
  UNFURNISHED: 'Unfurnished',
  SEMI_FURNISHED: 'Semi-furnished',
  FURNISHED: 'Furnished',
} as const;

export default async function PropertyDetailPage({
  params,
}: PageProps<'/property/[slug]'>) {
  const { slug } = await params;
  const [property, settings] = await Promise.all([
    getPropertyBySlug(slug),
    getSiteSettings(),
  ]);

  // An unpublished listing is indistinguishable from one that never existed.
  if (!property) notFound();

  const images = property.media.filter((m) => m.kind === 'IMAGE');
  const videos = property.media.filter((m) => m.kind === 'VIDEO');
  const floorPlans = property.media.filter((m) => m.kind === 'FLOOR_PLAN');
  const isRental = property.purpose === 'RENT';

  const checks = property.verification
    ? [
        ['Ownership documents', property.verification.ownershipChecked],
        ['Supporting documents', property.verification.documentsChecked],
        ['Location confirmed', property.verification.locationChecked],
        ['Photos and video checked', property.verification.mediaChecked],
        ['Price confirmed with owner', property.verification.priceConfirmed],
        ['Site visited by AL-MAKKAH', property.verification.siteVisited],
      ].filter(([, done]) => done)
    : [];

  return (
    <>
      {/* Structured data so search engines read this as a real listing. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: property.title,
            description: property.description,
            url: `${siteUrl}/property/${property.slug}`,
            datePosted: property.publishedAt?.toISOString(),
            image: images.map((image) => image.url),
            offers: {
              '@type': 'Offer',
              price: property.price,
              priceCurrency: 'PKR',
              availability: 'https://schema.org/InStock',
            },
            address: {
              '@type': 'PostalAddress',
              addressLocality: property.areaRelation.name,
              addressRegion: 'Sindh',
              addressCountry: 'PK',
            },
          }),
        }}
      />

      <Section className="py-8 md:py-12">
        <Wrap className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge isVerified={property.isVerified} />
              <Badge tone="neutral">{PROPERTY_TYPE_LABEL[property.type]}</Badge>
              <Badge tone="neutral">{isRental ? 'For rent' : 'For sale'}</Badge>
              {property.isFeatured && <Badge tone="accent">Featured</Badge>}
              <span className="text-xs text-text-subtle ml-auto">
                Ref {property.refNo}
              </span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl text-balance">
              {property.title}
            </h1>
            <p className="text-text-muted">
              {property.addressLine ? `${property.addressLine}, ` : ''}
              {property.areaRelation.name}, Hyderabad
            </p>
            <p className="font-display text-3xl">
              {isRental ? formatRent(property.price) : formatPkr(property.price)}
            </p>
          </div>

          {/* ------------------------------------------------------- gallery */}
          {images.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2">
              <div className="relative md:col-span-3 md:row-span-2 aspect-[4/3] md:aspect-auto md:min-h-[420px] rounded-lg overflow-hidden bg-surface-sunken">
                <Image
                  src={images[0].url}
                  alt={images[0].altText ?? property.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 75vw, 100vw"
                  className="object-cover"
                />
              </div>
              {images.slice(1, 3).map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-sunken"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? property.title}
                    fill
                    sizes="25vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-lg bg-surface-sunken grid place-items-center text-text-subtle">
              No photos yet
            </div>
          )}

          {images.length > 3 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {images.slice(3).map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square rounded-md overflow-hidden bg-surface-sunken"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? property.title}
                    fill
                    sizes="16vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
            <div className="flex flex-col gap-10">
              {/* --------------------------------------------------- specs */}
              <section className="flex flex-col gap-4">
                <h2 className="font-display text-2xl">Property details</h2>
                <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                  <Spec
                    label="Size"
                    value={formatArea(property.areaValue, property.areaUnit)}
                  />
                  <Spec label="Bedrooms" value={property.bedrooms} />
                  <Spec label="Bathrooms" value={property.bathrooms} />
                  <Spec label="Floors" value={property.floors} />
                  <Spec label="Parking spaces" value={property.parking} />
                  <Spec label="Year built" value={property.yearBuilt} />
                  <Spec
                    label="Furnishing"
                    value={
                      property.furnishing
                        ? FURNISHING_LABEL[property.furnishing]
                        : null
                    }
                  />
                  <Spec label="Facing" value={property.facing} />
                  <Spec
                    label="Utilities"
                    value={
                      [
                        property.hasElectricity && 'Electricity',
                        property.hasGas && 'Gas',
                        property.hasWater && 'Water',
                        property.hasSecurity && 'Security',
                      ]
                        .filter(Boolean)
                        .join(', ') || null
                    }
                  />
                </dl>
              </section>

              {/* --------------------------------------------- description */}
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">Description</h2>
                <div className="text-text-muted whitespace-pre-line max-w-[var(--measure)]">
                  {property.description}
                </div>
              </section>

              {/* ----------------------------------------------- amenities */}
              {property.amenities.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-2xl">Amenities</h2>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {property.amenities.map((amenity) => (
                      <li key={amenity} className="text-sm text-text-muted">
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* --------------------------------------------------- video */}
              {videos.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-2xl">Video</h2>
                  {videos.map((video) => (
                    <video
                      key={video.id}
                      controls
                      preload="metadata"
                      className="w-full rounded-lg bg-ink-950"
                    >
                      <source src={video.url} />
                      Your browser does not support video playback.
                    </video>
                  ))}
                </section>
              )}

              {floorPlans.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-2xl">Floor plan</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {floorPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-sunken"
                      >
                        <Image
                          src={plan.url}
                          alt={plan.altText ?? 'Floor plan'}
                          fill
                          sizes="50vw"
                          className="object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* -------------------------------------------- verification */}
              {property.isVerified && checks.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-2xl">
                    What AL-MAKKAH verified
                  </h2>
                  <Card>
                    <CardBody className="flex flex-col gap-2">
                      <ul className="flex flex-col gap-2">
                        {checks.map(([label]) => (
                          <li
                            key={String(label)}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              aria-hidden="true"
                              className="text-success-500"
                            >
                              ✓
                            </span>
                            {label}
                          </li>
                        ))}
                      </ul>
                      {property.verification?.verifiedAt && (
                        <p className="text-xs text-text-subtle pt-2">
                          Verified on{' '}
                          {property.verification.verifiedAt.toLocaleDateString(
                            'en-GB',
                            { day: 'numeric', month: 'long', year: 'numeric' },
                          )}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </section>
              )}
            </div>

            {/* -------------------------------------------------- contact */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <PropertyContact
                propertyId={property.id}
                refNo={property.refNo}
                title={property.title}
                purpose={property.purpose}
                settings={settings}
              />
            </aside>
          </div>
        </Wrap>
      </Section>
    </>
  );
}
