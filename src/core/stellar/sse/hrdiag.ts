/**
 * Where a star is on the HR diagram at a given age, ported from hrdiag.f and
 * mrenv.f of Hurley's SSE (Hurley, Pols & Tout 2000, MNRAS 315, 543): its
 * luminosity (L☉), radius (R☉), core mass (M☉), type, and the mass and depth of
 * its convective envelope. Ages in Myr.
 *
 * hrdiag() reads and writes an HrState in place, as the Fortran writes its
 * arguments: it may change the star's type, age, masses and the landmarks.
 *
 * Stellar types (kw): 0 deeply or fully convective main sequence; 1 main sequence;
 * 2 Hertzsprung gap; 3 first giant branch; 4 core helium burning; 5 early AGB;
 * 6 thermally pulsing AGB; 7–9 naked helium main sequence, Hertzsprung gap and
 * giant branch; 10–12 helium, carbon–oxygen and oxygen–neon white dwarfs;
 * 13 neutron star; 14 black hole; 15 no remnant.
 */
import { star, type Landmarks } from './star';
import {
  lalphf, lbetaf, lgbtf, lhookf, lmcgbf, lnetaf, lpertf, lzhef, mcagbf, mcgbf, mcgbtf, mcheif, mctmsf, ragbf, ralphf, rbetaf,
  rgammf, rgbf, rhegbf, rhehgf, rhookf, rminf, rpertf, rtmsf, rzahbf, rzamsf, rzhef, tblf, thookf, type ZConstants,
} from './zfuncs';

/** SSE's switches, with evolve.in's defaults (see DEFAULTS in evolve.ts). */
export interface SseSwitches {
  /** Reimers' η. */
  neta: number;
  /** Helium-star wind factor. */
  hewind: number;
  /** Largest neutron-star mass, M☉. */
  mxns: number;
  /** 1: Han et al.'s white-dwarf masses. */
  ifflag: number;
  /** 0: Mestel cooling; 1: modified Mestel. */
  wdflag: number;
  /** 0: remnant masses 1.17 + 0.09 Mc; 1: Belczynski et al. (2002). */
  nsflag: number;
}

export interface HrState {
  /** Initial (effective) mass, M☉. */
  mass: number;
  /** Age, Myr. */
  aj: number;
  /** Current mass, M☉. */
  mt: number;
  kw: number;
  /** Core mass, M☉. */
  mc: number;
  /** Radius, R☉. */
  r: number;
  /** Luminosity, L☉. */
  lum: number;
  /** Core radius, R☉. */
  rc: number;
  /** Mass of the convective envelope, M☉. */
  menv: number;
  /** Depth of the convective envelope, R☉. */
  renv: number;
  /** The envelope's gyration radius squared. */
  k2: number;
}

const MCH = 1.44;
const MLP = 12;
const TINY = 1.0e-14;
const TAUMIN = 5.0e-8;
const LUM0 = 7.0e4;
const KAP = -0.5;
const AHE = 4;
const ACO = 16;

/** Remnant mass from the CO core, M☉ (nsflag; Belczynski et al. 2002 when ≥ 1). */
function remnantMass(mc: number, mt: number, sw: SseSwitches): number {
  if (sw.nsflag === 0) return 1.17 + 0.09 * mc;
  const mcx = mc < 2.5 ? 0.161767 * mc + 1.067055 : 0.314154 * mc + 0.686088;
  if (mc <= 5) return mcx;
  if (mc < 7.6) return mcx + ((mc - 5) * (mt - mcx)) / 2.6;
  return mt;
}

