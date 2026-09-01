import Link from 'next/link';
import { PropertyCard } from '@/components/property/property-card';
import { EmptyState } from '@/components/ui/states';
import { ButtonLink } from '@/components/ui/button';
import type { PropertySearchResult } from '@/server/queries/properties';

function pageHref(basePath: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params.toString());
  if (page <= 1) next.delete('page');
  else next.set('page', String(page));
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PropertyResults({
  result,
  basePath,
  params,
  emptyHint,
}: {
  result: PropertySearchResult;
  basePath: string;
  params: URLSearchParams;
  emptyHint: string;
}) {
  if (result.total === 0) {
    return (
      <EmptyState
        title="No properties match your search"
        description={emptyHint}
        action={
          <ButtonLink href={basePath} variant="secondary">
            Clear filters
          </ButtonLink>
        }
      />
    );
  }

  const { page, totalPages } = result;
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {page > 1 && (
            <Link
              href={pageHref(basePath, params, page - 1)}
              className="px-3 py-2 text-sm rounded-md border border-border hover:bg-surface-sunken"
              rel="prev"
            >
              Previous
            </Link>
          )}

          {pages.map((number) => (
            <Link
              key={number}
              href={pageHref(basePath, params, number)}
              aria-current={number === page ? 'page' : undefined}
              className={
                number === page
                  ? 'px-3 py-2 text-sm rounded-md bg-accent text-accent-text'
                  : 'px-3 py-2 text-sm rounded-md border border-border hover:bg-surface-sunken'
              }
            >
              {number}
            </Link>
          ))}

          {page < totalPages && (
            <Link
              href={pageHref(basePath, params, page + 1)}
              className="px-3 py-2 text-sm rounded-md border border-border hover:bg-surface-sunken"
              rel="next"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
