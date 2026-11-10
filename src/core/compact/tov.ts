import { C, G, M_SUN } from '../constants';
import { solveAdaptive, type OdeStep } from '../structure/ode';
import { CORE_DIVISIONS, SLY_CRUST, type EosFit } from '../../data/eos';

/**
 * Neutron stars in general relativity: the Tolman–Oppenheimer–Volkoff
 * equation with Read et al.'s (2009) piecewise-polytrope equations of state
 * (src/data/eos.ts), and the same stars in Newton's gravity for comparison.
 *
 * The solver steps in the enthalpy h = ln((ε + p)/ρc²), from its central value
 * down to zero at the surface (Lindblom 1992), so the surface is found exactly
 * and the thin crust gets its share of steps:
 *
 *   dr/dh = −r(r − 2Gm/c²) / (Gm/c² + 4πG r³p/c⁴),  dm/dh = 4πr²(ε/c²) dr/dh.
 *
 * Newton's version steps in η = e^h − 1, the enthalpy per unit rest mass over
 * c², with gravity from the rest mass alone and no pressure in it:
 * dr/dη = −r²c²/(Gm), dm/dη = 4πr²ρ dr/dη.
 *
 * Units: SI at the edges (kg/m³, Pa, J/m³, m, kg). Inside, the equation of
 * state works in the paper's g/cm³ (pressure and energy as p/c² and ε/c²) and
 * the stepping in metres with G = c = 1.
 */

const C2_CGS = (C * 100) ** 2;
/** g/cm³ → G/c² × kg/m³: a mass density as a geometric curvature, m⁻². */
const GEOM = (1000 * G) / (C * C);
/** A mass in metres (Gm/c²) → kg. */
const MASS_OF_METRES = (C * C) / G;

interface Piece {
  /** Lower edge of the piece, g/cm³. */
  from: number;
  K: number;
  gamma: number;
  /** The constant in ε = (1 + a)ρ + Kρ^Γ/(Γ − 1) that keeps ε continuous. */
  a: number;
  /** The enthalpy at the piece's lower edge. */
  h0: number;
}

export interface PiecewiseEos {
  fit: EosFit;
  pieces: readonly Piece[];
  /** Where the crust meets the core, g/cm³. */
  crustCore: number;
}

/** Builds the seven pieces of a fit: the SLy crust's four and the core's three. */
export function piecewiseEos(fit: EosFit): PiecewiseEos {
  const [rho1, rho2] = CORE_DIVISIONS;
  const p1 = 10 ** fit.logP1 / C2_CGS;
  const k1 = p1 / rho1 ** fit.gamma1;
  const k2 = k1 * rho1 ** (fit.gamma1 - fit.gamma2);
  const k3 = k2 * rho2 ** (fit.gamma2 - fit.gamma3);
  const kc = SLY_CRUST.K[3];
  const gc = SLY_CRUST.gamma[3];
  // The crust's last piece meets the core's first where their pressures agree.
  const crustCore = (kc / k1) ** (1 / (fit.gamma1 - gc));
  const raw: { from: number; K: number; gamma: number }[] = [
    { from: 0, K: SLY_CRUST.K[0], gamma: SLY_CRUST.gamma[0] },
    { from: SLY_CRUST.rho[0], K: SLY_CRUST.K[1], gamma: SLY_CRUST.gamma[1] },
    { from: SLY_CRUST.rho[1], K: SLY_CRUST.K[2], gamma: SLY_CRUST.gamma[2] },
    { from: SLY_CRUST.rho[2], K: kc, gamma: gc },
    { from: crustCore, K: k1, gamma: fit.gamma1 },
    { from: rho1, K: k2, gamma: fit.gamma2 },
    { from: rho2, K: k3, gamma: fit.gamma3 },
  ];
  const pieces: Piece[] = [];
  let a = 0;
  for (let i = 0; i < raw.length; i++) {
    const { from, K, gamma } = raw[i];
    if (i > 0) {
      // Read et al. eq. (7): ε continuous at the boundary.
      const prev = raw[i - 1];
      const prevA = pieces[i - 1].a;
      const eps = (1 + prevA) * from + (prev.K / (prev.gamma - 1)) * from ** prev.gamma;
      a = eps / from - 1 - (K / (gamma - 1)) * from ** (gamma - 1);
    }
    const h0 = i === 0 ? 0 : Math.log(1 + a + ((K * gamma) / (gamma - 1)) * from ** (gamma - 1));
    pieces.push({ from, K, gamma, a, h0 });
  }
  return { fit, pieces, crustCore };
}

