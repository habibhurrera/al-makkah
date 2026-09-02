import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/layout';
import { BRAND } from '@/lib/brand';
import { heroMedia } from '@/lib/hero-config';
import { HeroVideoLayer } from './hero-video-layer';

/**
 * The homepage hero: the construction film as a backdrop, with the copy on top.
 *
 * The film is deliberately pushed back rather than shown at full strength -
 * dimmed and slightly desaturated in CSS, then covered by a two-part scrim.
 * It sets a scene; it is not the thing being read. Anything brighter and the
 * headline starts competing with a moving image, which the headline loses.
 *
 * The scrim is two layers rather than one because they do different jobs: a
 * flat wash guarantees a minimum contrast ratio everywhere, and a directional
 * gradient adds depth behind the text specifically. One layer strong enough to
 * do both would flatten the film into grey.
 */
export function Hero() {
  const media = heroMedia();

  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      {/* Poster is server-rendered, so it is the LCP element and the section is
          never empty. Plain <img>: a licensee's poster may be hosted anywhere,
          and the image optimiser's host allowlist would silently reject it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.posterUrl}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover brightness-[0.45] saturate-[0.85]"
      />

      <div className="absolute inset-0 brightness-[0.45] saturate-[0.85]">
        <HeroVideoLayer videoUrl={media.videoUrl} posterUrl={media.posterUrl} />
      </div>

      {/* Flat wash: floor on contrast, whatever frame is on screen. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink-950/45" />

      {/* Directional gradient: depth behind the copy. Runs bottom-to-top on
          phones, where the text sits over the middle of the frame, and
          left-to-right from md up, where it sits to one side. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/50 to-ink-950/20 md:bg-gradient-to-r md:from-ink-950/90 md:via-ink-950/45 md:to-transparent"
      />

      <Container className="relative">
        <div className="min-h-[78vh] md:min-h-[86vh] flex flex-col justify-center py-24">
          <div className="flex flex-col gap-6 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
              {BRAND.city}, {BRAND.region}
            </p>

            <h1 className="font-display font-semibold text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-white text-balance drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]">
              Building dreams.
              <br />
              <span className="text-accent">Finding homes.</span>
            </h1>

            <p className="text-lg md:text-xl text-ink-200 max-w-[44ch] text-pretty">
              Buy, sell and rent property across {BRAND.city} with a team that
              verifies every listing before it goes live.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <ButtonLink href="/buy" variant="inverse" size="lg">
                Explore properties
              </ButtonLink>
              <ButtonLink
                href="/sell"
                size="lg"
                className="border border-white/35 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
              >
                List your property
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>

      {/* Softens the cut from film to page. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent"
      />
    </section>
  );
}
