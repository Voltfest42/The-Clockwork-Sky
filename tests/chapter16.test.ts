import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkSmallestCloud, MASS_TOLERANCE, SMALLEST } from '../src/content/checks/chapter16Answers';
import { Random } from '../src/core/random';
import { drawCluster } from '../src/core/stellar/imf';
import {
  CLOUD_PRESETS,
  collapseReadout,
  COOLING_MASSES,
  coolingCurve,
  coolingLuminosity,
  coolingTemperature,
  dustReadout,
  formatAge,
  formatMass,
  formatParsecs,
  IMF,
  massHistogram,
  summariseCluster,
  YOUNG_STARS,
  zamsLine,
} from '../src/figures/starBirth';
import { expectNear } from './helpers';

describe('Figure 16.1, dust', () => {
  it('dims visible light more than infrared, and reddens the star', () => {
    const r = dustReadout(5772, 30);
    expect(r.vShare).toBeLessThan(1e-11);
    expect(r.kShare).toBeGreaterThan(0.03);
    expectNear(r.reddening, 30 / 3.1, 1e-9, 'E(B − V)');
    // Through dust the star's colour has relatively more red than blue.
    const clear = dustReadout(5772, 0).colour;
    expect(r.colour[0] / Math.max(1, r.colour[2])).toBeGreaterThan(clear[0] / clear[2]);
  });
});

describe('Figure 16.2, collapse or not', () => {
  const verdict = (id: string) => {
    const p = CLOUD_PRESETS.find((c) => c.id === id)!;
    return collapseReadout(p.mass, p.radius, p.kelvin, p.molecular);
  };

  it('gives each real cloud its known verdict', () => {
    expect(verdict('warm').collapses).toBe(false);
    expect(verdict('warm').balance).toBeLessThan(1e-4);
    expectNear(verdict('warm').perCm3, 0.4, 0.1, 'warm gas, per cm³');
    expectNear(verdict('cold').perCm3, 30, 10, 'cold atoms, per cm³');
    expect(verdict('cold').collapses).toBe(false);
    expect(verdict('gmc').collapses).toBe(true);
    expect(verdict('gmc').balance).toBeGreaterThan(100);
    // Barnard 68 is close to the edge: within a factor of a few either way.
    expect(verdict('b68').balance).toBeGreaterThan(0.3);
    expect(verdict('b68').balance).toBeLessThan(1);
    expect(verdict('core').collapses).toBe(true);
  });

  it('answers the interactive question: about 4.1 M☉ for 0.1 pc at 10 K', () => {
    expectNear(SMALLEST, 4.1, 0.1, 'least mass');
    expect(checkSmallestCloud(SMALLEST * 0.98).correct).toBe(false);
    expect(checkSmallestCloud(SMALLEST * 1.02).correct).toBe(true);
    expect(checkSmallestCloud(SMALLEST * (1 + MASS_TOLERANCE) * 1.05).correct).toBe(false);
  });

  it('formats masses and sizes', () => {
    expect(formatMass(2e5)).toBe('200,000 M☉');
    expect(formatMass(2.1)).toBe('2.1 M☉');
    expect(formatParsecs(0.0606)).toBe('12,500 AU');
    expect(formatParsecs(20)).toBe('20 pc');
    expect(formatAge(4.2e7)).toBe('42 million years');
    expect(formatAge(5e5)).toBe('500,000 years');
  });
});

describe('Figures 16.3 and 16.4, young stars and brown dwarfs', () => {
  it('draws the zero-age main sequence from cool and faint to hot and bright', () => {
    const line = zamsLine();
    for (let k = 1; k < line.length; k++) {
      expect(line[k][1]).toBeGreaterThan(line[k - 1][1]);
      expect(line[k][2]).toBeGreaterThan(line[k - 1][2]);
    }
    // β Pictoris (about 1.75 M☉, 20 Myr) lies close to it: within 40% in luminosity at its temperature.
    const beta = YOUNG_STARS.find((s) => s.id === 'betapic')!;
    const near = line.reduce((a, b) => (Math.abs(b[1] - beta.kelvin) < Math.abs(a[1] - beta.kelvin) ? b : a));
    expectNear(near[2] / beta.luminosity, 1, 0.4, 'β Pic against the ZAMS');
  });

  it('joins the power-law fit to the models where they stop, and keeps brown dwarfs fading', () => {
    for (const m of COOLING_MASSES) {
      const { model, fit } = coolingCurve(m);
      if (fit.length) {
        expectNear(fit[0][1] / model[model.length - 1][1], 1, 1e-9, `${m} M☉ join`);
        expect(fit[fit.length - 1][1]).toBeLessThan(fit[0][1]);
      }
    }
    expect(coolingLuminosity(0.03, 1e10)).toBeLessThan(coolingLuminosity(0.03, 1e9) / 10);
    // A star levels off: within a factor of 1.5 between 1 and 10 billion years.
    expectNear(coolingLuminosity(0.2, 1e10) / coolingLuminosity(0.2, 1e9), 1, 0.5, '0.2 M☉ levels off');
    // The coldest brown dwarfs reach the Y class (below 500 K) within the age of the Galaxy.
    expect(coolingTemperature(0.01, 1e10)).toBeLessThan(500);
  });
});

describe('Figure 16.5, a new cluster', () => {
  it('splits a cluster’s numbers, mass and light into shares that add up to one (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1e5 }), fc.integer({ min: 100, max: 3000 }), (seed, n) => {
        const s = summariseCluster(drawCluster(IMF, n, new Random(seed)));
        const sum = (k: 'number' | 'mass' | 'light') => s.shares.reduce((a, c) => a + c[k], 0);
        return s.stars === n && Math.abs(sum('number') - 1) < 1e-9 && Math.abs(sum('mass') - 1) < 1e-9 && Math.abs(sum('light') - 1) < 1e-9;
      }),
      { numRuns: 30 },
    );
  });

  it('gives a big cluster about one supernova in 160 stars, and most of its light from them', () => {
    const s = summariseCluster(drawCluster(IMF, 100000, new Random(3)));
    expectNear(s.supernovae / s.stars, 1 / 160, 0.0008, 'share over 8 M☉');
    const massive = s.shares.find((c) => c.id === 'massive')!;
    expect(massive.light).toBeGreaterThan(0.5);
    expect(massive.number).toBeLessThan(0.01);
    const red = s.shares.find((c) => c.id === 'red')!;
    expect(red.number).toBeGreaterThan(0.4);
    const bins = massHistogram(drawCluster(IMF, 1000, new Random(1)));
    expect(bins.reduce((a, b) => a + b.count, 0)).toBeGreaterThan(1000);
  });
});
