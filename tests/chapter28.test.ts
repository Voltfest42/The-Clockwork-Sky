import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { C, G, M_SUN, R_SUN } from '../src/core/constants';
import {
  criticalPotential,
  fillPotential,
  l1Stream,
  lagrangePoints,
  lobeRadiusNumerical,
  muOf,
  rocheForce,
  rocheLobe,
  rochePotential,
  streamRMinFit,
  transferTrack,
} from '../src/core/binaries/roche';
import { mergerTime } from '../src/core/gr/peters';
import { contourLines, sampleGrid } from '../src/core/math/contour';
import { evolveBinary } from '../src/core/stellar/bse/evolve';
import { classify, stepOf, UNIVERSE_AGE } from '../src/core/stellar/bse/outcome';
import { Ran3 } from '../src/core/stellar/bse/ran3';
import { binaryRun, FIGURE_SWITCHES, zooRow } from '../src/core/stellar/bse/runs';
import { KTYPE } from '../src/core/stellar/bse/collisions';
import { evolveStar } from '../src/core/stellar/sse/evolve';
import { checkStream, STREAM_MISS_BELOW } from '../src/content/checks/chapter28Answers';
import { ALGOL, ALGOL_TODAY, donorOutline, lobes, rocheGrid, streamMisses, ZOO_KINDS, ZOO_MASSES, ZOO_PERIODS } from '../src/figures/binaries28';
import { CHAPTERS } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';
import { T_CRB } from '../src/data/novae';
import { bisect } from '../src/core/math/roots';

