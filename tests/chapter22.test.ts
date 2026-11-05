import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { barrierHeight, gamowEnergy, gamowIntegral, gamowIntegralApprox, gamowIntegrand, gamowPeak, lnShareAboveBarrier, type NuclearPair } from '../src/core/nuclear/gamow';
import { burnHelium, heliumTemperature, tripleAlphaPower } from '../src/core/nuclear/helium';
import { balancedTemperature, coreLosses, FUELS, fuelPower, ignitionTemperature, neutrinoLosses } from '../src/core/nuclear/ignition';
import { evolveNetwork, nucleonSum, type Network } from '../src/core/nuclear/network';
import { cnApproach, cnCatalysts, crossoverTemperature, hydrogenBurning } from '../src/core/nuclear/ppcno';
import { cf88c12pg, cf88n14pg, cf88n15pa, cf88pp, decayRate, HOYLE_ABOVE_THRESHOLD, nonResonantRate, tripleAlpha } from '../src/core/nuclear/rates';
import { checkCrossover, CROSSOVER_T, CROSSOVER_TOLERANCE } from '../src/content/checks/chapter22Answers';
import { CARBON_SPREAD, STAR_15, STAR_25, yearsLeftAtStart } from '../src/data/burningStages';
import { C12P, LATE_FUELS, N14P, N15P, PP } from '../src/data/rates';
import { BODY_WATTS_PER_M3, classicalShortfall, GAMOW_REACTIONS, MAKEUPS, onionAt, stageAt, SUN_BURNING, SUN_CORE_WATTS_PER_M3 } from '../src/figures/furnace';
import solarModel from '../src/data/solarModel.json';
import { CHAPTERS } from '../src/site/course';
import { expectNear } from './helpers';

const YEAR = 3.155_76e7;
const rel = (a: number, b: number) => Math.abs(a / b - 1);
const pair = (id: string) => GAMOW_REACTIONS.find((r) => r.id === id)!;
const SUN_CENTRE = { T: solarModel.shells[0].T, rho: solarModel.shells[0].rho, X: solarModel.shells[0].X, Z: solarModel.shells[0].Z };

describe('the Gamow peak (Figure 22.1)', () => {
  it('gives the research notes’ Gamow energy for two protons: 493 keV', () => {
    expectNear(gamowEnergy(pair('pp')), 493, 1, 'E_G');
  });

  it('gives the research notes’ peaks, widths and temperature exponents', () => {
    const table: [string, number, number, number, number][] = [
      // id, T, E₀ (keV), width (keV), ν
      ['pp', 15.7e6, 6.1, 6.6, 3.8],
      ['pc', 20e6, 29, 16, 16],
      ['pn', 20e6, 32, 17, 18],
      ['cc', 0.8e9, 2100, 880, 30],
      ['oo', 2e9, 6200, 2400, 35],
    ];
    for (const [id, T, E0, width, nu] of table) {
      const g = gamowPeak(pair(id), T);
      expect(rel(g.E0, E0), `${id} E₀ ${g.E0}`).toBeLessThan(0.03);
      expect(rel(g.width, width), `${id} width ${g.width}`).toBeLessThan(0.04);
      expect(Math.abs(g.nu - nu), `${id} ν ${g.nu}`).toBeLessThan(0.6);
    }
  });

  it('two protons at the Sun’s centre: kT = 1.35 keV, tunnelling at the peak 1 in 8,100, nearly 1 MeV of barrier', () => {
    const g = gamowPeak(pair('pp'), 15.7e6);
    expectNear(g.kT, 1.353, 0.002, 'kT');
    expectNear(1 / g.tunnellingAtPeak, 8100, 150, '1/P');
    expectNear(barrierHeight(pair('pp')), 857, 1, 'barrier');
    expectNear(g.E0 / g.kT, 4.5, 0.05, 'E₀/kT');
  });

  it('classically, a share e^−630 ≈ 10^−274 of pairs could climb the barrier, and fusion would be 10^270 times slower', () => {
    expectNear(lnShareAboveBarrier(pair('pp'), 15.7e6), -630, 1, 'ln share');
    expectNear(classicalShortfall(pair('pp'), 15.7e6), 270, 1, 'shortfall');
  });

  it('a 10% hotter core burns by the pp chains 45% faster and carbon 17 times faster, as the chapter says', () => {
    expectNear(1.1 ** gamowPeak(pair('pp'), 15.7e6).nu, 1.45, 0.02, 'pp');
    expectNear(1.1 ** gamowPeak(pair('cc'), 0.8e9).nu, 17, 0.8, 'carbon');
  });

  it('the peak is where the integrand is largest, and its area matches the Gaussian approximation to 1 + 5/12τ (property)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...GAMOW_REACTIONS), fc.double({ min: 0, max: 1, noNaN: true }), (p: NuclearPair & { T: number }, f) => {
        const T = p.T * 0.5 * 4 ** f;
        const g = gamowPeak(p, T);
        const peak = gamowIntegrand(p, g.E0, T);
        expect(peak).toBeGreaterThanOrEqual(gamowIntegrand(p, g.E0 * 0.9, T));
        expect(peak).toBeGreaterThanOrEqual(gamowIntegrand(p, g.E0 * 1.1, T));
        const ratio = gamowIntegral(p, T) / gamowIntegralApprox(p, T);
        expect(Math.abs(ratio / (1 + 5 / (12 * g.tau)) - 1)).toBeLessThan(0.01);
      }),
      { numRuns: 40 },
    );
  });
});

