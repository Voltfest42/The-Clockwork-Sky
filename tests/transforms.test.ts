import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  eclipticFromEquatorial,
  equatorialFromEcliptic,
  equatorialFromHorizontal,
  horizontalFromEquatorial,
  hourAngle,
  meanObliquity,
} from '../src/core/coords/transforms';
import { dms, hms, TWO_PI } from '../src/core/math/angles';
import { fromSpherical, rotateX, toSpherical } from '../src/core/math/vec3';
import { dayFraction, jdFromCalendar } from '../src/core/time/calendar';
import { J2000 } from '../src/core/time/julian';
import { greenwichApparentSiderealTime } from '../src/core/time/sidereal';
import { ARCSEC, DEG } from '../src/core/units';
import { expectAngle } from './helpers';

const HALF_PI = Math.PI / 2;
const longitude = fc.double({ min: 0, max: TWO_PI, noNaN: true });
const latitude = fc.double({ min: -HALF_PI, max: HALF_PI, noNaN: true });
const obliquity = fc.double({ min: 0, max: 1.5, noNaN: true });

describe('the obliquity of the ecliptic (Meeus ch. 22)', () => {
  it('is 23°26′21.448″ at J2000', () => {
    expectAngle(meanObliquity(J2000), dms(23, 26, 21.448), 1e-6);
  });

  it('matches Example 22.a: 23°26′27.407″ on 1987 April 10', () => {
    expectAngle(meanObliquity(2_446_895.5), dms(23, 26, 27.407), 0.001);
  });

  it('shrinks by about 47″ a century now, and stays near 22°–24.5° for 10,000 years', () => {
    const perCentury = (meanObliquity(J2000 + 36_525) - meanObliquity(J2000)) / ARCSEC;
    expect(perCentury).toBeCloseTo(-46.8, 0);
    for (let years = -10_000; years <= 10_000; years += 500) {
      const e = meanObliquity(J2000 + years * 365.25) / DEG;
      expect(e).toBeGreaterThan(22);
      expect(e).toBeLessThan(24.6);
    }
  });
});

describe('equatorial ↔ ecliptic (Meeus ch. 13)', () => {
  it('matches Example 13.a: Pollux', () => {
    const ecl = eclipticFromEquatorial({ ra: hms(7, 45, 18.946), dec: dms(28, 1, 34.26) }, 23.439_291_1 * DEG);
    expectAngle(ecl.lon, 113.215_63 * DEG, 0.01, 'longitude');
    expectAngle(ecl.lat, 6.684_17 * DEG, 0.01, 'latitude');
  });

  it('puts the equinox, the June solstice and the ecliptic pole where they belong', () => {
    const e = meanObliquity(J2000);
    const equinox = equatorialFromEcliptic({ lon: 0, lat: 0 }, e);
    expect([equinox.ra, equinox.dec]).toEqual([0, 0]);
    const solstice = equatorialFromEcliptic({ lon: HALF_PI, lat: 0 }, e);
    expectAngle(solstice.ra, hms(6), 1e-6);
    expectAngle(solstice.dec, e, 1e-6);
    const pole = equatorialFromEcliptic({ lon: 0, lat: HALF_PI }, e);
    expectAngle(pole.ra, hms(18), 1e-6);
    expectAngle(pole.dec, HALF_PI - e, 1e-6);
  });

  it('round-trips, and agrees with rotating unit vectors about the equinox line', () => {
    fc.assert(
      fc.property(longitude, latitude, obliquity, (ra, dec, e) => {
        const ecl = eclipticFromEquatorial({ ra, dec }, e);
        const rotated = toSpherical(rotateX(fromSpherical(ra, dec), -e));
        expectAngle(ecl.lat, rotated.lat, 1e-6);
        if (Math.cos(ecl.lat) > 1e-9) expectAngle(ecl.lon, rotated.lon, 1e-6 / Math.cos(ecl.lat));
        const back = equatorialFromEcliptic(ecl, e);
        expectAngle(back.dec, dec, 1e-6);
        if (Math.cos(dec) > 1e-9) expectAngle(back.ra, ra, 1e-6 / Math.cos(dec));
      }),
    );
  });
});

