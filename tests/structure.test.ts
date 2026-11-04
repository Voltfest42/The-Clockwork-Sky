import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AMU, G, K_B, M_SUN, R_SUN } from '../src/core/constants';
import { naturalSpline } from '../src/core/math/spline';
import { kelvinHelmholtzTime, toYears } from '../src/core/stars/sun';
import { contract, contractionPolytrope, hayashiTemperature, hydrogenBurningLimit, ppHeating } from '../src/core/structure/contraction';
import {
  degeneratePressure,
  dominantPressure,
  electronDensity,
  electronMolecularWeight,
  idealPressure,
  meanMolecularWeight,
  radiationGasBoundary,
  radiationPressure,
  relativityParameter,
  SOLAR_MIX,
  temperatureFor,
  totalPressure,
} from '../src/core/structure/eos';
import { centralPressureEstimate, centralPressureLowerBound, centralTemperatureEstimate, freeFallTimeOf, photonEscapeTime } from '../src/core/structure/estimates';
import { densityForJeansMass, fragmentationAt, jeansMassAt, OPACITY_LIMIT } from '../src/core/structure/fragmentation';
import {
  analyticTheta,
  centralPressureCoefficient,
  gravitationalEnergy,
  idealGasTemperature,
  polytrope,
  pressureVolumeIntegral,
  radiationShare,
  solveLaneEmden,
} from '../src/core/structure/laneEmden';
import { hermite, rk4Fixed, solveAdaptive } from '../src/core/structure/ode';
import { SECONDS_PER_JULIAN_YEAR } from '../src/core/units';
import bhac15 from '../src/data/bhac15.json';
import { expectNear } from './helpers';

const YEAR = SECONDS_PER_JULIAN_YEAR;

describe('stepping solvers', () => {
  it('RK4 grows y′ = y to e with fourth-order accuracy', () => {
    const f = (_: number, y: Float64Array, out: Float64Array) => {
      out[0] = y[0];
    };
    const coarse = Math.abs(rk4Fixed(f, 0, [1], 0.1, 10).at(-1)!.y[0] - Math.E);
    const fine = Math.abs(rk4Fixed(f, 0, [1], 0.05, 20).at(-1)!.y[0] - Math.E);
    expect(coarse).toBeLessThan(3e-6);
    expect(coarse / fine).toBeGreaterThan(14); // 2⁴ = 16
  });

  it('Dormand–Prince follows a spring for ten swings to its tolerance, reporting every step', () => {
    let emitted = 0;
    const r = solveAdaptive(
      (_, y, out) => {
        out[0] = y[1];
        out[1] = -y[0];
      },
      0,
      [1, 0],
      20 * Math.PI,
      { rtol: 1e-10, atol: 1e-12, emit: () => emitted++ },
    );
    expect(r.reason).toBe('end');
    expect(emitted).toBe(r.steps.length);
    const end = r.steps.at(-1)!;
    expectNear(end.x, 20 * Math.PI, 1e-12, 'end');
    expectNear(end.y[0], 1, 1e-8, 'x after ten swings');
    expectNear(end.y[1], 0, 1e-8, 'v after ten swings');
  });

  it('stops where asked, and runs backwards', () => {
    const fall = (_: number, y: Float64Array, out: Float64Array) => {
      out[0] = y[1];
      out[1] = -9.81;
    };
    const r = solveAdaptive(fall, 0, [100, 0], 10, { stop: (_, y) => y[0] < 0 });
    expect(r.reason).toBe('stop');
    expect(r.steps.at(-2)!.y[0]).toBeGreaterThan(0);
    const back = solveAdaptive(fall, 2, [100 - 0.5 * 9.81 * 4, -19.62], 0);
    expectNear(back.steps.at(-1)!.y[0], 100, 1e-9, 'height at the start');
  });

  it('interpolates a cubic exactly between two steps (Hermite)', () => {
    const p = (x: number) => x ** 3 - 2 * x * x + 0.5;
    const dp = (x: number) => 3 * x * x - 4 * x;
    const h = hermite(1, Float64Array.of(p(1)), Float64Array.of(dp(1)), 2, Float64Array.of(p(2)), Float64Array.of(dp(2)), 1.37);
    expectNear(h.y[0], p(1.37), 1e-12, 'value');
    expectNear(h.dy[0], dp(1.37), 1e-12, 'slope');
  });

  it('a natural spline passes through its points, with the right slope inside', () => {
    const xs = Array.from({ length: 41 }, (_, i) => (i * Math.PI) / 20);
    const s = naturalSpline(
      xs,
      xs.map((x) => Math.sin(x)),
    );
    for (const x of xs) expectNear(s.value(x), Math.sin(x), 1e-12, 'node');
    for (const x of [0.7, 1.9, 3.3, 4.6]) expectNear(s.slope(x), Math.cos(x), 1e-3, `slope at ${x}`);
  });
});

