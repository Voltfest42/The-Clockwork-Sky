import { lunationArguments, SYNODIC_MONTH } from './lunation';
import { DEG } from '../units';

/**
 * Eclipses of the Sun and the Moon, found by Meeus's method (Astronomical
 * Algorithms, 2nd ed., ch. 54). An eclipse needs a new or full Moon close to
 * one of the nodes of the Moon's orbit, so the finder looks at every new and
 * full Moon, skips those whose argument of latitude F is too far from 0° or
 * 180°, and for the rest works out the time of greatest eclipse, γ (how far
 * the shadow's axis passes from Earth's centre, in Earth radii) and u (the
 * radius of the Moon's umbral cone in the plane through Earth's centre).
 * Those two numbers say what kind of eclipse it is.
 *
 * Meeus gives the times to a few minutes. The tests compare every eclipse
 * from 1900 to 2100 with NASA's catalogues ("Eclipse Predictions by Fred
 * Espenak (NASA's GSFC)"). Times are Julian Dates (TT).
 */

export type SolarEclipseType = 'total' | 'annular' | 'hybrid' | 'partial';
export type LunarEclipseType = 'total' | 'partial' | 'penumbral';

interface EclipseBase {
  /** Lunation number of the new or full Moon (Meeus ch. 49). */
  k: number;
  /** Greatest eclipse: Julian Date (TT). */
  jdTT: number;
  /** Least distance from the axis of the shadow to Earth's centre (solar) or of Earth's shadow to the Moon's centre (lunar), in Earth radii; negative south. */
  gamma: number;
  /** Radius of the Moon's umbral cone (solar) in the fundamental plane, Earth radii; Meeus's u, also used for Earth's shadow. */
  u: number;
  /** True when the Moon is at its ascending node (moving north), false at its descending node. */
  ascending: boolean;
}

export interface SolarEclipse extends EclipseBase {
  kind: 'solar';
  type: SolarEclipseType;
  /** Whether the axis of the shadow touches Earth (every total, annular and hybrid eclipse but a few). */
  central: boolean;
  /** For partial eclipses, the greatest fraction of the Sun's diameter covered; for central ones, null. */
  magnitude: number | null;
}

export interface LunarEclipse extends EclipseBase {
  kind: 'lunar';
  type: LunarEclipseType;
  /** Fraction of the Moon's diameter inside the penumbra at greatest eclipse. */
  penumbralMagnitude: number;
  /** Fraction of the Moon's diameter inside the umbra (negative: it misses the umbra). */
  umbralMagnitude: number;
  /** Half the durations of the penumbral, partial and total phases: minutes (0 when there is no such phase). */
  semiDurations: { penumbral: number; partial: number; total: number };
}

export type Eclipse = SolarEclipse | LunarEclipse;

/**
 * The eclipse at lunation k, if there is one: k an integer for a new Moon
 * (a solar eclipse), or an integer + 0.5 for a full Moon (a lunar one).
 */