describe('reaction rates', () => {
  it('rates from S-factors match Caughlan & Fowler’s fits within 15% at 10–30 million K, and ¹⁴N + p is about half of theirs, as LUNA found', () => {
    for (const T of [10e6, 15e6, 20e6, 25e6, 30e6]) {
      expect(rel(nonResonantRate(PP, T), cf88pp(T)), `pp at ${T}`).toBeLessThan(0.15);
      expect(rel(nonResonantRate(C12P, T), cf88c12pg(T)), `¹²C + p at ${T}`).toBeLessThan(0.15);
      expect(rel(nonResonantRate(N15P, T), cf88n15pa(T)), `¹⁵N + p at ${T}`).toBeLessThan(0.15);
      const n14 = nonResonantRate(N14P, T) / cf88n14pg(T);
      expect(n14).toBeGreaterThan(0.45);
      expect(n14).toBeLessThan(0.65);
    }
  });

  it('the triple-alpha rate climbs as T⁴¹ at 100 million K, and the Hoyle state speeds it 480 times there', () => {
    const nu = Math.log(tripleAlpha(1.001e8) / tripleAlpha(0.999e8)) / Math.log(1.001 / 0.999);
    expectNear(nu, 41, 1, 'ν');
    expectNear(1.02 ** nu, 2.25, 0.1, 'a core 2% hotter');
    const r = tripleAlpha(1e8) / tripleAlpha(1e8, { noHoyle: true });
    expect(r).toBeGreaterThan(300);
    expect(r).toBeLessThan(700);
  });

  it('moving the Hoyle state 60 keV up slows triple-alpha some 300 times at 100 million K (its own term a thousandfold, leaving the off-resonance part)', () => {
    expectNear(tripleAlpha(1e8) / tripleAlpha(1e8, { hoyleShift: 0.06 }), 330, 30, 'slow-down');
    expectNear(HOYLE_ABOVE_THRESHOLD, 0.3795, 0.001, 'the Hoyle state above three α');
  });
});

