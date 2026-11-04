import { describe, expect, it } from 'vitest';
import { G, M_SUN, R_SUN } from '../src/core/constants';
import { centralPressureEstimate, centralTemperatureEstimate } from '../src/core/structure/estimates';
import { acceptedIndices, checkSunIndex, sunCentralDensity } from '../src/content/checks/chapter20Answers';
import { CONTRACTION_PREDICTIONS, CONTRACTION_PRESETS, contractionOf, energyShares, outcomeText } from '../src/figures/contraction';
import {
  CENTRE_STARS,
  ESTIMATE_MU,
  formatDensity,
  formatSolarMass,
  MODEL_S_MASS,
  pressureSlope,
  RECIPES,
  runRecipe,
  solar,
  solarGravitationalEnergy,
  solarShells,
  SUN_CENTRE,
  weightAbove,
  weightPerMetre,
} from '../src/figures/holding';
import { fragmentationAt } from '../src/core/structure/fragmentation';
import { CHAPTERS, TOOLKIT } from '../src/site/course';
import { expectNear } from './helpers';

const YEAR = 365.25 * 86400;

describe('Model S holds itself up (Figure 20.1 and Toolkit T8)', () => {
  it('the weight of the gas above each square metre equals the pressure, to 1%, at every depth', () => {
    for (let x = 0.05; x <= 0.95; x += 0.05) expectNear(weightAbove(x) / solar(x, 'P'), 1, 0.01, `at ${x.toFixed(2)} R☉`);
  });

  it('the pressure falls outward by the weight of each cubic metre, ρg, to 1%', () => {
    for (const x of [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9]) expectNear(-pressureSlope(x) / weightPerMetre(x), 1, 0.01, `at ${x} R☉`);
  });

  it('the Sun’s gravitational energy is 1.6 GM²/R', () => {
    expectNear(-solarGravitationalEnergy() / ((G * M_SUN ** 2) / R_SUN), 1.61, 0.01, 'Ω');
  });
});

describe('the Sun, shell by shell (Toolkit T9)', () => {
  it('converges on one solar mass as the shells get thinner', () => {
    const sum = (n: number) => solarShells(n).reduce((a, s) => a + s.mass, 0) / MODEL_S_MASS;
    expect(Math.abs(sum(1) - 1)).toBeGreaterThan(0.2);
    expect(Math.abs(sum(50) - 1)).toBeLessThan(Math.abs(sum(5) - 1));
    expectNear(sum(200), 1, 0.005, '200 shells');
    // With twenty shells or more, the heaviest is well away from the centre.
    const shells = solarShells(20);
    const heaviest = shells.reduce((a, s) => (s.mass > a.mass ? s : a));
    expect(heaviest.mid).toBeGreaterThan(0.1);
    expect(heaviest.mid).toBeLessThan(0.3);
  });
});

describe('the rough sums (Figure 20.1 and Toolkit T11)', () => {
  it('get the Sun’s central temperature within 15% and its pressure within a factor of 25', () => {
    const t = centralTemperatureEstimate(M_SUN, R_SUN, ESTIMATE_MU);
    expectNear(t / SUN_CENTRE.T, 0.89, 0.02, 'temperature');
    const p = centralPressureEstimate(M_SUN, R_SUN);
    expectNear(SUN_CENTRE.P / p, 21, 1, 'pressure');
  });

  it('get Jupiter’s pressure about right but its temperature several times too high', () => {
    const j = CENTRE_STARS.find((s) => s.id === 'jupiter')!;
    const p = centralPressureEstimate(j.mass * M_SUN, j.radius * R_SUN);
    const t = centralTemperatureEstimate(j.mass * M_SUN, j.radius * R_SUN, ESTIMATE_MU);
    expect(p / j.truth!.P).toBeGreaterThan(1);
    expect(p / j.truth!.P).toBeLessThan(3);
    expectNear(t / j.truth!.T, 6.7, 0.3, 'seven times too hot');
  });

  it('builds each recipe’s estimate from its factors, landing between twice and a twenty-second of the truth', () => {
    const want: Record<string, [number, number]> = {
      pressure: [1.13e15, 0.02e15],
      temperature: [1.4e7, 0.02e7],
      'free-fall': [54.3 * 60, 60],
      'kelvin-helmholtz': [31.4e6 * YEAR, 0.3e6 * YEAR],
      photon: [5116 * YEAR, 10 * YEAR],
    };
    for (const r of RECIPES) {
      const { value, running } = runRecipe(r);
      expect(running).toHaveLength(r.factors.length);
      expectNear(value, want[r.id][0], want[r.id][1], r.id);
      const ratio = r.truth.value / value;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(22);
    }
    expectNear(RECIPES.find((r) => r.id === 'kelvin-helmholtz')!.truth.value / YEAR / 1e6, 25.3, 0.3, 'careful Kelvin–Helmholtz');
    expectNear(RECIPES.find((r) => r.id === 'free-fall')!.truth.value / 60, 29.5, 0.2, 'careful free fall');
  });
});

