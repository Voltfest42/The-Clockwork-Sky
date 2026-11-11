/**
 * The age of a giant made by a merger or by mass transfer, from its core mass and
 * type, ported from gntage.f of Hurley's BSE (Tout 1996, rewritten by Hurley
 * 1998). Masses in M☉, ages in Myr.
 */
import { landmarks, star } from '../sse/star';
import { lbgbdf, lbgbf, lmcgbf, mbagbf, mcagbf, mcgbf, mcheif, mheif, type ZConstants } from '../sse/zfuncs';

/** gntage's arguments that it may change. */
export interface GiantAge {
  /** Core mass, M☉. */
  mc: number;
  kw: number;
  /** Initial (effective) mass, M☉. */
  m0: number;
  /** Age, Myr; for kw = 4 on entry, the fraction of core helium burning done. */
  aj: number;
}

const JMAX = 30;
const MACC = 0.00001;
const LACC = 0.0001;
const TINY = 1.0e-14;

/**
 * Finds the initial mass and age that put a star of type kw (3, 4, 5, 6 or 9) and total mass mt at core mass g.mc,
 * changing g in place. The type may change: a giant with too big a core becomes a core-helium burner, and so on.
 */
export function gntage(g: GiantAge, mt: number, c: ZConstants): void {
  const zpars = c.zpars;
  const lm = landmarks();
  let { mc, kw, m0, aj } = g;
  let mcy: number;
  let mcx: number;
  let mmin: number;
  let mmax: number;
  let mmid: number;
  let dm: number;
  let f: number;
  let fmid: number;

  // A core-helium burner with too small a core is a giant
  if (kw === 4) {
    mcy = mcheif(zpars[2], zpars[2], zpars[10], c);
    if (mc <= mcy) kw = 3;
  }
  // A giant can't have a core bigger than Mfgb's
  if (kw === 3) {
    mcy = mcheif(zpars[3], zpars[2], zpars[9], c);
    if (mc >= mcy) {
      kw = 4;
      aj = 0;
    }
  }

  if (kw === 6) {
    // Start the star at the beginning of the thermally pulsing AGB: Mc = Mc,TP
    mcy = 0.44 * 2.25 + 0.448;
    if (mc > mcy) {
      // Such a core should already have collapsed as a type 5; set it up so that it will
      mcx = (mc + 0.35) / 0.773;
    } else if (mc >= 0.8) {
      mcx = (mc - 0.448) / 0.44;
    } else {
      mcx = mc;
    }
    m0 = mbagbf(mcx, c);
    if (m0 < TINY) {
      // A core smaller than the least at the start of the TPAGB: a low-mass white dwarf with a little envelope,
      // or a helium star merged with a main-sequence star
      kw = 14;
    } else {
      star(kw, m0, mt, lm, c);
      aj = lm.tscls[13];
    }
  }

  if (kw === 5) {
    // The helium core mass at the base of the AGB
    m0 = mbagbf(mc, c);
    if (m0 < TINY) {
      kw = 14;
    } else {
      star(kw, m0, mt, lm, c);
      aj = lm.tscls[2] + lm.tscls[3];
    }
  }

  let toGiant = false;
  if (kw === 4) {
    // aj is the fraction of the core-helium-burning life done, 0–1
    if (aj < 0 || aj > 1) aj = 0;
    // The least (fage = 1) and greatest (fage = 0) masses allowed
    mcy = mcagbf(zpars[2], c);
    if (mc >= mcy) mmin = mbagbf(mc, c);
    else mmin = zpars[2];
    mmax = mheif(mc, zpars[2], zpars[10], c);
    let found = false;
    if (aj < TINY) {
      m0 = mmax;
      found = true;
    } else if (aj >= 1) {
      m0 = mmin;
      found = true;
    }
    if (!found) {
      // Bisection for m0
      fmid = (1 - aj) * mcheif(mmax, zpars[2], zpars[10], c) + aj * mcagbf(mmax, c) - mc;
      f = (1 - aj) * mcheif(mmin, zpars[2], zpars[10], c) + aj * mcagbf(mmin, c) - mc;
      if (f * fmid >= 0) {
        // Probably mc is just above the least for a core-helium burner and fage > 0
        kw = 3;
        toGiant = true;
      } else {
        m0 = mmin;
        dm = mmax - mmin;
        for (let j = 1; j <= JMAX; j++) {
          dm = 0.5 * dm;
          mmid = m0 + dm;
          fmid = (1 - aj) * mcheif(mmid, zpars[2], zpars[10], c) + aj * mcagbf(mmid, c) - mc;
          if (fmid < 0) m0 = mmid;
          if (Math.abs(dm) < MACC || Math.abs(fmid) < TINY) break;
          if (j === JMAX) {
            m0 = mt;
            aj = 0;
          }
        }
      }
    }
    if (!toGiant) {
      star(kw, m0, mt, lm, c);
      aj = lm.tscls[2] + aj * lm.tscls[3];
    }
  }

  if (kw === 3) {
    // Double-check that this isn't a giant for M ≥ Mfgb
    mcy = mcheif(zpars[3], zpars[2], zpars[9], c);
    if (mc >= mcy) mc = 0.99 * mcy;
    // Find the m0 that puts the star at the BGB
    mcx = mcheif(zpars[2], zpars[2], zpars[9], c);
    if (mc > mcx) {
      m0 = mheif(mc, zpars[2], zpars[9], c);
    } else {
      // Newton–Raphson for m0 from Lbgb
      m0 = zpars[2];
      star(kw, m0, mt, lm, c);
      const lum = lmcgbf(mc, lm.GB);
      let j = 0;
      for (;;) {
        const dell = lbgbf(m0, c) - lum;
        if (Math.abs(dell / lum) <= LACC) break;
        const derl = lbgbdf(m0, c);
        m0 = m0 - dell / derl;
        j = j + 1;
        if (j === JMAX) {
          m0 = zpars[2];
          m0 = Math.max(m0, mt);
          break;
        }
      }
    }
    star(kw, m0, mt, lm, c);
    aj = lm.tscls[1] + 1.0e-6 * (lm.tscls[2] - lm.tscls[1]);
  }

  if (kw === 8 || kw === 9) {
    // A post-MS naked helium star, put at the end of the helium MS so that it starts as type 8
    kw = 8;
    mmin = mc;
    star(kw, mmin, mc, lm, c);
    mcx = mcgbf(lm.lums[2], lm.GB, lm.lums[6]);
    found: if (mcx >= mc) {
      m0 = mt;
    } else {
      f = mcx - mc;
      mmax = mt;
      mcy = 0;
      for (let j = 1; j <= JMAX; j++) {
        star(kw, mmax, mc, lm, c);
        mcy = mcgbf(lm.lums[2], lm.GB, lm.lums[6]);
        if (mcy > mc) break;
        mmax = 2 * mmax;
        if (j === JMAX) {
          m0 = mt;
          break found;
        }
      }
      fmid = mcy - mc;
      // Bisection for m0
      if (f * fmid >= 0) {
        m0 = mt;
        break found;
      }
      m0 = mmin;
      dm = mmax - mmin;
      for (let j = 1; j <= JMAX; j++) {
        dm = 0.5 * dm;
        mmid = m0 + dm;
        star(kw, mmid, mc, lm, c);
        mcy = mcgbf(lm.lums[2], lm.GB, lm.lums[6]);
        fmid = mcy - mc;
        if (fmid < 0) m0 = mmid;
        if (Math.abs(dm) < MACC || Math.abs(fmid) < TINY) break;
        if (j === JMAX) {
          m0 = mt;
          break found;
        }
      }
    }
    star(kw, m0, mt, lm, c);
    aj = lm.tm + 1.0e-10 * lm.tm;
  }

  if (kw === 14) {
    kw = 4;
    m0 = mt;
    mcy = mcagbf(m0, c);
    aj = mc / mcy;
    star(kw, m0, mt, lm, c);
    if (m0 <= zpars[2]) mcx = mcgbf(lm.lums[4], lm.GB, lm.lums[6]);
    else mcx = mcheif(m0, zpars[2], zpars[10], c);
    mc = mcx + (mcy - mcx) * aj;
    aj = lm.tscls[2] + aj * lm.tscls[3];
  }

  g.mc = mc;
  g.kw = kw;
  g.m0 = m0;
  g.aj = aj;
}
