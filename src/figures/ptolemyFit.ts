import { meanLongitude, siderealPeriodDays } from '../core/ephemeris/meanLongitude';
import { planetElements } from '../core/ephemeris/planets';
import { geocentricPlace } from '../core/ephemeris/wanderers';
import { normalizeRadians } from '../core/math/angles';
import { PTOLEMY_MARS, type PtolemyEpoch, type PtolemyParams } from '../core/orbits/ptolemy';
import { jdFromCalendar } from '../core/time/calendar';
import { ttFromUt } from '../core/time/deltaT';
import { DAYS_PER_JULIAN_YEAR, DEG } from '../core/units';

/**
 * The setting for Figure 5.3: Mars over the 15 years from 2020 to 2035, the
 * real longitudes to fit, and the model's starting points. Times are Julian
 * Dates (TT); angles radians.
 */

export const FIT_FROM_YEAR = 2020;
export const FIT_YEARS = 15;
/** Days between the points the model is scored on. */
export const FIT_STEP = 5;

const SIDEREAL_YEAR = 365.256_36;

export interface FitWindow {
  times: number[];
  /** Mars's real geocentric longitude at each time (J2000 ecliptic). */
  real: Float64Array;
  epoch: PtolemyEpoch;
}

/** The 15 years, the real longitudes and the epoch: the middle of the window, with Mars's and the Sun's mean longitudes then. */
export function fitWindow(): FitWindow {
  const t0 = ttFromUt(jdFromCalendar({ year: FIT_FROM_YEAR, month: 1, day: 1 }));
  const t1 = t0 + FIT_YEARS * DAYS_PER_JULIAN_YEAR;
  const times: number[] = [];
  for (let t = t0; t <= t1; t += FIT_STEP) times.push(t);
  const real = Float64Array.from(times, (t) => geocentricPlace('mars', t).lon);
  const mid = (t0 + t1) / 2;
  // Ptolemy's epicycle radius points the way the mean Sun does: Earth's mean longitude plus half a turn.
  const epoch = { jdTT: mid, meanLongitude: meanLongitude('mars', mid), anomaly: meanLongitude('earth', mid) + Math.PI - meanLongitude('mars', mid) };
  return { times, real, epoch };
}

/** A plain start: one circle and one epicycle, centred on Earth, with round-number speeds. */
export const PLAIN_START: PtolemyParams = { epicycle: 0.5, centre: 0, equant: 0, apogee: 0, deferentPeriod: 700, epicyclePeriod: 750 };

/**
 * Ptolemy's proportions for Mars (an epicycle of 39½ and an eccentricity of 6
 * on a deferent of 60, with the equant twice as far out), with the apogee
 * pointing the way Mars's real aphelion does now and the true periods. His
 * own apogee and mean motions were for AD 139 and his own frame of reference.
 */
export function ptolemysValues(jdTT: number): PtolemyParams {
  const { node, argPeri } = planetElements('mars', jdTT);
  const deferentPeriod = siderealPeriodDays('mars');
  return {
    ...PTOLEMY_MARS,
    apogee: normalizeRadians(node + argPeri + Math.PI),
    deferentPeriod,
    epicyclePeriod: 1 / (1 / SIDEREAL_YEAR - 1 / deferentPeriod),
  };
}

/** A parameter's value as the figure shows it: 0.66 of the deferent, 156°, 687 days. */
export function formatParam(key: keyof PtolemyParams, value: number): string {
  if (key === 'apogee') return `${Math.round(normalizeRadians(value) / DEG)}°`;
  if (key === 'deferentPeriod' || key === 'epicyclePeriod') return `${Math.round(value)} days`;
  return value.toFixed(2);
}
