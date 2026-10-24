import { MEAN_ORBITS, PLANETS, siderealPeriodDays, type PlanetName } from '../core/ephemeris/meanLongitude';
import { planetElements } from '../core/ephemeris/planets';
import { J2000 } from '../core/time/julian';
import { DAYS_PER_JULIAN_YEAR } from '../core/units';

/**
 * Orbits for Chapter 6: sizes, shapes and periods of the planets, some dwarf
 * planets and comets, and Jupiter's four large moons.
 *
 * - Planets: Standish's Table 1 at J2000 (a, e, and the period from the mean
 *   motion), as used by the ephemeris; "Earth" is the Earth–Moon barycentre.
 * - Dwarf planets and comets: JPL Small-Body Database osculating elements
 *   (fetched 24 Oct 2026; epochs 2016–2026, Halley's 1968 and Swift–Tuttle's
 *   1995). Comets' periods change a little from one return to the next.
 * - Jupiter's moons: semi-major axes from JPL's planetary satellite mean
 *   elements, sidereal periods from NASA's Jovian satellite fact sheet.
 *
 * Semi-major axes in AU, periods in years.
 */

export type OrbitKind = 'planet' | 'dwarf planet' | 'comet' | 'moon of Jupiter';

export interface OrbitFact {
  id: string;
  name: string;
  kind: OrbitKind;
  /** Semi-major axis, AU. */
  a: number;
  e: number;
  /** Sidereal period, years. */
  period: number;
}

const PLANET_NAMES: Record<PlanetName, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

const KM_PER_AU = 149_597_870.7;

export const ORBITS: readonly OrbitFact[] = [
  ...PLANETS.map((p) => ({
    id: p,
    name: PLANET_NAMES[p],
    kind: 'planet' as const,
    a: MEAN_ORBITS[p].a,
    e: planetElements(p, J2000, 1).e,
    period: siderealPeriodDays(p) / DAYS_PER_JULIAN_YEAR,
  })),
  { id: 'ceres', name: 'Ceres', kind: 'dwarf planet', a: 2.7656, e: 0.0797, period: 4.6 },
  { id: 'pluto', name: 'Pluto', kind: 'dwarf planet', a: 39.589, e: 0.2518, period: 249.09 },
  { id: 'haumea', name: 'Haumea', kind: 'dwarf planet', a: 43.06, e: 0.1944, period: 282.57 },
  { id: 'makemake', name: 'Makemake', kind: 'dwarf planet', a: 45.571, e: 0.1589, period: 307.64 },
  { id: 'eris', name: 'Eris', kind: 'dwarf planet', a: 67.934, e: 0.4382, period: 559.94 },
  { id: 'encke', name: 'Comet Encke', kind: 'comet', a: 2.2185, e: 0.847, period: 3.3 },
  { id: 'halley', name: 'Halley’s comet', kind: 'comet', a: 17.929, e: 0.9679, period: 75.92 },
  { id: 'swift-tuttle', name: 'Comet Swift–Tuttle', kind: 'comet', a: 26.092, e: 0.9632, period: 133.28 },
  { id: 'io', name: 'Io', kind: 'moon of Jupiter', a: 421_800 / KM_PER_AU, e: 0.004, period: 1.769_138 / DAYS_PER_JULIAN_YEAR },
  { id: 'europa', name: 'Europa', kind: 'moon of Jupiter', a: 671_100 / KM_PER_AU, e: 0.009, period: 3.551_181 / DAYS_PER_JULIAN_YEAR },
  { id: 'ganymede', name: 'Ganymede', kind: 'moon of Jupiter', a: 1_070_400 / KM_PER_AU, e: 0.001, period: 7.154_553 / DAYS_PER_JULIAN_YEAR },
  { id: 'callisto', name: 'Callisto', kind: 'moon of Jupiter', a: 1_882_700 / KM_PER_AU, e: 0.007, period: 16.689_018 / DAYS_PER_JULIAN_YEAR },
];

export function orbitById(id: string): OrbitFact {
  const found = ORBITS.find((o) => o.id === id);
  if (!found) throw new Error(`No orbit called ${id}`);
  return found;
}
