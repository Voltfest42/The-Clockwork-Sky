import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU, R_EARTH } from '../src/core/constants';
import { galacticFromEquatorial } from '../src/core/coords/galactic';
import { angularSeparation } from '../src/core/math/angles';
import { angularSize, smallAngle, smallAngleError } from '../src/core/math/angularSize';
import { fromSpherical, norm, sub } from '../src/core/math/vec3';
import { formatDuration } from '../src/core/time/duration';
import { meanLongitude, moonMeanLongitude, MEAN_ORBITS, siderealPeriodDays } from '../src/core/ephemeris/meanLongitude';
import { RUNGS, voyagerDirection, voyagerSunDistanceAu, ZOOM_CAMERA, ZOOM_MAX, ZOOM_MIN, zoomCatalogue } from '../src/core/scale/catalogue';
import { formatEarths, formatKilometres, formatLength } from '../src/core/scale/format';
import { comparisonWords, distanceWords, modelScale, nearestThing } from '../src/core/scale/model';
import { PositionTree } from '../src/core/scale/tree';
import { cameraCentre, fadeWindow, offsetFromCentre, scaleBar, smoothstep } from '../src/core/scale/zoom';
import { jdFromCalendar } from '../src/core/time/calendar';
import { jdFromUnixMs, J2000 } from '../src/core/time/julian';
import { DEG, HOUR_ANGLE, LIGHT_YEAR, lightTravelTime } from '../src/core/units';
import { EVERYDAY_SIZES } from '../src/data/everyday';
import { DIAMETERS_KM, VOYAGER_1 } from '../src/data/scale';
import { describeModelDistance, describeModelSize } from '../src/figures/scaleModel';
import { raceStops } from '../src/figures/lightRace/stops';
import { expectAngle, expectNear } from './helpers';

const ARCSEC_TOL = 1;

describe('galactic coordinates', () => {
  it('puts the defining centre at l = 0, b = 0 and the defining pole at b = 90°', () => {
    // ESA (1997): the galactic centre at RA 266.40499°, Dec −28.93617°; the north galactic pole at RA 192.85948°, Dec +27.12825°.
    const centre = galacticFromEquatorial({ ra: 266.404_99 * DEG, dec: -28.936_17 * DEG });
    expectAngle(centre.lon, 0, ARCSEC_TOL, 'l');
    expectAngle(centre.lat, 0, ARCSEC_TOL, 'b');
    const pole = galacticFromEquatorial({ ra: 192.859_48 * DEG, dec: 27.128_25 * DEG });
    expectAngle(pole.lat, 90 * DEG, ARCSEC_TOL, 'b of the pole');
  });

  it('places bright stars where catalogues do', () => {
    // SIMBAD galactic coordinates: Sirius 227.230°, −8.890°; Vega 67.448°, +19.237°.
    const sirius = galacticFromEquatorial({ ra: (6 + 45 / 60 + 8.917 / 3600) * HOUR_ANGLE, dec: -(16 + 42 / 60 + 58.02 / 3600) * DEG });
    expectNear(sirius.lon / DEG, 227.23, 0.01, 'Sirius l');
    expectNear(sirius.lat / DEG, -8.89, 0.01, 'Sirius b');
    const vega = galacticFromEquatorial({ ra: (18 + 36 / 60 + 56.336 / 3600) * HOUR_ANGLE, dec: (38 + 47 / 60 + 1.28 / 3600) * DEG });
    expectNear(vega.lon / DEG, 67.448, 0.01, 'Vega l');
    expectNear(vega.lat / DEG, 19.237, 0.01, 'Vega b');
  });

  it('is a rotation: angles between stars are unchanged', () => {
    const direction = fc.record({ ra: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), dec: fc.double({ min: -1.5, max: 1.5, noNaN: true }) });
    fc.assert(
      fc.property(direction, direction, (a, b) => {
        const ga = galacticFromEquatorial(a);
        const gb = galacticFromEquatorial(b);
        expectNear(angularSeparation(ga.lon, ga.lat, gb.lon, gb.lat), angularSeparation(a.ra, a.dec, b.ra, b.dec), 1e-8, 'separation');
      }),
    );
  });
});

