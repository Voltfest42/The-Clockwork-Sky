import { besselI0Scaled, besselI1Scaled, besselK0Scaled, besselK1Scaled } from '../math/bessel';
import { nelderMead } from '../math/minimise';

/**
 * Rotation curves (Chapter 30): the speed of a circular orbit at each radius
 * in a galaxy, built from its parts. Each part's own curve is the speed it
 * alone would give; speeds add in quadrature, v² = Σ vᵢ², because the pulls
 * add.
 *
 * Units, as galaxies are measured: radii in kpc, speeds in km/s, masses in M☉.
 */

/** G in kpc (km/s)² / M☉. */
export const G_GALAXY = 4.30091e-6;

/** The mass (M☉) inside radius r (kpc) that holds an orbit at speed v (km/s) on a circle, if it were spherical: v²r/G. */
export function massInside(v: number, r: number): number {
  return (v * v * r) / G_GALAXY;
}

/** A point mass's circular speed (km/s): Kepler's fall, v = √(GM/r). */
export function pointMassSpeed(r: number, mass: number): number {
  return Math.sqrt((G_GALAXY * mass) / r);
}

/** Hernquist's (1990) bulge, ρ ∝ 1/(r (r + a)³), of mass M and scale a (kpc): v² = GMr/(r + a)². */
export function hernquistSpeed(r: number, mass: number, a: number): number {
  return (Math.sqrt(G_GALAXY * mass * r) / (r + a));
}

/**
 * A thin exponential disc of mass M and scale length Rd (kpc), Σ = Σ₀ e^(−R/Rd):
 * Freeman's (1970) v² = 4πGΣ₀Rd y² [I₀K₀ − I₁K₁](y), y = R/2Rd. It peaks at
 * 2.2 Rd, a little above the speed of a sphere of the same mass, and falls
 * towards Kepler's far out.
 */
export function exponentialDiscSpeed(R: number, mass: number, Rd: number): number {
  if (R <= 0) return 0;
  const y = R / (2 * Rd);
  const sigma0 = mass / (2 * Math.PI * Rd * Rd);
  // The scaled forms' exponentials cancel in each product
  const bracket = besselI0Scaled(y) * besselK0Scaled(y) - besselI1Scaled(y) * besselK1Scaled(y);
  return Math.sqrt(Math.max(0, 4 * Math.PI * G_GALAXY * sigma0 * Rd * y * y * bracket));
}

/** The mean density (M☉/kpc³) within which a halo's edge is drawn: 200 times the critical density for H = 70 km/s/Mpc (a convention of simulations). */
export const RHO_200 = 200 * ((3 * 0.07 ** 2) / (8 * Math.PI * G_GALAXY));

/** A halo's edge, r₂₀₀ (kpc), for its mass M₂₀₀ (M☉). */
export function haloRadius(mass: number): number {
  return Math.cbrt((3 * mass) / (4 * Math.PI * RHO_200));
}

/** The concentration simulations give a halo of mass M₂₀₀ (M☉) today: Dutton & Macciò (2014), log c = 0.905 − 0.101 log(M / 10¹² h⁻¹ M☉), h = 0.7. */
export function concentration(mass: number): number {
  return 10 ** (0.905 - 0.101 * Math.log10(mass / (1e12 / 0.7)));
}

/**
 * A Navarro–Frenk–White (1996) dark halo of mass M₂₀₀ and concentration c
 * (default from its mass): ρ ∝ 1/(x(1 + x)²), x = r/r_s, r_s = r₂₀₀/c, and
 * v² = (GM₂₀₀/r) [ln(1 + x) − x/(1 + x)] / [ln(1 + c) − c/(1 + c)].
 */
export function nfwSpeed(r: number, mass: number, c = concentration(mass)): number {
  if (mass <= 0 || r <= 0) return 0;
  const rs = haloRadius(mass) / c;
  const x = r / rs;
  const m = (k: number) => Math.log(1 + k) - k / (1 + k);
  return Math.sqrt(((G_GALAXY * mass) / r) * (m(x) / m(c)));
}

