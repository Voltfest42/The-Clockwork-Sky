import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { G, L_SUN, M_SUN } from '../src/core/constants';
import { computeStellar, MODEL_S_MASS_SOLAR, SUN_TODAY_HYDROGEN } from '../src/core/stellar/requests';
import { burningRate, cnoRate, ppRate, temperatureExponent } from '../src/core/structure/burning';
import { adiabaticGradient, densityFor, gamma1, totalPressure } from '../src/core/structure/eos';
import { ionisation, partialAdiabaticGradient, partialDensity, partialPressure, stellarGas } from '../src/core/structure/ionisation';
import { dominantOpacity, electronScattering, opacity, textbookOpacity } from '../src/core/structure/opacity';
import { diffusionTime, randomWalk, rmsDistances, stepsToEscape } from '../src/core/structure/randomWalk';
import { buildStar, mainSequence, startingGuess, type StarModel } from '../src/core/structure/zams';
import { checkTwoSuns, TWO_SUNS_LUMINOSITY, TWO_SUNS_TOLERANCE } from '../src/content/checks/chapter21Answers';
import { CONVECTION_BASE, convectiveCentre, ESCAPE_RANGE, SUN_ESCAPE, SUN_SHELLS, zonesInWords } from '../src/figures/energy';
import { CENTRE_STARS, SIRIUS_A_CENTRE, SUN_CENTRE } from '../src/figures/holding';
import { DEBCAT_STARS } from '../src/figures/massLuminosity';
import { zcnsts } from '../src/core/stellar/sse/zcnsts';
import { lzamsf, rzamsf } from '../src/core/stellar/sse/zfuncs';
import { CANNON_TARGETS, cannonTry, DWARF, dwarfFrom, dwarfTry, FIRST_TRIES, secant, type ShotTry } from '../src/figures/shooting';
import { famousStar } from '../src/data/stars';
import solarModel from '../src/data/solarModel.json';
import { CHAPTERS, TOOLKIT } from '../src/site/course';
import { expectNear } from './helpers';

const SUN_MIX = { X: 0.7, Z: 0.02 };
const rel = (a: number, b: number) => Math.abs(a / b - 1);

describe('Model S’s new columns', () => {
  it('has the opacity, burning rate, Γ₁ and gradients at every shell', () => {
    for (const s of solarModel.shells)
      for (const k of ['kappa', 'eps', 'gamma1', 'nablaAd', 'nabla', 'nablaRad'] as const) expect(Number.isFinite(s[k]), `${k} at ${s.r}`).toBe(true);
  });

  it('its actual gradient follows radiation’s inside 0.7 R and the adiabat outside 0.72 R, as Schwarzschild’s criterion says', () => {
    for (const s of SUN_SHELLS.filter((q) => q.x > 0.02 && q.x < 0.69)) expectNear(s.nabla / s.nablaRad, 1, 0.03, `radiative at ${s.x}`);
    for (const s of SUN_SHELLS.filter((q) => q.x > 0.72 && q.x < 0.99)) expectNear(s.nabla / s.nablaAd, 1, 0.01, `adiabatic at ${s.x}`);
    expectNear(CONVECTION_BASE, 0.713, 0.003, 'the base of the convection zone');
  });

  it('Γ₁ is 5/3 inside and dips where hydrogen and helium ionise', () => {
    expectNear(SUN_SHELLS[0].gamma1, 5 / 3, 0.01, 'centre');
    expect(Math.min(...SUN_SHELLS.map((s) => s.gamma1))).toBeLessThan(1.35);
  });
});

