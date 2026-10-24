import { describe, expect, it } from 'vitest';
import { checkOrbitSpeed } from '../src/content/checks/chapter7Answers';
import { G, GM_EARTH, R_EARTH } from '../src/core/constants';
import { BALANCE_PAIRS, WEIGHING_PAIRS } from '../src/data/gravity';
import { balanceDistance, balancePeriod, describeBalance, wobbleSpeed } from '../src/figures/barycentre';
import { CIRCULAR_SPEED, describeShot, ESCAPE_SPEED, fire, gravityAt, positionAt, scaleBarLength, viewFor } from '../src/figures/cannon';
import { arrivalMiss, LAUNCH_LEAD, marsLead, nextWindow, SYNODIC, TRANSFER } from '../src/figures/hohmann';
import { springEnergies, stepSpring } from '../src/figures/spring';
import { energyHistory, formatEnergyError, PERIOD, stagesOfStep, orbitBodies } from '../src/figures/stepping';
import { harbourAngle, LUNAR_DAY_HOURS, MOON_TIDE, stretch, SUN_PULL_RATIO, SUN_TIDE, SUN_TIDE_RATIO, tideHeight, tideRange } from '../src/figures/tides';
import { formatPeriodDays, massFromOrbit, percentOff, scientific } from '../src/figures/weighing';
import { createSystem } from '../src/core/nbody/system';
import { jdFromCalendar } from '../src/core/time/calendar';
import { DEG } from '../src/core/units';
import { expectNear } from './helpers';

const pair = (id: string) => BALANCE_PAIRS.find((p) => p.id === id)!;

describe('the falling Moon (brief §8)', () => {
  it('passes Newton’s Moon test: the Moon falls 1/3600 as fast as an apple, to about 1%', () => {
    const r = 384_400e3;
    const T = 27.3217 * 86_400;
    const moonFall = (4 * Math.PI ** 2 * r) / T ** 2;
    expectNear(moonFall, 0.002_72, 0.000_01, 'the Moon’s acceleration');
    const fromApple = 9.81 / (r / R_EARTH) ** 2;
    expect(Math.abs(moonFall / fromApple - 1)).toBeLessThan(0.015);
    // In one second the Moon drops about 1.36 mm below a straight line.
    expectNear((moonFall / 2) * 1000, 1.36, 0.01, 'mm in a second');
  });
});

