import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { moonElongation, moonPhaseName } from '../src/core/ephemeris/phase';
import { apply, fromSpherical, type Vec3 } from '../src/core/math/vec3';
import { milkyWayAt, parseConstellations, parseMilkyWay, type RawConstellationFile, type RawMilkyWayFile } from '../src/core/sky/charts';
import { azAlt } from '../src/core/sky/projection';
import { findStarByName, parseStarCatalogue, type RawStarFile } from '../src/core/stars/catalogue';
import { jdFromCalendar } from '../src/core/time/calendar';
import { ttFromUt, utFromTt } from '../src/core/time/deltaT';
import { SIDEREAL_DAY } from '../src/core/time/sidereal';
import { clockTime } from '../src/core/time/zone';
import { DEG } from '../src/core/units';
import rawConstellations from '../src/data/constellations.json';
import rawMilkyWay from '../src/data/milkyway.json';
import rawStars from '../src/data/hyg/stars.json';
import { DEFAULT_PLACE_ID, PLACES } from '../src/data/places';
import type { SkyData } from '../src/data/sky';
import { formatDayClock, siderealDayFor, starTransitsBy, sunTransitsBy, TROPICAL_YEAR } from '../src/figures/twoDays';
import { checkPolarisOnHorizon } from '../src/content/checks/chapter2Answers';
import { corePlace, DEFAULT_PLACE, formatLatLon, placeZone } from '../src/site/place';
import { buildSkyModel, refract, starLabel, starVector } from '../src/viz/sky/model';
import { formatMoment, stepTime, zoneLabel } from '../src/viz/time/format';
import { expectNear } from './helpers';

const data: SkyData = {
  stars: parseStarCatalogue(rawStars as unknown as RawStarFile),
  constellations: parseConstellations(rawConstellations as unknown as RawConstellationFile),
  milkyWay: parseMilkyWay(rawMilkyWay as RawMilkyWayFile),
};
const london = corePlace(DEFAULT_PLACE);
const ut = (year: number, month: number, day: number, hour = 0, minute = 0) => jdFromCalendar({ year, month, day: day + (hour + minute / 60) / 24 });

describe('one spin, two days (Figure 2.4)', () => {
  it('makes the real star day 23 h 56 min 4 s, matching the sidereal clock', () => {
    expectNear(siderealDayFor(TROPICAL_YEAR) * 86_400, SIDEREAL_DAY, 0.02);
    expect(formatDayClock(siderealDayFor(TROPICAL_YEAR))).toBe('23 h 56 min 04 s');
    expect(formatDayClock(siderealDayFor(12))).toBe('22 h 09 min 14 s');
    expect(formatDayClock(1)).toBe('1 day 0 h 00 min');
  });

  it('counts one more turn against the stars than against the Sun in a year', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 400 }), (year) => {
        expect(starTransitsBy(year, year)).toBe(year + 1);
        expect(sunTransitsBy(year)).toBe(year);
      }),
    );
  });
});

describe('the Moon’s phase in words', () => {
  it('names the phases of April 2024', () => {
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 8, 18, 21)))).toBe('new'); // the total solar eclipse
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 12)))).toBe('waxing crescent');
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 15, 19, 13)))).toBe('first quarter');
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 19)))).toBe('waxing gibbous');
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 23, 23, 49)))).toBe('full');
    expect(moonPhaseName(ttFromUt(ut(2024, 4, 27)))).toBe('waning gibbous');
    expect(moonPhaseName(ttFromUt(ut(2024, 5, 1, 11, 27)))).toBe('last quarter');
    expect(moonPhaseName(ttFromUt(ut(2024, 5, 5)))).toBe('waning crescent');
  });

  it('puts new Moon at elongation 0', () => {
    expect(Math.abs(moonElongation(ttFromUt(ut(2024, 4, 8, 18, 21)))) / DEG).toBeLessThan(1);
  });
});

