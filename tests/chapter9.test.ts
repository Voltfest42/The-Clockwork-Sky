import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { equatorialFromGalacticVector, galacticFromEquatorial, galacticFromEquatorialVector } from '../src/core/coords/galactic';
import {
  absoluteMagnitude,
  apparentMagnitude,
  distanceForMagnitude,
  lightYearsFromParsecs,
  parallaxFromParsecs,
  parsecsFromLightYears,
  parsecsFromParallax,
  SUN_ABSOLUTE_MAGNITUDE,
} from '../src/core/stars/distance';
import { DEG } from '../src/core/units';
import { checkSunAtTheLimit } from '../src/content/checks/chapter9Answers';
import { classCounts, describeNeighbour, fainterThanSun, luminosity, NEIGHBOURS } from '../src/figures/neighbourhood';
import { coinDistanceKm, distanceWords, PARALLAX_STARS, parallaxShift, parallaxWords } from '../src/figures/parallax';
import { describeSun, distanceWords as sunDistanceWords, sunMagnitude, sunVisibleTo } from '../src/figures/sunAway';
import { galacticEquator, GALACTIC_CENTRE } from '../src/figures/milkyWay';
import { expectNear } from './helpers';

describe('parallax and distance (brief §10)', () => {
  it('turns a parallax of 0.1″ into 10 parsecs, about 33 light-years', () => {
    expect(parsecsFromParallax(0.1)).toBeCloseTo(10, 12);
    expectNear(lightYearsFromParsecs(10), 32.6, 0.05, 'light-years');
    expectNear(lightYearsFromParsecs(1), 3.26, 0.005, 'a parsec');
  });

  it('round-trips parallax, parsecs and light-years', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-4, max: 10, noNaN: true }), (p) => {
        expect(parallaxFromParsecs(parsecsFromParallax(p))).toBeCloseTo(p, 10);
        const pc = parsecsFromParallax(p);
        expect(parsecsFromLightYears(lightYearsFromParsecs(pc)) / pc).toBeCloseTo(1, 12);
      }),
    );
    expect(() => parsecsFromParallax(0)).toThrow();
  });

  it('puts the brief’s stars at their distances', () => {
    const ly = (id: string) => lightYearsFromParsecs(parsecsFromParallax(PARALLAX_STARS.find((s) => s.id === id)!.mas / 1000));
    expectNear(ly('proxima'), 4.25, 0.01, 'Proxima');
    expectNear(ly('sirius'), 8.6, 0.05, 'Sirius');
    expectNear(ly('61cyg'), 11.4, 0.05, '61 Cygni');
    expectNear(ly('vega'), 25, 0.1, 'Vega');
    expectNear(ly('betelgeuse'), 548, 5, 'Betelgeuse');
    expect(distanceWords(0.76807)).toBe('1.30 parsecs (4.25 light-years)');
    expect(parallaxWords(0.76807)).toBe('0.768″');
    expect(parallaxWords(0.00595)).toBe('0.00595″');
    // 1″ is a coin seen from about 4.7 km.
    expectNear(coinDistanceKm(1), 4.74, 0.01, 'coin');
  });

  it('traces an ellipse: a line on the ecliptic, a circle at its pole', () => {
    const at = (lat: number, t: number) => parallaxShift(0.5, lat, t);
    expectNear(at(0, Math.PI / 2).east, 0.5, 1e-12, 'east');
    expectNear(at(0, 0).north, 0, 1e-12, 'flat on the ecliptic');
    for (let t = 0; t < 6; t += 0.5) expectNear(Math.hypot(at(Math.PI / 2, t).east, at(Math.PI / 2, t).north), 0.5, 1e-12, 'circle');
    // Vega is far from the ecliptic (61.7° north), Sirius 39.6° south.
    expectNear(PARALLAX_STARS.find((s) => s.id === 'vega')!.latitude / DEG, 61.7, 0.1, 'Vega');
    expectNear(PARALLAX_STARS.find((s) => s.id === 'sirius')!.latitude / DEG, -39.6, 0.1, 'Sirius');
  });
});