/** An NFW halo's mass (M☉) inside r (kpc). */
export function nfwMassInside(r: number, mass: number, c = concentration(mass)): number {
  const rs = haloRadius(mass) / c;
  const m = (k: number) => Math.log(1 + k) - k / (1 + k);
  return (mass * m(r / rs)) / m(c);
}

/** Speeds added in quadrature; a negative speed (gas with a hole in the middle, pulling outwards) counts as a negative v². */
export function totalSpeed(...speeds: number[]): number {
  const v2 = speeds.reduce((s, v) => s + v * Math.abs(v), 0);
  return Math.sign(v2) * Math.sqrt(Math.abs(v2));
}

// ---------- galaxies measured ----------

/** A measured rotation curve split into its visible parts, as SPARC gives it: speeds (km/s) at radii (kpc), the stars' for a mass-to-light ratio of 1 M☉/L☉ at 3.6 µm. */
export interface MeasuredGalaxy {
  name: string;
  /** Mpc. */
  distance: number;
  r: readonly number[];
  v: readonly number[];
  error: readonly number[];
  gas: readonly number[];
  disc: readonly number[];
  bulge: readonly number[];
}

/** The speed the visible parts give at row i, for the stars' mass-to-light ratios (disc and bulge). */
export function visibleSpeed(g: MeasuredGalaxy, i: number, discRatio: number, bulgeRatio: number): number {
  return totalSpeed(g.gas[i], Math.sqrt(discRatio) * g.disc[i], Math.sqrt(bulgeRatio) * g.bulge[i]);
}

/** χ² of a galaxy's measured speeds against its visible parts plus an NFW halo of mass M₂₀₀ (concentration from its mass). */
export function haloChiSquare(g: MeasuredGalaxy, discRatio: number, bulgeRatio: number, haloMass: number): number {
  let chi = 0;
  for (let i = 0; i < g.r.length; i++) {
    const model = totalSpeed(visibleSpeed(g, i, discRatio, bulgeRatio), nfwSpeed(g.r[i], haloMass));
    chi += ((model - g.v[i]) / Math.max(g.error[i], 1)) ** 2;
  }
  return chi;
}

/**
 * The best NFW halo (mass M₂₀₀, M☉) for a galaxy, with the stars' mass-to-light
 * ratios held (default: the disc's 0.5 and the bulge's 0.7 at 3.6 µm, Lelli et
 * al. 2016's) or fitted too between 0.1 and 2, by Nelder–Mead in their logs.
 */
export function fitHalo(g: MeasuredGalaxy, options: { discRatio?: number; bulgeRatio?: number; fitRatios?: boolean } = {}) {
  const { discRatio = 0.5, bulgeRatio = 0.7, fitRatios = false } = options;
  const clampRatio = (u: number) => Math.min(2, Math.max(0.1, 10 ** u));
  const f = (p: readonly number[]) => {
    const disc = fitRatios ? clampRatio(p[1]) : discRatio;
    const bulge = fitRatios ? clampRatio(p[1] + 0.15) : bulgeRatio;
    return haloChiSquare(g, disc, bulge, 10 ** p[0]);
  };
  const start = fitRatios ? [11.5, Math.log10(discRatio)] : [11.5];
  const steps = fitRatios ? [0.5, 0.2] : [0.5];
  const best = nelderMead(f, start, steps, { tolerance: 1e-10, maxEvaluations: 4000 });
  const disc = fitRatios ? clampRatio(best.x[1]) : discRatio;
  return { haloMass: 10 ** best.x[0], discRatio: disc, bulgeRatio: fitRatios ? clampRatio(best.x[1] + 0.15) : bulgeRatio, chiSquare: best.value / Math.max(1, g.r.length - (fitRatios ? 2 : 1)) };
}
