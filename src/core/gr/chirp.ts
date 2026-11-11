/**
 * The chirp of two compact bodies spiralling together: the inspiral, joined
 * to a ringdown of the black hole they make. A teaching model, not a template
 * LIGO would search with: real templates are calibrated to numerical
 * relativity through the merger and include the bodies' spins.
 *
 * - Inspiral at leading (quadrupole) order: f rises as (t_c − t)^(−3/8) at the rate
 *   ḟ = (96/5) π^(8/3) (G𝓜/c³)^(5/3) f^(11/3), and a pair seen face-on from overhead makes a strain
 *   h = (4/D) (G𝓜/c²)^(5/3) (πf/c)^(2/3). The waveform can be stepped at this order, or with the post-Newtonian
 *   corrections to 3.5 order (`xRate`), which speed the sweep near the end.
 * - The black hole left: its mass from Barausse, Morozova & Rezzolla (2012) and its spin from Rezzolla et al.
 *   (2008), both for black holes that don't spin before they merge.
 * - Ringdown: the l = m = 2 fundamental quasi-normal mode of a Kerr black hole, from Berti, Cardoso & Will's (2006)
 *   fits: a frequency f_ring and a decay time τ.
 * - The join: the inspiral is stopped where its rising frequency can turn smoothly into the ringdown's approach to
 *   f_ring, f = f_ring − (f_ring − f_j) e^(−(t − t_j)/τ), with the same slope (ḟ_inspiral(f_j) = (f_ring − f_j)/τ).
 *   At leading order, for an equal pair, this lands at G M f_j / c³ ≈ 0.057, where numerical relativity puts the
 *   peak; with the 3.5PN sweep, which steepens near the end, at about 0.042. The amplitude is continued with the
 *   same slope into a decay at the ringdown's rate.
 *
 * SI units: masses in kg, distances in m, times in s, frequencies in Hz (of the waves, twice the orbit's).
 */
import { C, G } from '../constants';

/** The chirp mass 𝓜 = (m₁m₂)^(3/5) / (m₁ + m₂)^(1/5), kg: the one combination of the masses that sets the inspiral. */
export function chirpMass(m1: number, m2: number): number {
  return (m1 * m2) ** 0.6 / (m1 + m2) ** 0.2;
}

/** The symmetric mass ratio η = m₁m₂/(m₁ + m₂)², ¼ for equal masses. */
export function symmetricMassRatio(m1: number, m2: number): number {
  return (m1 * m2) / (m1 + m2) ** 2;
}

/** G𝓜/c³, s: the chirp mass as a time. */
function chirpTime(mc: number): number {
  return (G * mc) / C ** 3;
}

/** The waves' frequency a time τ (s) before the merger, at leading order: (1/π) (5/256τ)^(3/8) (G𝓜/c³)^(−5/8), Hz. */
export function frequencyBefore(mc: number, tau: number): number {
  return (1 / Math.PI) * (5 / (256 * tau)) ** 0.375 * chirpTime(mc) ** -0.625;
}

/** The time left before the merger when the waves have frequency f (Hz), at leading order: (5/256) (G𝓜/c³)^(−5/3) (πf)^(−8/3), s. */
export function timeBefore(mc: number, f: number): number {
  return (5 / 256) * chirpTime(mc) ** (-5 / 3) * (Math.PI * f) ** (-8 / 3);
}

/** How fast the frequency rises, at leading order: ḟ = (96/5) π^(8/3) (G𝓜/c³)^(5/3) f^(11/3), Hz/s. */
export function frequencyRate(mc: number, f: number): number {
  return (96 / 5) * Math.PI ** (8 / 3) * chirpTime(mc) ** (5 / 3) * f ** (11 / 3);
}

/** The chirp mass from a frequency and how fast it rises: 𝓜 = (c³/G) [(5/96) π^(−8/3) f^(−11/3) ḟ]^(3/5), kg. */
export function chirpMassFromSweep(f: number, fdot: number): number {
  return (C ** 3 / G) * ((5 / 96) * Math.PI ** (-8 / 3) * f ** (-11 / 3) * fdot) ** 0.6;
}

/** The number of wave cycles from frequency f₁ to f₂, at leading order: (1/32π^(8/3)) (G𝓜/c³)^(−5/3) (f₁^(−5/3) − f₂^(−5/3)). */
export function cyclesBetween(mc: number, f1: number, f2: number): number {
  return (1 / (32 * Math.PI ** (8 / 3))) * chirpTime(mc) ** (-5 / 3) * (f1 ** (-5 / 3) - f2 ** (-5 / 3));
}

