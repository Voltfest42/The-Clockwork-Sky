import { polynomial as poly } from '../math/poly';
import { SECONDS_PER_DAY } from '../units';
import { julianEpoch } from './julian';

/**
 * ΔT = TT − UT: how far the clock of Earth's spin (Universal Time) lags behind
 * the uniform clock of the ephemerides (Terrestrial Time). Tides slow Earth's
 * spin, so ΔT grows over the centuries, irregularly: about 69 s in 2026, and
 * hours in antiquity, where it is known only from ancient eclipse records and is
 * uncertain by several minutes or more.
 *
 * Sources:
 * - Before 2005 and after 2050: the polynomials of Espenak & Meeus (2006), Five
 *   Millennium Canon of Solar Eclipses (NASA/TP-2006-214141), fitted to the
 *   historical values of Morrison & Stephenson (2004). We leave out their small
 *   correction for the Moon's secular acceleration (under a second before 1600
 *   AD and well inside ΔT's uncertainty).
 * - 2005–2026: measured values on 1 January of each year, from the IERS and USNO
 *   (TT − UTC minus UT1 − UTC), rounded to 0.01 s.
 * - 2026–2050: a prediction. A smooth curve (cubic Hermite) from the last measured
 *   value to Espenak & Meeus's value in 2050. Nobody can predict ΔT for decades;
 *   the error may reach tens of seconds by 2050.
 */

/** ΔT in seconds at a Julian Date. Pass UT or TT: ΔT changes far too slowly for the difference to matter. */
export function deltaT(jd: number): number {
  return deltaTForYear(julianEpoch(jd));
}

/** Measured ΔT (s) on 1 January of 2005, 2006, … 2026. */
const MEASURED_FROM = 2005;
const MEASURED = [
  64.69, 64.85, 65.15, 65.46, 65.78, 66.07, 66.32, 66.6, 66.91, 67.28, 67.64, 68.1, 68.59, 68.97, 69.22, 69.36, 69.36, 69.29, 69.2,
  69.18, 69.14, 69.11,
];
const MEASURED_UNTIL = MEASURED_FROM + MEASURED.length - 1;

/** The year Espenak & Meeus's long-term polynomials take over again. */
const PREDICTION_UNTIL = 2050;

/**
 * ΔT in seconds for a decimal year in astronomical numbering (1 BC = 0;
 * 2026.5 is mid-2026). Valid for any year; outside about 500 BC to AD 2050 it
 * is an extrapolation along the long-term tidal parabola.
 */
export function deltaTForYear(y: number): number {
  if (y >= MEASURED_FROM && y <= MEASURED_UNTIL) return measured(y);
  if (y > MEASURED_UNTIL && y < PREDICTION_UNTIL) return predicted(y);
  return espenakMeeus(y);
}

function measured(y: number): number {
  const i = Math.min(Math.floor(y - MEASURED_FROM), MEASURED.length - 2);
  const f = y - MEASURED_FROM - i;
  return MEASURED[i] + f * (MEASURED[i + 1] - MEASURED[i]);
}

/** Cubic Hermite from the last measurement (value and trend) to Espenak & Meeus at 2050 (value and slope). */
function predicted(y: number): number {
  const span = PREDICTION_UNTIL - MEASURED_UNTIL;
  const p0 = MEASURED[MEASURED.length - 1];
  const m0 = (p0 - MEASURED[MEASURED.length - 2]) * span;
  const p1 = espenakMeeus(PREDICTION_UNTIL);
  // The slope of Espenak & Meeus's 2050–2150 formula at 2050, in seconds per year.
  const m1 = (0.0064 * (PREDICTION_UNTIL - 1820) + 0.5628) * span;
  const t = (y - MEASURED_UNTIL) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

/** The long-term parabola: tidal braking of about 32 s per century². */
function parabola(y: number): number {
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** Espenak & Meeus (2006), Table 2 of the canon. Seconds, for a decimal year y. */
export function espenakMeeus(y: number): number {
  if (y < -500) return parabola(y);
  if (y < 500) {
    const u = y / 100;
    return poly(u, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521]);
  }
  if (y < 1600) {
    const u = (y - 1000) / 100;
    return poly(u, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073]);
  }
  if (y < 1700) {
    const t = y - 1600;
    return poly(t, [120, -0.9808, -0.01532, 1 / 7129]);
  }
  if (y < 1800) {
    const t = y - 1700;
    return poly(t, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1_174_000]);
  }
  if (y < 1860) {
    const t = y - 1800;
    return poly(t, [13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436, 0.0000121272, -0.0000001699, 0.000000000875]);
  }
  if (y < 1900) {
    const t = y - 1860;
    return poly(t, [7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1 / 233_174]);
  }
  if (y < 1920) {
    const t = y - 1900;
    return poly(t, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197]);
  }
  if (y < 1941) {
    const t = y - 1920;
    return poly(t, [21.2, 0.84493, -0.0761, 0.0020936]);
  }
  if (y < 1961) {
    const t = y - 1950;
    return poly(t, [29.07, 0.407, -1 / 233, 1 / 2547]);
  }
  if (y < 1986) {
    const t = y - 1975;
    return poly(t, [45.45, 1.067, -1 / 260, -1 / 718]);
  }
  if (y < 2005) {
    const t = y - 2000;
    return poly(t, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599]);
  }
  if (y < 2050) {
    const t = y - 2000;
    return poly(t, [62.92, 0.32217, 0.005589]);
  }
  if (y < 2150) return parabola(y) - 0.5628 * (2150 - y);
  return parabola(y);
}

/** A Julian Date in TT from one in UT: adds ΔT. Days in, days out. */
export function ttFromUt(jdUT: number): number {
  return jdUT + deltaT(jdUT) / SECONDS_PER_DAY;
}

/** A Julian Date in UT from one in TT: subtracts ΔT. Days in, days out. */
export function utFromTt(jdTT: number): number {
  // ΔT is taken at the UT moment, which we don't know yet: one refinement makes
  // ttFromUt(utFromTt(t)) equal t to far better than a millisecond.
  const first = jdTT - deltaT(jdTT) / SECONDS_PER_DAY;
  return jdTT - deltaT(first) / SECONDS_PER_DAY;
}
