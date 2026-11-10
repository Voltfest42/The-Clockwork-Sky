import { C, G, M_SUN } from '../constants';

/**
 * Pulsars as spinning magnets: what a period P (s) and its rate of change Ṗ
 * (s/s) say about a pulsar, the lines of the P–Ṗ diagram, and a pulsar's path
 * across it as it ages or is spun up by a companion.
 *
 * A magnetic dipole spinning in a vacuum radiates its spin away, slowing as
 * Ω̇ ∝ −B²Ω³: the standard model, with a moment of inertia I = 10³⁸ kg m²
 * (10⁴⁵ g cm²) and a radius of 10 km. Then
 *
 *   B ≈ 3.2 × 10¹⁹ √(PṖ) gauss at the equator,
 *   τ = P/2Ṗ, the characteristic age (the true age if it was born spinning much faster),
 *   Ė = 4π²IṖ/P³, the power its slowing gives out.
 *
 * A dipole keeps PṖ fixed while it slows, so on the diagram it moves along a
 * line of constant field. Units: seconds, s/s, gauss, years and watts as
 * named.
 */

export const MOMENT_OF_INERTIA = 1e38; // kg m²
export const FIELD_CONSTANT = 3.2e19; // gauss per √s
const YEAR = 365.25 * 86400;

/** The surface field (gauss) of a pulsar with period P (s) slowing at Ṗ. */
export function surfaceField(P: number, Pdot: number): number {
  return FIELD_CONSTANT * Math.sqrt(P * Pdot);
}

/** The characteristic age P/2Ṗ, years. */
export function characteristicAge(P: number, Pdot: number): number {
  return P / (2 * Pdot) / YEAR;
}

/** The power its spin-down gives out, 4π²IṖ/P³, watts. */
export function spinDownPower(P: number, Pdot: number): number {
  return (4 * Math.PI ** 2 * MOMENT_OF_INERTIA * Pdot) / P ** 3;
}

/** Ṗ along the line of constant field B (gauss) at period P. */
export function pdotForField(P: number, B: number): number {
  return (B / FIELD_CONSTANT) ** 2 / P;
}

/** Ṗ along the line of constant characteristic age (years). */
export function pdotForAge(P: number, ageYears: number): number {
  return P / (2 * ageYears * YEAR);
}

/** Ṗ along the line of constant spin-down power (W). */
export function pdotForPower(P: number, power: number): number {
  return (power * P ** 3) / (4 * Math.PI ** 2 * MOMENT_OF_INERTIA);
}

/**
 * The death line: below it a pulsar's spin no longer drives enough voltage
 * across its polar cap to make the pairs that make its radio waves. Drawn as
 * B/P² = 0.17 × 10¹² G s⁻² (Bhattacharya et al. 1992); the theory isn't
 * settled, and a few pulsars shine beyond it.
 */
export function deathLinePdot(P: number): number {
  return pdotForField(P, 0.17e12 * P * P);
}

/** The Eddington luminosity of a 1.4 M☉ neutron star accreting hydrogen, W. */
const L_EDD_NS = 1.26e31 * 1.4;
const NS_MASS = 1.4 * M_SUN;
const NS_RADIUS = 1e4;

/**
 * The period a companion's gas spins a neutron star up to: where the
 * magnetosphere's edge (ξ times the Alfvén radius, ξ = 1) turns at the speed
 * of a Keplerian orbit there. B in gauss; accretion as a share of the
 * Eddington rate. P_eq ≈ 2.6 ms (B/10⁹ G)^{6/7} (Ṁ/Ṁ_Edd)^{−3/7}.
 */
export function equilibriumPeriod(B: number, eddingtonShare = 1): number {
  // In Gaussian units: the dipole moment μ = BR³ (G cm³), GM in cm³/s², the accretion rate in g/s.
  const mu = B * (NS_RADIUS * 100) ** 3;
  const gm = G * 1000 * NS_MASS * 1000;
  const mdot = ((L_EDD_NS * 1e7 * NS_RADIUS * 100) / gm) * eddingtonShare;
  const rA = (mu ** 4 / (2 * gm * mdot * mdot)) ** (1 / 7);
  return 2 * Math.PI * Math.sqrt(rA ** 3 / gm);
}

/** The spin-up line (accretion at the Eddington rate): the shortest period recycling can give a pulsar with each field. */
export function spinUpLinePdot(P: number): number {
  // P_eq ∝ B^{6/7}, so B = 10⁹ G × (P/P_eq(10⁹ G))^{7/6}.
  const B = 1e9 * (P / equilibriumPeriod(1e9)) ** (7 / 6);
  return pdotForField(P, B);
}

/** A pulsar born with period P0 (s) and field B (gauss), aged `years` by dipole braking: its period and Ṗ. */
export function aged(P0: number, B: number, years: number): { P: number; Pdot: number } {
  const k = (B / FIELD_CONSTANT) ** 2; // PṖ, constant
  const P = Math.sqrt(P0 * P0 + 2 * k * years * YEAR);
  return { P, Pdot: k / P };
}

/** Whether a pulsar at (P, Ṗ) is past the death line. */
export function isPastDeathLine(P: number, Pdot: number): boolean {
  return Pdot < deathLinePdot(P);
}

/** The recycled pulsar's field (gauss) and the accretion rate (share of Eddington) the figure uses. */
export const RECYCLED = { field: 3e8, eddingtonShare: 0.1 } as const;

/**
 * Recycling: a companion's gas buries the field to `RECYCLED.field` and spins
 * the pulsar up to the equilibrium period for that field and rate. Returns a
 * schematic path across the diagram in `n` steps, field and period changing
 * geometrically from where it starts to where it ends.
 */
export function recyclingPath(P: number, B: number, n = 24): { P: number; Pdot: number }[] {
  const end = equilibriumPeriod(RECYCLED.field, RECYCLED.eddingtonShare);
  const out: { P: number; Pdot: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const field = B * (RECYCLED.field / B) ** f;
    const period = P * (end / P) ** f;
    out.push({ P: period, Pdot: pdotForField(period, field) });
  }
  return out;
}

/** The pull at a neutron star's surface compared with Earth's: GM/R²/g. */
export function surfaceGravityRatio(massKg: number, radiusM: number): number {
  const g = (G * massKg) / (radiusM * radiusM) / Math.sqrt(1 - (2 * G * massKg) / (radiusM * C * C));
  return g / 9.80665;
}
