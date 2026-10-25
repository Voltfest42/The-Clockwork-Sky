import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { angularMomentum, energy } from '../src/core/nbody/diagnostics';
import { createIas15, RADAU_SPACINGS } from '../src/core/nbody/ias15';
import { keplerDrift, stumpff } from '../src/core/nbody/keplerDrift';
import { createSystem, gravity, toCentreOfMassFrame, type BodySpec } from '../src/core/nbody/system';
import { keplerPosition, orbitPeriod, perihelionState } from '../src/core/nbody/twoBody';
import { createWisdomHolman, jacobiOrder } from '../src/core/nbody/wisdomHolman';
import { createStepper } from '../src/core/integrate/steppers';
import { expectNear } from './helpers';

/** The figure-eight of three equal masses (G = m = 1), Simó's initial conditions, and its period. */
export const FIGURE_EIGHT: BodySpec[] = [
  { gm: 1, x: [0.97000436, -0.24308753, 0], v: [0.466203685, 0.43236573, 0] },
  { gm: 1, x: [-0.97000436, 0.24308753, 0], v: [0.466203685, 0.43236573, 0] },
  { gm: 1, x: [0, 0, 0], v: [-0.93240737, -0.86473146, 0] },
];
export const FIGURE_EIGHT_PERIOD = 6.32591398;

/** A Sun (G·m = 1) and planets on circular-ish orbits, for comparing integrators. */
function quietSystem(): BodySpec[] {
  const planets = [
    { a: 1, e: 0.02, gm: 3e-6, phase: 0 },
    { a: 1.52, e: 0.09, gm: 3e-7, phase: 1 },
    { a: 5.2, e: 0.05, gm: 1e-3, phase: 2 },
    { a: 9.5, e: 0.05, gm: 3e-4, phase: 4 },
  ];
  return [
    { gm: 1, x: [0, 0, 0], v: [0, 0, 0] },
    ...planets.map((p) => {
      const s = perihelionState(1 + p.gm, p.a, p.e);
      const c = Math.cos(p.phase);
      const sn = Math.sin(p.phase);
      return { gm: p.gm, x: [s.x[0] * c, s.x[0] * sn, 0.01 * p.a] as const, v: [-s.v[1] * sn, s.v[1] * c, 0] as const };
    }),
  ];
}

describe('Stumpff’s functions', () => {
  it('match their closed forms on both sides of the series’ range', () => {
    const out = [0, 0, 0, 0];
    for (const z of [-30, -2, -0.999, -0.3, 0, 0.5, 0.999, 1.001, 4, 39]) {
      stumpff(z, out);
      if (z === 0) {
        expect(out).toEqual([1, 1, 0.5, 1 / 6]);
        continue;
      }
      const q = Math.sqrt(Math.abs(z));
      const want = z > 0 ? [Math.cos(q), Math.sin(q) / q, (1 - Math.cos(q)) / z, (q - Math.sin(q)) / (z * q)] : [Math.cosh(q), Math.sinh(q) / q, (Math.cosh(q) - 1) / -z, (Math.sinh(q) - q) / (-z * q)];
      for (let k = 0; k < 4; k++) expectNear(out[k], want[k], 1e-13 * Math.max(1, Math.abs(want[k])), `c${k}(${z})`);
    }
  });

  it('satisfy z c(k+2) = 1/k! − c(k)', () => {
    fc.assert(
      fc.property(fc.double({ min: -50, max: 50, noNaN: true }), (z) => {
        const out = [0, 0, 0, 0];
        stumpff(z, out);
        expectNear(z * out[2], 1 - out[0], 1e-12 * Math.max(1, Math.abs(out[0])), 'c2');
        expectNear(z * out[3], 1 - out[1], 1e-12 * Math.max(1, Math.abs(out[1])), 'c3');
      }),
    );
  });
});

