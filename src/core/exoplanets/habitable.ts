/**
 * Habitable zones: the distances from a star where a planet like Earth could
 * keep liquid water on its surface, by Kopparapu et al. (2014, ApJL 787, L29,
 * Table 1; checked against the paper's source). The starlight a planet can
 * take, as a multiple of what Earth gets, is a polynomial in the star's
 * temperature, S_eff = S☉ + aT + bT² + cT³ + dT⁴ with T = T_eff − 5,780 K, valid
 * for 2,600–7,200 K; the distance is d = √(L / S_eff).
 *
 * Units: luminosity in L☉, temperature in kelvin, distances in AU, starlight
 * in units of what Earth receives from the Sun.
 */

export type ZoneEdge = 'recentVenus' | 'runawayGreenhouse' | 'maximumGreenhouse' | 'earlyMars';

/** [S☉, a, b, c, d] for an Earth-mass planet (Kopparapu et al. 2014, Table 1). */
const COEFFICIENTS: Record<ZoneEdge, readonly [number, number, number, number, number]> = {
  recentVenus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runawayGreenhouse: [1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15],
  maximumGreenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  earlyMars: [0.32, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
};

/** The temperature range the fits are made for, K. */
export const ZONE_TEMPERATURES = [2600, 7200] as const;

/** The starlight (Earth = 1) at one edge of the zone round a star of this temperature; outside 2,600–7,200 K the polynomial is held at its end. */
export function zoneFlux(edge: ZoneEdge, kelvin: number): number {
  const [s, a, b, c, d] = COEFFICIENTS[edge];
  const t = Math.min(ZONE_TEMPERATURES[1], Math.max(ZONE_TEMPERATURES[0], kelvin)) - 5780;
  return s + t * (a + t * (b + t * (c + t * d)));
}

/** The distance (AU) at which a planet gets starlight S (Earth = 1) from a star of luminosity L (L☉): √(L / S). */
export function distanceForFlux(luminosity: number, flux: number): number {
  return Math.sqrt(luminosity / flux);
}

/** The starlight (Earth = 1) at a distance (AU) from a star of luminosity L (L☉): L / d². */
export function fluxAt(luminosity: number, aAu: number): number {
  return luminosity / (aAu * aAu);
}

export interface HabitableZone {
  /** The conservative zone, AU: from the runaway greenhouse to the maximum greenhouse. */
  inner: number;
  outer: number;
  /** The optimistic zone, AU: from "recent Venus" to "early Mars", where those planets may once have had water. */
  optimisticInner: number;
  optimisticOuter: number;
}

/** The zone round a star of luminosity L (L☉) and temperature T (K). For the Sun: 0.95–1.68 AU, or 0.75–1.77. */
export function habitableZone(luminosity: number, kelvin: number): HabitableZone {
  const at = (edge: ZoneEdge) => distanceForFlux(luminosity, zoneFlux(edge, kelvin));
  return { inner: at('runawayGreenhouse'), outer: at('maximumGreenhouse'), optimisticInner: at('recentVenus'), optimisticOuter: at('earlyMars') };
}

/** Where a planet getting starlight S (Earth = 1) from a star of temperature T sits: inside, in the conservative or optimistic zone, or beyond. */
export function zoneOf(flux: number, kelvin: number): 'too-hot' | 'optimistic' | 'conservative' | 'too-cold' {
  if (flux > zoneFlux('recentVenus', kelvin)) return 'too-hot';
  if (flux > zoneFlux('runawayGreenhouse', kelvin)) return 'optimistic';
  if (flux >= zoneFlux('maximumGreenhouse', kelvin)) return 'conservative';
  if (flux >= zoneFlux('earlyMars', kelvin)) return 'optimistic';
  return 'too-cold';
}
