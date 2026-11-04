import { AMU, C, G, K_B, SIGMA } from '../constants';
import { hermite, solveAdaptive, type OdeStep } from './ode';

/**
 * Polytropes (Chapter 20): stars whose pressure follows a power of their
 * density, P = Kρ^(1+1/n). The structure equations then become one, the
 * Lane–Emden equation (Lane 1870, Emden 1907),
 *
 *   (1/ξ²) d/dξ (ξ² dθ/dξ) = −θⁿ,   θ(0) = 1, θ′(0) = 0,
 *
 * where ρ = ρ_c θⁿ and r = aξ. It is solved here by stepping out from the
 * centre with the Dormand–Prince solver, from a series start just off the
 * centre (where the equation's 2/ξ term can't be evaluated), to the surface
 * ξ₁ where θ first reaches zero. n = 0, 1 and 5 have exact solutions; n = 5
 * never reaches a surface.
 *
 * ξ and θ have no units. Masses (kg), radii (m), densities (kg/m³),
 * pressures (Pa), temperatures (K) and energies (J) are SI.
 */

export interface LaneEmdenStep {
  xi: number;
  theta: number;
  dtheta: number;
  /** The step just taken. */
  h: number;
}

export interface LaneEmden {
  n: number;
  /** Whether θ reaches zero (n < 5); if not, the profile stops at `xiMax`. */
  reachesSurface: boolean;
  /** The surface ξ₁, or Infinity when there is none. */
  xi1: number;
  /** θ′(ξ₁), or at the last point when there is no surface. */
  dthetaSurface: number;
  /** −ξ₁² θ′(ξ₁): the mass in units of 4πa³ρ_c. */
  massConstant: number;
  /** Central over mean density, ρ_c/ρ̄ = ξ₁ / (3 |θ′(ξ₁)|); Infinity when there is no surface. */
  densityContrast: number;
  /** The profile at evenly spaced ξ from the centre to the surface (or `xiMax`): an odd number of points, for Simpson's rule. */
  xi: Float64Array;
  theta: Float64Array;
  dtheta: Float64Array;
  /** The solver's accepted steps, the series start first. */
  steps: LaneEmdenStep[];
}

export interface LaneEmdenOptions {
  /** Evenly spaced profile points (made odd; default 401). */
  samples?: number;
  /** How far to go looking for a surface (default 50, or 2 × 10⁴ for n ≥ 4.5). */
  xiMax?: number;
  rtol?: number;
  /** Each accepted step, as the solver takes it. */
  emit?: (step: LaneEmdenStep) => void;
}

/** Where the series start begins: close enough to the centre that its ξ⁸ error is far below the solver's tolerance. */
const XI_START = 1e-3;

/** θ and θ′ near the centre from the series θ = 1 − ξ²/6 + nξ⁴/120 − n(8n − 5)ξ⁶/15120. */
export function seriesStart(n: number, xi: number): { theta: number; dtheta: number } {
  const c6 = (n * (8 * n - 5)) / 15120;
  return {
    theta: 1 - xi ** 2 / 6 + (n * xi ** 4) / 120 - c6 * xi ** 6,
    dtheta: -xi / 3 + (n * xi ** 3) / 30 - 6 * c6 * xi ** 5,
  };
}

/** The exact solutions: n = 0, θ = 1 − ξ²/6; n = 1, θ = sin ξ / ξ; n = 5, θ = (1 + ξ²/3)^−½. Undefined for other n. */
export function analyticTheta(n: number, xi: number): number | undefined {
  if (n === 0) return 1 - xi ** 2 / 6;
  if (n === 1) return xi === 0 ? 1 : Math.sin(xi) / xi;
  if (n === 5) return 1 / Math.sqrt(1 + xi ** 2 / 3);
  return undefined;
}