describe('Newton’s cannon (7.1)', () => {
  it('needs 7.85 km/s to circle and 11.1 km/s to escape from the 100 km mountain', () => {
    expectNear(CIRCULAR_SPEED / 1000, 7.85, 0.01, 'circular');
    expectNear(ESCAPE_SPEED / 1000, 11.1, 0.01, 'escape');
  });

  it('lands slow shots farther away the faster they go, and drops a still ball straight down', () => {
    const still = fire(0);
    expect(still.outcome).toBe('lands');
    expectNear(still.range!, 0, 1, 'range');
    // Falling 100 km from rest: about 143 s, a little more since gravity weakens with height.
    expectNear(still.duration, 145, 3, 'time to fall');
    let last = 0;
    for (const v of [2000, 4000, 6000, 7000, 7800]) {
      const shot = fire(v);
      expect(shot.outcome, `${v}`).toBe('lands');
      expect(shot.range!).toBeGreaterThan(last);
      last = shot.range!;
    }
    expectNear(fire(2000).range! / 1000, 297, 3, '2 km/s range, km');
  });

  it('goes round once and comes back to the mountain top between the circular and the escape speed', () => {
    for (const v of [7900, 9500]) {
      const shot = fire(v);
      expect(shot.outcome).toBe('orbits');
      expect(shot.leaves).toBe(false);
      const end = shot.path.at(-1)!;
      expectNear(Math.hypot(end.x, end.y - (R_EARTH + 100_000)), 0, 1, 'back at the start');
      // The path's own orbit time agrees with Kepler's third law.
      expectNear(shot.duration / shot.period!, 1, 0.002, 'one period');
      expectNear(shot.lowest!, 100_000, 1, 'lowest point is the mountain top');
    }
    expectNear(fire(7900).period! / 60, 88, 1, 'minutes round at 7.9 km/s');
    expect(fire(10_500).leaves).toBe(true);
  });

  it('escapes at 11.2 km/s, out of the picture', () => {
    const shot = fire(11_200);
    expect(shot.outcome).toBe('escapes');
    expect(shot.leaves).toBe(true);
    expect(describeShot(shot)).toMatch(/escapes/);
  });

  it('keeps the ball’s energy while it flies (leapfrog, a few thousand steps an orbit)', () => {
    const shot = fire(9_500);
    const energy = (i: number) => {
      const a = shot.path[i];
      const b = shot.path[i + 1];
      const v = Math.hypot(b.x - a.x, b.y - a.y) / (b.t - a.t);
      const r = Math.hypot((a.x + b.x) / 2, (a.y + b.y) / 2);
      return (v * v) / 2 - GM_EARTH / r;
    };
    const e0 = energy(0);
    for (const i of [100, 500, 1000, shot.path.length - 3]) expect(Math.abs(energy(i) / e0 - 1)).toBeLessThan(2e-3);
  });

  it('places the ball between path points, fits the view and picks round scale bars', () => {
    const shot = fire(7_000);
    const mid = positionAt(shot, shot.duration / 2);
    expect(Math.hypot(mid.x, mid.y)).toBeGreaterThan(R_EARTH);
    const v = viewFor([shot], 1.4);
    for (const p of shot.path) expect(Math.abs(p.x - v.cx)).toBeLessThanOrEqual(v.half);
    expect(scaleBarLength(1_000_000)).toBe(200_000);
    expect(scaleBarLength(30_000_000)).toBe(10_000_000);
    expectNear(gravityAt(420_000), 0.88, 0.005, 'gravity at the ISS');
  });
});

describe('step by step (7.2)', () => {
  it('starts an Earth-mass planet on a 1 AU orbit lasting a year', () => {
    expectNear(PERIOD, 365.25, 0.05, 'days');
    const s = createSystem(orbitBodies(0.5));
    expectNear(Math.hypot(s.x[3] - s.x[0], s.x[4] - s.x[1]), 0.5, 1e-12, 'perihelion distance');
  });

  it('charts Euler’s energy error running away, leapfrog’s staying put and RK4’s creeping up', () => {
    const run = (m: 'euler' | 'leapfrog' | 'rk4', steps: number, e: number) => energyHistory(m, steps, e, 20);
    expect(run('euler', 100, 0).at(-1)!.y).toBeGreaterThan(-0.5);
    expect(run('leapfrog', 100, 0).at(-1)!.y).toBeLessThan(-6);
    // RK4's error grows tenfold from the second orbit to the twentieth: a steady drift.
    const rk4 = run('rk4', 100, 0);
    expectNear(rk4.at(-1)!.y - rk4[16].y, 1, 0.15, 'log of the growth');
    // On a circle, over 20 orbits, leapfrog's bounded error beats RK4's drift; on a stretched orbit with many steps, RK4 wins.
    expect(run('leapfrog', 60, 0).at(-1)!.y).toBeLessThan(run('rk4', 60, 0).at(-1)!.y - 0.5);
    expect(run('rk4', 365, 0.5).at(-1)!.y).toBeLessThan(run('leapfrog', 365, 0.5).at(-1)!.y - 2);
    // Leapfrog doesn't grow: its worst error over the last five orbits is within a factor of 2 of its worst over the first five.
    const lf = energyHistory('leapfrog', 36, 0.5, 20);
    const worst = (pts: typeof lf) => Math.max(...pts.map((p) => p.y));
    expect(worst(lf.slice(-40))).toBeLessThan(worst(lf.slice(1, 41)) + Math.log10(2));
  });

  it('shows the stages of a step: four trial points for RK4', () => {
    const s = createSystem(orbitBodies(0));
    expect(stagesOfStep('rk4', s.x, s.v, 12).filter((st) => st.kind === 'probe')).toHaveLength(4);
    expect(formatEnergyError(0.031)).toBe('+3.1%');
    expect(formatEnergyError(-4.2e-7)).toBe('−4.2 × 10⁻⁷');
    expect(formatEnergyError(1e-14)).toBe('under one part in a trillion');
  });
});

