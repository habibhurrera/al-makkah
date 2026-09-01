import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container, Section, SectionHeading } from '@/components/ui/layout';
import {
  PropertyFilters,
  SortSelect,
} from '@/components/property/property-filters';
import { PropertyResults } from '@/components/property/property-results';
import { PropertyCardSkeleton } from '@/components/ui/states';
import { propertySearchSchema } from '@/lib/validation/public';
import { getAreasWithCounts, searchProperties } from '@/server/queries/properties';

export const metadata: Metadata = {
  title: 'Property for Rent in Hyderabad',
  description:
    'Houses, bungalows, flats and portions to rent across Hyderabad, Sindh. Verified listings from AL-MAKKAH Real Estate.',
};

const RENT_TYPES = [
  'HOUSE',
  'BUNGALOW',
  'FLAT',
  'APARTMENT',
  'PORTION',
  'COMMERCIAL',
] as const;

async function Results({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Unvalidated query strings never reach the database. Anything malformed
  // falls back to defaults rather than erroring the page.
  const parsed = propertySearchSchema.safeParse({ ...searchParams, purpose: 'RENT' });
  const filters = parsed.success
    ? parsed.data
    : propertySearchSchema.parse({ purpose: 'RENT' });

  const [result, areas] = await Promise.all([
    searchProperties(filters),
    getAreasWithCounts('RENT'),
  ]);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string' && value) params.set(key, value);
  }

  return (
    <div className="flex flex-col gap-8">
      <PropertyFilters areas={areas} types={RENT_TYPES} showBedrooms />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-text-muted">
          {result.total === 0
            ? 'No properties found'
            : `${result.total} ${result.total === 1 ? 'property' : 'properties'} to rent`}
          {result.totalPages > 1 && ` · page ${result.page} of ${result.totalPages}`}
        </p>
        <SortSelect />
      </div>

      <PropertyResults
        result={result}
        basePath="/rent"
        params={params}
        emptyHint="Try widening the rent range, choosing a different area, or clearing the filters."
      />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default async function RentPage({
  searchParams,
}: PageProps<'/rent'>) {
  const resolved = await searchParams;

  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Rent"
          title="Property for Rent in Hyderabad"
          description="Houses, bungalows, flats and portions available to rent across the city. Every published listing has been reviewed by AL-MAKKAH."
        />
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={resolved} />
        </Suspense>
      </Container>
    </Section>
  );
}
