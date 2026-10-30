/**
 * The constants of SSE's formulae for one metallicity, ported from zcnsts.f of
 * Hurley's code (Hurley, Pols & Tout 2000, MNRAS 315, 543), so nothing else
 * depends on Z. Arrays are 1-based like the Fortran.
 *
 * zpars:  1 Mhook, below which the main sequence has no hook (M☉)
 *         2 Mhef, above which helium ignites non-degenerately (M☉)
 *         3 Mfgb, above which helium ignites in the Hertzsprung gap (M☉)
 *         4 Mup, below which carbon–oxygen doesn't ignite (M☉)
 *         5 Mec, above which carbon ignites in the centre (M☉)
 *         6 log D for M ≤ Mfgb;  7 x for Rgb ∝ M^−x;  8 x for tMS = max(thook, x tBGB)
 *         9 Mc at the BGB for M = Mhef;  10 Mc at helium ignition for M = Mhef
 *        11 X;  12 Y;  13 x in Rmin = Rgb x^y for low-mass core helium burning;  14 Z^0.4
 */
import { xg, xh, xl, xr, xt, xz } from './data';
import { star, landmarks } from './star';
import { lbagbf, lhef, lheif, lzahbf, mcgbf, ragbf, rgbf, rminf, tbgbf, thef, type ZConstants } from './zfuncs';

const C = [NaN, 3.040581e-1, 8.049509e-2, 8.967485e-2, 8.780198e-2, 2.21917e-2];

const cache = new Map<number, ZConstants>();

/** SSE's constants for metallicity z (mass fraction; 0.02 is SSE's solar), cached. */
export function zcnsts(z: number): ZConstants {
  let c = cache.get(z);
  if (!c) {
    c = compute(z);
    cache.set(z, c);
  }
  return c;
}

