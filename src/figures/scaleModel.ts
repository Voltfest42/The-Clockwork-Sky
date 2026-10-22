import { formatGrouped, formatSignificant } from '../core/math/scientific';
import { formatLength } from '../core/scale/format';
import { comparisonWords, distanceWords, nearestThing } from '../core/scale/model';
import { EVERYDAY_DISTANCES, EVERYDAY_SIZES, PITCH, STEP } from '../data/everyday';

/** A model size in words: "0.92 mm, about a grain of sand". */
export function describeModelSize(metres: number): string {
  const { thing, ratio } = nearestThing(EVERYDAY_SIZES, metres);
  return `${formatLength(metres)}: ${comparisonWords(ratio)} ${thing.name}`;
}

/** A model distance, with the way you'd cover it: steps, football pitches, or a journey. `from` names where it's measured from. */
export function describeModelDistance(metres: number, from?: string): string {
  const length = `${formatLength(metres)}${from ? ` from ${from}` : ''}`;
  if (metres < 1) return length;
  if (metres < 2_000) return `${length}: ${formatGrouped(Math.max(1, Math.round(metres / STEP)))} steps`;
  if (metres < 30_000) return `${length}: ${formatSignificant(metres / PITCH, 2)} football pitches`;
  const { thing, ratio } = nearestThing(EVERYDAY_DISTANCES, metres);
  return `${length}: ${distanceWords(ratio)} ${thing.name}`;
}

/** A round real distance, in km, that comes out between 1 cm and 10 cm in a model at this scale. */
export function roundRealKilometres(scale: number): number {
  return 10 ** Math.ceil(Math.log10(0.01 / (scale * 1000)));
}