function pieceForDensity(eos: PiecewiseEos, rho: number): Piece {
  const { pieces } = eos;
  for (let i = pieces.length - 1; i > 0; i--) if (rho >= pieces[i].from) return pieces[i];
  return pieces[0];
}

function pieceForEnthalpy(eos: PiecewiseEos, h: number): Piece {
  const { pieces } = eos;
  for (let i = pieces.length - 1; i > 0; i--) if (h >= pieces[i].h0) return pieces[i];
  return pieces[0];
}

/** p/c² (g/cm³) at rest-mass density ρ (g/cm³). */
function pressureCgs(eos: PiecewiseEos, rho: number): number {
  const q = pieceForDensity(eos, rho);
  return q.K * rho ** q.gamma;
}

/** ε/c² (g/cm³), rest mass included, at ρ (g/cm³). */
function energyCgs(eos: PiecewiseEos, rho: number): number {
  const q = pieceForDensity(eos, rho);
  return (1 + q.a) * rho + (q.K / (q.gamma - 1)) * rho ** q.gamma;
}

/** Rest-mass density (g/cm³) at enthalpy h. */
function densityAtEnthalpy(eos: PiecewiseEos, h: number): number {
  if (h <= 0) return 0;
  const q = pieceForEnthalpy(eos, h);
  const excess = (q.a === 0 ? Math.expm1(h) : Math.exp(h) - 1 - q.a) * ((q.gamma - 1) / (q.K * q.gamma));
  return excess > 0 ? excess ** (1 / (q.gamma - 1)) : 0;
}

/** The equation of state in SI: pressure (Pa) at rest-mass density ρ (kg/m³). */
export function pressure(eos: PiecewiseEos, rho: number): number {
  return pressureCgs(eos, rho / 1000) * 1000 * C * C;
}

/** Energy density (J/m³), rest mass included, at ρ (kg/m³). */
export function energyDensity(eos: PiecewiseEos, rho: number): number {
  return energyCgs(eos, rho / 1000) * 1000 * C * C;
}

/** The enthalpy ln((ε + p)/ρc²) at ρ (kg/m³): dimensionless. */
export function enthalpy(eos: PiecewiseEos, rho: number): number {
  const r = rho / 1000;
  return Math.log((energyCgs(eos, r) + pressureCgs(eos, r)) / r);
}

/** The rest-mass density (kg/m³) at enthalpy h: the inverse of `enthalpy`. */
export function densityForEnthalpy(eos: PiecewiseEos, h: number): number {
  return densityAtEnthalpy(eos, h) * 1000;
}

/** The speed of sound as a share of light's, √(dp/dε) = √(Γp/(ε + p)), at ρ (kg/m³). */
export function soundSpeed(eos: PiecewiseEos, rho: number): number {
  const r = rho / 1000;
  const q = pieceForDensity(eos, r);
  const p = pressureCgs(eos, r);
  return Math.sqrt((q.gamma * p) / (energyCgs(eos, r) + p));
}

export interface ShellPoint {
  /** Distance from the centre (m), mass inside (kg), rest-mass density (kg/m³) and pressure (Pa). */
  r: number;
  m: number;
  rho: number;
  p: number;
}

export interface NeutronStar {
  /** Gravitational mass (kg) and radius (m); in Newton's gravity, the rest mass. */
  mass: number;
  radius: number;
  /** Central rest-mass density (kg/m³) and pressure (Pa). */
  rhoC: number;
  pC: number;
  /** The speed of sound at the centre, as a share of light's. */
  soundC: number;
  /** 2GM/Rc²: how close it is to being a black hole (1 would be one). */
  compactness: number;
  newtonian: boolean;
  /** Shells from the centre to the surface, one per accepted step. */
  profile: ShellPoint[];
  steps: number;
}

export interface StarOptions {
  /** Newton's gravity: no weight from pressure, no curvature. */
  newtonian?: boolean;
  /** Called with each accepted step, as the figures show the solver at work. */
  emit?: (step: OdeStep) => void;
  /** Relative tolerance (default 1e-8). */
  rtol?: number;
}

