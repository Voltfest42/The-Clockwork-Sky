/**
 * Common-envelope evolution, ported from comenv.f of Hurley's BSE (Tout 1996,
 * redone by Hurley 1998; Hurley, Tout & Pols 2002, MNRAS 329, 897, §2.7). The
 * orbit pays for unbinding the giant's envelope with efficiency α:
 *
 *   E_bind = G M (M − Mc) / (λ R),   α (E_orb,f − E_orb,i) = E_bind,
 *
 * and if the cores would then fill their Roche lobes they merge instead. Energies
 * are divided by −G, as in the Fortran. Masses in M☉, radii and separations in
 * R☉, ages in Myr, angular momenta in M☉ R☉² per year.
 */
import { hrdiag, type HrState, type SseSwitches } from '../sse/hrdiag';
import { star, type Landmarks } from '../sse/star';
import { celamf, rzamsf, type ZConstants } from '../sse/zfuncs';
import { rocheLobe } from '../../binaries/roche';
import { dgcore, KTYPE } from './collisions';
import { gntage } from './gntage';
import { kick, type KickSwitches } from './kick';
import type { Ran3 } from './ran3';

export interface CommonEnvelopeSwitches extends SseSwitches, KickSwitches {
  /** α, the efficiency with which orbital energy unbinds the envelope. */
  alpha1: number;
  /** λ: ≥ 0 uses Pols's fits (adding that fraction of the recombination energy); < 0 sets λ = −lambda. */
  lambda: number;
  /** 3: de Kool's form of the orbital energy. */
  ceflag: number;
}

/** One star's state, which comenv changes in place. */
export interface CeStar {
  m0: number;
  m: number;
  mc: number;
  aj: number;
  jspin: number;
  kw: number;
}

/** The orbit, which comenv changes in place. */
export interface CeOrbit {
  ecc: number;
  sep: number;
  jorb: number;
  /** True if the cores merged. */
  coel: boolean;
}

const AURSUN = 214.95;
const K3 = 0.21;

/**
 * A common envelope round the giant `s1` (type 2–6, 8 or 9) and its companion `s2`. Both stars and the orbit are
 * changed in place: the envelope is ejected and the orbit shrinks, or the stars merge into star 1 (star 2 left
 * as type 15).
 */