describe('Roche geometry', () => {
  it('puts L1 between the stars where the pulls and the turning balance, and L4 and L5 at equilateral points', () => {
    for (const q of [0.1, 0.5, 1, 3, 10]) {
      const mu = muOf(q);
      const [l1, l2, l3, l4, l5] = lagrangePoints(mu);
      expect(l1.x).toBeGreaterThan(-mu);
      expect(l1.x).toBeLessThan(1 - mu);
      for (const p of [l1, l2, l3, l4, l5]) {
        const [fx, fy] = rocheForce(p.x, p.y, mu);
        expect(Math.hypot(fx, fy)).toBeLessThan(1e-9);
      }
      expect(Math.hypot(l4.x + mu, l4.y)).toBeCloseTo(1, 12);
      expect(Math.hypot(l4.x - (1 - mu), l4.y)).toBeCloseTo(1, 12);
      expect(l5.y).toBeCloseTo(-l4.y, 12);
      // L2 lies behind the lighter star
      expect(Math.sign(l2.x - l1.x)).toBe(mu <= 0.5 ? 1 : -1);
      // L1 is the lowest pass, then L2, then L3; L4 and L5 are the hilltops
      expect(l1.phi).toBeLessThan(l2.phi);
      expect(l2.phi).toBeLessThanOrEqual(l3.phi + 1e-12);
      expect(l3.phi).toBeLessThan(l4.phi);
    }
    expect(lagrangePoints(0.5)[0].x).toBeCloseTo(0, 12);
  });

  it('agrees with Eggleton’s lobe to 1% when the lobe’s volume is integrated, from q = 0.05 to 20', () => {
    for (const q of [0.05, 0.1, 0.3, 1, 3, 10, 20]) {
      const numerical = lobeRadiusNumerical(muOf(q), 1);
      expect(Math.abs(numerical / rocheLobe(q) - 1)).toBeLessThan(0.01);
    }
    expect(rocheLobe(1)).toBeCloseTo(0.3789, 4);
    expect(rocheLobe(0.1)).toBeCloseTo(0.2068, 4);
    // Both lobes of a pair: the heavier star's is the bigger
    const [donor, companion] = lobes(3);
    expect(donor).toBeGreaterThan(companion);
  });

  it('gives both stars the same lobe surface: the critical potential is L1’s, and a full donor reaches it', () => {
    const mu = muOf(2);
    expect(fillPotential(mu, 1)).toBeCloseTo(criticalPotential(mu), 12);
    expect(fillPotential(mu, 0.5)).toBeLessThan(criticalPotential(mu));
    expect(rochePotential(-mu + 1e-3, 0, 0, mu)).toBeLessThan(fillPotential(mu, 0.3));
  });

  it('swings the stream past the companion as Lubow and Shu found: 0.049 separations for equal masses, Ulrich and Burger’s fit within 5%', () => {
    expect(l1Stream(0.5, 0).rMin).toBeCloseTo(0.0488, 3);
    for (const q of [0.05, 0.1, 0.3, 1, 3, 10, 20]) {
      const s = l1Stream(muOf(q), 0);
      expect(Math.abs(s.rMin / streamRMinFit(1 / q) - 1)).toBeLessThan(0.05);
      // The disc forms 1.5 to 1.8 times further out (BSE takes rdisk = 1.7 rmin)
      expect(s.rCirc / s.rMin).toBeGreaterThan(1.5);
      expect(s.rCirc / s.rMin).toBeLessThan(1.85);
    }
  });

  it('makes the stream hit a big companion and miss a small one', () => {
    expect(l1Stream(muOf(1), 0.2).hits).toBe(true);
    expect(l1Stream(muOf(1), 0.01).hits).toBe(false);
  });

  it('shrinks a conservative orbit to its smallest at equal masses, as (M₁M₂)⁻² (property)', () => {
    const track = transferTrack(3, 1.5, 1, 0.4);
    const smallest = track.reduce((a, b) => (b.a < a.a ? b : a));
    expect(smallest.m1 / smallest.m2).toBeCloseTo(1, 1);
    expect(smallest.a).toBeCloseTo(0.79, 2);
    expect(track.at(-1)!.a).toBeCloseTo(((3 * 1.5) / (0.4 * 4.1)) ** 2, 3);
    fc.assert(
      fc.property(fc.double({ min: 0.5, max: 10, noNaN: true }), fc.double({ min: 0.3, max: 10, noNaN: true }), fc.double({ min: 0.05, max: 0.95, noNaN: true }), (m1, m2, f) => {
        const t = transferTrack(m1, m2, 1, m1 * 0.1, 50);
        const p = t[Math.round(f * 50)];
        expect(p.a).toBeCloseTo(((m1 * m2) / (p.m1 * p.m2)) ** 2, 6);
        expect(p.m1 + p.m2).toBeCloseTo(m1 + m2, 9);
      }),
      { numRuns: 60 },
    );
  });

  it('widens the orbit less when the companion keeps only part of the gas', () => {
    const kept = transferTrack(3, 1.5, 1, 0.6).at(-1)!;
    const half = transferTrack(3, 1.5, 0.5, 0.6).at(-1)!;
    expect(half.a).toBeLessThan(kept.a);
    expect(half.m2).toBeCloseTo(1.5 + 0.5 * 2.4, 9);
  });

  it('traces contour lines of a circle as one closed loop (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.2, max: 0.9, noNaN: true }), (r) => {
        const grid = sampleGrid((x, y) => Math.hypot(x, y), 81, 81, -1, 1, -1, 1);
        const lines = contourLines(grid, r);
        expect(lines.length).toBe(1);
        const line = lines[0];
        expect(line[0][0]).toBeCloseTo(line.at(-1)![0], 12);
        for (const [x, y] of line) expect(Math.abs(Math.hypot(x, y) - r)).toBeLessThan(0.002);
      }),
      { numRuns: 20 },
    );
  });

  it('outlines the donor round its own centre, inside its lobe', () => {
    for (const q of [0.2, 2]) {
      const mu = muOf(q);
      const l1 = lagrangePoints(mu)[0].x;
      const inside = donorOutline(q, 0.8);
      expect(inside.length).toBe(180);
      expect(Math.max(...inside.map((p) => p[0]))).toBeLessThan(l1);
      // A full donor reaches L1 and no further: its lobe, not the companion's
      const full = donorOutline(q, 1);
      expect(Math.max(...full.map((p) => p[0]))).toBeCloseTo(l1, 4);
    }
    expect(rocheGrid(2).nx).toBe(211);
  });
});