describe('angular size (Toolkit T2)', () => {
  it('gives the Moon and the Sun about half a degree', () => {
    expectNear(angularSize(3_475, 384_400) / DEG, 0.518, 0.001, 'Moon');
    expectNear(angularSize(DIAMETERS_KM.sun * 1e3, AU) / DEG, 0.533, 0.001, 'Sun');
    // 1 cm at 57.3 cm is 1°.
    expectNear(angularSize(0.01, 0.573) / DEG, 1, 0.001, 'little finger');
  });

  it('the small-angle rule always overestimates, by about θ²/12, and is within 1% below 19°', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-6, max: 2, noNaN: true }), (ratio) => {
        const exact = angularSize(ratio, 1);
        expect(smallAngle(ratio, 1)).toBeGreaterThanOrEqual(exact);
        expectNear(smallAngleError(ratio, 1), exact ** 2 / 12, Math.max(1e-12, exact ** 4 / 50), 'error');
        if (exact < 19 * DEG) expect(smallAngleError(ratio, 1)).toBeLessThan(0.01);
      }),
    );
    expect(smallAngleError(2 * Math.tan(10.5 * DEG), 1)).toBeGreaterThan(0.01);
  });
});

describe('light travel times (research brief §2)', () => {
  it('matches the brief', () => {
    expect(formatDuration(lightTravelTime(AU))).toBe('8 min 19 s');
    expect(formatDuration(lightTravelTime(384_400e3))).toBe('1.28 s');
    expect(formatDuration(lightTravelTime(30.07 * AU))).toBe('4 h 10 min');
    expect(formatDuration(lightTravelTime(4.25 * LIGHT_YEAR))).toBe('4.25 years');
    expect(formatDuration(lightTravelTime(LIGHT_YEAR))).toBe('1 year');
  });

  it('writes durations in the units that suit them', () => {
    expect(formatDuration(0.5)).toBe('0.5 s');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(3_600)).toBe('1 h');
    expect(formatDuration(86_100)).toBe('23 h 55 min');
    expect(formatDuration(10 * 86_400)).toBe('10 days');
  });
});

describe('mean longitudes (Standish, JPL)', () => {
  it('give the planets’ sidereal periods (NASA Planetary Fact Sheets) to 0.1%', () => {
    const periods = { mercury: 87.969, venus: 224.701, earth: 365.256, mars: 686.98, jupiter: 4_332.589, saturn: 10_759.22, uranus: 30_685.4, neptune: 60_189 };
    for (const [planet, days] of Object.entries(periods)) {
      expectNear(siderealPeriodDays(planet as keyof typeof periods) / days, 1, 1e-3, planet);
    }
  });

  it('start from the J2000 values, and the Moon goes round once a sidereal month', () => {
    expectNear(meanLongitude('earth', J2000) / DEG, 100.464_571_66, 1e-9, 'Earth');
    expectNear(meanLongitude('mars', J2000) / DEG, 360 - 4.553_432_05, 1e-9, 'Mars');
    expectNear(moonMeanLongitude(J2000) / DEG, 218.316_447_7, 1e-9, 'Moon');
    const month = 27.321_66;
    expectAngle(moonMeanLongitude(J2000 + month), moonMeanLongitude(J2000), 3 * 3600 * 0.01, 'after a sidereal month');
  });
});

