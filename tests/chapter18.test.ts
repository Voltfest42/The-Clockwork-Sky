import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkLightestNeutronStar, lightestNeutronStar } from '../src/content/checks/chapter18Answers';
import { fateCurve } from '../src/core/stellar/lives';
import {
  coolingTrack,
  DARK_PAIRS,
  darkOrbit,
  faintestCoolingAge,
  fateChanges,
  formatKg,
  generationBudget,
  horizonDiameter,
  SCALE_THINGS,
  teaspoon,
  velocityMeasurements,
  weighCompanion,
  zoomWidth,
} from '../src/figures/starDeaths';
import { expectNear } from './helpers';

const thing = (id: string) => SCALE_THINGS.find((t) => t.id === id)!;

describe('Figure 18.1, white dwarfs as clocks', () => {
  it('fades along every track', () => {
    for (const m of [0.5, 0.6, 1.2]) {
      const t = coolingTrack(m);
      for (let i = 1; i < t.length; i++) expect(t[i][2]).toBeLessThan(t[i - 1][2]);
    }
  });

  it('dates the faintest white dwarfs in the disc at about 9 billion years', () => {
    expectNear(faintestCoolingAge() / 1000, 9, 1, 'Gyr');
  });
});

describe('Figure 18.2, dead stars to scale', () => {
  it('gives black holes horizons of about 3 km per solar mass', () => {
    expectNear(horizonDiameter(1), 5.9, 0.05, 'the Sun');
    expectNear(horizonDiameter(10), 59, 0.5, '10 Suns');
  });

  it('weighs teaspoons: Earth’s rock in grams, Sirius B in tonnes, a neutron star in billions of tonnes', () => {
    expectNear(teaspoon(3.0e-6, 12_742), 0.0277, 0.002, 'Earth, kg');
    const wd = teaspoon(thing('sirius-b').mass!, thing('sirius-b').size);
    expect(wd).toBeGreaterThan(1e4);
    expect(wd).toBeLessThan(2e4);
    expect(formatKg(teaspoon(1.4, 24))).toBe('1.9 billion tonnes');
    expect(thing('sirius-b').size).toBeLessThan(thing('earth').size);
  });

  it('zooms from 40,000 km to 120 km', () => {
    expect(zoomWidth(0)).toBe(40_000);
    expectNear(zoomWidth(1), 120, 1e-9, 'close');
  });
});

describe('Figure 18.3, weigh the invisible companion', () => {
  const pair = (id: string) => DARK_PAIRS.find((p) => p.id === id)!;

  it('reproduces the measured swings of Gaia BH1 (66.7 km/s) and Cygnus X-1 (about 75)', () => {
    expectNear(weighCompanion(darkOrbit(pair('gaia-bh1'))).k, 66.7, 1.3, 'Gaia BH1');
    expectNear(weighCompanion(darkOrbit(pair('cyg-x1'))).k, 75, 3, 'Cygnus X-1');
  });

  it('finds the black holes too heavy for neutron stars, and the light companions light', () => {
    for (const id of ['gaia-bh1', 'gaia-bh3', 'cyg-x1']) expect(weighCompanion(darkOrbit(pair(id))).verdict, id).toBe('black-hole');
    for (const id of ['white-dwarf', 'red-dwarf']) expect(weighCompanion(darkOrbit(pair(id))).verdict, id).toBe('light');
  });

  it('never weighs the companion at more than it is', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.3, max: 3, noNaN: true }),
        fc.double({ min: 0.1, max: 40, noNaN: true }),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 5, max: 90, noNaN: true }),
        (m1, m2, period, i) => {
          const r = weighCompanion({ m1, m2, period, e: 0, i, omega: 0 });
          expect(r.f).toBeLessThanOrEqual(m2 * (1 + 1e-9));
          expect(r.minimum).toBeLessThanOrEqual(m2 * (1 + 1e-6));
          if (i > 89.9) expectNear(r.minimum / m2, 1, 1e-4, 'edge-on');
        },
      ),
    );
  });

  it('measures on the same nights every time', () => {
    const o = darkOrbit(pair('gaia-bh1'));
    expect(velocityMeasurements(o)).toEqual(velocityMeasurements(o));
  });
});

describe('Figure 18.4, the fork in the road', () => {
  it('goes from brown dwarfs to black holes in order at the Sun’s make-up', () => {
    const kinds = fateChanges(fateCurve(0.02, {}, 60, 150)).map((c) => c.to);
    expect(kinds).toEqual(['helium-wd', 'co-wd', 'one-wd', 'neutron-star', 'black-hole']);
  });
});

describe('Stardust', () => {
  it('returns about two-fifths of a generation’s mass to space in 10 billion years, and locks an eighth in remnants', () => {
    const b = generationBudget(10000);
    expectNear(b.returned, 0.4, 0.04, 'returned');
    expectNear(b.locked, 0.13, 0.03, 'locked');
    expectNear(b.returned + b.locked + b.living, 1, 1e-12, 'sum');
  });
});

describe('Check yourself: the lightest star that leaves a neutron star', () => {
  it('is about 8 Suns, and the answer accepts it and a little above', () => {
    const edge = lightestNeutronStar();
    expectNear(edge, 8, 0.3, 'boundary');
    expect(checkLightestNeutronStar(Math.ceil(edge * 10) / 10).correct).toBe(true);
    expect(checkLightestNeutronStar(7).correct).toBe(false);
    expect(checkLightestNeutronStar(12).correct).toBe(false);
  });
});
