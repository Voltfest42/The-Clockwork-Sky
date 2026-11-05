import { AMU, G, K_B, M_SUN } from '../constants';
import { gamma1Pairs, OXYGEN, type HotGas } from '../structure/fermi';
import { radiationShare, solveLaneEmden, type LaneEmden } from '../structure/laneEmden';

/**
 * Pair instability (Chapter 25). Hot enough (above about a billion kelvin) and
 * thin enough, a core's light makes electron–positron pairs; squeezing it then
 * makes more pairs instead of raising its pressure as much, and its adiabatic
 * exponent Γ₁ falls below 4/3, the value below which a star can't hold itself
 * up. Here Γ₁ is computed exactly for oxygen ions, electrons with their pairs
 * (Fermi–Dirac, `structure/fermi.ts`) and light, so the region where it dips
 * below 4/3, the "wedge" on the core's map, is the physics, not a sketch.
 *
 * Cores follow lines on the map: Eddington's standard model (an n = 3
 * polytrope with a fixed share β of gas pressure, from his quartic) puts the
 * centre of a core of mass M at T_c = (4π)^{1/3} B₃ G M^{2/3} β μ m_u ρ_c^{1/3}/k,
 * a line of slope 3, lower for heavier cores. A star is unstable when its
 * pressure-weighted average ⟨Γ₁⟩ = ∫Γ₁P dV / ∫P dV falls below 4/3 (Ledoux),
 * which needs enough of the core inside the wedge, not just its centre.
 *
 * SI: densities kg/m³, temperatures K, masses kg (M☉ where marked).
 */

/** Oxygen's mean mass per particle when fully ionised: 16/9 atomic mass units. */
export const OXYGEN_MU = 16 / 9;

let n3: LaneEmden | undefined;
const polytrope3 = () => (n3 ??= solveLaneEmden(3, { samples: 801 }));

/** B₃ = ω₃^{−2/3}/4 in P_c = (4π)^{1/3} B₃ G M^{2/3} ρ_c^{4/3}. */
export function b3(): number {
  return polytrope3().massConstant ** (-2 / 3) / 4;
}

/** The share of a core's pressure from gas, β, for a mass in M☉, by Eddington's quartic with oxygen's μ. */
export function gasShareOf(massSolar: number, mu = OXYGEN_MU): number {
  return 1 - radiationShare(massSolar * M_SUN, mu, polytrope3());
}

/** The central density (kg/m³) of a core of mass M (M☉) whose centre is at T (K), by the standard model. */
export function standardDensity(massSolar: number, T: number, mu = OXYGEN_MU): number {
  const beta = gasShareOf(massSolar, mu);
  const coeff = Math.cbrt(4 * Math.PI) * b3() * G * (massSolar * M_SUN) ** (2 / 3) * beta * mu * AMU / K_B;
  return (T / coeff) ** 3;
}

/** A core's track on the map: its centre's density at each temperature, for log₁₀ T from `logT[0]` to `logT[1]`. */
export function standardTrack(massSolar: number, logT: readonly [number, number], n = 40): { T: number; rho: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const T = 10 ** (logT[0] + ((logT[1] - logT[0]) * i) / (n - 1));
    return { T, rho: standardDensity(massSolar, T) };
  });
}

// Sixteen-point Gauss–Legendre on [0, 1], for the averages over the polytrope.
const GL16 = (() => {
  const x = [0.0950125098376374, 0.2816035507792589, 0.4580167776572274, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499];
  const w = [0.1894506104550685, 0.1826034150449236, 0.1691565193950025, 0.1495959888165767, 0.1246289712555339, 0.0951585116824928, 0.0622535239386479, 0.0271524594117541];
  const nodes: { x: number; w: number }[] = [];
  for (let i = 0; i < 8; i++) {
    nodes.push({ x: 0.5 * (1 - x[i]), w: 0.5 * w[i] });
    nodes.push({ x: 0.5 * (1 + x[i]), w: 0.5 * w[i] });
  }
  return nodes;
})();

