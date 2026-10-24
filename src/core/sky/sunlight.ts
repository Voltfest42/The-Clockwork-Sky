import { AU, L_SUN } from '../constants';
import { clamp } from '../math/angles';
import { DEG } from '../units';

/**
 * Sunlight through the year: how high the Sun climbs, how long it stays up,
 * where it rises and sets, and how much of its energy reaches each square
 * metre. These are the seasons' geometry, worked out from the Sun's
 * declination δ and distance r, for a latitude φ. Angles in radians.
 * Sunlight is at the top of the atmosphere: no clouds, air or oceans.
 */

/** Sunlight at 1 AU, W/m²: the "solar constant", from the Sun's nominal luminosity (IAU 2015 B3). About 1,361 W/m². */
export const SOLAR_CONSTANT = L_SUN / (4 * Math.PI * AU * AU);

/** Altitude of the Sun's centre at sunrise and sunset, allowing for refraction (34′) and the Sun's radius (16′): radians (Meeus ch. 15). */
export const SUNRISE_ALTITUDE = -0.8333 * DEG;

/** The Sun's declination from its ecliptic longitude λ and the obliquity ε (its latitude is under 1.2″). */
export function solarDeclination(longitude: number, obliquity: number): number {
  return Math.asin(Math.sin(obliquity) * Math.sin(longitude));
}

/** The Sun's altitude when it crosses the meridian at noon (its highest; negative in polar night). */
export function noonAltitude(declination: number, latitude: number): number {
  return Math.PI / 2 - Math.abs(latitude - declination);
}

/**
 * Half the length of the day as an hour angle H₀, from cos H₀ = (sin h₀ − sin φ sin δ)/(cos φ cos δ):
 * radians from 0 (the Sun never rises) to π (it never sets).
 */
export function halfDayAngle(declination: number, latitude: number, h0 = SUNRISE_ALTITUDE): number {
  const denominator = Math.cos(latitude) * Math.cos(declination);
  if (Math.abs(denominator) < 1e-12) return Math.sin(latitude) * Math.sin(declination) > Math.sin(h0) ? Math.PI : 0;
  const cosH = (Math.sin(h0) - Math.sin(latitude) * Math.sin(declination)) / denominator;
  return Math.acos(clamp(cosH, -1, 1));
}

/** How long the Sun is up, from sunrise to sunset: hours, 0 to 24. */
export function dayLength(declination: number, latitude: number, h0 = SUNRISE_ALTITUDE): number {
  return (halfDayAngle(declination, latitude, h0) / Math.PI) * 24;
}

/**
 * Where the Sun rises: azimuth from north through east, radians (it sets at
 * 2π minus this). Null when it doesn't rise or doesn't set that day.
 */
export function sunriseAzimuth(declination: number, latitude: number, h0 = SUNRISE_ALTITUDE): number | null {
  const H = halfDayAngle(declination, latitude, h0);
  if (H <= 0 || H >= Math.PI) return null;
  const cosA = (Math.sin(declination) - Math.sin(latitude) * Math.sin(h0)) / (Math.cos(latitude) * Math.cos(h0));
  return Math.acos(clamp(cosA, -1, 1));
}

/**
 * Sunlight per square metre of level ground at noon, at the top of the
 * atmosphere: W/m². It is the solar constant, scaled by the inverse square of
 * the distance r (AU), times the sine of the Sun's height: a low Sun spreads
 * the same beam over more ground.
 */
export function noonSunlight(declination: number, latitude: number, distance: number): number {
  return (SOLAR_CONSTANT / (distance * distance)) * Math.max(0, Math.sin(noonAltitude(declination, latitude)));
}

/**
 * Sunlight per square metre of level ground, averaged over a whole day, at
 * the top of the atmosphere: W/m². The standard daily-insolation formula,
 * Q = (S/π)(1/r²)(H₀ sin φ sin δ + cos φ cos δ sin H₀), with H₀ the
 * geometric half-day (no refraction).
 */
export function dailySunlight(declination: number, latitude: number, distance: number): number {
  const H = halfDayAngle(declination, latitude, 0);
  const q = H * Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.sin(H);
  return Math.max(0, (SOLAR_CONSTANT / Math.PI / (distance * distance)) * q);
}

/** The latitude of the polar circles for an obliquity: 90° − ε. Beyond it the Sun stays up for at least one whole day a year. */
export function polarCircle(obliquity: number): number {
  return Math.PI / 2 - obliquity;
}

/** What a day is like at a latitude: the Sun rises and sets, or it is polar day or polar night. */
export function kindOfDay(declination: number, latitude: number, h0 = SUNRISE_ALTITUDE): 'rises-and-sets' | 'polar-day' | 'polar-night' {
  const H = halfDayAngle(declination, latitude, h0);
  if (H >= Math.PI) return 'polar-day';
  if (H <= 0) return 'polar-night';
  return 'rises-and-sets';
}
