import { C, G, L_SUN, M_SUN, R_SUN, SIGMA } from '../constants';
import { cnoRate, ppRate } from './burning';
import { A_RAD, densityFor, type Mix } from './eos';
import { partialPressure, stellarGas } from './ionisation';
import { hermite, solveAdaptive, type AdaptiveResult } from './ode';
import { opacity } from './opacity';

/**
 * A star built from scratch (Figure 21.4): the four equations of stellar
 * structure solved for a star of given mass and make-up, on the zero-age main
 * sequence (freshly mixed, burning hydrogen, unchanged by age), by
 * Schwarzschild's fitting method, as in Hansen, Kawaler & Trimble's textbook
 * ZAMS code. SI units at the boundary; inside, radius in R☉, mass as a fraction
 * of the star's and luminosity in L☉.
 *
 *   dm/dr = 4πr²ρ                     (mass)
 *   dP/dr = −Gmρ/r²                   (balance)
 *   dL/dr = 4πr²ρε                    (energy)
 *   dT/dr = ∇ (T/P) dP/dr             (transport)
 *
 * with ∇ = ∇_rad = 3κLP/(16πacGmT⁴) where radiation can carry the energy, and
 * ∇ = ∇_ad wherever ∇_rad would be steeper (Schwarzschild's criterion): there
 * the gas convects, so efficiently that its temperature falls along the
 * adiabat. The gas is fully ionised ideal gas with partly degenerate electrons
 * and light (eos.ts), its opacity the textbook fits (opacity.ts), its burning
 * the pp and CNO fits (burning.ts).
 *
 * **The fitting method.** Guess the central pressure and temperature, and step
 * outward from the centre to a fitting point halfway out in mass. Guess the
 * radius and luminosity, start at the photosphere (where T = T_eff and P =
 * ⅔g/κ), and step inward to the same point. The two halves disagree there in
 * radius, pressure, luminosity and temperature; Newton's method turns the four
 * misses into better guesses, from how each miss changes when each guess is
 * nudged, until they meet. Each try is kept, for the figure.
 */

export interface StarInput {
  /** Mass, M☉. */
  mass: number;
  /** Mass fractions of hydrogen and of metals. */
  X: number;
  Z: number;
  /** Hydrogen against the mass fraction m/M, rising in m/M, for a star whose core has burnt some already (today's Sun); X is then ignored. */
  hydrogen?: readonly (readonly [number, number])[];
  /** Multiplies the burning rate (default 1): the thermostat experiment. */
  burning?: number;
}

/** The four guesses: ln of the central pressure (Pa) and temperature (K), and of the radius (R☉) and luminosity (L☉). */
export type Guess = readonly [number, number, number, number];

export interface ProfilePart {
  /** r (R☉), m/M, ln P (Pa), ln T (K), L (L☉): thinned to a few dozen points. */
  r: number[];
  q: number[];
  lnP: number[];
  lnT: number[];
  L: number[];
}

/** One try: its guesses, what each half gave at the fitting point, and the halves themselves. */
export interface StarTry {
  guess: Guess;
  /** The misses at the fitting point: ln r, ln P, L (as a share of the surface L) and ln T, centre's minus surface's. */
  miss: [number, number, number, number];
  out: ProfilePart;
  in: ProfilePart;
}

export interface StarShell {
  /** r/R, m/M, P (Pa), T (K), ρ (kg/m³), L (L☉), κ (m²/kg), ε (W/kg), hydrogen's mass fraction, and the radiative and adiabatic gradients. */
  r: number;
  q: number;
  P: number;
  T: number;
  rho: number;
  L: number;
  kappa: number;
  eps: number;
  X: number;
  nablaRad: number;
  nablaAd: number;
}

export interface Zone {
  /** From and to, in r/R and in m/M. */
  r: [number, number];
  q: [number, number];
}

export interface StarModel {
  input: StarInput;
  converged: boolean;
  /** Why it stopped, if it didn't converge. */
  failure?: string;
  /** R☉, L☉, K. */
  radius: number;
  luminosity: number;
  teff: number;
  centre: { P: number; T: number; rho: number };
  /** Centre to surface. */
  shells: StarShell[];
  /** Where the gas convects. */
  zones: Zone[];
  /** The CNO cycle's share of the luminosity. */
  cnoShare: number;
  tries: StarTry[];
  /** The fitting point, m/M. */
  fit: number;
}

