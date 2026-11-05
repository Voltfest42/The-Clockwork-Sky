/**
 * The slow neutron-capture process (Chapter 23): an iron seed catching
 * neutrons one at a time, at a fixed neutron density and temperature, with
 * every nucleus that the path can reach between iron and polonium. Each
 * nucleus catches neutrons at λ_n = n_n⟨σv⟩ = n_n σ v_T, with σ the
 * Maxwellian-averaged cross section at kT = 30 keV from KADoNiS (Dillmann et
 * al.), and decays at its measured (terrestrial) half-life, by β⁻, β⁺ or
 * electron capture, or α, in the shares ENSDF gives. A capture that makes a
 * nucleus outside the network (one so short-lived that it decays before it
 * could catch anything) goes straight on through its decays.
 *
 * The network is linear in the abundances, dY/dt = MY, and stiff: some
 * nuclei decay in seconds while others wait a thousand years for a neutron.
 * It is stepped by implicit Euler in the neutron exposure τ = ∫n_n v_T dt
 * (mb⁻¹; 1 mb⁻¹ = 10²⁷ neutrons per cm²), each step solved by Gauss–Seidel
 * sweeps in the order the flow runs, which is exact after one sweep except
 * for the loop at the end, where bismuth-210 decays to polonium-210 and that
 * α-decays back to lead-206.
 *
 * Units: neutron density in cm⁻³, cross sections in mb, exposures in mb⁻¹,
 * rates in s⁻¹ and times in s. Abundances are numbers of nuclei per seed
 * nucleus.
 */

import { nuclideName, nuclideSymbol, type Nuclide, type NuclideTable } from './nuclides';

/** The KADoNiS data file's shape. */
export interface KadonisData {
  isotopes: { Z: number; A: number; isomer?: string; macs30: number; err30: number }[];
}

/** The neutron's mass energy, keV (CODATA 2018). */
const NEUTRON_MASS_KEV = 939_565.42;
const C_CM = 2.997_924_58e10;

/** The thermal speed v_T = √(2kT/m_n) at which KADoNiS's cross sections are averaged, cm/s. */
export function thermalSpeed(kTkeV = 30): number {
  return Math.sqrt((2 * kTkeV) / NEUTRON_MASS_KEV) * C_CM;
}

/** The time (s) a neutron exposure τ (mb⁻¹) takes at neutron density n_n (cm⁻³): t = τ / (n_n v_T). */
export const exposureTime = (tau: number, neutronDensity: number, kT = 30) => (tau * 1e27) / (neutronDensity * thermalSpeed(kT));

/** A nucleus's capture rate, s⁻¹: λ_n = n_n σ v_T. */
export const captureRate = (sigmaMb: number, neutronDensity: number, kT = 30) => neutronDensity * sigmaMb * 1e-27 * thermalSpeed(kT);

const LN2 = Math.LN2;
/** Long enough to count as stable while stars make it, s (about 30 million years). */
const LONG_LIVED = 1e15;

export interface CaptureNucleus {
  Z: number;
  N: number;
  A: number;
  /** Cross section at 30 keV, mb. */
  sigma: number;
  /** Whether σ is measured (KADoNiS) or estimated from neighbours. */
  measured: boolean;
  /** Decay rates, s⁻¹. */
  beta: number;
  ec: number;
  alpha: number;
  halfLife: number;
  /** Stable, or long-lived enough to count as stable here. */
  stable: boolean;
}

export interface SNetwork {
  nuclei: CaptureNucleus[];
  /** Where a capture on nucleus i ends (after any instant decays), −1 beyond the network. */
  captureTo: Int32Array;
  betaTo: Int32Array;
  ecTo: Int32Array;
  alphaTo: Int32Array;
  /** The order the flow runs in. */
  order: Int32Array;
  index: Map<number, number>;
}