describe('BSE’s physics', () => {
  it('draws Numerical Recipes’ ran2 deviates in single precision, the same for the same seed', () => {
    const a = new Ran3(29769);
    const b = new Ran3(-29769);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(Math.fround(x)).toBe(x);
    }
  });

  it('merges two stars by the collision matrix: two main-sequence stars make one, a giant and a dwarf a common envelope', () => {
    expect(KTYPE[1][1]).toBe(1);
    expect(KTYPE[3][1]).toBe(103);
    expect(KTYPE[10][10]).toBe(15);
    expect(KTYPE[13][13]).toBe(14);
    expect(KTYPE[11][12]).toBe(12);
    for (let i = 0; i <= 14; i++) for (let j = 0; j <= 14; j++) expect(KTYPE[i][j]).toBe(KTYPE[j][i]);
  });

  it('never makes a pair heavier than it was born (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 25, noNaN: true }),
        fc.double({ min: 0.15, max: 0.95, noNaN: true }),
        fc.double({ min: 0, max: 3.5, noNaN: true }),
        (m1, q, logP) => {
          const r = evolveBinary({ m1, m2: q * m1, period: 10 ** logP, ecc: 0, z: 0.02, tEnd: 13_800 }, { sigma: 0 });
          let prev = m1 * (1 + q);
          for (const row of r.bcm) {
            const s = stepOf(row);
            const total = (s.kw[0] < 15 ? s.m[0] : 0) + (s.kw[1] < 15 ? s.m[1] : 0);
            expect(total).toBeLessThanOrEqual(prev * (1 + 1e-9));
            prev = total;
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('keeps a pair’s orbit fixed when nothing takes angular momentum away: no winds, tides or braking', () => {
    const r = evolveBinary({ m1: 3, m2: 2, period: 1000, ecc: 0, z: 0.02, tEnd: 300 }, { neta: 0, tflag: 0, sigma: 0 });
    const steps = r.bcm.map(stepOf).filter((s) => s.kw[0] <= 1 && s.kw[1] <= 1);
    expect(steps.length).toBeGreaterThan(10);
    for (const s of steps) expect(s.sep / steps[0].sep).toBeCloseTo(1, 10);
  });

  it('lets a very wide pair live as two single stars, as SSE would', () => {
    for (const [m1, m2] of [
      [1, 0.8],
      [5, 2],
      [20, 9],
    ]) {
      const r = evolveBinary({ m1, m2, period: 1e7, ecc: 0, z: 0.02, tEnd: 13_800 }, { hewind: 0.5, sigma: 0 });
      const events = r.bpp.map((row) => row.slice(1));
      expect(events.some((e) => e[9] === 3 || e[9] === 5 || e[9] === 7)).toBe(false);
      const last = events.at(-1)!;
      for (const [k, m] of [m1, m2].entries()) {
        const single = evolveStar(m, 0.02, 13_800);
        const types = [...new Set(events.map((e) => e[3 + k]))];
        expect(types).toEqual([...new Set(single.types.map((t) => t.kw))]);
        expect(last[1 + k]).toBeCloseTo(single.steps.at(-1)!.mt, 1);
      }
    }
  });

  it('merges compact pairs by gravitational waves on Peters’ clock: two neutron stars in a 7.75-hour orbit in about 300 million years', () => {
    // The Hulse–Taylor pulsar: 1.44 and 1.39 M☉, P = 7.752 h, e = 0.617
    const m1 = 1.4398 * M_SUN;
    const m2 = 1.3886 * M_SUN;
    const P = 7.751939 * 3600;
    const a = Math.cbrt((G * (m1 + m2) * P * P) / (4 * Math.PI * Math.PI));
    const years = mergerTime(m1, m2, a, 0.6171) / (365.25 * 86400);
    expect(years).toBeGreaterThan(2.5e8);
    expect(years).toBeLessThan(3.6e8);
    // Circular orbits: T ∝ a⁴
    expect(mergerTime(m1, m2, 2 * a) / mergerTime(m1, m2, a)).toBeCloseTo(16, 10);
    expect(mergerTime(M_SUN, M_SUN, R_SUN)).toBeCloseTo(((5 / 256) * C ** 5 * R_SUN ** 4) / (G ** 3 * 2 * M_SUN ** 3), -5);
  });
});

describe('Figures 28.3 and 28.4', () => {
  it('makes Algol: the heavier star overflows on the main sequence, the orbit is tightest at equal masses, and 900 million years on the pair is Algol', () => {
    const run = binaryRun({ ...ALGOL, ...FIGURE_SWITCHES });
    const overflow = run.events.find((e) => e.label === 3)!;
    expect(overflow.kw).toEqual([1, 1]);
    expect(overflow.t).toBeGreaterThan(400);
    expect(overflow.t).toBeLessThan(450);
    const steps = run.steps.filter((s) => s.period > 0);
    const tightest = steps.reduce((a, b) => (b.period < a.period ? b : a));
    // Near equal masses (BSE loses some of the gas, which moves the tightest orbit a little)
    expect(Math.abs(tightest.m[0] / tightest.m[1] - 1)).toBeLessThan(0.1);
    expect(tightest.period).toBeCloseTo(0.82, 1);
    const algol = steps.reduce((best, s) => (Math.abs(s.t - 911) < Math.abs(best.t - 911) ? s : best));
    expect(algol.kw[0]).toBe(3);
    expect(algol.kw[1]).toBe(1);
    expect(algol.m[0]).toBeCloseTo(ALGOL_TODAY.mB, 1);
    expect(Math.abs(algol.m[1] - ALGOL_TODAY.mA)).toBeLessThan(0.15);
    expect(Math.abs(algol.period - ALGOL_TODAY.period)).toBeLessThan(0.05);
    expect(algol.rrl[0]).toBeGreaterThanOrEqual(1);
  });

  it('sorts the zoo: close light pairs merge, wide ones never touch, and heavy metal-poor ones make black-hole pairs', () => {
    const light = zooRow({ m1: 1, q: 0.5, z: 0.02, periods: [1, 10_000], ...FIGURE_SWITCHES });
    expect(light[0].outcome).toBe('merger');
    expect(light[1].outcome).toBe('detached');
    const heavy = zooRow({ m1: 40, q: 0.9, z: 0.001, periods: [3000], ...FIGURE_SWITCHES });
    expect(heavy[0].outcome).toBe('bbh');
    expect(heavy[0].kw).toEqual([14, 14]);
    expect(ZOO_MASSES).toHaveLength(20);
    expect(ZOO_PERIODS[0]).toBe(1);
    expect(ZOO_PERIODS.at(-1)).toBe(10_000);
    for (const k of ZOO_KINDS) expect(k.about.length).toBeGreaterThan(20);
  });

  it('classifies every outcome consistently with the final types (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.8, max: 60, noNaN: true }), fc.double({ min: 0.2, max: 0.95, noNaN: true }), fc.double({ min: 0, max: 4, noNaN: true }), (m1, q, logP) => {
        const r = evolveBinary({ m1, m2: q * m1, period: 10 ** logP, ecc: 0, z: 0.02, tEnd: UNIVERSE_AGE }, { alpha1: 1, seed: 7 });
        const c = classify(r);
        const [a, b] = c.kw;
        if (c.outcome === 'dwd') expect([a, b].every((k) => k >= 10 && k <= 12)).toBe(true);
        if (c.outcome === 'dns') expect([a, b]).toEqual([13, 13]);
        if (c.outcome === 'bbh') expect([a, b]).toEqual([14, 14]);
        if (c.outcome === 'nsbh') expect([a, b].sort()).toEqual([13, 14]);
        if (c.outcome === 'detached') expect(r.bpp.some((row) => [3, 5, 7].includes(row[10]))).toBe(false);
        if (c.mergeTime !== undefined) expect(c.merges).toBe(r.bpp.at(-1)![1] + c.mergeTime < UNIVERSE_AGE);
      }),
      { numRuns: 30 },
    );
  });
});

