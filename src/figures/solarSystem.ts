import { heliocentricEcliptic } from '../core/ephemeris/planets';
import { PLANETS, siderealPeriodDays, type PlanetName } from '../core/ephemeris/meanLongitude';
import { AU, C } from '../core/constants';
import { worldById, type World } from '../data/planets';

/**
 * The Solar System today (Figure 8.1): the planets' real positions from the
 * planetary model (Standish's elements), their orbits, and sizes to scale.
 * Positions are AU in the J2000 ecliptic frame, seen from its north.
 */

export type DistanceView = 'inner' | 'jupiter' | 'neptune' | 'kuiper';

/** How far each view reaches from the Sun, AU (the half-width of the picture). */
export const VIEW_REACH: Record<DistanceView, number> = { inner: 1.8, jupiter: 5.8, neptune: 32, kuiper: 52 };

export const VIEW_NAMES: Record<DistanceView, string> = {
  inner: 'Inner planets',
  jupiter: 'Out to Jupiter',
  neptune: 'Out to Neptune',
  kuiper: 'The Kuiper belt',
};

/** The main asteroid belt and the Kuiper belt, AU from the Sun (brief §9). */
export const BELTS = { asteroids: [2.1, 3.3] as const, kuiper: [30, 50] as const };

/** A planet's position (AU, ecliptic x and y) at a Julian Date. */
export function planetAt(planet: PlanetName, jdTT: number): { x: number; y: number; r: number } {
  const [x, y, z] = heliocentricEcliptic(planet, jdTT);
  return { x, y, r: Math.hypot(x, y, z) };
}

/** A planet's orbit as points (AU) round one whole period from the date, for drawing. */
export function orbitPath(planet: PlanetName, jdTT: number, points = 180): { x: number; y: number }[] {
  const period = siderealPeriodDays(planet);
  return Array.from({ length: points }, (_, i) => {
    const p = planetAt(planet, jdTT + (period * i) / points);
    return { x: p.x, y: p.y };
  });
}

/** Distance between two planets (AU) at a date. */
export function distanceBetween(a: PlanetName, b: PlanetName, jdTT: number): number {
  const p = heliocentricEcliptic(a, jdTT);
  const q = heliocentricEcliptic(b, jdTT);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** How long light takes to cross a distance in AU, in words: "8 minutes 19 seconds", "4 hours 10 minutes". */
export function lightTime(au: number): string {
  const seconds = (au * AU) / C;
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = Math.round(seconds / 60);
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds - 60 * m);
    return s === 60 ? `${m + 1} minutes` : `${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'}`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes - 60 * h;
  return `${h} hour${h === 1 ? '' : 's'}${m ? ` ${m} minute${m === 1 ? '' : 's'}` : ''}`;
}

/** The planets in order from the Sun, with their card data. */
export const PLANET_WORLDS: readonly (World & { id: PlanetName })[] = PLANETS.map((p) => worldById(p) as World & { id: PlanetName });

/**
 * The planets side by side at their true sizes, for the sizes view: each
 * planet's radius and centre (px) along a row, with the Sun's edge at `sunEdge`.
 * `sunRadius` is the Sun's radius in px; the planets keep the same scale.
 */
export function sizeRow(sunRadius: number, sunEdge: number, gap: number): { id: PlanetName; x: number; r: number }[] {
  const SUN_DIAMETER_KM = 1_392_700;
  let x = sunEdge + gap;
  return PLANET_WORLDS.map((w) => {
    const r = (sunRadius * w.diameterKm) / SUN_DIAMETER_KM;
    // Saturn's rings reach 2.27 times its radius.
    const reach = w.id === 'saturn' ? 2.27 * r : r;
    const centre = x + reach;
    x += 2 * reach + gap;
    return { id: w.id, x: centre, r };
  });
}