describe('opacity (Figure 21.2)', () => {
  it('electron scattering is 0.35 cm²/g for the Sun’s X = 0.74', () => {
    expectNear(electronScattering({ X: 0.74, Z: 0.02 }) * 10, 0.348, 0.001, 'κ_es');
  });

  it('follows Model S’s tables within about 20% through the radiative zone, where the textbook fits miss by up to 2.5 times', () => {
    let worstFit = 0;
    let worstBook = 0;
    for (const s of SUN_SHELLS.filter((q) => q.x < 0.71)) {
      const mix = { X: s.X, Z: s.Z };
      worstFit = Math.max(worstFit, Math.abs(Math.log(opacity(s.rho, s.T, mix) / s.kappa)));
      worstBook = Math.max(worstBook, Math.abs(Math.log(textbookOpacity(s.rho, s.T, mix) / s.kappa)));
    }
    expect(Math.exp(worstFit)).toBeLessThan(1.23);
    expect(Math.exp(worstBook)).toBeGreaterThan(2.3);
  });

  it('names the right source in each corner: electrons hot and thin, ions in the Sun’s middle, H⁻ at its surface', () => {
    expect(dominantOpacity(1e-6, 1e8, SUN_MIX)).toBe('electron');
    expect(dominantOpacity(1e3, 3e6, SUN_MIX)).toBe('bound-free');
    expect(dominantOpacity(3e-4, 5800, SUN_MIX)).toBe('h-minus');
    expect(dominantOpacity(1e-3, 1500, SUN_MIX)).toBe('molecules');
    expect(dominantOpacity(1e3, 3e6, { X: 0.75, Z: 1e-4 })).toBe('free-free');
  });

  it('rises with density and, in the Kramers region, falls with temperature (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 5.2, max: 7.3, noNaN: true }), fc.double({ min: -4, max: 2, noNaN: true }), (logT, logRho) => {
        const T = 10 ** logT;
        const rho = 10 ** logRho * 1000;
        return opacity(rho * 1.1, T, SUN_MIX) > opacity(rho, T, SUN_MIX) && opacity(rho, T * 1.1, SUN_MIX) < opacity(rho, T, SUN_MIX);
      }),
    );
  });
});

describe('burning (pp and CNO)', () => {
  it('matches Model S’s burning rate within 30% through the core', () => {
    for (const s of solarModel.shells.filter((q) => q.r <= 0.2)) {
      const mine = burningRate(s.rho, s.T, { X: s.X, Z: s.Z });
      expectNear(mine / s.eps, 0.9, 0.2, `at ${s.r}`);
    }
  });

  it('climbs as about T⁴ for pp at the Sun’s centre and T¹⁷ for CNO at 20 million K', () => {
    expectNear(temperatureExponent(ppRate, SUN_CENTRE.rho, SUN_CENTRE.T, SUN_MIX), 4, 0.3, 'ν_pp');
    expectNear(temperatureExponent(cnoRate, 7e4, 2e7, SUN_MIX), 17, 1.5, 'ν_CNO');
  });

  it('CNO overtakes pp near 17–18 million K at Sun-like density', () => {
    const at = (T: number) => cnoRate(8e4, T, SUN_MIX) - ppRate(8e4, T, SUN_MIX);
    expect(at(1.6e7)).toBeLessThan(0);
    expect(at(1.9e7)).toBeGreaterThan(0);
  });
});

describe('equation of state', () => {
  it('∇_ad and Γ₁ run from gas (0.4, 5/3) to light (0.25, 4/3)', () => {
    expectNear(adiabaticGradient(1), 0.4, 1e-12, '∇_ad gas');
    expectNear(adiabaticGradient(0), 0.25, 1e-12, '∇_ad light');
    expectNear(gamma1(1), 5 / 3, 1e-12, 'Γ₁ gas');
    expectNear(gamma1(0), 4 / 3, 1e-12, 'Γ₁ light');
  });

  it('densityFor inverts the pressure, partly degenerate electrons and all (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 6, max: 8, noNaN: true }), fc.double({ min: -1, max: 6, noNaN: true }), (logT, logRho) => {
        const rho = 10 ** logRho * 1000;
        const T = 10 ** logT;
        return rel(densityFor(totalPressure(rho, T, SUN_MIX), T, SUN_MIX), rho) < 1e-8;
      }),
    );
  });

  it('Saha leaves the Sun’s surface neutral and its gas fully ionised at 10⁵ K', () => {
    const surface = ionisation(3e-4, 5800, SUN_MIX);
    expect(surface.hydrogen).toBeLessThan(1e-3);
    expect(ionisation(1e-3, 1e5, SUN_MIX).hydrogen).toBeGreaterThan(0.99);
    expect(ionisation(1e-3, 1e5, SUN_MIX).heliumTwice).toBeGreaterThan(0.9);
  });

  it('partialDensity inverts the partly ionised pressure (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 3.5, max: 5.2, noNaN: true }), fc.double({ min: -9, max: -3, noNaN: true }), (logT, logRho) => {
        const rho = 10 ** logRho * 1000;
        const T = 10 ** logT;
        return rel(partialDensity(partialPressure(rho, T, SUN_MIX), T, SUN_MIX), rho) < 1e-6;
      }),
    );
  });

  it('∇_ad dips to about 0.1–0.2 where hydrogen ionises, and is 0.4 in neutral and in ionised gas', () => {
    const P = 1e4;
    expectNear(partialAdiabaticGradient(P, 4000, SUN_MIX), 0.4, 0.005, 'neutral');
    expect(Math.min(...[9000, 10000, 11000, 12000, 14000].map((T) => partialAdiabaticGradient(P, T, SUN_MIX)))).toBeLessThan(0.2);
    expectNear(stellarGas(1e14, 5e6, SUN_MIX).nablaAd, 0.4, 0.002, 'ionised');
  });
});