export function eclipseAt(k: number): Eclipse | null {
  const solar = Math.abs(k - Math.round(k)) < 0.25;
  const a = lunationArguments(k);
  const { E, M, Mp, omega } = a;
  // A quick rejection: no eclipse when the Moon is too far from a node.
  if (Math.abs(Math.sin(a.F)) > 0.36) return null;
  const F1 = a.F - 0.02665 * DEG * Math.sin(omega);
  const A1 = (299.77 + 0.107408 * k - 0.009173 * a.T * a.T) * DEG;

  const jdTT =
    a.jdMean +
    (solar ? -0.4075 * Math.sin(Mp) + 0.1721 * E * Math.sin(M) : -0.4065 * Math.sin(Mp) + 0.1727 * E * Math.sin(M)) +
    0.0161 * Math.sin(2 * Mp) -
    0.0097 * Math.sin(2 * F1) +
    0.0073 * E * Math.sin(Mp - M) -
    0.005 * E * Math.sin(Mp + M) -
    0.0023 * Math.sin(Mp - 2 * F1) +
    0.0021 * E * Math.sin(2 * M) +
    0.0012 * Math.sin(Mp + 2 * F1) +
    0.0006 * E * Math.sin(2 * Mp + M) -
    0.0004 * Math.sin(3 * Mp) -
    0.0003 * E * Math.sin(M + 2 * F1) +
    0.0003 * Math.sin(A1) -
    0.0002 * E * Math.sin(M - 2 * F1) -
    0.0002 * E * Math.sin(2 * Mp - M) -
    0.0002 * Math.sin(omega);

  const P =
    0.207 * E * Math.sin(M) +
    0.0024 * E * Math.sin(2 * M) -
    0.0392 * Math.sin(Mp) +
    0.0116 * Math.sin(2 * Mp) -
    0.0073 * E * Math.sin(Mp + M) +
    0.0067 * E * Math.sin(Mp - M) +
    0.0118 * Math.sin(2 * F1);
  const Q =
    5.2207 -
    0.0048 * E * Math.cos(M) +
    0.002 * E * Math.cos(2 * M) -
    0.3299 * Math.cos(Mp) -
    0.006 * E * Math.cos(Mp + M) +
    0.0041 * E * Math.cos(Mp - M);
  const W = Math.abs(Math.cos(F1));
  const gamma = (P * Math.cos(F1) + Q * Math.sin(F1)) * (1 - 0.0048 * W);
  const u = 0.0059 + 0.0046 * E * Math.cos(M) - 0.0182 * Math.cos(Mp) + 0.0004 * Math.cos(2 * Mp) - 0.0005 * Math.cos(M + Mp);
  // F near 0° is the ascending node; near 180°, the descending one.
  const ascending = Math.cos(F1) > 0;
  const g = Math.abs(gamma);
  const base = { k, jdTT, gamma, u, ascending };

  if (solar) {
    if (g > 1.5433 + u) return null;
    if (g < 0.9972) {
      // Central: the axis of the shadow crosses Earth.
      let type: SolarEclipseType;
      if (u < 0) type = 'total';
      else if (u > 0.0047) type = 'annular';
      else type = u < 0.00464 * Math.sqrt(1 - gamma * gamma) ? 'hybrid' : 'annular';
      return { ...base, kind: 'solar', type, central: true, magnitude: null };
    }
    if (g < 0.9972 + Math.abs(u)) {
      // Non-central total or annular: the axis misses Earth, but part of the umbra or antumbra touches it.
      return { ...base, kind: 'solar', type: u < 0 ? 'total' : 'annular', central: false, magnitude: null };
    }
    return { ...base, kind: 'solar', type: 'partial', central: false, magnitude: (1.5433 + u - g) / (0.5461 + 2 * u) };
  }

  const penumbralMagnitude = (1.5573 + u - g) / 0.545;
  if (penumbralMagnitude < 0) return null;
  const umbralMagnitude = (1.0128 - u - g) / 0.545;
  const n = 0.5458 + 0.04 * Math.cos(Mp);
  const semi = (r: number) => (r > g ? (60 / n) * Math.sqrt(r * r - gamma * gamma) : 0);
  return {
    ...base,
    kind: 'lunar',
    type: umbralMagnitude >= 1 ? 'total' : umbralMagnitude > 0 ? 'partial' : 'penumbral',
    penumbralMagnitude,
    umbralMagnitude,
    semiDurations: { penumbral: semi(1.5573 + u), partial: semi(1.0128 - u), total: semi(0.4678 - u) },
  };
}

/** Every eclipse, solar and lunar, whose greatest eclipse falls between two Julian Dates (TT), in order. */
export function eclipsesBetween(fromTT: number, toTT: number): Eclipse[] {
  const out: Eclipse[] = [];
  const first = Math.floor((fromTT - 2_451_550.097_66) / SYNODIC_MONTH) - 1;
  for (let k = first; ; k += 0.5) {
    const eclipse = eclipseAt(k);
    if (eclipse && eclipse.jdTT > toTT) break;
    if (!eclipse && lunationArguments(k).jdMean > toTT + 1) break;
    if (eclipse && eclipse.jdTT >= fromTT) out.push(eclipse);
  }
  return out;
}

/** The Saros: 223 synodic months, about 6,585.32 days, after which an eclipse repeats. */
export const SAROS_MONTHS = 223;
export const SAROS_DAYS = SAROS_MONTHS * SYNODIC_MONTH;
/** The inex: 358 synodic months, about 29 years less 20 days. An eclipse one inex later belongs to the next Saros series. */
export const INEX_MONTHS = 358;

/**
 * Reference eclipses for the Saros numbers, in van den Bergh's numbering as
 * NASA uses it: the total solar eclipse of 12 August 2026 (new Moon k = 329)
 * is in Saros 126, and the total lunar eclipse of 3 March 2026 (full Moon
 * k = 323.5) in Saros 133.
 */
const SAROS_REFERENCE = { solar: { k: 329, saros: 126 }, lunar: { k: 323.5, saros: 133 } };

/**
 * The Saros series an eclipse belongs to. Any two eclipses are a whole number
 * of Saros periods (a) and inexes (b) apart, Δk = 223a + 358b; a series lasts
 * about 1,300 years, so |a| < 180, and each inex moves to the next series.
 */
export function sarosNumber(eclipse: Pick<Eclipse, 'k' | 'kind'>): number {
  const ref = SAROS_REFERENCE[eclipse.kind];
  const dk = Math.round(eclipse.k - ref.k);
  // 358b ≡ Δk (mod 223); 358 ≡ 135, and 135 × 38 = 5130 = 23 × 223 + 1, so the inverse of 358 mod 223 is 38.
  const b = (((dk * 38) % SAROS_MONTHS) + SAROS_MONTHS) % SAROS_MONTHS;
  const a = (dk - INEX_MONTHS * b) / SAROS_MONTHS;
  // Of the solutions (a − 358j, b + 223j), take the one with the smallest |a|.
  const j = Math.round(a / INEX_MONTHS);
  return ref.saros + b + SAROS_MONTHS * j;
}
