/**
 * The liquid drop (Weizsäcker 1935; Bethe and Bacher 1936): a nucleus's
 * binding energy as a drop of nuclear matter, with a term for its volume, its
 * surface, the protons' repulsion, the imbalance of protons and neutrons, and
 * the pairing of like nucleons:
 *
 *   B = a_V A − a_S A^(2/3) − a_C Z(Z − 1)/A^(1/3) − a_A (N − Z)²/A ± a_P/√A.
 *
 * With one standard set of coefficients (15.8, 18.3, 0.714, 23.2 and 12 MeV)
 * it follows the measured binding energies to about 1% beyond calcium, but
 * misses the extra binding of closed shells. A shell correction in the form of
 * Myers and Swiatecki (1966) adds it back, for a mass model that can reach
 * nuclei too short-lived to weigh (the toy r-process). Energies in MeV here,
 * as the formula is usually written; the mass model returns keV, as the
 * nuclide table does.
 */

import { MAGIC, MASS_EXCESS_H, MASS_EXCESS_N, type NuclideTable } from './nuclides';

export interface LiquidDropCoefficients {
  volume: number;
  surface: number;
  coulomb: number;
  asymmetry: number;
  pairing: number;
}

/** One standard fit, MeV (the research brief's: 15.8, 18.3, 0.714, 23.2, 12). */
export const LIQUID_DROP: LiquidDropCoefficients = { volume: 15.8, surface: 18.3, coulomb: 0.714, asymmetry: 23.2, pairing: 12 };

export interface LiquidDropTerms {
  volume: number;
  surface: number;
  coulomb: number;
  asymmetry: number;
  pairing: number;
  total: number;
}

/** The pairing term's sign: +1 for even–even nuclei, −1 for odd–odd, 0 for odd A. */
export function pairingSign(Z: number, N: number): number {
  if ((Z + N) % 2 === 1) return 0;
  return Z % 2 === 0 ? 1 : -1;
}

/** Each term of the binding energy, MeV (the surface, Coulomb and asymmetry terms negative). */
export function liquidDropTerms(Z: number, N: number, c: LiquidDropCoefficients = LIQUID_DROP): LiquidDropTerms {
  const A = Z + N;
  const volume = c.volume * A;
  const surface = -c.surface * A ** (2 / 3);
  const coulomb = (-c.coulomb * Z * (Z - 1)) / A ** (1 / 3);
  const asymmetry = (-c.asymmetry * (N - Z) ** 2) / A;
  const pairing = (pairingSign(Z, N) * c.pairing) / Math.sqrt(A);
  return { volume, surface, coulomb, asymmetry, pairing, total: volume + surface + coulomb + asymmetry + pairing };
}

/** The liquid drop's binding energy, MeV. */
export const liquidDropBinding = (Z: number, N: number, c: LiquidDropCoefficients = LIQUID_DROP) => liquidDropTerms(Z, N, c).total;

/** (m_n − m_H)c², MeV: what turning a proton and its electron into a neutron costs. */
const NEUTRON_MINUS_HYDROGEN = (MASS_EXCESS_N - MASS_EXCESS_H) / 1000;

/**
 * The valley of stability: for mass number A, the charge (as a real number)
 * of the lightest isobar in the liquid drop, where dM/dZ = 0. Light nuclei
 * have Z ≈ A/2; heavy ones need extra neutrons to dilute the protons'
 * repulsion, so Z falls below A/2 (82 for A = 208).
 */
export function valleyZ(A: number, c: LiquidDropCoefficients = LIQUID_DROP): number {
  const k = c.coulomb / A ** (1 / 3);
  return (4 * c.asymmetry + NEUTRON_MINUS_HYDROGEN + k) / (2 * k + (8 * c.asymmetry) / A);
}

// ---------- The shell correction ----------

/** The magic numbers, with 184 to close the next shell. */
const SHELLS = [0, 2, 8, 20, 28, 50, 82, 126, 184];

/**
 * Myers and Swiatecki's (1966) shell function F(n) for n protons or neutrons:
 * zero at each magic number, and largest midway between, from filling the
 * shell's levels evenly rather than all at once. Beyond 184 it is zero.
 */
export function shellFunction(n: number): number {
  for (let i = 1; i < SHELLS.length; i++) {
    const lo = SHELLS[i - 1];
    const hi = SHELLS[i];
    if (n <= hi) {
      const q = (0.6 * (hi ** (5 / 3) - lo ** (5 / 3))) / (hi - lo);
      return q * (n - lo) - 0.6 * (n ** (5 / 3) - lo ** (5 / 3));
    }
  }
  return 0;
}

/** The shell correction's shape, (F(N) + F(Z))/(A/2)^(2/3): multiply by C (MeV) for its size. */
export const shellShape = (Z: number, N: number) => (shellFunction(N) + shellFunction(Z)) / ((Z + N) / 2) ** (2 / 3);

/** Myers and Swiatecki's constant c: the shell correction is C(F(N) + F(Z))/(A/2)^(2/3) − cC·A^(1/3), so it is −cC·A^(1/3) at closed shells. */
export const SHELL_C = 0.325;

/** The mass model's coefficients, MeV: the liquid drop's, a surface correction to the asymmetry term, and the shell correction's C. */
export interface MassModel extends LiquidDropCoefficients {
  /** The asymmetry term weakens at the surface: + a_ss (N − Z)²/A^(4/3). */
  surfaceSymmetry: number;
  shell: number;
  /** Root-mean-square miss against the measured masses it was fitted to, MeV. */
  rms: number;
  fitted: number;
}

