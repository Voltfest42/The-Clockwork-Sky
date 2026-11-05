/**
 * A toy rapid neutron-capture process (Chapter 23), in the waiting-point
 * approximation (Kratz et al. 1993). At billions of kelvin and 10²⁰ or more
 * neutrons per cm³, captures and the light that knocks neutrons out again,
 * (n,γ) ⇌ (γ,n), are both far faster than β decays, so each element's
 * isotopes settle into a balance set by Saha's equation for neutrons:
 *
 *   Y(A + 1)/Y(A) = n_n λ³/2 · ((A + 1)/A)^(3/2) · e^(S_n/kT),
 *
 * with λ = h/√(2π m_u kT) and S_n the neutron separation energy of A + 1
 * (partition functions left out). The balance piles each element up where S_n
 * falls to about 2–3 MeV, far out on the neutron-rich side, at its waiting
 * points; there it waits for a β decay to turn a neutron into a proton and
 * move on to the next element. Magic neutron numbers hold the path, because
 * the nucleus after a closed shell binds its extra neutron weakly.
 *
 * Masses there are mostly unmeasured, so they come from the course's mass
 * model joined to the measured ones (liquidDrop.ts), and β half-lives, where
 * unmeasured, from a Q-value rule fitted to the measured ones: log₁₀T½ =
 * a − b log₁₀Q_β. When the neutrons run out, every nucleus decays back along
 * its isobar to the first stable one; past bismuth, α decays carry it down
 * to lead and bismuth (or stop at thorium-232 and uranium-235 and -238). No
 * fission, no β-delayed neutrons, no late captures: a toy, and labelled one.
 *
 * Units: neutron density cm⁻³, temperature K, times s, energies keV.
 */

import { betaMinusQ, type NuclideTable } from './nuclides';

const K_B_KEV = 8.617_333_262e-8; // keV per K
const M_U_KEV = 931_494.102_42;
const HBAR_C_CM = 1.973_269_804e-8; // keV·cm

/** n_n λ³/2: the neutrons' Saha factor, dimensionless. */
export function sahaFactor(neutronDensity: number, T: number): number {
  const kT = K_B_KEV * T;
  const lambda = (2 * Math.PI * HBAR_C_CM) / Math.sqrt(2 * Math.PI * M_U_KEV * kT); // h c / √(2π m c² kT), cm
  return (neutronDensity * lambda ** 3) / 2;
}

/** The separation energy at which neighbouring isotopes are equally abundant, keV: S_a = kT ln(2/(n_n λ³)). */
export const waitingEnergy = (neutronDensity: number, T: number) => -K_B_KEV * T * Math.log(sahaFactor(neutronDensity, T));

export interface QRule {
  a: number;
  b: number;
  /** Root-mean-square scatter of log₁₀T½ about the rule, for the nuclides it was fitted to. */
  scatter: number;
  fitted: number;
}

/**
 * Fits log₁₀T½ (s) = a − b log₁₀(Q_β/MeV) to the measured β⁻ emitters with
 * Q_β above 3 MeV and half-lives under 100 s, the short-lived neutron-rich
 * nuclei most like those on the r-process path. Sargent's rule has b = 5.
 */
export function fitQRule(table: NuclideTable): QRule {
  const masses = (Z: number, N: number) => table.get(Z, N)?.massExcess ?? null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of table.list) {
    if (n.Z < 20 || n.halfLife === null || !Number.isFinite(n.halfLife) || n.halfLife > 100 || n.halfLifeBound) continue;
    if (n.decays[0]?.kind !== 'beta-minus' || n.fromSystematics) continue;
    const q = betaMinusQ(masses, n.Z, n.N);
    if (q === null || q < 3000 || table.get(n.Z + 1, n.N - 1)?.fromSystematics) continue;
    xs.push(Math.log10(q / 1000));
    ys.push(Math.log10(n.halfLife));
  }
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
  });
  const slope = sxy / sxx;
  const a = my - slope * mx;
  const scatter = Math.sqrt(ys.reduce((s, y, i) => s + (y - (a + slope * xs[i])) ** 2, 0) / ys.length);
  return { a, b: -slope, scatter, fitted: xs.length };
}

export interface RProcessSetup {
  table: NuclideTable;
  /** Mass excesses for every nucleus, keV: measured where known, the model beyond. */
  masses: (Z: number, N: number) => number | null;
  qRule: QRule;
}

