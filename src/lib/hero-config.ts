/**
 * The homepage hero film.
 *
 * Defaults to the asset rendered by the Remotion project (see
 * ../../remotion, composition "HeroLoop"). Both values can be overridden per
 * deployment so a licensee points at footage they own without touching code -
 * which is the whole reason this is configuration rather than a hard-coded
 * import.
 *
 * NEXT_PUBLIC_ because the poster is server-rendered for LCP while the video
 * element mounts in the browser; both halves need the same value.
 */
export type HeroMedia = {
  videoUrl: string;
  posterUrl: string;
};

const DEFAULT_VIDEO = '/hero/construction.mp4';
const DEFAULT_POSTER = '/hero/construction.jpg';

export function heroMedia(): HeroMedia {
  return {
    videoUrl: process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim() || DEFAULT_VIDEO,
    posterUrl: process.env.NEXT_PUBLIC_HERO_POSTER_URL?.trim() || DEFAULT_POSTER,
  };
}
