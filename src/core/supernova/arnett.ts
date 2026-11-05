import { C, M_SUN, R_SUN } from '../constants';
import { SECONDS_PER_DAY } from '../units';

/**
 * Light from radioactive nickel (Chapter 25): Arnett's (1980, 1982) model of a
 * supernova's light curve. An explosion throws out M_ej of gas expanding at
 * speed v, with M_Ni of nickel-56 mixed through it. The nickel decays to
 * cobalt-56 (mean life 8.8 days) and the cobalt to iron-56 (111.3 days); their
 * γ-rays heat the gas, and the heat diffuses out over a time set by how opaque
 * the gas is and how fast it thins:
 *
 *   τ_m = (2κM_ej / βcv)^{1/2}, β ≈ 13.8,
 *   L(t) = (2/τ_m²) e^{−(t/τ_m)²} ∫₀ᵗ t′ e^{(t′/τ_m)²} Q(t′) dt′,
 *
 * so L rises while heat is stored, peaks where it equals the heating ("Arnett's
 * rule"), and then follows it down. As the gas thins its γ-rays escape: the
 * share caught falls as 1 − e^{−(T₀/t)²}, T₀² = 3κ_γM_ej/(4πv²) (Clocchiatti &
 * Wheeler 1997, with κ_γ = 0.03 cm²/g), while the positrons from 3.2% of the
 * cobalt's decays are caught throughout. One zone, one opacity: the standard
 * first approximation.
 *
 * For explosions in a red supergiant's hydrogen envelope, Popov's (1993)
 * analytic plateau: the envelope's recombination lets light out at a nearly
 * constant rate for t_p, then the cobalt's tail takes over.
 *
 * SI at the boundaries: kg, m/s, m²/kg, s, W.
 */

/** Mean lives of nickel-56 and cobalt-56, s. */
export const TAU_NI = 8.8 * SECONDS_PER_DAY;
export const TAU_CO = 111.3 * SECONDS_PER_DAY;
/** Energy released per second per kilogram of the original nickel at the start of each decay, W/kg (3.9 × 10¹⁰ and 6.78 × 10⁹ erg/g/s). */
export const EPS_NI = 3.9e6;
export const EPS_CO = 6.78e5;
/** The share of cobalt's decay energy carried by positrons, which stay. */
export const POSITRON_SHARE = 0.032;
/** Arnett's geometric constant. */
export const BETA_ARNETT = 13.8;
/** The γ-rays' effective opacity, m²/kg (0.03 cm²/g). */
export const KAPPA_GAMMA = 0.003;

export interface ExplosionInput {
  /** Nickel-56 made, kg. */
  nickel: number;
  /** Mass thrown out, kg. */
  ejecta: number;
  /** Its speed, m/s. */
  speed: number;
  /** Its opacity to optical light, m²/kg (0.1 cm²/g is 0.01). */
  opacity: number;
}

/** Arnett's diffusion time τ_m, s: about the light curve's width. */
export function diffusionTime({ ejecta, speed, opacity }: ExplosionInput): number {
  return Math.sqrt((2 * opacity * ejecta) / (BETA_ARNETT * C * speed));
}

/** The power the decays release at time t (s), W: nickel's and cobalt's parts. */
export function decayPower(nickel: number, t: number): { nickel: number; cobalt: number; total: number } {
  const ni = nickel * EPS_NI * Math.exp(-t / TAU_NI);
  const co = nickel * EPS_CO * (Math.exp(-t / TAU_CO) - Math.exp(-t / TAU_NI));
  return { nickel: ni, cobalt: co, total: ni + co };
}

/** T₀, s: the time after which more than a third of the γ-rays escape. */
export function gammaEscapeTime({ ejecta, speed }: ExplosionInput): number {
  return Math.sqrt((3 * KAPPA_GAMMA * ejecta) / (4 * Math.PI * speed * speed));
}

/** The share of the γ-rays the gas catches at time t (s). */
export function gammaCaught(input: ExplosionInput, t: number): number {
  if (t <= 0) return 1;
  const t0 = gammaEscapeTime(input);
  return 1 - Math.exp(-((t0 / t) ** 2));
}

/** The heating the gas actually gets at time t, W: caught γ-rays, and every positron. */
export function deposited(input: ExplosionInput, t: number): number {
  const q = decayPower(input.nickel, t);
  const caught = gammaCaught(input, t);
  return (q.nickel + q.cobalt * (1 - POSITRON_SHARE)) * caught + q.cobalt * POSITRON_SHARE;
}

export interface LightCurvePoint {
  /** Days after the explosion. */
  day: number;
  /** The supernova's luminosity, the decays' power, and the share of it the gas catches, W. */
  L: number;
  power: number;
  caught: number;
}

/**
 * The light curve at `days` (ascending, from 0), by Arnett's integral with the
 * deposited heating, stepped exactly for heating held steady over each short step; with
 * `plateau`, Popov's plateau for a hydrogen envelope of radius R (m) added.
 */