export function hrdiag(s: HrState, lm: Landmarks, c: ZConstants, sw: SseSwitches): void {
  const zpars = c.zpars;
  const { tscls, lums, GB } = lm;
  let { mass, aj, mt, kw, mc, r, lum } = s;
  let { menv, renv, k2 } = s;
  let rc: number;

  const mass0 = mass;
  if (mass0 > 100) mass = 100;
  const mt0 = mt;
  if (mt0 > 100) mt = 100;

  let tbagb = 0;
  let rzams = 0;
  let rtms = 0;
  let rg = 0;
  let lx = 0;
  let rx = 0;
  let mcx = 0;
  let mtc = 0;
  let tau: number;
  let xx: number;

  main: {
    if (kw > 6) break main;

    tbagb = tscls[2] + tscls[3];
    const thg = tscls[1] - lm.tm;
    rzams = rzamsf(mass, c);
    rtms = rtmsf(mass, c);

    if (aj < tscls[1]) {
      // Either on the MS or in the HG
      rg = rgbf(mt, lums[3], c);
      if (aj < lm.tm) {
        // Main-sequence star
        mc = 0;
        tau = aj / lm.tm;
        const thook = thookf(mass, c) * tscls[1];
        const zeta = 0.01;
        const tau1 = Math.min(1, aj / thook);
        const tau2 = Math.max(0, Math.min(1, (aj - (1 - zeta) * thook) / (zeta * thook)));

        const dell = lhookf(mass, zpars[1], c);
        let dtau = tau1 ** 2 - tau2 ** 2;
        let alpha = lalphf(mass, c);
        let beta = lbetaf(mass, c);
        const eta = lnetaf(mass, c);
        const lxx = Math.log10(lums[2] / lums[1]);
        if (tau > TAUMIN) xx = alpha * tau + beta * tau ** eta + (lxx - alpha - beta) * tau ** 2 - dell * dtau;
        else xx = alpha * tau + (lxx - alpha) * tau ** 2 - dell * dtau;
        lum = lums[1] * 10 ** xx;

        const delr = rhookf(mass, zpars[1], c);
        dtau = tau1 ** 3 - tau2 ** 3;
        alpha = ralphf(mass, c);
        beta = rbetaf(mass, c);
        const gamma = rgammf(mass, c);
        const rxx = Math.log10(rtms / rzams);
        // taumin only guards against underflow
        if (tau > TAUMIN) xx = alpha * tau + beta * tau ** 10 + gamma * tau ** 40 + (rxx - alpha - beta - gamma) * tau ** 3 - delr * dtau;
        else xx = alpha * tau + (rxx - alpha) * tau ** 3 - delr * dtau;
        r = rzams * 10 ** xx;

        if (mass < zpars[1] - 0.3) {
          kw = 0;
          // Low-mass MS stars are substantially degenerate (Tout's formula, with Y = 0.24 + 2Z)
          const rdgen = 0.0258 * (1 + zpars[11]) ** (5 / 3) * mass ** (-1 / 3);
          r = Math.max(rdgen, r);
        } else {
          kw = 1;
        }
      } else {
        // Hertzsprung gap
        mcx = mc;
        if (mass <= zpars[2]) mc = mcgbf(lums[3], GB, lums[6]);
        else if (mass <= zpars[3]) mc = mcheif(mass, zpars[2], zpars[9], c);
        else mc = mcheif(mass, zpars[2], zpars[10], c);
        const eta = mctmsf(mass);
        tau = (aj - lm.tm) / thg;
        mc = ((1 - tau) * eta + tau) * mc;
        mc = Math.max(mc, mcx);
        // Has the core reached the total mass?
        if (mc >= mt) {
          aj = 0;
          if (mass > zpars[2]) {
            // Zero-age helium star
            mc = 0;
            mass = mt;
            kw = 7;
            star(kw, mass, mt, lm, c);
          } else {
            // Zero-age helium white dwarf
            mc = mt;
            mass = mt;
            kw = 10;
          }
        } else {
          lum = lums[2] * (lums[3] / lums[2]) ** tau;
          let rxx: number;
          if (mass <= zpars[3]) {
            rxx = rg;
          } else {
            // Helium ignition and the end of the HG happen at Rmin
            const rmin = rminf(mass, c);
            const ry = ragbf(mt, lums[4], zpars[2], c);
            rxx = Math.min(rmin, ry);
            if (mass <= MLP) {
              const texp = Math.log(mass / MLP) / Math.log(zpars[3] / MLP);
              rxx = rg;
              rxx = rmin * (rxx / rmin) ** texp;
            }
            const tau2 = tblf(mass, zpars[2], zpars[3], c);
            if (tau2 < TINY) rxx = ry;
          }
          r = rtms * (rxx / rtms) ** tau;
          kw = 2;
        }
      }
    } else if (aj < tscls[2]) {
      // Red giant
      kw = 3;
      lum = lgbtf(aj, GB[1], GB, tscls[4], tscls[5], tscls[6]);
      if (mass <= zpars[2]) {
        // A degenerate helium core grows on the GB
        mc = mcgbf(lum, GB, lums[6]);
      } else {
        // A non-degenerate core may grow, but only slightly
        tau = (aj - tscls[1]) / (tscls[2] - tscls[1]);
        const mcxx = mcheif(mass, zpars[2], zpars[9], c);
        const mcy = mcheif(mass, zpars[2], zpars[10], c);
        mc = mcxx + (mcy - mcxx) * tau;
      }
      r = rgbf(mt, lum, c);
      rg = r;
      if (mc >= mt) {
        aj = 0;
        if (mass > zpars[2]) {
          // Zero-age helium star
          mc = 0;
          mass = mt;
          kw = 7;
          star(kw, mass, mt, lm, c);
        } else {
          // Zero-age helium white dwarf
          mc = mt;
          mass = mt;
          kw = 10;
        }
      }
    } else if (aj < tbagb) {
      // Core helium burning
      if (kw === 3 && mass <= zpars[2]) {
        mass = mt;
        star(kw, mass, mt, lm, c);
        aj = tscls[2];
      }
      if (mass <= zpars[2]) mcx = mcgbf(lums[4], GB, lums[6]);
      else mcx = mcheif(mass, zpars[2], zpars[10], c);
      tau = (aj - tscls[2]) / tscls[3];
      mc = mcx + (mcagbf(mass, c) - mcx) * tau;

      if (mass <= zpars[2]) {
        const lxx = lums[5];
        const ly = lums[7];
        const rxx = rzahbf(mt, mc, zpars[2], c);
        rg = rgbf(mt, lxx, c);
        let rmin = rg * zpars[13] ** (mass / zpars[2]);
        const texp = Math.min(Math.max(0.4, rmin / rxx), 2.5);
        const ry = ragbf(mt, ly, zpars[2], c);
        let taul: number;
        if (rmin < rxx) {
          taul = Math.log(rxx / rmin) ** (1 / 3);
        } else {
          rmin = rxx;
          taul = 0;
        }
        const tauh = Math.log(ry / rmin) ** (1 / 3);
        const tau2 = taul * (tau - 1) + tauh * tau;
        r = rmin * Math.exp(Math.abs(tau2) ** 3);
        rg = rg + tau * (ry - rg);
        lum = lxx * (ly / lxx) ** tau ** texp;
      } else if (mass > zpars[3]) {
        // High-mass stars ignite helium at Rmin in the HG: a blue phase before tloop, then a red-giant phase.
        let tau2 = tblf(mass, zpars[2], zpars[3], c);
        const tloop = tscls[2] + tau2 * tscls[3];
        let rmin = rminf(mass, c);
        rg = rgbf(mt, lums[4], c);
        let rxx = ragbf(mt, lums[4], zpars[2], c);
        rmin = Math.min(rmin, rxx);
        if (mass <= MLP) {
          const texp = Math.log(mass / MLP) / Math.log(zpars[3] / MLP);
          rxx = rg;
          rxx = rmin * (rxx / rmin) ** texp;
        } else {
          rxx = rmin;
        }
        const texp = Math.min(Math.max(0.4, rmin / rxx), 2.5);
        lum = lums[4] * (lums[7] / lums[4]) ** tau ** texp;
        if (aj < tloop) {
          const ly = lums[4] * (lums[7] / lums[4]) ** tau2 ** texp;
          const ry = ragbf(mt, ly, zpars[2], c);
          let taul = 0;
          if (Math.abs(rmin - rxx) > TINY) taul = Math.log(rxx / rmin) ** (1 / 3);
          let tauh = 0;
          if (ry > rmin) tauh = Math.log(ry / rmin) ** (1 / 3);
          tau = (aj - tscls[2]) / (tau2 * tscls[3]);
          tau2 = taul * (tau - 1) + tauh * tau;
          r = rmin * Math.exp(Math.abs(tau2) ** 3);
          rg = rg + tau * (ry - rg);
        } else {
          r = ragbf(mt, lum, zpars[2], c);
          rg = r;
        }
      } else {
        // Intermediate-mass stars: a red-giant phase before tloop, then a blue loop.
        const tau2 = 1 - tblf(mass, zpars[2], zpars[3], c);
        const tloop = tscls[2] + tau2 * tscls[3];
        if (aj < tloop) {
          tau = (tloop - aj) / (tau2 * tscls[3]);
          lum = lums[5] * (lums[4] / lums[5]) ** tau ** 3;
          r = rgbf(mt, lum, c);
          rg = r;
        } else {
          const lxx = lums[5];
          const ly = lums[7];
          const rxx = rgbf(mt, lxx, c);
          let rmin = rminf(mt, c);
          const texp = Math.min(Math.max(0.4, rmin / rxx), 2.5);
          const ry = ragbf(mt, ly, zpars[2], c);
          let taul: number;
          if (rmin < rxx) {
            taul = Math.log(rxx / rmin) ** (1 / 3);
          } else {
            rmin = rxx;
            taul = 0;
          }
          const tauh = Math.log(ry / rmin) ** (1 / 3);
          tau = (aj - tloop) / (tscls[3] - (tloop - tscls[2]));
          const tau3 = taul * (tau - 1) + tauh * tau;
          r = rmin * Math.exp(Math.abs(tau3) ** 3);
          rg = rxx + tau * (ry - rxx);
          lum = lxx * (ly / lxx) ** tau ** texp;
        }
      }
      // Has the core outgrown the star?
      if (mc >= mt) {
        // An evolved naked helium main-sequence star
        kw = 7;
        xx = (aj - tscls[2]) / tscls[3];
        mass = mt;
        star(kw, mass, mt, lm, c);
        aj = xx * lm.tm;
      } else {
        kw = 4;
      }
    } else {
      // Asymptotic giant branch. The helium core stays the same until, at Ltp, the carbon core catches it up
      // and they grow together.
      const mcbagb = mcagbf(mass, c);
      mcx = mcgbtf(tbagb, GB[8], GB, tscls[7], tscls[8], tscls[9]);
      let mcmax = Math.max(Math.max(MCH, 0.773 * mcbagb - 0.35), 1.05 * mcx);

      if (aj < tscls[13]) {
        mcx = mcgbtf(aj, GB[8], GB, tscls[7], tscls[8], tscls[9]);
        mc = mcbagb;
        lum = lmcgbf(mcx, GB);
        if (mt <= mc) {
          // The envelope is gone but burning inside isn't finished: a post-HeMS naked helium star.
          kw = 9;
          mt = mc;
          mass = mt;
          mc = mcx;
          star(kw, mass, mt, lm, c);
          if (mc <= GB[7]) aj = tscls[4] - (1 / ((GB[5] - 1) * GB[8] * GB[4])) * mc ** (1 - GB[5]);
          else aj = tscls[5] - (1 / ((GB[6] - 1) * GB[8] * GB[3])) * mc ** (1 - GB[6]);
          aj = Math.max(aj, lm.tm);
          break main;
        }
        kw = 5;
      } else {
        kw = 6;
        mc = mcgbtf(aj, GB[2], GB, tscls[10], tscls[11], tscls[12]);
        lum = lmcgbf(mc, GB);
        // Third dredge-up, roughly, by limiting Mc
        const lambda = Math.min(0.9, 0.3 + 0.001 * mass ** 5);
        tau = tscls[13];
        mcx = mcgbtf(tau, GB[2], GB, tscls[10], tscls[11], tscls[12]);
        const mcy = mc;
        mc = mc - lambda * (mcy - mcx);
        mcx = mc;
        mcmax = Math.min(mt, mcmax);
      }
      r = ragbf(mt, lum, zpars[2], c);
      rg = r;

      // Mcx is the carbon core: has it reached the total mass or the largest core allowed?
      if (mcmax - mcx < TINY) {
        aj = 0;
        mc = mcmax;
        if (mc < MCH) {
          if (sw.ifflag >= 1) {
            // Han, Podsiadlowski & Eggleton (1995)'s initial–final mass relation
            if (zpars[14] >= 1.0e-8) {
              mc = Math.min(0.36 + 0.104 * mass, 0.58 + 0.061 * mass);
              mc = Math.max(0.54 + 0.042 * mass, mc);
              if (mass < 1) mc = 0.46;
            } else {
              mc = Math.min(0.29 + 0.178 * mass, 0.65 + 0.062 * mass);
              mc = Math.max(0.54 + 0.073 * mass, mc);
            }
            mc = Math.min(MCH, mc);
          }
          mt = mc;
          // Zero-age carbon–oxygen or oxygen–neon white dwarf
          kw = mcbagb < 1.6 ? 11 : 12;
          mass = mt;
        } else if (mcbagb < 1.6) {
          // Not massive enough to ignite carbon, so the supernova leaves nothing
          kw = 15;
          aj = 0;
          mt = 0;
          lum = 1.0e-10;
          r = 1.0e-10;
        } else {
          mt = remnantMass(mc, mt, sw);
          mc = mt;
          // Zero-age neutron star or black hole
          kw = mt <= sw.mxns ? 13 : 14;
        }
      }
    }
  }

  if (kw >= 7 && kw <= 9) {
    // Naked helium star
    rzams = rzhef(mt);
    rx = rzams;
    if (aj < lm.tm) {
      // Main sequence
      kw = 7;
      tau = aj / lm.tm;
      let am = Math.max(0, 0.85 - 0.08 * mass);
      lum = lums[1] * (1 + 0.45 * tau + am * tau ** 2);
      am = Math.max(0, 0.4 - 0.22 * Math.log10(mt));
      r = rx * (1 + am * (tau - tau ** 6));
      rg = rx;
      // No core, and so no memory of its past: mass and mt both lose mass in this phase.
      mc = 0;
      if (mt < zpars[10]) kw = 10;
    } else {
      // Helium shell burning
      kw = 8;
      lum = lgbtf(aj, GB[8], GB, tscls[4], tscls[5], tscls[6]);
      r = rhehgf(mt, lum, rx, lums[2]);
      rg = rhegbf(lum);
      if (r >= rg) {
        kw = 9;
        r = rg;
      }
      mc = mcgbf(lum, GB, lums[6]);
      mtc = Math.min(mt, 1.45 * mt - 0.31);
      const mcmax = Math.min(mtc, Math.max(MCH, 0.773 * mass - 0.35));
      if (mcmax - mc < TINY) {
        aj = 0;
        mc = mcmax;
        if (mc < MCH) {
          if (mass < 1.6) {
            // Zero-age carbon–oxygen white dwarf
            mt = Math.max(mc, (mc + 0.31) / 1.45);
            kw = 11;
          } else {
            // Zero-age oxygen–neon white dwarf
            mt = mc;
            kw = 12;
          }
          mass = mt;
        } else if (mass < 1.6) {
          // Not massive enough to ignite carbon: no remnant
          kw = 15;
          aj = 0;
          mt = 0;
          lum = 1.0e-10;
          r = 1.0e-10;
        } else {
          mt = remnantMass(mc, mt, sw);
          mc = mt;
          kw = mt <= sw.mxns ? 13 : 14;
        }
      }
    }
  }

  if (kw >= 10 && kw <= 12) {
    // White dwarf
    mc = mt;
    if (mc >= MCH) {
      // Accretion-induced supernova: no remnant, unless an ONe white dwarf leaves a neutron star of the least mass
      if (kw === 12) {
        kw = 13;
        aj = 0;
        mt = 1.3;
      } else {
        kw = 15;
        aj = 0;
        mt = 0;
        lum = 1.0e-10;
        r = 1.0e-10;
      }
    } else {
      xx = kw === 10 ? AHE : ACO;
      if (sw.wdflag === 0) {
        // Mestel cooling
        lum = (635 * mt * zpars[14]) / (xx * (aj + 0.1)) ** 1.4;
      } else if (aj < 9000) {
        // Modified Mestel cooling
        lum = (300 * mt * zpars[14]) / (xx * (aj + 0.1)) ** 1.18;
      } else {
        const fac = (9000.1 * xx) ** 5.3;
        lum = (300 * fac * mt * zpars[14]) / (xx * (aj + 0.1)) ** 6.48;
      }
      r = 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mt) ** (2 / 3) - (mt / MCH) ** (2 / 3)));
      r = Math.min(0.1, r);
      if (mt < 0.0005) r = 0.09;
      if (mt < 0.000005) r = 0.009;
    }
  }

  if (kw === 13) {
    // Neutron star
    mc = mt;
    if (mc > sw.mxns) {
      // Accretion-induced black hole
      kw = 14;
      aj = 0;
    } else {
      lum = (0.02 * mt ** 0.67) / Math.max(aj, 0.1) ** 2;
      r = 1.4e-5;
    }
  }

  if (kw === 14) {
    // Black hole
    mc = mt;
    lum = 1.0e-10;
    r = 4.24e-6 * mt;
  }

  // The core radius, and the luminosity and radius of the remnant the star will become
  tau = 0;
  if (kw <= 1 || kw === 7) {
    rc = 0;
  } else if (kw <= 3) {
    if (mass > zpars[2]) {
      lx = lzhef(mc);
      rx = rzhef(mc);
      rc = rx;
    } else {
      lx = sw.wdflag === 0 ? (635 * mc * zpars[14]) / (AHE * 0.1) ** 1.4 : (300 * mc * zpars[14]) / (AHE * 0.1) ** 1.18;
      rx = 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mc) ** (2 / 3) - (mc / MCH) ** (2 / 3)));
      rc = 5 * rx;
    }
  } else if (kw === 4) {
    tau = (aj - tscls[2]) / tscls[3];
    star(7, mc, mc, lm, c);
    let am = Math.max(0, 0.85 - 0.08 * mc);
    lx = lums[1] * (1 + 0.45 * tau + am * tau ** 2);
    rx = rzhef(mc);
    am = Math.max(0, 0.4 - 0.22 * Math.log10(mc));
    rx = rx * (1 + am * (tau - tau ** 6));
    star(kw, mass, mt, lm, c);
    rc = rx;
  } else if (kw === 5) {
    if (lm.tn > tbagb) tau = (3 * (aj - tbagb)) / (lm.tn - tbagb);
    star(9, mc, mc, lm, c);
    lx = lmcgbf(mcx, GB);
    if (tau < 1) lx = lums[2] * (lx / lums[2]) ** tau;
    rx = rzhef(mc);
    rx = Math.min(rhehgf(mc, lx, rx, lums[2]), rhegbf(lx));
    star(kw, mass, mt, lm, c);
    rc = rx;
  } else if (kw <= 9) {
    lx = sw.wdflag === 0 ? (635 * mc * zpars[14]) / (ACO * 0.1) ** 1.4 : (300 * mc * zpars[14]) / (ACO * 0.1) ** 1.18;
    rx = 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mc) ** (2 / 3) - (mc / MCH) ** (2 / 3)));
    rc = 5 * rx;
  } else {
    rc = r;
    menv = 1.0e-10;
    renv = 1.0e-10;
    k2 = 0.21;
  }

  // Perturb the luminosity and radius when the envelope is small
  if (kw >= 2 && kw <= 9 && kw !== 7) {
    let mew = ((mt - mc) / mt) * Math.min(5, Math.max(1.2, (lum / LUM0) ** KAP));
    if (kw >= 8) mew = ((mtc - mc) / mtc) * 5;
    if (mew < 1) {
      xx = lpertf(mt, mew);
      lum = lx * (lum / lx) ** xx;
      if (r <= rx) xx = 0;
      else xx = rpertf(mt, mew, r, rx);
      r = rx * (r / rx) ** xx;
    }
    rc = Math.min(rc, r);
  }

  // The mass and depth of the convective envelope, and its gyration radius
  if (kw < 10) {
    const e = mrenv(kw, mass, mt, mc, lum, r, rc, aj, lm.tm, lums[2], lums[3], lums[4], rzams, rtms, rg);
    menv = e.menv;
    renv = e.renv;
    k2 = e.k2;
  }

  if (mass > 99.99) mass = mass0;
  if (mt > 99.99) mt = mt0;

  Object.assign(s, { mass, aj, mt, kw, mc, r, lum, rc, menv, renv, k2 });
}