/** Solves the Lane–Emden equation of index n (0 ≤ n ≤ 5). */
export function solveLaneEmden(n: number, options: LaneEmdenOptions = {}): LaneEmden {
  if (!(n >= 0 && n <= 5)) throw new RangeError(`The index n must be between 0 and 5 (got ${n})`);
  const samples = (options.samples ?? 401) | 1;
  const xiMax = options.xiMax ?? (n >= 4.5 ? 2e4 : 50);
  const start = seriesStart(n, XI_START);
  const steps: LaneEmdenStep[] = [];
  const emit = (s: OdeStep) => {
    const step = { xi: s.x, theta: s.y[0], dtheta: s.y[1], h: s.h };
    steps.push(step);
    options.emit?.(step);
  };
  const result = solveAdaptive(
    (xi, y, out) => {
      out[0] = y[1];
      // Beyond the surface θ is negative and θⁿ undefined for fractional n: carry on with zero, only to find the crossing.
      out[1] = -(y[0] > 0 ? y[0] ** n : n === 0 ? 1 : 0) - (2 * y[1]) / xi;
    },
    XI_START,
    [start.theta, start.dtheta],
    xiMax,
    { rtol: options.rtol ?? 1e-10, atol: 1e-13, h0: 1e-3, hMax: Math.max(0.25, xiMax / 200), stop: (_, y) => y[0] <= 0, emit },
  );
  const { steps: raw, slopes } = result;
  const reachesSurface = result.reason === 'stop';
  let xi1 = Infinity;
  let dthetaSurface: number;
  const last = raw.length - 1;
  if (reachesSurface) {
    // θ = 0 between the last two steps: Newton's method on the Hermite interpolant.
    const a = raw[last - 1];
    const b = raw[last];
    let x = a.x + (b.x - a.x) * (a.y[0] / (a.y[0] - b.y[0]));
    for (let i = 0; i < 30; i++) {
      const { y, dy } = hermite(a.x, a.y, slopes[last - 1], b.x, b.y, slopes[last], x);
      const dx = y[0] / dy[0];
      x = Math.min(b.x, Math.max(a.x, x - dx));
      if (Math.abs(dx) < 1e-14) break;
    }
    xi1 = x;
    dthetaSurface = hermite(a.x, a.y, slopes[last - 1], b.x, b.y, slopes[last], x).y[1];
  } else {
    dthetaSurface = raw[last].y[1];
  }
  const end = reachesSurface ? xi1 : raw[last].x;
  const massConstant = -end * end * dthetaSurface;

  // Even samples by Hermite interpolation between the accepted steps.
  const xi = new Float64Array(samples);
  const theta = new Float64Array(samples);
  const dtheta = new Float64Array(samples);
  let k = 0;
  for (let i = 0; i < samples; i++) {
    const x = (end * i) / (samples - 1);
    xi[i] = x;
    if (x <= XI_START) {
      const s = seriesStart(n, x);
      theta[i] = s.theta;
      dtheta[i] = s.dtheta;
      continue;
    }
    while (k < raw.length - 2 && raw[k + 1].x < x) k++;
    const { y } = hermite(raw[k].x, raw[k].y, slopes[k], raw[k + 1].x, raw[k + 1].y, slopes[k + 1], x);
    theta[i] = y[0];
    dtheta[i] = y[1];
  }
  if (reachesSurface) {
    theta[samples - 1] = 0;
    dtheta[samples - 1] = dthetaSurface;
  }
  return {
    n,
    reachesSurface,
    xi1,
    dthetaSurface,
    massConstant,
    densityContrast: reachesSurface ? xi1 / (3 * Math.abs(dthetaSurface)) : Infinity,
    xi,
    theta,
    dtheta,
    steps,
  };
}

/** ∫₀^ξ₁ g(θ) ξ² dξ over the profile, by Simpson's rule. */
export function integrateProfile(sol: LaneEmden, g: (theta: number, xi: number) => number): number {
  const { xi, theta } = sol;
  const m = xi.length - 1;
  const h = xi[m] / m;
  let sum = 0;
  for (let i = 0; i <= m; i++) {
    const w = i === 0 || i === m ? 1 : i % 2 ? 4 : 2;
    sum += w * g(Math.max(0, theta[i]), xi[i]) * xi[i] * xi[i];
  }
  return (sum * h) / 3;
}

// ---------- Polytropes with a mass and a radius ----------

export interface Polytrope {
  n: number;
  /** kg, m */
  mass: number;
  radius: number;
  /** The length scale a = R/ξ₁, m. */
  a: number;
  /** Mean and central density, kg/m³. */
  rhoMean: number;
  rhoC: number;
  /** Central pressure, Pa. */
  pC: number;
  /** The constant in P = Kρ^(1+1/n), SI. */
  K: number;
}