export function lightCurve(input: ExplosionInput, days: readonly number[], plateau?: { radius: number }): LightCurvePoint[] {
  const tm = diffusionTime(input);
  const end = days[days.length - 1] * SECONDS_PER_DAY;
  // Steps of a sixtieth of the diffusion time, and never more than half a day, so the heating changes little in each.
  const n = Math.max(400, Math.ceil(end / Math.min(tm / 60, 0.5 * SECONDS_PER_DAY)));
  const h = end / n;
  // Arnett's integral obeys dL/dt = (2t/τ_m²)(Q − L). Over a step with Q held at its midpoint value, that is solved exactly:
  // L ← L e^{−(t² − t₀²)/τ_m²} + Q (1 − e^{−(t² − t₀²)/τ_m²}), which stays right however long the step is against τ_m.
  const out: LightCurvePoint[] = [];
  let k = 0;
  let prevT = 0;
  let prevL = 0;
  let L = 0;
  const pl = plateau ? popovPlateau(input, plateau.radius) : undefined;
  for (let i = 0; i <= n && k < days.length; i++) {
    const t = i * h;
    if (i > 0) {
      const keep = Math.exp(-(t * t - prevT * prevT) / (tm * tm));
      L = L * keep + deposited(input, 0.5 * (t + prevT)) * (1 - keep);
    }
    while (k < days.length && days[k] * SECONDS_PER_DAY <= t + h * 1e-6) {
      const td = days[k] * SECONDS_PER_DAY;
      // Between grid points, a straight line.
      const f = i > 0 ? Math.max(0, Math.min(1, (td - prevT) / h)) : 1;
      let shown = prevL + (L - prevL) * f;
      if (pl) shown = Math.max(shown, plateauLuminosity(pl, td));
      const q = decayPower(input.nickel, td).total;
      out.push({ day: days[k], L: shown, power: q, caught: q > 0 ? deposited(input, td) / q : 1 });
      k++;
    }
    prevT = t;
    prevL = L;
  }
  return out;
}

/** The peak of a light curve: its day and luminosity (W), refined by a parabola through the highest point and its neighbours. */
export function peakOf(curve: readonly LightCurvePoint[]): { day: number; L: number } {
  let i = 0;
  for (let k = 1; k < curve.length; k++) if (curve[k].L > curve[i].L) i = k;
  if (i === 0 || i === curve.length - 1) return { day: curve[i].day, L: curve[i].L };
  const [a, b, c] = [curve[i - 1], curve[i], curve[i + 1]];
  const denom = a.L - 2 * b.L + c.L;
  const shift = denom === 0 ? 0 : (0.5 * (a.L - c.L)) / denom;
  const step = (c.day - a.day) / 2;
  return { day: b.day + shift * step, L: b.L - 0.25 * (a.L - c.L) * shift };
}

/** Arnett's rule turned round: the nickel (kg) whose decays, at the peak's day, give its luminosity (W). */
export function nickelFromPeak(L: number, day: number): number {
  return L / decayPower(1, day * SECONDS_PER_DAY).total;
}

export interface Plateau {
  /** Its luminosity, W, and how long it lasts, s. */
  L: number;
  duration: number;
}

/**
 * Popov's (1993) plateau for an explosion of energy E = (3/10)M_ej v² in a
 * hydrogen envelope of radius R, with opacity κ and recombination at 5,054 K:
 * L_p = 1.64 × 10⁴² R₅₀₀^{2/3} E₅₁^{5/6} M₁₀^{−1/2} κ₀.₃₄^{−1/3} erg/s and
 * t_p = 99 κ₀.₃₄^{1/6} M₁₀^{1/2} R₅₀₀^{1/6} E₅₁^{−1/6} days, in units of 500 R☉,
 * 10⁵¹ erg, 10 M☉ and 0.34 cm²/g (as Kasen & Woosley 2009 give them).
 */
export function popovPlateau(input: ExplosionInput, radius: number): Plateau {
  const E51 = (0.3 * input.ejecta * input.speed ** 2) / 1e44;
  const M10 = input.ejecta / (10 * M_SUN);
  const R500 = radius / (500 * R_SUN);
  const k = input.opacity / 0.034;
  return {
    L: 1.64e35 * R500 ** (2 / 3) * E51 ** (5 / 6) * M10 ** -0.5 * k ** (-1 / 3),
    duration: 99 * SECONDS_PER_DAY * k ** (1 / 6) * M10 ** 0.5 * R500 ** (1 / 6) * E51 ** (-1 / 6),
  };
}

/** The plateau's luminosity at t (s): level, then falling off over about a week as the last of the envelope recombines. */
export function plateauLuminosity(p: Plateau, t: number): number {
  return p.L / (1 + Math.exp((t - p.duration) / (4 * SECONDS_PER_DAY)));
}