function compute(z: number): ZConstants {
  const zpars = new Float64Array(21);
  const msp = new Float64Array(201);
  const gbp = new Float64Array(201);
  const c: ZConstants = { z, zpars, msp, gbp };

  const lzs = Math.log10(z / 0.02);
  const dlzs = 1 / (z * Math.log(10));
  const lz = Math.log10(z);
  const lzd = lzs + 1;
  /** a + lzs(b + lzs(c + …)), Horner's rule over the coefficients given. */
  const poly = (...k: number[]) => k.reduceRight((acc, x) => x + lzs * acc, 0);
  const xzp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xz[i + k]));
  const xtp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xt[i + k]));
  const xlp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xl[i + k]));
  const xrp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xr[i + k]));
  const xgp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xg[i + k]));
  const xhp = (i: number, n: number) => poly(...Array.from({ length: n }, (_, k) => xh[i + k]));

  zpars[1] = 1.0185 + lzs * (0.16015 + lzs * 0.0892);
  zpars[2] = 1.995 + lzs * (0.25 + lzs * 0.087);
  zpars[3] = (16.5 * z ** 0.06) / (1 + (1.0e-4 / z) ** 1.27);
  zpars[4] = Math.max(6.11044 + 1.02167 * lzs, 5);
  zpars[5] = zpars[4] + 1.8;
  zpars[6] = 5.37 + lzs * 0.135;
  zpars[7] = C[1] + lzs * (C[2] + lzs * (C[3] + lzs * (C[4] + lzs * C[5])));
  zpars[8] = Math.max(0.95, Math.max(0.95 - (10 / 3) * (z - 0.01), Math.min(0.99, 0.98 - (100 / 7) * (z - 0.001))));

  // Lzams
  for (let k = 0; k < 7; k++) msp[1 + k] = xzp(1 + 5 * k, 5);
  // Rzams
  for (let k = 0; k < 5; k++) msp[8 + k] = xzp(36 + 5 * k, 5);
  msp[13] = xz[61];
  for (let k = 0; k < 3; k++) msp[14 + k] = xzp(62 + 5 * k, 5);
  // Tbgb
  for (let k = 0; k < 4; k++) msp[17 + k] = xtp(1 + 4 * k, 4);
  msp[21] = xt[17];
  // dTbgb/dz
  for (let k = 0; k < 4; k++) {
    const i = 1 + 4 * k;
    msp[117 + k] = dlzs * (xt[i + 1] + lzs * (2 * xt[i + 2] + 3 * lzs * xt[i + 3]));
  }
  // Thook
  msp[22] = xtp(18, 4);
  msp[23] = xt[22];
  msp[24] = xtp(23, 4);
  msp[25] = xtp(27, 4);
  msp[26] = xt[31];
  // Ltms
  msp[27] = xlp(1, 5);
  msp[28] = xlp(6, 5);
  msp[29] = xlp(11, 4);
  msp[30] = xlp(15, 5);
  msp[27] = msp[27] * msp[30];
  msp[28] = msp[28] * msp[30];
  msp[31] = xlp(20, 4);
  msp[32] = xlp(24, 4);
  // Lalpha
  let m2 = 2;
  msp[33] = xlp(28, 4);
  msp[34] = xlp(32, 4);
  msp[35] = xlp(36, 4);
  msp[36] = xlp(40, 4);
  msp[37] = Math.max(0.9, 1.1064 + lzs * (0.415 + 0.18 * lzs));
  msp[38] = Math.max(1, 1.19 + lzs * (0.377 + 0.176 * lzs));
  if (z > 0.01) {
    msp[37] = Math.min(msp[37], 1);
    msp[38] = Math.min(msp[38], 1.1);
  }
  msp[39] = Math.max(0.145, 0.0977 - lzs * (0.231 + 0.0753 * lzs));
  msp[40] = Math.min(0.24 + lzs * (0.18 + 0.595 * lzs), 0.306 + 0.053 * lzs);
  msp[41] = Math.min(0.33 + lzs * (0.132 + 0.218 * lzs), 0.3625 + 0.062 * lzs);
  msp[42] = (msp[33] + msp[34] * m2 ** msp[36]) / (m2 ** 0.4 + msp[35] * m2 ** 1.9);
  // Lbeta
  msp[43] = xlp(44, 5);
  msp[44] = xlp(49, 5);
  msp[45] = xlp(54, 3);
  msp[46] = Math.min(1.4, 1.5135 + 0.3769 * lzs);
  msp[46] = Math.max(0.6355 - 0.4192 * lzs, Math.max(1.25, msp[46]));
  // Lhook
  msp[47] = xlp(57, 4);
  msp[48] = xlp(61, 4);
  msp[49] = xlp(65, 4);
  msp[50] = xlp(69, 4);
  msp[51] = Math.min(1.4, 1.5135 + 0.3769 * lzs);
  msp[51] = Math.max(0.6355 - 0.4192 * lzs, Math.max(1.25, msp[51]));
  // Rtms
  msp[52] = xrp(1, 5);
  msp[53] = xrp(6, 5);
  msp[54] = xrp(11, 5);
  msp[55] = xrp(16, 4);
  msp[56] = xrp(20, 4);
  msp[52] = msp[52] * msp[54];
  msp[53] = msp[53] * msp[54];
  msp[57] = xr[24];
  msp[58] = xrp(25, 4);
  msp[59] = xrp(29, 4);
  msp[60] = xrp(33, 4);
  msp[61] = xrp(37, 4);
  msp[62] = Math.max(0.097 - 0.1072 * (lz + 3), Math.max(0.097, Math.min(0.1461, 0.1461 + 0.1237 * (lz + 2))));
  msp[62] = 10 ** msp[62];
  m2 = msp[62] + 0.1;
  msp[63] = (msp[52] + msp[53] * msp[62] ** msp[55]) / (msp[54] + msp[62] ** msp[56]);
  msp[64] = (msp[57] * m2 ** 3 + msp[58] * m2 ** msp[61] + msp[59] * m2 ** (msp[61] + 1.5)) / (msp[60] + m2 ** 5);
  // Ralpha
  msp[65] = xrp(41, 4);
  msp[66] = xrp(45, 4);
  msp[67] = xrp(49, 4);
  msp[68] = xrp(53, 4);
  msp[69] = xrp(57, 5);
  msp[70] = Math.max(0.9, Math.min(1, 1.116 + 0.166 * lzs));
  msp[71] = Math.max(1.477 + 0.296 * lzs, Math.min(1.6, -0.308 - 1.046 * lzs));
  msp[71] = Math.max(0.8, Math.min(0.8 - 2 * lzs, msp[71]));
  msp[72] = xrp(62, 3);
  msp[73] = Math.max(0.065, 0.0843 - lzs * (0.0475 + 0.0352 * lzs));
  msp[74] = 0.0736 + lzs * (0.0749 + 0.04426 * lzs);
  if (z < 0.004) msp[74] = Math.min(0.055, msp[74]);
  msp[75] = Math.max(0.091, Math.min(0.121, 0.136 + 0.0352 * lzs));
  msp[76] = (msp[65] * msp[71] ** msp[67]) / (msp[66] + msp[71] ** msp[68]);
  if (msp[70] > msp[71]) {
    msp[70] = msp[71];
    msp[75] = msp[76];
  }
  // Rbeta
  msp[77] = xrp(65, 4);
  msp[78] = xrp(69, 4);
  msp[79] = xrp(73, 4);
  msp[80] = xrp(77, 4);
  msp[81] = xr[81] + lzs * (xr[82] + lzs * lzs * xr[83]);
  if (z > 0.01) msp[81] = Math.max(msp[81], 0.95);
  msp[82] = Math.max(1.4, Math.min(1.6, 1.6 + lzs * (0.764 + 0.3322 * lzs)));
  // Rgamma
  msp[83] = Math.max(xrp(84, 4), xrp(96, 3));
  msp[84] = Math.min(0, xrp(88, 4));
  msp[84] = Math.max(msp[84], xrp(99, 3));
  msp[85] = xrp(92, 4);
  msp[85] = Math.max(0, Math.min(msp[85], 7.454 + 9.046 * lzs));
  msp[86] = Math.min(xr[102] + lzs * xr[103], Math.max(2, -13.3 - 18.6 * lzs));
  msp[87] = Math.min(1.5, Math.max(0.4, 2.493 + 1.1475 * lzs));
  msp[88] = Math.max(1, Math.min(1.27, 0.8109 - 0.6282 * lzs));
  msp[88] = Math.max(msp[88], 0.6355 - 0.4192 * lzs);
  msp[89] = Math.max(5.85542e-2, -0.2711 - lzs * (0.5756 + 0.0838 * lzs));
  // Rhook
  msp[90] = xrp(104, 4);
  msp[91] = xrp(108, 4);
  msp[92] = xrp(112, 4);
  msp[93] = xrp(116, 4);
  msp[94] = Math.min(1.25, Math.max(1.1, 1.9848 + lzs * (1.1386 + 0.3564 * lzs)));
  msp[95] = 0.063 + lzs * (0.0481 + 0.00984 * lzs);
  msp[96] = Math.min(1.3, Math.max(0.45, 1.2 + 2.45 * lzs));
  // Lneta
  msp[97] = z > 0.0009 ? 10 : 20;

  // Lbgb
  gbp[1] = xgp(1, 4);
  gbp[2] = xgp(5, 4);
  gbp[3] = xgp(9, 4);
  gbp[4] = xgp(13, 4);
  gbp[5] = xgp(17, 3);
  gbp[6] = xgp(20, 3);
  gbp[3] = gbp[3] ** gbp[6];
  gbp[7] = xg[23];
  gbp[8] = xg[24];
  // Lbagb (gbp[16] is finished below, with a first call to lbagbf)
  gbp[9] = xgp(25, 3);
  gbp[10] = xgp(28, 3);
  gbp[11] = 15;
  gbp[12] = xgp(31, 4);
  gbp[13] = xgp(35, 4);
  gbp[14] = xgp(39, 4);
  gbp[15] = xgp(43, 2);
  gbp[12] = gbp[12] ** gbp[15];
  gbp[14] = gbp[14] ** gbp[15];
  gbp[16] = 1;
  // Rgb
  gbp[17] = -4.6739 - 0.9394 * lz;
  gbp[17] = 10 ** gbp[17];
  gbp[17] = Math.max(gbp[17], -0.04167 + 55.67 * z);
  gbp[17] = Math.min(gbp[17], 0.4771 - 9329.21 * z ** 2.94);
  gbp[18] = Math.min(0.54, 0.397 + lzs * (0.28826 + 0.5293 * lzs));
  gbp[19] = Math.max(-0.1451, -2.2794 - lz * (1.5175 + 0.254 * lz));
  gbp[19] = 10 ** gbp[19];
  if (z > 0.004) gbp[19] = Math.max(gbp[19], 0.7307 + 14265.1 * z ** 3.395);
  gbp[20] = xgp(45, 6);
  gbp[21] = xgp(51, 5);
  gbp[22] = xgp(56, 6);
  gbp[23] = xgp(62, 5);
  // Ragb
  gbp[24] = Math.min(0.99164 - 743.123 * z ** 2.83, 1.0422 + lzs * (0.13156 + 0.045 * lzs));
  gbp[25] = xgp(67, 6);
  gbp[26] = xgp(73, 5);
  gbp[27] = xgp(78, 6);
  gbp[28] = xgp(84, 5);
  gbp[29] = xgp(89, 6);
  gbp[30] = xgp(95, 6);
  const m1 = zpars[2] - 0.2;
  gbp[31] = gbp[29] + gbp[30] * m1;
  gbp[32] = Math.min(gbp[25] / zpars[2] ** gbp[26], gbp[27] / zpars[2] ** gbp[28]);
  // Mchei
  gbp[33] = xg[101] ** 4;
  gbp[34] = xg[102] * 4;
  // Mcagb
  gbp[35] = xgp(103, 4);
  gbp[36] = xgp(107, 4);
  gbp[37] = xgp(111, 2);
  gbp[35] = gbp[35] ** 4;
  gbp[36] = gbp[36] * 4;
  gbp[37] = gbp[37] ** 4;
  // Lhei (gbp[41] is finished below)
  gbp[38] = xhp(1, 2);
  gbp[39] = xhp(3, 2);
  gbp[40] = xh[5];
  gbp[41] = -1;
  gbp[42] = xhp(6, 3);
  gbp[43] = xhp(9, 3);
  gbp[44] = xhp(12, 3);
  gbp[42] = gbp[42] ** 2;
  gbp[44] = gbp[44] ** 2;
  // Lhe
  gbp[45] = xhp(15, 3);
  gbp[46] = lzs > -1 ? 1 - xh[19] * (lzs + 1) ** xh[18] : 1;
  gbp[47] = xhp(20, 3);
  gbp[48] = xhp(23, 3);
  gbp[45] = gbp[45] ** gbp[48];
  gbp[47] = gbp[47] ** gbp[48];
  gbp[46] = gbp[46] / zpars[3] ** 0.1 + (gbp[46] * gbp[47] - gbp[45]) / zpars[3] ** (gbp[48] + 0.1);
  // Rmin
  gbp[49] = xhp(26, 4);
  gbp[50] = xhp(30, 4);
  gbp[51] = xhp(34, 4);
  gbp[52] = 5 + xh[38] * z ** xh[39];
  gbp[53] = xhp(40, 4);
  gbp[49] = gbp[49] ** gbp[53];
  gbp[51] = gbp[51] ** (2 * gbp[53]);
  // The (gbp[57] is finished below)
  gbp[54] = xhp(44, 4);
  gbp[55] = xhp(48, 3);
  gbp[55] = Math.max(gbp[55], 1);
  gbp[56] = xh[51];
  gbp[57] = -1;
  gbp[58] = xhp(52, 4);
  gbp[59] = xhp(56, 4);
  gbp[60] = xhp(60, 4);
  gbp[61] = xhp(64, 2);
  gbp[58] = gbp[58] ** gbp[61];
  gbp[60] = gbp[60] ** 5;
  // Tbl
  let dum1 = zpars[2] / zpars[3];
  gbp[62] = xhp(66, 2);
  gbp[62] = -gbp[62] * Math.log10(dum1);
  gbp[63] = xh[68];
  gbp[64] = lzd > 0 ? 1 - lzd * (xh[69] + lzd * (xh[70] + lzd * xh[71])) : 1;
  gbp[65] = 1 - gbp[64] * dum1 ** gbp[63];
  gbp[66] = 1 - lzd * (xh[77] + lzd * (xh[78] + lzd * xh[79]));
  gbp[67] = xhp(72, 4);
  gbp[68] = xh[76];
  // Lzahb
  gbp[69] = xhp(80, 3);
  gbp[70] = xhp(83, 3);
  gbp[71] = 15;
  gbp[72] = xh[86];
  gbp[73] = xh[87];
  // Rzahb
  gbp[75] = xhp(88, 4);
  gbp[76] = xhp(92, 4);
  gbp[77] = xhp(96, 4);

  // Finish Lbagb
  const mhefl = 0;
  gbp[16] = lbagbf(zpars[2], mhefl, c);
  // Finish LHeI
  dum1 = 0;
  const lhefl = lheif(zpars[2], mhefl, c);
  gbp[41] = (gbp[38] * zpars[2] ** gbp[39] - lhefl) / (Math.exp(zpars[2] * gbp[40]) * lhefl);
  // Finish THe
  const thefl = thef(zpars[2], dum1, mhefl, c) * tbgbf(zpars[2], c);
  gbp[57] = (thefl - gbp[54]) / (gbp[54] * Math.exp(gbp[56] * zpars[2]));
  // Finish Tblf
  const rb = ragbf(zpars[3], lheif(zpars[3], zpars[2], c), mhefl, c);
  const rr = Math.max(1 - rminf(zpars[3], c) / rb, 1e-12);
  gbp[66] = gbp[66] / (zpars[3] ** gbp[67] * rr ** gbp[68]);
  // Finish Lzahb
  gbp[74] = lhefl * lhef(zpars[2], c);

  const lm = landmarks();
  star(0, zpars[2], zpars[2], lm, c);
  zpars[9] = mcgbf(lm.lums[3], lm.GB, lm.lums[6]);
  zpars[10] = mcgbf(lm.lums[4], lm.GB, lm.lums[6]);
  // Hydrogen and helium abundances
  zpars[11] = 0.76 - 3 * z;
  zpars[12] = 0.24 + 2 * z;
  // Constant for low-mass core helium burning
  zpars[13] = rminf(zpars[2], c) / rgbf(zpars[2], lzahbf(zpars[2], zpars[9], zpars[2], c), c);
  zpars[14] = z ** 0.4;
  return c;
}