/** A polytrope of the solution's index scaled to a mass (kg) and radius (m). Needs a surface (n < 5). */
export function polytrope(sol: LaneEmden, mass: number, radius: number): Polytrope {
  if (!sol.reachesSurface) throw new RangeError('A polytrope of index 5 or more has no surface to scale to a radius');
  const rhoMean = mass / ((4 / 3) * Math.PI * radius ** 3);
  const rhoC = sol.densityContrast * rhoMean;
  const a = radius / sol.xi1;
  const pC = (4 * Math.PI * G * a * a * rhoC * rhoC) / (sol.n + 1);
  return { n: sol.n, mass, radius, a, rhoMean, rhoC, pC, K: pC / rhoC ** (1 + 1 / sol.n) };
}

/** W_n in P_c = W_n GM²/R⁴: 1 / (4π(n + 1) θ′(ξ₁)²). */
export function centralPressureCoefficient(sol: LaneEmden): number {
  return 1 / (4 * Math.PI * (sol.n + 1) * sol.dthetaSurface ** 2);
}

/** The central temperature (K) of an ideal gas of mean molecular weight μ (in atomic mass units) at pressure P (Pa) and density ρ (kg/m³). */
export function idealGasTemperature(pressure: number, density: number, mu: number): number {
  return (mu * AMU * pressure) / (K_B * density);
}

/** A polytrope's gravitational energy, J: Ω = −3GM²/((5 − n)R). */
export function gravitationalEnergy(n: number, mass: number, radius: number): number {
  return (-3 * G * mass * mass) / ((5 - n) * radius);
}

export interface ProfilePoint {
  /** r/R and m/M. */
  r: number;
  m: number;
  /** kg/m³, Pa, K (an ideal gas of the given μ). */
  rho: number;
  P: number;
  T: number;
}

/** A scaled polytrope's profile from centre to surface, at the solution's sample points. */
export function polytropeProfile(sol: LaneEmden, p: Polytrope, mu: number): ProfilePoint[] {
  const tC = idealGasTemperature(p.pC, p.rhoC, mu);
  const out: ProfilePoint[] = [];
  for (let i = 0; i < sol.xi.length; i++) {
    const th = Math.max(0, sol.theta[i]);
    const x = sol.xi[i];
    out.push({
      r: x / sol.xi1,
      m: Math.min(1, (-x * x * sol.dtheta[i]) / sol.massConstant),
      rho: p.rhoC * th ** sol.n,
      P: p.pC * th ** (sol.n + 1),
      T: tC * th,
    });
  }
  return out;
}

/** 3∫P dV for a scaled polytrope, J: by the virial theorem it equals −Ω. */
export function pressureVolumeIntegral(sol: LaneEmden, p: Polytrope): number {
  return 3 * 4 * Math.PI * p.a ** 3 * p.pC * integrateProfile(sol, (th) => th ** (sol.n + 1));
}

/**
 * Eddington's standard model (1926): an n = 3 polytrope in which gas supplies
 * a fixed share β of the pressure and radiation the rest. Mass then sets β
 * through his quartic, 1 − β ∝ μ⁴β⁴M². Returns radiation's share, 1 − β, for a
 * mass (kg) and mean molecular weight μ.
 */
export function radiationShare(mass: number, mu: number, n3: LaneEmden): number {
  if (n3.n !== 3) throw new RangeError('The standard model is an n = 3 polytrope');
  // For β, P = Kρ^{4/3} with K = [(k/μm_u)⁴ 3(1 − β) / (aβ⁴)]^{1/3}, and an n = 3 polytrope's mass is 4π(K/πG)^{3/2} (−ξ₁²θ′₁).
  const aRad = (4 * SIGMA) / C;
  const massFor = (beta: number) => {
    const K = (((K_B / (mu * AMU)) ** 4 * 3 * (1 - beta)) / (aRad * beta ** 4)) ** (1 / 3);
    return 4 * Math.PI * (K / (Math.PI * G)) ** 1.5 * n3.massConstant;
  };
  // Mass grows as β falls from 1 to 0: bisect.
  let lo = 1e-12;
  let hi = 1 - 1e-15;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (massFor(mid) > mass) lo = mid;
    else hi = mid;
  }
  return 1 - (lo + hi) / 2;
}
