/**
 * One star's life, ported from evolv1.f, deltat.f and mlwind.f of Hurley's SSE
 * (Hurley, Pols & Tout 2000, MNRAS 315, 543): the time step, the wind, and the
 * loop that calls star() and hrdiag() until the end time.
 *
 * Units are SSE's: masses in M☉, luminosities in L☉, radii in R☉, times in Myr.
 * The star's spin, which SSE follows but which never feeds back on a single
 * star, is left out.
 */
import { T_SUN } from '../../constants';
import { hrdiag, type HrState, type SseSwitches } from './hrdiag';
import { landmarks, star, type Landmarks } from './star';
import { zcnsts } from './zcnsts';

export interface SseOptions extends SseSwitches {
  /** Time steps as fractions of the phase: pts1 MS (and HeMS), pts2 GB, CHeB, HeGB, pts3 HG, AGB. */
  pts1: number;
  pts2: number;
  pts3: number;
  /** Multiplies every wind (the Star Forge's "wind strength"); 1 is SSE's own. */
  windScale: number;
}

/** evolve.in's defaults, as distributed with SSE. */
export const DEFAULTS: SseOptions = {
  neta: 0.5,
  hewind: 0.5,
  mxns: 3,
  ifflag: 0,
  wdflag: 1,
  nsflag: 1,
  pts1: 0.05,
  pts2: 0.01,
  pts3: 0.02,
  windScale: 1,
};

/** One step of a track, in SSE's units. */
export interface SseStep {
  /** Time since the star was born, Myr. */
  t: number;
  /** Stellar type, 0–15 (see hrdiag.ts). */
  kw: number;
  /** Initial (effective) mass, M☉: SSE resets it for main-sequence stars that lose mass, and for remnants. */
  mass0: number;
  /** Current mass, M☉. */
  mt: number;
  /** Luminosity, L☉. */
  L: number;
  /** Radius, R☉. */
  R: number;
  /** Effective temperature from L and R, K (with T☉ = 5,772 K). */
  T: number;
  /** Core mass, M☉. */
  mc: number;
  /** Core radius, R☉. */
  rc: number;
  /** Convective envelope's mass, M☉. */
  menv: number;
  /** Convective envelope's depth, R☉. */
  renv: number;
  /** The time the current phase's clock started, Myr. */
  epoch: number;
}

/** A change of type: when (Myr), to what, and the mass then (M☉; the initial mass for type 15). */
export interface SseTypeChange {
  t: number;
  kw: number;
  mt: number;
}

export interface SseTrack {
  /** Initial mass, M☉. */
  m: number;
  z: number;
  steps: SseStep[];
  types: SseTypeChange[];
}

const NV = 50000;
const TOL = 1.0e-10;
const TINY = 1.0e-14;
const EPS = 1.0e-6;
const ALPHA2 = 0.09;

/** The wind's mass-loss rate, M☉ per year (mlwind.f), for a single star (no Roche lobe). */
export function mlwind(kw: number, lum: number, r: number, mt: number, mc: number, z: number, o: SseOptions): number {
  let dms = 0;
  // Nieuwenhuijzen & de Jager (1990) for massive stars, all over the HR diagram
  if (lum > 4000) {
    const x = Math.min(1, (lum - 4000) / 500);
    dms = 9.6e-15 * x * r ** 0.81 * lum ** 1.24 * mt ** 0.16;
    dms = dms * (z / 0.02) ** (1 / 2);
  }
  if (kw >= 2 && kw <= 9) {
    // Reimers
    let dml = (o.neta * 4.0e-13 * r * lum) / mt;
    // Vassiliadis & Wood (1993) for long pulsation periods on the AGB
    if (kw === 5 || kw === 6) {
      let p0 = -2.07 - 0.9 * Math.log10(mt) + 1.94 * Math.log10(r);
      p0 = 10 ** p0;
      p0 = Math.min(p0, 2000);
      let dmt = -11.4 + 0.0125 * (p0 - 100 * Math.max(mt - 2.5, 0));
      dmt = 10 ** dmt;
      dmt = 1 * Math.min(dmt, 1.36e-9 * lum);
      dml = Math.max(dml, dmt);
    }
    if (kw > 6) {
      dms = Math.max(dml, 1.0e-13 * o.hewind * lum ** (3 / 2));
    } else {
      dms = Math.max(dml, dms);
      const mew = ((mt - mc) / mt) * Math.min(5, Math.max(1.2, (lum / 7.0e4) ** -0.5));
      // A reduced Wolf–Rayet-like wind when the hydrogen envelope is small
      if (mew < 1) {
        dml = 1.0e-13 * lum ** (3 / 2) * (1 - mew);
        dms = Math.max(dml, dms);
      }
      // LBV-like mass loss beyond the Humphreys–Davidson limit
      const x = 1.0e-5 * r * Math.sqrt(lum);
      if (lum > 6.0e5 && x > 1) {
        dml = 0.1 * (x - 1) ** 3 * (lum / 6.0e5 - 1);
        dms = dms + dml;
      }
    }
  }
  return dms * o.windScale;
}