/** The strain amplitude at frequency f of a pair at distance D (m), seen face-on from straight overhead: (4/D) (G𝓜/c²)^(5/3) (πf/c)^(2/3). */
export function inspiralAmplitude(mc: number, f: number, D: number): number {
  return (4 / D) * ((G * mc) / C ** 2) ** (5 / 3) * ((Math.PI * f) / C) ** (2 / 3);
}

/** The waves' frequency at the innermost stable circular orbit of the total mass M: c³ / (6^(3/2) π G M), Hz (4,400 Hz × M☉/M). */
export function iscoFrequency(M: number): number {
  return C ** 3 / (6 ** 1.5 * Math.PI * G * M);
}

/** The share of the mass radiated by two non-spinning black holes (Barausse, Morozova & Rezzolla 2012): (1 − √(8/9)) η + 4η² (4p₀ + √(8/9) − 1), p₀ = 0.04827. */
export function radiatedFraction(eta: number): number {
  const eIsco = Math.sqrt(8 / 9);
  return (1 - eIsco) * eta + 4 * eta * eta * (4 * 0.04827 + eIsco - 1);
}

/** The spin of the black hole left by two non-spinning ones (Rezzolla et al. 2008): 2√3 η − 3.871 η² + 4.028 η³ (0.69 for equal masses). */
export function finalSpin(eta: number): number {
  return 2 * Math.sqrt(3) * eta - 3.871 * eta ** 2 + 4.028 * eta ** 3;
}

/**
 * The l = m = 2 fundamental ringing of a Kerr black hole of mass M (kg) and spin a (Berti, Cardoso & Will 2006,
 * Table VIII fits): G M ω/c³ = 1.5251 − 1.1568 (1 − a)^0.1292 and Q = 0.7000 + 1.4187 (1 − a)^(−0.4990); the
 * frequency f = ω/2π (Hz) and the amplitude's decay time τ = 2Q/ω = Q/(πf) (s).
 */
export function ringdown(M: number, a: number): { f: number; tau: number; Q: number } {
  const omega = (1.5251 - 1.1568 * (1 - a) ** 0.1292) / ((G * M) / C ** 3);
  const Q = 0.7 + 1.4187 * (1 - a) ** -0.499;
  const f = omega / (2 * Math.PI);
  return { f, tau: Q / (Math.PI * f), Q };
}

/** 0: the leading (quadrupole) order; 3.5: with post-Newtonian corrections to 3.5 order. */
export type PnOrder = 0 | 3.5;

/** Euler's constant γ, for the 3PN term. */
const EULER_GAMMA = 0.5772156649015329;

/**
 * How fast the post-Newtonian parameter x = (G M ω_orb / c³)^(2/3) rises, dx/dt (s⁻¹), for a pair of total mass M
 * (kg, as seen) and symmetric mass ratio η: at leading order (`order` 0), or to 3.5 post-Newtonian order with the
 * energy and flux expanded together (TaylorT4: Boyle et al. 2007; Buonanno, Iyer, Ochsner, Pan & Sathyaprakash
 * 2009, eq. 3.6), for black holes that don't spin:
 * dx/dt = (64η/5)(c³/GM) x⁵ {1 − (743/336 + 11η/4) x + 4π x^(3/2) + (34103/18144 + 13661η/2016 + 59η²/18) x²
 * − (4159/672 + 189η/8) π x^(5/2) + [16447322263/139708800 − 1712γ/105 + 16π²/3 − (856/105) ln 16x
 * + (−56198689/217728 + 451π²/48) η + 541η²/896 − 5605η³/2592] x³ + (−4415/4032 + 358675η/6048 + 91495η²/1512) π x^(7/2)}.
 */
export function xRate(x: number, M: number, eta: number, order: PnOrder): number {
  const lead = ((64 * eta) / 5) * (C ** 3 / (G * M)) * x ** 5;
  if (order === 0) return lead;
  const pi = Math.PI;
  const series =
    1 -
    (743 / 336 + (11 / 4) * eta) * x +
    4 * pi * x ** 1.5 +
    (34103 / 18144 + (13661 / 2016) * eta + (59 / 18) * eta * eta) * x * x -
    (4159 / 672 + (189 / 8) * eta) * pi * x ** 2.5 +
    (16447322263 / 139708800 -
      (1712 / 105) * EULER_GAMMA +
      (16 / 3) * pi * pi -
      (856 / 105) * Math.log(16 * x) +
      (-56198689 / 217728 + (451 / 48) * pi * pi) * eta +
      (541 / 896) * eta * eta -
      (5605 / 2592) * eta ** 3) *
      x ** 3 +
    (-4415 / 4032 + (358675 / 6048) * eta + (91495 / 1512) * eta * eta) * pi * x ** 3.5;
  return lead * series;
}