describe('the reaction network', () => {
  const decay: Network = { species: ['A', 'B'], mass: [1, 1], reactions: [{ from: [0], to: [1], k: 1 }] };

  it('a decay follows e^(−t) and keeps its nucleons', () => {
    const run = evolveNetwork(decay, [1, 0], 5, { tFirst: 0.01, points: 400 });
    for (let i = 1; i < run.t.length; i++) {
      expect(Math.abs(run.Y[i][0] - Math.exp(-run.t[i])), `at t = ${run.t[i]}`).toBeLessThan(0.03);
      expectNear(nucleonSum(decay, run.Y[i]), 1, 1e-12, 'Σ A·Y');
    }
  });

  it('helium burning keeps every nucleon, and its core ends hotter as the helium runs low (property over the Hoyle state)', () => {
    fc.assert(
      fc.property(fc.double({ min: -0.08, max: 0.08, noNaN: true }), (shift) => {
        const a = burnHelium(1e7, 1e8, { hoyleShift: shift });
        for (const h of a.history) expectNear(h.X[0] + h.X[1] + h.X[2] + h.X[3], 1, 1e-8, 'mass fractions');
        // It may dip a little early on, while carbon's own captures of helium add to the power.
        expect(a.endT).toBeGreaterThan(a.startT * 1.2);
        expect(Math.min(...a.history.map((h) => h.T))).toBeGreaterThan(a.startT * 0.97);
      }),
      { numRuns: 12 },
    );
  });

  it('the CN cycle settles into the steady balance, keeping its catalysts, with ¹²C/¹³C ≈ 3.5 and 99.7% of them nitrogen', () => {
    const run = cnApproach(SUN_CENTRE, 1e10, 60);
    for (const s of run.shares) expectNear(s.reduce((a, b) => a + b, 0), 1, 1e-9, 'catalysts');
    const end = run.shares[run.shares.length - 1];
    const h = hydrogenBurning(SUN_CENTRE);
    const total = cnCatalysts(SUN_CENTRE.Z);
    expect(rel(end[0], h.abundances.c12 / 12 / total)).toBeLessThan(0.02);
    expect(rel(end[3], h.abundances.n14 / 14 / total)).toBeLessThan(0.001);
    const ratio = h.abundances.c12 / 12 / (h.abundances.c13 / 13);
    expect(ratio).toBeGreaterThan(3.3);
    expect(ratio).toBeLessThan(3.9);
    expect(end[3]).toBeGreaterThan(0.99);
  });
});

describe('hydrogen burning (Figure 22.2)', () => {
  it('makes Model S’s burning rate at the Sun’s centre within 5%, 94% of it by the pp chains', () => {
    const h = hydrogenBurning(SUN_CENTRE);
    expect(rel(h.ppPower + h.cnoPower, solarModel.shells[0].eps)).toBeLessThan(0.05);
    expectNear(h.ppPower / (h.ppPower + h.cnoPower), 0.94, 0.01, 'pp share');
  });

  it('added up over Model S, gives the Sun’s luminosity within 10%: ppI 85%, ppII 15%, ppIII 0.02%, CNO under 1%', () => {
    expectNear(SUN_BURNING.luminosity, 1, 0.1, 'L');
    expectNear(SUN_BURNING.ppI, 0.85, 0.02, 'ppI');
    expectNear(SUN_BURNING.ppII, 0.15, 0.02, 'ppII');
    expect(SUN_BURNING.ppIII).toBeGreaterThan(1e-4);
    expect(SUN_BURNING.ppIII).toBeLessThan(3e-4);
    expect(SUN_BURNING.cno).toBeLessThan(0.01);
  });

  it('the waits the chapter quotes at the Sun’s centre: a proton six billion years, a deuteron a second or two, ³He 150,000 years, ⁷Be months, ¹⁴N 300 million years', () => {
    const w = Object.fromEntries(hydrogenBurning(SUN_CENTRE).steps.map((s) => [s.id, s.wait]));
    expectNear(w.pp / YEAR / 1e9, 6, 0.4, 'proton');
    expect(w.dp).toBeGreaterThan(0.5);
    expect(w.dp).toBeLessThan(2.5);
    expectNear(w['33'] / YEAR, 150_000, 15_000, '³He');
    expect(w.ec / YEAR).toBeGreaterThan(0.1);
    expect(w.ec / YEAR).toBeLessThan(0.5);
    expectNear(w.n14p / YEAR / 1e8, 3, 0.3, '¹⁴N');
    for (const id of ['c12p', 'c13p', 'n15p']) expect(w[id] / YEAR, id).toBeLessThan(1e6);
  });

  it('neutrinos take about 2% of ppI’s energy and 6% of CNO’s', () => {
    const h = hydrogenBurning({ T: 12e6, rho: 1e5, X: 0.7, Z: 0.02 });
    expectNear(h.neutrinoShare.pp, 0.02, 0.003, 'pp');
    expectNear(h.neutrinoShare.cno, 0.064, 0.002, 'CNO');
  });

  it('CNO climbs as about T¹⁸ at 20 million K, and overtakes the pp chains near 20 million K', () => {
    const at = (T: number) => hydrogenBurning({ T, rho: 1e5, X: 0.7, Z: 0.02 }).cnoPower;
    const nu = Math.log(at(20.02e6) / at(19.98e6)) / Math.log(20.02 / 19.98);
    expectNear(nu, 18, 1.5, 'ν');
    const newborn = MAKEUPS.find((m) => m.id === 'newborn')!;
    const T = crossoverTemperature(newborn.rho, newborn.X, newborn.Z);
    expectNear(T, CROSSOVER_T, 0.1e6, 'crossover');
    expectNear(crossoverTemperature(SUN_CENTRE.rho, SUN_CENTRE.X, SUN_CENTRE.Z), 19.3e6, 0.3e6, 'at the Sun’s centre’s make-up');
  });

  it('the CNO cycle’s share only grows with temperature (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 10e6, max: 29e6, noNaN: true }), fc.double({ min: 0.1e6, max: 1e6, noNaN: true }), (T, dT) => {
        const a = hydrogenBurning({ T, rho: 1e5, X: 0.7, Z: 0.02 });
        const b = hydrogenBurning({ T: T + dT, rho: 1e5, X: 0.7, Z: 0.02 });
        expect(b.cnoPower / b.ppPower).toBeGreaterThan(a.cnoPower / a.ppPower);
      }),
      { numRuns: 50 },
    );
  });

  it('the Sun’s centre makes about 260 W/m³, a fifth of a resting body’s', () => {
    expectNear(SUN_CORE_WATTS_PER_M3, 262, 10, 'W/m³');
    expectNear(SUN_CORE_WATTS_PER_M3 / BODY_WATTS_PER_M3, 0.18, 0.02, 'ratio');
  });

  it('the interactive question’s answer', () => {
    expect(checkCrossover({ T: CROSSOVER_T }).correct).toBe(true);
    expect(checkCrossover({ T: CROSSOVER_T + CROSSOVER_TOLERANCE * 0.9 }).correct).toBe(true);
    expect(checkCrossover({ T: 17e6 }).correct).toBe(false);
    expect(checkCrossover({ T: 23e6 }).correct).toBe(false);
  });
});