describe('the star that heats as it cools (Figure 20.2)', () => {
  it('lights the Sun and the red dwarf, and leaves the brown dwarf and 15 Jupiters as failed stars', () => {
    const outcomes = Object.fromEntries(CONTRACTION_PRESETS.map((p) => [p.id, contractionOf(p.mass).outcome]));
    expect(outcomes).toEqual({ sun: 'ignites', 'red-dwarf': 'ignites', 'brown-dwarf': 'brown-dwarf', 'planet-mass': 'brown-dwarf' });
    expect(outcomeText(contractionOf(1))).toMatch(/^Hydrogen ignites when the centre reaches 1\d(\.\d)? million K, after [3-7]\d million years of shrinking/);
    expect(outcomeText(contractionOf(0.05))).toMatch(/^It never gets hot enough to fuse hydrogen\. Its centre peaks at 1\.\d million K/);
  });

  it('shares gravity’s energy out: half and half while the gas is ideal, and all of it accounted for', () => {
    const t = contractionOf(1);
    const early = energyShares(t, t.states[10]);
    expectNear(early.heat, 0.5, 0.005, 'heat');
    expectNear(early.radiated, 0.5, 0.005, 'light');
    for (const s of t.states.slice(1)) {
      const e = energyShares(t, s);
      expectNear(e.heat + e.packing + e.radiated, 1, 1e-9, 'all of it');
    }
    expect(CONTRACTION_PREDICTIONS.filter((p) => p.correct).map((p) => p.id)).toEqual(['heats']);
  });
});

describe('fragmentation (Figure 20.3)', () => {
  it('reads its numbers out plainly', () => {
    expect(formatSolarMass(1000)).toBe('1,000 M☉');
    expect(formatSolarMass(0.01)).toBe('0.01 M☉ (10 Jupiters)');
    expect(formatDensity(2.9e9)).toBe('2.9 × 10⁹ per cm³');
    expect(formatDensity(300)).toBe('300 per cm³');
    expect(fragmentationAt(10, 1).levels).toBe(0);
  });
});

describe('Chapter 20’s interactive question', () => {
  it('accepts the indices whose centre is within 15% of the Sun’s 154 g/cm³: about 3.27 to 3.40', () => {
    const [lo, hi] = acceptedIndices();
    expectNear(lo, 3.27, 0.02, 'lowest');
    expectNear(hi, 3.4, 0.02, 'highest');
    expect(checkSunIndex({ n: 3.3 }).correct).toBe(true);
    expect(checkSunIndex({ n: 3 }).correct).toBe(false);
    expect(checkSunIndex({ n: 4 }).correct).toBe(false);
    expect(sunCentralDensity(3) / 1000).toBeCloseTo(76.4, 0);
  });
});

describe('the registry', () => {
  it('has Chapter 20 and its three Toolkit pages written', () => {
    expect(CHAPTERS[19].load).toBeDefined();
    for (const slug of ['rates-of-change', 'adding-up-small-pieces', 'estimating-with-orders-of-magnitude']) {
      expect(TOOLKIT.find((t) => t.slug === slug)!.load, slug).toBeDefined();
    }
  });
});
