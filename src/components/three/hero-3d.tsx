'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { HouseScene } from './house-scene';
import { activeStage, STAGES } from './construction-stages';
import {
  useQuality,
  usePrefersReducedMotion,
  useWebGLSupported,
  useIsWide,
  type Quality,
} from './use-quality-tier';

/**
 * The scroll-driven construction hero.
 *
 * Layout: a tall section with a sticky full-height canvas inside it. Scrolling
 * through the section maps to 0..1 progress, which drives both the house and
 * the camera. Nothing animates on a timer - if the visitor stops scrolling,
 * the build stops with them.
 *
 * Progress is written to a plain mutable object on scroll and sampled inside
 * the Canvas render loop, so scrolling does not re-render the page on every
 * frame. React state only tracks it coarsely, for the visible caption.
 */

const SCROLL_LENGTH_VH = 380;

function HeroCopy({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-5 max-w-3xl pointer-events-auto">
      <p className="text-xs uppercase tracking-[0.22em] text-ink-400">
        Hyderabad, Sindh
      </p>
      <h1
        className={`font-display ${compact ? 'text-4xl' : 'text-4xl md:text-5xl'} text-balance text-text-inverse`}
      >
        Building Dreams. Finding Homes.
      </h1>
      <p className="text-lg text-ink-300 max-w-[46ch] text-pretty">
        Buy, sell and rent property across Hyderabad with a company that
        verifies what it lists.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/buy" variant="inverse" size="lg">
          Explore Properties
        </ButtonLink>
        <ButtonLink
          href="/sell"
          size="lg"
          className="border border-ink-700 text-text-inverse hover:bg-ink-800 bg-transparent"
        >
          Sell Your Property
        </ButtonLink>
      </div>
    </div>
  );
}

/** Shown when WebGL is unavailable or the visitor prefers reduced motion. */
function StaticHero() {
  return (
    <section className="bg-surface-inverse text-text-inverse">
      <Container>
        <div className="min-h-[70vh] flex flex-col justify-center py-20">
          <HeroCopy />
        </div>
      </Container>
    </section>
  );
}

export function Hero3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Written on scroll, read inside the Canvas render loop - never during
  // render, which is what keeps this off React's re-render path entirely.
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const quality = useQuality();
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useWebGLSupported();
  const isWide = useIsWide();

  useEffect(() => {
    if (reducedMotion || !webgl) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const element = sectionRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const value =
        travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));

      progressRef.current = value;
      // Round hard so React re-renders roughly 25 times over the whole
      // sequence, not once per scroll event.
      setProgress((current) =>
        Math.abs(current - value) > 0.04 || value === 0 || value === 1
          ? value
          : current,
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reducedMotion, webgl]);

  if (reducedMotion || !webgl) return <StaticHero />;

  const stage = activeStage(progress);
  const stageIndex = STAGES.indexOf(stage);

  return (
    <section
      ref={sectionRef}
      style={{ height: `${SCROLL_LENGTH_VH}vh` }}
      aria-label="AL-MAKKAH introduction"
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-surface-inverse">
        <Canvas
          dpr={quality.dpr}
          shadows={quality.shadows}
          camera={{ position: [-40, 20, 34], fov: 38 }}
          gl={{ antialias: quality.tier !== 'low', powerPreference: 'high-performance' }}
          onCreated={() => setReady(true)}
          className="absolute inset-0"
        >
          <fog attach="fog" args={['#0e0e0d', 55, 130]} />
          <SceneBridge
            progressRef={progressRef}
            quality={quality}
            focusX={isWide ? -15 : 0}
            focusY={2.6}
            distanceScale={isWide ? 1 : 1.9}
          />
        </Canvas>

        {/* Readability behind the copy, without hiding the build. */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/90 via-ink-950/45 to-transparent lg:bg-gradient-to-r lg:from-ink-950/85 lg:via-ink-950/40 lg:to-transparent pointer-events-none" />

        <div className="absolute inset-0 flex items-start lg:items-center pt-24 lg:pt-0 pointer-events-none">
          <Container>
            <HeroCopy />
          </Container>
        </div>

        {/* Stage caption, bottom left. */}
        <div className="absolute bottom-8 left-0 right-0 pointer-events-none">
          <Container>
            <div className="flex flex-col gap-3 max-w-sm">
              <div className="flex gap-1" aria-hidden="true">
                {STAGES.map((entry, index) => (
                  <span
                    key={entry.id}
                    className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                      index <= stageIndex ? 'bg-accent' : 'bg-ink-700'
                    }`}
                  />
                ))}
              </div>
              <p
                aria-live="polite"
                className="text-sm text-ink-300 transition-opacity duration-300"
              >
                <span className="text-text-inverse font-medium">
                  {stage.label}
                </span>{' '}
                — {stage.caption}
              </p>
            </div>
          </Container>
        </div>

        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-surface-inverse">
            <p className="text-sm text-ink-400">Preparing the site…</p>
          </div>
        )}

        {progress < 0.05 && (
          <div className="absolute bottom-8 right-6 text-xs uppercase tracking-[0.18em] text-ink-500 pointer-events-none">
            Scroll to build
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Samples scroll progress inside the render loop.
 *
 * useFrame runs outside React's render phase, so reading the mutable source
 * and setting state here is safe. The threshold keeps the scene from
 * re-rendering on sub-pixel scroll noise.
 */
function SceneBridge({
  progressRef,
  quality,
  focusX,
  focusY,
  distanceScale,
}: {
  progressRef: React.RefObject<number>;
  quality: Quality;
  focusX: number;
  focusY: number;
  distanceScale: number;
}) {
  const [progress, setProgress] = useState(0);

  useFrame(() => {
    const next = progressRef.current;
    if (Math.abs(next - progress) > 0.002) setProgress(next);
  });

  return (
    <HouseScene
      progress={progress}
      quality={quality}
      focusX={focusX}
      focusY={focusY}
      distanceScale={distanceScale}
    />
  );
}
