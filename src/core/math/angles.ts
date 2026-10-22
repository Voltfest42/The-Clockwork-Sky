import { DEG, HOUR_ANGLE } from '../units';

/**
 * Angles. Everything here takes and returns radians, the SI unit, except the
 * sexagesimal helpers, which turn degrees–arcminutes–arcseconds and
 * hours–minutes–seconds into radians and back.
 */

export const TWO_PI = 2 * Math.PI;

/** Reduces an angle to [0, 2π). Radians in, radians out. */
export function normalizeRadians(angle: number): number {
  let r = angle % TWO_PI;
  if (r < 0) r += TWO_PI;
  // A tiny negative angle plus 2π can round up to exactly 2π; and + 0 turns −0 into 0.
  return r >= TWO_PI ? 0 : r + 0;
}

/** Reduces an angle to (−π, π]. Radians in, radians out. */
export function wrapPi(angle: number): number {
  const r = normalizeRadians(angle);
  return r > Math.PI ? r - TWO_PI : r;
}

/** Keeps x within [lo, hi]. Used to keep rounding errors out of asin and acos. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

// ---------- sexagesimal ----------

/**
 * An angle in radians from degrees, arcminutes and arcseconds, as astronomers write
 * them: dms(28, 1, 34.26) is +28° 01′ 34.26″. A minus sign on any part makes the
 * whole angle negative, so −0° 30′ can be written dms(-0, 30) or dms(0, -30).
 */
export function dms(degrees: number, arcminutes = 0, arcseconds = 0): number {
  return sexagesimal(degrees, arcminutes, arcseconds) * DEG;
}

/** An angle in radians from hours, minutes and seconds of right ascension or hour angle (1h = 15°). Signs as for dms. */
export function hms(hours: number, minutes = 0, seconds = 0): number {
  return sexagesimal(hours, minutes, seconds) * HOUR_ANGLE;
}

function sexagesimal(units: number, minutes: number, seconds: number): number {
  const negative = units < 0 || Object.is(units, -0) || minutes < 0 || seconds < 0;
  const value = Math.abs(units) + Math.abs(minutes) / 60 + Math.abs(seconds) / 3600;
  return negative ? -value : value;
}

/** A value split into whole units (degrees or hours), minutes and seconds. */
export interface Sexagesimal {
  negative: boolean;
  units: number;
  minutes: number;
  seconds: number;
}

/**
 * Splits a value in degrees or hours into whole units, minutes and seconds,
 * rounding the seconds to `decimals` places. Rounding carries over, so the
 * seconds never read 60 and the minutes never read 60.
 */
export function splitSexagesimal(value: number, decimals = 0): Sexagesimal {
  const scale = 10 ** decimals;
  const ticks = Math.round(Math.abs(value) * 3600 * scale);
  const units = Math.floor(ticks / (3600 * scale));
  const rest = ticks - units * 3600 * scale;
  const minutes = Math.floor(rest / (60 * scale));
  const seconds = (rest - minutes * 60 * scale) / scale;
  return { negative: value < 0 && ticks > 0, units, minutes, seconds };
}

/** Formats an angle (radians) as signed degrees, arcminutes and arcseconds: "+28° 01′ 34.26″". */
export function formatDms(angle: number, decimals = 0): string {
  const { negative, units, minutes, seconds } = splitSexagesimal(angle / DEG, decimals);
  return `${negative ? '−' : '+'}${units}° ${pad(minutes)}′ ${pad(seconds, decimals)}″`;
}

/** Formats an angle (radians) as hours, minutes and seconds in [0h, 24h): "7h 45m 18.95s". For right ascension. */
export function formatHms(angle: number, decimals = 0): string {
  const split = splitSexagesimal(normalizeRadians(angle) / HOUR_ANGLE, decimals);
  // 23h 59m 59.9996s rounds up to 24h 00m 00s, which is 0h.
  const hours = split.units === 24 ? 0 : split.units;
  return `${hours}h ${pad(split.minutes)}m ${pad(split.seconds, decimals)}s`;
}

function pad(value: number, decimals = 0): string {
  const text = value.toFixed(decimals);
  return value < 10 ? `0${text}` : text;
}

// ---------- the sphere ----------

/**
 * The angle between two directions, each given as a longitude and latitude
 * (or right ascension and declination). Radians in, radians out. Vincenty's
 * form of the formula, accurate for tiny and near-180° separations alike.
 */
export function angularSeparation(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLon = lon2 - lon1;
  const a = Math.cos(lat2) * Math.sin(dLon);
  const b = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const c = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(Math.hypot(a, b), c);
}
