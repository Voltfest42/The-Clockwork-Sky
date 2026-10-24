import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sunGeocentric } from '../src/core/ephemeris/bodies';
import { apparentSunLongitude, apsis, earthSunDistance, SEASON_POINTS, seasonTime } from '../src/core/ephemeris/seasons';
import { fromSpherical } from '../src/core/math/vec3';
import { constellationAt, parseConstellations, type RawConstellationFile } from '../src/core/sky/charts';
import { altAz, riseTransitSet } from '../src/core/sky/riseSet';
import { dailySunlight, dayLength, kindOfDay, noonAltitude, noonSunlight, polarCircle, SOLAR_CONSTANT, solarDeclination, sunriseAzimuth } from '../src/core/sky/sunlight';
import { jdFromCalendar } from '../src/core/time/calendar';
import { CALENDAR_YEAR, equinoxDate, equinoxDrift, yearsPerDayOfDrift } from '../src/core/time/calendarDrift';
import { ttFromUt, utFromTt } from '../src/core/time/deltaT';
import { DEG } from '../src/core/units';
import { nextPhase } from '../src/core/ephemeris/lunation';
import rawConstellations from '../src/data/constellations.json';
import { expectNear } from './helpers';

const MINUTE = 1 / 1440;
const ut = (year: number, month: number, day: number, h: number, m: number) => jdFromCalendar({ year, month, day: day + (h + m / 60) / 24 });
const constellations = parseConstellations(rawConstellations as unknown as RawConstellationFile);

describe('equinoxes and solstices', () => {
  it('match the published times for 2026 to within 15 minutes', () => {
    // USNO: 20 Mar 14:46, 21 Jun 08:24, 23 Sep 00:05, 21 Dec 20:50 UT.
    const published = [ut(2026, 3, 20, 14, 46), ut(2026, 6, 21, 8, 24), ut(2026, 9, 23, 0, 5), ut(2026, 12, 21, 20, 50)];
    SEASON_POINTS.forEach((point, i) => expectNear(utFromTt(seasonTime(2026, point)), published[i], 15 * MINUTE, point));
  });

  it('matches Meeus Example 27.a: the June solstice of 1962', () => {
    expectNear(seasonTime(1962, 'june-solstice'), 2_437_837.392_45, 15 * MINUTE, 'JDE');
  });

  it('puts the Sun at 0°, 90°, 180° and 270° of apparent longitude', () => {
    for (const year of [-1000, 0, 1582, 2026, 2900]) {
      SEASON_POINTS.forEach((point, i) => {
        const lon = apparentSunLongitude(seasonTime(year, point)) / DEG;
        expectNear(((lon - i * 90 + 540) % 360) - 180, 0, 1e-6, `${point} ${year}`);
      });
    }
  });
});

describe('perihelion and aphelion', () => {
  it('fall on the published dates for Earth’s centre (to 3 hours)', () => {
    // USNO / timeanddate: perihelion 3 Jan 2024 00:39, 4 Jan 2025 13:28, 3 Jan 2026 17:15; aphelion 5 Jul 2024 05:06, 3 Jul 2025 19:55, 6 Jul 2026 17:31 UT.
    const cases: [number, 'perihelion' | 'aphelion', number][] = [
      [2024, 'perihelion', ut(2024, 1, 3, 0, 39)],
      [2025, 'perihelion', ut(2025, 1, 4, 13, 28)],
      [2026, 'perihelion', ut(2026, 1, 3, 17, 15)],
      [2024, 'aphelion', ut(2024, 7, 5, 5, 6)],
      [2025, 'aphelion', ut(2025, 7, 3, 19, 55)],
      [2026, 'aphelion', ut(2026, 7, 6, 17, 31)],
    ];
    for (const [year, which, published] of cases) expectNear(utFromTt(apsis(year, which).jdTT), published, 3 / 24, `${which} ${year}`);
  });

  it('gives about 7% more sunlight at perihelion than at aphelion', () => {
    const near = apsis(2026, 'perihelion').distance;
    const far = apsis(2026, 'aphelion').distance;
    expectNear(near, 0.98330, 0.0001, 'perihelion distance');
    expectNear(far, 1.01670, 0.0001, 'aphelion distance');
    expectNear((far / near) ** 2, 1.069, 0.002, 'ratio');
    expect(earthSunDistance(apsis(2026, 'perihelion').jdTT + 10)).toBeGreaterThan(near);
  });
});