export interface RConditions {
  /** Neutron density, cm⁻³. */
  neutronDensity: number;
  /** Temperature, K. */
  temperature: number;
  /** How long the neutrons last, s. */
  duration: number;
  /** Lightest and heaviest elements followed (default iron to Z = 100; the last is a sink). */
  zMin?: number;
  zMax?: number;
  steps?: number;
}

export interface IsotopeChain {
  Z: number;
  /** The first neutron number in `share`. */
  nFrom: number;
  /** Each isotope's share of the element in the (n,γ) ⇌ (γ,n) balance. */
  share: number[];
  /** The most abundant isotope's neutron number: the waiting point. */
  waitingN: number;
  /** The element's β-decay rate, s⁻¹, averaged over its isotopes. */
  betaRate: number;
}

/** The β⁻ half-life of a nucleus, s: measured when known, else from the Q-value rule. */
export function betaHalfLife(setup: RProcessSetup, Z: number, N: number): number {
  const n = setup.table.get(Z, N);
  if (n && n.halfLife !== null && Number.isFinite(n.halfLife) && n.decays[0]?.kind === 'beta-minus' && !n.halfLifeBound) return n.halfLife;
  const q = betaMinusQ(setup.masses, Z, N);
  if (q === null || q <= 0) return Infinity;
  return 10 ** (setup.qRule.a - setup.qRule.b * Math.log10(q / 1000));
}

/** Each element's isotopes in the balance at a neutron density and temperature. */
export function isotopeChains(setup: RProcessSetup, neutronDensity: number, T: number, zMin = 26, zMax = 100): IsotopeChain[] {
  const kT = K_B_KEV * T;
  const lnSaha = Math.log(sahaFactor(neutronDensity, T));
  const chains: IsotopeChain[] = [];
  for (let Z = zMin; Z <= zMax; Z++) {
    // Start from the valley's neutron-rich edge, roughly N = 1.5 Z for heavy elements, and run out to the drip line.
    const nFrom = Math.max(Z, Math.round(Z < 40 ? 1.2 * Z : 1.25 * Z + 0.004 * Z * Z));
    const logs = [0];
    let N = nFrom;
    for (; N < nFrom + 120; N++) {
      const mA = setup.masses(Z, N);
      const mB = setup.masses(Z, N + 1);
      if (mA === null || mB === null) break;
      const Sn = mA + 8071.31806 - mB;
      if (Sn <= 0) break;
      const A = Z + N;
      logs.push(logs[logs.length - 1] + lnSaha + 1.5 * Math.log((A + 1) / A) + Sn / kT);
    }
    const max = Math.max(...logs);
    const w = logs.map((l) => Math.exp(l - max));
    const total = w.reduce((s, x) => s + x, 0);
    const share = w.map((x) => x / total);
    let waitingN = nFrom;
    let betaRate = 0;
    share.forEach((p, i) => {
      if (p > share[waitingN - nFrom]) waitingN = nFrom + i;
      if (p > 1e-6) betaRate += (p * Math.LN2) / betaHalfLife(setup, Z, nFrom + i);
    });
    chains.push({ Z, nFrom, share, waitingN, betaRate });
  }
  return chains;
}

export interface RProcessRun {
  conditions: RConditions;
  chains: IsotopeChain[];
  /** Times kept, s, and each element's abundance then (per seed nucleus). */
  times: number[];
  elements: Float64Array[];
}

/**
 * Runs the toy: an iron-56 seed climbs from element to element, each waiting
 * at its waiting point for a β decay. With the isotopes in balance, only the
 * elements' abundances change: dY_Z/dt = λ_(Z−1) Y_(Z−1) − λ_Z Y_Z, stepped by
 * implicit Euler (exact in order of Z). The heaviest element collects
 * everything that reaches it.
 */
export function runRProcess(setup: RProcessSetup, c: RConditions): RProcessRun {
  const zMin = c.zMin ?? 26;
  const zMax = c.zMax ?? 100;
  const chains = isotopeChains(setup, c.neutronDensity, c.temperature, zMin, zMax);
  const rate = chains.map((ch, i) => (i === chains.length - 1 ? 0 : ch.betaRate));
  const steps = c.steps ?? 400;
  let Y = new Float64Array(chains.length);
  Y[0] = 1;
  const times = [0];
  const elements = [Y.slice()];
  // Steps grow geometrically from a thousandth of the shortest β half-life.
  const first = Math.min(c.duration / steps, 1e-3 / Math.max(...rate.slice(0, -1)));
  const growth = solveGrowth(first, c.duration, steps);
  let t = 0;
  let h = first;
  for (let k = 0; k < steps; k++) {
    if (k === steps - 1) h = c.duration - t;
    const next = new Float64Array(chains.length);
    for (let i = 0; i < chains.length; i++) next[i] = (Y[i] + (i > 0 ? h * rate[i - 1] * next[i - 1] : 0)) / (1 + h * rate[i]);
    Y = next;
    t += h;
    h *= growth;
    times.push(t);
    elements.push(Y.slice());
  }
  return { conditions: c, chains, times, elements };
}