describe('the random walk (Figure 21.1)', () => {
  it('a walk is the same every time from one seed', () => {
    expect(randomWalk(50, 3)).toEqual(randomWalk(50, 3));
  });

  it('spreads as √N', () => {
    const checkpoints = [10, 100, 1000];
    const d = rmsDistances(1000, checkpoints, 5);
    checkpoints.forEach((n, i) => expectNear(d[i] / Math.sqrt(n), 1, 0.06, `${n} steps`));
  });

  it('takes about 3 × depth² steps to climb out of a slab', () => {
    let sum = 0;
    for (let k = 0; k < 300; k++) sum += stepsToEscape(20, k + 1);
    expectNear(sum / 300 / 400, 3, 0.4, 'steps / depth²');
  });

  it('a constant step gives R²/2ℓc', () => {
    const shells = Array.from({ length: 101 }, (_, i) => ({
      r: i / 100,
      kappa: 1,
      rho: 1,
    }));
    expectNear(diffusionTime(shells, 1).total * 299_792_458, 0.5, 1e-9, 'R²/2ℓc');
  });

  it('light takes 10,000 to 170,000 years to leave the Sun’s radiative zone (Model S: about 31,000)', () => {
    expect(SUN_ESCAPE.years).toBeGreaterThan(ESCAPE_RANGE[0]);
    expect(SUN_ESCAPE.years).toBeLessThan(ESCAPE_RANGE[1]);
    expectNear(SUN_ESCAPE.years / 31_000, 1, 0.05, 'the chapter’s number');
    expectNear(SUN_SHELLS[0].path * 1000, 0.052, 0.003, 'mean free path at the centre, mm');
  });
});

