/**
 * Mean-motion resonances with a planet, from Kepler's third law (P² ∝ a³ for
 * bodies much lighter than the Sun). An asteroid "in the p : q resonance" goes
 * round p times while the planet goes round q times, so the two line up at the
 * same places again and again, and the planet's pulls add up instead of
 * averaging out. Lengths are in the planet's units (AU here).
 */

/** The semi-major axis of an orbit that goes round p times while the planet goes round q times: a = aPlanet × (q/p)^(2/3). */
export function resonanceAxis(aPlanet: number, p: number, q: number): number {
  if (!(p > 0 && q > 0)) throw new RangeError('Resonance numbers must be positive');
  return aPlanet * (q / p) ** (2 / 3);
}

/** How many times longer an orbit of semi-major axis a takes than the planet's: (a / aPlanet)^(3/2). */
export function periodRatio(a: number, aPlanet: number): number {
  return (a / aPlanet) ** 1.5;
}

/** The planet's orbits per orbit of the body: the body goes round 1 / periodRatio times as often. */
export function orbitsPerPlanetOrbit(a: number, aPlanet: number): number {
  return 1 / periodRatio(a, aPlanet);
}

export interface Resonance {
  p: number;
  q: number;
  /** A Kirkwood gap (emptied), or a group the resonance protects (the Hildas, the Trojans). */
  kind: 'gap' | 'group';
  name: string;
}

/** Jupiter's resonances that shape the asteroid belt: the Kirkwood gaps, and the Hildas and Trojans that cluster at 3 : 2 and 1 : 1. */
export const JUPITER_RESONANCES: readonly Resonance[] = [
  { p: 4, q: 1, kind: 'gap', name: '4 : 1' },
  { p: 3, q: 1, kind: 'gap', name: '3 : 1' },
  { p: 5, q: 2, kind: 'gap', name: '5 : 2' },
  { p: 7, q: 3, kind: 'gap', name: '7 : 3' },
  { p: 2, q: 1, kind: 'gap', name: '2 : 1' },
  { p: 3, q: 2, kind: 'group', name: '3 : 2 (the Hildas)' },
  { p: 1, q: 1, kind: 'group', name: '1 : 1 (the Trojans)' },
];

/** Jupiter's semi-major axis, AU (Standish, Table 1, at J2000). */
export const JUPITER_A = 5.202_887;