/** Builds a neutron star with central rest-mass density ρ_c (kg/m³). */
export function buildNeutronStar(eos: PiecewiseEos, rhoC: number, options: StarOptions = {}): NeutronStar {
  const { newtonian = false, emit, rtol = 1e-8 } = options;
  const rc = rhoC / 1000;
  const epsC = energyCgs(eos, rc) * GEOM;
  const pC = pressureCgs(eos, rc) * GEOM;
  const hC = Math.log((energyCgs(eos, rc) + pressureCgs(eos, rc)) / rc);
  // In Newton's gravity the variable is η = e^h − 1; in relativity, h itself.
  const xC = newtonian ? Math.expm1(hC) : hC;
  const dx = xC * 1e-6;
  const source = newtonian ? rc * GEOM : epsC + 3 * pC;
  const r0 = Math.sqrt((3 * dx) / (2 * Math.PI * source));
  const m0 = ((4 * Math.PI) / 3) * (newtonian ? rc * GEOM : epsC) * r0 ** 3;
  const rhoAt = (x: number) => densityAtEnthalpy(eos, newtonian ? Math.log1p(x) : x);
  const f = (x: number, y: Float64Array, out: Float64Array) => {
    const r = y[0];
    const m = y[1];
    const rho = rhoAt(x);
    if (newtonian) {
      const drdx = -(r * r) / m;
      out[0] = drdx;
      out[1] = 4 * Math.PI * r * r * rho * GEOM * drdx;
    } else {
      const p = rho > 0 ? pressureCgs(eos, rho) * GEOM : 0;
      const eps = rho > 0 ? energyCgs(eos, rho) * GEOM : 0;
      const drdx = (-r * (r - 2 * m)) / (m + 4 * Math.PI * r ** 3 * p);
      out[0] = drdx;
      out[1] = 4 * Math.PI * r * r * eps * drdx;
    }
  };
  const solution = solveAdaptive(f, xC - dx, [r0, m0], 0, { rtol, atol: 1e-10, hMax: xC / 250, h0: -xC / 2000, emit });
  const profile: ShellPoint[] = [{ r: 0, m: 0, rho: rhoC, p: pressureCgs(eos, rc) * 1000 * C * C }];
  for (const s of solution.steps) {
    const rho = rhoAt(s.x);
    profile.push({ r: s.y[0], m: s.y[1] * MASS_OF_METRES, rho: rho * 1000, p: rho > 0 ? pressureCgs(eos, rho) * 1000 * C * C : 0 });
  }
  const last = solution.steps[solution.steps.length - 1];
  const radius = last.y[0];
  const massGeom = last.y[1];
  return {
    mass: massGeom * MASS_OF_METRES,
    radius,
    rhoC,
    pC: pressureCgs(eos, rc) * 1000 * C * C,
    soundC: soundSpeed(eos, rhoC),
    compactness: (2 * massGeom) / radius,
    newtonian,
    profile,
    steps: solution.steps.length,
  };
}

export interface MassRadiusPoint {
  /** log₁₀ of the central density in g/cm³. */
  logRhoC: number;
  /** M☉ and km. */
  mass: number;
  radiusKm: number;
  /** Past the heaviest star, where a nudge makes it collapse. */
  unstable: boolean;
  /** The centre's sound speed exceeds light's. */
  acausal: boolean;
}

export interface MassRadiusCurve {
  points: MassRadiusPoint[];
  /** The heaviest star: M☉, km, log₁₀ g/cm³ and its central sound speed (share of c). */
  maximum: { mass: number; radiusKm: number; logRhoC: number; soundC: number };
}

/** The densities the curves sweep, log₁₀ g/cm³. */
export const LOG_RHO_RANGE = [14.25, 16] as const;

/**
 * The mass–radius curve of an equation of state: stars from light (central
 * density 10^14.25 g/cm³) to past the heaviest. The heaviest star is refined
 * by golden-section search on the central density.
 */
