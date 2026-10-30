/**
 * A star's landmark times and luminosities, ported from star.f of Hurley's SSE
 * (Hurley, Pols & Tout 2000, MNRAS 315, 543). Times in Myr, luminosities in L☉,
 * masses in M☉. Arrays are 1-based like the Fortran:
 *
 *   tscls  1 BGB  2 He ignition  3 He burning  4–6 giant t(inf1), t(inf2), t(Mx)
 *          7–9 first AGB t(inf1), t(inf2), t(Mx)  10–12 second AGB the same
 *          13 thermal pulses  14 t(Mc,max)
 *   lums   1 ZAMS  2 end of MS  3 BGB  4 He ignition  5 He burning  6 L(Mx)  7 BAGB  8 TP
 *   GB     1 effective A(H)  2 A(H,He)  3 B  4 D  5 p  6 q  7 Mx  8 A(He)  9 Mc at the BGB
 *
 * star() fills a Landmarks object in place, as the Fortran fills its caller's
 * arrays: values it doesn't set keep what they had, and the evolution relies on that.
 */
import {
  lbagbf, lbgbf, lhef, lheif, lmcgbf, ltmsf, lzahbf, lzamsf, lzhef, mcagbf, mcgbf, mcgbtf, mcheif, tbgbf, thef, themsf,
  thookf, type ZConstants,
} from './zfuncs';

export interface Landmarks {
  /** Main-sequence lifetime, Myr. */
  tm: number;
  /** Nuclear lifetime without further mass loss, Myr. */
  tn: number;
  tscls: Float64Array;
  lums: Float64Array;
  GB: Float64Array;
}

export const landmarks = (): Landmarks => ({ tm: 0, tn: 0, tscls: new Float64Array(21), lums: new Float64Array(11), GB: new Float64Array(11) });

const MCH = 1.44;