describe('positions across 21 powers of ten', () => {
  const tree = new PositionTree([
    { id: 'galaxy', parent: null, offset: [0, 0] },
    { id: 'sun', parent: 'galaxy', offset: [-2.5e20, 0] },
    { id: 'earth', parent: 'sun', offset: [AU, 0] },
    { id: 'person', parent: 'earth', offset: [0, 0] },
    { id: 'ball', parent: 'earth', offset: [1.7, 0.3] },
    { id: 'moon', parent: 'earth', offset: [0, 3.844e8] },
  ]);

  it('keeps tiny offsets exact, however far from the root', () => {
    expect(tree.relative('ball', 'person')).toEqual([1.7, 0.3]);
    expect(tree.relative('person', 'ball')).toEqual([-1.7, -0.3]);
    expect(tree.relative('moon', 'sun')).toEqual([AU, 3.844e8]);
    expect(tree.relative('galaxy', 'person')).toEqual([2.5e20 - AU, 0]);
  });

  it('is antisymmetric and adds up along a chain', () => {
    const ids = ['galaxy', 'sun', 'earth', 'person', 'ball', 'moon'];
    fc.assert(
      fc.property(fc.constantFrom(...ids), fc.constantFrom(...ids), fc.constantFrom(...ids), (a, b, c) => {
        const ab = tree.relative(a, b);
        const ba = tree.relative(b, a);
        expect(ab[0] + ba[0]).toBeCloseTo(0, 0);
        const ac = tree.relative(a, c);
        const cb = tree.relative(c, b);
        expect(Math.abs(ac[0] + cb[0] - ab[0])).toBeLessThanOrEqual(Math.abs(ab[0]) * 1e-15 + 1e5);
      }),
    );
  });

  it('refuses broken trees', () => {
    expect(() => new PositionTree([{ id: 'a', parent: 'nobody', offset: [0, 0] }])).toThrow(/unknown parent/);
    expect(() => new PositionTree([{ id: 'a', parent: 'b', offset: [0, 0] }, { id: 'b', parent: 'a', offset: [0, 0] }])).toThrow(/Cycle/);
  });

  it('glides the camera smoothly from one anchor to the next', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(2)).toBe(1);
    expect(cameraCentre(ZOOM_CAMERA, 3)).toEqual({ from: 'person', to: 'person', t: 0 });
    expect(cameraCentre(ZOOM_CAMERA, 12)).toEqual({ from: 'sun', to: 'sun', t: 0 });
    expect(cameraCentre(ZOOM_CAMERA, 21)).toEqual({ from: 'galaxy', to: 'galaxy', t: 0 });
    expect(cameraCentre(ZOOM_CAMERA, 20.6).t).toBe(1);
    const halfway = cameraCentre(ZOOM_CAMERA, (9.3 + 10.1) / 2);
    expect(halfway).toMatchObject({ from: 'person', to: 'sun' });
    expectNear(halfway.t, 0.5, 1e-12, 't');
    const [x, y] = offsetFromCentre(tree, 'person', halfway);
    expectNear(x, AU / 2, 1, 'x');
    expect(y).toBe(0);
  });

  it('fades labels in and out over half a power of ten', () => {
    expect(fadeWindow(5, 4, 6)).toBe(1);
    expect(fadeWindow(3.75, 4, 6)).toBe(0.5);
    expect(fadeWindow(7, 4, 6)).toBe(0);
  });

  it('draws round scale bars in sensible units', () => {
    expect(scaleBar(100, 180).text).toBe('1 m');
    expect(scaleBar(1, 180).text).toBe('100 m');
    expect(scaleBar(180 / 2.2e9, 180).text).toBe('2 million km');
    expect(scaleBar(180 / (11 * AU), 180).text).toBe('10 AU');
    expect(scaleBar(180 / (3 * LIGHT_YEAR), 180).text).toBe('2 light-years');
    expect(scaleBar(180 / (1.2 * LIGHT_YEAR), 180).text).toBe('1 light-year');
    const bar = scaleBar(0.37, 180);
    expect(bar.px).toBeLessThanOrEqual(180);
    expect(bar.px).toBeGreaterThan(180 / 2.5);
  });
});