/** The shell correction S(Z, N), MeV: positive (less bound) between closed shells, most negative at them. */
export const shellCorrection = (Z: number, N: number, C: number) => C * (shellShape(Z, N) - SHELL_C * (Z + N) ** (1 / 3));

/** The mass model's binding energy, MeV: the liquid drop, with the surface's asymmetry correction, less the shell correction. */
export function modelBinding(Z: number, N: number, m: MassModel): number {
  const A = Z + N;
  return liquidDropBinding(Z, N, m) + (m.surfaceSymmetry * (N - Z) ** 2) / A ** (4 / 3) - shellCorrection(Z, N, m.shell);
}

/** The mass model's mass excess, keV. */
export function modelMassExcess(Z: number, N: number, m: MassModel): number {
  return Z * MASS_EXCESS_H + N * MASS_EXCESS_N - 1000 * modelBinding(Z, N, m);
}

/** Solves a small linear system by Gaussian elimination with partial pivoting. */
function solve(M: number[][], b: number[]): number[] {
  const n = b.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let p = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[p][col])) p = r;
    [a[col], a[p]] = [a[p], a[col]];
    for (let r = col + 1; r < n; r++) {
      const f = a[r][col] / a[col][col];
      for (let k = col; k <= n; k++) a[r][k] -= f * a[col][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = a[r][n];
    for (let k = r + 1; k < n; k++) s -= a[r][k] * x[k];
    x[r] = s / a[r][r];
  }
  return x;
}

/**
 * Fits the mass model to every measured mass with Z and N of at least 8 by
 * least squares. The binding energy is linear in all seven coefficients, so
 * the fit is one solve of the normal equations. Against AME2020's 2,400 or so
 * measured masses it misses by 2.0 MeV (root mean square), against 3.1 MeV for
 * the liquid drop alone: what is left is mostly deformation, which it leaves
 * out.
 */
export function fitMassModel(table: NuclideTable, minZN = 8): MassModel {
  const rows: number[][] = [];
  const ys: number[] = [];
  for (const n of table.list) {
    if (n.Z < minZN || n.N < minZN || n.massExcess === null || n.fromSystematics) continue;
    const A = n.A;
    const I = n.N - n.Z;
    rows.push([A, -(A ** (2 / 3)), (-n.Z * (n.Z - 1)) / A ** (1 / 3), -(I * I) / A, pairingSign(n.Z, n.N) / Math.sqrt(A), (I * I) / A ** (4 / 3), -(shellShape(n.Z, n.N) - SHELL_C * A ** (1 / 3))]);
    ys.push((n.Z * MASS_EXCESS_H + n.N * MASS_EXCESS_N - n.massExcess) / 1000);
  }
  const k = rows[0].length;
  const AtA = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const Atb = new Array<number>(k).fill(0);
  rows.forEach((r, i) => {
    for (let p = 0; p < k; p++) {
      Atb[p] += r[p] * ys[i];
      for (let q = 0; q < k; q++) AtA[p][q] += r[p] * r[q];
    }
  });
  const x = solve(AtA, Atb);
  let ss = 0;
  rows.forEach((r, i) => {
    ss += (r.reduce((s, v, j) => s + v * x[j], 0) - ys[i]) ** 2;
  });
  const [volume, surface, coulomb, asymmetry, pairing, surfaceSymmetry, shell] = x;
  return { volume, surface, coulomb, asymmetry, pairing, surfaceSymmetry, shell, rms: Math.sqrt(ss / rows.length), fitted: rows.length };
}

/**
 * Masses for any nucleus: the measured (or AME's extrapolated) mass where
 * there is one, and beyond the last known isotope of each element the mass
 * model, shifted to join it, so that separation energies change smoothly at
 * the join. Returns keV.
 */
export function massesWithModel(table: NuclideTable, model: MassModel): (Z: number, N: number) => number | null {
  const shift = new Map<number, { nMax: number; nMin: number; hi: number; lo: number }>();
  for (let Z = 1; Z <= table.maxZ; Z++) {
    let nMax = -1;
    let nMin = Infinity;
    for (let N = table.minN[Z]; N <= table.maxN[Z]; N++) {
      if (table.get(Z, N)?.massExcess != null) {
        nMax = Math.max(nMax, N);
        nMin = Math.min(nMin, N);
      }
    }
    if (nMax < 0) continue;
    const hi = table.get(Z, nMax)!.massExcess! - modelMassExcess(Z, nMax, model);
    const lo = table.get(Z, nMin)!.massExcess! - modelMassExcess(Z, nMin, model);
    shift.set(Z, { nMax, nMin, hi, lo });
  }
  return (Z, N) => {
    if (Z < 1 || N < 0) return Z === 0 && N === 1 ? MASS_EXCESS_N : null;
    const known = table.get(Z, N)?.massExcess;
    if (known != null) return known;
    const s = shift.get(Z);
    if (!s) return modelMassExcess(Z, N, model);
    return modelMassExcess(Z, N, model) + (N > s.nMax ? s.hi : N < s.nMin ? s.lo : 0);
  };
}

/** The magic numbers for figures to mark. */
export { MAGIC };