/** The fitting point, as a fraction of the mass. */
export const FIT_POINT = 0.5;
const TOL = 1e-7;
/** A miss small enough to accept once Newton's steps have stalled. */
const STALL = 1e-5;
const R_START = 1e-6; // R☉: the first step out from the centre, where the series start is exact to 10⁻¹².

interface Physics {
  massKg: number;
  mixAt: (q: number) => Mix;
  burning: number;
}

/** The local state: density, opacity, burning, gradients. */
function local(q: number, P: number, T: number, L: number, phys: Physics) {
  const mix = phys.mixAt(q);
  const gas = stellarGas(P, T, mix);
  const rho = gas.rho;
  const kappa = opacity(rho, T, mix);
  const pp = ppRate(rho, T, mix) * phys.burning;
  const cno = cnoRate(rho, T, mix) * phys.burning;
  const m = q * phys.massKg;
  const nablaRad = (3 * kappa * L * L_SUN * P) / (16 * Math.PI * A_RAD * C * G * m * T ** 4);
  const nablaAd = gas.nablaAd;
  return { mix, rho, kappa, pp, cno, eps: pp + cno, nablaRad, nablaAd };
}

/** The four equations in the solver's units: y = [m/M, ln P, L/L☉, ln T] against r/R☉. Flags gas that light alone would outpush. */
function equations(phys: Physics, flag: { bad: boolean }) {
  return (x: number, y: Float64Array, out: Float64Array) => {
    const [q, lnP, l, lnT] = y;
    const P = Math.exp(lnP);
    const T = Math.exp(lnT);
    const s = local(q, P, T, l, phys);
    const r = x * R_SUN;
    if (!(s.rho > 0) || !(q > 0) || !(x > 0)) {
      flag.bad = true;
      out.fill(0);
      return;
    }
    const dlnP = (-G * q * phys.massKg * s.rho * R_SUN) / (r * r * P);
    out[0] = (4 * Math.PI * r * r * s.rho * R_SUN) / phys.massKg;
    out[1] = dlnP;
    out[2] = (4 * Math.PI * r * r * s.rho * s.eps * R_SUN) / L_SUN;
    out[3] = Math.min(s.nablaRad, s.nablaAd) * dlnP;
  };
}

/** The photosphere's pressure (Pa) for a star of mass M (kg), radius R (m) and surface temperature T: ⅔g/κ, solved for the density. NaN if light alone would outpush it. */
export function photospherePressure(massKg: number, radius: number, T: number, mix: Mix): number {
  const g = (G * massKg) / (radius * radius);
  const f = (lnRho: number) => {
    const rho = Math.exp(lnRho);
    return partialPressure(rho, T, mix) - (2 / 3) * (g / opacity(rho, T, mix));
  };
  let lo = Math.log(1e-12);
  let hi = Math.log(1e3);
  if (f(lo) > 0 || f(hi) < 0) return NaN;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (2 / 3) * (g / opacity(Math.exp(lo), T, mix));
}

interface Half {
  ok: boolean;
  why?: string;
  /** The state at the fitting point: r (R☉), then y. */
  at: { r: number; y: Float64Array };
  run: AdaptiveResult;
}

/** Where a run crossed q = fit, by bisection on its last step's Hermite interpolant. */
function crossing(run: AdaptiveResult, fit: number): { r: number; y: Float64Array } {
  const n = run.steps.length;
  const a = run.steps[n - 2];
  const b = run.steps[n - 1];
  const fa = run.slopes[n - 2];
  const fb = run.slopes[n - 1];
  let lo = a.x;
  let hi = b.x;
  const rising = b.y[0] > a.y[0];
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const q = hermite(a.x, a.y, fa, b.x, b.y, fb, mid).y[0];
    if (q > fit === rising) hi = mid;
    else lo = mid;
  }
  const r = (lo + hi) / 2;
  return { r, y: hermite(a.x, a.y, fa, b.x, b.y, fb, r).y };
}