describe('magnitudes and the Sun from afar (9.3)', () => {
  it('follows the distance modulus', () => {
    expect(apparentMagnitude(4.83, 10)).toBeCloseTo(4.83, 12);
    expect(apparentMagnitude(0, 100)).toBeCloseTo(5, 12);
    fc.assert(
      fc.property(fc.double({ min: -10, max: 20, noNaN: true }), fc.double({ min: 0.01, max: 1e5, noNaN: true }), (M, d) => {
        expect(absoluteMagnitude(apparentMagnitude(M, d), d)).toBeCloseTo(M, 9);
        expect(distanceForMagnitude(M, apparentMagnitude(M, d)) / d).toBeCloseTo(1, 9);
      }),
    );
  });

  it('makes the Sun −26.7 from Earth, about +0.5 from α Centauri, and invisible beyond 17 pc (55 light-years)', () => {
    expectNear(sunMagnitude(1 / 206_264.806), -26.74, 0.02, 'from Earth');
    expectNear(sunMagnitude(1.34), 0.47, 0.02, 'from α Centauri');
    expectNear(sunVisibleTo(), 17.1, 0.1, 'naked-eye limit, pc');
    expectNear(lightYearsFromParsecs(sunVisibleTo()), 55.9, 0.3, 'naked-eye limit, ly');
    expect(describeSun(1.34)).toBe('From 4.37 light-years the Sun is magnitude 0.5: one of the brightest stars in the sky, brighter than Polaris.');
    expect(describeSun(100)).toMatch(/too faint to see/);
    expect(sunDistanceWords(30.07 / 206_264.806)).toBe('30 AU');
  });

  it('accepts 5.7–6.4 for the Sun at the edge of sight', () => {
    expect(checkSunAtTheLimit(17).correct).toBe(true);
    expect(checkSunAtTheLimit(10).correct).toBe(false);
    expect(checkSunAtTheLimit(30).correct).toBe(false);
  });
});

describe('the neighbourhood (9.2)', () => {
  it('has the stars within 10 parsecs, mostly red dwarfs, in galactic axes', () => {
    expect(NEIGHBOURS.length).toBeGreaterThan(300);
    for (const s of NEIGHBOURS) expect(s.distance).toBeLessThanOrEqual(10.0001);
    const counts = classCounts();
    const total = NEIGHBOURS.length;
    // Reylé et al. (2021) count 249 M dwarfs among 375 stars (66%); HYG lacks the faintest.
    expect(counts.M / total).toBeGreaterThan(0.6);
    expect(counts.A).toBe(5);
    expect(counts.G).toBeGreaterThan(15);
    expect(counts.D).toBeGreaterThan(15);
    // The Sun outshines about nine in ten of its neighbours.
    expect(fainterThanSun()).toBeGreaterThan(0.9);
  });

  it('puts Proxima first, at 1.30 pc, towards Centaurus', () => {
    const proxima = NEIGHBOURS[0];
    expect(proxima.name).toBe('Proxima Centauri');
    expectNear(proxima.distance, 1.296, 0.01, 'Proxima');
    const { lon, lat } = galacticFromEquatorial({ ra: 217.429 * DEG, dec: -62.679 * DEG });
    const p = proxima.position;
    expectNear(Math.atan2(p[1], p[0]), lon - 2 * Math.PI, 0.01, 'longitude');
    expectNear(Math.asin(p[2] / proxima.distance), lat, 0.01, 'latitude');
    expect(describeNeighbour(proxima)).toMatch(/^Proxima Centauri: a red dwarf: small, cool and faint \(type M5Ve\), 4\.2 light-years away\. It gives out 0\.006% of the Sun’s light/);
    expectNear(luminosity(SUN_ABSOLUTE_MAGNITUDE), 1, 1e-12, 'the Sun');
    const sirius = NEIGHBOURS.find((s) => s.name === 'Sirius')!;
    expect(describeNeighbour(sirius)).toMatch(/gives out 2\d times as much light as the Sun, and is visible to the eye/);
  });

  it('turns equatorial vectors into galactic ones and back', () => {
    fc.assert(
      fc.property(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), (x, y, z) => {
        const back = equatorialFromGalacticVector(galacticFromEquatorialVector([x, y, z]));
        // The published matrix has ten decimals, so it is a rotation to about 1e-10.
        expect(back[0]).toBeCloseTo(x, 9);
        expect(back[1]).toBeCloseTo(y, 9);
        expect(back[2]).toBeCloseTo(z, 9);
      }),
    );
  });
});

describe('the Milky Way in the sky (9.5)', () => {
  it('puts the Galactic Centre in Sagittarius, and the galactic equator through Cassiopeia and Crux', () => {
    // l = 0, b = 0 is at RA 266.405°, Dec −28.936°, 4′ from Sagittarius A* (RA 17h 45m 40s, Dec −29° 00′ 28″).
    const [x, y, z] = GALACTIC_CENTRE;
    expectNear((Math.atan2(y, x) / DEG + 360) % 360, 266.405, 0.01, 'RA');
    expectNear(Math.asin(z) / DEG, -28.936, 0.01, 'Dec');
    const equator = galacticEquator(360);
    expect(equator).toHaveLength(360);
    for (const v of equator) expectNear(galacticFromEquatorial({ ra: Math.atan2(v[1], v[0]), dec: Math.asin(v[2]) }).lat, 0, 1e-9, 'on the plane');
  });
});
