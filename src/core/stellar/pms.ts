/**
 * Young stars and brown dwarfs on their way down to the main sequence, from
 * tabulated tracks (BHAC15 in src/data/bhac15.json; 0.01–1.4 M☉, solar
 * metallicity). Ages in years, temperatures in K, luminosities and radii in
 * solar units.
 */

/** One tabulated track: [log t (yr), Teff (K), log L/L☉, R/R☉, log Li/Li0] at each age. */
export interface PmsTrack {
  mass: number;
  points: readonly (readonly number[])[];
}

export interface PmsState {
  age: number;
  kelvin: number;
  luminosity: number;
  radius: number;
  /** The share of the star's lithium left at its surface. */
  lithium: number;
}

/** The track at an age (years), interpolated in log t; null outside the tabulated ages. */
export function pmsAt(track: PmsTrack, age: number): PmsState | null {
  const lt = Math.log10(age);
  const p = track.points;
  if (lt < p[0][0] || lt > p[p.length - 1][0]) return null;
  let i = 1;
  while (i < p.length - 1 && p[i][0] < lt) i++;
  const a = p[i - 1];
  const b = p[i];
  const f = b[0] === a[0] ? 0 : (lt - a[0]) / (b[0] - a[0]);
  const mix = (k: number) => a[k] + f * (b[k] - a[k]);
  return { age, kelvin: mix(1), luminosity: 10 ** mix(2), radius: mix(3), lithium: 10 ** mix(4) };
}

/** The track's first and last ages, years. */
export const pmsAges = (track: PmsTrack): [number, number] => [10 ** track.points[0][0], 10 ** track.points[track.points.length - 1][0]];

/**
 * When the star settles on the main sequence, in years: the age at which its radius first comes within 3% of
 * the smallest it reaches. A star that never stops shrinking (a brown dwarf, or a track that ends first) has none.
 */
export function zamsArrival(track: PmsTrack, within = 0.03): number | null {
  const p = track.points;
  let smallest = Infinity;
  let at = -1;
  for (const [k, q] of p.entries()) {
    if (q[3] < smallest) {
      smallest = q[3];
      at = k;
    }
  }
  // Still shrinking at the end: no main sequence in the table.
  if (at >= p.length - 3) return null;
  for (const q of p) if (q[3] <= smallest * (1 + within)) return 10 ** q[0];
  return null;
}