describe('the star builder (Figure 21.4)', () => {
  const young = buildStar({ mass: 1, X: 0.7, Z: 0.02 });
  const today = buildStar({
    mass: MODEL_S_MASS_SOLAR,
    X: 0.7,
    Z: 0.02,
    hydrogen: SUN_TODAY_HYDROGEN,
  });

  it('converges, and each try misses by less than the one before', () => {
    expect(young.converged).toBe(true);
    const misses = young.tries.map((t) => Math.max(...t.miss.map(Math.abs)));
    expect(misses[misses.length - 1]).toBeLessThan(1e-5);
    expect(misses[misses.length - 1]).toBeLessThan(misses[0] * 1e-4);
  });

  it('holds itself up and keeps its books: dP/dr = −Gmρ/r², and L equals the burning added up', () => {
    const s = young.shells;
    const R = young.radius * 6.957e8;
    let burnt = 0;
    for (let k = 1; k < s.length; k++) burnt += 0.5 * (s[k].eps + s[k - 1].eps) * (s[k].q - s[k - 1].q) * M_SUN;
    expectNear(burnt / (young.luminosity * L_SUN), 1, 0.01, 'L = ∫ε dm');
    for (const k of [40, 80, 120]) {
      const a = s[k - 1];
      const b = s[k + 1];
      const slope = (b.P - a.P) / ((b.r - a.r) * R);
      const want = (-G * s[k].q * M_SUN * s[k].rho) / (s[k].r * R) ** 2;
      expectNear(slope / want, 1, 0.02, `balance at shell ${k}`);
    }
  });

  it('builds the young Sun as the chapter says: 0.59 L☉, 0.80 R☉, a convection zone below 0.69 R', () => {
    expectNear(young.luminosity, 0.585, 0.01, 'L');
    expectNear(young.radius, 0.8, 0.01, 'R');
    expectNear(young.centre.T / 1e6, 12.9, 0.1, 'T_c');
    expectNear(young.zones[young.zones.length - 1].r[0], 0.69, 0.01, 'base of the convection zone');
  });

  it('builds today’s Sun within 15% of Model S, as the chapter says', () => {
    expect(today.converged).toBe(true);
    expectNear(today.luminosity, 0.88, 0.01, 'L');
    expectNear(today.radius, 0.87, 0.01, 'R');
    expectNear(today.centre.T / 1e6, 15.1, 0.1, 'T_c');
    expectNear(today.centre.rho / 1000, 166, 2, 'ρ_c');
    expect(rel(today.centre.T, SUN_CENTRE.T)).toBeLessThan(0.15);
    expect(rel(today.centre.rho, SUN_CENTRE.rho)).toBeLessThan(0.15);
    expectNear(today.zones[today.zones.length - 1].r[0], 0.68, 0.01, 'base of the convection zone');
    expect(today.cnoShare).toBeLessThan(0.02);
  });

  it('builds Sirius A within 10% of its measured luminosity and radius, and Figure 20.1 quotes its centre', () => {
    const s = famousStar('sirius-a');
    const m = buildStar({ mass: s.mass.value, X: 0.7, Z: 0.02 });
    expect(rel(m.luminosity, s.luminosity.value)).toBeLessThan(0.1);
    expect(rel(m.radius, s.radius.value)).toBeLessThan(0.1);
    expectNear(m.luminosity, 24, 0.5, 'the chapter’s 24');
    expect(rel(m.centre.P, SIRIUS_A_CENTRE.P)).toBeLessThan(0.01);
    expect(rel(m.centre.T, SIRIUS_A_CENTRE.T)).toBeLessThan(0.01);
    expect(CENTRE_STARS.find((c) => c.id === 'sirius-a')!.truth).toBeDefined();
  });

  it('gives a twice-solar star the interactive question’s luminosity', () => {
    const m = buildStar({ mass: 2, X: 0.7, Z: 0.02 });
    expect(rel(m.luminosity, TWO_SUNS_LUMINOSITY)).toBeLessThan(0.02);
    expect(checkTwoSuns({ luminosity: TWO_SUNS_LUMINOSITY }).correct).toBe(true);
    expect(
      checkTwoSuns({
        luminosity: TWO_SUNS_LUMINOSITY * (1 + TWO_SUNS_TOLERANCE * 1.2),
      }).correct,
    ).toBe(false);
    expect(checkTwoSuns({ luminosity: 2 }).correct).toBe(false);
  });

  it('the thermostat: ten times the burning cools the young Sun’s centre to 9.1 million K and dims it by a third', () => {
    const fast = buildStar({ mass: 1, X: 0.7, Z: 0.02, burning: 10 });
    const slow = buildStar({ mass: 1, X: 0.7, Z: 0.02, burning: 0.1 });
    expectNear(fast.centre.T / 1e6, 9.1, 0.1, 'T_c, ×10');
    expectNear((young.centre.T - fast.centre.T) / 1e6, 3.7, 0.1, 'cooler by');
    expectNear(fast.luminosity / young.luminosity, 0.68, 0.03, 'L, ×10');
    expectNear(slow.centre.T / 1e6, 18.9, 0.1, 'T_c, ×0.1');
  });

  it('a main sequence: fully convective at 0.3 M☉, convective cores from about 1.4 M☉, and close to detailed models from 0.8 M☉ up', () => {
    const ms = mainSequence([0.3, 0.4, 0.7, 1, 1.3, 1.5, 2, 3, 5, 10, 20], 0.7, 0.02);
    expect(ms.every((s) => s.converged)).toBe(true);
    const at = (m: number) => ms.find((s) => s.mass === m)!;
    expect(at(0.3).coreMass).toBeGreaterThan(0.999);
    expect(at(0.4).coreMass).toBe(0);
    expect(at(1.3).coreMass).toBe(0);
    expect(at(1.5).coreMass).toBeGreaterThan(0);
    expect(at(20).coreMass).toBeGreaterThan(0.4);
    for (let k = 1; k < ms.length; k++) expect(ms[k].luminosity).toBeGreaterThan(ms[k - 1].luminosity);
    // Against Tout et al.'s (1996) fits to detailed ZAMS models (OPAL opacities, mixing length): from 0.8 M☉ up,
    // luminosities within a factor of 1.5 and radii within a quarter (a third at 1.2–1.5 M☉); red dwarfs come out 2–3.5 times too faint.
    const c = zcnsts(0.02);
    for (const s of ms) {
      const l = s.luminosity / lzamsf(s.mass, c);
      const r = s.radius / rzamsf(s.mass, c);
      if (s.mass >= 0.8) {
        expect(Math.abs(Math.log(l)), `L at ${s.mass} M☉`).toBeLessThan(Math.log(1.5));
        expect(Math.abs(Math.log(r)), `R at ${s.mass} M☉`).toBeLessThan(Math.log(1.35));
      } else {
        expect(l, `L at ${s.mass} M☉`).toBeLessThan(0.7);
        expect(l, `L at ${s.mass} M☉`).toBeGreaterThan(0.25);
      }
    }
    expect(DEBCAT_STARS.length).toBeGreaterThan(100);
  });

  it('starts close enough everywhere from 0.3 to 20 M☉ and for other make-ups', () => {
    for (const [mass, X, Z] of [
      [0.3, 0.7, 0.02],
      [3, 0.7, 0.02],
      [20, 0.7, 0.02],
      [1, 0.76, 0.001],
      [1, 0.5, 0.04],
      [5, 0.6, 0.005],
    ]) {
      const m = buildStar({ mass, X, Z });
      expect(m.converged, `${mass} M☉, X ${X}, Z ${Z}`).toBe(true);
      expect(startingGuess({ mass, X, Z }).every(Number.isFinite)).toBe(true);
    }
  });

  it('the worker answers star and main-sequence requests', () => {
    const answer = computeStellar({
      kind: 'star',
      mass: 1,
      X: 0.7,
      Z: 0.02,
      burning: 1,
      today: true,
    }) as StarModel;
    expect(answer.converged).toBe(true);
    expect(answer.input.hydrogen).toBeDefined();
    expect(zonesInWords(answer)).toMatch(/convective envelope below 0\.68/);
  });
});