const key = (Z: number, N: number) => Z * 1000 + N;
const decayRate = (n: Nuclide, kind: 'beta-minus' | 'beta-plus' | 'alpha') => {
  if (n.halfLife === null || !Number.isFinite(n.halfLife) || n.halfLife <= 0) return 0;
  const d = n.decays.filter((x) => x.kind === kind);
  if (!d.length) return 0;
  const share = n.decays.length === 1 || n.decays[0].kind === kind ? (d[0].share ?? 100) : (d[0].share ?? 0);
  return (LN2 / n.halfLife) * Math.min(1, share / 100);
};

/** Cross sections by nucleus: KADoNiS's ground-state values (Ta-180's isomer, nature's only one, stands for Ta-180). */
export function crossSections(macs: KadonisData): Map<number, number> {
  const map = new Map<number, number>();
  for (const i of macs.isotopes) {
    if (i.isomer === 'm' && !(i.Z === 73 && i.A === 180)) continue;
    map.set(key(i.Z, i.A - i.Z), i.macs30);
  }
  return map;
}

/**
 * Builds the network: for each element from `zMin` to `zMax`, its isotopes
 * from the lightest to one past the heaviest stable one (for technetium and
 * promethium, which have none, the isotopes living over an hour between their
 * neighbours'), and polonium-210 to close the path.
 */
export function buildSNetwork(table: NuclideTable, macs: KadonisData, zMin = 26, zMax = 83): SNetwork {
  const sigma = crossSections(macs);
  const stableRange = (Z: number): [number, number] | null => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let N = table.minN[Z]; N <= table.maxN[Z]; N++) {
      const n = table.get(Z, N);
      if (n && n.halfLife !== null && n.halfLife > LONG_LIVED) {
        lo = Math.min(lo, N);
        hi = Math.max(hi, N);
      }
    }
    return lo <= hi ? [lo, hi] : null;
  };
  const chosen: Nuclide[] = [];
  for (let Z = zMin; Z <= zMax + 1; Z++) {
    const range = stableRange(Z);
    if (range && Z <= zMax) {
      for (let N = range[0]; N <= range[1] + 1; N++) {
        const n = table.get(Z, N);
        if (n) chosen.push(n);
      }
    } else {
      const below = stableRange(Z - 1);
      const above = Z <= zMax ? stableRange(Z + 1) : null;
      if (!below) continue;
      const lo = below[0];
      const hi = above ? above[1] : below[1] + 1;
      for (let N = lo; N <= hi; N++) {
        const n = table.get(Z, N);
        if (n && n.halfLife !== null && n.halfLife > 3600) chosen.push(n);
      }
    }
  }

  const index = new Map(chosen.map((n, i) => [key(n.Z, n.N), i]));
  const nuclei: CaptureNucleus[] = chosen.map((n) => {
    const s = sigma.get(key(n.Z, n.N));
    return {
      Z: n.Z,
      N: n.N,
      A: n.A,
      sigma: s ?? NaN,
      measured: s !== undefined,
      beta: decayRate(n, 'beta-minus'),
      ec: decayRate(n, 'beta-plus'),
      alpha: decayRate(n, 'alpha'),
      halfLife: n.halfLife ?? Infinity,
      stable: n.halfLife !== null && n.halfLife > LONG_LIVED,
    };
  });
  // Unmeasured cross sections: the geometric mean of the measured ones within two neutrons in the same element with the same neutron parity, else of any within four.
  for (const n of nuclei) {
    if (n.measured) continue;
    const pick = (width: number, parity: boolean) => {
      const logs: number[] = [];
      for (let dN = -width; dN <= width; dN++) {
        if (dN === 0 || (parity && dN % 2 !== 0)) continue;
        const s = sigma.get(key(n.Z, n.N + dN)) ?? sigma.get(key(n.Z + Math.sign(dN), n.N + dN - Math.sign(dN)));
        if (s) logs.push(Math.log(s));
      }
      return logs.length ? Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length) : NaN;
    };
    n.sigma = pick(2, true);
    if (!Number.isFinite(n.sigma)) n.sigma = pick(4, false);
    if (!Number.isFinite(n.sigma)) n.sigma = 100;
  }

  /** Follows instant decays from (Z, N) until it lands in the network. */
  const land = (Z: number, N: number): number => {
    for (let guard = 0; guard < 12; guard++) {
      const i = index.get(key(Z, N));
      if (i !== undefined) return i;
      if (Z > zMax + 1) return -1;
      const n = table.get(Z, N);
      const kind = n?.decays[0]?.kind ?? 'beta-minus';
      if (kind === 'beta-plus') [Z, N] = [Z - 1, N + 1];
      else if (kind === 'alpha') [Z, N] = [Z - 2, N - 2];
      else [Z, N] = [Z + 1, N - 1];
    }
    return -1;
  };
  const captureTo = Int32Array.from(nuclei, (n) => land(n.Z, n.N + 1));
  const betaTo = Int32Array.from(nuclei, (n) => (n.beta > 0 ? land(n.Z + 1, n.N - 1) : -1));
  const ecTo = Int32Array.from(nuclei, (n) => (n.ec > 0 ? land(n.Z - 1, n.N + 1) : -1));
  const alphaTo = Int32Array.from(nuclei, (n) => (n.alpha > 0 ? land(n.Z - 2, n.N - 2) : -1));

  // Kahn's topological order of the flow, leaving out α decays (the one loop); what remains goes in by mass.
  const indegree = new Int32Array(nuclei.length);
  for (const targets of [captureTo, betaTo, ecTo]) for (const t of targets) if (t >= 0) indegree[t]++;
  const queue: number[] = [];
  nuclei.forEach((_, i) => indegree[i] === 0 && queue.push(i));
  const order: number[] = [];
  const placed = new Uint8Array(nuclei.length);
  while (queue.length) {
    const i = queue.shift()!;
    order.push(i);
    placed[i] = 1;
    for (const targets of [captureTo, betaTo, ecTo]) {
      const t = targets[i];
      if (t >= 0 && --indegree[t] === 0) queue.push(t);
    }
  }
  nuclei
    .map((n, i) => ({ n, i }))
    .filter(({ i }) => !placed[i])
    .sort((a, b) => a.n.A - b.n.A || a.n.Z - b.n.Z)
    .forEach(({ i }) => order.push(i));

  return { nuclei, captureTo, betaTo, ecTo, alphaTo, order: Int32Array.from(order), index };
}

