import { AMU, C, G, H, M_E, M_SUN, R_SUN } from '../constants';
import { degeneratePressure } from '../structure/eos';
import { solveLaneEmden } from '../structure/laneEmden';
import { hermite, solveAdaptive, type OdeStep } from '../structure/ode';

/**
 * Cold white dwarfs (Chapter 24): balls held up by electrons packed as tightly
 * as the Pauli principle allows, with Chandrasekhar's exact pressure at zero
 * temperature, from slow electrons (P ∝ n^{5/3}) to electrons near light speed
 * (P ∝ n^{4/3}).
 *
 * At zero temperature dP = n_e dε_F, so hydrostatic balance dP/dr = −Gmρ/r²
 * becomes a statement about the electrons' Fermi energy ε_F = m_e c² y (rest
 * mass included, y = √(1 + x²)):
 *
 *   dy/dr = −μ_e m_u G m / (m_e c² r²),   dm/dr = 4π r² ρ(y),
 *   ρ(y) = μ_e m_u (8π/3) (m_e c/h)³ (y² − 1)^{3/2},
 *
 * stepped out from the centre until y = 1, where the electrons have no energy
 * to spare and the density is zero: the surface. Only electrons per nucleon
 * matter (μ_e = 2 for helium, carbon or oxygen); the ions' charge (Coulomb
 * corrections, a few per cent), the electrons' capture at the highest
 * densities and general relativity are left out.
 *
 * SI throughout: r in m, m in kg, ρ in kg/m³.
 */

/** Mass per electron (atomic mass units) of the white dwarfs' make-ups. */
export const MU_E = { helium: 2, carbonOxygen: 2, iron: 56 / 26 } as const;
export type WhiteDwarfMakeup = keyof typeof MU_E;

const MC2 = M_E * C * C;
const LAMBDA_C = H / (M_E * C);

/** The density (kg/m³) where the electrons' Fermi energy is m_e c² y. */
export function densityAt(y: number, mue: number): number {
  const s = y * y - 1;
  return s > 0 ? mue * AMU * ((8 * Math.PI) / 3) * (s * Math.sqrt(s)) / LAMBDA_C ** 3 : 0;
}

/** The Fermi energy over m_e c² (rest mass included) at density ρ (kg/m³). */
export function fermiY(rho: number, mue: number): number {
  const x = Math.cbrt((3 * rho) / (8 * Math.PI * mue * AMU)) * LAMBDA_C;
  return Math.sqrt(1 + x * x);
}

/** The relativity parameter x = p_F/m_e c at density ρ: above 1, the electrons move near light speed. */
export function relativityAt(rho: number, mue: number): number {
  return Math.cbrt((3 * rho) / (8 * Math.PI * mue * AMU)) * LAMBDA_C;
}

export interface WhiteDwarfModel {
  /** Central density (kg/m³) and μ_e. */
  rhoC: number;
  mue: number;
  /** kg and m. */
  mass: number;
  radius: number;
  /** The solver's accepted steps (r, then [y, m]), the centre first: what the figure draws. */
  steps: OdeStep[];
  /** The profile at each step, the surface last: r (m), m (kg), ρ (kg/m³), P (Pa), x. */
  profile: { r: number; m: number; rho: number; P: number; x: number }[];
}

/**
 * A cold white dwarf of central density ρ_c (kg/m³) and μ_e, by Dormand–Prince
 * steps from a series start near the centre to the surface, found by Newton's
 * method on the Hermite interpolant between the last two steps. `emit` gets each
 * step as it is accepted.
 */
export function buildWhiteDwarf(rhoC: number, mue: number = MU_E.carbonOxygen, emit?: (s: OdeStep) => void): WhiteDwarfModel {
  const yC = fermiY(rhoC, mue);
  const k = (mue * AMU * G) / MC2;
  // The centre's curvature: y ≈ y_c − (2π/3) k ρ_c r². Start where y has fallen a ten-millionth of its way to the surface.
  const curv = ((2 * Math.PI) / 3) * k * rhoC;
  const scale = Math.sqrt((yC - 1) / curv);
  const r0 = scale * 3e-4;
  const y0 = yC - curv * r0 * r0;
  const m0 = ((4 * Math.PI) / 3) * rhoC * r0 ** 3;
  const f = (r: number, s: Float64Array, out: Float64Array) => {
    out[0] = (-k * s[1]) / (r * r);
    out[1] = 4 * Math.PI * r * r * densityAt(s[0], mue);
  };
  const result = solveAdaptive(f, r0, [y0, m0], scale * 50, {
    rtol: 1e-10,
    atol: 1e-14,
    h0: scale * 1e-3,
    stop: (_r, s) => s[0] <= 1,
    emit,
  });
  const { steps, slopes } = result;
  const n = steps.length;
  let radius = steps[n - 1].x;
  let mass = steps[n - 1].y[1];
  if (n >= 2 && steps[n - 1].y[0] <= 1) {
    const a = steps[n - 2];
    const b = steps[n - 1];
    let r = a.x + ((a.y[0] - 1) / (a.y[0] - b.y[0])) * (b.x - a.x);
    for (let i = 0; i < 30; i++) {
      const { y, dy } = hermite(a.x, a.y, slopes[n - 2], b.x, b.y, slopes[n - 1], r);
      const step = (y[0] - 1) / dy[0];
      r = Math.min(b.x, Math.max(a.x, r - step));
      if (Math.abs(step) < 1e-13 * r) break;
    }
    radius = r;
    mass = hermite(a.x, a.y, slopes[n - 2], b.x, b.y, slopes[n - 1], r).y[1];
  }
  const profile = steps
    .filter((s) => s.y[0] > 1)
    .map((s) => {
      const rho = densityAt(s.y[0], mue);
      return { r: s.x, m: s.y[1], rho, P: degeneratePressure(rho / (mue * AMU)), x: Math.sqrt(s.y[0] * s.y[0] - 1) };
    });
  profile.unshift({ r: 0, m: 0, rho: rhoC, P: degeneratePressure(rhoC / (mue * AMU)), x: relativityAt(rhoC, mue) });
  profile.push({ r: radius, m: mass, rho: 0, P: 0, x: 0 });
  return { rhoC, mue, mass, radius, steps, profile };
}