describe('sunlight through the year', () => {
  it('uses a solar constant of about 1,361 W/m²', () => {
    expectNear(SOLAR_CONSTANT, 1361, 1, 'S');
  });

  it('gives the noon height of the Sun: 90° − |φ − δ|', () => {
    expectNear(noonAltitude(23.44 * DEG, 23.44 * DEG) / DEG, 90, 1e-12);
    expectNear(noonAltitude(0, 51.5 * DEG) / DEG, 38.5, 1e-12);
    expectNear(noonAltitude(-23.44 * DEG, 51.5 * DEG) / DEG, 15.06, 1e-12);
    expect(noonAltitude(-23.44 * DEG, 80 * DEG)).toBeLessThan(0);
  });

  it('gives day lengths that add up across the hemispheres', () => {
    // Without refraction, a day at φ and the same day at −φ add up to 24 hours.
    fc.assert(
      fc.property(fc.double({ min: -0.41, max: 0.41, noNaN: true }), fc.double({ min: -1.5, max: 1.5, noNaN: true }), (dec, lat) => {
        expectNear(dayLength(dec, lat, 0) + dayLength(dec, -lat, 0), 24, 1e-9, 'sum');
      }),
    );
    // On the equator the day is 12 hours and about 7 minutes, all year, thanks to refraction and the Sun's width.
    expectNear(dayLength(0, 0) * 60, 12 * 60 + 6.6, 0.5, 'equator');
    expect(kindOfDay(20 * DEG, 70 * DEG)).toBe('polar-day');
    expect(kindOfDay(-22 * DEG, 70 * DEG)).toBe('polar-night');
    // Refraction lifts the Sun: at 70° N it still peeps up at noon when δ = −20°, though geometry alone says it stays on the horizon.
    expect(kindOfDay(-20 * DEG, 70 * DEG)).toBe('rises-and-sets');
    expectNear(polarCircle(23.4393 * DEG) / DEG, 66.5607, 1e-9, 'Arctic Circle');
  });

  it('matches the textbook daily sunlight at the pole and the equator', () => {
    // North Pole at the June solstice: S/r² sin δ ≈ 525 W/m². Equator at an equinox: S/(π r²) ≈ 435 W/m².
    expectNear(dailySunlight(23.44 * DEG, 90 * DEG - 1e-9, 1.0163), 525, 3, 'pole in June');
    expectNear(dailySunlight(0, 0, 0.996), 437, 3, 'equator in March');
    expect(dailySunlight(-23.44 * DEG, 80 * DEG, 0.9833)).toBe(0);
    expectNear(noonSunlight(0, 0, 1), SOLAR_CONSTANT, 1e-9, 'overhead');
    // At 51.5° N the noon Sun gives over three times as much per square metre in June as in December.
    expect(noonSunlight(23.44 * DEG, 51.5 * DEG, 1.0163) / noonSunlight(-23.44 * DEG, 51.5 * DEG, 0.9837)).toBeGreaterThan(3);
  });

  it('puts sunrise due east at the equinoxes and north of east in June', () => {
    expectNear(sunriseAzimuth(0, 51.5 * DEG, 0)! / DEG, 90, 1e-9, 'equinox');
    expect(sunriseAzimuth(23.44 * DEG, 51.5 * DEG)! / DEG).toBeLessThan(52);
    expect(sunriseAzimuth(23.44 * DEG, 51.5 * DEG)! / DEG).toBeGreaterThan(48);
    expect(sunriseAzimuth(23.44 * DEG, 70 * DEG)).toBeNull();
    expectNear(solarDeclination(90 * DEG, 23.44 * DEG) / DEG, 23.44, 1e-12);
  });
});