/** The next time step for changes in radius and mass, and the time left in the phase (deltat.f), Myr. */
function deltat(kw: number, age: number, lm: Landmarks, dtIn: number, o: SseOptions): { dt: number; dtr: number } {
  const { tm, tn, tscls } = lm;
  let dt: number;
  let dtr: number;
  if (kw <= 1) {
    dt = o.pts1 * tm;
    dtr = tm - age;
  } else if (kw === 2) {
    dt = o.pts1 * (tscls[1] - tm);
    dtr = tscls[1] - age;
  } else if (kw === 3) {
    dt = age < tscls[6] ? o.pts2 * (tscls[4] - age) : o.pts2 * (tscls[5] - age);
    dtr = Math.min(tscls[2], tn) - age;
  } else if (kw === 4) {
    dt = o.pts2 * tscls[3];
    dtr = Math.min(tn, tscls[2] + tscls[3]) - age;
  } else if (kw === 5) {
    dt = age < tscls[9] ? o.pts3 * (tscls[7] - age) : o.pts3 * (tscls[8] - age);
    dtr = Math.min(tn, tscls[13]) - age;
  } else if (kw === 6) {
    dt = age < tscls[12] ? o.pts3 * (tscls[10] - age) : o.pts3 * (tscls[11] - age);
    dt = Math.min(dt, 0.005);
    dtr = tn - age;
  } else if (kw === 7) {
    dt = o.pts1 * tm;
    dtr = tm - age;
  } else if (kw === 8 || kw === 9) {
    dt = age < tscls[6] ? o.pts2 * (tscls[4] - age) : o.pts2 * (tscls[5] - age);
    dtr = tn - age;
  } else {
    // Remnants: steps ten times the last, from 0.1 to 500 Myr
    dt = Math.max(0.1, dtIn * 10);
    dt = Math.min(dt, 5.0e2);
    dtr = dt;
  }
  return { dt, dtr };
}

/**
 * Evolves a star of initial mass `mass` (M☉) and metallicity `z` from the zero-age main sequence until `tEnd`
 * (Myr), or until it leaves no remnant. Every step is kept. SSE's formulas are fitted for 0.1–100 M☉ (above 100,
 * SSE holds the formulas at 100) and Z = 0.0001–0.03.
 */