describe('helium burning (Figure 22.3)', () => {
  it('nature’s Hoyle state burns the toy core from 112 to 156 million K and leaves about a fifth carbon', () => {
    const a = burnHelium(1e7, 1e8);
    expectNear(a.startT, 1.12e8, 0.02e8, 'start');
    expectNear(a.endT, 1.56e8, 0.05e8, 'end');
    expect(a.C).toBeGreaterThan(0.15);
    expect(a.C).toBeLessThan(0.3);
    expectNear(a.years / 1e8, 1, 0.15, 'years');
  });

  it('60 keV higher leaves almost no carbon; 60 keV lower, almost all carbon; no Hoyle state, none, with oxygen and neon', () => {
    expect(burnHelium(1e7, 1e8, { hoyleShift: 0.06 }).C).toBeLessThan(0.01);
    expect(burnHelium(1e7, 1e8, { hoyleShift: -0.06 }).C).toBeGreaterThan(0.85);
    const none = burnHelium(1e7, 1e8, { noHoyle: true });
    expect(none.C).toBeLessThan(1e-3);
    expect(none.Ne).toBeGreaterThan(0.3);
    expectNear(none.startT, 1.6e8, 0.05e8, 'how hot without it');
  });

  it('the starting temperature burns half the helium in 100 million years by triple-alpha', () => {
    const T = heliumTemperature(1e7, 1e8);
    const power = tripleAlphaPower(1e7, T);
    // Half the helium's triple-alpha energy (7.275 MeV per 12 nucleons) over 100 million years, roughly: a check on the units.
    // With a rate ∝ Y³, the starting power is exactly three times the average over the first half: a check on the units.
    const halfEnergy = (0.5 * 7.275e6 * 1.602_176_634e-19 * 6.022_140_76e23 * 1000) / 12;
    expectNear((power * 1e8 * YEAR) / halfEnergy, 3, 0.01, 'P₀ t½ / E½');
  });
});