/** Outward from the centre to the fitting point, from guesses of ln P_c and ln T_c. */
function outward(lnPc: number, lnTc: number, phys: Physics, fit: number): Half {
  const flag = { bad: false };
  const s = local(0, Math.exp(lnPc), Math.exp(lnTc), 0, phys);
  if (!(s.rho > 0))
    return {
      ok: false,
      why: 'light outpushes the gas at the centre',
      at: { r: 0, y: new Float64Array(4) },
      run: emptyRun(),
    };
  const r0 = R_START * R_SUN;
  const m0 = (4 / 3) * Math.PI * r0 ** 3 * s.rho;
  const y0 = [m0 / phys.massKg, lnPc, (m0 * s.eps) / L_SUN, lnTc];
  const run = solveAdaptive(equations(phys, flag), R_START, y0, 1e4, {
    rtol: 1e-9,
    atol: 1e-14,
    h0: R_START,
    stop: (_, y) => flag.bad || y[0] >= fit || y[1] < Math.log(10),
  });
  const last = run.steps[run.steps.length - 1].y;
  if (flag.bad || run.reason !== 'stop' || last[0] < fit)
    return {
      ok: false,
      why: 'the centre’s half ran out of pressure before the fitting point',
      at: { r: 0, y: last },
      run,
    };
  return { ok: true, at: crossing(run, fit), run };
}

/** Inward from the photosphere to the fitting point, from guesses of ln R and ln L. */
function inward(lnR: number, lnL: number, phys: Physics, fit: number): Half {
  const flag = { bad: false };
  const R = Math.exp(lnR);
  const L = Math.exp(lnL);
  const teff = ((L * L_SUN) / (4 * Math.PI * (R * R_SUN) ** 2 * SIGMA)) ** 0.25;
  const P = photospherePressure(phys.massKg, R * R_SUN, teff, phys.mixAt(1));
  if (!(P > 0))
    return {
      ok: false,
      why: 'light outpushes the gas at the surface',
      at: { r: R, y: new Float64Array(4) },
      run: emptyRun(),
    };
  const run = solveAdaptive(equations(phys, flag), R, [1, Math.log(P), L, Math.log(teff)], 0, {
    rtol: 1e-9,
    atol: 1e-14,
    h0: -R * 1e-6,
    stop: (x, y) => flag.bad || y[0] <= fit || x < R * 1e-3,
  });
  const last = run.steps[run.steps.length - 1].y;
  if (flag.bad || run.reason !== 'stop' || last[0] > fit)
    return {
      ok: false,
      why: 'the surface’s half reached the centre with mass to spare',
      at: { r: 0, y: last },
      run,
    };
  return { ok: true, at: crossing(run, fit), run };
}

function emptyRun(): AdaptiveResult {
  return { steps: [], slopes: [], reason: 'stop', rejected: 0, evaluations: 0 };
}

function misses(o: Half, i: Half, lnL: number): [number, number, number, number] {
  return [Math.log(o.at.r) - Math.log(i.at.r), o.at.y[1] - i.at.y[1], (o.at.y[2] - i.at.y[2]) / Math.exp(lnL), o.at.y[3] - i.at.y[3]];
}

/** A run thinned to about `n` points, for drawing. */
function thin(run: AdaptiveResult, end: { r: number; y: Float64Array } | null, n = 40): ProfilePart {
  const part: ProfilePart = { r: [], q: [], lnP: [], lnT: [], L: [] };
  const steps = run.steps;
  const every = Math.max(1, Math.floor(steps.length / n));
  const push = (r: number, y: Float64Array) => {
    part.r.push(r);
    part.q.push(y[0]);
    part.lnP.push(y[1]);
    part.lnT.push(y[3]);
    part.L.push(y[2]);
  };
  for (let k = 0; k < steps.length - 1; k += every) push(steps[k].x, steps[k].y);
  if (end) push(end.r, end.y);
  else if (steps.length) push(steps[steps.length - 1].x, steps[steps.length - 1].y);
  return part;
}

/** Solves A x = b for a 4 × 4 system by Gaussian elimination with partial pivoting. */
function solve4(A: number[][], b: number[]): number[] | null {
  const n = 4;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x.every(Number.isFinite) ? x : null;
}

const norm = (v: readonly number[]) => Math.max(...v.map(Math.abs));