export interface MassRadiusPoint {
  /** Central density, kg/m³; mass, M☉; radius, km. */
  rhoC: number;
  mass: number;
  radiusKm: number;
}

/** The mass–radius curve: white dwarfs of central densities from 10⁴ to 10¹² g/cm³ (log-spaced, `n` of them). */
export function massRadiusCurve(mue: number = MU_E.carbonOxygen, n = 49, logRhoGcc: readonly [number, number] = [4, 12]): MassRadiusPoint[] {
  const out: MassRadiusPoint[] = [];
  for (let i = 0; i < n; i++) {
    const lr = logRhoGcc[0] + ((logRhoGcc[1] - logRhoGcc[0]) * i) / (n - 1);
    const wd = buildWhiteDwarf(10 ** lr * 1000, mue);
    out.push({ rhoC: wd.rhoC, mass: wd.mass / M_SUN, radiusKm: wd.radius / 1000 });
  }
  return out;
}

/**
 * The Chandrasekhar mass (kg) for μ_e: M_Ch = (√(3π)/2)(ħc/G)^{3/2} ω₃/(μ_e m_u)²,
 * where ω₃ = −ξ₁²θ′(ξ₁) = 2.018 for the n = 3 polytrope that electrons at light
 * speed make: 1.457 M☉ for μ_e = 2, 1.26 for iron.
 */
export function chandrasekharMass(mue: number): number {
  const omega3 = solveLaneEmden(3).massConstant;
  const hbar = H / (2 * Math.PI);
  return ((Math.sqrt(3 * Math.PI) / 2) * ((hbar * C) / G) ** 1.5 * omega3) / (mue * AMU) ** 2;
}

/**
 * Nauenberg's (1972) fit to the mass–radius curve for μ_e = 2:
 * R ≈ 0.0112 R☉ [(M/M_Ch)^{−2/3} − (M/M_Ch)^{2/3}]^{1/2}, with M_Ch = 5.83/μ_e² M☉. Returns m.
 */
export function nauenbergRadius(massSolar: number, mue: number = 2): number {
  const u = massSolar / (5.83 / (mue * mue));
  if (u >= 1) return 0;
  return 0.0112 * R_SUN * (2 / mue) * Math.sqrt(u ** (-2 / 3) - u ** (2 / 3));
}

/**
 * The central density (kg/m³) of the white dwarf of a given mass (M☉), by
 * bisection in log ρ_c along the solver's curve (mass grows with central
 * density). NaN at or above the limit.
 */
export function centralDensityFor(massSolar: number, mue: number = MU_E.carbonOxygen): number {
  if (massSolar >= chandrasekharMass(mue) / M_SUN) return NaN;
  let lo = 4; // log₁₀ kg/m³
  let hi = 19;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (buildWhiteDwarf(10 ** mid, mue).mass / M_SUN > massSolar) hi = mid;
    else lo = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

/** The white dwarf of a given mass (M☉): the model at its central density. */
export function whiteDwarfOfMass(massSolar: number, mue: number = MU_E.carbonOxygen): WhiteDwarfModel {
  return buildWhiteDwarf(centralDensityFor(massSolar, mue), mue);
}

/** The mass (M☉) of the white dwarf with a given radius (m), by bisection along the curve (radius falls as mass grows). */
export function massForRadius(radius: number, mue: number = MU_E.carbonOxygen): number {
  let lo = 4;
  let hi = 19;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (buildWhiteDwarf(10 ** mid, mue).radius > radius) lo = mid;
    else hi = mid;
  }
  return buildWhiteDwarf(10 ** ((lo + hi) / 2), mue).mass / M_SUN;
}

/** The share of a white dwarf's mass whose electrons move near light speed (x > 1). */
export function relativisticShare(wd: WhiteDwarfModel): number {
  const p = wd.profile;
  for (let i = 1; i < p.length; i++) {
    if (p[i].x <= 1 && p[i - 1].x > 1) {
      const f = (p[i - 1].x - 1) / (p[i - 1].x - p[i].x);
      return (p[i - 1].m + f * (p[i].m - p[i - 1].m)) / wd.mass;
    }
  }
  return p[0].x > 1 ? 1 : 0;
}
