import { describe, expect, it } from 'vitest';
import { checkTallestCycle } from '../src/content/checks/chapter15Answers';
import { AU } from '../src/core/constants';
import { coalLifetime, fusionLifetime, hydrogenBurnRate, kelvinHelmholtzTime, massLossRate, neutrinoFlux, toYears } from '../src/core/stars/sun';
import solarModel from '../src/data/solarModel.json';
import sunspots from '../src/data/silso/sunspots.json';
import { CONVECTION_BASE, CORE_EDGE, FUELS, layerAt, solarAt } from '../src/figures/sun';
import { BANDS, bandLatitude, CYCLES, describeCycle, meanCycleLength, meanSpotLatitude, ROTATIONS, rotationYear, tallestCycle } from '../src/figures/sunspots';
import { expectNear } from './helpers';

describe('the solar model (Model S)', () => {
  it('has the Sun’s mass, radius and luminosity and its age', () => {
    expectNear(solarModel.mass, 1.989e30, 1e27, 'mass, kg');
    expectNear(solarModel.radius / 6.957e8, 1, 0.002, 'radius');
    expectNear(solarModel.luminosity / 3.846e26, 1, 0.001, 'luminosity');
    expectNear(solarModel.age / 1e9, 4.6, 0.01, 'age, billion years');
  });

  it('has the standard centre: 15.7 million K, about 150 times water’s density, hydrogen half used', () => {
    expectNear(solarAt(0, 'T') / 1e6, 15.7, 0.1, 'central temperature, MK');
    expectNear(solarAt(0, 'rho') / 1000, 150, 6, 'central density, g/cm³');
    expectNear(solarAt(0, 'X'), 0.34, 0.02, 'hydrogen at the centre');
    expectNear(solarModel.surface.X, 0.737, 0.01, 'hydrogen at the surface');
  });

  it('makes 99% of the power inside a quarter of the radius, and convects from 0.71 outward (helioseismology: 0.713)', () => {
    expectNear(CORE_EDGE, 0.25, 0.01, 'core');
    expectNear(CONVECTION_BASE, 0.713, 0.004, 'convection zone’s base');
    expectNear(solarAt(0.5, 'm'), 0.89, 0.01, 'mass inside half the radius');
    expectNear(solarAt(1, 'T'), 5778, 30, 'surface temperature');
  });

  it('grows the mass and power inside steadily outwards, and cools outwards', () => {
    const shells = solarModel.shells;
    for (let k = 1; k < shells.length; k++) {
      expect(shells[k].m).toBeGreaterThanOrEqual(shells[k - 1].m);
      expect(shells[k].L).toBeGreaterThanOrEqual(shells[k - 1].L - 1e-4);
      expect(shells[k].T).toBeLessThan(shells[k - 1].T);
    }
  });

  it('names the layer at each depth', () => {
    expect(layerAt(0.1).id).toBe('core');
    expect(layerAt(0.5).id).toBe('radiative');
    expect(layerAt(0.9).id).toBe('convection');
    expect(layerAt(0.999).id).toBe('photosphere');
  });
});

describe('what keeps the Sun shining', () => {
  it('gives the research notes’ lifetimes: coal 5,000 years, gravity 31 million, fusion 10 billion', () => {
    expectNear(toYears(coalLifetime()), 4940, 100, 'coal, years');
    expectNear(toYears(kelvinHelmholtzTime()) / 1e6, 31.4, 0.5, 'Kelvin–Helmholtz, million years');
    expectNear(toYears(fusionLifetime()) / 1e9, 10.5, 0.5, 'fusion, billion years');
    expect(FUELS.map((f) => f.id)).toEqual(['coal', 'gravity', 'fusion']);
  });

  it('turns 4.26 million tonnes into light a second and fuses about 600 million tonnes of hydrogen', () => {
    expectNear(massLossRate() / 1e9, 4.26, 0.01, 'million tonnes a second');
    expectNear(hydrogenBurnRate() / 1e9, 600, 10, 'million tonnes of hydrogen a second');
  });

  it('sends 65 billion neutrinos through each square centimetre at Earth every second', () => {
    expectNear(neutrinoFlux(AU) / 1e4 / 1e10, 6.4, 0.2, '× 10¹⁰ per cm² per second');
  });
});

describe('the sunspot record (SILSO)', () => {
  it('runs monthly from January 1749 under SILSO’s licence', () => {
    expect(sunspots.licence).toBe('CC BY-NC 4.0');
    expect(sunspots.start).toEqual([1749, 1]);
    expect(sunspots.monthly.length).toBeGreaterThan(3300);
    expect(sunspots.smoothed.length).toBe(sunspots.monthly.length);
  });

  it('lists 25 cycles with SILSO’s minima and maxima', () => {
    expect(CYCLES.length).toBeGreaterThanOrEqual(25);
    expect(CYCLES[0].startMonth).toEqual([1755, 2]);
    const c25 = CYCLES.find((c) => c.n === 25)!;
    expect(c25.startMonth).toEqual([2019, 12]);
    expect(c25.peakMonth).toEqual([2024, 10]);
    expectNear(c25.height!, 160.9, 0.5, 'Cycle 25’s smoothed maximum');
    expect(tallestCycle().n).toBe(19);
    expect(tallestCycle().peakMonth).toEqual([1958, 3]);
    expectNear(meanCycleLength(), 11, 0.3, 'mean cycle, years');
  });

  it('agrees with its own smoothed series at each maximum', () => {
    for (const c of CYCLES.filter((x) => x.peakMonth)) {
      const [y, m] = c.peakMonth!;
      const k = (y - 1749) * 12 + (m - 1);
      expectNear(sunspots.smoothed[k], c.height!, 0.2, `Cycle ${c.n}`);
    }
  });

  it('describes a cycle', () => {
    expect(describeCycle(tallestCycle())).toMatch(/^Cycle 19 began at the minimum of April 1954 and was 10\.5 years long\. It peaked in March 1958 at a smoothed 285 sunspots, the highest since the counts began\.$/);
  });

  it('draws the butterflies: spots start near 25° and end near 10°', () => {
    expect(ROTATIONS.every((r) => r.length === BANDS)).toBe(true);
    expectNear(rotationYear(275), 1874.3, 0.1, 'rotation 275');
    expectNear(bandLatitude(BANDS - 1), 78.5, 0.5, 'the northernmost band');
    expectNear(bandLatitude(BANDS / 2), 1.1, 0.1, 'the band just north of the equator');
    // Cycle 19: the first two years against the last three.
    expect(meanSpotLatitude(1954.3, 1956)).toBeGreaterThan(20);
    expect(meanSpotLatitude(1962, 1964.8)).toBeLessThan(13);
  });

  it('marks the interactive question right for Cycle 19 only', () => {
    expect(checkTallestCycle(19).correct).toBe(true);
    expect(checkTallestCycle(25).correct).toBe(false);
    expect(checkTallestCycle(0).correct).toBe(false);
  });
});
