import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU, C, M_EARTH, M_SUN } from '../src/core/constants';
import {
  auToMetres,
  degToRad,
  LIGHT_YEAR,
  lightTravelTime,
  lightYearsToMetres,
  metresToAu,
  metresToLightYears,
  metresToParsecs,
  PARSEC,
  parsecsToMetres,
  radToDeg,
  SECONDS_PER_JULIAN_YEAR,
} from '../src/core/units';
import { expectNear } from './helpers';

describe('distance units (research brief §2)', () => {
  it('defines the light-year from c and the Julian year', () => {
    expect(SECONDS_PER_JULIAN_YEAR).toBe(31_557_600);
    expect(LIGHT_YEAR).toBe(9_460_730_472_580_800);
    expectNear(LIGHT_YEAR / AU, 63_241, 1, 'AU per light-year');
  });

  it('defines the parsec as 648,000/π AU', () => {
    expectNear(PARSEC / 3.0857e16, 1, 1e-4, 'parsec in units of 3.0857e16 m');
    expectNear(PARSEC / AU, 206_265, 0.5, 'AU per parsec');
    expectNear(PARSEC / LIGHT_YEAR, 3.2616, 1e-4, 'light-years per parsec');
  });

  it('times light across familiar distances', () => {
    expectNear(lightTravelTime(AU), 499.0, 0.05, 'Sun to Earth, s');
    expectNear(lightTravelTime(384_400e3), 1.28, 0.005, 'Earth to Moon, s');
    expectNear(lightTravelTime(30.07 * AU) / 3600, 4 + 10 / 60, 0.01, 'Sun to Neptune, h');
    expect(lightTravelTime(C)).toBe(1);
  });

  it('round-trips every distance conversion', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-3, max: 1e25, noNaN: true }), (metres) => {
        for (const [to, from] of [
          [metresToAu, auToMetres],
          [metresToLightYears, lightYearsToMetres],
          [metresToParsecs, parsecsToMetres],
        ] as const) {
          expect(from(to(metres)) / metres).toBeCloseTo(1, 12);
        }
      }),
    );
  });
});

describe('masses from GM / G', () => {
  it('weighs the Sun and Earth', () => {
    expectNear(M_SUN / 1.9884e30, 1, 1e-4, 'solar mass');
    expectNear(M_EARTH / 5.9722e24, 1, 1e-4, 'Earth mass');
    expectNear(M_SUN / M_EARTH, 332_946, 1, 'Sun/Earth mass ratio');
  });
});

describe('angles', () => {
  it('converts degrees and radians both ways', () => {
    expect(degToRad(180)).toBe(Math.PI);
    expect(radToDeg(Math.PI / 2)).toBe(90);
    fc.assert(
      fc.property(fc.double({ min: -1e4, max: 1e4, noNaN: true }), (deg) => {
        expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 9);
      }),
    );
  });
});