describe('rising and setting', () => {
  const london = { latitude: 51.5074 * DEG, longitude: -0.1278 * DEG };

  it('gives London’s sunrise and sunset at the solstices to within 3 minutes', () => {
    // Timeanddate: 21 Jun 2026 sunrise 04:43 BST, sunset 21:21 BST; 21 Dec 2026 sunrise 08:04, sunset 15:53 GMT.
    const june = riseTransitSet('sun', ttFromUt(ut(2026, 6, 21, 0, 0)), london);
    expectNear(utFromTt(june.rise!), ut(2026, 6, 21, 3, 43), 3 * MINUTE, 'June sunrise');
    expectNear(utFromTt(june.set!), ut(2026, 6, 21, 20, 21), 3 * MINUTE, 'June sunset');
    expectNear(june.transitAltitude / DEG, 90 - 51.5074 + 23.43, 0.05, 'noon height');
    const december = riseTransitSet('sun', ttFromUt(ut(2026, 12, 21, 0, 0)), london);
    expectNear(utFromTt(december.rise!), ut(2026, 12, 21, 8, 4), 3 * MINUTE, 'December sunrise');
    expectNear(utFromTt(december.set!), ut(2026, 12, 21, 15, 53), 3 * MINUTE, 'December sunset');
  });

  it('keeps the Sun up all day in Tromsø in June and down in December', () => {
    const tromso = { latitude: 69.65 * DEG, longitude: 18.96 * DEG };
    expect(riseTransitSet('sun', ttFromUt(ut(2026, 6, 21, 0, 0)), tromso).always).toBe('up');
    expect(riseTransitSet('sun', ttFromUt(ut(2026, 12, 21, 0, 0)), tromso).always).toBe('down');
  });

  it('raises the full Moon near sunset', () => {
    const equator = { latitude: 0, longitude: 0 };
    for (const start of [ut(2026, 1, 1, 0, 0), ut(2026, 5, 1, 0, 0), ut(2026, 9, 1, 0, 0)]) {
      const full = nextPhase(ttFromUt(start), 'full').jdTT;
      const day = full - 0.5;
      const moon = riseTransitSet('moon', day, equator);
      const sun = riseTransitSet('sun', day, equator);
      // The Moon moves 12° a day against the Sun, so within half a day of full it rises within about 50 minutes of sunset.
      expect(Math.abs(moon.rise! - sun.set!) / MINUTE).toBeLessThan(60);
    }
  });

  it('finds the Sun overhead at noon on the equator at an equinox', () => {
    const noon = riseTransitSet('sun', seasonTime(2026, 'march-equinox') - 0.5, { latitude: 0, longitude: 0 });
    expect(noon.transitAltitude / DEG).toBeGreaterThan(89.5);
    expect(altAz('sun', noon.transit, { latitude: 0, longitude: 0 }).alt / DEG).toBeGreaterThan(89.5);
  });
});

