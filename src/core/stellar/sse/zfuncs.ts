/**
 * SSE's fitting formulae, ported from zfuncs.f of Hurley's code (Hurley, Pols &
 * Tout 2000, MNRAS 315, 543). Names, branches and coefficient numbers follow the
 * Fortran, so each function can be read against it line by line; `a` is the
 * metallicity's MSCFF block (`msp`) or GBCFF block (`gbp`), 1-based.
 *
 * Units are SSE's: masses in M☉, luminosities in L☉, radii in R☉, times in Myr.
 * The derivatives and inverses SSE uses only for binaries are left out.
 */

/** A metallicity's constants, as zcnsts sets them (see zcnsts.ts). Arrays are 1-based. */
export interface ZConstants {
  z: number;
  /** zpars(1–14): the mass boundaries and constants listed in zcnsts. */
  zpars: Float64Array;
  /** The main-sequence coefficients (COMMON /MSCFF/). */
  msp: Float64Array;
  /** The giant-branch coefficients (COMMON /GBCFF/). */
  gbp: Float64Array;
}

/** GB parameters and landmark arrays, as star() fills them (1-based). */
export type GBParams = Float64Array;

/** Zero-age main-sequence luminosity (Tout et al. 1996), L☉. */
export function lzamsf(m: number, c: ZConstants): number {
  const a = c.msp;
  const mx = Math.sqrt(m);
  return (a[1] * m ** 5 * mx + a[2] * m ** 11) / (a[3] + m ** 3 + a[4] * m ** 5 + a[5] * m ** 7 + a[6] * m ** 8 + a[7] * m ** 9 * mx);
}

/** Zero-age main-sequence radius (Tout et al. 1996), R☉. */
export function rzamsf(m: number, c: ZConstants): number {
  const a = c.msp;
  const mx = Math.sqrt(m);
  return (
    ((a[8] * m ** 2 + a[9] * m ** 6) * mx + a[10] * m ** 11 + (a[11] + a[12] * mx) * m ** 19) /
    (a[13] + a[14] * m ** 2 + (a[15] * m ** 8 + m ** 18 + a[16] * m ** 19) * mx)
  );
}

/** Time to the base of the giant branch, or to helium ignition if there's no giant branch, Myr. */
export function tbgbf(m: number, c: ZConstants): number {
  const a = c.msp;
  return (a[17] + a[18] * m ** 4 + a[19] * m ** (11 / 2) + m ** 7) / (a[20] * m ** 2 + a[21] * m ** 7);
}

/** Time to the end of the main-sequence hook, as a fraction of tbgb (valid above Mhook). */
export function thookf(m: number, c: ZConstants): number {
  const a = c.msp;
  const t = 1 - 0.01 * Math.max(a[22] / m ** a[23], a[24] + a[25] / m ** a[26]);
  return Math.max(t, 0.5);
}

/** Luminosity at the end of the main sequence, L☉. */
export function ltmsf(m: number, c: ZConstants): number {
  const a = c.msp;
  return (a[27] * m ** 3 + a[28] * m ** 4 + a[29] * m ** (a[32] + 1.8)) / (a[30] + a[31] * m ** 5 + m ** a[32]);
}

/** The main-sequence luminosity's α coefficient. */
export function lalphf(m: number, c: ZConstants): number {
  const a = c.msp;
  const mcut = 2;
  if (m >= mcut) return (a[33] + a[34] * m ** a[36]) / (m ** 0.4 + a[35] * m ** 1.9);
  if (m <= 0.5) return a[39];
  if (m <= 0.7) return a[39] + ((0.3 - a[39]) / 0.2) * (m - 0.5);
  if (m <= a[37]) return 0.3 + ((a[40] - 0.3) / (a[37] - 0.7)) * (m - 0.7);
  if (m <= a[38]) return a[40] + ((a[41] - a[40]) / (a[38] - a[37])) * (m - a[37]);
  return a[41] + ((a[42] - a[41]) / (mcut - a[38])) * (m - a[38]);
}

/** The main-sequence luminosity's β coefficient. */
export function lbetaf(m: number, c: ZConstants): number {
  const a = c.msp;
  let b = Math.max(a[43] - a[44] * m ** a[45], 0);
  if (m > a[46] && b > 0) {
    const a1 = a[43] - a[44] * a[46] ** a[45];
    b = Math.max(a1 - 10 * a1 * (m - a[46]), 0);
  }
  return b;
}

/** The main-sequence luminosity's η exponent. */
export function lnetaf(m: number, c: ZConstants): number {
  const n = m <= 1 ? 10 : m >= 1.1 ? 20 : 10 + 100 * (m - 1);
  return Math.min(n, c.msp[97]);
}

