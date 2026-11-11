/**
 * Two stars merged into one, ported from mix.f of Hurley's BSE (Hurley, Tout &
 * Pols 2002, MNRAS 329, 897, §2.7.1): the type from the collision matrix, the
 * new star's mass and, for a main-sequence product, an age from complete
 * mixing. Masses in M☉, ages in Myr.
 */
import { landmarks, star } from '../sse/star';
import type { ZConstants } from '../sse/zfuncs';
import { KTYPE } from './collisions';
import { gntage } from './gntage';

const MCH = 1.44;

/** Both stars, 1-based like the Fortran's arrays (index 0 unused); changed in place, with the product in star 1. */
export interface Pair {
  m0: number[];
  m: number[];
  aj: number[];
  ks: number[];
}

/** Merges the two stars of `p` (mix.f); mxns is the largest neutron star's mass (M☉). */
export function mix(p: Pair, c: ZConstants, mxns: number): void {
  const lm = landmarks();
  // Star i1 is the more evolved
  let i1: number;
  let i2: number;
  if (p.ks[1] >= p.ks[2]) {
    i1 = 1;
    i2 = 2;
  } else {
    i1 = 2;
    i2 = 1;
  }
  const k1 = p.ks[i1];
  const k2 = p.ks[i2];
  let icase = KTYPE[k1][k2];

  const m01 = p.m0[i1];
  const m1 = p.m[i1];
  let age1 = p.aj[i1];
  star(k1, m01, m1, lm, c);
  const tms1 = lm.tm;

  const m02 = p.m0[i2];
  const m2 = p.m[i2];
  let age2 = p.aj[i2];
  star(k2, m02, m2, lm, c);
  const tms2 = lm.tm;

  // Planets: helium and other low-mass white dwarfs (the Fortran compares with single-precision 0.05)
  const small = Math.fround(0.05);
  if (k1 === 10 && m1 < small) {
    icase = k2;
    if (k2 <= 1) {
      icase = 1;
      age1 = 0;
    }
  } else if (k1 >= 11 && m1 < 0.5 && icase === 6) {
    icase = 9;
  }
  if (k2 === 10 && m2 < small) {
    icase = k1;
    if (k1 <= 1) {
      icase = 1;
      age2 = 0;
    }
  }

  let m3 = m1 + m2;
  let m03 = m01 + m02;
  let kw = icase;
  let age3 = 0;

  // Merged stars are kept under 100 M☉
  if (m3 >= 100) {
    m3 = 99;
    m03 = Math.min(m03, m3);
  }

  if (icase === 1) {
    // A new age from complete mixing
    if (k1 === 7) kw = 7;
    star(kw, m03, m3, lm, c);
    const tms3 = lm.tm;
    age3 = (0.1 * tms3 * ((age1 * m1) / tms1 + (age2 * m2) / tms2)) / m3;
  } else if (icase === 3 || icase === 6 || icase === 9) {
    const g = { mc: m1, kw, m0: m03, aj: age3 };
    gntage(g, m3, c);
    ({ kw, m0: m03, aj: age3 } = g);
  } else if (icase === 4) {
    const g = { mc: m1, kw, m0: m03, aj: age1 / tms1 };
    gntage(g, m3, c);
    ({ kw, m0: m03, aj: age3 } = g);
  } else if (icase === 7) {
    star(kw, m03, m3, lm, c);
    const tms3 = lm.tm;
    age3 = (tms3 * ((age2 * m2) / tms2)) / m3;
  } else if (icase <= 12) {
    // A new white dwarf's initial mass is its mass
    m03 = m3;
    if (icase < 12 && m3 >= MCH) {
      m3 = 0;
      kw = 15;
    }
  } else if (icase === 13 || icase === 14) {
    // An unstable Thorne–Żytkow object loses its envelope fast, unless the less evolved star is a WD, NS or BH
    if (k2 < 10) {
      m03 = m1;
      m3 = m1;
    }
    if (icase === 13 && m3 > mxns) kw = 14;
  } else if (icase === 15) {
    m3 = 0;
  } else if (icase > 100) {
    // A common-envelope case, which should only come after comenv
    kw = k1;
    age3 = age1;
    m3 = m1;
    m03 = m01;
  } else {
    // Shouldn't be reached
    kw = 1;
    m03 = m3;
  }

  p.ks[1] = kw;
  p.ks[2] = 15;
  p.m[1] = m3;
  p.m[2] = 0;
  p.m0[1] = m03;
  p.aj[1] = age3;
}
