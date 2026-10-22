import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  angularSeparation,
  dms,
  formatDms,
  formatHms,
  hms,
  normalizeRadians,
  splitSexagesimal,
  TWO_PI,
  wrapPi,
} from '../src/core/math/angles';
import { angleBetween, fromSpherical } from '../src/core/math/vec3';
import { ARCSEC, DEG } from '../src/core/units';
import { expectAngle } from './helpers';

const anyAngle = fc.double({ min: -1e4, max: 1e4, noNaN: true });

describe('reducing angles', () => {
  it('normalizes into [0, 2π) without changing the direction', () => {
    fc.assert(
      fc.property(anyAngle, (a) => {
        const r = normalizeRadians(a);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(TWO_PI);
        expect(Math.cos(r)).toBeCloseTo(Math.cos(a), 9);
        expect(Math.sin(r)).toBeCloseTo(Math.sin(a), 9);
      }),
    );
  });

  it('wraps into (−π, π]', () => {
    fc.assert(
      fc.property(anyAngle, (a) => {
        const r = wrapPi(a);
        expect(r).toBeGreaterThan(-Math.PI);
        expect(r).toBeLessThanOrEqual(Math.PI);
        expect(Math.cos(r)).toBeCloseTo(Math.cos(a), 9);
      }),
    );
  });

  it('handles the edges: −0, tiny negatives and whole turns', () => {
    expect(Object.is(normalizeRadians(-0), 0)).toBe(true);
    expect(normalizeRadians(-1e-18)).toBe(0);
    expect(normalizeRadians(TWO_PI)).toBe(0);
    expect(normalizeRadians(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 15);
    expect(wrapPi(Math.PI)).toBe(Math.PI);
    expect(wrapPi(-Math.PI)).toBe(Math.PI);
  });
});

describe('sexagesimal angles', () => {
  it('reads degrees, arcminutes and arcseconds, signs included (Meeus Example 13.b)', () => {
    expect(dms(-6, 43, 11.61) / DEG).toBeCloseTo(-6.719892, 6);
    expect(dms(38, 55, 17) / DEG).toBeCloseTo(38.921389, 6);
    expect(dms(-0, 30) / DEG).toBe(-0.5);
    expect(dms(0, -30) / DEG).toBe(-0.5);
    expect(dms(0, 0, 3600)).toBeCloseTo(DEG, 15);
  });

  it('reads hours, minutes and seconds as 15° to the hour', () => {
    expect(hms(23, 9, 16.641) / DEG).toBeCloseTo(347.3193375, 7);
    expect(hms(6)).toBeCloseTo(Math.PI / 2, 15);
  });

  it('formats angles, carrying rounded seconds into minutes and degrees', () => {
    expect(formatDms(dms(28, 1, 34.26), 2)).toBe('+28° 01′ 34.26″');
    expect(formatDms(dms(-6, 43, 11.61), 1)).toBe('−6° 43′ 11.6″');
    expect(formatDms(dms(10, 59, 59.96), 1)).toBe('+11° 00′ 00.0″');
    expect(formatDms(dms(-0, 0, 0.001), 1)).toBe('+0° 00′ 00.0″');
    expect(formatHms(hms(7, 45, 18.946), 3)).toBe('7h 45m 18.946s');
    expect(formatHms(hms(23, 59, 59.9996), 3)).toBe('0h 00m 00.000s');
    expect(formatHms(hms(-1), 0)).toBe('23h 00m 00s');
  });

  it('splits any value into valid fields that add back up to it', () => {
    fc.assert(
      fc.property(fc.double({ min: -400, max: 400, noNaN: true }), fc.integer({ min: 0, max: 4 }), (value, decimals) => {
        const { negative, units, minutes, seconds } = splitSexagesimal(value, decimals);
        expect(Number.isInteger(units) && Number.isInteger(minutes)).toBe(true);
        expect(minutes).toBeLessThan(60);
        expect(seconds).toBeLessThan(60);
        const total = (negative ? -1 : 1) * (units + minutes / 60 + seconds / 3600);
        expect(Math.abs(total - value) * 3600).toBeLessThanOrEqual(0.5 * 10 ** -decimals + 1e-9);
      }),
    );
  });
});

describe('angular separation', () => {
  it('matches Meeus Example 17.a: Arcturus to Spica is 32.7930°', () => {
    const d = angularSeparation(213.9154 * DEG, 19.1825 * DEG, 201.2983 * DEG, -11.1614 * DEG);
    expectAngle(d, 32.793 * DEG, 0.5);
  });

  it('agrees with the angle between unit vectors, from tiny separations to antipodes', () => {
    const lon = fc.double({ min: 0, max: TWO_PI, noNaN: true });
    const lat = fc.double({ min: -Math.PI / 2, max: Math.PI / 2, noNaN: true });
    fc.assert(
      fc.property(lon, lat, lon, lat, (l1, b1, l2, b2) => {
        const d = angularSeparation(l1, b1, l2, b2);
        expect(Math.abs(d - angleBetween(fromSpherical(l1, b1), fromSpherical(l2, b2)))).toBeLessThan(1e-9);
        expect(d).toBeCloseTo(angularSeparation(l2, b2, l1, b1), 12);
      }),
    );
    expect(angularSeparation(1, 0.3, 1 + 1e-9, 0.3) / ARCSEC).toBeCloseTo((1e-9 * Math.cos(0.3)) / ARCSEC, 9);
    expect(angularSeparation(0, 0.2, Math.PI, -0.2)).toBeCloseTo(Math.PI, 12);
  });
});