export interface SProcessOptions {
  /** Neutron density, cm⁻³ (AGB stars: 10⁷–10⁸ between pulses, 10¹⁰–10¹¹ in them). */
  neutronDensity: number;
  /** The largest exposure, mb⁻¹. */
  exposureMax?: number;
  /** The exposure step, mb⁻¹ (default 0.002: σΔτ = 0.2 for σ = 100 mb). */
  step?: number;
  /** How often to keep the abundances, mb⁻¹. */
  every?: number;
  /** The seed nuclei and their abundances (default: iron-56 alone). */
  seed?: readonly { Z: number; N: number; Y: number }[];
  kT?: number;
}

export interface SProcessRun {
  network: SNetwork;
  neutronDensity: number;
  /** The exposures kept, mb⁻¹, and the time each took, s. */
  exposures: number[];
  times: number[];
  /** Abundances at each kept exposure, per seed nucleus. */
  Y: Float64Array[];
}

/**
 * Runs the slow process: the seed exposed to neutrons at a fixed density,
 * from τ = 0 to `exposureMax`.
 */
export function runSProcess(net: SNetwork, o: SProcessOptions): SProcessRun {
  const nn = o.neutronDensity;
  const kT = o.kT ?? 30;
  const tauMax = o.exposureMax ?? 4;
  const dTau = o.step ?? 0.002;
  const every = o.every ?? 0.02;
  const n = net.nuclei.length;
  const secondsPerTau = exposureTime(1, nn, kT);
  // Rates per unit exposure (mb⁻¹): a capture's is σ (mb); a decay's is λ·t(τ = 1).
  const cap = Float64Array.from(net.nuclei, (x) => x.sigma);
  const beta = Float64Array.from(net.nuclei, (x) => x.beta * secondsPerTau);
  const ec = Float64Array.from(net.nuclei, (x) => x.ec * secondsPerTau);
  const alpha = Float64Array.from(net.nuclei, (x) => x.alpha * secondsPerTau);
  const loss = Float64Array.from(net.nuclei, (_, i) => cap[i] + beta[i] + ec[i] + alpha[i]);
  // Incoming flows, for Gauss–Seidel.
  const incoming: { from: number; rate: number }[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    if (net.captureTo[i] >= 0) incoming[net.captureTo[i]].push({ from: i, rate: cap[i] });
    if (net.betaTo[i] >= 0) incoming[net.betaTo[i]].push({ from: i, rate: beta[i] });
    if (net.ecTo[i] >= 0) incoming[net.ecTo[i]].push({ from: i, rate: ec[i] });
    if (net.alphaTo[i] >= 0) incoming[net.alphaTo[i]].push({ from: i, rate: alpha[i] });
  }

  let Y = new Float64Array(n);
  for (const s of o.seed ?? [{ Z: 26, N: 30, Y: 1 }]) {
    const i = net.index.get(key(s.Z, s.N));
    if (i !== undefined) Y[i] += s.Y;
  }
  const exposures = [0];
  const Ys = [Y.slice()];
  let tau = 0;
  let nextKeep = every;
  while (tau < tauMax - 1e-12) {
    const h = Math.min(dTau, tauMax - tau);
    const next = Y.slice();
    for (let sweep = 0; sweep < 40; sweep++) {
      let change = 0;
      for (const i of net.order) {
        let inflow = 0;
        for (const e of incoming[i]) inflow += e.rate * next[e.from];
        const y = (Y[i] + h * inflow) / (1 + h * loss[i]);
        change = Math.max(change, Math.abs(y - next[i]) / (Math.abs(y) + 1e-30));
        next[i] = y;
      }
      if (change < 1e-12 && sweep > 0) break;
    }
    Y = next;
    tau += h;
    if (tau >= nextKeep - 1e-9 || tau >= tauMax - 1e-12) {
      exposures.push(tau);
      Ys.push(Y.slice());
      nextKeep += every;
    }
  }
  return { network: net, neutronDensity: nn, exposures, times: exposures.map((t) => t * secondsPerTau), Y: Ys };
}