describe('the cosmic scale (7.3)', () => {
  it('weighs every pair to within 1% from its orbit (brief §8)', () => {
    for (const p of WEIGHING_PAIRS) {
      const m = massFromOrbit(p.a, p.period);
      expect(Math.abs(m / p.mass - 1), p.name).toBeLessThan(0.01);
    }
    expect(scientific(massFromOrbit(149_598_000, 365.256))).toBe('1.99 × 10³⁰');
    expect(scientific(massFromOrbit(421_800, 1.769_138))).toBe('1.90 × 10²⁷');
    expect(scientific(massFromOrbit(19_596, 6.387_2))).toBe('1.46 × 10²²');
    expect(scientific(9.996e5)).toBe('1.00 × 10⁶');
  });

  it('carries the measurement errors: 1% in distance is 3% in mass, 1% in period is 2%', () => {
    const m = massFromOrbit(384_400, 27.32);
    expectNear(massFromOrbit(384_400 * 1.01, 27.32) / m, 1.0303, 1e-4, 'distance');
    expectNear(massFromOrbit(384_400, 27.32 * 1.01) / m, 0.9803, 1e-4, 'period');
    expect(percentOff(1.03, 1)).toBe('+3.0%');
    expect(percentOff(0.5, 1)).toBe('−50%');
    expect(formatPeriodDays(92.8 / 1440)).toBe('92.8 minutes');
    expect(formatPeriodDays(0.318_91)).toBe('7.65 hours');
    expect(formatPeriodDays(27.3217)).toBe('27.32 days');
    // G itself, as Cavendish's experiment needs it.
    expectNear(G, 6.674e-11, 1e-14, 'G');
  });
});

describe('the barycentre (7.4, brief §8)', () => {
  it('puts Earth and the Moon’s inside Earth, Pluto and Charon’s outside Pluto, and the Sun and Jupiter’s just outside the Sun', () => {
    const em = pair('earth-moon');
    expectNear(balanceDistance(em.ratio, em.separation), 4_670, 10, 'Earth–Moon');
    expect(describeBalance(em, em.ratio)).toMatch(/inside Earth, 1,7\d\d km below the surface/);
    const pc = pair('pluto-charon');
    expectNear(balanceDistance(pc.ratio, pc.separation), 2_130, 10, 'Pluto–Charon');
    expect(describeBalance(pc, pc.ratio)).toMatch(/outside Pluto/);
    const sj = pair('sun-jupiter');
    expectNear(balanceDistance(sj.ratio, sj.separation) / 1000, 742, 1, 'Sun–Jupiter, thousand km');
    expect(describeBalance(sj, sj.ratio)).toMatch(/outside the Sun, 1\.07 times its radius/);
    expect(describeBalance(pair('twin-stars'), 1)).toMatch(/exactly halfway/);
  });

  it('gives the periods and the Sun’s wobble from Jupiter, 12.5 m/s', () => {
    expectNear(balancePeriod(pair('earth-moon'), 81.3), 27.3, 0.1, 'the month');
    expectNear(balancePeriod(pair('sun-jupiter'), 1047.6) / 365.25, 11.86, 0.02, 'Jupiter’s year');
    expectNear(wobbleSpeed(pair('sun-jupiter'), 1047.6), 12.5, 0.1, 'm/s');
  });
});