describe('the Kepler drift', () => {
  it('follows Kepler’s solution on ellipses of any eccentricity', () => {
    for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
      const { x, v } = perihelionState(1, 1, e);
      const X = Float64Array.from(x);
      const V = Float64Array.from(v);
      for (const t of [0.01, 0.7, 2, 3.1, 5]) {
        X.set(x);
        V.set(v);
        keplerDrift(1, X, V, 0, t);
        const want = keplerPosition(1, 1, e, t);
        expectNear(X[0], want.x, 1e-10, `x at e = ${e}, t = ${t}`);
        expectNear(X[1], want.y, 1e-10, `y at e = ${e}, t = ${t}`);
      }
    }
  });

  it('runs backward as well as forward, and drops whole laps', () => {
    const { x, v } = perihelionState(1, 2, 0.3);
    const X = Float64Array.from(x);
    const V = Float64Array.from(v);
    keplerDrift(1, X, V, 0, 1.234);
    keplerDrift(1, X, V, 0, -1.234);
    expectNear(X[0], x[0], 1e-12, 'back at perihelion');
    expectNear(V[1], v[1], 1e-12, 'with the same speed');
    keplerDrift(1, X, V, 0, 10 * orbitPeriod(1, 2));
    expectNear(X[0], x[0], 1e-9, 'ten laps later');
  });

  it('handles parabolic and hyperbolic orbits: energy and angular momentum are kept', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.3, max: 3, noNaN: true }),
        fc.double({ min: 0.2, max: 2.5, noNaN: true }),
        fc.double({ min: -1, max: 1, noNaN: true }),
        fc.double({ min: -20, max: 20, noNaN: true }),
        (r, speed, tilt, t) => {
          const X = Float64Array.from([r, 0, 0]);
          const V = Float64Array.from([speed * tilt * 0.3, speed, speed * tilt * 0.2]);
          const e0 = (V[0] ** 2 + V[1] ** 2 + V[2] ** 2) / 2 - 1 / r;
          const h0 = [X[1] * V[2] - X[2] * V[1], X[2] * V[0] - X[0] * V[2], X[0] * V[1] - X[1] * V[0]];
          keplerDrift(1, X, V, 0, t);
          const rr = Math.hypot(X[0], X[1], X[2]);
          const e1 = (V[0] ** 2 + V[1] ** 2 + V[2] ** 2) / 2 - 1 / rr;
          const h1 = [X[1] * V[2] - X[2] * V[1], X[2] * V[0] - X[0] * V[2], X[0] * V[1] - X[1] * V[0]];
          expectNear(e1, e0, 1e-9 * Math.max(1, Math.abs(e0)), 'energy');
          for (let k = 0; k < 3; k++) expectNear(h1[k], h0[k], 1e-9 * Math.max(1, Math.hypot(...h0)), 'angular momentum');
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('Wisdom–Holman', () => {
  it('is exact for one planet, whatever the step', () => {
    const { x, v } = perihelionState(1.001, 1, 0.6);
    const s = createSystem([
      { gm: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { gm: 0.001, x, v },
    ]);
    toCentreOfMassFrame(s);
    const wh = createWisdomHolman(s.gm, gravity(s.gm));
    const steps = 7;
    const dt = orbitPeriod(1.001, 1) / steps;
    for (let k = 0; k < steps * 3; k++) wh.step(s.x, s.v, dt);
    const rel = [s.x[3] - s.x[0], s.x[4] - s.x[1]];
    expectNear(rel[0], x[0], 1e-10, 'back at perihelion after three orbits of 7 steps');
    expectNear(rel[1], 0, 1e-10, 'on the axis');
  });

  it('keeps the energy of a planetary system to a part in 10⁸ over 1,000 years, and its angular momentum exactly', () => {
    const s = toCentreOfMassFrame(createSystem(quietSystem()));
    const e0 = energy(s);
    const l0 = angularMomentum(s);
    const wh = createWisdomHolman(s.gm, gravity(s.gm), jacobiOrder(s.gm, s.x));
    const dt = (2 * Math.PI) / 30;
    let worst = 0;
    for (let k = 0; k < 30_000; k++) {
      wh.step(s.x, s.v, dt);
      if (k % 100 === 0) worst = Math.max(worst, Math.abs((energy(s) - e0) / e0));
    }
    expect(worst).toBeLessThan(1e-7);
    const l = angularMomentum(s);
    expectNear(l[2], l0[2], 1e-12 * Math.abs(l0[2]), 'angular momentum');
  });

  it('beats leapfrog by far at the same step', () => {
    const run = (method: 'wh' | 'leapfrog') => {
      const s = toCentreOfMassFrame(createSystem(quietSystem()));
      const e0 = energy(s);
      const stepper = method === 'wh' ? createWisdomHolman(s.gm, gravity(s.gm), jacobiOrder(s.gm, s.x)) : createStepper('leapfrog', s.x.length, gravity(s.gm));
      let worst = 0;
      for (let k = 0; k < 3000; k++) {
        stepper.step(s.x, s.v, (2 * Math.PI) / 50);
        worst = Math.max(worst, Math.abs((energy(s) - e0) / e0));
      }
      return worst;
    };
    expect(run('wh') * 1000).toBeLessThan(run('leapfrog'));
  });

  it('puts the heaviest body first and the rest by distance', () => {
    const gm = Float64Array.from([1e-3, 1, 1e-6]);
    const x = Float64Array.from([5, 0, 0, 0.1, 0, 0, 0, 1.1, 0]);
    expect(jacobiOrder(gm, x)).toEqual([1, 2, 0]);
  });
});

describe('IAS15', () => {
  it('takes its accelerations at the Gauss–Radau spacings: the roots of P₇ + P₈ on [0, 1]', () => {
    const legendre = (n: number, x: number) => {
      let [p0, p1] = [1, x];
      for (let k = 2; k <= n; k++) [p0, p1] = [p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k];
      return n === 0 ? p0 : p1;
    };
    expect(RADAU_SPACINGS).toHaveLength(8);
    for (const h of RADAU_SPACINGS) expectNear(legendre(7, 2 * h - 1) + legendre(8, 2 * h - 1), 0, 1e-13, `h = ${h}`);
  });

  it('follows a two-body ellipse to round-off over 100 orbits, even at e = 0.99', () => {
    for (const e of [0, 0.5, 0.99]) {
      const { x, v } = perihelionState(1, 1, e);
      const s = createSystem([
        { gm: 1, x: [0, 0, 0], v: [0, 0, 0] },
        { gm: 0, x, v },
      ]);
      const ias = createIas15(s.x.length, gravity(s.gm), { dt: 0.01 });
      const end = 100 * 2 * Math.PI;
      let t = 0;
      while (t < end) t += ias.step(s.x, s.v, end - t);
      expectNear(t, end, 1e-9, 'landed on the end');
      expectNear(s.x[3], x[0], 1e-9, `back at perihelion, e = ${e}`);
      expectNear(s.x[4], 0, 1e-8, `on the axis, e = ${e}`);
    }
  });

  it('brings the figure-eight back to its start after one period', () => {
    const s = createSystem(FIGURE_EIGHT);
    const start = Float64Array.from(s.x);
    const ias = createIas15(s.x.length, gravity(s.gm), { dt: 0.01 });
    let t = 0;
    while (t < FIGURE_EIGHT_PERIOD) t += ias.step(s.x, s.v, FIGURE_EIGHT_PERIOD - t);
    for (let k = 0; k < 9; k++) expectNear(s.x[k], start[k], 1e-6, `coordinate ${k}`);
  });

  it('keeps the energy of the Pythagorean problem through its close encounters', () => {
    const s = createSystem([
      { gm: 3, x: [1, 3, 0], v: [0, 0, 0] },
      { gm: 4, x: [-2, -1, 0], v: [0, 0, 0] },
      { gm: 5, x: [1, -1, 0], v: [0, 0, 0] },
    ]);
    const e0 = energy(s);
    const ias = createIas15(s.x.length, gravity(s.gm), { dt: 0.01 });
    let t = 0;
    let steps = 0;
    let closest = Infinity;
    while (t < 30) {
      t += ias.step(s.x, s.v);
      steps++;
      for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) closest = Math.min(closest, Math.hypot(s.x[3 * i] - s.x[3 * j], s.x[3 * i + 1] - s.x[3 * j + 1]));
    }
    expect(closest).toBeLessThan(0.01);
    expect(Math.abs((energy(s) - e0) / e0)).toBeLessThan(1e-9);
    expect(steps).toBeLessThan(20_000);
  });

  it('runs backwards: forward then back returns to the start', () => {
    const s = toCentreOfMassFrame(createSystem(quietSystem()));
    const start = Float64Array.from(s.x);
    const ias = createIas15(s.x.length, gravity(s.gm), { dt: 0.1 });
    let t = 0;
    while (t < 50) t += ias.step(s.x, s.v, 50 - t);
    ias.invalidate();
    ias.dt = -0.1;
    while (t > 0) t += ias.step(s.x, s.v, -t);
    for (let k = 0; k < s.x.length; k++) expectNear(s.x[k], start[k], 1e-10, `coordinate ${k}`);
  });

  it('agrees with Wisdom–Holman on a quiet system', () => {
    const a = toCentreOfMassFrame(createSystem(quietSystem()));
    const b = toCentreOfMassFrame(createSystem(quietSystem()));
    const wh = createWisdomHolman(a.gm, gravity(a.gm), jacobiOrder(a.gm, a.x));
    const ias = createIas15(b.x.length, gravity(b.gm), { dt: 0.1 });
    const dt = (2 * Math.PI) / 200;
    const steps = 200 * 50;
    for (let k = 0; k < steps; k++) wh.step(a.x, a.v, dt);
    const end = steps * dt;
    let t = 0;
    while (t < end) t += ias.step(b.x, b.v, end - t);
    for (let i = 1; i < 5; i++) {
      const d = Math.hypot(a.x[3 * i] - b.x[3 * i], a.x[3 * i + 1] - b.x[3 * i + 1], a.x[3 * i + 2] - b.x[3 * i + 2]);
      expect(d, `planet ${i} after 50 years`).toBeLessThan(1e-5);
    }
  });
});