describe('the Lane–Emden equation', () => {
  // Chandrasekhar (1939); Horedt (2004): n, ξ₁, −ξ₁²θ′(ξ₁), ρ_c/ρ̄ (the research brief's table, §2).
  const TABLE: [number, number, number, number][] = [
    [0, 2.4495, 4.899, 1],
    [1, Math.PI, Math.PI, 3.2899],
    [1.5, 3.65375, 2.71406, 5.99071],
    [2, 4.35287, 2.41105, 11.40254],
    [3, 6.89685, 2.01824, 54.1825],
    [4, 14.97155, 1.79723, 622.408],
  ];

  it('gives Chandrasekhar’s constants to every figure he quotes', () => {
    for (const [n, xi1, mass, contrast] of TABLE) {
      const s = solveLaneEmden(n);
      expect(s.reachesSurface).toBe(true);
      expectNear(s.xi1, xi1, 6e-5 * xi1, `ξ₁ for n = ${n}`);
      expectNear(s.massConstant, mass, 6e-5 * mass, `mass for n = ${n}`);
      expectNear(s.densityContrast, contrast, 1e-5 * contrast, `ρc/ρ̄ for n = ${n}`);
    }
  });

  it('matches the exact solutions for n = 0, 1 and 5 all the way out', () => {
    for (const n of [0, 1]) {
      const s = solveLaneEmden(n);
      s.xi.forEach((x, k) => expectNear(s.theta[k], analyticTheta(n, x)!, 1e-8, `θ(${x}) for n = ${n}`));
    }
    const s5 = solveLaneEmden(5, { xiMax: 30 });
    s5.xi.forEach((x, k) => expectNear(s5.theta[k], analyticTheta(5, x)!, 1e-8, `θ(${x}) for n = 5`));
  });

  it('never reaches a surface at n = 5, whose mass is finite (√3)', () => {
    const s = solveLaneEmden(5);
    expect(s.reachesSurface).toBe(false);
    expect(s.xi1).toBe(Infinity);
    expectNear(s.massConstant, Math.sqrt(3), 2e-4, 'mass constant');
  });

  it('puts the surface farther out, and crowds the centre more, the higher n (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 4.6, noNaN: true }), fc.double({ min: 0.05, max: 0.3, noNaN: true }), (n, dn) => {
        const a = solveLaneEmden(n, { samples: 51 });
        const b = solveLaneEmden(n + dn, { samples: 51 });
        expect(b.xi1).toBeGreaterThan(a.xi1);
        expect(b.densityContrast).toBeGreaterThan(a.densityContrast);
      }),
      { numRuns: 30 },
    );
  });

  it('converges at n = 4.9 whatever the tolerance', () => {
    expectNear(solveLaneEmden(4.9).xi1, solveLaneEmden(4.9, { rtol: 1e-13, xiMax: 1000 }).xi1, 1e-5, 'ξ₁');
  });

  it('makes the Sun, as Eddington’s n = 3, 76 g/cm³ and 12 million K at the centre (research brief §2)', () => {
    const p = polytrope(solveLaneEmden(3), M_SUN, R_SUN);
    expectNear(p.rhoC / 1000, 76.4, 0.5, 'central density, g/cm³');
    expectNear(idealGasTemperature(p.pC, p.rhoC, 0.61) / 1e6, 12, 0.1, 'central temperature, million K');
    expectNear(p.pC / ((centralPressureCoefficient(solveLaneEmden(3)) * G * M_SUN ** 2) / R_SUN ** 4), 1, 1e-9, 'P_c = W GM²/R⁴');
  });

  it('obeys the virial theorem: 3∫P dV = −Ω for any n below 5 (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.5, max: 4.5, noNaN: true }), (n) => {
        const s = solveLaneEmden(n, { samples: 801 });
        const p = polytrope(s, M_SUN, R_SUN);
        expectNear(pressureVolumeIntegral(s, p) / -gravitationalEnergy(n, M_SUN, R_SUN), 1, 2e-4, `n = ${n}`);
      }),
      { numRuns: 15 },
    );
  });

  it('gives radiation 0.04% of the Sun’s pressure, 4% of 10 Suns’, 43% of 100 Suns’ (Eddington’s quartic)', () => {
    const n3 = solveLaneEmden(3);
    expectNear(radiationShare(M_SUN, 0.61, n3), 0.00041, 0.00002, 'the Sun');
    expectNear(radiationShare(10 * M_SUN, 0.61, n3), 0.036, 0.002, '10 Suns');
    expectNear(radiationShare(100 * M_SUN, 0.61, n3), 0.43, 0.01, '100 Suns');
    // The quartic's coefficient: 1 − β = 0.00298 μ⁴β⁴(M/M☉)².
    const share = radiationShare(7 * M_SUN, 0.61, n3);
    const beta = 1 - share;
    expectNear(share / (0.61 ** 4 * beta ** 4 * 49), 0.00298, 0.00003, 'coefficient');
  });
});

