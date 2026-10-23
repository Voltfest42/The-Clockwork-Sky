import { wrapPi } from '../math/angles';

/**
 * Kepler's equation, which turns time into position on an orbit. All angles
 * are in radians.
 *
 * For an ellipse, M = E − e sin E links the mean anomaly M (which grows
 * steadily with time) to the eccentric anomaly E (which fixes where the body
 * is). For a hyperbola (an interstellar visitor), M = e sinh F − F. Neither can
 * be solved in closed form, so both are solved by refining a guess with
 * Newton's method, kept inside a bracket that always holds the answer.
 */

/** The solver stops when a step is smaller than this (radians). */
const TOLERANCE = 1e-15;

/**
 * The eccentric anomaly E for a mean anomaly M on an ellipse of eccentricity e
 * (0 ≤ e < 1): the solution of M = E − e sin E. Radians in, radians out, with E
 * on the same turn as M. Danby's starting guess (1988), then Newton's method;
 * a step that would leave the bracket [M − e, M + e] bisects it instead.
 */
export function eccentricAnomaly(M: number, e: number): number {
  if (!(e >= 0 && e < 1)) throw new RangeError(`eccentricAnomaly needs 0 ≤ e < 1, not ${e}`);
  const m = wrapPi(M);
  const turn = M - m; // whole turns, added back at the end
  // The answer lies within e of M, since E − M = e sin E.
  let lo = m - e;
  let hi = m + e;
  let E = m + 0.85 * e * Math.sign(Math.sin(m));
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - m;
    if (f > 0) hi = E;
    else lo = E;
    const step = f / (1 - e * Math.cos(E));
    let next = E - step;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - E) <= TOLERANCE * Math.max(1, Math.abs(E))) {
      E = next;
      break;
    }
    E = next;
  }
  return E + turn;
}

/** The true anomaly ν, the angle from perihelion as seen from the focus, for an eccentric anomaly E (radians). Radians. */
export function trueAnomalyFromEccentric(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

/**
 * The hyperbolic anomaly F for a mean anomaly M on a hyperbola of
 * eccentricity e > 1: the solution of M = e sinh F − F. Radians.
 */
export function hyperbolicAnomaly(M: number, e: number): number {
  if (!(e > 1)) throw new RangeError(`hyperbolicAnomaly needs e > 1, not ${e}`);
  if (M === 0) return 0;
  const sign = Math.sign(M);
  const m = Math.abs(M);
  // f(F) = e sinh F − F − m rises steadily for F ≥ 0, from −m at F = 0.
  let lo = 0;
  let hi = Math.asinh(m / (e - 1)) + 1; // sinh(F)(e − 1) ≥ m there, so f > 0
  let F = Math.log((2 * m) / e + 1.8); // Danby's starter
  if (!(F > lo && F < hi)) F = (lo + hi) / 2;
  for (let i = 0; i < 100; i++) {
    const f = e * Math.sinh(F) - F - m;
    if (f > 0) hi = F;
    else lo = F;
    let next = F - f / (e * Math.cosh(F) - 1);
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - F) <= TOLERANCE * Math.max(1, F)) {
      F = next;
      break;
    }
    F = next;
  }
  return sign * F;
}
