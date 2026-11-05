import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { M_SUN, R_SUN } from '../src/core/constants';
import { decayPower, deposited, diffusionTime, EPS_CO, EPS_NI, lightCurve, nickelFromPeak, peakOf, popovPlateau, TAU_CO, TAU_NI } from '../src/core/supernova/arnett';
import { HYBRID, runCollapse, toyPolytropeMass, type CollapseRun } from '../src/core/supernova/collapse';
import { averageGamma1, coreHistory, gasShareOf, lightestUnstableCore, OXYGEN_MU, pairWedge, standardDensity } from '../src/core/supernova/pairs';
import { computeStellar } from '../src/core/stellar/requests';
import { SECONDS_PER_DAY } from '../src/core/units';
import { checkNickel, NICKEL_ANSWER, NICKEL_TOLERANCE, peakWithNickel } from '../src/content/checks/chapter25Answers';
import { SN_1987A, SN_2011FE } from '../src/data/supernovae';
import { explosionOf, MODEL_THRESHOLD, NICKEL_PRESETS, pairOutcome, pathTo, peakFor, sketchSpectrum, SUPERNOVA_KINDS, blueshifted } from '../src/figures/explosions';
import { CHAPTERS } from '../src/site/course';

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const IA = NICKEL_PRESETS.find((p) => p.id === 'ia')!;

describe('the toy collapse and bounce (supernova/collapse.ts)', () => {
  let none: CollapseRun;
  let strong: CollapseRun;
  beforeAll(() => {
    none = runCollapse({ neutrinoLuminosity: 0 });
    strong = runCollapse({ neutrinoLuminosity: 3 });
  });

  it('starts from the n = 3 polytrope that relativistic electrons hold, 1.44 M☉, cut at 10⁷ g/cm³ inside its mantle', () => {
    expect(Math.abs(toyPolytropeMass() - 1.44)).toBeLessThan(0.01);
    const m = none.mass;
    expect(Math.abs(m[Math.round(0.78 * m.length) - 1] - 1.43)).toBeLessThan(0.01);
    expect(Math.abs(m[m.length - 1] - 1.63)).toBeLessThan(0.01);
  });

  it('bounces at nuclear density about a tenth of a second in, with an inner core of about 0.6 M☉, as detailed models do', () => {
    expect(none.bounce).toBeGreaterThan(0.08);
    expect(none.bounce).toBeLessThan(0.15);
    expect(none.innerCore).toBeGreaterThan(0.5);
    expect(none.innerCore).toBeLessThan(0.75);
    const after = none.frames.find((f) => f.t > none.bounce)!;
    expect(Math.max(...after.rho) / 1000).toBeGreaterThan(HYBRID.rhoNuc);
  });

  it('falls in together: just before the bounce the inner core’s speed grows with radius, as a shrinking ball’s does', () => {
    const before = [...none.frames].reverse().find((f) => f.t < none.bounce - 0.004)!;
    const inner = none.mass.map((m, j) => ({ m, j })).filter((s) => s.m < 0.8 * none.innerCore && s.j > 2);
    const ratios = inner.map(({ j }) => before.v[j] / before.r[j]);
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    for (const r of ratios) expect(Math.abs(r / mean - 1)).toBeLessThan(0.35);
    for (const { j } of inner) expect(before.v[j]).toBeLessThan(0);
  });

  it('keeps its energy books: the change in energy is what heating, cooling, the splitting of iron and the pressure outside added', () => {
    for (const run of [none, strong]) {
      const e = run.energy;
      const expected = e.start + e.heating + e.cooling + e.dissociation + e.external;
      // Against the 3 × 10⁴⁶ J the collapse releases, to a part in a thousand.
      expect(Math.abs(e.end - expected)).toBeLessThan(3e43);
    }
  });

  it('stalls without neutrino heating, the shock hovering hundreds of kilometres out, and explodes with strong heating', () => {
    expect(none.exploded).toBe(false);
    const late = none.frames.filter((f) => f.t > none.bounce + 0.2);
    for (const f of late) {
      expect(f.shock / 1000).toBeGreaterThan(100);
      expect(f.shock / 1000).toBeLessThan(1500);
    }
    expect(strong.exploded).toBe(true);
    expect(strong.explosionEnergy).toBeGreaterThan(3e43);
    expect(strong.explosionEnergy).toBeLessThan(2e44);
    expect(strong.frames[strong.frames.length - 1].shock / 1000).toBeGreaterThan(3000);
  });

  it('runs in the stellar worker’s requests, and remembers the heating it was run with', () => {
    const run = computeStellar({ kind: 'collapse', neutrinoLuminosity: 2 }) as CollapseRun;
    expect(run.neutrinoLuminosity).toBe(2);
    expect(run.frames.length).toBeGreaterThan(200);
  });
});

