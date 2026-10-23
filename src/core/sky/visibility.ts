import { clamp } from '../math/angles';
import { DEG } from '../units';

/**
 * What can be seen when: how the sky darkens as the Sun sinks, and which stars
 * rise, set, never set or never rise from a latitude. Angles in radians.
 */

export type DailyPath = 'circumpolar' | 'rises-and-sets' | 'never-rises';

/**
 * Whether a star of declination δ never sets, rises and sets, or never rises
 * as seen from latitude φ (ignoring refraction). From the north, a star never
 * sets if δ > 90° − φ, and never rises if δ < −(90° − φ); the south mirrors it.
 */
export function dailyPath(declination: number, latitude: number): DailyPath {
  // The highest and lowest altitudes reached in a day: at the upper and lower crossings of the meridian.
  const highest = Math.PI / 2 - Math.abs(latitude - declination);
  const lowest = Math.abs(latitude + declination) - Math.PI / 2;
  if (lowest > 0) return 'circumpolar';
  if (highest < 0) return 'never-rises';
  return 'rises-and-sets';
}

/** The highest altitude a star of declination δ reaches from latitude φ (when it crosses the meridian): radians. */
export function meridianAltitude(declination: number, latitude: number): number {
  return Math.PI / 2 - Math.abs(latitude - declination);
}

/**
 * The fraction of a day a star of declination δ spends above the horizon at
 * latitude φ (geometric, no refraction): 0 to 1.
 */
export function fractionAboveHorizon(declination: number, latitude: number): number {
  const cosH = -Math.tan(latitude) * Math.tan(declination);
  if (cosH <= -1) return 1;
  if (cosH >= 1) return 0;
  return Math.acos(cosH) / Math.PI;
}

/** Twilight stages, by the Sun's altitude. */
export type Daylight = 'day' | 'civil twilight' | 'nautical twilight' | 'astronomical twilight' | 'night';

/** Which part of the day it is, from the Sun's (true) altitude. Sunrise and sunset are at −0.833° (refraction and the Sun's radius). */
export function daylight(sunAltitude: number): Daylight {
  const h = sunAltitude / DEG;
  if (h > -0.833) return 'day';
  if (h > -6) return 'civil twilight';
  if (h > -12) return 'nautical twilight';
  if (h > -18) return 'astronomical twilight';
  return 'night';
}

/**
 * The faintest star the eye can see in a clean, dark-adapted sky, given the
 * Sun's altitude: magnitude 6.5 at night, falling through the three twilights
 * to about −4 in daylight (Venus at its brightest is just visible by day). A
 * smooth schematic, not a model of the atmosphere.
 */
export function limitingMagnitude(sunAltitude: number): number {
  const h = sunAltitude / DEG;
  const points: [number, number][] = [
    [-18, 6.5],
    [-12, 4.5],
    [-6, 1.5],
    [-0.833, -2.5],
    [5, -4],
  ];
  if (h <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [h1, m1] = points[i];
    const [h0, m0] = points[i - 1];
    if (h <= h1) return m0 + ((h - h0) / (h1 - h0)) * (m1 - m0);
  }
  return points[points.length - 1][1];
}

/** How light the sky is, 0 (night) to 1 (full day), from the Sun's altitude: for colouring the background. */
export function skyLightness(sunAltitude: number): number {
  return clamp((sunAltitude / DEG + 18) / 24, 0, 1) ** 2.2;
}