export function evolveStar(mass: number, z: number, tEnd: number, options: Partial<SseOptions> = {}): SseTrack {
  const o: SseOptions = { ...DEFAULTS, ...options };
  const c = zcnsts(z);
  const m = mass;
  const lm = landmarks();
  const steps: SseStep[] = [];
  const types: SseTypeChange[] = [];

  let kw = 1;
  let mt = mass;
  let tphys = 0;
  let epoch = 0;
  let dtm = 0;
  let r = 0;
  let lum = 0;
  let mc = 0;
  let aj = 0;
  let ajhold = 0;
  const tsave = tEnd;

  /** hrdiag on the real mass, age, current mass and type, as the Fortran passes them by reference. */
  const diag = (core: number) => {
    const s: HrState = { mass, aj, mt, kw, mc: core, r: 0, lum: 0, rc: 0, menv: 0, renv: 0, k2: 0 };
    hrdiag(s, lm, c, o);
    mass = s.mass;
    aj = s.aj;
    mt = s.mt;
    kw = s.kw;
    return s;
  };

  for (let j = 1; j <= NV; j++) {
    let dms: number;
    if (o.neta > TINY && j > 1) {
      // Mass lost in the last step
      const dt = 1.0e6 * dtm;
      dms = mlwind(kw, lum, r, mt, mc, z, o) * dt;
      if (kw < 10) {
        const dml = mt - mc;
        if (dml < dms) {
          dtm = (dml / dms) * dtm;
          dms = dml;
        }
      }
    } else {
      dms = 0;
    }
    // At most 1% of the mass in a step
    if (dms > 0.01 * mt) {
      dtm = (0.01 * mt * dtm) / dms;
      dms = 0.01 * mt;
    }

    // Update the mass and time, and reset the epoch of an MS (and perhaps HG) star
    if (dms > 0) {
      mt = mt - dms;
      if (kw <= 2 || kw === 7) {
        const m0 = mass;
        const mc1 = mc;
        mass = mt;
        const tmold = lm.tm;
        const tbgold = lm.tscls[1];
        star(kw, mass, mt, lm, c);
        if (kw === 2) {
          if (lm.GB[9] < mc1 || m0 > c.zpars[3]) {
            mass = m0;
          } else {
            epoch = lm.tm + ((lm.tscls[1] - lm.tm) * (ajhold - tmold)) / (tbgold - tmold);
            epoch = tphys - epoch;
          }
        } else {
          epoch = tphys - (ajhold * lm.tm) / tmold;
        }
      }
    }
    tphys = tphys + dtm;

    // The landmarks, then the radius, luminosity, core mass and type at this age
    aj = tphys - epoch;
    star(kw, mass, mt, lm, c);
    let kwold = kw;
    const s = diag(mc);
    mc = s.mc;
    r = s.r;
    lum = s.lum;
    const { rc, menv, renv } = s;

    // A change of type (SSE also gives a new neutron star or black hole its spin and kick here)
    if (j === 1 || kw !== kwold) {
      if (kw === 15) {
        types.push({ t: tphys, kw, mt: mass });
        break;
      }
      types.push({ t: tphys, kw, mt });
    }

    epoch = tphys - aj;
    steps.push({ t: tphys, kw, mass0: mass, mt, L: lum, R: r, T: T_SUN * (lum / r ** 2) ** 0.25, mc, rc, menv, renv, epoch });

    if (tphys >= tEnd) {
      types.push({ t: tphys, kw, mt });
      break;
    }

    // The radius and age now
    const rm0 = r;
    ajhold = aj;
    if (kw !== kwold) kwold = kw;
    const d = deltat(kw, aj, lm, dtm, o);
    dtm = d.dt;
    const dtr = d.dtr;

    // Will the type change within the step? Check the radius at the end for too big a jump.
    let it = 0;
    const m0 = mass;
    let check = true;
    if (dtr - dtm <= TOL && kw <= 9) {
      aj = Math.max(aj, aj * (1 - EPS) + dtr);
      const trial = diag(mc);
      const dr = trial.r - rm0;
      if (Math.abs(dr) > 0.1 * rm0) {
        dtm = dtr - ajhold * EPS;
        const dtdr = dtm / Math.abs(dr);
        dtm = ALPHA2 * Math.max(trial.r, rm0) * dtdr;
      } else {
        dtm = dtr;
        check = false;
      }
    }
    // Otherwise limit the step to a 10% rise in radius, taking no further mass loss
    while (check) {
      aj = ajhold + dtm;
      const trial = diag(mc);
      const dr = trial.r - rm0;
      it = it + 1;
      if (it === 20 && kw === 4) break;
      if (it > 30) throw new Error(`SSE: no step found that keeps the radius change under 10% (type ${kw}, ${mass} M☉)`);
      if (Math.abs(dr) > 0.1 * rm0) {
        const dtdr = dtm / Math.abs(dr);
        dtm = ALPHA2 * Math.max(rm0, trial.r) * dtdr;
        if (it >= 20) dtm = 0.5 * dtm;
      } else {
        break;
      }
    }

    // Make sure the type hasn't changed during the radius check (rare; HG stars above 50 M☉)
    if (kw !== kwold) {
      kw = kwold;
      mass = m0;
      star(kw, mass, mt, lm, c);
    }

    // The smaller of the timescale and the time left (but more than 100 years)
    dtm = Math.max(dtm, 1.0e-7 * aj);
    dtm = Math.min(dtm, tsave - tphys);
    if (j === NV) throw new Error(`SSE: more than ${NV} steps (${m} M☉)`);
  }
  return { m, z, steps, types };
}