/** Fills `lm` for a star of type kw, initial mass `mass` and current mass `mt` (M☉). */
export function star(kw: number, mass: number, mt: number, lm: Landmarks, c: ZConstants): void {
  const { tscls, lums, GB } = lm;
  const zpars = c.zpars;
  if (mass > 100) mass = 100;

  if (kw >= 7 && kw <= 9) {
    heliumStar(mass, mt, lm);
    return;
  }
  if (kw >= 10) {
    lm.tm = 1.0e10;
    tscls[1] = lm.tm;
    lm.tn = 1.0e10;
    return;
  }

  // MS and BGB times
  tscls[1] = tbgbf(mass, c);
  lm.tm = Math.max(zpars[8], thookf(mass, c)) * tscls[1];
  // Zero- and terminal-age main-sequence luminosity
  lums[1] = lzamsf(mass, c);
  lums[2] = ltmsf(mass, c);
  // The GB parameters
  GB[1] = Math.max(-4.8, Math.min(-5.7 + 0.8 * mass, -4.1 + 0.14 * mass));
  GB[1] = 10 ** GB[1];
  GB[2] = 1.27e-5;
  GB[8] = 8.0e-5;
  GB[3] = Math.max(3.0e4, 500 + 1.75e4 * mass ** 0.6);
  if (mass <= 2.0) {
    GB[4] = zpars[6];
    GB[5] = 6;
    GB[6] = 3;
  } else if (mass < 2.5) {
    const dx = zpars[6] - (0.975 * zpars[6] - 0.18 * 2.5);
    GB[4] = zpars[6] - (dx * (mass - 2)) / 0.5;
    GB[5] = 6 - (mass - 2) / 0.5;
    GB[6] = 3 - (mass - 2) / 0.5;
  } else {
    GB[4] = Math.max(-1, 0.5 * zpars[6] - 0.06 * mass);
    GB[4] = Math.max(GB[4], 0.975 * zpars[6] - 0.18 * mass);
    GB[5] = 5;
    GB[6] = 2;
  }
  GB[4] = 10 ** GB[4];
  GB[7] = (GB[3] / GB[4]) ** (1 / (GB[5] - GB[6]));
  // Change in slope of the giant L–Mc relation
  lums[6] = GB[4] * GB[7] ** GB[5];
  // Helium ignition and BAGB luminosities
  lums[4] = lheif(mass, zpars[2], c);
  lums[7] = lbagbf(mass, zpars[2], c);

  if (mass < 0.1 && kw <= 1) {
    tscls[2] = 1.1 * tscls[1];
    tscls[3] = 0.1 * tscls[1];
    lums[3] = lbgbf(mass, c);
    lm.tn = 1.0e10;
    return;
  }

  let mc1: number;
  let mc2: number;
  let tgb = 0;
  if (mass <= zpars[3]) {
    // Base of the giant branch luminosity and the GB timescales
    lums[3] = lbgbf(mass, c);
    tscls[4] = tscls[1] + (1 / ((GB[5] - 1) * GB[1] * GB[4])) * (GB[4] / lums[3]) ** ((GB[5] - 1) / GB[5]);
    tscls[6] = tscls[4] - (tscls[4] - tscls[1]) * (lums[3] / lums[6]) ** ((GB[5] - 1) / GB[5]);
    tscls[5] = tscls[6] + (1 / ((GB[6] - 1) * GB[1] * GB[3])) * (GB[3] / lums[6]) ** ((GB[6] - 1) / GB[6]);
    // Helium ignition time
    if (lums[4] <= lums[6]) {
      tscls[2] = tscls[4] - (1 / ((GB[5] - 1) * GB[1] * GB[4])) * (GB[4] / lums[4]) ** ((GB[5] - 1) / GB[5]);
    } else {
      tscls[2] = tscls[5] - (1 / ((GB[6] - 1) * GB[1] * GB[3])) * (GB[3] / lums[4]) ** ((GB[6] - 1) / GB[6]);
    }
    tgb = tscls[2] - tscls[1];
    if (mass <= zpars[2]) {
      mc1 = mcgbf(lums[4], GB, lums[6]);
      lums[5] = lzahbf(mass, mc1, zpars[2], c);
      tscls[3] = thef(mass, mc1, zpars[2], c);
    } else {
      lums[5] = lhef(mass, c) * lums[4];
      tscls[3] = thef(mass, 1, zpars[2], c) * tscls[1];
    }
  } else {
    // Above Mfgb there's no giant branch (HG → CHeB → AGB), so tscls[1] is the time of helium ignition.
    tscls[2] = tscls[1];
    tscls[3] = thef(mass, 1, zpars[2], c) * tscls[1];
    // The luminosity at the end of CHeB (the BAGB), and at the end of the HG
    lums[5] = lums[7];
    lums[3] = lums[4];
  }

  // The core mass at the BGB
  if (mass <= zpars[2]) GB[9] = mcgbf(lums[3], GB, lums[6]);
  else if (mass <= zpars[3]) GB[9] = mcheif(mass, zpars[2], zpars[9], c);
  else GB[9] = mcheif(mass, zpars[2], zpars[10], c);

  // FAGB time parameters
  const tbagb = tscls[2] + tscls[3];
  tscls[7] = tbagb + (1 / ((GB[5] - 1) * GB[8] * GB[4])) * (GB[4] / lums[7]) ** ((GB[5] - 1) / GB[5]);
  tscls[9] = tscls[7] - (tscls[7] - tbagb) * (lums[7] / lums[6]) ** ((GB[5] - 1) / GB[5]);
  tscls[8] = tscls[9] + (1 / ((GB[6] - 1) * GB[8] * GB[3])) * (GB[3] / lums[6]) ** ((GB[6] - 1) / GB[6]);

  // Ltp and ttp from Mc,He at the thermal pulses
  const mcbagb = mcagbf(mass, c);
  mc1 = mcbagb;
  // Dredge-up at Ltp lowers Mc,He
  if (mc1 >= 0.8 && mc1 < 2.25) mc1 = 0.44 * mc1 + 0.448;
  lums[8] = lmcgbf(mc1, GB);
  if (mc1 <= GB[7]) tscls[13] = tscls[7] - (1 / ((GB[5] - 1) * GB[8] * GB[4])) * mc1 ** (1 - GB[5]);
  else tscls[13] = tscls[8] - (1 / ((GB[6] - 1) * GB[8] * GB[3])) * mc1 ** (1 - GB[6]);

  // SAGB time parameters
  if (mc1 <= GB[7]) {
    tscls[10] = tscls[13] + (1 / ((GB[5] - 1) * GB[2] * GB[4])) * (GB[4] / lums[8]) ** ((GB[5] - 1) / GB[5]);
    tscls[12] = tscls[10] - (tscls[10] - tscls[13]) * (lums[8] / lums[6]) ** ((GB[5] - 1) / GB[5]);
    tscls[11] = tscls[12] + (1 / ((GB[6] - 1) * GB[2] * GB[3])) * (GB[3] / lums[6]) ** ((GB[6] - 1) / GB[6]);
  } else {
    tscls[10] = tscls[7];
    tscls[12] = tscls[9];
    tscls[11] = tscls[13] + (1 / ((GB[6] - 1) * GB[2] * GB[3])) * (GB[3] / lums[8]) ** ((GB[6] - 1) / GB[6]);
  }

  // Roughly when Mc,C reaches Mc,C,max on the AGB
  const tau = tscls[2] + tscls[3];
  mc2 = mcgbtf(tau, GB[8], GB, tscls[7], tscls[8], tscls[9]);
  let mcmax = Math.max(Math.max(MCH, 0.773 * mcbagb - 0.35), 1.05 * mc2);
  if (mcmax <= mc1) {
    if (mcmax <= GB[7]) tscls[14] = tscls[7] - (1 / ((GB[5] - 1) * GB[8] * GB[4])) * mcmax ** (1 - GB[5]);
    else tscls[14] = tscls[8] - (1 / ((GB[6] - 1) * GB[8] * GB[3])) * mcmax ** (1 - GB[6]);
  } else {
    // On the SAGB: raise mcmax for any third dredge-up
    const lambda = Math.min(0.9, 0.3 + 0.001 * mass ** 5);
    mcmax = (mcmax - lambda * mc1) / (1 - lambda);
    if (mcmax <= GB[7]) tscls[14] = tscls[10] - (1 / ((GB[5] - 1) * GB[2] * GB[4])) * mcmax ** (1 - GB[5]);
    else tscls[14] = tscls[11] - (1 / ((GB[6] - 1) * GB[2] * GB[3])) * mcmax ** (1 - GB[6]);
  }
  tscls[14] = Math.max(tbagb, tscls[14]);
  if (mass >= 100) {
    lm.tn = tscls[2];
    return;
  }

  // The nuclear timescale: when Mc = Mt without further mass loss. Mc is double-valued only for stars with a
  // dredge-up, so the type decides which.
  let tn: number;
  if (Math.abs(mt - mcbagb) < 1.0e-14 && kw < 5) {
    tn = tbagb;
  } else if (mt > mcbagb || (mt >= mc1 && kw > 4)) {
    if (kw === 6) {
      const lambda = Math.min(0.9, 0.3 + 0.001 * mass ** 5);
      mc1 = (mt - lambda * mc1) / (1 - lambda);
    } else {
      mc1 = mt;
    }
    if (mc1 <= GB[7]) tn = tscls[10] - (1 / ((GB[5] - 1) * GB[2] * GB[4])) * mc1 ** (1 - GB[5]);
    else tn = tscls[11] - (1 / ((GB[6] - 1) * GB[2] * GB[3])) * mc1 ** (1 - GB[6]);
  } else if (mass > zpars[3]) {
    mc1 = mcheif(mass, zpars[2], zpars[10], c);
    if (mt <= mc1) tn = tscls[2];
    else tn = tscls[2] + tscls[3] * ((mt - mc1) / (mcbagb - mc1));
  } else if (mass <= zpars[2]) {
    mc1 = mcgbf(lums[3], GB, lums[6]);
    mc2 = mcgbf(lums[4], GB, lums[6]);
    if (mt <= mc1) tn = tscls[1];
    else if (mt <= mc2) {
      if (mt <= GB[7]) tn = tscls[4] - (1 / ((GB[5] - 1) * GB[1] * GB[4])) * mt ** (1 - GB[5]);
      else tn = tscls[5] - (1 / ((GB[6] - 1) * GB[1] * GB[3])) * mt ** (1 - GB[6]);
    } else tn = tscls[2] + tscls[3] * ((mt - mc2) / (mcbagb - mc2));
  } else {
    mc1 = mcheif(mass, zpars[2], zpars[9], c);
    mc2 = mcheif(mass, zpars[2], zpars[10], c);
    if (mt <= mc1) tn = tscls[1];
    else if (mt <= mc2) tn = tscls[1] + tgb * ((mt - mc1) / (mc2 - mc1));
    else tn = tscls[2] + tscls[3] * ((mt - mc2) / (mcbagb - mc2));
  }
  lm.tn = Math.min(tn, tscls[14]);
}

