/**
 * Scale models: shrinking the Solar System by one factor, so that sizes and
 * distances keep their true proportions, then describing the results with
 * things a reader can picture. Sizes and distances in metres.
 */

export interface Comparable {
  name: string;
  /** Size or distance, m. */
  size: number;
}

/** The factor that shrinks a real size to a model size: model ÷ real. */
export function modelScale(realSize: number, modelSize: number): number {
  if (!(realSize > 0) || !(modelSize > 0)) throw new RangeError('Scale model sizes must be positive');
  return modelSize / realSize;
}

/**
 * The thing whose size is closest to `size`, judged by ratio (so 1 mm is
 * closer to 2 mm than to 0.1 mm), and the ratio size ÷ thing.
 */
export function nearestThing<T extends Comparable>(things: readonly T[], size: number): { thing: T; ratio: number } {
  if (things.length === 0) throw new Error('No things to compare with');
  let best = things[0];
  let bestGap = Infinity;
  for (const thing of things) {
    const gap = Math.abs(Math.log(size / thing.size));
    if (gap < bestGap) {
      best = thing;
      bestGap = gap;
    }
  }
  return { thing: best, ratio: size / best.size };
}

/**
 * How a size compares with a thing, in words, from the ratio size ÷ thing:
 * "about the size of", "a bit smaller than", "about twice"…
 */
export function comparisonWords(ratio: number): string {
  if (ratio < 0.4) return 'much smaller than';
  if (ratio < 0.75) return 'smaller than';
  if (ratio < 0.92) return 'a bit smaller than';
  if (ratio <= 1.09) return 'about';
  if (ratio <= 1.35) return 'a bit bigger than';
  if (ratio <= 2.5) return 'bigger than';
  return 'much bigger than';
}

/** The same for distances: "nearly as far as", "about as far as", "a bit farther than"… */
export function distanceWords(ratio: number): string {
  if (ratio < 0.4) return 'much less than';
  if (ratio < 0.75) return 'less than';
  if (ratio < 0.92) return 'nearly as far as';
  if (ratio <= 1.09) return 'about as far as';
  if (ratio <= 1.35) return 'a bit farther than';
  if (ratio <= 2.5) return 'farther than';
  return 'much farther than';
}
