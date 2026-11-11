/**
 * A pair of stars' lives, ported from evolv2.f of Hurley's BSE (Hurley, Tout &
 * Pols 2002, MNRAS 329, 897): winds and their partial capture, tides, magnetic
 * braking, gravitational radiation, Roche-lobe overflow with its stability and
 * rate, common envelopes, mergers, novae, supernova kicks and the pair coming
 * apart, on top of the SSE port's single-star formulae.
 *
 * The Fortran is a single routine that jumps between labels; this port keeps
 * them (4, 5, 7, 8, 98, 130, 135 and 140) as the states of a loop, and keeps
 * Hurley's names, 1-based arrays (index 0 unused), comments and the order of
 * every sum, so it reads against evolv2.f line by line.
 *
 * Units are BSE's: masses in M☉, radii and separations in R☉, luminosities in
 * L☉, times in Myr (the orbital period tb in years inside, days outside), spins
 * in radians per year, angular momenta in M☉ R☉² per year.
 */
import { DEFAULTS as SSE_DEFAULTS, deltat, mlwind, type SseOptions } from '../sse/evolve';
import { hrdiag, type HrState } from '../sse/hrdiag';
import { landmarks, star } from '../sse/star';
import { vrotf } from '../sse/zfuncs';
import { zcnsts } from '../sse/zcnsts';
import { rocheLobe as rl } from '../../binaries/roche';
import { comenv, type CommonEnvelopeSwitches } from './comenv';
import { corerd, KTYPE as ktype } from './collisions';
import { gntage } from './gntage';
import { kick } from './kick';
import { mix } from './mix';
import { Ran3 } from './ran3';

export interface BseOptions extends SseOptions, CommonEnvelopeSwitches {
  /** Enhancement of the Reimers wind by the companion (Tout & Eggleton 1988); 0 in binary.in. */
  bwind: number;
  /** > 0: tidal circularisation and synchronisation. */
  tflag: number;
  /** The wind's speed squared, as a multiple of the escape speed squared (1/8). */
  beta: number;
  /** The wind-accretion efficiency (1). */
  xi: number;
  /** Bondi–Hoyle's factor for wind accretion (3/2). */
  acc2: number;
  /** The share of accreted mass a nova keeps (0.001). */
  epsnov: number;
  /** Multiplies the Eddington limit for accretion (10 in binary.in; ≥ 10 lets a white dwarf's dynamical transfer all land). */
  eddfac: number;
  /** Angular momentum carried off by mass lost in transfer: γ ≥ 0 a fraction γ of the orbit's; −1 the donor's; −2 the accretor's. */
  gamma: number;
  /** The random seed for kicks (binary.in: 29769). */
  seed: number;
}

/** binary.in's values, as distributed with BSE (the fixtures use these). */
export const BSE_DEFAULTS: BseOptions = {
  ...SSE_DEFAULTS,
  neta: 0.5,
  bwind: 0,
  hewind: 1,
  alpha1: 3,
  lambda: 0.5,
  ceflag: 0,
  tflag: 1,
  ifflag: 0,
  wdflag: 1,
  bhflag: 0,
  nsflag: 1,
  mxns: 3,
  pts1: 0.05,
  pts2: 0.01,
  pts3: 0.02,
  sigma: 190,
  beta: 0.125,
  xi: 1,
  acc2: 1.5,
  epsnov: 0.001,
  eddfac: 10,
  gamma: -1,
  seed: 29769,
};

/** The labels of bse.f's event log (bpp(j,10)). */
export const EVENT_LABELS = [
  '', 'INITIAL', 'KW CHNGE', 'BEG RCHE', 'END RCHE', 'CONTACT', 'COELESCE', 'COMENV', 'GNTAGE', 'NO REMNT', 'MAX TIME',
  'DISRUPT', 'BEG SYMB', 'END SYMB', 'BEG BSS',
] as const;

/** A binary to evolve. */
export interface BinaryInput {
  /** Initial masses, M☉ (BSE's formulae are fitted for 0.1–100). */
  m1: number;
  m2: number;
  /** Orbital period, days (0 for two single stars). */
  period: number;
  ecc: number;
  /** Metallicity, 0.0001–0.03 (0.02 is BSE's solar). */
  z: number;
  /** How long to follow the pair, Myr. */
  tEnd: number;
}

export interface BseResult {
  /** One row per step (or per output interval), bcm(ip,1..32), 1-based: see BCM below. */
  bcm: number[][];
  /** The event log, bpp(jp,1..10), 1-based: time, m1, m2, kw1, kw2, sep, ecc, R1/RL1, R2/RL2, label (EVENT_LABELS). */
  bpp: number[][];
  /** BSE's warnings to unit 99 (mass over 100 M☉, too many steps or interpolations). */
  warnings: string[];
  /** The systemic velocity's components after every kick, km/s. */
  kicks: [number, number, number][];
}

/** bcm's columns (1-based). Star 2's are star 1's + 14 (kw2 = 16, … r2/rl2 = 29). */
export const BCM = {
  t: 1, kw: 2, mass0: 3, mass: 4, logL: 5, logR: 6, logT: 7, mc: 8, rc: 9, menv: 10, renv: 11, epoch: 12, ospin: 13,
  dmdt: 14, rrl: 15, tb: 30, sep: 31, ecc: 32,
} as const;

const LOOP = 20000;
const MCH = 1.44;
const YEARDY = 365.24;
const AURSUN = 214.95;
const ACC1 = 3.920659e8;
const TINY = 1.0e-14;
const K3 = 0.21;
const MR23YR = 0.4311;

/**
 * Evolves a binary from the zero-age main sequence (evolv2.f). dtp is BSE's output interval in Myr: 0 stores every
 * step (as the fixtures do), and a positive dtp also limits the steps so as to land on the output times.
 */
