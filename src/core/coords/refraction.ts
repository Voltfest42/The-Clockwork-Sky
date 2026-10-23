import { DEG } from '../units';

/**
 * Atmospheric refraction lifts everything near the horizon: the air bends
 * light downwards, so a star appears higher than it really is, by about half a
 * degree on the horizon (a Sun-width: you see the Sun after it has set).
 * Standard conditions (10 °C, 1010 hPa). Altitudes in radians.
 */

/** Below this true altitude the formulas break down; the lift is held at its value here. */
const LOWEST = -1.5 * DEG;

/**
 * Refraction for an apparent (observed) altitude, by Bennett's formula (1982;
 * Meeus 16.3): R = 1/tan(h + 7.31/(h + 4.4)) arcminutes, h in degrees. Good to
 * 0.07′ above the horizon. Radians in, radians out.
 */
export function refractionFromApparent(apparentAltitude: number): number {
  const h = Math.max(apparentAltitude, LOWEST) / DEG;
  return Math.max(0, 1 / Math.tan((h + 7.31 / (h + 4.4)) * DEG)) / 60 * DEG;
}

/**
 * Refraction for a true (geometric) altitude, by Sæmundsson's formula (1986;
 * Meeus 16.4): R = 1.02/tan(h + 10.3/(h + 5.11)) arcminutes, h in degrees. It
 * agrees with Bennett's to within 4″. Radians in, radians out.
 */
export function refractionFromTrue(trueAltitude: number): number {
  const h = Math.max(trueAltitude, LOWEST) / DEG;
  return Math.max(0, 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG)) / 60 * DEG;
}

/** Where something at a true altitude appears: radians. */
export function apparentAltitude(trueAltitude: number): number {
  return trueAltitude + refractionFromTrue(trueAltitude);
}