describe('the zoom’s catalogue (Figure 1.1)', () => {
  const jd = jdFromCalendar({ year: 2026, month: 10, day: 22 });
  const objects = zoomCatalogue(jd);
  const tree = new PositionTree(objects);
  const find = (id: string) => objects.find((o) => o.id === id)!;

  it('spans 1 m to 10²¹ m, with a line for every power of ten', () => {
    expect(ZOOM_MIN).toBe(0);
    expect(ZOOM_MAX).toBe(21);
    expect(RUNGS).toHaveLength(22);
  });

  it('puts things at their true distances', () => {
    expectNear(norm([...tree.relative('earth', 'sun'), 0]) / AU, 1, 1e-5, 'Earth from the Sun, AU');
    expectNear(norm([...tree.relative('neptune', 'sun'), 0]) / AU, 30.07, 0.01, 'Neptune');
    expectNear(norm([...tree.relative('moon', 'earth'), 0]) / 1e3, 384_400, 1, 'Moon, km');
    expectNear(norm([...tree.relative('proxima', 'sun'), 0]) / LIGHT_YEAR, 4.25, 1e-9, 'Proxima, ly');
    expectNear(norm([...tree.relative('sun', 'galaxy'), 0]) / LIGHT_YEAR, 26_700, 1e-6, 'Sun from the centre, ly');
    expectNear(norm([...tree.relative('iss', 'earth'), 0]) - R_EARTH, 420e3, 1, 'ISS altitude');
  });

  it('gives every object a size, a sentence, and a label window that lies within the zoom', () => {
    for (const o of objects) {
      expect(o.fact.length, o.id).toBeGreaterThan(20);
      expect(o.label[0], o.id).toBeLessThan(o.label[1]);
      expect(o.goTo, o.id).toBeGreaterThanOrEqual(ZOOM_MIN);
      expect(o.goTo, o.id).toBeLessThanOrEqual(ZOOM_MAX);
      if (o.kind !== 'marker') expect(o.diameter, o.id).toBeGreaterThan(0);
    }
    expect(find('sun').diameter).toBe(1.3914e9);
    expect(find('jupiter').diameter).toBe(142_984e3);
  });

  it('labels each planet while its orbit is in view', () => {
    for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      const o = find(planet);
      const orbitPower = Math.log10(2 * MEAN_ORBITS[planet as keyof typeof MEAN_ORBITS].a * AU);
      expect(o.label[0], planet).toBeLessThan(orbitPower);
      expect(o.label[1], planet).toBeGreaterThan(orbitPower);
    }
  });
});

describe('Voyager 1', () => {
  const milestone = jdFromUnixMs(Date.parse(VOYAGER_1.lightDay.when));

  it('is one light-day (173.1 AU) from Earth on 18 November 2026, as NASA says', () => {
    const v = voyagerDirection();
    const voyager = fromSpherical(v.lon, v.lat, voyagerSunDistanceAu(milestone));
    // Earth's distance from the Sun on 18 November is 0.989 AU; its direction is good to about 2° from its mean longitude.
    const earth = fromSpherical(meanLongitude('earth', milestone), 0, 0.989);
    const lightDayAu = (86_400 * 299_792_458) / AU;
    expectNear(lightDayAu, 173.14, 0.01, 'a light-day in AU');
    expectNear(norm(sub(voyager, earth)), lightDayAu, 0.1, 'Earth to Voyager 1, AU');
  });

  it('is about 35° north of the planets’ plane and moves out about 3.6 AU a year', () => {
    expectNear(voyagerDirection().lat / DEG, 35, 1, 'ecliptic latitude');
    expectNear(voyagerSunDistanceAu(milestone + 365.25) - voyagerSunDistanceAu(milestone), 3.57, 1e-9, 'AU per year');
  });
});

