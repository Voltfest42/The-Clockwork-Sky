import { T_SUN } from '../core/constants';
import debcat from '../data/debcat.json';
import { FAMOUS_STARS } from '../data/stars';

/**
 * The mass–luminosity relation (Figure 14.4): the stars of DEBCat's detached
 * eclipsing pairs, whose masses and radii are known to a few per cent, with
 * luminosities from their radii and temperatures (L = R² T⁴ in solar units).
 * Stars still on the main sequence are those with a surface gravity log g of
 * 3.9 or more (4.5 or more below 0.7 M☉, which leaves out a few young red
 * dwarfs in Upper Scorpius, still shrinking towards it); the rest have begun to swell.
 */

export interface MeasuredStar {
  label: string;
  /** M☉, R☉, L☉, K. */
  mass: number;
  radius: number;
  luminosity: number;
  temperature: number;
  mainSequence: boolean;
}

interface System {
  name: string;
  logM: (number | null)[];
  logR: (number | null)[];
  logg: (number | null)[];
  logT: (number | null)[];
}

/** Every star in DEBCat with a mass, radius and temperature: two per pair. */
export const DEBCAT_STARS: readonly MeasuredStar[] = (debcat.systems as System[]).flatMap((s) =>
  [0, 1].flatMap((k) => {
    const [m, r, g, t] = [s.logM[k], s.logR[k], s.logg[k], s.logT[k]];
    if (m === null || r === null || t === null) return [];
    const radius = 10 ** r;
    const temperature = 10 ** t;
    return [{ label: `${s.name} ${k ? 'B' : 'A'}`, mass: 10 ** m, radius, temperature, luminosity: radius * radius * (temperature / T_SUN) ** 4, mainSequence: (g ?? 0) >= (10 ** m < 0.7 ? 4.5 : 3.9) }];
  }),
);

/** Famous stars whose masses come from orbits: the Sun, α Centauri A and B, Sirius A, Procyon A and Proxima. */
export const FAMOUS_WEIGHED: readonly MeasuredStar[] = ['sun', 'alpha-cen-a', 'alpha-cen-b', 'sirius-a', 'procyon-a', 'proxima'].flatMap((id) => {
  const s = FAMOUS_STARS.find((x) => x.id === id);
  if (!s) return [];
  return [{ label: id === 'sun' ? 'the Sun' : s.name, mass: s.mass.value, radius: s.radius.value, luminosity: s.luminosity.value, temperature: s.temperature.value, mainSequence: true }];
});

/** The least-squares slope and intercept of log y against log x. */
export function logFit(points: readonly { x: number; y: number }[]): { slope: number; intercept: number; scatter: number } {
  const n = points.length;
  const lx = points.map((p) => Math.log10(p.x));
  const ly = points.map((p) => Math.log10(p.y));
  const mx = lx.reduce((a, b) => a + b, 0) / n;
  const my = ly.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let k = 0; k < n; k++) {
    sxy += (lx[k] - mx) * (ly[k] - my);
    sxx += (lx[k] - mx) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const scatter = Math.sqrt(ly.reduce((a, y, k) => a + (y - intercept - slope * lx[k]) ** 2, 0) / n);
  return { slope, intercept, scatter };
}

export type Quantity = 'luminosity' | 'radius';

/** Mass ranges to fit, in M☉: the relation is steepest near the Sun's mass and flatter at both ends. */
export const FIT_RANGES = [
  { id: 'low', name: 'Below 0.7 Suns', from: 0, to: 0.7 },
  { id: 'middle', name: '0.7 to 2 Suns', from: 0.7, to: 2 },
  { id: 'high', name: '2 to 10 Suns', from: 2, to: 10 },
  { id: 'top', name: 'Above 10 Suns', from: 10, to: 100 },
  { id: 'all', name: 'All of them', from: 0, to: 100 },
] as const;

/** The best power law for the main-sequence stars in a mass range: y = 10^intercept × M^slope. */
export function fitRange(quantity: Quantity, from: number, to: number) {
  const stars = DEBCAT_STARS.filter((s) => s.mainSequence && s.mass >= from && s.mass < to);
  return { ...logFit(stars.map((s) => ({ x: s.mass, y: s[quantity] }))), count: stars.length };
}

/** "2.0 × the mass: 11 × the light": what a power law means for doubling. */
export function doubling(slope: number): string {
  const factor = 2 ** slope;
  return factor >= 10 ? Math.round(factor).toString() : factor.toFixed(1);
}