/** The abundances at an exposure, interpolated between the kept ones (linearly in τ). */
export function abundancesAt(run: SProcessRun, tau: number): Float64Array {
  const e = run.exposures;
  if (tau <= 0) return run.Y[0].slice();
  if (tau >= e[e.length - 1]) return run.Y[e.length - 1].slice();
  let k = 1;
  while (e[k] < tau) k++;
  const f = (tau - e[k - 1]) / (e[k] - e[k - 1]);
  const a = run.Y[k - 1];
  const b = run.Y[k];
  return Float64Array.from(a, (y, i) => y + f * (b[i] - y));
}

/**
 * The classical model's spread of exposures: the seed nuclei met
 * exponentially distributed exposures, ρ(τ) = e^(−τ/τ₀)/τ₀ (Seeger, Fowler &
 * Clayton 1965), so the abundances are the single-exposure ones averaged over
 * ρ. τ₀ ≈ 0.3 mb⁻¹ gives the Sun's main component.
 */
export function exponentialExposures(run: SProcessRun, tau0: number): Float64Array {
  const e = run.exposures;
  const out = new Float64Array(run.Y[0].length);
  for (let k = 1; k < e.length; k++) {
    const w0 = Math.exp(-e[k - 1] / tau0) / tau0;
    const w1 = Math.exp(-e[k] / tau0) / tau0;
    const h = (e[k] - e[k - 1]) / 2;
    const a = run.Y[k - 1];
    const b = run.Y[k];
    for (let i = 0; i < out.length; i++) out[i] += h * (w0 * a[i] + w1 * b[i]);
  }
  return out;
}

/**
 * Lets every unstable nucleus decay to the stable (or long-lived) nucleus it
 * ends as, after the neutrons stop, and adds the abundances up by nucleus.
 * Returns a map from Z·1000 + N to abundance.
 */