describe('light from radioactive nickel (supernova/arnett.ts)', () => {
  it('releases the decays’ energy: ∫Q dt = ε_Ni τ_Ni + ε_Co(τ_Co − τ_Ni) per kilogram of nickel', () => {
    let sum = 0;
    const h = 0.05 * SECONDS_PER_DAY;
    for (let t = h / 2; t < 3000 * SECONDS_PER_DAY; t += h) sum += decayPower(1, t).total * h;
    expect(rel(sum, EPS_NI * TAU_NI + EPS_CO * (TAU_CO - TAU_NI))).toBeLessThan(1e-3);
  });

  it('obeys Arnett’s rule: at the peak, the light equals the heating', () => {
    for (const p of NICKEL_PRESETS.filter((q) => !q.plateau)) {
      const input = explosionOf(p);
      const curve = lightCurve(input, Array.from({ length: 2401 }, (_, i) => i * 0.1));
      const peak = peakOf(curve);
      expect(rel(peak.L, deposited(input, peak.day * SECONDS_PER_DAY)), p.id).toBeLessThan(5e-3);
    }
  });

  it('keeps Katz’s integral: ∫ t L dt = ∫ t Q dt, as diffusion with expansion must (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.05, max: 1, noNaN: true }), fc.double({ min: 0.8, max: 10, noNaN: true }), fc.double({ min: 3e6, max: 1.5e7, noNaN: true }), (ni, ej, v) => {
        const input = { nickel: ni * M_SUN, ejecta: ej * M_SUN, speed: v, opacity: 0.01 };
        const days = Array.from({ length: 3001 }, (_, i) => i * 0.5);
        const curve = lightCurve(input, days);
        let tl = 0;
        let tq = 0;
        for (const p of curve) {
          const t = p.day * SECONDS_PER_DAY;
          tl += t * p.L;
          tq += t * deposited(input, t);
        }
        expect(rel(tl, tq)).toBeLessThan(2e-3);
      }),
      { numRuns: 8 },
    );
  });

  it('puts SN 2011fe’s peak, 1.17 × 10³⁶ W on day 16.6, at 0.52 M☉ of nickel with a white dwarf’s settings, near Pereira’s 0.53', () => {
    const peak = peakFor({ ...IA, nickel: NICKEL_ANSWER });
    expect(rel(peak.L, SN_2011FE.peak.L)).toBeLessThan(0.02);
    expect(Math.abs(peak.day - SN_2011FE.peak.day)).toBeLessThan(1.5);
    expect(Math.abs(NICKEL_ANSWER - SN_2011FE.nickel.mass)).toBeLessThan(SN_2011FE.nickel.error);
    expect(Math.abs(diffusionTime(explosionOf(IA)) / SECONDS_PER_DAY - 13.4)).toBeLessThan(0.3);
  });

  it('can’t fit SN 1987A’s peak and tail with one nickel mass, as the chapter says: the tail’s 0.069 M☉ peaks at half its light', () => {
    const p = NICKEL_PRESETS.find((q) => q.id === 'sn1987a')!;
    const peak = peakFor(p);
    expect(Math.abs(peak.day - SN_1987A.peak.day)).toBeLessThan(10);
    expect(SN_1987A.peak.L / peak.L).toBeGreaterThan(1.6);
    expect(SN_1987A.peak.L / peak.L).toBeLessThan(2.2);
    expect(nickelFromPeak(SN_1987A.peak.L, SN_1987A.peak.day) / M_SUN).toBeGreaterThan(0.12);
  });

  it('fades at cobalt-56’s 0.98 magnitudes per 100 days while the γ-rays are caught, and faster once they escape', () => {
    // Heavy, slow ejecta that trap the γ-rays, and thin enough to light that the light keeps up with the heating.
    const thick = { nickel: 0.07 * M_SUN, ejecta: 15 * M_SUN, speed: 2e6, opacity: 0.001 };
    const [a, b] = lightCurve(thick, [0, 200, 300]).slice(1);
    const magsPer100 = 2.5 * Math.log10(a.L / b.L);
    expect(Math.abs(magsPer100 - 0.98)).toBeLessThan(0.05);
    const ia = explosionOf(IA);
    const [c, d] = lightCurve(ia, [0, 200, 300]).slice(1);
    expect(2.5 * Math.log10(c.L / d.L)).toBeGreaterThan(1.2);
  });

  it('gives Popov’s plateau its reference values: 1.64 × 10⁴² erg/s for 99 days', () => {
    const input = { nickel: 0.05 * M_SUN, ejecta: 10 * M_SUN, speed: Math.sqrt(1e44 / (0.3 * 10 * M_SUN)), opacity: 0.034 };
    const p = popovPlateau(input, 500 * R_SUN);
    expect(rel(p.L, 1.64e35)).toBeLessThan(1e-6);
    expect(rel(p.duration / SECONDS_PER_DAY, 99)).toBeLessThan(1e-6);
  });

  it('the interactive question accepts the nickel that fits SN 2011fe, and not 0.1 M☉ off', () => {
    // The answer is the model's: bisect for the peak.
    let lo = 0.2;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (peakWithNickel(mid) > SN_2011FE.peak.L) hi = mid;
      else lo = mid;
    }
    expect(Math.abs((lo + hi) / 2 - NICKEL_ANSWER)).toBeLessThan(0.01);
    expect(checkNickel({ nickel: NICKEL_ANSWER }).correct).toBe(true);
    expect(checkNickel({ nickel: NICKEL_ANSWER + NICKEL_TOLERANCE + 0.04 }).correct).toBe(false);
    expect(checkNickel({ nickel: 0.2 }).correct).toBe(false);
  });
});

