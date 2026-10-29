import type { VisualOrbit } from '../core/binaries/visual';

/**
 * Double stars whose orbits we know, from the Sixth Catalog of Orbits of
 * Visual Binary Stars (W. I. Hartkopf, B. D. Mason and colleagues, US Naval
 * Observatory and Georgia State University; fetched 29 October 2026). The
 * catalogue grades orbits from 1 (definitive) to 5 (indeterminate); the long
 * orbits of ε Lyrae's pairs are grade 4, preliminary, but they reproduce the
 * pairs' measured separations, which change only slowly.
 *
 * Magnitudes are visual; the pair's separation today comes from the orbit
 * (src/core/binaries/visual.ts).
 */

export interface VisualPair {
  id: string;
  name: string;
  /** The two stars' names and visual magnitudes. */
  primary: { name: string; V: number };
  secondary: { name: string; V: number };
  orbit: VisualOrbit;
  /** ORB6's grade, 1 (definitive) to 5. */
  grade: number;
  /** Where the orbit comes from. */
  reference: string;
  /** A sentence about the pair. */
  note: string;
}

export const VISUAL_PAIRS: readonly VisualPair[] = [
  {
    id: 'epsilon-lyrae-1',
    name: 'ε¹ Lyrae',
    primary: { name: 'ε¹ Lyrae A', V: 5.15 },
    secondary: { name: 'ε¹ Lyrae B', V: 6.1 },
    orbit: { period: 2802.8, periastron: 2051.49, a: 14.237, e: 0.953, i: 102.2, node: 149.6, omega: 258.8 },
    grade: 4,
    reference: 'J. A. Docobo and colleagues (2020)',
    note: 'One half of the “double double” in Lyra: to the eye one star, in binoculars two, and in a small telescope each of those splits again.',
  },
  {
    id: 'epsilon-lyrae-2',
    name: 'ε² Lyrae',
    primary: { name: 'ε² Lyrae C', V: 5.25 },
    secondary: { name: 'ε² Lyrae D', V: 5.38 },
    orbit: { period: 724.3, periastron: 2223.9, a: 2.92, e: 0.353, i: 126.1, node: 26.5, omega: 73.8 },
    grade: 4,
    reference: 'J. A. Docobo and colleagues (2020)',
    note: 'The other half of the “double double”, 208″ from ε¹.',
  },
  {
    id: 'castor',
    name: 'Castor',
    primary: { name: 'Castor A', V: 1.93 },
    secondary: { name: 'Castor B', V: 2.97 },
    orbit: { period: 459.1, periastron: 1959.59, a: 6.722, e: 0.3382, i: 115.107, node: 41.304, omega: 251.84 },
    grade: 3,
    reference: 'Sixth Catalog of Orbits (2022 solution)',
    note: 'The pair William Herschel watched turn in 1803, the first proof that some double stars orbit each other. Each star is itself a close pair.',
  },
  {
    id: 'alpha-centauri',
    name: 'α Centauri',
    primary: { name: 'α Centauri A', V: 0.01 },
    secondary: { name: 'α Centauri B', V: 1.33 },
    orbit: { period: 79.762, periastron: 1955.564, a: 17.493, e: 0.51947, i: 79.243, node: 205.073, omega: 231.519 },
    grade: 2,
    reference: 'R. Akeson and colleagues (2021), AJ 162, 14',
    note: 'The nearest pair of Sun-like stars, 4.4 light-years away; from the southern hemisphere a small telescope splits it.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    primary: { name: 'Sirius A', V: -1.46 },
    secondary: { name: 'Sirius B', V: 8.44 },
    orbit: { period: 50.1284, periastron: 1994.5715, a: 7.4957, e: 0.59142, i: 136.336, node: 45.4, omega: 149.161 },
    grade: 2,
    reference: 'H. E. Bond and colleagues (2017), ApJ 840, 70',
    note: 'A white dwarf 10,000 times fainter than its companion, lost in its glare: first seen by Alvan Clark in 1862, after Bessel had predicted it from Sirius’s wobble.',
  },
];
