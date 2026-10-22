import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { jdFromCalendar } from '../src/core/time/calendar';
import { deltaT, deltaTForYear, espenakMeeus, ttFromUt, utFromTt } from '../src/core/time/deltaT';
import { julianEpoch } from '../src/core/time/julian';
import { expectNear } from './helpers';

/**
 * ΔT (s) from the historical record, as tabulated by Espenak & Meeus (2006,
 * Table 1, after Morrison & Stephenson 2004). Their polynomials are fits to
 * these values, so they should reproduce them closely.
 */
const HISTORICAL: [number, number][] = [
  [-500, 17_190], [-400, 15_530], [-300, 14_080], [-200, 12_790], [-100, 11_640], [0, 10_580], [100, 9600], [200, 8640],
  [300, 7680], [400, 6700], [500, 5710], [600, 4740], [700, 3810], [800, 2960], [900, 2200], [1000, 1570], [1100, 1090],
  [1200, 740], [1300, 490], [1400, 320], [1500, 200], [1600, 120], [1700, 9], [1750, 13], [1800, 14], [1850, 7], [1900, -3],
  [1950, 29.1], [1955, 31.1], [1960, 33.2], [1965, 35.7], [1970, 40.2], [1975, 45.5], [1980, 50.5], [1985, 54.3],
  [1990, 56.9], [1995, 60.8], [2000, 63.8], [2005, 64.7],
];

/** Where one formula hands over to the next. */
const BOUNDARIES = [-500, 500, 1600, 1700, 1800, 1860, 1900, 1920, 1941, 1961, 1986, 2005, 2026, 2050, 2150];

describe('ΔT', () => {
  // The table rounds to 10 s before 1700, and the polynomials smooth it, so allow 1%.
  it.each(HISTORICAL)('reproduces the historical value for %d', (year, value) => {
    expectNear(espenakMeeus(year), value, Math.max(0.5, 0.01 * Math.abs(value)), `ΔT in ${year}`);
    expectNear(deltaTForYear(year), value, Math.max(0.5, 0.01 * Math.abs(value)), `ΔT in ${year}`);
  });

  it('uses the measured values since 2005: about 69 s in 2026 (IERS)', () => {
    expectNear(deltaTForYear(2010), 66.07, 0.005, 'ΔT in 2010');
    expectNear(deltaTForYear(2020), 69.36, 0.005, 'ΔT in 2020');
    expectNear(deltaTForYear(2026), 69.11, 0.005, 'ΔT in 2026');
    expectNear(deltaTForYear(2025.5), 69.125, 0.005, 'ΔT in mid-2025');
  });

  it('agrees with Meeus Example 10.a: about 48 s in February 1977', () => {
    expectNear(deltaT(jdFromCalendar({ year: 1977, month: 2, day: 18 })), 48, 0.5);
  });

  it.each(BOUNDARIES)('joins up at %d', (year) => {
    expectNear(deltaTForYear(year - 1e-9), deltaTForYear(year + 1e-9), 0.5, `jump at ${year}`);
  });

  it('predicts a smooth, plausible rise from 2026 to 2050', () => {
    let previous = deltaTForYear(2026);
    for (let y = 2026.5; y <= 2050; y += 0.5) {
      const value = deltaTForYear(y);
      expect(value).toBeGreaterThan(68);
      expect(value).toBeLessThan(95);
      expect(Math.abs(value - previous)).toBeLessThan(1.5);
      previous = value;
    }
  });

  it('is defined everywhere, and takes Julian Dates', () => {
    fc.assert(
      fc.property(fc.double({ min: -500_000, max: 6_000_000, noNaN: true }), (jd) => {
        const value = deltaT(jd);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBe(deltaTForYear(julianEpoch(jd)));
      }),
    );
  });
});

describe('TT and UT', () => {
  it('turns UT into TT and back, from 3000 BC to AD 3000', () => {
    fc.assert(
      fc.property(fc.double({ min: 625_000, max: 2_817_000, noNaN: true }), (jdUT) => {
        // A Julian Date near 2.5 million resolves about 40 µs, so that's the precision to expect.
        const jdTT = ttFromUt(jdUT);
        expectNear((jdTT - jdUT) * 86_400, deltaT(jdUT), 1e-4, 'TT − UT');
        expectNear((utFromTt(jdTT) - jdUT) * 86_400, 0, 1e-4, 'round trip, s');
      }),
    );
  });
});
