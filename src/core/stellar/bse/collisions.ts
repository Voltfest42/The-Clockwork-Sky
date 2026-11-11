/**
 * What two stars make when they merge, ported from instar.f, corerd.f and
 * dgcore.f of Hurley's BSE (Hurley, Tout & Pols 2002, MNRAS 329, 897, Table 2
 * and §2.7.1). Masses in M☉, radii in R☉.
 */

/**
 * The collision matrix (instar.f): KTYPE[k1][k2] is the type of the star two stars of types k1 and k2 make, plus
 * 100 where the merger goes through a common envelope. 15 means nothing is left.
 */
export const KTYPE: readonly (readonly number[])[] = (() => {
  const k: number[][] = Array.from({ length: 15 }, () => new Array<number>(15).fill(0));
  k[0][0] = 1;
  for (let j = 1; j <= 6; j++) {
    k[0][j] = j;
    k[1][j] = j;
  }
  k[0][7] = 4;
  k[1][7] = 4;
  for (let j = 8; j <= 12; j++) {
    k[0][j] = j !== 10 ? 6 : 3;
    k[1][j] = k[0][j];
  }
  k[2][2] = 3;
  for (let i = 3; i <= 14; i++) k[i][i] = i;
  k[5][5] = 4;
  k[7][7] = 1;
  k[10][10] = 15;
  k[13][13] = 14;
  for (let i = 2; i <= 5; i++) for (let j = i + 1; j <= 12; j++) k[i][j] = 4;
  k[2][3] = 3;
  k[2][6] = 5;
  k[2][10] = 3;
  k[2][11] = 5;
  k[2][12] = 5;
  k[3][6] = 5;
  k[3][10] = 3;
  k[3][11] = 5;
  k[3][12] = 5;
  k[6][7] = 4;
  k[6][8] = 6;
  k[6][9] = 6;
  k[6][10] = 5;
  k[6][11] = 6;
  k[6][12] = 6;
  k[7][8] = 8;
  k[7][9] = 9;
  k[7][10] = 7;
  k[7][11] = 9;
  k[7][12] = 9;
  k[8][9] = 9;
  k[8][10] = 7;
  k[8][11] = 9;
  k[8][12] = 9;
  k[9][10] = 7;
  k[9][11] = 9;
  k[9][12] = 9;
  k[10][11] = 9;
  k[10][12] = 9;
  k[11][12] = 12;
  for (let i = 0; i <= 12; i++) {
    k[i][13] = 13;
    k[i][14] = 14;
  }
  k[13][14] = 14;
  // Common-envelope cases get 100 added
  for (let i = 0; i <= 9; i++) {
    for (let j = i; j <= 14; j++) {
      if (i <= 1 || i === 7) {
        if (j >= 2 && j <= 9 && j !== 7) k[i][j] = k[i][j] + 100;
      } else {
        k[i][j] = k[i][j] + 100;
      }
    }
  }
  // The rest by symmetry
  for (let i = 1; i <= 14; i++) for (let j = 0; j <= i - 1; j++) k[i][j] = k[j][i];
  return k;
})();

const MCH = 1.44;

/**
 * The radius of a giant's core, R☉ (corerd.f, Tout 1997, updated by Hurley): out of date for most uses (hrdiag gives
 * the core radius), but BSE still uses it for remnants after a common envelope and for merging cores.
 */
export function corerd(kw: number, mc: number, m0: number, mflash: number): number {
  if (kw === 14) return 4.24e-6 * mc;
  if (kw === 13) return 1.4e-5;
  if (kw <= 1 || kw === 7) return 0;
  // Core-helium-burning stars, early-AGB stars and non-degenerate giant cores
  if (kw === 4 || kw === 5 || (kw <= 3 && m0 > mflash)) return 0.2239 * mc ** 0.62;
  // Degenerate giants' cores and white dwarfs
  let r = 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mc) ** (2 / 3) - (mc / MCH) ** (2 / 3)));
  // Degenerate giants have hot subdwarf cores
  if (kw <= 9) r = 5 * r;
  return r;
}

/** The merged core and what's left of the envelope's binding energy (dgcore's arguments that it changes). */
export interface MergedCore {
  kw3: number;
  m3: number;
  /** The envelope's binding energy, divided by −G (M☉²/R☉). */
  ebinde: number;
}

/**
 * The outcome when two degenerate cores (types 2 or 3 below the helium flash, 6, 10, 11 or 12) coalesce (dgcore.f):
 * the energy of the merger may ignite helium, and the merged core may survive, become a white dwarf or explode.
 */
export function dgcore(kw1: number, kw2: number, kw3: number, m1: number, m2: number, m3: number, ebinde: number): MergedCore {
  // The Fortran also works out the merger's temperature from heat capacities, but its tests on it are commented out
  const ehe = 5.812e17;
  const ec = 2.21e17;
  const ene = 2.06e17;
  const gmr = 1.906e15;
  // The core radii, with m0 < mflash (true for types 2 and 3)
  const m0 = 1;
  const mflash = 2;
  const r1 = corerd(kw1, m1, m0, mflash);
  const r2 = corerd(kw2, m2, m0, mflash);
  const r3 = corerd(kw3, m3, m0, mflash);
  // The binding energy released by the merger reduces the envelope's
  const ebindi = (m1 * m1) / r1 + (m2 * m2) / r2;
  const ebindf = (m3 * m3) / r3;
  const deleb = Math.abs(ebindi - ebindf);
  ebinde = Math.max(0, ebinde - deleb);
  if (kw1 > 3) return { kw3, m3, ebinde };
  // The mass by composition: helium, carbon, and neon or burnt carbon
  let mhe = 0;
  let mc = 0;
  let mne = 0;
  if (kw1 <= 3 || kw1 === 10) mhe = mhe + m1;
  else if (kw1 === 12) mne = mne + m1;
  else mc = mc + m1;
  if (kw2 <= 3 || kw2 === 10) mhe = mhe + m2;
  else if (kw2 === 12) mne = mne + m2;
  else mc = mc + m2;
  // Helium is always taken to burn to carbon; carbon never burns further (the Fortran's temperature tests are commented out)
  const x = 1;
  const y = 0;
  const enuc = (x * ehe * mhe + y * (ec * mc + ene * mne)) / gmr;
  // The star is destroyed if burning releases more than binds it
  const de = ebindf + ebinde - enuc;
  if (de >= 0) ebinde = Math.max(0, ebinde - enuc);
  if (de < 0) kw3 = 15;
  if (kw3 === 3) {
    if (x > 0.5) kw3 = 6;
    else if (ebinde <= 0) kw3 = 10;
  } else if (kw3 === 4) {
    if (x > 0.5) kw3 = 6;
    else if (ebinde <= 0) kw3 = 7;
  }
  if (kw3 === 6 && y < 0.5) {
    if (ebinde <= 0) kw3 = 11;
  } else if (kw3 === 6 && y > 0.5) {
    if (ebinde <= 0) kw3 = 12;
  }
  if (kw3 === 10 && x > 0.5) kw3 = 11;
  if (kw3 === 11 && y > 0.5) kw3 = 12;
  if (kw3 >= 10 && kw3 <= 12 && m3 >= MCH) kw3 = 15;
  if (kw3 === 15) m3 = 0;
  return { kw3, m3, ebinde };
}