/** Size of the luminosity hook (zero below Mhook). */
export function lhookf(m: number, mhook: number, c: ZConstants): number {
  const a = c.msp;
  if (m <= mhook) return 0;
  if (m >= a[51]) return Math.min(a[47] / m ** a[48], a[49] / m ** a[50]);
  const a2 = Math.min(a[47] / a[51] ** a[48], a[49] / a[51] ** a[50]);
  return a2 * ((m - mhook) / (a[51] - mhook)) ** 0.4;
}

/** Radius at the end of the main sequence, R☉ (kept above Rzams when extrapolated to low masses). */
export function rtmsf(m: number, c: ZConstants): number {
  const a = c.msp;
  const m2 = a[62] + 0.1;
  if (m <= a[62]) {
    const rchk = 1.5 * rzamsf(m, c);
    return Math.max(rchk, (a[52] + a[53] * m ** a[55]) / (a[54] + m ** a[56]));
  }
  if (m >= m2) return (a[57] * m ** 3 + a[58] * m ** a[61] + a[59] * m ** (a[61] + 1.5)) / (a[60] + m ** 5);
  return a[63] + ((a[64] - a[63]) / 0.1) * (m - a[62]);
}

/** The main-sequence radius's α coefficient. */
export function ralphf(m: number, c: ZConstants): number {
  const a = c.msp;
  if (m <= 0.5) return a[73];
  if (m <= 0.65) return a[73] + ((a[74] - a[73]) / 0.15) * (m - 0.5);
  if (m <= a[70]) return a[74] + ((a[75] - a[74]) / (a[70] - 0.65)) * (m - 0.65);
  if (m <= a[71]) return a[75] + ((a[76] - a[75]) / (a[71] - a[70])) * (m - a[70]);
  if (m <= a[72]) return (a[65] * m ** a[67]) / (a[66] + m ** a[68]);
  const a5 = (a[65] * a[72] ** a[67]) / (a[66] + a[72] ** a[68]);
  return a5 + a[69] * (m - a[72]);
}

/** The main-sequence radius's β coefficient. */
export function rbetaf(m: number, c: ZConstants): number {
  const a = c.msp;
  const m2 = 2;
  const m3 = 16;
  let b: number;
  if (m <= 1) b = 1.06;
  else if (m <= a[82]) b = 1.06 + ((a[81] - 1.06) / (a[82] - 1)) * (m - 1);
  else if (m <= m2) {
    const b2 = (a[77] * m2 ** (7 / 2)) / (a[78] + m2 ** a[79]);
    b = a[81] + ((b2 - a[81]) / (m2 - a[82])) * (m - a[82]);
  } else if (m <= m3) b = (a[77] * m ** (7 / 2)) / (a[78] + m ** a[79]);
  else {
    const b3 = (a[77] * m3 ** (7 / 2)) / (a[78] + m3 ** a[79]);
    b = b3 + a[80] * (m - m3);
  }
  return b - 1;
}

/** The main-sequence radius's γ coefficient. */
export function rgammf(m: number, c: ZConstants): number {
  const a = c.msp;
  const m1 = 1;
  if (m > a[88] + 0.1) return 0;
  let b1 = Math.max(0, a[83] + a[84] * (m1 - a[85]) ** a[86]);
  let g: number;
  if (m <= m1) g = a[83] + a[84] * Math.abs(m - a[85]) ** a[86];
  else if (m <= a[88]) g = b1 + (a[89] - b1) * ((m - m1) / (a[88] - m1)) ** a[87];
  else {
    if (a[88] > m1) b1 = a[89];
    g = b1 - 10 * b1 * (m - a[88]);
  }
  return Math.max(g, 0);
}

/** Size of the radius hook (zero below Mhook). */
export function rhookf(m: number, mhook: number, c: ZConstants): number {
  const a = c.msp;
  if (m <= mhook) return 0;
  if (m <= a[94]) return a[95] * Math.sqrt((m - mhook) / (a[94] - mhook));
  if (m <= 2) {
    const m2 = 2;
    const b2 = (a[90] + a[91] * m2 ** (7 / 2)) / (a[92] * m2 ** 3 + m2 ** a[93]) - 1;
    return a[95] + (b2 - a[95]) * ((m - a[94]) / (m2 - a[94])) ** a[96];
  }
  return (a[90] + a[91] * m ** (7 / 2)) / (a[92] * m ** 3 + m ** a[93]) - 1;
}

/** Luminosity at the base of the giant branch, L☉ (low and intermediate masses). */
export function lbgbf(m: number, c: ZConstants): number {
  const a = c.gbp;
  return (a[1] * m ** a[5] + a[2] * m ** a[8]) / (a[3] + a[4] * m ** a[7] + m ** a[6]);
}

