import { wrapPi } from '../math/angles';
import { moonPosition } from './moon';
import { sunPosition } from './sun';

/**
 * The Moon's phase in words. Its elongation (how far east of the Sun it is,
 * along the ecliptic) grows from 0 at new Moon to 180° at full Moon and back.
 */

/** The Moon's elongation east of the Sun in ecliptic longitude at a Julian Date (TT): radians, (−π, π]; positive while waxing. */
export function moonElongation(jdTT: number): number {
  return wrapPi(moonPosition(jdTT).lon - sunPosition(jdTT).lon);
}

/** "new", "waxing crescent", "first quarter", "waxing gibbous", "full", "waning gibbous", "last quarter" or "waning crescent". */
export function moonPhaseName(jdTT: number): string {
  const e = (moonElongation(jdTT) * 180) / Math.PI; // −180 to 180
  const a = Math.abs(e);
  if (a < 10) return 'new';
  if (a > 170) return 'full';
  const side = e > 0 ? 'waxing' : 'waning';
  if (a > 80 && a < 100) return e > 0 ? 'first quarter' : 'last quarter';
  return `${side} ${a < 90 ? 'crescent' : 'gibbous'}`;
}
