/**
 * Numbers for Chapter 7, from the Part I research brief (docs/part1/research.md
 * §8) and NASA's planetary fact sheets. Lengths in km, times in days, masses
 * in kg, unless a name says otherwise.
 */

export interface WeighingPair {
  id: string;
  /** "Sun and Earth": the button's label. */
  name: string;
  central: string;
  satellite: string;
  /** Orbit's semi-major axis, km. */
  a: number;
  /** Sidereal period, days. */
  period: number;
  /** The mass the orbit weighs (kg): both bodies together, where the satellite's share matters. */
  mass: number;
  /** What `mass` is: "the Sun", "Earth plus the Moon". */
  massOf: string;
  /** Radii for drawing, km. */
  centralRadius: number;
  satelliteRadius: number;
  /** For an orbit that changes (the ISS's): when the values were current. */
  asOf?: string;
}

/**
 * Pairs to weigh with an orbit (Figure 7.3). Semi-major axes and periods: NASA
 * fact sheets, JPL's satellite mean elements; the ISS about 420 km up, as of
 * October 2026 (it is boosted and decays, so this changes).
 */
export const WEIGHING_PAIRS: readonly WeighingPair[] = [
  { id: 'sun-earth', name: 'Sun and Earth', central: 'the Sun', satellite: 'Earth', a: 149_598_000, period: 365.256, mass: 1.9885e30 + 6.046e24, massOf: 'the Sun', centralRadius: 695_700, satelliteRadius: 6_371 },
  { id: 'earth-moon', name: 'Earth and the Moon', central: 'Earth', satellite: 'the Moon', a: 384_400, period: 27.3217, mass: 5.9722e24 + 7.342e22, massOf: 'Earth plus the Moon', centralRadius: 6_371, satelliteRadius: 1_737 },
  { id: 'earth-iss', name: 'Earth and the ISS', central: 'Earth', satellite: 'the ISS', a: 6_791, period: 92.8 / 1440, mass: 5.9722e24, massOf: 'Earth', centralRadius: 6_371, satelliteRadius: 0.05, asOf: 'October 2026' },
  { id: 'jupiter-io', name: 'Jupiter and Io', central: 'Jupiter', satellite: 'Io', a: 421_800, period: 1.769_138, mass: 1.898_1e27 + 8.93e22, massOf: 'Jupiter (and Io)', centralRadius: 69_911, satelliteRadius: 1_822 },
  { id: 'mars-phobos', name: 'Mars and Phobos', central: 'Mars', satellite: 'Phobos', a: 9_376, period: 0.318_91, mass: 6.417e23, massOf: 'Mars', centralRadius: 3_390, satelliteRadius: 11 },
  { id: 'pluto-charon', name: 'Pluto and Charon', central: 'Pluto', satellite: 'Charon', a: 19_596, period: 6.387_2, mass: 1.303e22 + 1.586e21, massOf: 'Pluto plus Charon', centralRadius: 1_188, satelliteRadius: 606 },
];

export interface BalancePair {
  id: string;
  name: string;
  heavy: string;
  light: string;
  /** How many times heavier the heavy body is. */
  ratio: number;
  /** Distance between their centres, km. */
  separation: number;
  /** The heavy body's radius, km. */
  heavyRadius: number;
  lightRadius: number;
  /** The heavy body's mass, kg. */
  heavyMass: number;
}

/** Pairs for the barycentre (Figure 7.4). Mass ratios and distances from NASA's fact sheets. */
export const BALANCE_PAIRS: readonly BalancePair[] = [
  { id: 'earth-moon', name: 'Earth and the Moon', heavy: 'Earth', light: 'the Moon', ratio: 81.3, separation: 384_400, heavyRadius: 6_371, lightRadius: 1_737, heavyMass: 5.9722e24 },
  { id: 'pluto-charon', name: 'Pluto and Charon', heavy: 'Pluto', light: 'Charon', ratio: 8.22, separation: 19_596, heavyRadius: 1_188, lightRadius: 606, heavyMass: 1.303e22 },
  { id: 'sun-jupiter', name: 'Sun and Jupiter', heavy: 'the Sun', light: 'Jupiter', ratio: 1_047.6, separation: 778_500_000, heavyRadius: 695_700, lightRadius: 69_911, heavyMass: 1.9885e30 },
  { id: 'sun-earth', name: 'Sun and Earth', heavy: 'the Sun', light: 'Earth', ratio: 332_950, separation: 149_598_000, heavyRadius: 695_700, lightRadius: 6_371, heavyMass: 1.9885e30 },
  { id: 'twin-stars', name: 'Two equal stars', heavy: 'one star', light: 'the other', ratio: 1, separation: 30_000_000, heavyRadius: 695_700, lightRadius: 695_700, heavyMass: 1.9885e30 },
];

/** For the tides (Figure 7.5): the Moon's and the Sun's masses (kg) and mean distances (km). */
export const TIDE_BODIES = {
  moon: { mass: 7.342e22, distance: 384_400 },
  sun: { mass: 1.9885e30, distance: 149_598_000 },
  earth: { mass: 5.9722e24, radius: 6_371 },
} as const;

/** The Moon moves away by about 3.8 cm a year (lunar laser ranging), and tidal friction lengthens the day by about 2.3 ms a century (1.8 ms observed, with the rebound from the ice ages). */
export const TIDAL_RECESSION_CM_PER_YEAR = 3.8;

/** Orbits for the Hohmann transfer (Figure 7.6): circles at the mean distances (AU) with the sidereal periods (days). */
export const TRANSFER_PLANETS = {
  earth: { a: 1.000_001, period: 365.256 },
  mars: { a: 1.523_68, period: 686.98 },
} as const;