export function massRadiusCurve(eos: PiecewiseEos, options: { newtonian?: boolean; n?: number; logRange?: readonly [number, number] } = {}): MassRadiusCurve {
  const { newtonian = false, n = 70, logRange = LOG_RHO_RANGE } = options;
  const star = (lr: number) => buildNeutronStar(eos, 10 ** lr * 1000, { newtonian, rtol: 1e-7 });
  const points: MassRadiusPoint[] = [];
  let best = 0;
  for (let i = 0; i < n; i++) {
    const lr = logRange[0] + ((logRange[1] - logRange[0]) * i) / (n - 1);
    const s = star(lr);
    points.push({ logRhoC: lr, mass: s.mass / M_SUN, radiusKm: s.radius / 1000, unstable: false, acausal: s.soundC > 1 });
    if (points[i].mass > points[best].mass) best = i;
  }
  let maximum = { mass: points[best].mass, radiusKm: points[best].radiusKm, logRhoC: points[best].logRhoC, soundC: soundSpeed(eos, 10 ** points[best].logRhoC * 1000) };
  if (best > 0 && best < n - 1) {
    // Golden-section search for the peak between the neighbours.
    let a = points[best - 1].logRhoC;
    let b = points[best + 1].logRhoC;
    const phi = (Math.sqrt(5) - 1) / 2;
    let c = b - phi * (b - a);
    let d = a + phi * (b - a);
    let fc = star(c).mass;
    let fd = star(d).mass;
    for (let k = 0; k < 40 && b - a > 1e-6; k++) {
      if (fc > fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - phi * (b - a);
        fc = star(c).mass;
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + phi * (b - a);
        fd = star(d).mass;
      }
    }
    const lr = (a + b) / 2;
    const s = star(lr);
    maximum = { mass: s.mass / M_SUN, radiusKm: s.radius / 1000, logRhoC: lr, soundC: s.soundC };
  }
  for (const p of points) p.unstable = p.logRhoC > maximum.logRhoC;
  return { points, maximum };
}

/** Along the stable branch, the radius (km) of a star of `mass` (M☉), or null if none is that heavy (or that light). */
export function radiusForMass(curve: MassRadiusCurve, mass: number): number | null {
  const pts = curve.points.filter((p) => !p.unstable);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((a.mass - mass) * (b.mass - mass) <= 0 && a.mass !== b.mass) {
      const f = (mass - a.mass) / (b.mass - a.mass);
      return a.radiusKm + f * (b.radiusKm - a.radiusKm);
    }
  }
  return null;
}

/** Along the stable branch, the central density (log₁₀ g/cm³) of a star of `mass` (M☉), or null. */
export function logDensityForMass(curve: MassRadiusCurve, mass: number): number | null {
  const pts = curve.points.filter((p) => !p.unstable);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((a.mass - mass) * (b.mass - mass) <= 0 && a.mass !== b.mass) {
      return a.logRhoC + ((mass - a.mass) / (b.mass - a.mass)) * (b.logRhoC - a.logRhoC);
    }
  }
  return null;
}

/** The distance from the centre (m) at which a star's density falls to ρ (kg/m³); the radius if it never reaches it. */
export function radiusAtDensity(star: NeutronStar, rho: number): number {
  const p = star.profile;
  if (rho >= p[0].rho) return 0;
  for (let i = 1; i < p.length; i++) {
    if (p[i].rho <= rho) {
      const a = p[i - 1];
      const b = p[i];
      // Density falls steeply: interpolate in log ρ.
      if (b.rho <= 0) return a.r + (b.r - a.r) * 0.5;
      const f = (Math.log(rho) - Math.log(a.rho)) / (Math.log(b.rho) - Math.log(a.rho));
      return a.r + f * (b.r - a.r);
    }
  }
  return star.radius;
}

/** The mass inside the shells with density above ρ (kg/m³), kg. */
export function massAboveDensity(star: NeutronStar, rho: number): number {
  const p = star.profile;
  for (let i = 1; i < p.length; i++) {
    if (p[i].rho <= rho) {
      const a = p[i - 1];
      const b = p[i];
      const f = b.rho > 0 ? (Math.log(rho) - Math.log(a.rho)) / (Math.log(b.rho) - Math.log(a.rho)) : 0.5;
      return a.m + f * (b.m - a.m);
    }
  }
  return star.mass;
}

/** The most compact star causality allows: R = 2.9 GM/c² (Koranda, Stergioulas & Friedman 1997; Lattimer & Prakash 2007). Radius in km for a mass in M☉. */
export function causalityRadiusKm(massSun: number): number {
  return (2.9 * G * massSun * M_SUN) / (C * C) / 1000;
}

/** The horizon's radius for a mass, km: 2GM/c². */
export function schwarzschildRadiusKm(massSun: number): number {
  return (2 * G * massSun * M_SUN) / (C * C) / 1000;
}