describe('the last days of a massive star (Figure 22.4)', () => {
  it('the late fuels light within about 10% of Woosley, Heger & Weaver’s balanced-power temperatures', () => {
    for (const f of ['C', 'Ne', 'O', 'Si'] as const) {
      const T = balancedTemperature(f) / 1e9;
      expect(rel(T, LATE_FUELS[f].balancedT9), `${f}: ${T}`).toBeLessThan(0.12);
    }
  });

  it('every published stage burns at or past its fuel’s ignition line, and in cores dense enough to burn them, each fuel lights hotter than the last', () => {
    for (const star of [STAR_15, STAR_25]) {
      for (const s of star.stages) expect(s.T, `${star.mass} M☉ ${s.fuel}`).toBeGreaterThanOrEqual(ignitionTemperature(s.fuel, s.rho));
    }
    for (const rho of [1e6, 1e8, 1e10]) {
      const Ts = FUELS.map((f) => ignitionTemperature(f.id, rho));
      for (let i = 1; i < Ts.length; i++) expect(Ts[i], `${FUELS[i].id} at ${rho}`).toBeGreaterThan(Ts[i - 1]);
    }
  });

  it('the Sun’s centre is past hydrogen’s line, and burning there pays for more than its losses', () => {
    expect(SUN_CENTRE.T).toBeGreaterThan(ignitionTemperature('H', SUN_CENTRE.rho));
    expect(fuelPower('H', SUN_CENTRE.rho, SUN_CENTRE.T)).toBeGreaterThan(coreLosses(SUN_CENTRE.rho, SUN_CENTRE.T));
  });

  it('pair neutrinos per gram rise about 30,000 times from carbon to silicon burning, as the stages shrink', () => {
    const c = STAR_15.stages[2];
    const si = STAR_15.stages[5];
    const rise = neutrinoLosses(si.rho, si.T) / neutrinoLosses(c.rho, c.T);
    expect(rise).toBeGreaterThan(1e4);
    expect(rise).toBeLessThan(1e5);
    expect(c.years / si.years).toBeGreaterThan(1e4);
  });

  it('Table I as the chapter quotes it, and the clock’s stages in order', () => {
    expect(STAR_15.stages.map((s) => s.years)).toEqual([11.1e6, 1.97e6, 2.03e3, 0.732, 2.58, 18.3 / 365.25]);
    expectNear(STAR_25.stages[5].years * 365.25 * 24, 17.6, 0.1, '25 M☉ silicon, hours');
    expectNear(STAR_15.stages[2].years / STAR_25.stages[2].years, 3.9, 0.1, 'carbon, 15 vs 25');
    expectNear(STAR_25.stages[2].rho / STAR_15.stages[2].rho, 0.54, 0.01, 'half as dense');
    expect(CARBON_SPREAD).toBe(3);
    for (const star of [STAR_15, STAR_25]) {
      const starts = yearsLeftAtStart(star);
      for (let i = 1; i < starts.length; i++) expect(starts[i]).toBeLessThan(starts[i - 1]);
      starts.forEach((t, i) => expect(stageAt(star, t * 0.999)).toBe(i));
    }
    const lum = STAR_15.luminosities!;
    expectNear(lum[3].neutrinos / lum[3].photons, 1000, 10, 'carbon runs out');
    expect(lum[5].neutrinos / lum[5].photons).toBeGreaterThan(1e6);
  });

  it('the onion’s layers nest, outermost first, and only the collapse has iron', () => {
    for (const star of [STAR_15, STAR_25]) {
      for (let stage = 0; stage <= 6; stage++) {
        const layers = onionAt(star, stage);
        for (let i = 1; i < layers.length; i++) expect(layers[i].outer).toBeLessThan(layers[i - 1].outer);
        expect(layers.some((l) => l.id === 'Fe')).toBe(stage === 6);
      }
    }
  });
});

describe('the registry', () => {
  it('Chapter 22 is written', () => {
    expect(CHAPTERS.find((c) => c.number === 22)!.load).toBeDefined();
  });
});

it('decayRate is ln 2 over the half-life', () => {
  expectNear(decayRate(10), Math.LN2 / 10, 1e-15);
});
