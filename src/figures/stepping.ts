import { GM_EARTH } from '../core/constants';
import type { Method, StepStage } from '../core/integrate/steppers';
import { Simulation } from '../core/nbody/simulation';
import { createSystem, gmToAuDay, GM_SUN_AU_DAY, toCentreOfMassFrame, type BodySpec } from '../core/nbody/system';
import { orbitPeriod, perihelionState } from '../core/nbody/twoBody';

/**
 * One planet round the Sun, stepped by Euler, leapfrog or RK4 (Figure 7.2).
 * An orbit of 1 AU, in the engine's units: AU and days, G·m in AU³/day².
 */

/** How many steps an orbit is cut into: the choices on the slider. */
export const STEP_CHOICES = [8, 12, 20, 36, 60, 100, 200, 365, 1000] as const;

export const METHOD_NAMES: Record<Method, string> = { euler: 'Euler', leapfrog: 'Leapfrog', rk4: 'RK4' };

const GM_PLANET = gmToAuDay(GM_EARTH);

/** The orbit's period, days: a year. */
export const PERIOD = orbitPeriod(GM_SUN_AU_DAY + GM_PLANET, 1);

/** The Sun and an Earth-mass planet on an orbit of 1 AU and eccentricity e, starting at perihelion, in the frame of their centre of mass. */
export function orbitBodies(e: number): BodySpec[] {
  const { x, v } = perihelionState(GM_SUN_AU_DAY + GM_PLANET, 1, e);
  const s = toCentreOfMassFrame(
    createSystem([
      { gm: GM_SUN_AU_DAY, x: [0, 0, 0], v: [0, 0, 0] },
      { gm: GM_PLANET, x, v },
    ]),
  );
  return [0, 1].map((i) => ({ gm: s.gm[i], x: [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]], v: [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]] }));
}

/** The smallest energy error the chart shows: below this, the error is lost in the computer's rounding. */
export const ERROR_FLOOR = 1e-12;

/**
 * How the energy error grows over `orbits` orbits for a method and step:
 * points of (orbits so far, log₁₀ of the largest |error| in each stretch),
 * `buckets` of them.
 */
export function energyHistory(method: Method, stepsPerOrbit: number, e: number, orbits = 20, buckets = 160): { x: number; y: number }[] {
  const sim = new Simulation(orbitBodies(e), method, PERIOD / stepsPerOrbit);
  const total = stepsPerOrbit * orbits;
  const out: { x: number; y: number }[] = [{ x: 0, y: Math.log10(ERROR_FLOOR) }];
  let worst = 0;
  let done = 0;
  for (let b = 1; b <= buckets; b++) {
    const until = Math.round((b * total) / buckets);
    for (; done < until; done++) {
      sim.advance(1);
      worst = Math.max(worst, Math.abs(sim.energyError()));
    }
    if (!sim.finite()) break;
    out.push({ x: (done / total) * orbits, y: Math.log10(Math.min(10, Math.max(ERROR_FLOOR, worst))) });
    worst = 0;
  }
  return out;
}

/** The stages inside one step from a state (AU, AU/day), for drawing what a single tick does. */
export function stagesOfStep(method: Method, x: Float64Array, v: Float64Array, stepsPerOrbit: number): StepStage[] {
  const bodies = orbitBodies(0).map((b, i) => ({ gm: b.gm, x: [x[3 * i], x[3 * i + 1], x[3 * i + 2]] as const, v: [v[3 * i], v[3 * i + 1], v[3 * i + 2]] as const }));
  const stages: StepStage[] = [];
  new Simulation(bodies, method, PERIOD / stepsPerOrbit).advance(1, (s) => stages.push(s));
  return stages;
}

/** "+3.1%", "−0.0042%", "under one part in a trillion". */
export function formatEnergyError(error: number): string {
  const a = Math.abs(error);
  if (a < ERROR_FLOOR) return 'under one part in a trillion';
  const sign = error > 0 ? '+' : '−';
  const percent = a * 100;
  if (percent >= 10) return `${sign}${Math.round(percent).toLocaleString('en-GB')}%`;
  if (percent >= 0.01) return `${sign}${percent.toPrecision(2)}%`;
  const exponent = Math.floor(Math.log10(a));
  return `${sign}${(a / 10 ** exponent).toFixed(1)} × 10${superscript(exponent)}`;
}

/** "10⁻⁶": a power of ten for an axis. */
export function powerOfTen(exponent: number): string {
  return `10${superscript(exponent)}`;
}

function superscript(n: number): string {
  return String(n)
    .replace('-', '⁻')
    .replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
}