/** The growth factor g for which first·(1 + g + … + g^(n−1)) = total. */
function solveGrowth(first: number, total: number, n: number): number {
  if (first * n >= total) return 1;
  let lo = 1;
  let hi = 2;
  while (first * ((hi ** n - 1) / (hi - 1)) < total) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (first * ((mid ** n - 1) / (mid - 1)) < total) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The abundance of every nucleus at a time: each element's abundance spread over its isotopes. Map from Z·1000 + N. */
export function nucleiAt(run: RProcessRun, k: number): Map<number, number> {
  const out = new Map<number, number>();
  run.chains.forEach((ch, i) => {
    const y = run.elements[k][i];
    if (y < 1e-12) return;
    ch.share.forEach((p, j) => {
      if (p * y > 1e-14) out.set(ch.Z * 1000 + ch.nFrom + j, p * y);
    });
  });
  return out;
}

/** Abundances added up by mass number. */
export function massPattern(nuclei: Map<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const [k, y] of nuclei) {
    const A = Math.floor(k / 1000) + (k % 1000);
    out.set(A, (out.get(A) ?? 0) + y);
  }
  return out;
}

/**
 * Where each mass number ends after the neutrons stop: β⁻ decays keep A and
 * climb to the first stable isobar (so the r-process cannot reach isobars
 * shielded behind a stable one); past bismuth, α decays lower A by 4 until
 * the chain reaches lead or bismuth, unless it stops at thorium-232 or
 * uranium-235 or -238, which outlast the Solar System. Returns a map from
 * the final A to abundance.
 */
export function decayBack(pattern: Map<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const [A0, y] of pattern) {
    let A = A0;
    while (A > 209 && A !== 232 && A !== 235 && A !== 238) A -= 4;
    out.set(A, (out.get(A) ?? 0) + y);
  }
  return out;
}

/** The first stable (or long-lived) nucleus a β⁻ chain of mass A reaches, climbing from the neutron-rich side. */
export function firstStableIsobar(table: NuclideTable, A: number): { Z: number; N: number } | null {
  for (let Z = 1; Z < A; Z++) {
    const n = table.get(Z, A - Z);
    if (n && n.halfLife !== null && n.halfLife > 1e16) return { Z, N: A - Z };
  }
  return null;
}

export interface RPatterns {
  /** At each kept time: the pattern by mass number if the neutrons stopped then, decayed back to stability. */
  frozen: Map<number, number>[];
  /** At each kept time: the average of those patterns over every stopping time so far, as if bursts of every length up to then had mixed (the steady flow). */
  averaged: Map<number, number>[];
  /** At each kept time, the share that has reached the heaviest element and is taken to have split. */
  fissioned: number[];
}

/**
 * The patterns a run leaves. Nuclei that reach the heaviest element followed
 * are taken to split (fission, which the toy leaves out) and are not counted.
 */
export function rPatterns(run: RProcessRun): RPatterns {
  const zTop = run.chains[run.chains.length - 1].Z;
  const frozen: Map<number, number>[] = [];
  const averaged: Map<number, number>[] = [];
  const fissioned: number[] = [];
  const sum = new Map<number, number>();
  for (let k = 0; k < run.times.length; k++) {
    const nuclei = nucleiAt(run, k);
    for (const key of [...nuclei.keys()]) if (Math.floor(key / 1000) >= zTop) nuclei.delete(key);
    const pattern = decayBack(massPattern(nuclei));
    frozen.push(pattern);
    fissioned.push(run.elements[k][run.chains.length - 1]);
    if (k > 0) {
      const w = run.times[k] - run.times[k - 1];
      for (const [A, y] of pattern) sum.set(A, (sum.get(A) ?? 0) + w * y);
    }
    const t = run.times[k];
    averaged.push(k === 0 ? new Map(pattern) : new Map([...sum].map(([A, y]) => [A, y / t])));
  }
  return { frozen, averaged, fissioned };
}