describe('the time control', () => {
  const place = DEFAULT_PLACE;

  it('steps a month or a year, keeping the clock time', () => {
    const start = ttFromUt(ut(2026, 1, 31, 21, 30)); // 21:30 GMT
    const month = clockTime(placeZone(place), utFromTt(stepTime(start, 'month', 1, place)));
    expect(month).toEqual({ year: 2026, month: 2, day: 28, hour: 21, minute: 30, second: 0 });
    const year = clockTime(placeZone(place), utFromTt(stepTime(start, 'year', -1, place)));
    expect(year).toEqual({ year: 2025, month: 1, day: 31, hour: 21, minute: 30, second: 0 });
    expectNear((stepTime(start, 'sidereal', 1, place) - start) * 86_400, SIDEREAL_DAY, 1e-3);
  });

  it('names the time zone in every reading', () => {
    expect(zoneLabel(place, ttFromUt(ut(2026, 7, 1, 12)))).toBe('London time, UTC+1');
    expect(zoneLabel({ ...place, id: 'custom', timeZone: null, longitude: 100 }, ttFromUt(ut(2026, 7, 1, 12)))).toBe('UTC+7, by longitude');
    expect(formatMoment(ttFromUt(ut(2026, 7, 1, 21)), place)).toBe('1 July 2026, 22:00 (London time, UTC+1)');
    expect(formatMoment(ttFromUt(jdFromCalendar({ year: -583, month: 5, day: 28.5 })), { ...place, timeZone: null, longitude: 0 }, false)).toBe('28 May 584 BC, 12:00');
  });
});

describe('places', () => {
  it('span both hemispheres, the poles and the equator, starting in London', () => {
    expect(DEFAULT_PLACE.id).toBe(DEFAULT_PLACE_ID);
    expect(DEFAULT_PLACE.name).toBe('London');
    const lats = PLACES.map((p) => p.latitude);
    expect(Math.max(...lats)).toBe(90);
    expect(Math.min(...lats)).toBe(-90);
    expect(lats).toContain(0);
    expect(lats.filter((l) => l < 0).length).toBeGreaterThanOrEqual(4);
    expect(formatLatLon(-33.87, 151.21)).toBe('33.9° S, 151.2° E');
  });
});

describe('the charts', () => {
  it('has the 88 constellations (Serpens in two parts), each figure on real stars', () => {
    const ids = new Set(data.constellations.map((c) => c.id));
    expect(data.constellations.length).toBe(89);
    expect(ids.has('Ori')).toBe(true);
    expect(ids.has('Cru')).toBe(true);
    for (const c of data.constellations) {
      expect(c.strokes.length, c.id).toBeGreaterThan(0);
      for (const stroke of c.strokes) for (const p of stroke) if ('star' in p) expect(p.star).toBeLessThan(data.stars.count);
    }
  });

  it('draws Orion through Betelgeuse and Rigel', () => {
    const orion = data.constellations.find((c) => c.id === 'Ori')!;
    const used = new Set(orion.strokes.flat().flatMap((p) => ('star' in p ? [starLabel(data.stars, p.star)] : [])));
    expect(used.has('Betelgeuse')).toBe(true);
    expect(used.has('Rigel')).toBe(true);
  });

  it('makes the Milky Way bright towards the Galactic Centre and dark at the galactic poles', () => {
    const at = (raDeg: number, decDeg: number) => {
      const [x, y, z] = fromSpherical(raDeg * DEG, decDeg * DEG);
      return milkyWayAt(data.milkyWay, x, y, z);
    };
    expect(at(266.4, -29)).toBeGreaterThanOrEqual(3); // Sagittarius A*
    expect(at(270.5, -31.5)).toBeGreaterThanOrEqual(7); // the Sagittarius star cloud, the brightest part
    expect(at(192.86, 27.13)).toBe(0); // north galactic pole
    expect(at(12.86, -27.13)).toBe(0); // south galactic pole
    expect(at(310, 42)).toBeGreaterThanOrEqual(2); // Cygnus
    // Smooth: neighbouring directions differ by less than a level per degree.
    fc.assert(
      fc.property(fc.double({ min: 0, max: 360, noNaN: true }), fc.double({ min: -85, max: 85, noNaN: true }), (ra, dec) => {
        expect(Math.abs(at(ra, dec) - at(ra + 0.5, dec + 0.5))).toBeLessThan(1.5);
      }),
    );
  });
});