export function decayToStable(net: SNetwork, Y: ArrayLike<number>): Map<number, number> {
  const out = new Map<number, number>();
  const end = (i: number): number => {
    for (let guard = 0; guard < 20; guard++) {
      const x = net.nuclei[i];
      if (x.stable) return i;
      const total = x.beta + x.ec + x.alpha;
      if (!total) return i;
      const t = x.beta >= x.ec && x.beta >= x.alpha ? net.betaTo[i] : x.ec >= x.alpha ? net.ecTo[i] : net.alphaTo[i];
      if (t < 0) return i;
      i = t;
    }
    return i;
  };
  for (let i = 0; i < net.nuclei.length; i++) {
    if (!Y[i]) continue;
    const x = net.nuclei[i];
    // Branching decays split by their shares.
    const total = x.beta + x.ec + x.alpha;
    if (!x.stable && total > 0) {
      const parts = [
        [x.beta, net.betaTo[i]],
        [x.ec, net.ecTo[i]],
        [x.alpha, net.alphaTo[i]],
      ] as const;
      for (const [rate, to] of parts) {
        if (!rate || to < 0) continue;
        const j = end(to);
        const k = key(net.nuclei[j].Z, net.nuclei[j].N);
        out.set(k, (out.get(k) ?? 0) + (Y[i] * rate) / total);
      }
    } else {
      const k = key(x.Z, x.N);
      out.set(k, (out.get(k) ?? 0) + Y[i]);
    }
  }
  return out;
}

/** Abundances added up by mass number. */
export function byMass(net: SNetwork, Y: ArrayLike<number>): Map<number, number> {
  const out = new Map<number, number>();
  net.nuclei.forEach((x, i) => {
    if (Y[i]) out.set(x.A, (out.get(x.A) ?? 0) + Y[i]);
  });
  return out;
}

/** σN for each stable nucleus in the network, mb per seed nucleus. */
export function sigmaN(net: SNetwork, stableY: Map<number, number>): { Z: number; N: number; A: number; sigmaN: number }[] {
  const out: { Z: number; N: number; A: number; sigmaN: number }[] = [];
  for (const [k, y] of stableY) {
    const i = net.index.get(k);
    if (i === undefined) continue;
    const x = net.nuclei[i];
    out.push({ Z: x.Z, N: x.N, A: x.A, sigmaN: x.sigma * y });
  }
  return out.sort((a, b) => a.A - b.A || a.Z - b.Z);
}

export interface BranchPoint {
  Z: number;
  N: number;
  A: number;
  name: string;
  symbol: string;
  halfLife: number;
  /** The share that decays rather than catching a neutron. */
  decayShare: number;
}

/**
 * The branch points at a neutron density: unstable nuclei on the path that
 * live long enough for a neutron capture to compete with their decay, so the
 * path splits (between 5% and 95% each way).
 */
export function branchPoints(net: SNetwork, neutronDensity: number, kT = 30): BranchPoint[] {
  const out: BranchPoint[] = [];
  for (const x of net.nuclei) {
    if (x.stable) continue;
    const decay = x.beta + x.ec + x.alpha;
    if (!decay) continue;
    const capture = captureRate(x.sigma, neutronDensity, kT);
    const share = decay / (decay + capture);
    if (share > 0.05 && share < 0.95) out.push({ Z: x.Z, N: x.N, A: x.A, name: nuclideName(x.Z, x.A), symbol: nuclideSymbol(x.Z, x.A), halfLife: x.halfLife, decayShare: share });
  }
  return out.sort((a, b) => a.A - b.A);
}

/**
 * The classical steady flow along a chain of cross sections (Clayton et al.
 * 1961), for an exponential spread of exposures: σ_A N_A = (N₀/τ₀)
 * Π [1 + 1/(σ_i τ₀)]⁻¹, the product over every nucleus from the seed to A.
 * Each nucleus with a small cross section takes a big bite out of the flow.
 */
export function classicalSigmaN(sigmas: readonly number[], tau0: number, seed = 1): number[] {
  const out: number[] = [];
  let product = seed / tau0;
  for (const s of sigmas) {
    product /= 1 + 1 / (s * tau0);
    out.push(product);
  }
  return out;
}
