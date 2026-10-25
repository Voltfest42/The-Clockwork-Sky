import { JUPITER_A, JUPITER_RESONANCES, resonanceAxis, type Resonance } from '../core/orbits/resonance';
import { MOON_DISTANCE_KM } from '../data/scale';
import data from '../data/asteroids.json';

/**
 * Gaps in the belt (Figure 8.4): the numbered asteroids counted by the size of
 * their orbits (semi-major axis, AU), from JPL's Small-Body Database, and the
 * resonances with Jupiter that clear the gaps.
 */

export interface Bin {
  /** Lower and upper edges, AU. */
  a0: number;
  a1: number;
  count: number;
}

export const ASTEROID_COUNT = data.count;
export const FETCHED = data.fetched;
export const SPACING = data.spacing;
export const SLAB = data.slab;
export const GROUPS = data.groups;

/** The histogram's bins, 1.5–5.5 AU. */
export function beltBins(): Bin[] {
  const { from, bin, counts } = data.histogram;
  return counts.map((count, i) => ({ a0: from + i * bin, a1: from + (i + 1) * bin, count }));
}

/** The bin holding a semi-major axis. */
export function binAt(bins: readonly Bin[], a: number): Bin {
  const i = Math.floor((a - bins[0].a0) / (bins[0].a1 - bins[0].a0) + 1e-9);
  return bins[Math.max(0, Math.min(bins.length - 1, i))];
}

/** How deep a gap is: the emptiest bin within 0.01 AU of a, against the average 0.04–0.08 AU either side (0 = empty, 1 = no gap). */
export function gapDepth(bins: readonly Bin[], a: number): number {
  const inside = Math.min(...bins.filter((b) => Math.abs((b.a0 + b.a1) / 2 - a) <= 0.011).map((b) => b.count));
  const around = bins.filter((b) => {
    const d = Math.abs((b.a0 + b.a1) / 2 - a);
    return d >= 0.04 && d <= 0.08;
  });
  const mean = around.reduce((s, b) => s + b.count, 0) / around.length;
  return mean > 0 ? inside / mean : 1;
}

/** Where Jupiter's resonances fall, AU. */
export function resonanceMarkers(): (Resonance & { a: number })[] {
  return JUPITER_RESONANCES.map((r) => ({ ...r, a: resonanceAxis(JUPITER_A, r.p, r.q) }));
}

/** A spacing in words: "2.7 million km, about 7 times the distance to the Moon". */
export function spacingWords(km: number): string {
  return `${(km / 1e6).toFixed(1)} million km, about ${Math.round(km / MOON_DISTANCE_KM)} times the distance to the Moon`;
}

/** What the reader is pointing at: a bin, and any resonance there. */
export function describeBin(bins: readonly Bin[], a: number): string {
  const b = binAt(bins, a);
  const near = resonanceMarkers().find((m) => Math.abs(m.a - a) < 0.015);
  const orbit = `${b.a0.toFixed(2)}–${b.a1.toFixed(2)} AU: ${b.count.toLocaleString('en-GB')} asteroids. An orbit there takes ${(a ** 1.5).toFixed(2)} years.`;
  if (!near) return orbit;
  return near.kind === 'gap'
    ? `${orbit} This is the ${near.name} gap: an asteroid here would go round ${near.p} times for every ${near.q === 1 ? 'one' : near.q} of Jupiter’s, and Jupiter’s pulls would add up.`
    : `${orbit} This is the ${near.name} resonance, which shelters a group instead of clearing it.`;
}
