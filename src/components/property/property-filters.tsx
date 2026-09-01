'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import type { PropertyType } from '@/generated/prisma';

/**
 * Filter controls. These only ever write to the URL - the actual filtering
 * happens on the server in the page's query. That keeps the state shareable,
 * back-button friendly, and means the browser never holds the listing set.
 */

type AreaOption = { id: string; name: string; count: number };

export function PropertyFilters({
  areas,
  types,
  showBedrooms,
}: {
  areas: AreaOption[];
  types: readonly PropertyType[];
  showBedrooms: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function apply(formData: FormData) {
    const next = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) next.set(key, text);
    }

    // Any filter change returns to page 1; staying on page 7 of a new result
    // set is almost always an empty page.
    next.delete('page');

    const sort = params.get('sort');
    if (sort && !next.has('sort')) next.set('sort', sort);

    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
      setIsOpen(false);
    });
  }

  function clear() {
    startTransition(() => {
      router.push(pathname);
      setIsOpen(false);
    });
  }

  const activeCount = ['type', 'areaId', 'minPrice', 'maxPrice', 'bedrooms', 'verifiedOnly', 'withVideo'].filter(
    (key) => params.get(key),
  ).length;

  return (
    <div className="border border-border rounded-lg bg-surface">
      <button
        type="button"
        className="md:hidden w-full flex items-center justify-between p-4 text-sm font-medium"
        aria-expanded={isOpen}
        aria-controls="filters"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          Filters
          {activeCount > 0 && (
            <span className="ml-2 text-text-muted">({activeCount} active)</span>
          )}
        </span>
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>

      <form
        id="filters"
        action={apply}
        className={`${isOpen ? 'grid' : 'hidden'} md:grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3`}
      >
        <Field id="f-type" label="Property type">
          {(p) => (
            <Select {...p} name="type" defaultValue={params.get('type') ?? ''}>
              <option value="">Any type</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABEL[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="f-area" label="Area">
          {(p) => (
            <Select {...p} name="areaId" defaultValue={params.get('areaId') ?? ''}>
              <option value="">All of Hyderabad</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                  {area.count > 0 ? ` (${area.count})` : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {showBedrooms && (
          <Field id="f-beds" label="Bedrooms (minimum)">
            {(p) => (
              <Select {...p} name="bedrooms" defaultValue={params.get('bedrooms') ?? ''}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <Field id="f-min" label="Minimum price (PKR)">
          {(p) => (
            <Input
              {...p}
              name="minPrice"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="No minimum"
              defaultValue={params.get('minPrice') ?? ''}
            />
          )}
        </Field>

        <Field id="f-max" label="Maximum price (PKR)">
          {(p) => (
            <Input
              {...p}
              name="maxPrice"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="No maximum"
              defaultValue={params.get('maxPrice') ?? ''}
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-2 justify-end">
          <legend className="sr-only">Listing options</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="verifiedOnly"
              value="true"
              defaultChecked={params.get('verifiedOnly') === 'true'}
              className="size-4"
            />
            Verified properties only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="withVideo"
              value="true"
              defaultChecked={params.get('withVideo') === 'true'}
              className="size-4"
            />
            Has a video
          </label>
        </fieldset>

        <div className="flex gap-3 items-end lg:col-span-3">
          <Button type="submit" aria-busy={isPending}>
            {isPending ? 'Applying…' : 'Apply filters'}
          </Button>
          {activeCount > 0 && (
            <Button type="button" variant="ghost" onClick={clear}>
              Clear all
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-text-muted whitespace-nowrap">Sort by</span>
      <Select
        value={params.get('sort') ?? 'newest'}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set('sort', event.target.value);
          next.delete('page');
          router.push(`${pathname}?${next.toString()}`);
        }}
        className="h-9 text-sm w-auto"
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="area_desc">Largest area</option>
        <option value="area_asc">Smallest area</option>
      </Select>
    </label>
  );
}
