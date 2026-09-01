'use client';

import { useEffect, useState } from 'react';

/**
 * Device-aware quality.
 *
 * A mid-range Android in Hyderabad is the realistic worst case, and it is also
 * where most of the traffic will come from. Rather than sacrificing the whole
 * experience on mobile, the scene keeps its choreography and drops what costs
 * the most: shadows, light count, geometry detail and pixel ratio.
 *
 * Every hook here reads the browser during lazy state initialisation rather
 * than in an effect. That is safe because the 3D hero is loaded with
 * `ssr: false`, so these only ever run in the browser - and it avoids a first
 * paint at the wrong quality followed by an immediate re-render.
 */
export type QualityTier = 'high' | 'medium' | 'low';

export type Quality = {
  tier: QualityTier;
  /** Cap on devicePixelRatio - the single biggest lever on fill rate. */
  dpr: [number, number];
  shadows: boolean;
  /** Rounded corners and cylinder segments. */
  detail: number;
  /** Decorative extras that add nothing structural. */
  extras: boolean;
};

const PRESETS: Record<QualityTier, Quality> = {
  high: { tier: 'high', dpr: [1, 2], shadows: true, detail: 16, extras: true },
  medium: { tier: 'medium', dpr: [1, 1.5], shadows: false, detail: 10, extras: true },
  low: { tier: 'low', dpr: [1, 1], shadows: false, detail: 6, extras: false },
};

function detect(): QualityTier {
  if (typeof window === 'undefined') return 'medium';

  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  // Small screen plus modest hardware is the phone case we optimise hardest for.
  if (width < 768 && (cores <= 4 || memory <= 4)) return 'low';
  if (width < 768) return 'medium';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

export function useQuality(): Quality {
  const [tier, setTier] = useState<QualityTier>(detect);

  useEffect(() => {
    // Rotating a tablet or resizing a window can cross the threshold.
    const onResize = () => setTier(detect());
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return PRESETS[tier];
}

/** True when the visitor has asked their system for less motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return false;
    // Release immediately; browsers cap how many contexts may exist at once.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** WebGL availability, checked once. */
export function useWebGLSupported(): boolean {
  const [supported] = useState(detectWebGL);
  return supported;
}

/**
 * True on layouts wide enough to put the copy beside the house rather than
 * on top of it. Drives how the scene is framed, not how much it costs.
 */
export function useIsWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return wide;
}
