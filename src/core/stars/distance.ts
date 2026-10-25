import { LIGHT_YEAR, PARSEC } from '../units';

/**
 * Distances to the stars and how bright they look from them.
 *
 * - Parallax: a star whose direction shifts by p arcseconds either side of its
 *   average as Earth goes round the Sun (a baseline of 1 AU) is 1/p parsecs
 *   away. A parsec is 3.26 light-years.
 * - Brightness falls with the square of the distance. In magnitudes (5 of them
 *   a factor of 100), a star of absolute magnitude M seen from d parsecs has
 *   apparent magnitude m = M + 5 log₁₀(d / 10 pc): the absolute magnitude is how
 *   bright it would look from 10 parsecs.
 */

/** The Sun's absolute visual magnitude (Willmer 2018 gives +4.81; +4.83 is the classic value used here and in the brief). */
export const SUN_ABSOLUTE_MAGNITUDE = 4.83;

/** The faintest stars an eye sees in a dark sky, roughly. */
export const NAKED_EYE_LIMIT = 6;

/** Distance in parsecs for a parallax in arcseconds. */
export function parsecsFromParallax(arcseconds: number): number {
  if (!(arcseconds > 0)) throw new RangeError('A parallax must be positive');
  return 1 / arcseconds;
}

/** Parallax in arcseconds for a distance in parsecs. */
export function parallaxFromParsecs(parsecs: number): number {
  if (!(parsecs > 0)) throw new RangeError('A distance must be positive');
  return 1 / parsecs;
}

/** Parsecs to light-years. */
export function lightYearsFromParsecs(parsecs: number): number {
  return (parsecs * PARSEC) / LIGHT_YEAR;
}

/** Light-years to parsecs. */
export function parsecsFromLightYears(lightYears: number): number {
  return (lightYears * LIGHT_YEAR) / PARSEC;
}

/** The apparent magnitude of a star of absolute magnitude M seen from `parsecs` away. */
export function apparentMagnitude(absolute: number, parsecs: number): number {
  return absolute + 5 * Math.log10(parsecs / 10);
}

/** The absolute magnitude of a star of apparent magnitude m at `parsecs`. */
export function absoluteMagnitude(apparent: number, parsecs: number): number {
  return apparent - 5 * Math.log10(parsecs / 10);
}

/** How far (parsecs) a star of absolute magnitude M must be to look as bright as apparent magnitude m. */
export function distanceForMagnitude(absolute: number, apparent: number): number {
  return 10 ** ((apparent - absolute + 5) / 5);
}