/** The hydrogen fraction at m/M from a table of [q, X]. */
function tableLookup(table: readonly (readonly [number, number])[], q: number): number {
  if (q <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (q <= table[i][0]) {
      const [q0, x0] = table[i - 1];
      const [q1, x1] = table[i];
      return x0 + ((q - q0) / (q1 - q0)) * (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

function physicsFor(input: StarInput): Physics {
  const fixed: Mix = { X: input.X, Z: input.Z };
  const table = input.hydrogen;
  return {
    massKg: input.mass * M_SUN,
    mixAt: table ? (q) => ({ X: tableLookup(table, q), Z: input.Z }) : () => fixed,
    burning: input.burning ?? 1,
  };
}

/**
 * Starting guesses: cubics in log mass fitted to this solver's own answers for
 * X = 0.7, Z = 0.02 from 0.2 to 20 M☉ (within 0.25 dex), shifted for the
 * make-up by homology (L ∝ μ⁴, T_c ∝ μ): close enough for Newton's method to
 * take it from there.
 */
export function startingGuess(input: StarInput): Guess {
  const x = Math.log10(input.mass);
  const cubic = (c: readonly number[]) => c[0] + x * (c[1] + x * (c[2] + x * c[3]));
  const mu = (X: number, Z: number) => 1 / (2 * X + 0.75 * (1 - X - Z) + 0.5 * Z);
  const dmu = Math.log10(mu(input.X, input.Z) / mu(0.7, 0.02));
  const logPc = cubic([16.079, 0.4036, -0.5697, -0.1405]);
  const logTc = cubic([7.1135, 0.6122, -0.0663, -0.1212]) + dmu;
  const logR = cubic([-0.0837, 0.7655, 0.0372, -0.1033]);
  const logL = cubic([-0.2446, 4.6765, 0.4312, -0.9121]) + 4 * dmu;
  return [logPc * Math.LN10, logTc * Math.LN10, logR * Math.LN10, logL * Math.LN10];
}

export interface BuildOptions {
  /** Where to start (default `startingGuess`). */
  guess?: Guess;
  /** Most Newton steps (default 40). */
  maxTries?: number;
  fit?: number;
}

/** Builds a star: Newton's method on the four guesses until the two halves meet. */
export function buildStar(input: StarInput, options: BuildOptions = {}): StarModel {
  const phys = physicsFor(input);
  const fit = options.fit ?? FIT_POINT;
  let u = [...(options.guess ?? startingGuess(input))];
  const tries: StarTry[] = [];
  const maxTries = options.maxTries ?? 40;
  const d = 1e-5;

  let o = outward(u[0], u[1], phys, fit);
  let i = inward(u[2], u[3], phys, fit);
  // A first guess that fails outright: nudge the centre's pressure until the centre's half reaches the fitting point.
  for (let k = 0; k < 20 && !o.ok; k++) {
    u[0] += 0.3;
    o = outward(u[0], u[1], phys, fit);
  }
  for (let k = 0; k < 20 && !i.ok; k++) {
    u[2] += i.why?.startsWith('the surface') ? 0.1 : -0.1;
    i = inward(u[2], u[3], phys, fit);
  }
  if (!o.ok || !i.ok) return failed(input, u, tries, fit, (o.ok ? i.why : o.why) ?? 'no start');

  let F = misses(o, i, u[3]);
  for (let iter = 0; iter < maxTries; iter++) {
    tries.push({
      guess: [u[0], u[1], u[2], u[3]],
      miss: F,
      out: thin(o.run, o.at),
      in: thin(i.run, i.at),
    });
    if (norm(F) < TOL) return finish(input, phys, u, o, i, tries, fit);
    // How each miss changes with each guess: the centre's guesses move only the centre's half, and the surface's only the surface's.
    const J: number[][] = [[], [], [], []];
    const columns: [number, Half, Half][] = [];
    for (const k of [0, 1]) {
      const v = [...u];
      v[k] += d;
      const o2 = outward(v[0], v[1], phys, fit);
      columns.push([k, o2, i]);
    }
    for (const k of [2, 3]) {
      const v = [...u];
      v[k] += d;
      const i2 = inward(v[2], v[3], phys, fit);
      columns.push([k, o, i2]);
    }
    if (columns.some(([, a, b]) => !a.ok || !b.ok)) return failed(input, u, tries, fit, 'a nudged guess fell off the edge');
    for (const [k, a, b] of columns) {
      const F2 = misses(a, b, k === 3 ? u[3] + d : u[3]);
      for (let r = 0; r < 4; r++) J[r][k] = (F2[r] - F[r]) / d;
    }
    const step = solve4(
      J,
      F.map((f) => -f),
    );
    if (!step) return failed(input, u, tries, fit, 'the misses stopped depending on the guesses');
    // Stalled at the integrations' own noise (a kinked make-up, as in today's Sun, leaves some): close enough.
    if (norm(step) < 1e-6 && norm(F) < STALL) return finish(input, phys, u, o, i, tries, fit);
    // Damped: no guess moves by more than a factor of e^0.5 at once; halve the step until both halves still reach the fitting point and the misses shrink.
    const big = norm(step);
    let lambda = big > 0.5 ? 0.5 / big : 1;
    let accepted = false;
    for (let h = 0; h < 12; h++) {
      const v = u.map((x, k) => x + lambda * step[k]);
      const o2 = outward(v[0], v[1], phys, fit);
      const i2 = inward(v[2], v[3], phys, fit);
      if (o2.ok && i2.ok) {
        const F2 = misses(o2, i2, v[3]);
        if (norm(F2) < norm(F) * (1 - 1e-4 * lambda) || h >= 8) {
          u = v;
          o = o2;
          i = i2;
          F = F2;
          accepted = true;
          break;
        }
      }
      lambda /= 2;
    }
    if (!accepted) return failed(input, u, tries, fit, 'no step towards a better fit could be found');
  }
  return failed(input, u, tries, fit, 'too many tries');
}

function failed(input: StarInput, u: number[], tries: StarTry[], fit: number, why: string): StarModel {
  return {
    input,
    converged: false,
    failure: why,
    radius: Math.exp(u[2]),
    luminosity: Math.exp(u[3]),
    teff: NaN,
    centre: { P: Math.exp(u[0]), T: Math.exp(u[1]), rho: NaN },
    shells: [],
    zones: [],
    cnoShare: NaN,
    tries,
    fit,
  };
}

function finish(input: StarInput, phys: Physics, u: number[], o: Half, i: Half, tries: StarTry[], fit: number): StarModel {
  const points: { r: number; y: Float64Array }[] = [];
  for (const s of o.run.steps.slice(0, -1)) points.push({ r: s.x, y: s.y });
  points.push(o.at);
  // The surface's half, from the fitting point out.
  const inner = i.run.steps.slice(0, -1).reverse();
  for (const s of inner) points.push({ r: s.x, y: s.y });
  const shells: StarShell[] = points.map(({ r, y }) => {
    const P = Math.exp(y[1]);
    const T = Math.exp(y[3]);
    const s = local(y[0], P, T, y[2], phys);
    return {
      r,
      q: y[0],
      P,
      T,
      rho: s.rho,
      L: y[2],
      kappa: s.kappa,
      eps: s.eps,
      X: s.mix.X,
      nablaRad: s.nablaRad,
      nablaAd: s.nablaAd,
    };
  });
  const R = Math.exp(u[2]);
  const L = Math.exp(u[3]);
  // The centre: the series start, exact to 10⁻¹².
  const Pc = Math.exp(u[0]);
  const Tc = Math.exp(u[1]);
  const centre = { P: Pc, T: Tc, rho: densityFor(Pc, Tc, phys.mixAt(0)) };
  shells.unshift({
    ...shells[0],
    r: 0,
    q: 0,
    L: 0,
    P: Pc,
    T: Tc,
    rho: centre.rho,
  });
  // The CNO share: ∫ ε_CNO dm / L over the profile.
  let cno = 0;
  for (let k = 1; k < shells.length; k++) {
    const a = shells[k - 1];
    const b = shells[k];
    const ca = cnoRate(a.rho, a.T, phys.mixAt(a.q)) * phys.burning;
    const cb = cnoRate(b.rho, b.T, phys.mixAt(b.q)) * phys.burning;
    cno += 0.5 * (ca + cb) * (b.q - a.q) * phys.massKg;
  }
  return {
    input,
    converged: true,
    radius: R,
    luminosity: L,
    teff: ((L * L_SUN) / (4 * Math.PI * (R * R_SUN) ** 2 * SIGMA)) ** 0.25,
    centre,
    shells: shells.map((s) => ({ ...s, r: s.r / R })),
    zones: convectiveZones(shells.map((s) => ({ ...s, r: s.r / R }))),
    cnoShare: cno / (L * L_SUN),
    tries,
    fit,
  };
}

/** The stretches where ∇_rad exceeds ∇_ad, in r/R and m/M, with their edges found by interpolation. */
export function convectiveZones(shells: readonly StarShell[]): Zone[] {
  const zones: Zone[] = [];
  const excess = (s: StarShell) => s.nablaRad - s.nablaAd;
  let start: { r: number; q: number } | null = excess(shells[0]) > 0 ? { r: 0, q: 0 } : null;
  for (let k = 1; k < shells.length; k++) {
    const a = shells[k - 1];
    const b = shells[k];
    const ea = excess(a);
    const eb = excess(b);
    if (ea > 0 === eb > 0) continue;
    const f = ea / (ea - eb);
    const edge = { r: a.r + f * (b.r - a.r), q: a.q + f * (b.q - a.q) };
    if (eb > 0) start = edge;
    else if (start) {
      zones.push({ r: [start.r, edge.r], q: [start.q, edge.q] });
      start = null;
    }
  }
  if (start) zones.push({ r: [start.r, 1], q: [start.q, 1] });
  // Drop slivers thinner than half a per cent of the radius (a thin skin under the photosphere).
  return zones.filter((z) => z.r[1] - z.r[0] > 0.005);
}

/** A summary of a model, for a main sequence. */
export interface StarSummary {
  mass: number;
  radius: number;
  luminosity: number;
  teff: number;
  tc: number;
  rhoc: number;
  /** The convective core's mass fraction (0 if none) and the convective envelope's base, in m/M (1 if none). */
  coreMass: number;
  envelopeBase: number;
  cnoShare: number;
  converged: boolean;
}

export function summarise(model: StarModel): StarSummary {
  const core = model.zones.find((z) => z.q[0] === 0);
  const env = model.zones.find((z) => z.r[1] > 0.99 && z.q[0] > 0);
  return {
    mass: model.input.mass,
    radius: model.radius,
    luminosity: model.luminosity,
    teff: model.teff,
    tc: model.centre.T,
    rhoc: model.centre.rho,
    coreMass: core ? core.q[1] : 0,
    envelopeBase: core && core.r[1] > 0.99 ? 0 : env ? env.q[0] : 1,
    cnoShare: model.cnoShare,
    converged: model.converged,
  };
}

/**
 * A main sequence: a star of each mass, each one started from the last one's
 * answer scaled by homology, outward from the Sun's mass in both directions.
 */
export function mainSequence(masses: readonly number[], X: number, Z: number): StarSummary[] {
  const sorted = [...masses].sort((a, b) => a - b);
  const results = new Map<number, StarSummary>();
  const start = sorted.reduce((best, m) => (Math.abs(Math.log(m)) < Math.abs(Math.log(best)) ? m : best), sorted[0]);
  const from = sorted.indexOf(start);
  const walk = (order: number[]) => {
    let prev: StarModel | null = null;
    for (const k of order) {
      const mass = sorted[k];
      const input = { mass, X, Z };
      let model: StarModel | null = null;
      if (prev?.converged) {
        const s = Math.log(mass / prev.input.mass);
        const g = prev.tries[prev.tries.length - 1].guess;
        // Homology for a main-sequence star: P_c ∝ M^−2/3·…, T_c ∝ M^0.3, R ∝ M^0.8, L ∝ M^3.5, near enough.
        model = buildStar(input, {
          guess: [g[0] - 0.7 * s, g[1] + 0.3 * s, g[2] + 0.8 * s, g[3] + 3.5 * s],
        });
      }
      if (!model?.converged) model = buildStar(input);
      results.set(mass, summarise(model));
      if (model.converged) prev = model;
    }
  };
  walk(Array.from({ length: sorted.length - from }, (_, k) => from + k));
  walk(Array.from({ length: from + 1 }, (_, k) => from - k));
  return sorted.map((m) => results.get(m)!);
}