export function evolveBinary(input: BinaryInput, options: Partial<BseOptions> = {}, dtp = 0): BseResult {
  const o: BseOptions = { ...BSE_DEFAULTS, ...options };
  const { neta, beta, xi, acc2, epsnov, eddfac, gamma, tflag } = o;
  const z = input.z;
  const c = zcnsts(z);
  const zpars = c.zpars;
  const ran = new Ran3(o.seed);
  const bcm: number[][] = [];
  const bpp: number[][] = [];
  const warnings: string[] = [];
  const kicks: [number, number, number][] = [];

  // The stars, 1-based (index 0 unused)
  const two = () => [0, 0, 0];
  const kstar = [0, 1, 1];
  const mass0 = [0, input.m1, input.m2];
  const mass = [0, input.m1, input.m2];
  const epoch = [0, 0, 0];
  const ospin = [0, 0, 0];
  const rad = two();
  const lumin = two();
  const massc = two();
  const radc = two();
  const menv = two();
  const renv = two();
  const tms = two();
  const aj = two();
  const aj0 = two();
  const tbgb = two();
  const tkh = two();
  const dtmi = two();
  const mass00 = two();
  const mcxx = two();
  const rol = two();
  const rol0 = two();
  const rdot = two();
  const radx = two();
  const k2str = two();
  const q = two();
  const dms = two();
  const dmr = two();
  const dmt = two();
  const jspin = two();
  const dspint = two();
  const djspint = two();
  const djtx = two();

  let tphys = 0;
  const tphysf = input.tEnd;
  let tb = input.period;
  let ecc = input.ecc;

  // The landmarks, shared by both stars as in the Fortran (star() keeps what it doesn't set)
  const L = landmarks();
  const { tscls } = L;
  let tmsnew = 0;
  /** CALL star(kw, m0, mt, tm, tn, tscls, lums, GB, zpars) */
  const starTm = (kw: number, m0: number, mt: number) => star(kw, m0, mt, L, c);
  /** CALL star(kw, m0, mt, tmsnew, tn, tscls, lums, GB, zpars): everything but tm goes to the shared landmarks. */
  const starNew = (kw: number, m0: number, mt: number) => {
    const tm = L.tm;
    star(kw, m0, mt, L, c);
    tmsnew = L.tm;
    L.tm = tm;
  };
  const diag = (m0: number, age: number, mt: number, kw: number, mc: number): HrState => {
    const s: HrState = { mass: m0, aj: age, mt, kw, mc, r: 0, lum: 0, rc: 0, menv: 0, renv: 0, k2: 0 };
    hrdiag(s, L, c, o);
    return s;
  };

  // Save the initial state
  const mass1i = mass0[1];
  const mass2i = mass0[2];
  const tbi = tb;
  const ecci = ecc;
  const twopi = 2 * Math.acos(-1);

  let kmin = 1;
  let kmax = 2;
  let sgl = false;
  let mt2 = Math.min(mass[1], mass[2]);
  let kst = 0;
  let sep: number;
  let oorb: number;
  let jorb: number;

  if (mt2 < TINY || tb <= 0) {
    sgl = true;
    if (mt2 < TINY) {
      mt2 = 0;
      if (mass[1] < TINY) {
        if (tphys < TINY) {
          mass0[1] = 0.01;
          mass[1] = mass0[1];
          kst = 1;
        } else {
          kmin = 2;
          lumin[1] = 1.0e-10;
          rad[1] = 1.0e-10;
          massc[1] = 0;
          dmt[1] = 0;
          dmr[1] = 0;
        }
        ospin[1] = 1.0e-10;
        jspin[1] = 1.0e-10;
      } else {
        if (tphys < TINY) {
          mass0[2] = 0.01;
          mass[2] = mass0[2];
          kst = 2;
        } else {
          kmax = 1;
          lumin[2] = 1.0e-10;
          rad[2] = 1.0e-10;
          massc[2] = 0;
          dmt[2] = 0;
          dmr[2] = 0;
        }
        ospin[2] = 1.0e-10;
        jspin[2] = 1.0e-10;
      }
    }
    ecc = -1;
    tb = 0;
    sep = 1.0e10;
    oorb = 0;
    jorb = 0;
    if (ospin[1] < 0) ospin[1] = 1.0e-10;
    if (ospin[2] < 0) ospin[2] = 1.0e-10;
    q[1] = 1.0e10;
    q[2] = 1.0e10;
    rol[1] = 1.0e10;
    rol[2] = 1.0e10;
  } else {
    tb = tb / YEARDY;
    sep = AURSUN * (tb * tb * (mass[1] + mass[2])) ** (1 / 3);
    oorb = twopi / tb;
    jorb = ((mass[1] * mass[2]) / (mass[1] + mass[2])) * Math.sqrt(1 - ecc * ecc) * sep * sep * oorb;
    if (ospin[1] < 0) ospin[1] = oorb;
    if (ospin[2] < 0) ospin[2] = oorb;
  }

  for (let k = kmin; k <= kmax; k++) {
    const age = tphys - epoch[k];
    starTm(kstar[k], mass0[k], mass[k]);
    const s = diag(mass0[k], age, mass[k], kstar[k], massc[k]);
    mass0[k] = s.mass;
    mass[k] = s.mt;
    kstar[k] = s.kw;
    aj[k] = s.aj;
    epoch[k] = tphys - s.aj;
    rad[k] = s.r;
    lumin[k] = s.lum;
    massc[k] = s.mc;
    radc[k] = s.rc;
    menv[k] = s.menv;
    renv[k] = s.renv;
    k2str[k] = s.k2;
    tms[k] = L.tm;
    tbgb[k] = tscls[1];
    if (tphys < TINY && ospin[k] <= 0.001) ospin[k] = (45.35 * vrotf(mass[k])) / s.r;
    jspin[k] = ospin[k] * (s.k2 * s.r * s.r * (mass[k] - s.mc) + K3 * s.rc * s.rc * s.mc);
    if (!sgl) {
      q[k] = mass[k] / mass[3 - k];
      rol[k] = rl(q[k]) * sep;
    }
    rol0[k] = rol[k];
    dmr[k] = 0;
    dmt[k] = 0;
    djspint[k] = 0;
    dtmi[k] = 1.0e6;
  }

  if (mt2 < TINY) {
    sep = 0;
    if (kst > 0) {
      mass0[kst] = 0;
      mass[kst] = 0;
      kmin = 3 - kst;
      kmax = kmin;
    }
  }

  // On the first entry the previous time step is zero, to prevent mass loss
  let dtm = 0;
  let delet = 0;
  let djorb = 0;
  let bss = false;

  // Output control
  let tsave = tphys;
  let isave = true;
  let iplot = false;
  if (dtp <= 0) {
    iplot = true;
    isave = false;
    tsave = tphysf;
  } else if (dtp > tphysf) {
    isave = false;
    tsave = tphysf;
  }

  // Locals of the Fortran that keep their values between labels
  let iter = 0;
  let intpol = 0;
  let inttry = false;
  let change = false;
  let prec = false;
  let snova = false;
  let coel = false;
  let com = false;
  let bsymb = false;
  let esymb = false;
  let tphys0 = 0;
  let tphys00 = 0;
  let dtm0 = 0;
  let ecc1 = 0;
  let j1 = 1;
  let j2 = 2;
  let dm1 = 0;
  let dm2 = 0;
  let dm22 = 0;
  let dt = 0;
  let eqspin!: number;
  let djtt!: number;
  let km!: number;
  let km0 = 0;
  let dme!: number;
  let supedd!: boolean;
  let novae!: boolean;
  let disk!: boolean;
  let rmin!: number;
  let tdyn!: number;
  let taum!: number;
  let qc!: number;
  let kw1!: number;
  let kw2!: number;

  const logBpp = (label: number) => {
    bpp.push([0, tphys, mass[1], mass[2], kstar[1], kstar[2], sep, ecc, rad[1] / rol[1], rad[2] / rol[2], label]);
  };
  /** One bcm row; dmdt1 and dmdt2 (columns 14 and 28) are given by the caller. */
  const saveBcm = (dmdt1: number, dmdt2: number) => {
    const row = new Array<number>(33).fill(0);
    row[1] = tphys;
    for (let k = 1; k <= 2; k++) {
      const b = (k - 1) * 14;
      row[b + 2] = kstar[k];
      row[b + 3] = mass0[k];
      row[b + 4] = mass[k];
      row[b + 5] = Math.log10(lumin[k]);
      row[b + 6] = Math.log10(rad[k]);
      const teff = 1000 * ((1130 * lumin[k]) / rad[k] ** 2) ** (1 / 4);
      row[b + 7] = Math.log10(teff);
      row[b + 8] = massc[k];
      row[b + 9] = radc[k];
      row[b + 10] = menv[k];
      row[b + 11] = renv[k];
      row[b + 12] = epoch[k];
      row[b + 13] = ospin[k];
      row[b + 15] = rad[k] / rol[k];
    }
    row[14] = dmdt1;
    row[28] = dmdt2;
    row[30] = tb;
    row[31] = sep;
    row[32] = ecc;
    bcm.push(row);
    if (isave) tsave = tsave + dtp;
  };
  /** The mass-transfer rates of the RLOF loop's bcm rows. */
  const rlofRates = (): [number, number] => {
    const d = Math.max(dtm, 1.0e-12) * 1.0e6;
    if (j1 === 1) return [(-1.0 * dm1 - dms[1]) / d, (dm2 - dms[2]) / d];
    return [(dm2 - dms[1]) / d, (-1.0 * dm1 - dms[2]) / d];
  };
  const doKick = (kw: number, k: number, mt: number, single: boolean) => {
    const orbit = single ? { ecc: 0, sep: -1, jorb: 0 } : { ecc, sep, jorb };
    const vs = kick(kw, mass[k], mt, single ? 0 : mass[3 - k], orbit, o, ran);
    kicks.push(vs);
    if (!single) ({ ecc, sep, jorb } = orbit);
  };

  type Label = 4 | 5 | 7 | 8 | 98 | 130 | 135 | 140;
  let label: Label = tphys >= tphysf ? 140 : 4;

  for (;;) {
    switch (label) {
      case 4: {
        iter = 0;
        intpol = 0;
        inttry = false;
        change = false;
        prec = false;
        snova = false;
        coel = false;
        com = false;
        bsymb = false;
        esymb = false;
        tphys0 = tphys;
        ecc1 = ecc;
        j1 = 1;
        j2 = 2;
        if (kstar[1] >= 10 && kstar[1] <= 14) dtmi[1] = 0.01;
        if (kstar[2] >= 10 && kstar[2] <= 14) dtmi[2] = 0.01;
        dm1 = 0;
        dm2 = 0;
        label = 5;
        break;
      }

      case 5: {
        kw1 = kstar[1];
        kw2 = kstar[2];
        dt = 1.0e6 * dtm;
        eqspin = 0;
        djtt = 0;

        if (intpol === 0 && Math.abs(dtm) > TINY && !sgl) {
          const vorb2 = (ACC1 * (mass[1] + mass[2])) / sep;
          const ivsqm = 1 / Math.sqrt(1 - ecc * ecc);
          for (let k = 1; k <= 2; k++) {
            // Wind mass loss from the previous step
            if (neta > TINY) {
              const rlperi = rol[k] * (1 - ecc);
              dmr[k] = mlwind(kstar[k], lumin[k], rad[k], mass[k], massc[k], z, o, rlperi);
              // How much of the companion's wind is accreted (Boffin & Jorissen 1988)
              const vwind2 = (2 * beta * ACC1 * mass[k]) / rad[k];
              const omv2 = (1 + vorb2 / vwind2) ** (3 / 2);
              dmt[3 - k] = (ivsqm * acc2 * dmr[k] * ((ACC1 * mass[3 - k]) / vwind2) ** 2) / (2 * sep * sep * omv2);
              dmt[3 - k] = Math.min(dmt[3 - k], 0.8 * dmr[k]);
            } else {
              dmr[k] = 0;
              dmt[3 - k] = 0;
            }
          }

          // Symbiotic-type stars
          if (neta > TINY && !esymb) {
            let lacc = (3.14e7 * mass[j2] * dmt[j2]) / rad[j2];
            lacc = lacc / lumin[j1];
            if ((lacc > 0.01 && !bsymb) || (lacc < 0.01 && bsymb)) {
              if (bsymb) {
                logBpp(13);
                esymb = true;
              } else {
                logBpp(12);
                bsymb = true;
              }
            }
          }

          // The orbital angular momentum the winds take away
          const ecc2 = ecc * ecc;
          const omecc2 = 1 - ecc2;
          const sqome2 = Math.sqrt(omecc2);
          djorb =
            (((dmr[1] + q[1] * dmt[1]) * mass[2] * mass[2] + (dmr[2] + q[2] * dmt[2]) * mass[1] * mass[1]) * sep * sep * sqome2 * oorb) /
            (mass[1] + mass[2]) ** 2;
          delet = ecc * (dmt[1] * (0.5 / mass[1] + 1 / (mass[1] + mass[2])) + dmt[2] * (0.5 / mass[2] + 1 / (mass[1] + mass[2])));

          // Gravitational radiation, for very close pairs
          if (sep <= 10) {
            let djgr = (8.315e-10 * mass[1] * mass[2] * (mass[1] + mass[2])) / (sep * sep * sep * sep);
            const f1 = 19 / 6 + (121 / 96) * ecc2;
            const sqome5 = sqome2 ** 5;
            const delet1 = (djgr * ecc * f1) / sqome5;
            djgr = (djgr * jorb * (1 + 0.875 * ecc2)) / sqome5;
            djorb = djorb + djgr;
            delet = delet + delet1;
          }

          for (let k = 1; k <= 2; k++) {
            // The change in each star's own spin
            djtx[k] = (2 / 3) * xi * dmt[k] * rad[3 - k] * rad[3 - k] * ospin[3 - k];
            djspint[k] = (2 / 3) * (dmr[k] * rad[k] * rad[k] * ospin[k]) - djtx[k];

            // Magnetic braking for stars with appreciable convective envelopes (not fully convective MS stars)
            if (mass[k] > 0.35 && kstar[k] < 10) {
              const djmb = (5.83e-16 * menv[k] * (rad[k] * ospin[k]) ** 3) / mass[k];
              djspint[k] = djspint[k] + djmb;
              // At most a 3% change in the star's angular momentum from braking
              if (djmb > TINY) {
                const dtj = (0.03 * jspin[k]) / Math.abs(djmb);
                dt = Math.min(dt, dtj);
              }
            }

            // Tides: circularisation, orbital shrinkage and spin-up
            dspint[k] = 0;
            if (((kstar[k] <= 9 && rad[k] >= 0.01 * rol[k]) || (kstar[k] >= 10 && k === j1)) && tflag > 0) {
              const raa2 = (rad[k] / sep) ** 2;
              const raa6 = raa2 ** 3;
              // Hut's polynomials
              const f5 = 1 + ecc2 * (3 + ecc2 * 0.375);
              const f4 = 1 + ecc2 * (1.5 + ecc2 * 0.125);
              const f3 = 1 + ecc2 * (3.75 + ecc2 * (1.875 + ecc2 * 7.8125e-2));
              const f2 = 1 + ecc2 * (7.5 + ecc2 * (5.625 + ecc2 * 0.3125));
              let tcqr: number;
              let rg2: number;
              if ((kstar[k] === 1 && mass[k] >= 1.25) || kstar[k] === 4 || kstar[k] === 7) {
                // Radiative damping (Zahn 1975, 1977)
                const tc = 1.592e-9 * mass[k] ** 2.84;
                const f = 1.9782e4 * Math.sqrt((mass[k] * rad[k] * rad[k]) / sep ** 5) * tc * (1 + q[3 - k]) ** (5 / 6);
                tcqr = f * q[3 - k] * raa6;
                rg2 = k2str[k];
              } else if (kstar[k] <= 9) {
                // Convective damping (Hut 1981)
                const tc = MR23YR * ((menv[k] * renv[k] * (rad[k] - 0.5 * renv[k])) / (3 * lumin[k])) ** (1 / 3);
                const ttid = twopi / (1.0e-10 + Math.abs(oorb - ospin[k]));
                const f = Math.min(1, ttid / (2 * tc) ** 2);
                tcqr = (2 * f * q[3 - k] * raa6 * menv[k]) / (21 * tc * mass[k]);
                rg2 = (k2str[k] * (mass[k] - massc[k])) / mass[k];
              } else {
                // Degenerate damping (Campbell 1984)
                const f = 7.33e-9 * (lumin[k] / mass[k]) ** (5 / 7);
                tcqr = (f * q[3 - k] * q[3 - k] * raa2 * raa2) / (1 + q[3 - k]);
                rg2 = K3;
              }
              // Circularisation
              const sqome3 = sqome2 ** 3;
              const delet1 =
                27 * tcqr * (1 + q[3 - k]) * raa2 * (ecc / sqome2 ** 13) * (f3 - ((11 / 18) * sqome3 * f4 * ospin[k]) / oorb);
              delet = delet + delet1;
              // Spin-up of the star
              dspint[k] = ((3 * q[3 - k] * tcqr) / (rg2 * omecc2 ** 6)) * (f2 * oorb - sqome3 * f5 * ospin[k]);
              // The equilibrium spin, at which no angular momentum is transferred
              eqspin = (oorb * f2) / (sqome3 * f5);
              // The star's change in angular momentum from tides
              const djt = (k2str[k] * (mass[k] - massc[k]) * rad[k] * rad[k] + K3 * massc[k] * radc[k] * radc[k]) * dspint[k];
              if (kstar[k] <= 6 || Math.abs(djt) / jspin[k] > 0.1) djtt = djtt + djt;
            }
          }

          // At most a 2% change in the orbit's angular momentum
          djtt = djtt + djorb;
          if (Math.abs(djtt) > TINY) {
            const dtj = (0.02 * jorb) / Math.abs(djtt);
            dt = Math.min(dt, dtj);
          }
          dtm = dt / 1.0e6;
        } else if (Math.abs(dtm) > TINY && sgl) {
          for (let k = kmin; k <= kmax; k++) {
            if (neta > TINY) {
              const rlperi = 0;
              dmr[k] = mlwind(kstar[k], lumin[k], rad[k], mass[k], massc[k], z, o, rlperi);
            } else {
              dmr[k] = 0;
            }
            dmt[k] = 0;
            djspint[k] = (2 / 3) * dmr[k] * rad[k] * rad[k] * ospin[k];
            if (mass[k] > 0.35 && kstar[k] < 10) {
              const djmb = (5.83e-16 * menv[k] * (rad[k] * ospin[k]) ** 3) / mass[k];
              djspint[k] = djspint[k] + djmb;
              if (djmb > TINY) {
                const dtj = (0.03 * jspin[k]) / Math.abs(djmb);
                dt = Math.min(dt, dtj);
              }
            }
          }
          dtm = dt / 1.0e6;
        }

        for (let k = kmin; k <= kmax; k++) {
          dms[k] = (dmr[k] - dmt[k]) * dt;
          if (kstar[k] < 10) {
            let dml = mass[k] - massc[k];
            if (dml < dms[k]) {
              dml = Math.max(dml, 2 * TINY);
              dtm = (dml / dms[k]) * dtm;
              if (k === 2) dms[1] = (dms[1] * dml) / dms[2];
              dms[k] = dml;
              dt = 1.0e6 * dtm;
            }
            // At most 1% of the mass in a step
            if (dms[k] > 0.01 * mass[k]) {
              dtm = (0.01 * mass[k] * dtm) / dms[k];
              if (k === 2) dms[1] = (dms[1] * 0.01 * mass[2]) / dms[2];
              dms[k] = 0.01 * mass[k];
              dt = 1.0e6 * dtm;
            }
          }
        }

        // Update the mass and spin (not past the equilibrium), and reset the epoch of an MS (and perhaps HG) star
        for (let k = kmin; k <= kmax; k++) {
          if (eqspin > 0 && Math.abs(dspint[k]) > TINY) {
            if (intpol === 0) {
              if (dspint[k] >= 0) dspint[k] = Math.min(dspint[k], (eqspin - ospin[k]) / dt);
              else dspint[k] = Math.max(dspint[k], (eqspin - ospin[k]) / dt);
              const djt = (k2str[k] * (mass[k] - massc[k]) * rad[k] * rad[k] + K3 * massc[k] * radc[k] * radc[k]) * dspint[k];
              djorb = djorb + djt;
              djspint[k] = djspint[k] - djt;
            }
          }

          jspin[k] = Math.max(1.0e-10, jspin[k] - djspint[k] * dt);

          // Not beyond break-up
          const ospbru = twopi * Math.sqrt((mass[k] * AURSUN ** 3) / rad[k] ** 3);
          const jspbru = (k2str[k] * (mass[k] - massc[k]) * rad[k] * rad[k] + K3 * massc[k] * radc[k] * radc[k]) * ospbru;
          if (jspin[k] > jspbru && Math.abs(dtm) > TINY) jspin[k] = jspbru;

          if (Math.abs(dms[k]) > TINY) {
            mass[k] = mass[k] - dms[k];
            if (kstar[k] <= 2 || kstar[k] === 7) {
              const m0 = mass0[k];
              mass0[k] = mass[k];
              starTm(kstar[k], mass0[k], mass[k]);
              if (kstar[k] === 2) {
                if (L.GB[9] < massc[k] || m0 > zpars[3]) {
                  mass0[k] = m0;
                } else {
                  epoch[k] = L.tm + ((tscls[1] - L.tm) * (aj[k] - tms[k])) / (tbgb[k] - tms[k]);
                  epoch[k] = tphys - epoch[k];
                }
              } else {
                epoch[k] = tphys - (aj[k] * L.tm) / tms[k];
              }
            }
          }
        }

        if (!sgl) {
          ecc1 = ecc1 - delet * dt;
          ecc = Math.max(ecc1, 0);
          if (ecc < 1.0e-10) ecc = 0;
          if (ecc >= 1) {
            label = 135;
            break;
          }
          jorb = jorb - djorb * dt;
          sep = ((mass[1] + mass[2]) * jorb * jorb) / ((mass[1] * mass[2] * twopi) ** 2 * AURSUN ** 3 * (1 - ecc * ecc));
          tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mass[1] + mass[2])));
          oorb = twopi / tb;
        }

        // Advance the time
        if (intpol === 0) {
          tphys0 = tphys;
          dtm0 = dtm;
        }
        tphys = tphys + dtm;

        let exceeded = false;
        let disrupted = false;
        for (let k = kmin; k <= kmax; k++) {
          // The star's parameters at its apparent age
          const age0 = tphys - epoch[k];
          aj0[k] = age0;
          let mc = massc[k];
          if (intpol === 0) mcxx[k] = mc;
          if (intpol > 0) mc = mcxx[k];
          mass00[k] = mass0[k];
          // Masses over 100 M☉ shouldn't be trusted in the formulae
          if (mass[k] > 100) {
            warnings.push(` MASS EXCEEDED ${mass1i} ${mass2i} ${tbi} ${ecci} ${mass[k]}`);
            exceeded = true;
            break;
          }
          starTm(kstar[k], mass0[k], mass[k]);
          const s = diag(mass0[k], age0, mass[k], kstar[k], mc);
          const { kw, mt, r: rm, lum, rc, menv: me, renv: re, k2 } = s;
          const age = s.aj;
          const m0 = s.mass;
          mc = s.mc;

          if (kw !== 15) ospin[k] = jspin[k] / (k2 * (mt - mc) * rm * rm + K3 * mc * rc * rc);

          // There may have been a supernova
          if (kw !== kstar[k] && kstar[k] <= 12 && (kw === 13 || kw === 14)) {
            if (sgl) {
              doKick(kw, k, mt, true);
            } else {
              doKick(kw, k, mt, false);
              if (ecc > 1) {
                kstar[k] = kw;
                mass[k] = mt;
                epoch[k] = tphys - age;
                disrupted = true;
                break;
              }
              tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mt + mass[3 - k])));
              oorb = twopi / tb;
            }
            snova = true;
          }

          if (kw !== kstar[k]) {
            change = true;
            mass[k] = mt;
            dtmi[k] = 0.01;
            if (kw === 15) {
              kstar[k] = kw;
              disrupted = true;
              break;
            }
            mass0[k] = m0;
            epoch[k] = tphys - age;
            if (kw > 6 && kstar[k] <= 6) {
              bsymb = false;
              esymb = false;
            }
          }

          // A new neutron star or black hole spins once a second
          if (kstar[k] === 13 || kstar[k] === 14) {
            if (tphys - epoch[k] < TINY) {
              ospin[k] = 2.0e8;
              jspin[k] = K3 * rc * rc * mc * ospin[k];
            }
          }

          // The radius's rate of change, for interpolating later
          if (Math.abs(dtm) > TINY) rdot[k] = Math.abs(rm - rad[k]) / dtm;
          else rdot[k] = 0;

          // The next time step for changes in radius and mass, by stellar type
          const d = deltat(kw, age, L, dtmi[k], o);
          dt = d.dt;
          dtmi[k] = Math.min(d.dt, d.dtr);

          aj[k] = age;
          kstar[k] = kw;
          rad[k] = rm;
          lumin[k] = lum;
          massc[k] = mc;
          radc[k] = rc;
          menv[k] = me;
          renv[k] = re;
          k2str[k] = k2;
          tms[k] = L.tm;
          tbgb[k] = tscls[1];

          // A blue straggler?
          if (kw <= 1 && L.tm < tphys && !bss) {
            bss = true;
            logBpp(14);
          }
        }
        if (exceeded) {
          label = 140;
          break;
        }
        if (disrupted) {
          label = 135;
          break;
        }

        if (!sgl) {
          // The mass ratios, the Roche lobes and the radius's rate of change relative to the lobe
          for (let k = 1; k <= 2; k++) q[k] = mass[k] / mass[3 - k];
          for (let k = 1; k <= 2; k++) {
            rol[k] = rl(q[k]) * sep;
            if (Math.abs(dtm) > TINY) {
              rdot[k] = rdot[k] + (rol[k] - rol0[k]) / dtm;
              rol0[k] = rol[k];
            }
          }
        } else {
          for (let k = kmin; k <= kmax; k++) rol[k] = 10000 * rad[k];
        }

        if ((tphys < TINY && Math.abs(dtm) < TINY && (mass2i < 0.1 || !sgl)) || snova) {
          if (snova) {
            logBpp(2);
            dtm = 0;
            label = 4;
            break;
          }
          logBpp(1);
        }

        if ((isave && tphys >= tsave) || iplot) {
          if (sgl || (rad[1] < rol[1] && rad[2] < rol[2]) || tphys < TINY) saveBcm(dmt[1] - dmr[1], dmt[2] - dmr[2]);
        }

        // If not interpolating, the next time step
        if (intpol === 0) {
          dtm = Math.max(1.0e-7 * tphys, Math.min(dtmi[1], dtmi[2]));
          dtm = Math.min(dtm, tsave - tphys);
          if (iter === 0) dtm0 = dtm;
        }
        if (sgl) {
          label = 98;
          break;
        }

        // j1 is the donor (the primary) and j2 the accretor (the secondary)
        if (intpol === 0) {
          if (rad[1] / rol[1] >= rad[2] / rol[2]) {
            j1 = 1;
            j2 = 2;
          } else {
            j1 = 2;
            j2 = 1;
          }
        }

        // Has Roche-lobe overflow begun?
        if (rad[j1] > rol[j1]) {
          // Interpolate back until the primary just fills its Roche lobe
          if (rad[j1] >= 1.002 * rol[j1]) {
            if (intpol === 0) tphys00 = tphys;
            intpol = intpol + 1;
            if (iter === 0 || inttry) {
              label = 7;
              break;
            }
            if (intpol >= 100) {
              warnings.push(` INTPOL EXCEEDED ${mass1i} ${mass2i} ${tbi} ${ecci}`);
              label = 140;
              break;
            }
            const dr = rad[j1] - 1.001 * rol[j1];
            if (Math.abs(rdot[j1]) < TINY || prec) {
              label = 7;
              break;
            }
            dtm = -dr / Math.abs(rdot[j1]);
            if (Math.abs(tphys0 - tphys) > TINY) dtm = Math.max(dtm, tphys0 - tphys);
            if (kstar[1] !== kw1) {
              kstar[1] = kw1;
              mass0[1] = mass00[1];
              epoch[1] = tphys - aj0[1];
            }
            if (kstar[2] !== kw2) {
              kstar[2] = kw2;
              mass0[2] = mass00[2];
              epoch[2] = tphys - aj0[2];
            }
            change = false;
          } else {
            // Enter Roche-lobe overflow
            label = tphys >= tphysf ? 140 : 7;
            break;
          }
        } else if (intpol > 0) {
          // Already interpolating
          intpol = intpol + 1;
          if (intpol >= 80) inttry = true;
          if (Math.abs(rdot[j1]) < TINY) {
            prec = true;
            dtm = 1.0e-7 * tphys;
          } else {
            const dr = rad[j1] - 1.001 * rol[j1];
            dtm = -dr / Math.abs(rdot[j1]);
          }
          if (tphys + dtm >= tphys00) {
            // Most likely a heavy type 4, whose radius can change very sharply
            dtm = 0.5 * (tphys00 - tphys0);
            dtm = Math.max(dtm, 1.0e-10);
            prec = true;
          }
          tphys0 = tphys;
        }

        // A collision at periastron?
        const pd = sep * (1 - ecc);
        if (pd < rad[1] + rad[2] && intpol === 0) {
          label = 130;
          break;
        }
        label = 98;
        break;
      }

      case 98: {
        // Back for the next step or interpolation
        if (tphys >= tphysf && intpol === 0) {
          label = 140;
          break;
        }
        if (change) {
          change = false;
          logBpp(2);
        }
        iter = iter + 1;
        if (iter >= LOOP) {
          warnings.push(` MAXIMUM ITER EXCEEDED ${mass1i} ${mass2i} ${tbi} ${ecci}`);
          label = 140;
          break;
        }
        label = 5;
        break;
      }

      case 7: {
        // The nuclear timescale in years and the slow-down factor
        km0 = (dtm0 * 1.0e3) / tb;
        if (km0 < TINY) km0 = 0.5;
        iter = 0;
        coel = false;
        change = false;
        radx[j1] = Math.max(radc[j1], rol[j1]);
        radx[j2] = rad[j2];
        logBpp(3);
        if (iplot && tphys > TINY) saveBcm(0.0, 0.0);
        label = 8;
        break;
      }

      case 8: {
        // The Eddington limit for accretion onto the secondary in one orbit
        dme = 2.08e-3 * eddfac * (1 / (1 + zpars[11])) * rad[j2] * tb;
        supedd = false;
        novae = false;
        disk = false;

        // A disc, or a stream hitting the secondary? (Ulrich & Burger 1976, fitted to Lubow & Shu 1974)
        rmin = 0.0425 * sep * (q[j2] * (1 + q[j2])) ** (1 / 4);
        if (rmin > rad[j2]) disk = true;

        // Kelvin–Helmholtz times from the modified classical expression
        for (let k = 1; k <= 2; k++) {
          tkh[k] = (1.0e7 * mass[k]) / (rad[k] * lumin[k]);
          if (kstar[k] <= 1 || kstar[k] === 7 || kstar[k] >= 10) tkh[k] = tkh[k] * mass[k];
          else tkh[k] = tkh[k] * (mass[k] - massc[k]);
        }

        // The primary's dynamical timescale
        tdyn = 5.05e-5 * Math.sqrt(rad[j1] ** 3 / mass[j1]);

        // The critical mass ratios
        if (kstar[j1] === 2) {
          qc = 4;
        } else if (kstar[j1] === 3 || kstar[j1] === 5 || kstar[j1] === 6) {
          // Hjellming & Webbink 1987 (0.362 is a single-precision constant in the Fortran)
          qc = Math.fround(0.362) + 1.0 / (3.0 * (1.0 - massc[j1] / mass[j1]));
        } else if (kstar[j1] === 8 || kstar[j1] === 9) {
          qc = 0.784;
        } else {
          qc = 3;
        }

        if (kstar[j1] === 0 && q[j1] > 0.695) {
          // Dynamical mass transfer, like a common envelope; the result is always a single star in *2
          taum = Math.sqrt(tkh[j1] * tdyn);
          dm1 = mass[j1];
          if (kstar[j2] <= 1) {
            // Accretion limited to the secondary's thermal timescale
            dm2 = (taum / tkh[j2]) * dm1;
            mass[j2] = mass[j2] + dm2;
            // Rejuvenated if still on the main sequence
            mass0[j2] = mass[j2];
            starNew(kstar[j2], mass0[j2], mass[j2]);
            // Without a convective core the effective age falls; with one it falls further
            if (mass[j2] < 0.35 || mass[j2] > 1.25) aj[j2] = (((tmsnew / tms[j2]) * aj[j2] * (mass[j2] - dm2)) / mass[j2]);
            else aj[j2] = (tmsnew / tms[j2]) * aj[j2];
            epoch[j2] = tphys - aj[j2];
          } else if (kstar[j2] <= 6) {
            // All of it into the giant's envelope
            dm2 = dm1;
            mass[j2] = mass[j2] + dm2;
            if (kstar[j2] === 2) {
              mass0[j2] = mass[j2];
              starNew(kstar[j2], mass0[j2], mass[j2]);
              aj[j2] = tmsnew + (tscls[1] * (aj[j2] - tms[j2])) / tbgb[j2];
              epoch[j2] = tphys - aj[j2];
            }
          } else if (kstar[j2] <= 12) {
            // A new giant envelope
            dm2 = dm1;
            kst = ktype[kstar[j1]][kstar[j2]];
            if (kst > 100) kst = kst - 100;
            if (kst === 4) {
              aj[j2] = aj[j2] / tms[j2];
              massc[j2] = mass[j2];
            }
            // Planets or low-mass white dwarfs?
            if ((kstar[j2] === 10 && mass[j2] < 0.05) || (kstar[j2] >= 11 && mass[j2] < 0.5)) {
              kst = kstar[j1];
              mass[j1] = mass[j2] + dm2;
              mass[j2] = 0;
            } else {
              mass[j2] = mass[j2] + dm2;
              const g = { mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] };
              gntage(g, mass[j2], c);
              ({ mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] } = g);
              epoch[j2] = tphys - aj[j2];
            }
            kstar[j2] = kst;
          } else {
            // A neutron star or black hole accretes at the Eddington rate (the Fortran also flags supedd, unused after the jump)
            dm2 = Math.min((dme * taum) / tb, dm1);
            mass[j2] = mass[j2] + dm2;
          }
          coel = true;
          if (mass[j2] > 0) {
            mass[j1] = 0;
            kstar[j1] = 15;
          } else {
            kstar[j1] = kstar[j2];
            kstar[j2] = 15;
          }
          label = 135;
          break;
        } else if (
          ((Math.abs(Math.abs(2 * kstar[j1] - 11) - 3) === 2 || kstar[j1] === 9) && (q[j1] > qc || radx[j1] <= radc[j1])) ||
          (kstar[j1] === 2 && q[j1] > qc) ||
          (kstar[j1] === 4 && q[j1] > qc)
        ) {
          // Common-envelope evolution
          const m1ce = mass[j1];
          const m2ce = mass[j2];
          const ce = commonEnvelope(j1, j2);
          logBppCe();
          epoch[j1] = tphys - aj[j1];
          if (ce.coel) {
            com = true;
            label = 135;
            break;
          }
          epoch[j2] = tphys - aj[j2];
          if (ecc > 1) {
            spinRemnantsAfterCe();
            label = 135;
            break;
          }
          // The next step without changing the time
          dm1 = m1ce - mass[j1];
          dm2 = mass[j2] - m2ce;
          dm22 = dm2;
          dtm = 0;
          // The orbit, as the separation may have changed
          tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mass[1] + mass[2])));
          oorb = twopi / tb;
        } else if (kstar[j1] >= 10 && kstar[j1] <= 12 && q[j1] > 0.628) {
          // Dynamical transfer from a white dwarf; the secondary has kw > 9
          taum = Math.sqrt(tkh[j1] * tdyn);
          dm1 = mass[j1];
          if (eddfac < 10) {
            // (the Fortran also flags supedd here, unused after the jump)
            dm2 = Math.min((dme * taum) / tb, dm1);
          } else {
            dm2 = dm1;
          }
          mass[j2] = mass[j2] + dm2;
          if (kstar[j1] === 10 && kstar[j2] === 10) {
            // Helium ignites and destroys the star
            kstar[j2] = 15;
            mass[j2] = 0;
          } else if (kstar[j1] === 10 || kstar[j2] === 10) {
            // Helium onto a CO or ONe core swells into a giant envelope: a helium giant
            kst = 9;
            if (kstar[j2] === 10) massc[j2] = dm2;
            const g = { mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] };
            gntage(g, mass[j2], c);
            ({ mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] } = g);
            kstar[j2] = kst;
            epoch[j2] = tphys - aj[j2];
          } else if (kstar[j2] <= 12) {
            mass0[j2] = mass[j2];
            // ONe and CO mixed make ONe
            if (kstar[j1] === 12 && kstar[j2] === 11) kstar[j2] = 12;
          }
          kstar[j1] = 15;
          mass[j1] = 0;
          // A supernova may destroy the system
          if (kstar[j2] <= 11 && mass[j2] > MCH) {
            kstar[j2] = 15;
            mass[j2] = 0;
          }
          coel = true;
          label = 135;
          break;
        } else if (kstar[j1] === 13) {
          // A gamma-ray burster?
          dm1 = mass[j1];
          mass[j1] = 0;
          kstar[j1] = 15;
          dm2 = dm1;
          mass[j2] = mass[j2] + dm2;
          kstar[j2] = 14;
          coel = true;
          label = 135;
          break;
        } else if (kstar[j1] === 14) {
          // Both stars are black holes: they merge quietly
          dm1 = mass[j1];
          mass[j1] = 0;
          kstar[j1] = 15;
          dm2 = dm1;
          mass[j2] = mass[j2] + dm2;
          coel = true;
          label = 135;
          break;
        } else {
          // Mass transfer in one orbit
          dm1 = 3.0e-6 * tb * Math.log(rad[j1] / rol[j1]) ** 3 * Math.min(mass[j1], 5) ** 2;
          if (kstar[j1] === 2) {
            const mew = (mass[j1] - massc[j1]) / mass[j1];
            dm1 = Math.max(mew, 0.01) * dm1;
          } else if (kstar[j1] >= 10) {
            dm1 = (dm1 * 1.0e3 * mass[j1]) / Math.max(rad[j1], 1.0e-4);
          }
          kst = kstar[j2];

          // The thermal rate for the remaining giant-like stars, the dynamical rate for all others
          if (kstar[j1] >= 2 && kstar[j1] <= 9 && kstar[j1] !== 7) {
            dm1 = Math.min(dm1, (mass[j1] * tb) / tkh[j1]);
          } else if (rad[j1] > 10 * rol[j1] || (kstar[j1] <= 1 && kstar[j2] <= 1 && q[j1] > qc)) {
            // The stars merge, with the product in *1
            const m1ce = mass[j1];
            const m2ce = mass[j2];
            const p = { m0: mass0, m: mass, aj, ks: kstar };
            mix(p, c, o.mxns);
            dm1 = m1ce - mass[j1];
            dm2 = mass[j2] - m2ce;
            // The next step without changing the time
            dtm = 0;
            epoch[1] = tphys - aj[1];
            coel = true;
            label = 135;
            break;
          } else {
            dm1 = Math.min(dm1, (mass[j1] * tb) / tdyn);
          }

          // Both stars' winds during one orbit
          const vorb2 = (ACC1 * (mass[1] + mass[2])) / sep;
          const ivsqm = 1 / Math.sqrt(1 - ecc * ecc);
          for (let k = 1; k <= 2; k++) {
            if (neta > TINY) {
              const rlperi = rol[k] * (1 - ecc);
              dmr[k] = mlwind(kstar[k], lumin[k], radx[k], mass[k], massc[k], z, o, rlperi);
              const vwind2 = (2 * beta * ACC1 * mass[k]) / radx[k];
              const omv2 = (1 + vorb2 / vwind2) ** (3 / 2);
              dmt[3 - k] = (ivsqm * acc2 * dmr[k] * ((ACC1 * mass[3 - k]) / vwind2) ** 2) / (2 * sep * sep * omv2);
              dmt[3 - k] = Math.min(dmt[3 - k], dmr[k]);
            } else {
              dmr[k] = 0;
              dmt[3 - k] = 0;
            }
          }
          for (let k = 1; k <= 2; k++) dms[k] = (dmr[k] - dmt[k]) * tb;

          // A step of 0.5% relative mass loss, but at most twice the last; km orbits a step
          km = Math.min(2 * km0, 5.0e-3 / Math.max(Math.abs(dm1 + dms[j1]) / mass[j1], dms[j2] / mass[j2]));
          km0 = km;
          dt = km * tb;
          dtm = dt / 1.0e6;
          // The stellar evolution's step too, but not too restrictive for long-lived phases
          if (iter <= 1000) dtm = Math.min(dtm, dtmi[1], dtmi[2]);
          dtm = Math.min(dtm, tsave - tphys);
          dt = dtm * 1.0e6;
          km = dt / tb;

          // How much the secondary accretes, and how much leaves the system
          taum = (mass[j2] / dm1) * tb;
          let goto135 = false;
          if (kstar[j2] <= 2 || kstar[j2] === 4) {
            // Limited by the secondary's thermal timescale
            dm2 = Math.min(1, (10 * taum) / tkh[j2]) * dm1;
          } else if (kstar[j2] >= 7 && kstar[j2] <= 9) {
            // A naked helium star swells up into a core-helium burner or TPAGB star, unless the primary is a helium star too
            if (kstar[j1] >= 7) {
              dm2 = Math.min(1, (10 * taum) / tkh[j2]) * dm1;
            } else {
              dm2 = dm1;
              const dmchk = dm2 - 1.05 * dms[j2];
              if (dmchk > 0 && dm2 / mass[j2] > 1.0e-4) {
                kst = Math.min(6, 2 * kstar[j2] - 10);
                let mcx: number;
                if (kst === 4) {
                  aj[j2] = aj[j2] / tms[j2];
                  mcx = mass[j2];
                } else {
                  mcx = massc[j2];
                }
                mt2 = mass[j2] + km * (dm2 - dms[j2]);
                const g = { mc: mcx, kw: kst, m0: mass0[j2], aj: aj[j2] };
                gntage(g, mt2, c);
                ({ kw: kst, m0: mass0[j2], aj: aj[j2] } = g);
                epoch[j2] = tphys + dtm - aj[j2];
                logBppNewGiant(mt2);
              }
            }
          } else if (kstar[j1] <= 6 && kstar[j2] >= 10 && kstar[j2] <= 12) {
            // A white-dwarf secondary
            if (dm1 / tb < 2.71e-7) {
              if (dm1 / tb < 1.03e-7) {
                // Accretion until a nova blows most of it away
                novae = true;
                dm2 = Math.min(dm1, dme);
                if (dm2 < dm1) supedd = true;
                dm22 = epsnov * dm2;
              } else {
                // Steady burning at the surface
                dm2 = dm1;
              }
            } else {
              // A new giant envelope
              dm2 = dm1;
              // Planets or low-mass white dwarfs?
              if ((kstar[j2] === 10 && mass[j2] < 0.05) || (kstar[j2] >= 11 && mass[j2] < 0.5)) {
                kst = kstar[j2];
              } else {
                kst = Math.min(6, 3 * kstar[j2] - 27);
                mt2 = mass[j2] + km * (dm2 - dms[j2]);
                const g = { mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] };
                gntage(g, mt2, c);
                ({ mc: massc[j2], kw: kst, m0: mass0[j2], aj: aj[j2] } = g);
                epoch[j2] = tphys + dtm - aj[j2];
                logBppNewGiant(mt2);
              }
            }
          } else if (kstar[j2] >= 10) {
            // The Eddington limit
            dm2 = Math.min(dm1, dme);
            if (dm2 < dm1) supedd = true;
          } else {
            // A giant, whose envelope can take any transferred mass
            dm2 = dm1;
          }
          if (!novae) dm22 = dm2;

          if (kst >= 10 && kst <= 12) {
            mt2 = mass[j2] + km * (dm22 - dms[j2]);
            if (kstar[j1] <= 10 && kst === 10 && mt2 >= 0.7) {
              // A helium white dwarf takes helium-rich matter only up to 0.7 M☉, then is destroyed (perhaps a Type Ia)
              mass[j1] = mass[j1] - km * (dm1 + dms[j1]);
              mass[j2] = 0;
              kstar[j2] = 15;
              goto135 = true;
            } else if (kstar[j1] <= 10 && kst >= 11) {
              // CO and ONe white dwarfs take helium-rich matter until 0.15 M☉ has piled up and ignites: a CO white dwarf
              // is destroyed (an edge-lit detonation, perhaps a Type Ia); an ONe one survives, all ONe
              if (mt2 - mass0[j2] >= 0.15) {
                if (kst === 11) {
                  mass[j1] = mass[j1] - km * (dm1 + dms[j1]);
                  mass[j2] = 0;
                  kstar[j2] = 15;
                  goto135 = true;
                } else {
                  mass0[j2] = mt2;
                }
              }
            } else {
              mass0[j2] = mt2;
            }
            // A helium or CO white dwarf past the Chandrasekhar limit is destroyed in a supernova; an ONe white dwarf
            // leaves a neutron star, which hrdiag makes when the stars are next updated
            if (!goto135 && (kst === 10 || kst === 11)) {
              if (mt2 >= MCH) {
                dm1 = MCH - mass[j2] + km * dms[j2];
                mass[j1] = mass[j1] - dm1 - km * dms[j1];
                mass[j2] = 0;
                kstar[j2] = 15;
                goto135 = true;
              }
            }
          }
          if (goto135) {
            label = 135;
            break;
          }

          // The mass terms, by the speed-up factor
          dm1 = km * dm1;
          dm2 = km * dm2;
          dm22 = km * dm22;
          // (the Fortran scales dme too, but doesn't use it again)

          // The orbital angular momentum the system's mass loss takes away
          djorb = ((dmr[1] + q[1] * dmt[1]) * mass[2] * mass[2] + (dmr[2] + q[2] * dmt[2]) * mass[1] * mass[1]) / (mass[1] + mass[2]) ** 2;
          djorb = djorb * dt;

          // Mass lost in super-Eddington transfer, in novae or with γ = −2 leaves as a wind from the secondary; with
          // γ = −1 it carries the primary's specific angular momentum; with γ ≥ 0 a fraction γ of the orbit's
          if (supedd || novae || gamma < -1.5) {
            djorb = djorb + ((dm1 - dm22) * mass[j1] * mass[j1]) / (mass[1] + mass[2]) ** 2;
          } else if (gamma >= 0) {
            djorb = djorb + gamma * (dm1 - dm2);
          } else {
            djorb = djorb + ((dm1 - dm2) * mass[j2] * mass[j2]) / (mass[1] + mass[2]) ** 2;
          }

          const ecc2 = ecc * ecc;
          const omecc2 = 1 - ecc2;
          const sqome2 = Math.sqrt(omecc2);
          djorb = djorb * sep * sep * sqome2 * oorb;
          delet = 0;

          // Gravitational radiation, for very close pairs
          if (sep <= 10) {
            let djgr = (8.315e-10 * mass[1] * mass[2] * (mass[1] + mass[2])) / (sep * sep * sep * sep);
            const f1 = 19 / 6 + (121 / 96) * ecc2;
            const sqome5 = sqome2 ** 5;
            const delet1 = (djgr * ecc * f1) / sqome5;
            djgr = (djgr * jorb * (1 + 0.875 * ecc2)) / sqome5;
            djorb = djorb + djgr * dt;
            delet = delet + delet1 * dt;
          }

          for (let k = 1; k <= 2; k++) {
            dms[k] = km * dms[k];
            if (kstar[k] < 10) dms[k] = Math.min(dms[k], mass[k] - massc[k]);
            // The change in each star's own spin
            djspint[k] = (2 / 3) * (dmr[k] * radx[k] * radx[k] * ospin[k] - xi * dmt[k] * radx[3 - k] * radx[3 - k] * ospin[3 - k]);
            djspint[k] = djspint[k] * dt;
            if (mass[k] > 0.35 && kstar[k] < 10) {
              const djmb = (5.83e-16 * menv[k] * (rad[k] * ospin[k]) ** 3) / mass[k];
              djspint[k] = djspint[k] + djmb * dt;
            }
          }

          // The spins change with the transferred mass, conserving the total angular momentum
          let djt = dm1 * radx[j1] * radx[j1] * ospin[j1];
          djspint[j1] = djspint[j1] + djt;
          djorb = djorb - djt;
          if (disk) {
            // Matter falls from the inner edge of a Keplerian disc in a steady state
            djt = dm2 * twopi * AURSUN * Math.sqrt(AURSUN * mass[j2] * radx[j2]);
            djspint[j2] = djspint[j2] - djt;
            djorb = djorb + djt;
          } else {
            // No disc: the angular momentum at the radius where it would have formed (Ulrich & Burger)
            const rdisk = 1.7 * rmin;
            djt = dm2 * twopi * AURSUN * Math.sqrt(AURSUN * mass[j2] * rdisk);
            djspint[j2] = djspint[j2] - djt;
            djorb = djorb + djt;
          }
          djtx[2] = djt;

          // A nova changes the secondary's spin
          if (novae) {
            djt = (dm2 - dm22) * radx[j2] * radx[j2] * ospin[j2];
            djspint[j2] = djspint[j2] + djt;
            djtx[2] = djtx[2] - djt;
          }

          // Tides: circularisation, orbital shrinkage and spin-up
          for (let k = 1; k <= 2; k++) {
            dspint[k] = 0;
            if (((kstar[k] <= 9 && rad[k] >= 0.01 * rol[k]) || (kstar[k] >= 10 && k === j1)) && tflag > 0) {
              const raa2 = (radx[k] / sep) ** 2;
              const raa6 = raa2 ** 3;
              const f5 = 1 + ecc2 * (3 + ecc2 * 0.375);
              const f4 = 1 + ecc2 * (1.5 + ecc2 * 0.125);
              const f3 = 1 + ecc2 * (3.75 + ecc2 * (1.875 + ecc2 * 7.8125e-2));
              const f2 = 1 + ecc2 * (7.5 + ecc2 * (5.625 + ecc2 * 0.3125));
              let tcqr: number;
              let rg2: number;
              if ((kstar[k] === 1 && mass[k] >= 1.25) || kstar[k] === 4 || kstar[k] === 7) {
                const tc = 1.592e-9 * mass[k] ** 2.84;
                const f = 1.9782e4 * Math.sqrt((mass[k] * radx[k] * radx[k]) / sep ** 5) * tc * (1 + q[3 - k]) ** (5 / 6);
                tcqr = f * q[3 - k] * raa6;
                rg2 = k2str[k];
              } else if (kstar[k] <= 9) {
                renv[k] = Math.min(renv[k], radx[k] - radc[k]);
                renv[k] = Math.max(renv[k], 1.0e-10);
                const tc = MR23YR * ((menv[k] * renv[k] * (radx[k] - 0.5 * renv[k])) / (3 * lumin[k])) ** (1 / 3);
                const ttid = twopi / (1.0e-10 + Math.abs(oorb - ospin[k]));
                const f = Math.min(1, ttid / (2 * tc) ** 2);
                tcqr = (2 * f * q[3 - k] * raa6 * menv[k]) / (21 * tc * mass[k]);
                rg2 = (k2str[k] * (mass[k] - massc[k])) / mass[k];
              } else {
                const f = 7.33e-9 * (lumin[k] / mass[k]) ** (5 / 7);
                tcqr = (f * q[3 - k] * q[3 - k] * raa2 * raa2) / (1 + q[3 - k]);
                rg2 = K3;
              }
              const sqome3 = sqome2 ** 3;
              const delet1 =
                27 * tcqr * (1 + q[3 - k]) * raa2 * (ecc / sqome2 ** 13) * (f3 - ((11 / 18) * sqome3 * f4 * ospin[k]) / oorb);
              delet = delet + delet1 * dt;
              dspint[k] = ((3 * q[3 - k] * tcqr) / (rg2 * omecc2 ** 6)) * (f2 * oorb - sqome3 * f5 * ospin[k]);
              eqspin = (oorb * f2) / (sqome3 * f5);
              if (dt > 0) {
                if (dspint[k] >= 0) dspint[k] = Math.min(dt * dspint[k], eqspin - ospin[k]) / dt;
                else dspint[k] = Math.max(dt * dspint[k], eqspin - ospin[k]) / dt;
              }
              djt = (k2str[k] * (mass[k] - massc[k]) * radx[k] * radx[k] + K3 * massc[k] * radc[k] * radc[k]) * dspint[k];
              djorb = djorb + djt * dt;
              djspint[k] = djspint[k] - djt * dt;
            }

            jspin[k] = Math.max(1.0e-10, jspin[k] - djspint[k]);

            // Not beyond break-up: the excess goes back to the orbit
            const ospbru = twopi * Math.sqrt((mass[k] * AURSUN ** 3) / radx[k] ** 3);
            const jspbru = (k2str[k] * (mass[k] - massc[k]) * radx[k] * radx[k] + K3 * massc[k] * radc[k] * radc[k]) * ospbru;
            if (jspin[k] > jspbru) {
              djorb = djorb - (jspin[k] - jspbru);
              jspin[k] = jspbru;
            }
          }

          // The masses
          kstar[j2] = kst;
          mass[j1] = mass[j1] - dm1 - dms[j1];
          if (kstar[j1] <= 1 || kstar[j1] === 7) mass0[j1] = mass[j1];
          mass[j2] = mass[j2] + dm22 - dms[j2];
          if (kstar[j2] <= 1 || kstar[j2] === 7) mass0[j2] = mass[j2];

          // For an HG star, can the initial mass be reduced?
          for (const j of [j1, j2]) {
            if (kstar[j] === 2 && mass0[j] <= zpars[3]) {
              const m0 = mass0[j];
              mass0[j] = mass[j];
              starNew(kstar[j], mass0[j], mass[j]);
              if (L.GB[9] < massc[j]) mass0[j] = m0;
            }
          }

          ecc = ecc - delet;
          ecc = Math.max(ecc, 0);
          if (ecc < 1.0e-10) ecc = 0;
          if (ecc >= 1) {
            label = 135;
            break;
          }

          // Jorb mustn't become negative, as it could if the primary overfills its lobe at first: contact follows
          jorb = Math.max(1, jorb - djorb);
          sep = ((mass[1] + mass[2]) * jorb * jorb) / ((mass[1] * mass[2] * twopi) ** 2 * AURSUN ** 3 * (1 - ecc * ecc));
          tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mass[1] + mass[2])));
          oorb = twopi / tb;
        }

        // Always rejuvenate the secondary and age the primary if they're on the main sequence
        if (kstar[j1] <= 2 || kstar[j1] === 7) {
          starNew(kstar[j1], mass0[j1], mass[j1]);
          if (kstar[j1] === 2) aj[j1] = tmsnew + ((tscls[1] - tmsnew) * (aj[j1] - tms[j1])) / (tbgb[j1] - tms[j1]);
          else aj[j1] = (tmsnew / tms[j1]) * aj[j1];
          epoch[j1] = tphys - aj[j1];
        }
        if (kstar[j2] <= 2 || kstar[j2] === 7) {
          starNew(kstar[j2], mass0[j2], mass[j2]);
          if (kstar[j2] === 2) {
            aj[j2] = tmsnew + ((tscls[1] - tmsnew) * (aj[j2] - tms[j2])) / (tbgb[j2] - tms[j2]);
          } else if ((mass[j2] < 0.35 || mass[j2] > 1.25) && kstar[j2] !== 7) {
            aj[j2] = ((tmsnew / tms[j2]) * aj[j2] * (mass[j2] - dm22)) / mass[j2];
          } else {
            aj[j2] = (tmsnew / tms[j2]) * aj[j2];
          }
          epoch[j2] = tphys - aj[j2];
        }

        // The stars for the next step
        tphys = tphys + dtm;
        let exceeded = false;
        let disrupted = false;
        for (let k = 1; k <= 2; k++) {
          const age0 = tphys - epoch[k];
          if (mass[k] > 100) {
            warnings.push(` MASS EXCEEDED ${mass1i} ${mass2i} ${tbi} ${ecci} ${mass[k]}`);
            exceeded = true;
            break;
          }
          starTm(kstar[k], mass0[k], mass[k]);
          const s = diag(mass0[k], age0, mass[k], kstar[k], massc[k]);
          const { kw, mt, r: rm, lum, rc, menv: me, renv: re, k2 } = s;
          const age = s.aj;
          const m0 = s.mass;
          const mc = s.mc;

          // A supernova: correct the orbit
          if (kw !== kstar[k] && kstar[k] <= 12 && (kw === 13 || kw === 14)) {
            dms[k] = mass[k] - mt;
            doKick(kw, k, mt, false);
            if (ecc > 1) {
              kstar[k] = kw;
              mass[k] = mt;
              epoch[k] = tphys - age;
              disrupted = true;
              break;
            }
            tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mt + mass[3 - k])));
            oorb = twopi / tb;
          }
          if (kw !== kstar[k]) {
            change = true;
            if ((kw === 13 || kw === 14) && kstar[k] <= 12) snova = true;
            mass[k] = mt;
            if (kw === 15) {
              kstar[k] = kw;
              disrupted = true;
              break;
            }
            mass0[k] = m0;
            epoch[k] = tphys - age;
          }

          // The stellar evolution's timescale, for nuclear-burning types
          if (kw <= 9) {
            const d = deltat(kw, age, L, dt, o);
            dt = d.dt;
            dtmi[k] = Math.min(d.dt, d.dtr);
            dtmi[k] = Math.max(1.0e-7, dtmi[k]);
          } else {
            dtmi[k] = 1.0e10;
          }

          aj[k] = age;
          kstar[k] = kw;
          rad[k] = rm;
          radx[k] = rm;
          lumin[k] = lum;
          massc[k] = mc;
          radc[k] = rc;
          menv[k] = me;
          renv[k] = re;
          k2str[k] = k2;
          tms[k] = L.tm;
          tbgb[k] = tscls[1];

          // A blue straggler?
          if (kw <= 1 && L.tm < tphys && !bss) {
            bss = true;
            logBpp(14);
          }
        }
        if (exceeded) {
          label = 140;
          break;
        }
        if (disrupted) {
          label = 135;
          break;
        }

        for (let k = 1; k <= 2; k++) {
          q[k] = mass[k] / mass[3 - k];
          rol[k] = rl(q[k]) * sep;
        }
        if (rad[j1] > rol[j1]) radx[j1] = Math.max(radc[j1], rol[j1]);
        for (let k = 1; k <= 2; k++) {
          ospin[k] = jspin[k] / (k2str[k] * (mass[k] - massc[k]) * radx[k] * radx[k] + K3 * massc[k] * radc[k] * radc[k]);
        }

        if ((isave && tphys >= tsave) || iplot) saveBcm(...rlofRates());

        if (tphys >= tphysf) {
          label = 140;
          break;
        }

        if (change) {
          change = false;
          logBpp(2);
        }

        // Does the primary still fill its Roche lobe?
        if (rad[j1] > rol[j1] && !snova) {
          // A contact system?
          if (rad[j2] > rol[j2]) {
            label = 130;
            break;
          }
          iter = iter + 1;
          label = 8;
          break;
        }
        logBpp(4);
        dtm = 0;
        label = 4;
        break;
      }

      case 130: {
        // A contact system
        coel = true;
        // If *1 or *2 is giant-like this is common-envelope evolution
        const m1ce = mass[j1];
        const m2ce = mass[j2];
        let rrl1 = Math.min(999.999, rad[1] / rol[1]);
        let rrl2 = Math.min(999.999, rad[2] / rol[2]);
        bpp.push([0, tphys, mass[1], mass[2], kstar[1], kstar[2], sep, ecc, rrl1, rrl2, 5]);
        if (kstar[j1] >= 2 && kstar[j1] <= 9 && kstar[j1] !== 7) {
          coel = commonEnvelope(j1, j2).coel;
          com = true;
        } else if (kstar[j2] >= 2 && kstar[j2] <= 9 && kstar[j2] !== 7) {
          coel = commonEnvelope(j2, j1).coel;
          com = true;
        } else {
          const p = { m0: mass0, m: mass, aj, ks: kstar };
          mix(p, c, o.mxns);
        }
        void m1ce;
        void m2ce;
        if (com) {
          rrl1 = Math.min(rrl1, 0.99);
          rrl2 = Math.min(rrl2, 0.99);
          bpp.push([
            0, tphys, kstar[1] === 15 ? mass0[1] : mass[1], kstar[2] === 15 ? mass0[2] : mass[2], kstar[1], kstar[2], sep, ecc,
            rrl1, rrl2, 7,
          ]);
        }
        epoch[1] = tphys - aj[1];
        epoch[2] = tphys - aj[2];
        if (!coel) {
          // The next step without changing the time
          if (ecc > 1) {
            spinRemnantsAfterCe();
            label = 135;
            break;
          }
          dtm = 0;
          // The orbit, as the separation may have changed
          tb = (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (mass[1] + mass[2])));
          oorb = twopi / tb;
          label = 4;
          break;
        }
        label = 135;
        break;
      }

      case 135: {
        sgl = true;
        if (kstar[1] !== 15 || kstar[2] !== 15) {
          if (com) {
            com = false;
          } else {
            const row = [0, tphys, kstar[1] === 15 ? mass0[1] : mass[1], kstar[2] === 15 ? mass0[2] : mass[2], kstar[1], kstar[2], 0, 0, 0, -1, 0];
            if (coel) {
              row[10] = 6;
            } else if (ecc > 1) {
              // The binary is dissolved by a supernova or tides
              row[6] = sep;
              row[7] = ecc;
              row[9] = -2;
              row[10] = 11;
            } else {
              row[10] = 9;
            }
            bpp.push(row);
          }
          if (kstar[2] === 15) {
            kmax = 1;
            rol[2] = -1 * rad[2];
            dtmi[2] = tphysf;
          } else if (kstar[1] === 15) {
            kmin = 2;
            rol[1] = -1 * rad[1];
            dtmi[1] = tphysf;
          }
          ecc = -1;
          sep = 0;
          dtm = 0;
          coel = false;
          label = 4;
          break;
        }
        label = 140;
        break;
      }

      case 140: {
        // (the Fortran also clears com here)
        if (!com) {
          const prev = bpp[bpp.length - 1];
          const row = [0, tphys, mass[1], mass[2], kstar[1], kstar[2], 0, 0, 0, 0, 0];
          if (kstar[1] === 15 && prev[4] < 15) row[2] = mass0[1];
          if (kstar[2] === 15 && prev[5] < 15) row[3] = mass0[2];
          if (coel) {
            row[9] = -1;
            row[10] = 6;
          } else if (kstar[1] === 15 && kstar[2] === 15) {
            // Accretion-induced or single-star supernovae leave no remnant
            row[9] = -2;
            row[10] = 9;
          } else {
            row[6] = sep;
            row[7] = ecc;
            row[8] = rad[1] / rol[1];
            row[9] = rad[2] / rol[2];
            row[10] = 10;
          }
          bpp.push(row);
        }
        if ((isave && tphys >= tsave) || iplot) saveBcm(...rlofRates());
        return { bcm, bpp, warnings, kicks };
      }
    }
  }

  /** CALL comenv for donor d and companion a, then the bookkeeping evolv2 does around it. */
  function commonEnvelope(d: number, a: number): { coel: boolean } {
    const s1 = { m0: mass0[d], m: mass[d], mc: massc[d], aj: aj[d], jspin: jspin[d], kw: kstar[d] };
    const s2 = { m0: mass0[a], m: mass[a], mc: massc[a], aj: aj[a], jspin: jspin[a], kw: kstar[a] };
    const orbit = { ecc, sep, jorb, coel: false };
    comenv(s1, s2, orbit, c, o, ran);
    ({ m0: mass0[d], m: mass[d], mc: massc[d], aj: aj[d], jspin: jspin[d], kw: kstar[d] } = s1);
    ({ m0: mass0[a], m: mass[a], mc: massc[a], aj: aj[a], jspin: jspin[a], kw: kstar[a] } = s2);
    ({ ecc, sep, jorb } = orbit);
    coel = orbit.coel;
    return { coel: orbit.coel };
  }

  /** The COMENV row after a common envelope begun by overflow (label 8). */
  function logBppCe() {
    bpp.push([
      0, tphys, kstar[1] === 15 ? mass0[1] : mass[1], kstar[2] === 15 ? mass0[2] : mass[2], kstar[1], kstar[2], sep, ecc,
      rad[1] / rol[1], rad[2] / rol[2], 7,
    ]);
  }

  /** The GNTAGE row when accretion makes the secondary a new giant (or helium giant). */
  function logBppNewGiant(mt: number) {
    const row = [0, tphys, mass[j1], mt, kstar[j1], kst, sep, ecc, rad[1] / rol[1], rad[2] / rol[2], 8];
    if (j1 === 2) {
      row[2] = mt;
      row[3] = mass[j1];
      row[4] = kst;
      row[5] = kstar[j1];
    }
    bpp.push(row);
  }

  /** A pair unbound by a kick in a common envelope: the remnants' spins from their angular momenta. */
  function spinRemnantsAfterCe() {
    for (let k = 1; k <= 2; k++) {
      if (kstar[k] >= 13) {
        const rc = corerd(kstar[k], mass[k], mass[k], zpars[2]);
        ospin[k] = jspin[k] / (K3 * rc * rc * mass[k]);
      }
    }
  }
}
