/**
 * The construction sequence.
 *
 * Each stage owns a slice of scroll progress (0 to 1). Everything the scene
 * renders reads its own visibility from this table, so the choreography lives
 * in one file rather than being scattered through the geometry.
 *
 * This is also the seam for swapping in a real GLB later: a modelled house
 * would implement the same stage boundaries, and nothing else in the scene or
 * the page would need to change.
 */

export type Stage = {
  id: string;
  label: string;
  caption: string;
  /** Scroll progress at which this stage begins and finishes building. */
  start: number;
  end: number;
};

export const STAGES: Stage[] = [
  {
    id: 'plot',
    label: 'The plot',
    caption: 'It starts with land, and a decision.',
    start: 0,
    end: 0.08,
  },
  {
    id: 'preparation',
    label: 'Ground preparation',
    caption: 'Levelled, measured, marked out.',
    start: 0.08,
    end: 0.18,
  },
  {
    id: 'foundation',
    label: 'Foundation',
    caption: 'Everything that lasts is built on this.',
    start: 0.18,
    end: 0.3,
  },
  {
    id: 'structure',
    label: 'Structure',
    caption: 'Columns and beams take the load.',
    start: 0.3,
    end: 0.42,
  },
  {
    id: 'walls',
    label: 'Walls',
    caption: 'Rooms begin to take shape.',
    start: 0.42,
    end: 0.55,
  },
  {
    id: 'roof',
    label: 'Roof',
    caption: 'Shelter, and a terrace above it.',
    start: 0.55,
    end: 0.65,
  },
  {
    id: 'openings',
    label: 'Windows and doors',
    caption: 'Light, air, and a way in.',
    start: 0.65,
    end: 0.75,
  },
  {
    id: 'finishing',
    label: 'Finishing',
    caption: 'Plaster, paint, and the boundary wall.',
    start: 0.75,
    end: 0.85,
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    caption: 'A lawn, a tree, a driveway.',
    start: 0.85,
    end: 0.94,
  },
  {
    id: 'complete',
    label: 'Your home',
    caption: 'Ready to move into.',
    start: 0.94,
    end: 1,
  },
];

/**
 * How far through a stage the scroll has travelled, 0 before it starts and 1
 * once it is finished. Elements use this to grow, fade or slide into place.
 */
export function stageProgress(progress: number, stage: Stage): number {
  if (progress <= stage.start) return 0;
  if (progress >= stage.end) return 1;
  return (progress - stage.start) / (stage.end - stage.start);
}

export function stageById(id: string): Stage {
  const stage = STAGES.find((entry) => entry.id === id);
  if (!stage) throw new Error(`Unknown construction stage: ${id}`);
  return stage;
}

/** The stage a given scroll position sits in - drives the on-screen caption. */
export function activeStage(progress: number): Stage {
  for (let index = STAGES.length - 1; index >= 0; index -= 1) {
    if (progress >= STAGES[index].start) return STAGES[index];
  }
  return STAGES[0];
}

/** Smoothstep, so things ease in rather than appearing linearly. */
export function ease(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}
