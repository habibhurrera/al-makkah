'use client';

import { useState } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * The map itself. Never imported directly by a server component - it reaches
 * the page through property-location.tsx, which loads it with ssr: false.
 *
 * Leaflet touches `window` at module scope, and its layout is measured from a
 * real DOM node, so there is nothing useful to render on the server.
 */

/**
 * Tile provider. This is the one line to change when swapping map suppliers.
 *
 * OpenStreetMap's public tile servers are free and need no key, but their
 * usage policy is written for modest traffic. A busy deployment should move to
 * a provider with an SLA (MapTiler, Stadia, Mapbox) and add that host to the
 * img-src directive in src/lib/security/csp.ts.
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Close enough to read the street, wide enough to keep the neighbourhood. */
const ZOOM = 16;

/**
 * Radius in metres of the shaded area around the pin.
 *
 * Coordinates come from the seller's phone or an admin's map pick, both of
 * which are accurate to a plot, not a doorstep. The circle says "around here"
 * rather than implying a precision the data does not have.
 */
const APPROXIMATE_RADIUS_M = 70;

/** Fallback if the token cannot be read - the placeholder brand gold. */
const FALLBACK_ACCENT = '#b08640';

export default function PropertyMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  // Resolve --accent to a real colour: SVG presentation attributes, which is
  // what Leaflet sets, do not accept var(). Reading it here keeps the map on
  // brand when the token layer is rebranded.
  //
  // Read once, in a state initialiser rather than an effect: this component is
  // only ever loaded with ssr: false, so the document exists on first render
  // and there is no server pass to guard against.
  const [accent] = useState(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    return value || FALLBACK_ACCENT;
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={ZOOM}
      // Scrolling the page must not zoom the map out from under the reader.
      // The +/- control and ctrl+scroll still work.
      scrollWheelZoom={false}
      className="h-[22rem] w-full rounded-lg"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Circle
        center={[latitude, longitude]}
        radius={APPROXIMATE_RADIUS_M}
        pathOptions={{ color: accent, fillColor: accent, fillOpacity: 0.12, weight: 1 }}
      />
      <CircleMarker
        center={[latitude, longitude]}
        radius={7}
        pathOptions={{ color: '#ffffff', fillColor: accent, fillOpacity: 1, weight: 2 }}
      />
    </MapContainer>
  );
}