/** θ at ξ on the n = 3 solution, by linear interpolation of its samples. */
function thetaAt(xi: number): number {
  const s = polytrope3();
  const f = (xi / s.xi1) * (s.xi.length - 1);
  const k = Math.min(s.xi.length - 2, Math.floor(f));
  const u = f - k;
  return Math.max(0, s.theta[k] + u * (s.theta[k + 1] - s.theta[k]));
}

/**
 * The pressure-weighted average ⟨Γ₁⟩ over a core of mass M (M☉) whose centre is
 * at T_c (K), with the standard model's profile (ρ = ρ_c θ³, T = T_c θ, P ∝ θ⁴),
 * by Gauss–Legendre in ξ. Below 4/3 the core can't hold itself up.
 */
export function averageGamma1(massSolar: number, Tc: number, gas: HotGas = OXYGEN): number {
  const s = polytrope3();
  const rhoC = standardDensity(massSolar, Tc);
  let num = 0;
  let den = 0;
  for (const { x, w } of GL16) {
    const xi = x * s.xi1;
    const th = thetaAt(xi);
    if (th <= 1e-3) continue;
    const weight = w * th ** 4 * xi * xi;
    num += weight * gamma1Pairs(rhoC * th ** 3, Tc * th, gas);
    den += weight;
  }
  return num / den;
}

export interface WedgeColumn {
  /** log₁₀ T (K), and the log₁₀ of the densest gas (g/cm³) with Γ₁ < 4/3 there, or null where there is none. */
  logT: number;
  top: number | null;
}

/**
 * The wedge where Γ₁ < 4/3, column by column across log T, between the
 * map's density limits (g/cm³): at each temperature, whether the thinnest gas
 * is unstable, and if so the density where Γ₁ climbs back through 4/3, by
 * bisection (Γ₁ rises with density, as the ions' share grows).
 */
export function pairWedge(logT: readonly [number, number], logRho: readonly [number, number], columns = 60, gas: HotGas = OXYGEN): WedgeColumn[] {
  const out: WedgeColumn[] = [];
  const g = (lt: number, lr: number) => gamma1Pairs(10 ** lr * 1000, 10 ** lt, gas) - 4 / 3;
  for (let c = 0; c <= columns; c++) {
    const lt = logT[0] + ((logT[1] - logT[0]) * c) / columns;
    if (g(lt, logRho[0]) >= 0) {
      out.push({ logT: lt, top: null });
      continue;
    }
    let lo = logRho[0];
    let hi = logRho[1];
    if (g(lt, hi) < 0) {
      out.push({ logT: lt, top: hi });
      continue;
    }
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (g(lt, mid) < 0) lo = mid;
      else hi = mid;
    }
    out.push({ logT: lt, top: (lo + hi) / 2 });
  }
  return out;
}

export interface CoreHistory {
  massSolar: number;
  /** Along the track: the centre's temperature (K) and density (kg/m³), Γ₁ there, and the whole core's ⟨Γ₁⟩. */
  points: { T: number; rho: number; centre: number; average: number }[];
  /** The least ⟨Γ₁⟩ along the track, and where; whether it falls below 4/3. */
  least: { T: number; average: number };
  unstable: boolean;
}

/** A core's path through the map: Γ₁ at its centre and on average as it contracts and heats, for log₁₀ T across `logT`. */
export function coreHistory(massSolar: number, logT: readonly [number, number] = [8.7, 9.8], n = 34): CoreHistory {
  const points = standardTrack(massSolar, logT, n).map((p) => ({ ...p, centre: gamma1Pairs(p.rho, p.T), average: averageGamma1(massSolar, p.T) }));
  const least = points.reduce((b, p) => (p.average < b.average ? p : b), points[0]);
  return { massSolar, points, least: { T: least.T, average: least.average }, unstable: least.average < 4 / 3 };
}

/** The lightest core (M☉) whose average Γ₁ dips below 4/3 on its way, by bisection between `lo` and `hi`. */
export function lightestUnstableCore(lo = 5, hi = 200): number {
  for (let i = 0; i < 18; i++) {
    const mid = Math.sqrt(lo * hi);
    if (coreHistory(mid, [8.8, 9.6], 24).unstable) hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}
