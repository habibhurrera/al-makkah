'use client';

import dynamic from 'next/dynamic';

/**
 * Loads the 3D hero only in the browser, and only once the page is running.
 *
 * The three.js bundle is by far the heaviest thing on the site. Importing it
 * dynamically keeps it out of the shared chunk, so /buy, /sell and every
 * property page stay light - they never download the 3D code at all.
 */
const Hero3D = dynamic(
  () => import('./hero-3d').then((mod) => mod.Hero3D),
  {
    ssr: false,
    loading: () => <div className="bg-surface-inverse min-h-[70vh]" />,
  },
);

export function Hero() {
  return <Hero3D />;
}