describe('equatorial ↔ horizontal (Meeus ch. 13)', () => {
  it('matches Example 13.b: Venus from Washington, 1987 April 10, 19:21 UT', () => {
    const jd = jdFromCalendar({ year: 1987, month: 4, day: 10 + dayFraction(19, 21) });
    const gast = greenwichApparentSiderealTime(jd, -3.868 * ARCSEC, dms(23, 26, 36.87));
    expectAngle(gast, hms(8, 34, 56.853), 0.002, 'apparent sidereal time');
    // Meeus's hour angle for Venus, H = 64.352133°, at declination −6°43′11.61″, seen from latitude +38°55′17″.
    const sky = horizontalFromEquatorial({ ra: 0, dec: dms(-6, 43, 11.61) }, 64.352_133 * DEG, dms(38, 55, 17));
    // He gives A = 68.0337° from the south; from the north that is 248.0337°.
    expectAngle(sky.az, 248.0337 * DEG, 0.2, 'azimuth');
    expectAngle(sky.alt, 15.1249 * DEG, 0.2, 'altitude');
  });

  it('measures hour angles westward from the meridian, in (−180°, 180°]', () => {
    expectAngle(hourAngle(hms(2), hms(23)), hms(3), 1e-9);
    expectAngle(hourAngle(hms(23), hms(2)), hms(-3), 1e-9);
    fc.assert(
      fc.property(longitude, longitude, (lst, ra) => {
        const h = hourAngle(lst, ra);
        expect(h).toBeGreaterThan(-Math.PI);
        expect(h).toBeLessThanOrEqual(Math.PI);
        expectAngle(h, lst - ra, 1e-6);
      }),
    );
  });

  it('round-trips for any star, observer and time', () => {
    fc.assert(
      fc.property(longitude, latitude, longitude, latitude, (ra, dec, lst, lat) => {
        const sky = horizontalFromEquatorial({ ra, dec }, lst, lat);
        const back = equatorialFromHorizontal(sky, lst, lat);
        expectAngle(back.dec, dec, 1e-6);
        if (Math.cos(dec) > 1e-9) expectAngle(back.ra, ra, 1e-6 / Math.cos(dec));
      }),
    );
  });

  it('raises the celestial pole to the observer’s latitude, due north', () => {
    fc.assert(
      fc.property(longitude, fc.double({ min: -1.5, max: 1.5, noNaN: true }), (lst, lat) => {
        const pole = horizontalFromEquatorial({ ra: 1, dec: HALF_PI }, lst, lat);
        expectAngle(pole.alt, lat, 1e-6);
        expectAngle(pole.az, 0, 1e-3);
      }),
    );
  });

  it('culminates at 90° − |latitude − declination| on the meridian', () => {
    fc.assert(
      fc.property(longitude, latitude, latitude, (ra, dec, lat) => {
        const sky = horizontalFromEquatorial({ ra, dec }, ra, lat);
        expectAngle(sky.alt, HALF_PI - Math.abs(lat - dec), 1e-6);
      }),
    );
  });

  it('never sets a star closer to the pole than the colatitude, and never rises one as close to the other pole', () => {
    // From latitude φ north, a star of declination δ is circumpolar if δ > 90° − φ, and never rises if δ < −(90° − φ).
    const margin = 1e-6;
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 1.56, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), longitude, (lat, f, lst) => {
        const colatitude = HALF_PI - lat;
        const near = colatitude + margin + f * (lat - 2 * margin);
        expect(horizontalFromEquatorial({ ra: 0, dec: near }, lst, lat).alt).toBeGreaterThan(0);
        expect(horizontalFromEquatorial({ ra: 0, dec: -near }, lst, lat).alt).toBeLessThan(0);
      }),
    );
  });
});