describe('estimates', () => {
  it('give the research brief’s numbers for the Sun', () => {
    expectNear(freeFallTimeOf(M_SUN, R_SUN), 1770, 10, 'free-fall time, s');
    expectNear(centralPressureEstimate(M_SUN, R_SUN) / 1e15, 1.13, 0.02, 'GM²/R⁴');
    expectNear(centralPressureLowerBound(M_SUN, R_SUN) / 1e13, 4.5, 0.05, 'the lower bound');
    expectNear(centralTemperatureEstimate(M_SUN, R_SUN, 0.61) / 1e7, 1.4, 0.02, 'GMμm/kR');
    expectNear(toYears(kelvinHelmholtzTime()) / 1e6, 31, 0.5, 'Kelvin–Helmholtz, Myr');
    expectNear(toYears(photonEscapeTime(R_SUN, 0.01)), 5100, 50, 'photon escape with 1 cm steps');
  });
});

describe('equations of state', () => {
  it('weighs the Sun’s mix: μ = 0.617 and μ_e = 1.18', () => {
    expectNear(meanMolecularWeight(SOLAR_MIX), 0.617, 0.001, 'μ');
    expectNear(electronMolecularWeight(SOLAR_MIX), 1.176, 0.001, 'μ_e');
    expect(electronMolecularWeight({ X: 0, Z: 0.02 })).toBe(2);
  });

  it('gives packed electrons their two limits, and goes relativistic near 10⁶ g/cm³ for μ_e = 2', () => {
    const hbar = 6.62607015e-34 / (2 * Math.PI);
    const me = 9.1093837015e-31;
    const c = 299792458;
    for (const n of [1e29, 1e31, 1e32]) {
      const nr = ((3 * Math.PI ** 2) ** (2 / 3) * hbar ** 2 * n ** (5 / 3)) / (5 * me);
      expectNear(degeneratePressure(n) / nr, 1, 0.002, `non-relativistic at ${n}`);
    }
    // At 10³⁴ per m³ (x = 0.26) relativity already softens it by (5/14)x², about 2%.
    expect(degeneratePressure(1e34)).toBeLessThan(((3 * Math.PI ** 2) ** (2 / 3) * hbar ** 2 * 1e34 ** (5 / 3)) / (5 * me));
    for (const n of [1e40, 1e42]) {
      const r = ((3 * Math.PI ** 2) ** (1 / 3) * hbar * c * n ** (4 / 3)) / 4;
      expectNear(degeneratePressure(n) / r, 1, 0.01, `relativistic at ${n}`);
    }
    // Continuous across the switch to the series at x = 0.1.
    const n0 = ((8 * Math.PI) / 3) * ((0.1 * me * c) / 6.62607015e-34) ** 3;
    expectNear(relativityParameter(n0), 0.1, 1e-12, 'the switch');
    expectNear(degeneratePressure(n0 * (1 - 1e-9)) / degeneratePressure(n0 * (1 + 1e-9)), 1, 1e-6, 'continuity');
    expectNear(relativityParameter(electronDensity(1.95e9, 2)), 1, 0.01, 'x = 1');
  });

  it('finds the temperature that gives a pressure, the inverse of the pressure (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 6, noNaN: true }), fc.double({ min: 4, max: 9, noNaN: true }), (lr, lt) => {
        const rho = 10 ** lr * 1000;
        const T = 10 ** lt;
        expectNear(temperatureFor(rho, totalPressure(rho, T, SOLAR_MIX), SOLAR_MIX) / T, 1, 1e-6, 'T');
      }),
      { numRuns: 60 },
    );
    expect(temperatureFor(1e9, degeneratePressure(electronDensity(1e9, 1.176)) * 0.9, SOLAR_MIX)).toBe(0);
  });

  it('names the right pressure in each corner of the core’s map', () => {
    expect(dominantPressure(154_200, 1.57e7, SOLAR_MIX)).toBe('gas'); // the Sun's centre
    expect(dominantPressure(1e8, 1e6, { X: 0, Z: 0.02 })).toBe('degenerate'); // a white dwarf's insides
    expect(dominantPressure(1e12, 1e7, { X: 0, Z: 0.02 })).toBe('relativistic');
    expect(dominantPressure(1, 1e8, SOLAR_MIX)).toBe('radiation');
    const T = 3e7;
    const rho = radiationGasBoundary(T, SOLAR_MIX);
    expectNear(radiationPressure(T) / idealPressure(rho, T, meanMolecularWeight(SOLAR_MIX)), 1, 1e-12, 'boundary');
    expect(K_B / AMU).toBeGreaterThan(0);
  });
});