/** The landmarks of a naked helium star. */
function heliumStar(mass: number, mt: number, lm: Landmarks) {
  const { tscls, lums, GB } = lm;
  // Helium main-sequence lifetime
  lm.tm = themsf(mass);
  tscls[1] = lm.tm;
  // Zero- and terminal-age helium main-sequence luminosity
  lums[1] = lzhef(mass);
  const am = Math.max(0, 0.85 - 0.08 * mass);
  lums[2] = lums[1] * (1 + 0.45 + am);
  // The helium star's GB parameters
  GB[8] = 8.0e-5;
  GB[3] = 4.1e4;
  GB[4] = 5.5e4 / (1 + 0.4 * mass ** 4);
  GB[5] = 5;
  GB[6] = 3;
  GB[7] = (GB[3] / GB[4]) ** (1 / (GB[5] - GB[6]));
  lums[6] = GB[4] * GB[7] ** GB[5];
  // Its GB timescales
  const mc1 = mcgbf(lums[2], GB, lums[6]);
  tscls[4] = lm.tm + (1 / ((GB[5] - 1) * GB[8] * GB[4])) * mc1 ** (1 - GB[5]);
  tscls[6] = tscls[4] - (tscls[4] - lm.tm) * (GB[7] / mc1) ** (1 - GB[5]);
  tscls[5] = tscls[6] + (1 / ((GB[6] - 1) * GB[8] * GB[3])) * GB[7] ** (1 - GB[6]);
  // Roughly when Mc = min(Mt, Mc,C,max) on the GB
  let mtc = Math.min(mt, 1.45 * mt - 0.31);
  if (mtc <= 0) mtc = mt;
  const mcmax = Math.min(mtc, Math.max(MCH, 0.773 * mass - 0.35));
  if (mcmax <= GB[7]) tscls[14] = tscls[4] - (1 / ((GB[5] - 1) * GB[8] * GB[4])) * mcmax ** (1 - GB[5]);
  else tscls[14] = tscls[5] - (1 / ((GB[6] - 1) * GB[8] * GB[3])) * mcmax ** (1 - GB[6]);
  tscls[14] = Math.max(tscls[14], lm.tm);
  lm.tn = tscls[14];
}