describe('tides (7.5, brief §8)', () => {
  it('makes the Sun’s tide 46% of the Moon’s, though it pulls about 178 times harder', () => {
    expectNear(SUN_TIDE_RATIO, 0.46, 0.005, 'tide ratio');
    expectNear(SUN_PULL_RATIO, 178, 1, 'pull ratio');
    expectNear(MOON_TIDE, 0.357, 0.002, 'm');
    expectNear(SUN_TIDE / MOON_TIDE, SUN_TIDE_RATIO, 1e-12, 'consistent');
  });

  it('gives two high tides a lunar day, and spring tides about 2.7 times the neap', () => {
    let highs = 0;
    const h = (t: number) => tideHeight(harbourAngle(t), 0, false);
    for (let i = 1; i < 1000; i++) {
      const t = (LUNAR_DAY_HOURS * i) / 1000;
      const dt = LUNAR_DAY_HOURS / 1000;
      if (h(t) > h(t - dt) && h(t) > h(t + dt)) highs++;
    }
    expect(highs).toBe(1); // the one at 12 h 25 min; the other is at 0 and 24 h 50 min
    expectNear(h(LUNAR_DAY_HOURS / 2), MOON_TIDE, 1e-9, 'second high tide');
    const spring = tideRange(0, true);
    const neap = tideRange(Math.PI / 2, true);
    expectNear(spring, 0.78, 0.01, 'spring range, m');
    expectNear(neap, 0.29, 0.01, 'neap range, m');
    expectNear(tideRange(Math.PI, true), spring, 1e-9, 'full Moon too');
    expectNear(tideRange(0, false), 0.535, 0.005, 'the Moon alone');
  });

  it('stretches along the line to the Moon and squeezes across it', () => {
    expect(stretch(1, 0, 0).x).toBe(2);
    expect(stretch(-1, 0, 0).x).toBe(-2);
    expect(stretch(-1, 0, 0).y).toBeCloseTo(0);
    const side = stretch(0, 1, 0);
    expect(side.x).toBeCloseTo(0);
    expect(side.y).toBe(-1);
  });
});

describe('the Hohmann transfer (7.6, brief §8)', () => {
  it('takes about 259 days, with Mars 44° ahead at launch and windows every 26 months', () => {
    expectNear(TRANSFER.days, 259, 1, 'days');
    expectNear(LAUNCH_LEAD / DEG, 44.3, 0.3, 'lead');
    expectNear(SYNODIC, 780, 1, 'synodic period');
  });

  it('finds launch windows that meet Mars, and late launches that miss it', () => {
    const start = jdFromCalendar({ year: 2026, month: 10, day: 24 });
    const w = nextWindow(start);
    expect(w).toBeGreaterThan(start);
    expect(w - start).toBeLessThan(SYNODIC);
    expectNear(marsLead(w), LAUNCH_LEAD, 1e-5, 'lead at the window');
    expect(Math.abs(arrivalMiss(w)) / DEG).toBeLessThan(0.1);
    expect(Math.abs(arrivalMiss(w + 60)) / DEG).toBeGreaterThan(20);
    expectNear(nextWindow(w + 1) - w, SYNODIC, 1, 'the next one');
  });
});

describe('steps on a spring (T4.1)', () => {
  it('Euler’s swings grow, leapfrog’s hold, RK4’s barely shrink', () => {
    const e = springEnergies(64);
    expect(e.euler).toBeGreaterThan(5);
    expectNear(e.leapfrog, 1, 0.01, 'leapfrog');
    expect(e.rk4).toBeLessThan(1);
    expect(e.rk4).toBeGreaterThan(0.999);
    expect(stepSpring('leapfrog', 8).points).toHaveLength(25);
  });
});

describe('Chapter 7’s interactive question', () => {
  it('accepts speeds that orbit and explains the rest', () => {
    expect(checkOrbitSpeed(7_900).correct).toBe(true);
    expect(checkOrbitSpeed(11_000).correct).toBe(true);
    expect(checkOrbitSpeed(7_800).correct).toBe(false);
    expect(checkOrbitSpeed(11_200).correct).toBe(false);
    expect(fire(Math.ceil(CIRCULAR_SPEED)).outcome).toBe('orbits');
  });
});
