'use client';

import { useState, useSyncExternalStore } from 'react';

/**
 * The playing video, layered over a poster that is already on screen.
 *
 * The poster is server-rendered by the parent, so it is the LCP element and it
 * paints before any JavaScript runs. This layer only ever adds motion on top -
 * if it never mounts, the hero still looks finished rather than broken.
 *
 * Three visitors deliberately never get the video:
 *
 *  - anyone who has asked their system for reduced motion
 *  - anyone on a metered connection (Save-Data)
 *  - anyone on a 2G-class connection, where a multi-megabyte autoplay is
 *    actively hostile
 *
 * All three are read through useSyncExternalStore rather than an effect, so
 * the server snapshot is simply "no video" and there is no first paint at the
 * wrong state followed by a correcting re-render.
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

const STARVED_CONNECTIONS = ['slow-2g', '2g'];

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;

  if (connection?.saveData) return false;
  if (connection?.effectiveType && STARVED_CONNECTIONS.includes(connection.effectiveType)) {
    return false;
  }

  return true;
}

/** On the server there is no media query and no connection - so, no video. */
function getServerSnapshot(): boolean {
  return false;
}

export function HeroVideoLayer({
  videoUrl,
  posterUrl,
}: {
  videoUrl: string;
  posterUrl: string;
}) {
  const shouldPlay = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Set from the element's own event, not an effect: the video fades in only
  // once it can actually play, so the poster is never replaced by a blank frame.
  const [playing, setPlaying] = useState(false);

  if (!shouldPlay) return null;

  return (
    <video
      // The poster is repeated here so that a slow first frame shows the same
      // image the parent already painted, rather than transparent black.
      poster={posterUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      onCanPlay={() => setPlaying(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
        playing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <source src={videoUrl} />
    </video>
  );
}
