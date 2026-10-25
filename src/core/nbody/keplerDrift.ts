/**
 * The exact two-body motion over a time step, for any orbit: circle, ellipse,
 * parabola or hyperbola. This is the "drift" of the Wisdom–Holman integrator,
 * where each planet coasts along its own Kepler orbit between kicks.
 *
 * It works in universal variables (Danby 1988, §6.9; Wisdom & Hernandez
 * 2015): one anomaly s for every kind of orbit, Stumpff's functions in place
 * of sines and cosines, and the f and g functions that carry the starting
 * position and velocity along the orbit. Units are the caller's: μ = G·M in
 * L³/T², positions in L, velocities in L/T, the step in T.
 */

/**
 * Stumpff's functions c₀ … c₃ of z: c₀ = cos √z, c₁ = sin √z / √z,
 * c₂ = (1 − cos √z)/z, c₃ = (√z − sin √z)/z^(3/2), continued smoothly through
 * z = 0 and to negative z (with cosh and sinh). Writes them into `out`.
 */
export function stumpff(z: number, out: Float64Array | number[]): void {
  if (Math.abs(z) < 1) {
    // cₖ(z) = Σ (−z)ⁿ / (2n + k)!, which converges fast for |z| < 1.
    for (let k = 0; k < 4; k++) {
      let term = 1;
      for (let f = 2; f <= k; f++) term /= f;
      let sum = term;
      for (let n = 1; n < 16; n++) {
        term *= -z / ((2 * n + k - 1) * (2 * n + k));
        sum += term;
      }
      out[k] = sum;
    }
    return;
  }
  if (z > 0) {
    const q = Math.sqrt(z);
    out[0] = Math.cos(q);
    out[1] = Math.sin(q) / q;
    out[2] = (1 - out[0]) / z;
    out[3] = (q - Math.sin(q)) / (z * q);
  } else {
    const q = Math.sqrt(-z);
    out[0] = Math.cosh(q);
    out[1] = Math.sinh(q) / q;
    out[2] = (out[0] - 1) / -z;
    out[3] = (Math.sinh(q) - q) / (-z * q);
  }
}

const c = new Float64Array(4);

/**
 * Moves one body along its Kepler orbit about a fixed centre of attraction μ
 * (L³/T²) for a time dt (T, either sign): the position and velocity relative
 * to the centre at `x[o..o+2]` and `v[o..o+2]` are replaced in place.
 *
 * Solves the universal form of Kepler's equation, dt = r₀ G₁ + η₀ G₂ + μ G₃,
 * for s by Newton's method kept inside a bracket (the left side grows with s
 * at the rate r > 0, so the bracket always holds the answer).
 */
export function keplerDrift(mu: number, x: Float64Array, v: Float64Array, o: number, dt: number): void {
  const x0 = x[o];
  const y0 = x[o + 1];
  const z0 = x[o + 2];
  const vx0 = v[o];
  const vy0 = v[o + 1];
  const vz0 = v[o + 2];
  const r0 = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
  if (mu <= 0 || r0 === 0) {
    // Nothing pulls (or the body sits on the centre): straight-line motion.
    x[o] = x0 + vx0 * dt;
    x[o + 1] = y0 + vy0 * dt;
    x[o + 2] = z0 + vz0 * dt;
    return;
  }
  const v2 = vx0 * vx0 + vy0 * vy0 + vz0 * vz0;
  const eta0 = x0 * vx0 + y0 * vy0 + z0 * vz0;
  // β = 2μ/r − v²: positive for a bound orbit, where it is μ/a.
  const beta = (2 * mu) / r0 - v2;

  let t = dt;
  let sMax = Infinity;
  if (beta > 0) {
    // Whole laps change nothing, so drop them; a lap is s = 2π/√β.
    const period = (2 * Math.PI * mu) / (beta * Math.sqrt(beta));
    if (Math.abs(t) > period) t -= period * Math.trunc(t / period);
    sMax = (2 * Math.PI) / Math.sqrt(beta);
  }

  const kepler = (s: number) => {
    stumpff(beta * s * s, c);
    const g1 = s * c[1];
    const g2 = s * s * c[2];
    const g3 = s * s * s * c[3];
    return { f: r0 * g1 + eta0 * g2 + mu * g3 - t, r: r0 * c[0] + eta0 * g1 + mu * g2 };
  };

  // The bracket [lo, hi] on s, with F(lo) ≤ 0 ≤ F(hi).
  const sign = t >= 0 ? 1 : -1;
  let lo = 0;
  let hi = sign * Math.min(sMax, Math.abs(t) / Math.max(r0, 1e-300) + 1);
  if (!Number.isFinite(sMax) || Math.abs(hi) < sMax) {
    // Widen until the bracket holds the answer (unbound orbits, or a long step).
    for (let k = 0; k < 200 && sign * kepler(hi).f < 0; k++) {
      lo = hi;
      hi *= 2;
      if (Number.isFinite(sMax) && Math.abs(hi) > sMax) {
        hi = sign * sMax;
        break;
      }
    }
  }
  if (sign < 0) [lo, hi] = [hi, lo];

  // Start from the expansion s ≈ t/r₀ − η₀t²/(2r₀³), clamped into the bracket.
  let s = t / r0 - (eta0 * t * t) / (2 * r0 * r0 * r0);
  if (!(s > lo && s < hi)) s = (lo + hi) / 2;
  for (let k = 0; k < 100; k++) {
    const { f, r } = kepler(s);
    if (f < 0) lo = s;
    else hi = s;
    let next = s - f / r;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    const done = Math.abs(next - s) <= 1e-15 * Math.max(Math.abs(next), 1e-300) || hi - lo <= 4e-16 * Math.abs(s);
    s = next;
    if (done) break;
  }

  stumpff(beta * s * s, c);
  const g1 = s * c[1];
  const g2 = s * s * c[2];
  const g3 = s * s * s * c[3];
  const r = r0 * c[0] + eta0 * g1 + mu * g2;
  const f = 1 - (mu * g2) / r0;
  const g = t - mu * g3;
  const fd = (-mu * g1) / (r0 * r);
  const gd = 1 - (mu * g2) / r;
  x[o] = f * x0 + g * vx0;
  x[o + 1] = f * y0 + g * vy0;
  x[o + 2] = f * z0 + g * vz0;
  v[o] = fd * x0 + gd * vx0;
  v[o + 1] = fd * y0 + gd * vy0;
  v[o + 2] = fd * z0 + gd * vz0;
}