describe('Chapter 28 in the course', () => {
  it('is written, with its sections and glossary terms; Chapter 31 is not yet', () => {
    const ch = CHAPTERS.find((c) => c.number === 28)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['The Roche potential', 'Mass transfer changes the orbit', 'The Algol paradox', 'Common envelopes', 'The binary zoo']);
    expect(CHAPTERS.find((c) => c.number === 31)!.load).toBeUndefined();
    for (const id of ['roche-lobe', 'mass-transfer', 'common-envelope', 'cataclysmic-variable', 'x-ray-binary', 'blue-straggler']) expect(GLOSSARY).toHaveProperty(id);
  });

  it('marks the interactive question: the stream misses a companion of 0.08 separations for donors under about a third of its mass', () => {
    const threshold = 10 ** bisect((lq) => (streamMisses(10 ** lq) ? 1 : -1), -1, Math.log10(2), 1e-4);
    expect(threshold).toBeCloseTo(STREAM_MISS_BELOW, 2);
    expect(checkStream({ q: 0.2 }).correct).toBe(true);
    expect(checkStream({ q: 0.3 }).correct).toBe(true);
    expect(checkStream({ q: 0.4 }).correct).toBe(false);
    expect(checkStream({ q: 2 }).correct).toBe(false);
  });

  it('keeps T Coronae Borealis’s status in data, as of a date', () => {
    expect(T_CRB.eruptions).toEqual([1866, 1946]);
    expect(T_CRB.asOf).toMatch(/2026|2027/);
  });
});
