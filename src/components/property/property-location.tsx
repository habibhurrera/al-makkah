'use client';

import dynamic from 'next/dynamic';

/**
 * The location section of a property page.
 *
 * Leaflet is loaded only here, and only in the browser. Marketplace pages and
 * the homepage never download it - the same rule the 3D hero follows.
 */
const PropertyMap = dynamic(() => import('./property-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[22rem] w-full rounded-lg bg-surface-sunken animate-pulse" />
  ),
});

export function PropertyLocation({
  latitude,
  longitude,
  areaName,
  addressLine,
}: {
  latitude: number;
  longitude: number;
  areaName: string;
  addressLine: string | null;
}) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">Location</h2>
      <p className="text-text-muted">
        {addressLine ? `${addressLine}, ` : ''}
        {areaName}, Hyderabad
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <PropertyMap latitude={latitude} longitude={longitude} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-subtle">
          The marked area is approximate. Confirm the exact plot on a viewing.
        </p>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent underline underline-offset-4"
        >
          Get directions
        </a>
      </div>
    </section>
  );
}