describe('pair instability (supernova/pairs.ts)', () => {
  it('finds the wedge where Γ₁ < 4/3 between about 0.4 and 3.5 billion K, below about 10⁶ g/cm³', () => {
    const wedge = pairWedge([8.4, 10], [0, 8], 32);
    const inside = wedge.filter((c) => c.top !== null);
    expect(inside.length).toBeGreaterThan(10);
    expect(10 ** inside[0].logT).toBeGreaterThan(3e8);
    expect(10 ** inside[0].logT).toBeLessThan(6e8);
    expect(10 ** inside[inside.length - 1].logT).toBeGreaterThan(2.5e9);
    expect(10 ** inside[inside.length - 1].logT).toBeLessThan(4e9);
    const top = Math.max(...inside.map((c) => c.top!));
    expect(top).toBeGreaterThan(5.5);
    expect(top).toBeLessThan(6.3);
    expect(wedge[wedge.length - 1].top).toBeNull();
  });

  it('sets each core’s gas share by Eddington’s quartic, 1 − β = 0.00298 μ⁴β⁴(M/M☉)²', () => {
    for (const m of [10, 50, 200]) {
      const b = gasShareOf(m);
      expect(rel(1 - b, 0.00298 * OXYGEN_MU ** 4 * b ** 4 * m * m), `${m} M☉`).toBeLessThan(0.01);
    }
  });

  it('puts each core on a line of slope 3, lower for heavier cores (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 10, max: 150, noNaN: true }), fc.double({ min: 8.5, max: 9.5, noNaN: true }), (m, lt) => {
        const T = 10 ** lt;
        expect(rel(standardDensity(m, 2 * T) / standardDensity(m, T), 8)).toBeLessThan(1e-9);
        expect(standardDensity(m * 1.3, T)).toBeLessThan(standardDensity(m, T));
      }),
      { numRuns: 20 },
    );
  });

  it('leaves a light core stable and makes a heavy one unstable, its average Γ₁ dipping below 4/3', () => {
    expect(coreHistory(10, [8.7, 9.8], 20).unstable).toBe(false);
    const heavy = coreHistory(100, [8.7, 9.8], 20);
    expect(heavy.unstable).toBe(true);
    expect(heavy.least.T).toBeGreaterThan(1.5e9);
    expect(heavy.least.T).toBeLessThan(3.5e9);
    expect(averageGamma1(100, heavy.least.T)).toBeCloseTo(heavy.least.average, 9);
  });

  it('first tips a core of about 27 M☉, the figure’s threshold, a little below where detailed models start the pulses', () => {
    const m = lightestUnstableCore();
    expect(Math.abs(m - MODEL_THRESHOLD)).toBeLessThan(1.5);
    expect(m).toBeLessThan(35);
  });

  it('sorts cores by published outcomes: collapse, pulses from 35, destroyed from 65, collapse whole from 135', () => {
    expect([20, 40, 80, 150].map(pairOutcome)).toEqual(['collapse', 'pulses', 'destroyed', 'whole']);
  });
});

describe('the kinds of supernova (Figure 25.2)', () => {
  it('sorts each type down the tree', () => {
    expect(pathTo('II').map((p) => p.answer)).toEqual([true]);
    expect(pathTo('Ia').map((p) => p.answer)).toEqual([false, true]);
    expect(pathTo('Ib').map((p) => p.answer)).toEqual([false, false, true]);
    expect(pathTo('Ic').map((p) => p.answer)).toEqual([false, false, false]);
  });

  it('draws each type’s telling line where it should be: Type Ia’s silicon absorbing near 615 nm, Type II’s Hα glowing at 656', () => {
    const lowest = (type: string, from: number, to: number) => {
      const s = sketchSpectrum(SUPERNOVA_KINDS.find((k) => k.type === type)!).filter((p) => p.nm > from && p.nm < to);
      return s.reduce((b, p) => (p.flux < b.flux ? p : b)).nm;
    };
    expect(Math.abs(lowest('Ia', 590, 640) - 615)).toBeLessThan(6);
    expect(Math.abs(blueshifted(635.5, 11000 * 0.75) - 618)).toBeLessThan(3);
    const ii = sketchSpectrum(SUPERNOVA_KINDS.find((k) => k.type === 'II')!).filter((p) => p.nm > 640 && p.nm < 680);
    expect(Math.abs(ii.reduce((b, p) => (p.flux > b.flux ? p : b)).nm - 657)).toBeLessThan(5);
    expect(Math.abs(lowest('Ib', 560, 590) - 571)).toBeLessThan(6);
  });
});

describe('Chapter 25 in the course', () => {
  it('is written, with its sections', () => {
    const ch = CHAPTERS.find((c) => c.number === 25)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['A core that can’t hold', 'The kinds of supernova', 'White dwarfs that explode', 'Light from radioactive nickel', 'Stars that leave nothing behind']);
  });
});