describe('the zodiac, by the IAU boundaries', () => {
  const named = (ra: number, dec: number) => constellationAt(constellations, fromSpherical(ra * DEG, dec * DEG))?.name;

  it('knows which constellation a star is in', () => {
    expect(named(37.95, 89.26)).toBe('Ursa Minor'); // Polaris
    expect(named(0, 90)).toBe('Ursa Minor');
    expect(named(0, -90)).toBe('Octans');
    expect(named(279.23, 38.78)).toBe('Lyra'); // Vega
    expect(named(101.29, -16.72)).toBe('Canis Major'); // Sirius
    expect(named(88.79, 7.41)).toBe('Orion'); // Betelgeuse
    expect(named(186.65, -63.1)).toBe('Crux'); // Acrux
  });

  it('puts every direction in exactly one constellation', () => {
    const unit = fc.tuple(fc.double({ min: 0, max: 360, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }));
    fc.assert(
      fc.property(unit, ([ra, z]) => {
        const v = fromSpherical(ra * DEG, Math.asin(z));
        const containing = constellations.filter((c) => constellationAt([c], v));
        expect(containing.length, `RA ${ra}, z ${z}: ${containing.map((c) => c.name).join(', ')}`).toBe(1);
      }),
      { numRuns: 600 },
    );
  });

  it('takes the Sun through 13 constellations, Ophiuchus included, on the usual dates', () => {
    const entries: { name: string; month: number; day: number }[] = [];
    let last = '';
    for (let d = 0; d < 366; d++) {
      const jd = ttFromUt(ut(2026, 1, 1, 12, 0)) + d;
      const name = constellationAt(constellations, sunGeocentric(jd))!.name;
      if (name !== last) {
        const date = new Date(Date.UTC(2026, 0, 1 + d));
        entries.push({ name, month: date.getUTCMonth() + 1, day: date.getUTCDate() });
        last = name;
      }
    }
    expect(entries.map((e) => e.name)).toEqual([
      'Sagittarius', 'Capricornus', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Ophiuchus', 'Sagittarius',
    ]);
    // The usual table of entry dates (they shift by a day from year to year).
    const expected: Record<string, [number, number]> = {
      Capricornus: [1, 20], Aquarius: [2, 16], Pisces: [3, 11], Aries: [4, 18], Taurus: [5, 13], Gemini: [6, 21], Cancer: [7, 20],
      Leo: [8, 10], Virgo: [9, 16], Libra: [10, 30], Scorpius: [11, 23], Ophiuchus: [11, 29], Sagittarius: [12, 17],
    };
    for (const e of entries.slice(1)) {
      const [month, day] = expected[e.name];
      const off = (Date.UTC(2026, e.month - 1, e.day) - Date.UTC(2026, month - 1, day)) / 86_400_000;
      expect(Math.abs(off), `${e.name} entered on ${e.day}/${e.month}`).toBeLessThanOrEqual(2);
    }
  });
});

describe('calendar drift', () => {
  it('drifts a day in 128 years with Julian rules, about 3,200 with Gregorian, and 4 without leap years', () => {
    expectNear(yearsPerDayOfDrift('julian'), 128, 1, 'Julian');
    expectNear(yearsPerDayOfDrift('gregorian'), 3226, 30, 'Gregorian');
    expectNear(yearsPerDayOfDrift('no-leap'), 4.13, 0.01, 'no leap years');
    expect(CALENDAR_YEAR.gregorian).toBe(365.2425);
  });

  it('puts the March equinox on 21 March at Nicaea (AD 325) and on 11 March in 1582, in the Julian calendar', () => {
    expect([20, 21]).toContain(equinoxDate(325, 'julian').day);
    expect(equinoxDate(325, 'julian').month).toBe(3);
    expect([10, 11]).toContain(equinoxDate(1582, 'julian').day);
    // The Gregorian reform's ten dropped days put it back on 20 or 21 March.
    expect([20, 21]).toContain(equinoxDate(1583, 'gregorian').day);
    expect([19, 20, 21]).toContain(equinoxDate(2026, 'gregorian').day);
  });

  it('slips about 15 days in Julian years and over a year without leap years, from 45 BC to 2026', () => {
    expect(equinoxDrift(2026, 'julian')).toBeLessThan(-14);
    expect(equinoxDrift(2026, 'julian')).toBeGreaterThan(-17);
    expect(Math.abs(equinoxDrift(2026, 'gregorian'))).toBeLessThan(1.5);
    expectNear(equinoxDrift(2026, 'no-leap'), 2070 * 0.2422, 3, 'no leap years');
  });
});