/** Luminosity at the base of the AGB, L☉. */
export function lbagbf(m: number, mhefl: number, c: ZConstants): number {
  const a = c.gbp;
  const a4 = (a[9] * mhefl ** a[10] - a[16]) / (Math.exp(mhefl * a[11]) * a[16]);
  if (m < mhefl) return (a[9] * m ** a[10]) / (1 + a4 * Math.exp(m * a[11]));
  return (a[12] + a[13] * m ** (a[15] + 1.8)) / (a[14] + m ** a[15]);
}

/** Radius on the giant branch, R☉. */
export function rgbf(m: number, lum: number, c: ZConstants): number {
  const a = c.gbp;
  const a1 = Math.min(a[20] / m ** a[21], a[22] / m ** a[23]);
  return a1 * (lum ** a[18] + a[17] * lum ** a[19]);
}

/** Radius on the AGB, R☉. */
export function ragbf(m: number, lum: number, mhelf: number, c: ZConstants): number {
  const a = c.gbp;
  const m1 = mhelf - 0.2;
  const xx = m >= mhelf ? a[24] : m >= m1 ? 1 + 5 * (a[24] - 1) * (m - m1) : 1;
  const a4 = xx * a[19];
  let a1: number;
  if (m <= m1) a1 = a[29] + a[30] * m;
  else if (m >= mhelf) a1 = Math.min(a[25] / m ** a[26], a[27] / m ** a[28]);
  else a1 = a[31] + 5 * (a[32] - a[31]) * (m - m1);
  return a1 * (lum ** a[18] + a[17] * lum ** a4);
}

/** Core mass at the end of the main sequence, as a fraction of the BGB core mass. */
export function mctmsf(m: number): number {
  const m525 = m ** (21 / 4);
  return (1.586 + m525) / (2.434 + 1.02 * m525);
}

/** Core mass at the BGB or at helium ignition (by mchefl), M☉, for intermediate and high masses. */
export function mcheif(m: number, mhefl: number, mchefl: number, c: ZConstants): number {
  const a = c.gbp;
  const mcbagb = mcagbf(m, c);
  const a3 = mchefl ** 4 - a[33] * mhefl ** a[34];
  return Math.min(0.95 * mcbagb, (a3 + a[33] * m ** a[34]) ** (1 / 4));
}

/** Core mass at the base of the AGB, M☉. */
export function mcagbf(m: number, c: ZConstants): number {
  const a = c.gbp;
  return (a[37] + a[35] * m ** a[36]) ** (1 / 4);
}

/** Core mass at time t on the GB, AGB or naked-helium giant branch, M☉. */
export function mcgbtf(t: number, A: number, GB: GBParams, tinf1: number, tinf2: number, tx: number): number {
  if (t <= tx) return ((GB[5] - 1) * A * GB[4] * (tinf1 - t)) ** (1 / (1 - GB[5]));
  return ((GB[6] - 1) * A * GB[3] * (tinf2 - t)) ** (1 / (1 - GB[6]));
}

/** Luminosity at time t on the GB, AGB or naked-helium giant branch, L☉. */
export function lgbtf(t: number, A: number, GB: GBParams, tinf1: number, tinf2: number, tx: number): number {
  if (t <= tx) return GB[4] * ((GB[5] - 1) * A * GB[4] * (tinf1 - t)) ** (GB[5] / (1 - GB[5]));
  return GB[3] * ((GB[6] - 1) * A * GB[3] * (tinf2 - t)) ** (GB[6] / (1 - GB[6]));
}

/** Core mass from luminosity on the GB, AGB or naked-helium giant branch, M☉. */
export function mcgbf(lum: number, GB: GBParams, lx: number): number {
  if (lum <= lx) return (lum / GB[4]) ** (1 / GB[5]);
  return (lum / GB[3]) ** (1 / GB[6]);
}

/** Luminosity from core mass on the GB, AGB or naked-helium giant branch, L☉. */
export function lmcgbf(mc: number, GB: GBParams): number {
  if (mc <= GB[7]) return GB[4] * mc ** GB[5];
  return GB[3] * mc ** GB[6];
}

/** Luminosity at helium ignition, L☉. */
export function lheif(m: number, mhefl: number, c: ZConstants): number {
  const a = c.gbp;
  if (m < mhefl) return (a[38] * m ** a[39]) / (1 + a[41] * Math.exp(m * a[40]));
  return (a[42] + a[43] * m ** 3.8) / (a[44] + m ** 2);
}

/** The ratio of the least luminosity during core helium burning to that at ignition (intermediate masses). */
export function lhef(m: number, c: ZConstants): number {
  const a = c.gbp;
  return (a[45] + a[46] * m ** (a[48] + 0.1)) / (a[47] + m ** a[48]);
}

/** The least radius during core helium burning, R☉ (intermediate and high masses). */
export function rminf(m: number, c: ZConstants): number {
  const a = c.gbp;
  const mx = m ** a[53];
  return (a[49] * m + (a[50] * m) ** a[52] * mx) / (a[51] + mx);
}