/** The waves' frequency for a value of x (Hz): f = 2 f_orb = x^(3/2) c³ / (π G M). */
export function frequencyOfX(x: number, M: number): number {
  return (x ** 1.5 * C ** 3) / (Math.PI * G * M);
}

/** x for the waves' frequency f (Hz): (π G M f / c³)^(2/3). */
export function xOfFrequency(f: number, M: number): number {
  return ((Math.PI * G * M * f) / C ** 3) ** (2 / 3);
}

/** How fast the waves' frequency rises at frequency f (Hz/s), from dx/dt: ḟ = (3/2)(f/x) dx/dt. At leading order this is `frequencyRate`. */
export function sweepRate(f: number, M: number, eta: number, order: PnOrder): number {
  const x = xOfFrequency(f, M);
  return 1.5 * (f / x) * xRate(x, M, eta, order);
}

/**
 * The join frequency: where the inspiral's sweep ḟ(f) has risen to (f_ring − f)/τ, the rate at which the ringdown's
 * approach would begin, found by bisection. The post-Newtonian series means nothing past the light ring (x = 1/3),
 * so the join is never later than that.
 */
export function joinFrequency(M: number, eta: number, fRing: number, tau: number, order: PnOrder): number {
  let lo = 0;
  let hi = Math.min(fRing, frequencyOfX(1 / 3, M));
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const rate = sweepRate(mid, M, eta, order);
    if (rate > 0 && rate < (fRing - mid) / tau) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface ChirpParams {
  /** The masses at the source, kg. */
  m1: number;
  m2: number;
  /** Distance, m. */
  distance: number;
  /** Redshift: the waves arrive stretched by 1 + z, so every mass looks 1 + z times heavier. Default 0. */
  redshift?: number;
  /** Where the waveform starts, Hz (raised if the inspiral would last longer than `maxDuration`). */
  fLow: number;
  /** The longest inspiral to follow, s (by the leading-order clock). Default: no limit. */
  maxDuration?: number;
  /** Samples a second. */
  sampleRate: number;
  /** How long to follow the ringdown, in decay times. Default 12. */
  ringTimes?: number;
  /** The inspiral's post-Newtonian order. Default 3.5. */
  order?: PnOrder;
}

export interface Chirp {
  /** The time of each sample is t0 + i/sampleRate, s, with 0 at the amplitude's peak. */
  t0: number;
  sampleRate: number;
  /** The strain. */
  h: Float64Array;
  /** The waves' frequency at each sample, Hz. */
  f: Float64Array;
  /** The strain's amplitude at each sample. */
  amp: Float64Array;
  /** The chirp mass and total mass as the detector sees them (times 1 + z), kg. */
  mcSeen: number;
  mSeen: number;
  /** Where the waveform starts, Hz. */
  fLow: number;
  /** Where the inspiral is joined to the ringdown, s (negative: before the peak) and Hz. */
  tJoin: number;
  fJoin: number;
  /** The ringdown's frequency (Hz) and decay time (s), as seen. */
  fRing: number;
  tau: number;
  /** The black hole left, at the source: its mass (kg) and spin. */
  finalMass: number;
  finalSpin: number;
  /** The peak strain. */
  peak: number;
}

/**
 * A whole chirp, sampled: the inspiral from fLow, stepped in time (x and the phase together, by classical Runge–Kutta
 * at the sample rate), the join, and the ringdown. The strain is h = (4/D)(Gμ/c²) x cos Φ, μ = m₁m₂/M, for a pair
 * seen face-on from overhead (at leading order the same as (4/D)(G𝓜/c²)^(5/3)(πf/c)^(2/3)).
 */
export function chirp(p: ChirpParams): Chirp {
  const order = p.order ?? 3.5;
  const z = p.redshift ?? 0;
  const eta = symmetricMassRatio(p.m1, p.m2);
  const Msrc = p.m1 + p.m2;
  const finalMass = Msrc * (1 - radiatedFraction(eta));
  const spin = finalSpin(eta);
  const mcSeen = chirpMass(p.m1, p.m2) * (1 + z);
  const M = Msrc * (1 + z);
  const mu = eta * M;
  const ring = ringdown(finalMass * (1 + z), spin);
  const fJoin = joinFrequency(M, eta, ring.f, ring.tau, order);
  let fLow = Math.min(p.fLow, fJoin * 0.9);
  if (p.maxDuration !== undefined) fLow = Math.max(fLow, Math.min(frequencyBefore(mcSeen, p.maxDuration), fJoin * 0.9));
  const dt = 1 / p.sampleRate;
  const ampOf = (x: number) => (4 / p.distance) * ((G * mu) / C ** 2) * x;
  // The waves' angular frequency, twice the orbit's
  const omegaOf = (x: number) => (2 * x ** 1.5 * C ** 3) / (G * M);
  // One classical Runge–Kutta step of x and the phase together
  const step = (x0: number, p0: number, hh: number): [number, number] => {
    const k1x = xRate(x0, M, eta, order);
    const k2x = xRate(x0 + (hh / 2) * k1x, M, eta, order);
    const k3x = xRate(x0 + (hh / 2) * k2x, M, eta, order);
    const k4x = xRate(x0 + hh * k3x, M, eta, order);
    const k1p = omegaOf(x0);
    const k2p = omegaOf(x0 + (hh / 2) * k1x);
    const k3p = omegaOf(x0 + (hh / 2) * k2x);
    const k4p = omegaOf(x0 + hh * k3x);
    return [x0 + (hh / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), p0 + (hh / 6) * (k1p + 2 * k2p + 2 * k3p + k4p)];
  };
  // A sample's step, split into substeps where x changes by more than 2% in it
  const advance = (x0: number, p0: number, hh: number): [number, number] => {
    const rate = xRate(x0, M, eta, order);
    const parts = Math.min(64, Math.max(1, Math.ceil((rate * hh) / (0.02 * x0))));
    let xx = x0;
    let pp = p0;
    for (let k = 0; k < parts; k++) [xx, pp] = step(xx, pp, hh / parts);
    return [xx, pp];
  };
  // The inspiral, stepped in time sample by sample until the next step would pass the join
  const xs: number[] = [];
  const phis: number[] = [];
  let x = xOfFrequency(fLow, M);
  let phi = 0;
  const xJoin = xOfFrequency(fJoin, M);
  for (;;) {
    xs.push(x);
    phis.push(phi);
    if (!(xRate(x, M, eta, order) > 0)) break;
    const [nx, np] = advance(x, phi, dt);
    if (!(nx < xJoin)) break;
    x = nx;
    phi = np;
  }
  // The join lands between the last inspiral sample and the next: a fraction `frac` of a sample later, by bisection
  const nIn = xs.length;
  const xLast = xs[nIn - 1];
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (advance(xLast, 0, mid * dt)[0] < xJoin) lo = mid;
    else hi = mid;
  }
  const frac = (lo + hi) / 2;
  const [xJ, dphi] = advance(xLast, 0, frac * dt);
  const phiJ = phis[nIn - 1] + dphi;
  const fJ = frequencyOfX(xJ, M);
  const ampJ = ampOf(xJ);
  // After the join the amplitude is A_j e^(−s/τ)(1 + κs), κ set so its slope matches the inspiral's (A ∝ x, so Ȧ/A = ẋ/x)
  const kappa = xRate(xJ, M, eta, order) / xJ + 1 / ring.tau;
  // The frequency closes on f_ring as e^(−s/τ_f), τ_f set so its slope at the join is the inspiral's
  const tauF = (ring.f - fJ) / sweepRate(fJ, M, eta, order);
  const sPeak = Math.max(0, ring.tau - 1 / kappa);
  const nRing = Math.ceil(((p.ringTimes ?? 12) * ring.tau) / dt);
  const n = nIn + nRing;
  const h = new Float64Array(n);
  const f = new Float64Array(n);
  const amp = new Float64Array(n);
  for (let i = 0; i < nIn; i++) {
    f[i] = frequencyOfX(xs[i], M);
    amp[i] = ampOf(xs[i]);
    h[i] = amp[i] * Math.cos(phis[i]);
  }
  for (let j = 1; j <= nRing; j++) {
    // s: time since the join
    const s = (j - frac) * dt;
    const i = nIn - 1 + j;
    const decay = Math.exp(-s / ring.tau);
    const closing = Math.exp(-s / tauF);
    f[i] = ring.f - (ring.f - fJ) * closing;
    amp[i] = ampJ * decay * (1 + kappa * s);
    // ∫ 2π f ds from the join, exactly
    h[i] = amp[i] * Math.cos(phiJ + 2 * Math.PI * (ring.f * s - (ring.f - fJ) * tauF * (1 - closing)));
  }
  let peak = 0;
  for (let i = 0; i < n; i++) if (amp[i] > peak) peak = amp[i];
  return {
    t0: -((nIn - 1 + frac) * dt + sPeak),
    sampleRate: p.sampleRate,
    h,
    f,
    amp,
    mcSeen,
    mSeen: M,
    fLow,
    tJoin: -sPeak,
    fJoin: fJ,
    fRing: ring.f,
    tau: ring.tau,
    finalMass,
    finalSpin: spin,
    peak,
  };
}