describe('Figure 20.1’s red dwarf and the shooting method (Figure T10.1)', () => {
  it('Proxima’s centre: an n = 1.5 polytrope of its mass and radius, about 5 million K', () => {
    const p = famousStar('proxima');
    const c = convectiveCentre(p.mass.value, p.radius.value);
    expect(c.T).toBeGreaterThan(4e6);
    expect(c.T).toBeLessThan(6.5e6);
    expect(CENTRE_STARS.find((s) => s.id === 'red-dwarf')!.truth!.T).toBe(c.T);
  });

  it('secant steps find a red dwarf of a wanted mass within 10⁻⁴ M☉ in ten tries or fewer', () => {
    for (const target of [0.08, 0.122, 0.4]) {
      const tries: ShotTry[] = FIRST_TRIES.star.map((g) => dwarfTry(g, target));
      for (let k = 0; k < 8 && Math.abs(tries[tries.length - 1].miss) > 1e-4; k++)
        tries.push(dwarfTry(secant(tries[tries.length - 2], tries[tries.length - 1]), target));
      expect(Math.abs(tries[tries.length - 1].miss), `${target} M☉`).toBeLessThan(1e-4);
      expect(tries.length).toBeLessThanOrEqual(10);
    }
  });

  it('the red dwarf of Proxima’s central density has Proxima’s mass and radius', () => {
    const d = dwarfFrom(DWARF.rhoC);
    expectNear(d.mass / DWARF.mass, 1, 1e-6, 'mass');
    expectNear(d.radius / DWARF.radius, 1, 1e-6, 'radius');
  });

  it('secant steps hit the cannon’s target within a kilometre in ten tries or fewer', () => {
    for (const target of CANNON_TARGETS) {
      const tries: ShotTry[] = FIRST_TRIES.cannon.map((g) => cannonTry(g, target));
      for (let k = 0; k < 8 && Math.abs(tries[tries.length - 1].miss) > 1; k++)
        tries.push(cannonTry(secant(tries[tries.length - 2], tries[tries.length - 1]), target));
      expect(Math.abs(tries[tries.length - 1].miss), `${target} km`).toBeLessThan(1);
      expect(tries.length).toBeLessThanOrEqual(10);
    }
  });
});

describe('the registry', () => {
  it('Chapter 21 and Toolkit T10 are written', () => {
    expect(CHAPTERS.find((c) => c.number === 21)!.load).toBeDefined();
    expect(TOOLKIT.find((t) => t.slug === 'differential-equations')!.load).toBeDefined();
    expect(CHAPTERS.find((c) => c.number === 30)!.load).toBeUndefined();
  });
});