describe('the star that heats as it cools', () => {
  const sun = contract(1);

  it('keeps its books: gravity’s energy goes into heat, packed electrons and light, exactly (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: Math.log10(0.01), max: Math.log10(1.4), noNaN: true }), (lm) => {
        const t = contract(10 ** lm, { states: 80 });
        const first = t.states[0];
        for (const s of t.states) {
          const released = first.gravity - s.gravity;
          const parts = s.heat - first.heat + (s.packing - first.packing) + s.radiated;
          expectNear(parts / Math.max(released, 1e-300), released > 0 ? 1 : 0, 1e-9, 'bookkeeping');
        }
      }),
      { numRuns: 12 },
    );
  });

  it('heats the gas by as much as it radiates while the gas is ideal, and its centre as 1/R', () => {
    const early = sun.states.filter((s) => s.packing / (s.heat + s.packing) < 0.002 && s.radiated > 0);
    expect(early.length).toBeGreaterThan(10);
    for (const s of early) expectNear((s.heat - sun.states[0].heat) / s.radiated, 1, 0.005, 'heat = light');
    const k = early[0].tC * early[0].radius;
    for (const s of early) expectNear((s.tC * s.radius) / k, 1, 0.01, 'T_c R');
  });

  it('lights the Sun at about 12 million K after some 50 million years', () => {
    expect(sun.outcome).toBe('ignites');
    const lit = sun.states.at(-1)!;
    expect(lit.tC).toBeGreaterThan(1e7);
    expect(lit.tC).toBeLessThan(1.4e7);
    expect(lit.age / YEAR).toBeGreaterThan(3e7);
    expect(lit.age / YEAR).toBeLessThan(8e7);
    expect(lit.fusion / lit.luminosity).toBeCloseTo(1, 3);
  });

  it('stops a brown dwarf with packed electrons: its centre peaks, then cools', () => {
    const bd = contract(0.05);
    expect(bd.outcome).toBe('brown-dwarf');
    expect(bd.peakTemperature).toBeGreaterThan(1e6);
    expect(bd.peakTemperature).toBeLessThan(3e6);
    expect(bd.states.at(-1)!.tC).toBeLessThan(0.55 * bd.peakTemperature);
    expect(bd.states.at(-1)!.radius).toBeGreaterThan(bd.coldRadius);
  });

  it('puts the dividing line near 0.08 Suns (0.084 in this model; 0.075 in detailed ones)', () => {
    const limit = hydrogenBurningLimit();
    expect(limit).toBeGreaterThan(0.08);
    expect(limit).toBeLessThan(0.09);
  });

  it('takes young stars’ surface temperatures from BHAC15, within 7%', () => {
    for (const track of bhac15.tracks) {
      const p = track.points.reduce((a, b) => (Math.abs(b[0] - 6) < Math.abs(a[0] - 6) ? b : a));
      expectNear(hayashiTemperature(track.mass) / p[1], 1, 0.07, `${track.mass} M☉`);
    }
  });

  it('heats the Sun’s centre by the pp chain within a factor of two of a solar model’s 17 erg/g/s', () => {
    const eps = ppHeating(154_200, 1.567e7, 0.335) * 1e4; // erg/g/s
    expect(eps).toBeGreaterThan(17 / 2);
    expect(eps).toBeLessThan(17 * 2);
    expect(ppHeating(154_200, 3e6, 0.7)).toBeLessThan(ppHeating(154_200, 4e6, 0.7));
    expect(contractionPolytrope().n).toBe(1.5);
  });
});

describe('fragmentation', () => {
  it('halves the Jeans mass for every fourfold rise in density', () => {
    for (const n of [10, 1e4, 1e8]) expectNear(jeansMassAt(4 * n) / jeansMassAt(n), 0.5, 1e-12, `at ${n}`);
    expectNear(jeansMassAt(densityForJeansMass(3.7)), 3.7, 1e-9, 'inverse');
  });

  it('breaks a cloud in two at each halving, until the gas turns opaque near a hundredth of a Sun', () => {
    const start = densityForJeansMass(1000);
    expect(fragmentationAt(1000, start).levels).toBe(0);
    expect(fragmentationAt(1000, 16 * start).levels).toBe(2);
    const opaque = fragmentationAt(1000, 1e12);
    expect(opaque.opaque).toBe(true);
    expect(opaque.fragmentMass).toBe(OPACITY_LIMIT.high);
    expect(opaque.levels).toBe(16); // 2¹⁶ × 0.01 ≈ 655 M☉, the last full halving below 1,000
    // The gas reaches the opacity limit at about 10¹⁴–10¹⁵ g/cm³ … in molecules per cm³, a few billion.
    const n = densityForJeansMass(OPACITY_LIMIT.high);
    expect(n).toBeGreaterThan(1e9);
    expect(n).toBeLessThan(1e10);
  });
});
