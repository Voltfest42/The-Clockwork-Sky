import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU, GM_EARTH, GM_SUN } from '../src/core/constants';
import { createStepper, METHODS, ORDER, type Method, type StepStage } from '../src/core/integrate/steppers';
import { angularMomentum, energy, momentum, relativeOrbit } from '../src/core/nbody/diagnostics';
import { createHost, MAX_TRAIL, type NBodyMessage, type NBodySnapshot } from '../src/core/nbody/protocol';
import { Simulation } from '../src/core/nbody/simulation';
import { createSystem, gmToAuDay, GM_SUN_AU_DAY, gravity, speedFromAuDay, speedToAuDay, toCentreOfMassFrame, type BodySpec } from '../src/core/nbody/system';
import { circularSpeed, escapeSpeed, keplerPosition, orbitPeriod, perihelionState } from '../src/core/nbody/twoBody';
import { expectNear } from './helpers';

/** A test planet round a Sun of G·m = 1, on an orbit of semi-major axis 1 and eccentricity e. */
function planet(e: number, gmPlanet = 0): BodySpec[] {
  const { x, v } = perihelionState(1, 1, e);
  return [
    { gm: 1, x: [0, 0, 0], v: [0, 0, 0] },
    { gm: gmPlanet, x, v },
  ];
}

const PERIOD = 2 * Math.PI;

/** Runs one planet for some orbits and returns how far it ended from where Kepler's solution says. */
function positionError(method: Method, e: number, stepsPerOrbit: number, orbits = 1): number {
  const sim = new Simulation(planet(e), method, PERIOD / stepsPerOrbit);
  sim.advance(stepsPerOrbit * orbits);
  const want = keplerPosition(1, 1, e, sim.system.t);
  return Math.hypot(sim.system.x[3] - want.x, sim.system.x[4] - want.y);
}

describe('units', () => {
  it('converts the Sun’s G·m to AU³/day², the Gaussian constant squared', () => {
    expectNear(GM_SUN_AU_DAY, 0.017_202_098_95 ** 2, 1e-12, 'k²');
    expectNear(gmToAuDay(GM_SUN), GM_SUN_AU_DAY, 1e-18, 'same value');
    expectNear(speedFromAuDay(speedToAuDay(29_780)), 29_780, 1e-9, 'round trip');
    // Earth at 1 AU: 2π AU a year is about 0.0172 AU/day.
    expectNear(circularSpeed(GM_SUN_AU_DAY, 1), 0.017_202, 1e-6, 'circular speed at 1 AU');
  });

  it('gives Earth’s circular and escape speeds at the ground: 7.9 and 11.2 km/s', () => {
    const R = 6.371e6;
    expectNear(circularSpeed(GM_EARTH, R) / 1000, 7.91, 0.01, 'circular');
    expectNear(escapeSpeed(GM_EARTH, R) / 1000, 11.19, 0.01, 'escape');
    expectNear(orbitPeriod(GM_SUN, AU) / 86_400, 365.25, 0.1, 'a year from the third law');
  });
});

describe('gravity', () => {
  it('pulls by the inverse square of the distance', () => {
    const acc = gravity(Float64Array.from([1, 0]));
    const out = new Float64Array(6);
    acc(Float64Array.from([0, 0, 0, 2, 0, 0]), out);
    expectNear(out[3], -1 / 4, 1e-15, 'at distance 2');
    acc(Float64Array.from([0, 0, 0, 0, 4, 0]), out);
    expectNear(out[4], -1 / 16, 1e-15, 'at distance 4');
    expect(out[0]).toBe(0); // a test particle pulls nothing
  });

  it('obeys Newton’s third law: the pulls on all the bodies add up to nothing', () => {
    const body = fc.record({
      gm: fc.double({ min: 0, max: 10, noNaN: true }),
      x: fc.tuple(fc.double({ min: -5, max: 5, noNaN: true }), fc.double({ min: -5, max: 5, noNaN: true }), fc.double({ min: -5, max: 5, noNaN: true })),
    });
    fc.assert(
      fc.property(fc.array(body, { minLength: 2, maxLength: 6 }), (bodies) => {
        const x = Float64Array.from(bodies.flatMap((b) => b.x));
        for (let i = 0; i < bodies.length; i++)
          for (let j = i + 1; j < bodies.length; j++) fc.pre(Math.hypot(x[3 * i] - x[3 * j], x[3 * i + 1] - x[3 * j + 1], x[3 * i + 2] - x[3 * j + 2]) > 0.1);
        const gm = Float64Array.from(bodies.map((b) => b.gm));
        const out = new Float64Array(x.length);
        gravity(gm)(x, out);
        for (let k = 0; k < 3; k++) {
          let total = 0;
          let scale = 0;
          for (let i = 0; i < bodies.length; i++) {
            total += gm[i] * out[3 * i + k];
            scale += Math.abs(gm[i] * out[3 * i + k]);
          }
          expect(Math.abs(total)).toBeLessThanOrEqual(1e-12 * (scale + 1));
        }
      }),
    );
  });
});