/** Core helium-burning lifetime, Myr (relative to tbgb for intermediate and high masses). */
export function thef(m: number, mc: number, mhefl: number, c: ZConstants): number {
  const a = c.gbp;
  if (m <= mhefl) {
    const mm = Math.max((mhefl - m) / (mhefl - mc), 1e-12);
    return (a[54] + (themsf(mc) - a[54]) * mm ** a[55]) * (1 + a[57] * Math.exp(m * a[56]));
  }
  const mm = m ** 5;
  return (a[58] * m ** a[61] + a[59] * mm) / (a[60] + mm);
}

/** The blue loop's share of the helium-burning lifetime (intermediate and high masses). */
export function tblf(m: number, mhefl: number, mfgb: number, c: ZConstants): number {
  const a = c.gbp;
  const mr = mhefl / mfgb;
  let t: number;
  if (m <= mfgb) {
    const m1 = m / mfgb;
    const m2 = Math.max(Math.log10(m1) / Math.log10(mr), 1e-12);
    t = a[64] * m1 ** a[63] + a[65] * m2 ** a[62];
  } else {
    const r1 = Math.max(1 - rminf(m, c) / ragbf(m, lheif(m, mhefl, c), mhefl, c), 1e-12);
    t = a[66] * m ** a[67] * r1 ** a[68];
  }
  t = Math.min(1, Math.max(0, t));
  return t < 1e-10 ? 0 : t;
}

/** Zero-age horizontal-branch luminosity, L☉ (low masses). */
export function lzahbf(m: number, mc: number, mhefl: number, c: ZConstants): number {
  const a = c.gbp;
  const a5 = lzhef(mc);
  const a4 = (a[69] + a5 - a[74]) / ((a[74] - a5) * Math.exp(a[71] * mhefl));
  const mm = Math.max((m - mc) / (mhefl - mc), 1e-12);
  return a5 + ((1 + a[72]) * a[69] * mm ** a[70]) / ((1 + a[72] * mm ** a[73]) * (1 + a4 * Math.exp(m * a[71])));
}

/** Zero-age horizontal-branch radius, R☉ (low masses). */
export function rzahbf(m: number, mc: number, mhefl: number, c: ZConstants): number {
  const a = c.gbp;
  const rx = rzhef(mc);
  const ry = rgbf(m, lzahbf(m, mc, mhefl, c), c);
  const mm = Math.max((m - mc) / (mhefl - mc), 1e-12);
  const f = ((1 + a[76]) * mm ** a[75]) / (1 + a[76] * mm ** a[77]);
  return (1 - f) * rx + f * ry;
}

/** Zero-age luminosity of a naked helium star, L☉. */
export function lzhef(m: number): number {
  const m15 = m * Math.sqrt(m);
  return (1.5262e4 * m ** (41 / 4)) / (0.0469 + m ** 6 * (31.18 + m15 * (29.54 + m15)));
}

/** Zero-age radius of a naked helium star, R☉. */
export function rzhef(m: number): number {
  return (0.2391 * m ** 4.6) / (0.0065 + (0.162 + m) * m ** 3);
}

/** Main-sequence lifetime of a naked helium star, Myr. */
export function themsf(m: number): number {
  return (0.4129 + 18.81 * m ** 4 + 1.853 * m ** 6) / m ** (13 / 2);
}

/** Radius of a naked helium star in its Hertzsprung gap, R☉. */
export function rhehgf(m: number, lum: number, rx: number, lx: number): number {
  const cm = (2e-3 * m ** (5 / 2)) / (2 + m ** 5);
  return rx * (lum / lx) ** 0.2 + 0.02 * (Math.exp(cm * lum) - Math.exp(cm * lx));
}

/** Radius of a naked helium giant, R☉. */
export function rhegbf(lum: number): number {
  return 0.08 * lum ** (3 / 4);
}

/** The exponent that perturbs luminosity when the envelope is small. */
export function lpertf(m: number, mew: number): number {
  const b = 0.002 * Math.max(1, 2.5 / m);
  const c = 3;
  return ((1 + b ** c) * (mew / b) ** c) / (1 + (mew / b) ** c);
}

/** The exponent that perturbs radius when the envelope is small. */
export function rpertf(m: number, mew: number, r: number, rc: number): number {
  if (mew <= 0) return 0;
  const a = 0.1;
  const b = 0.006 * Math.max(1, 2.5 / m);
  const c = 3;
  const q = Math.log(r / rc);
  const facmax = -14 / Math.log10(mew);
  const fac = Math.min(a / q, facmax);
  return ((1 + b ** c) * (mew / b) ** c * mew ** fac) / (1 + (mew / b) ** c);
}