export function comenv(s1: CeStar, s2: CeStar, orbit: CeOrbit, c: ZConstants, sw: CommonEnvelopeSwitches, ran: Ran3): void {
  const zpars = c.zpars;
  let { m0: m01, m: m1, mc: mc1, aj: aj1, jspin: jspin1, kw: kw1 } = s1;
  let { m0: m02, m: m2, mc: mc2, aj: aj2, jspin: jspin2, kw: kw2 } = s2;
  let { ecc, sep, jorb } = orbit;
  const twopi = 2 * Math.acos(-1);
  let coel = false;

  // The Fortran's TSCLS1 and TSCLS2 are separate, but LUMS, GB and TN are shared between the two stars
  const lums = new Float64Array(11);
  const GB = new Float64Array(11);
  const lm1: Landmarks = { tm: 0, tn: 0, tscls: new Float64Array(21), lums, GB };
  const lm2: Landmarks = { tm: 0, tn: 0, tscls: new Float64Array(21), lums, GB };
  const shareTn = (from: Landmarks) => {
    lm1.tn = from.tn;
    lm2.tn = from.tn;
  };
  const starIn = (lm: Landmarks, kw: number, m0: number, mt: number) => {
    star(kw, m0, mt, lm, c);
    shareTn(lm);
  };
  const diagIn = (lm: Landmarks, mass: number, aj: number, mt: number, kw: number, mc: number): HrState => {
    const s: HrState = { mass, aj, mt, kw, mc, r: 0, lum: 0, rc: 0, menv: 0, renv: 0, k2: 0 };
    hrdiag(s, lm, c, sw);
    shareTn(lm);
    return s;
  };

  // The core masses and radii
  let kw = kw1;
  starIn(lm1, kw1, m01, m1);
  let h = diagIn(lm1, m01, aj1, m1, kw1, mc1);
  ({ mass: m01, aj: aj1, mt: m1, kw: kw1, mc: mc1 } = h);
  let r1 = h.r;
  let l1 = h.lum;
  let rc1 = h.rc;
  let k21 = h.k2;
  let menv = h.menv;
  const ospin1 = jspin1 / (k21 * r1 * r1 * (m1 - mc1) + K3 * rc1 * rc1 * mc1);
  let menvd = menv / (m1 - mc1);
  let rzams = rzamsf(m01, c);
  const lamb1 = celamf(kw, m01, l1, r1, rzams, menvd, sw.lambda);
  kw = kw2;
  starIn(lm2, kw2, m02, m2);
  h = diagIn(lm2, m02, aj2, m2, kw2, mc2);
  ({ mass: m02, aj: aj2, mt: m2, kw: kw2, mc: mc2 } = h);
  let r2 = h.r;
  let l2 = h.lum;
  let rc2 = h.rc;
  let k22 = h.k2;
  menv = h.menv;
  const ospin2 = jspin2 / (k22 * r2 * r2 * (m2 - mc2) + K3 * rc2 * rc2 * mc2);

  // The giant envelope's binding energy (times λ)
  const ebindi0 = (m1 * (m1 - mc1)) / (lamb1 * r1);
  let ebindi = ebindi0;
  // A giant-like companion's envelope adds its own
  let eorbi = (m1 * m2) / (2 * sep);
  if (kw2 >= 2 && kw2 <= 9 && kw2 !== 7) {
    menvd = menv / (m2 - mc2);
    rzams = rzamsf(m02, c);
    const lamb2 = celamf(kw, m02, l2, r2, rzams, menvd, sw.lambda);
    ebindi = ebindi + (m2 * (m2 - mc2)) / (lamb2 * r2);
    // The initial orbital energy
    if (sw.ceflag !== 3) eorbi = (mc1 * mc2) / (2 * sep);
  } else {
    if (sw.ceflag !== 3) eorbi = (mc1 * m2) / (2 * sep);
  }

  // Allow for an eccentric orbit
  const ecirc = eorbi / (1 - ecc * ecc);
  // The final orbital energy without coalescence
  let eorbf = eorbi + ebindi / sw.alpha1;
  let sepf: number;
  let sepl = 0;
  let ebindf = 0;
  let mc3 = 0;
  let mf: number;
  let done = false;

  if (kw2 <= 1 || kw2 === 7) {
    // A main-sequence companion: does it fill its Roche lobe?
    sepf = (mc1 * m2) / (2 * eorbf);
    const q1 = mc1 / m2;
    const q2 = 1 / q1;
    const rl1 = rocheLobe(q1);
    const rl2 = rocheLobe(q2);
    if (rc1 / rl1 >= r2 / rl2) {
      // A very massive type 4's helium core may fill its lobe in a wider orbit with a light companion
      if (rc1 > rl1 * sepf) {
        coel = true;
        sepl = rc1 / rl1;
      }
    } else if (r2 > rl2 * sepf) {
      coel = true;
      sepl = r2 / rl2;
    }
    if (coel) {
      kw = KTYPE[kw1][kw2] - 100;
      mc3 = mc1;
      if (kw2 === 7 && kw === 4) mc3 = mc3 + m2;
      // Coalescence: the final binding energy
      eorbf = Math.max((mc1 * m2) / (2 * sepl), eorbi);
      ebindf = ebindi - sw.alpha1 * (eorbf - eorbi);
    } else {
      // The giant becomes a black hole, neutron star, white dwarf or helium star
      mf = m1;
      m1 = mc1;
      starIn(lm1, kw1, m01, m1);
      h = diagIn(lm1, m01, aj1, m1, kw1, mc1);
      ({ mass: m01, aj: aj1, mt: m1, kw: kw1, mc: mc1 } = h);
      r1 = h.r;
      l1 = h.lum;
      rc1 = h.rc;
      k21 = h.k2;
      if (kw1 >= 13) {
        const o = { ecc, sep: sepf, jorb };
        kick(kw1, mf, m1, m2, o, sw, ran);
        ({ ecc, sep: sepf, jorb } = o);
        if (ecc > 1) done = true;
      }
    }
  } else {
    // A degenerate or giant companion: does the lighter core fill its Roche lobe?
    sepf = (mc1 * mc2) / (2 * eorbf);
    const q1 = mc1 / mc2;
    const q2 = 1 / q1;
    const rl1 = rocheLobe(q1);
    const rl2 = rocheLobe(q2);
    if (rc1 / rl1 >= rc2 / rl2) {
      if (rc1 > rl1 * sepf) {
        coel = true;
        sepl = rc1 / rl1;
      }
    } else if (rc2 > rl2 * sepf) {
      coel = true;
      sepl = rc2 / rl2;
    }

    if (coel) {
      sepf = 0;
      if (kw2 >= 13) {
        // A neutron star or black hole inside: an unstable Thorne–Żytkow object that leaves only the core
        mc1 = mc2;
        m1 = mc1;
        mc2 = 0;
        m2 = 0;
        kw1 = kw2;
        kw2 = 15;
        aj1 = 0;
        done = true;
      } else {
        kw = KTYPE[kw1][kw2] - 100;
        mc3 = mc1 + mc2;
        // The final envelope binding energy
        eorbf = Math.max((mc1 * mc2) / (2 * sepl), eorbi);
        ebindf = ebindi - sw.alpha1 * (eorbf - eorbi);
        // Two degenerate cores merging: does the merged core survive or change?
        if (kw1 === 6 && (kw2 === 6 || kw2 >= 11)) {
          ({ kw3: kw, m3: mc3, ebinde: ebindf } = dgcore(kw1, kw2, kw, mc1, mc2, mc3, ebindf));
        }
        if (kw1 <= 3 && m01 <= zpars[2]) {
          if ((kw2 >= 2 && kw2 <= 3 && m02 <= zpars[2]) || kw2 === 10) {
            ({ kw3: kw, m3: mc3, ebinde: ebindf } = dgcore(kw1, kw2, kw, mc1, mc2, mc3, ebindf));
            if (kw >= 10) {
              kw1 = kw;
              m1 = mc3;
              mc1 = mc3;
              if (kw < 15) m01 = mc3;
              aj1 = 0;
              mc2 = 0;
              m2 = 0;
              kw2 = 15;
              done = true;
            }
          }
        }
      }
    } else {
      // The cores don't merge: both lose their envelopes
      mf = m1;
      m1 = mc1;
      starIn(lm1, kw1, m01, m1);
      h = diagIn(lm1, m01, aj1, m1, kw1, mc1);
      ({ mass: m01, aj: aj1, mt: m1, kw: kw1, mc: mc1 } = h);
      r1 = h.r;
      l1 = h.lum;
      rc1 = h.rc;
      k21 = h.k2;
      if (kw1 >= 13) {
        const o = { ecc, sep: sepf, jorb };
        kick(kw1, mf, m1, m2, o, sw, ran);
        ({ ecc, sep: sepf, jorb } = o);
        if (ecc > 1) done = true;
      }
      if (!done) {
        mf = m2;
        kw = kw2;
        m2 = mc2;
        starIn(lm2, kw2, m02, m2);
        h = diagIn(lm2, m02, aj2, m2, kw2, mc2);
        ({ mass: m02, aj: aj2, mt: m2, kw: kw2, mc: mc2 } = h);
        r2 = h.r;
        l2 = h.lum;
        rc2 = h.rc;
        k22 = h.k2;
        if (kw2 >= 13 && kw < 13) {
          const o = { ecc, sep: sepf, jorb };
          kick(kw2, mf, m2, m1, o, sw, ran);
          ({ ecc, sep: sepf, jorb } = o);
          if (ecc > 1) done = true;
        }
      }
    }
  }

  if (!done) {
    let mc22 = mc2;
    let fage1 = 0;
    let fage2 = 0;
    if (coel && (kw === 4 || kw === 7)) {
      // A helium burner: its fractional age from how much helium has burnt
      if (kw1 <= 3) fage1 = 0;
      else if (kw1 >= 6) fage1 = 1;
      else fage1 = (aj1 - lm1.tscls[2]) / (lm1.tscls[13] - lm1.tscls[2]);
      if (kw2 <= 3 || kw2 === 10) {
        fage2 = 0;
      } else if (kw2 === 7) {
        fage2 = aj2 / lm2.tm;
        mc22 = m2;
      } else if (kw2 >= 6) {
        fage2 = 1;
      } else {
        fage2 = (aj2 - lm2.tscls[2]) / (lm2.tscls[13] - lm2.tscls[2]);
      }
    }

    if (coel) {
      // The final mass after coalescence, by Newton–Raphson
      const tb = (sepl / AURSUN) * Math.sqrt(sepl / (AURSUN * (mc1 + mc2)));
      const oorb = twopi / tb;
      const xx = 1 + zpars[7];
      if (ebindf <= 0) {
        mf = mc3;
      } else {
        const cnst = (m1 + m2) ** xx * (m1 - mc1 + m2 - mc22) * (ebindf / ebindi);
        // The initial guess
        mf = Math.max(mc1 + mc22, (m1 + m2) * (ebindf / ebindi) ** (1 / xx));
        for (;;) {
          const dely = mf ** xx * (mf - mc1 - mc22) - cnst;
          if (Math.abs(dely / mf) <= 1.0e-3) break;
          const deri = mf ** zpars[7] * ((1 + xx) * mf - xx * (mc1 + mc22));
          const delmf = dely / deri;
          mf = mf - delmf;
        }
      }
      // The masses and separation
      if (mc22 === 0) mf = Math.max(mf, mc1 + m2);
      m2 = 0;
      m1 = mf;
      kw2 = 15;
      // Combine the cores
      if (kw === 2) {
        starIn(lm2, kw, m1, m1);
        if (GB[9] >= mc1) {
          m01 = m1;
          aj1 = lm2.tm + ((lm2.tscls[1] - lm2.tm) * (aj1 - lm1.tm)) / (lm1.tscls[1] - lm1.tm);
          starIn(lm1, kw, m01, m1);
        }
      } else if (kw === 7) {
        m01 = m1;
        starIn(lm1, kw, m01, m1);
        aj1 = (lm1.tm * (fage1 * mc1 + fage2 * mc22)) / (mc1 + mc22);
      } else if (kw === 4 || mc2 > 0 || kw !== kw1) {
        if (kw === 4) aj1 = (fage1 * mc1 + fage2 * mc22) / (mc1 + mc22);
        mc1 = mc1 + mc2;
        mc2 = 0;
        // A new age for the giant
        const g = { mc: mc1, kw, m0: m01, aj: aj1 };
        gntage(g, m1, c);
        ({ mc: mc1, kw, m0: m01, aj: aj1 } = g);
        starIn(lm1, kw, m01, m1);
      }
      h = diagIn(lm1, m01, aj1, m1, kw, mc1);
      ({ mass: m01, aj: aj1, mt: m1, kw, mc: mc1 } = h);
      r1 = h.r;
      rc1 = h.rc;
      k21 = h.k2;
      jspin1 = oorb * (k21 * r1 * r1 * (m1 - mc1) + K3 * rc1 * rc1 * mc1);
      kw1 = kw;
      ecc = 0;
    } else {
      // Any eccentricity left: energy circularises the orbit before angular momentum is removed
      if (eorbf < ecirc) ecc = Math.sqrt(1 - eorbf / ecirc);
      else ecc = 0;
      const tb = (sepf / AURSUN) * Math.sqrt(sepf / (AURSUN * (m1 + m2)));
      const oorb = twopi / tb;
      jorb = ((m1 * m2) / (m1 + m2)) * Math.sqrt(1 - ecc * ecc) * sepf * sepf * oorb;
      // The cores keep the spins they had on entry; tides deal with synchronising them later
      jspin1 = ospin1 * (k21 * r1 * r1 * (m1 - mc1) + K3 * rc1 * rc1 * mc1);
      jspin2 = ospin2 * (k22 * r2 * r2 * (m2 - mc2) + K3 * rc2 * rc2 * mc2);
    }
  }
  sep = sepf;

  Object.assign(s1, { m0: m01, m: m1, mc: mc1, aj: aj1, jspin: jspin1, kw: kw1 });
  Object.assign(s2, { m0: m02, m: m2, mc: mc2, aj: aj2, jspin: jspin2, kw: kw2 });
  Object.assign(orbit, { ecc, sep, jorb, coel });
  void l1;
  void l2;
}