/**
 * The mass (M☉) and depth (R☉) of the convective envelope and its gyration radius squared, from mrenv.f
 * (Hurley, Tout & Pols 2002). Fitted at Z = 0.02 only.
 */
export function mrenv(
  kw: number, mass: number, mt: number, mc: number, lum: number, rad: number, rc: number, aj: number, tm: number,
  ltms: number, lbgb: number, lhei: number, rzams: number, rtms: number, rg: number,
): { menv: number; renv: number; k2: number } {
  const logm = Math.log10(mass);
  const A = Math.min(0.81, Math.max(0.68, 0.68 + 0.4 * logm));
  const C = Math.max(-2.5, Math.min(-1.5, -2.5 + 5 * logm));
  const D = -0.1;
  const E = 0.025;
  // Zero-age and BGB values of k²
  let k2z = Math.min(0.21, Math.max(0.09 - 0.27 * logm, 0.037 + 0.033 * logm));
  if (logm > 1.3) k2z = k2z - 0.055 * (logm - 1.3) ** 2;
  const k2bgb = Math.min(0.15, Math.min(0.147 + 0.03 * logm, 0.162 - 0.04 * logm));

  let k2g: number;
  let x: number;
  let y: number;
  if (kw >= 3 && kw <= 6) {
    // Giants' envelopes, continuous at the BGB
    const logmt = Math.log10(mt);
    const F = 0.208 + 0.125 * logmt - 0.035 * logmt ** 2;
    const B = (1.0e4 * mt ** (3 / 2)) / (1 + 0.1 * mt ** (3 / 2));
    x = ((lum - lbgb) / B) ** 2;
    y = (F - 0.033 * Math.log10(lbgb)) / k2bgb - 1;
    k2g = (F - 0.033 * Math.log10(lum) + 0.4 * x) / (1 + y * (lbgb / lum) + x);
  } else if (kw === 9) {
    // A rough fit for helium giants
    const B = 3.0e4 * mt ** (3 / 2);
    x = Math.max(0, lum / B - 0.5) ** 2;
    k2g = (k2bgb + 0.4 * x) / (1 + 0.4 * x);
  } else {
    k2g = k2bgb;
  }

  let menvg: number;
  let renvg: number;
  if (kw <= 2) {
    menvg = 0.5;
    renvg = 0.65;
  } else if (kw === 3 && lum < 3 * lbgb) {
    // Giants still close to the BGB don't yet have a full convective envelope
    x = Math.min(3, lhei / lbgb);
    const tau = Math.max(0, Math.min(1, (x - lum / lbgb) / (x - 1)));
    menvg = 1 - 0.5 * tau ** 2;
    renvg = 1 - 0.35 * tau ** 2;
  } else {
    menvg = 1;
    renvg = 1;
  }

  let menv: number;
  let renv: number;
  let k2e = 0;
  if (rad < rg) {
    // Stars off the Hayashi track: MS and HG stars, blue core helium burners, helium MS and HG stars, and
    // giants with very little envelope
    if (kw <= 6) k2e = (k2z - E) * (rad / rzams) ** C + E * (rad / rzams) ** D;
    else if (kw === 7) k2e = 0.08 - 0.03 * (aj / tm);
    else if (kw <= 9) k2e = (0.08 * rzams) / rad;

    // tauenv: how close to the Hayashi track, by temperature
    let tauenv: number;
    let tebgb = 0;
    if (kw <= 2) {
      const teff = Math.sqrt(Math.sqrt(lum) / rad);
      tebgb = Math.sqrt(Math.sqrt(lbgb) / rg);
      tauenv = Math.max(0, Math.min(1, (tebgb / teff - A) / (1 - A)));
    } else {
      tauenv = Math.max(0, Math.min(1, (Math.sqrt(rad / rg) - A) / (1 - A)));
    }

    if (tauenv > 0) {
      menv = menvg * tauenv ** 5;
      renv = renvg * tauenv ** (5 / 4);
      if (kw <= 1) {
        // Zero-age values
        x = Math.max(0, Math.min(1, (0.1 - logm) / 0.55));
        const menvz = 0.18 * x + 0.82 * x ** 5;
        const renvz = 0.4 * x ** (1 / 4) + 0.6 * x ** 10;
        y = 2 + 8 * x;
        // Values at the start of the HG
        const tetms = Math.sqrt(Math.sqrt(ltms) / rtms);
        const tautms = Math.max(0, Math.min(1, (tebgb / tetms - A) / (1 - A)));
        const menvt = menvg * tautms ** 5;
        const renvt = renvg * tautms ** (5 / 4);
        // Modified during the MS
        const tau = aj / tm;
        if (tautms > 0) {
          menv = menvz + (tau ** y * menv * (menvt - menvz)) / menvt;
          renv = renvz + (tau ** y * renv * (renvt - renvz)) / renvt;
        } else {
          menv = 0;
          renv = 0;
        }
        k2e = k2e + tau ** y * tauenv ** 3 * (k2g - k2e);
      } else {
        k2e = k2e + tauenv ** 3 * (k2g - k2e);
      }
    } else {
      menv = 0;
      renv = 0;
    }
  } else {
    // True giants
    menv = menvg;
    renv = renvg;
    k2e = k2g;
  }

  menv = Math.max(menv * (mt - mc), 1.0e-10);
  renv = Math.max(renv * (rad - rc), 1.0e-10);
  return { menv, renv, k2: k2e };
}
