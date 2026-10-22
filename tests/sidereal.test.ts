import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dms, hms } from '../src/core/math/angles';
import { dayFraction, jdFromCalendar } from '../src/core/time/calendar';
import {
  greenwichApparentSiderealTime,
  greenwichMeanSiderealTime,
  localSiderealTime,
  SIDEREAL_DAY,
} from '../src/core/time/sidereal';
import { ARCSEC, DEG } from '../src/core/units';
import { expectAngle } from './helpers';

/** 0.0001 s of time, in arcseconds: the precision Meeus quotes. */
const TENTH_MS = 0.0015;

describe('sidereal time (Meeus ch. 12)', () => {
  it('matches Example 12.a: 1987 April 10, 0h UT', () => {
    const jd = jdFromCalendar({ year: 1987, month: 4, day: 10 });
    expect(jd).toBe(2_446_895.5);
    expectAngle(greenwichMeanSiderealTime(jd), hms(13, 10, 46.3668), TENTH_MS, 'mean sidereal time');
    // With nutation Δψ = −3.788″ and ε = 23°26′36.85″, apparent sidereal time is 13h10m46.1351s.
    const apparent = greenwichApparentSiderealTime(jd, -3.788 * ARCSEC, dms(23, 26, 36.85));
    expectAngle(apparent, hms(13, 10, 46.1351), TENTH_MS, 'apparent sidereal time');
  });

  it('matches Example 12.b: 1987 April 10, 19:21:00 UT', () => {
    const jd = jdFromCalendar({ year: 1987, month: 4, day: 10 + dayFraction(19, 21) });
    expect(jd).toBeCloseTo(2_446_896.306_25, 9);
    expectAngle(greenwichMeanSiderealTime(jd), 128.737_873_4 * DEG, 0.002, 'mean sidereal time');
  });

  it('turns once a sidereal day of 23 h 56 min 4.09 s', () => {
    expect(SIDEREAL_DAY).toBeCloseTo(86_164.0905, 4);
    fc.assert(
      fc.property(fc.double({ min: 625_000, max: 2_817_000, noNaN: true }), (jd) => {
        expectAngle(greenwichMeanSiderealTime(jd + SIDEREAL_DAY / 86_400), greenwichMeanSiderealTime(jd), 0.01);
      }),
    );
  });

  it('adds the longitude, east positive, for local sidereal time', () => {
    fc.assert(
      fc.property(fc.double({ min: 2_400_000, max: 2_500_000, noNaN: true }), fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), (jd, lon) => {
        expectAngle(localSiderealTime(jd, lon), greenwichMeanSiderealTime(jd) + lon, 1e-6);
      }),
    );
    // Four minutes of time per degree of longitude.
    const jd = 2_460_000.5;
    expectAngle(localSiderealTime(jd, 1 * DEG) - localSiderealTime(jd, 0), hms(0, 4), 1e-6);
  });
});