describe('the teaching integrators', () => {
  it('follow Kepler’s solution, more closely the higher their order', () => {
    expect(positionError('euler', 0, 10_000)).toBeLessThan(0.05);
    expect(positionError('leapfrog', 0.5, 2_000)).toBeLessThan(1e-3);
    expect(positionError('rk4', 0.5, 2_000)).toBeLessThan(1e-8);
  });

  it('converge at their order: halving the step cuts the error 2, 4 or 16 times', () => {
    for (const method of METHODS) {
      const coarse = positionError(method, 0.3, method === 'euler' ? 4_000 : 400);
      const fine = positionError(method, 0.3, method === 'euler' ? 8_000 : 800);
      const order = Math.log2(coarse / fine);
      expect(order, method).toBeGreaterThan(ORDER[method] - 0.25);
      expect(order, method).toBeLessThan(ORDER[method] + 0.4);
    }
  });

  it('Euler spirals outward: its energy only ever grows', () => {
    const sim = new Simulation(planet(0, 1e-6), 'euler', PERIOD / 100);
    let previous = sim.energyError();
    for (let k = 0; k < 500; k++) {
      sim.advance(1);
      expect(sim.energyError()).toBeGreaterThan(previous);
      previous = sim.energyError();
    }
    const orbit = relativeOrbit(sim.system, 1, 0);
    expect(orbit.a).toBeGreaterThan(1.3);
  });

  it('leapfrog’s energy error stays bounded over a thousand orbits, and its angular momentum is kept exactly', () => {
    const sim = new Simulation(planet(0.5, 1e-6), 'leapfrog', PERIOD / 200);
    let worst = 0;
    let worstLate = 0;
    for (let orbit = 0; orbit < 1_000; orbit++) {
      for (let k = 0; k < 200; k++) {
        sim.advance(1);
        const err = Math.abs(sim.energyError());
        worst = Math.max(worst, err);
        if (orbit >= 900) worstLate = Math.max(worstLate, err);
      }
    }
    expect(worst).toBeLessThan(5e-3);
    // No drift: the last hundred orbits are no worse than the whole run.
    expect(worstLate).toBeGreaterThan(0.8 * worst);
    expect(sim.angularMomentumError()).toBeLessThan(1e-11);
  });

  it('RK4 is far more accurate per step, but its energy drifts steadily downward', () => {
    const sim = new Simulation(planet(0.5, 1e-6), 'rk4', PERIOD / 200);
    sim.advance(200 * 10);
    const after10 = sim.energyError();
    sim.advance(200 * 90);
    const after100 = sim.energyError();
    expect(after10).toBeLessThan(0);
    expect(Math.abs(after10)).toBeLessThan(1e-5);
    expectNear(after100 / after10, 10, 1, 'linear drift');
  });

  it('every method keeps the total momentum, since the pulls come in equal and opposite pairs', () => {
    const bodies: BodySpec[] = [
      { gm: 1, x: [0, 0, 0], v: [0, -0.01, 0] },
      { gm: 0.01, x: [1, 0, 0], v: [0, 1, 0.02] },
      { gm: 0.001, x: [-2, 0.5, 0], v: [0.1, -0.6, 0] },
    ];
    for (const method of METHODS) {
      const sim = new Simulation(bodies, method, 0.01);
      const p0 = momentum(sim.system);
      sim.advance(2_000);
      const p = momentum(sim.system);
      for (let k = 0; k < 3; k++) expectNear(p[k], p0[k], 1e-14, `${method} momentum ${k}`);
    }
  });

  it('reports the stages inside a step: Euler drifts then kicks, leapfrog kicks, drifts and kicks, RK4 probes four times', () => {
    const kinds = (method: Method) => {
      const seen: StepStage['kind'][] = [];
      new Simulation(planet(0), method, 0.1).advance(1, (s) => seen.push(s.kind));
      return seen;
    };
    expect(kinds('euler')).toEqual(['drift', 'kick']);
    expect(kinds('leapfrog')).toEqual(['kick', 'drift', 'kick']);
    expect(kinds('rk4')).toEqual(['probe', 'probe', 'probe', 'probe', 'drift']);
  });

  it('counts the cost: one acceleration a step for Euler and leapfrog, four for RK4', () => {
    for (const [method, perStep] of [['euler', 1], ['leapfrog', 1], ['rk4', 4]] as const) {
      const stepper = createStepper(method, 2, (x, out) => {
        out[0] = -x[0];
        out[1] = -x[1];
      });
      const x = Float64Array.from([1, 0]);
      const v = Float64Array.from([0, 1]);
      for (let k = 0; k < 10; k++) stepper.step(x, v, 0.1);
      // Leapfrog works out one extra acceleration to start.
      expect(stepper.evaluations).toBe(10 * perStep + (method === 'leapfrog' ? 1 : 0));
    }
  });

  it('runs the figure-eight of three equal stars round one period and back (Chenciner and Montgomery, Simó’s values)', () => {
    const x1: [number, number, number] = [0.970_004_36, -0.243_087_53, 0];
    const v3: [number, number, number] = [-0.932_407_37, -0.864_731_46, 0];
    const bodies: BodySpec[] = [
      { gm: 1, x: x1, v: [-v3[0] / 2, -v3[1] / 2, 0] },
      { gm: 1, x: [-x1[0], -x1[1], 0], v: [-v3[0] / 2, -v3[1] / 2, 0] },
      { gm: 1, x: [0, 0, 0], v: v3 },
    ];
    const T = 6.325_913_98;
    const sim = new Simulation(bodies, 'rk4', T / 20_000);
    sim.advance(20_000);
    for (let i = 0; i < 9; i++) expectNear(sim.system.x[i], bodies[Math.floor(i / 3)].x[i % 3], 1e-5, `coordinate ${i}`);
    expect(Math.abs(sim.energyError())).toBeLessThan(1e-10);
  });

  it('reads the orbit back from the state', () => {
    const sim = new Simulation(planet(0.6, 0), 'rk4', 0.01);
    sim.advance(137);
    const orbit = relativeOrbit(sim.system, 1, 0);
    expectNear(orbit.a, 1, 1e-6, 'a');
    expectNear(orbit.e, 0.6, 1e-6, 'e');
    // An escape speed gives an open orbit.
    const open = createSystem([
      { gm: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { gm: 0, x: [1, 0, 0], v: [0, escapeSpeed(1, 1) * 1.01, 0] },
    ]);
    expect(relativeOrbit(open, 1, 0).e).toBeGreaterThan(1);
    expect(relativeOrbit(open, 1, 0).a).toBeLessThan(0);
  });

  it('moves into the centre-of-mass frame', () => {
    const s = toCentreOfMassFrame(createSystem([
      { gm: 3, x: [1, 0, 0], v: [0, 1, 0] },
      { gm: 1, x: [5, 0, 0], v: [0, -1, 0] },
    ]));
    const p = momentum(s);
    expect(Math.hypot(...p)).toBeLessThan(1e-15);
    expectNear(s.x[0], -1, 1e-15, 'heavier body');
    expectNear(s.x[3], 3, 1e-15, 'lighter body');
    expectNear(energy(s), 0.5 * 3 * 0.25 + 0.5 * 1 * 2.25 - 3 / 4, 1e-14, 'energy');
    expectNear(angularMomentum(s)[2], 3 * -1 * 0.5 + 1 * 3 * -1.5, 1e-14, 'angular momentum');
  });

  it('refuses bodies and steps that make no sense', () => {
    expect(() => createSystem([{ gm: -1, x: [0, 0, 0], v: [0, 0, 0] }])).toThrow(/mass/);
    expect(() => createSystem([{ gm: 1, x: [Number.NaN, 0, 0], v: [0, 0, 0] }])).toThrow(/number/);
    expect(() => new Simulation(planet(0), 'leapfrog', 0)).toThrow(/time step/);
    const sim = new Simulation(planet(0), 'leapfrog', 0.1);
    expect(() => sim.edit([{ index: 5, gm: 1 }])).toThrow(/no body 6/);
  });
});

describe('the worker protocol', () => {
  function host() {
    const messages: NBodyMessage[] = [];
    const h = createHost((m) => messages.push(m));
    const states = () => messages.filter((m): m is NBodySnapshot => m.type === 'state');
    return { h, messages, states };
  }

  it('loads, steps, runs, pauses and edits', () => {
    const { h, states, messages } = host();
    h.receive({ type: 'load', bodies: planet(0, 1e-6), method: 'leapfrog', dt: PERIOD / 100, track: [1] });
    expect(states()).toHaveLength(1);
    expect(Array.from(states()[0].trail)).toEqual([1, 0, 0]);

    h.receive({ type: 'step', steps: 25 });
    const quarter = states()[1];
    expect(quarter.steps).toBe(25);
    expect(quarter.trail.length).toBe(75);
    expectNear(quarter.x[3], 0, 1e-3, 'a quarter of the way round, x');
    expectNear(quarter.x[4], 1, 1e-3, 'y');

    // Run at one orbit per real second for half a second, in ticks of 1/60 s.
    h.receive({ type: 'run', rate: PERIOD, postEvery: 0.1 });
    expect(h.running).toBe(true);
    for (let k = 0; k < 30; k++) h.tick(1 / 60);
    expect(states().length).toBeGreaterThanOrEqual(5);
    expect(states().at(-1)!.running).toBe(true);

    h.receive({ type: 'pause' });
    expect(h.running).toBe(false);
    const after = states().at(-1)!;
    expectNear(after.steps, 75, 1, 'steps after half an orbit');
    expect(after.running).toBe(false);
    expect(Math.abs(after.energyError)).toBeLessThan(1e-3);
    const paused = after.steps;
    h.tick(1);
    expect(states().at(-1)!.steps).toBe(paused);

    h.receive({ type: 'edit', method: 'rk4', dt: PERIOD / 1000 });
    h.receive({ type: 'step' });
    expectNear(states().at(-1)!.t - states().at(-2)!.t, PERIOD / 1000, 1e-12, 'new step size');
    expect(messages.filter((m) => m.type === 'error')).toEqual([]);
  });

  it('thins out a long trail evenly, ending at the latest step', () => {
    const { h, states } = host();
    h.receive({ type: 'load', bodies: planet(0), method: 'rk4', dt: PERIOD / 10_000, track: [1] });
    h.receive({ type: 'step', steps: 10_000 });
    const s = states().at(-1)!;
    expect(s.trail.length).toBe(3 * MAX_TRAIL);
    expectNear(s.trail[3 * MAX_TRAIL - 3], s.x[3], 1e-15, 'last point is the planet now');
  });

  it('answers nonsense with an error message, not an exception', () => {
    const { h, messages } = host();
    h.receive({ type: 'run', rate: 1 });
    h.receive({ type: 'load', bodies: planet(0), method: 'euler', dt: -1 });
    h.receive({ type: 'load', bodies: planet(0), method: 'euler', dt: 1 });
    h.receive({ type: 'run', rate: Number.NaN });
    expect(messages.filter((m) => m.type === 'error').map((m) => (m as { message: string }).message)).toEqual([
      'Nothing is loaded.',
      'The time step must be a positive number.',
      'The rate must be a positive number.',
    ]);
  });

  it('stops and says so when a simulation blows up', () => {
    const { h, messages } = host();
    // Two bodies dropped straight at each other: Euler flings them apart at a speed that overflows.
    h.receive({ type: 'load', bodies: [{ gm: 1, x: [0, 0, 0], v: [0, 0, 0] }, { gm: 1, x: [1e-300, 0, 0], v: [0, 0, 0] }], method: 'euler', dt: 1 });
    h.receive({ type: 'step', steps: 3 });
    expect(messages.at(-1)).toEqual({ type: 'error', message: expect.stringMatching(/smaller time step/) });
  });
});