describe('the scale model (Figure 1.2; research brief §2)', () => {
  const grapefruit = modelScale(DIAMETERS_KM.sun * 1e3, 0.1);

  it('reproduces the brief’s grapefruit model', () => {
    expectNear(1 / grapefruit / 1e9, 13.9, 0.1, 'scale, billions');
    expectNear(DIAMETERS_KM.earth * 1e3 * grapefruit * 1e3, 0.92, 0.01, 'Earth, mm');
    expectNear(AU * grapefruit, 10.75, 0.01, 'Earth distance, m');
    expectNear(DIAMETERS_KM.jupiter * 1e3 * grapefruit * 100, 1.03, 0.01, 'Jupiter, cm');
    expectNear(5.2029 * AU * grapefruit, 55.9, 0.1, 'Jupiter distance, m');
    expectNear(30.07 * AU * grapefruit, 323.3, 0.5, 'Neptune distance, m');
    expectNear(384_400e3 * grapefruit * 100, 2.76, 0.01, 'Moon distance, cm');
    expectNear((4.25 * LIGHT_YEAR * grapefruit) / 1e3, 2_890, 10, 'Proxima, km');
  });

  it('describes model sizes and distances with everyday things', () => {
    expect(describeModelSize(DIAMETERS_KM.earth * 1e3 * grapefruit)).toBe('0.92 mm: about a grain of sand');
    expect(describeModelSize(DIAMETERS_KM.jupiter * 1e3 * grapefruit)).toMatch(/pea$/);
    expect(describeModelDistance(AU * grapefruit)).toBe('10.8 m: 14 steps');
    expect(describeModelDistance(5_000)).toMatch(/football pitches$/);
    expect(describeModelDistance(4.25 * LIGHT_YEAR * grapefruit)).toBe('2,890 km: nearly as far as London to Cairo');
  });

  it('compares by ratio, so the nearest thing is never more than a factor away from the next', () => {
    expect(nearestThing(EVERYDAY_SIZES, 1e-3).thing.name).toBe('a grain of sand');
    expect(comparisonWords(1)).toBe('about');
    expect(comparisonWords(0.3)).toBe('much smaller than');
    expect(distanceWords(1.2)).toBe('a bit farther than');
  });

  it('formats lengths in the units readers use', () => {
    expect(formatLength(1.7)).toBe('1.7 m');
    expect(formatLength(0.000_92)).toBe('0.92 mm');
    expect(formatLength(12_756e3)).toBe('12,756 km');
    expect(formatLength(1.3914e9)).toBe('1.39 million km');
    expect(formatLength(30.07 * AU)).toBe('30.1 AU');
    expect(formatLength(4.25 * LIGHT_YEAR)).toBe('4.25 light-years');
    expect(formatKilometres(9.46e15)).toBe('9.46 trillion km');
    expect(formatEarths(1.3914e9)).toBe('109 Earths');
    expect(formatEarths(12_742e3)).toBe('1 Earth');
    expect(formatEarths(1.7)).toBe('1.3 × 10⁻⁷ Earths');
  });
});

describe('light’s race (Figure 1.3)', () => {
  const stops = raceStops(jdFromCalendar({ year: 2026, month: 10, day: 22 }));

  it('runs from Mercury to Proxima Centauri, nearest first', () => {
    expect(stops.map((s) => s.id)).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'voyager-1', 'proxima']);
    for (let i = 1; i < stops.length; i++) expect(stops[i].arrival).toBeGreaterThan(stops[i - 1].arrival);
  });

  it('times the light as the brief does', () => {
    expect(formatDuration(stops[2].arrival)).toBe('8 min 19 s');
    expect(formatDuration(stops[7].arrival)).toBe('4 h 10 min');
    expect(formatDuration(stops[9].arrival)).toBe('4.25 years');
    // Voyager 1 is a little under a light-day from the Sun (Earth is farther from it than the Sun is in November).
    expect(stops[8].arrival / 86_400).toBeGreaterThan(0.98);
    expect(stops[8].arrival / 86_400).toBeLessThan(1.01);
  });

  it('places each stop at its distance', () => {
    for (const stop of stops) expectNear(norm(stop.position), stop.distanceAu, stop.distanceAu * 1e-12, stop.id);
  });
});