describe('the sky model', () => {
  it('puts Polaris at about the latitude, a little lifted by refraction', () => {
    for (const latitude of [20, 51.5, 70]) {
      const model = buildSkyModel(data, { jdTT: ttFromUt(ut(2026, 10, 23, 22)), mode: 'horizon', place: { latitude: latitude * DEG, longitude: 0 } });
      const { alt } = azAlt(starVector(model, findStarByName(data.stars, 'Polaris')));
      expect(Math.abs(alt / DEG - latitude)).toBeLessThan(0.7);
    }
  });

  it('knows night from day, and dims the stars in daylight', () => {
    const night = buildSkyModel(data, { jdTT: ttFromUt(ut(2026, 12, 21, 23)), mode: 'horizon', place: london });
    const day = buildSkyModel(data, { jdTT: ttFromUt(ut(2026, 6, 21, 12)), mode: 'horizon', place: london });
    expect(night.sunAltitude! / DEG).toBeLessThan(-18);
    expect(night.limit).toBe(6.5);
    // The Sun's noon height at the June solstice from London: 90° − 51.5° + 23.4°.
    expectNear(day.sunAltitude! / DEG, 61.9, 0.3);
    expect(day.limit).toBeLessThan(-3);
    expect(day.lightness).toBeGreaterThan(0.9);
    const off = buildSkyModel(data, { jdTT: ttFromUt(ut(2026, 6, 21, 12)), mode: 'horizon', place: london, daylight: false });
    expect(off.limit).toBe(6.5);
  });

  it('shifts the Moon by its parallax: up to about 1° lower than from Earth’s centre', () => {
    const jd = ttFromUt(ut(2026, 10, 23, 22));
    const model = buildSkyModel(data, { jdTT: jd, mode: 'horizon', place: london });
    const moon = model.bodies.find((b) => b.name === 'moon')!;
    const geocentric = buildSkyModel(data, { jdTT: jd, mode: 'chart' }).bodies.find((b) => b.name === 'moon')!;
    // Back to a common frame: the chart frame's J2000 direction vs the horizon frame's.
    const toJ2000 = (m: typeof model, v: Vec3) => apply([m.frames.fromJ2000[0], m.frames.fromJ2000[1], m.frames.fromJ2000[2]].map((_, i) => [0, 1, 2].map((j) => m.frames.fromJ2000[j][i])) as unknown as typeof m.frames.fromJ2000, v);
    const chart = buildSkyModel(data, { jdTT: jd, mode: 'chart' });
    const a = toJ2000(model, moon.local);
    const b = toJ2000(chart, geocentric.local);
    const separation = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / DEG;
    expect(separation).toBeGreaterThan(0.3);
    expect(separation).toBeLessThan(1.1);
  });

  it('applies no refraction in charts', () => {
    const chart = buildSkyModel(data, { jdTT: 2_451_545, mode: 'chart' });
    expect(chart.refracted).toBe(false);
    expect(chart.limit).toBe(6.5);
    expect(chart.bodies.length).toBe(9);
    const v = starVector(chart, 0);
    expectNear(Math.hypot(v[0], v[1], v[2]), 1, 1e-12);
  });

  it('refracts upwards, most at the horizon, never past the zenith', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), fc.double({ min: -0.03, max: 1.5, noNaN: true }), (az, alt) => {
        const v: Vec3 = [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)];
        const r = refract(v);
        expect(r[2]).toBeGreaterThanOrEqual(v[2] - 1e-15);
        expectNear(Math.hypot(r[0], r[1], r[2]), 1, 1e-12);
      }),
    );
  });
});

describe('Check yourself, Chapter 2', () => {
  it('accepts the equator for Polaris on the horizon, and explains the rest', () => {
    expect(checkPolarisOnHorizon(0).correct).toBe(true);
    expect(checkPolarisOnHorizon(1).correct).toBe(true);
    expect(checkPolarisOnHorizon(10).correct).toBe(false);
    expect(checkPolarisOnHorizon(-10).correct).toBe(false);
  });
});
