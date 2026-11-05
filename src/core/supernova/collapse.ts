import { M_SUN } from '../constants';
import { solveLaneEmden } from '../structure/laneEmden';

/**
 * Collapse and bounce (Chapter 25), a toy: one-dimensional Lagrangian
 * hydrodynamics of an iron core falling in, bouncing at nuclear density and
 * driving out a shock that stalls, with neutrino heating behind it that may or
 * may not revive it. It is the textbook scheme of von Neumann and Richtmyer: a
 * staggered leapfrog, mass shells as the grid, artificial viscosity to spread
 * the shock over a few shells, and Newtonian gravity.
 *
 * The matter is the "hybrid" equation of state of the simulation papers
 * (Janka, Zwerger & Mönchmeyer 1993; Dimmelmeier, Font & Müller 2002): a cold
 * part P = Kρ^Γ, with Γ softened to 1.30 between 10⁸ g/cm³ and nuclear density
 * (electron captures and the splitting of iron take pressure away, so the core
 * can't hold itself up) and 2.5 above (nuclear matter resists), joined
 * smoothly, plus a hot part with Γ_th = 1.5. The core starts as an n = 3
 * polytrope of K = 4.897 × 10¹⁴ CGS (relativistic electrons with μ_e = 2) at
 * 10¹⁰ g/cm³, cut at 10⁷ g/cm³ (1.43 M☉, 1,150 km), inside a warm mantle whose
 * density falls as r⁻³ out to eight times further (0.20 M☉ more), held up by heat
 * where its cold pressure falls short. Three energy terms stand in for the
 * microphysics:
 *
 * - matter the shock heats pays 8.8 MeV per nucleon out of that heat, as its
 *   iron is split into free nucleons: this is what stalls the shock;
 * - after the bounce, neutrinos from the hot core heat the gas behind the
 *   shock, as 1.544 × 10²⁰ (L_ν/10⁵² erg/s)(r/100 km)⁻² erg/g/s for 4 MeV
 *   neutrinos, and the gas cools by giving out its own, as
 *   1.399 × 10²⁰ (T/2 MeV)⁶ erg/g/s (Janka 2001's "light bulb"), its
 *   temperature from light, pairs and free nucleons;
 * - none of this inside the neutrinospheres (above 10¹¹ g/cm³); and 15 ms after
 *   the bounce, shells denser than 10¹² g/cm³ settle into a fixed neutron star,
 *   so its stiff matter doesn't set the time step.
 *
 * Units inside are CGS; what it returns is SI (m, m/s, kg/m³, s, J).
 */

const G_CGS = 6.674_3e-8;
const MSUN_G = M_SUN * 1000;
const MEV = 1.602_176_634e-6; // erg
const M_U = 1.660_539e-24; // g
const A_RAD_CGS = 7.565_7e-15;
const K_B_CGS = 1.380_649e-16;

/** The hybrid equation of state's constants (CGS). */
export const HYBRID = {
  K: 4.897e14,
  gamma1: 1.3,
  gamma2: 2.5,
  gammaTh: 1.5,
  rhoNuc: 2e14,
  rhoSoft: 1e8,
} as const;
/** Iron split into free nucleons: 8.8 MeV per nucleon, erg/g. */
const DISSOCIATION = (8.8 * MEV) / M_U;
/** Where neutrinos stop streaming freely: no heating or cooling deeper than this, g/cm³. */
const NEUTRINOSPHERE = 1e11;
/** After the bounce, shells denser than this (g/cm³) are taken into the settled neutron star and held fixed… */
const FROZEN = 1e12;
/** …from this long after it, s. */
const SETTLE = 0.015;
/** The mantle: where the core is cut (g/cm³), and how many times further out it reaches. */
const MANTLE = { rho: 1e7, extent: 8 };

/**
 * The cold part of the equation of state, three polytropic pieces joined so the pressure and the energy per gram are
 * continuous: Γ = 4/3 below ρ_soft (the starting core's own law, so its outer layers start in balance), the softened
 * Γ₁ up to nuclear density (where electron captures and the splitting of iron take pressure away), and Γ₂ above.
 * Pressure and energy per gram (CGS) at density ρ, and the local index.
 */
function coldLaw(gamma1: number) {
  const { K, gamma2, rhoNuc, rhoSoft } = HYBRID;
  const g0 = 4 / 3;
  const K1 = K * rhoSoft ** (g0 - gamma1);
  const K2 = K1 * rhoNuc ** (gamma1 - gamma2);
  const E1 = (K * rhoSoft ** (g0 - 1)) / (g0 - 1) - (K1 * rhoSoft ** (gamma1 - 1)) / (gamma1 - 1);
  const E2 = E1 + (K1 * rhoNuc ** (gamma1 - 1)) / (gamma1 - 1) - (K2 * rhoNuc ** (gamma2 - 1)) / (gamma2 - 1);
  return (rho: number): { P: number; e: number; gamma: number } => {
    if (rho < rhoSoft) {
      const P = K * Math.cbrt(rho) ** 4;
      return { P, e: (3 * P) / rho, gamma: g0 };
    }
    if (rho < rhoNuc) {
      const P = K1 * rho ** gamma1;
      return { P, e: P / ((gamma1 - 1) * rho) + E1, gamma: gamma1 };
    }
    const P = K2 * rho ** gamma2;
    return { P, e: P / ((gamma2 - 1) * rho) + E2, gamma: gamma2 };
  };
}

/** The temperature (K) of hot matter with thermal energy e (erg/g) at density ρ: light, pairs and free nucleons, (11/4)aT⁴/ρ + (3/2)kT/m_u. */
function temperature(eTh: number, rho: number): number {
  if (eTh <= 0) return 0;
  const a = (11 / 4) * (A_RAD_CGS / rho);
  const b = (1.5 * K_B_CGS) / M_U;
  // Newton on aT⁴ + bT = e, from the larger of the two one-term answers' minimum.
  let T = Math.min(eTh / b, (eTh / a) ** 0.25);
  for (let i = 0; i < 30; i++) {
    const f = a * T ** 4 + b * T - eTh;
    const step = f / (4 * a * T ** 3 + b);
    T -= step;
    if (Math.abs(step) < 1e-10 * T) break;
  }
  return T;
}

export interface CollapseOptions {
  /** Neutrino luminosity after the bounce, in units of 10⁵² erg/s (0 for none). */
  neutrinoLuminosity: number;
  /** Shells (default 100). */
  zones?: number;
  /** How long to run after the bounce, s (default 0.5). */
  after?: number;
  /** Central density at the start, g/cm³ (default 10¹⁰). */
  rhoC?: number;
  /** The softened index below nuclear density (default HYBRID.gamma1). */
  gamma1?: number;
}

export interface CollapseFrame {
  /** Time from the start, s. */
  t: number;
  /** Every shell's outer radius (m), velocity (m/s) and density (kg/m³), centre first. */
  r: Float32Array;
  v: Float32Array;
  rho: Float32Array;
  /** The shock's radius (m), or 0 before the bounce or if none. */
  shock: number;
}

export interface CollapseRun {
  /** The neutrino luminosity it was run with, 10⁵² erg/s. */
  neutrinoLuminosity: number;
  /** Time steps taken. */
  steps: number;
  /** Each shell's outer mass coordinate, M☉. */
  mass: number[];
  frames: CollapseFrame[];
  /** When the centre bounced, s from the start (NaN if it didn't). */
  bounce: number;
  /** The mass of the inner core that fell in together and bounced as one (M☉): inside the shock where it forms. */
  innerCore: number;
  /** How far the shock got before it stalled, m, and when; the radius it reached at the end. */
  stall: { radius: number; t: number };
  exploded: boolean;
  /** The energy of the matter moving outwards with more than it needs to escape, J (the explosion's energy). */
  explosionEnergy: number;
  /** Energy bookkeeping: total energy at the start and the end, and what heating, cooling and the splitting of iron added (J). */
  energy: { start: number; end: number; external: number; heating: number; cooling: number; dissociation: number };
}

/** Runs the toy from rest, the core's pressure suddenly softened, to `after` seconds past the bounce. */
export function runCollapse(options: CollapseOptions): CollapseRun {
  const N = options.zones ?? 100;
  const after = options.after ?? 0.5;
  const rhoC = options.rhoC ?? 1e10;
  const Lnu = options.neutrinoLuminosity;
  const cold = coldLaw(options.gamma1 ?? HYBRID.gamma1);

  // The starting core: n = 3 with K, so ρ = ρ_c θ³ at r = aξ, a = √(K(n + 1)ρ_c^{1/n − 1}/(4πG)), cut where it thins to
  // ρ_t; outside it, a warm mantle (the silicon and oxygen shells) whose density falls as r⁻³ out to 8 times further.
  const le = solveLaneEmden(3);
  const a = Math.sqrt((HYBRID.K * 4 * rhoC ** (1 / 3 - 1)) / (4 * Math.PI * G_CGS));
  const mOf = (k: number) => 4 * Math.PI * a ** 3 * rhoC * -le.xi[k] * le.xi[k] * le.dtheta[k];
  const thetaT = Math.cbrt(MANTLE.rho / rhoC);
  let kT = 1;
  while (kT < le.xi.length - 1 && le.theta[kT] > thetaT) kT++;
  const fT = (le.theta[kT - 1] - thetaT) / (le.theta[kT - 1] - le.theta[kT]);
  const xiT = le.xi[kT - 1] + fT * (le.xi[kT] - le.xi[kT - 1]);
  const mCore = mOf(kT - 1) + fT * (mOf(kT) - mOf(kT - 1));
  const rT = a * xiT;
  const nCore = Math.round(0.78 * N);
  const nMantle = N - nCore;
  const mantleMass = 4 * Math.PI * MANTLE.rho * rT ** 3 * Math.log(MANTLE.extent);
  // Shells: in the core, finer in the middle, where it bounces; in the mantle, equal steps in ln r, which hold equal masses.
  const weights = Array.from({ length: nCore }, (_, j) => 1 + 1.5 * (j / (nCore - 1)) ** 2);
  const wsum = weights.reduce((s, w) => s + w, 0);
  const dm = [...weights.map((w) => (w / wsum) * mCore), ...Array.from({ length: nMantle }, () => mantleMass / nMantle)];
  const mEdge = new Float64Array(N + 1);
  for (let j = 0; j < N; j++) mEdge[j + 1] = mEdge[j] + dm[j];
  // Radius at each mass coordinate in the core, by interpolating the Lane–Emden solution's m(ξ).
  const rAtMass = (m: number) => {
    let k = 1;
    while (k < kT && mOf(k) < m) k++;
    const m0 = mOf(k - 1);
    const m1 = mOf(k);
    const f = m1 > m0 ? Math.min(1, (m - m0) / (m1 - m0)) : 1;
    return a * (le.xi[k - 1] + f * (le.xi[k] - le.xi[k - 1]));
  };
  const r = new Float64Array(N + 1);
  for (let i = 1; i <= nCore; i++) r[i] = i === nCore ? rT : rAtMass(mEdge[i]);
  for (let i = nCore + 1; i <= N; i++) r[i] = rT * MANTLE.extent ** ((i - nCore) / nMantle);
  const u = new Float64Array(N + 1);
  const rho = new Float64Array(N);
  const e = new Float64Array(N);
  const P = new Float64Array(N);
  const q = new Float64Array(N);
  const split = new Float64Array(N); // energy already paid to split iron, erg/g
  const volume = (j: number) => ((4 * Math.PI) / 3) * (r[j + 1] ** 3 - r[j] ** 3);
  for (let j = 0; j < N; j++) rho[j] = dm[j] / volume(j);
  // The pressure that holds every shell up exactly, in the code's own terms, from the outside in; the star beyond the
  // mantle presses on it with a fixed pressure. Where the gas is thinner than ρ_soft, heat makes up whatever the cold
  // pressure lacks, so the mantle starts in balance; the softened core gets only its cold pressure, and falls.
  const hold = new Float64Array(N);
  const pExt = Math.max(0, cold(rho[N - 1]).P - (G_CGS * mEdge[N] * 0.5 * dm[N - 1]) / (4 * Math.PI * r[N] ** 4));
  hold[N - 1] = pExt + (G_CGS * mEdge[N] * 0.5 * dm[N - 1]) / (4 * Math.PI * r[N] ** 4);
  for (let i = N - 1; i >= 1; i--) hold[i - 1] = hold[i] + (G_CGS * mEdge[i] * 0.5 * (dm[i - 1] + dm[i])) / (4 * Math.PI * r[i] ** 4);
  for (let j = 0; j < N; j++) {
    const c = cold(rho[j]);
    const top = rho[j] < HYBRID.rhoSoft ? Math.max(0, hold[j] - c.P) : 0;
    e[j] = c.e + top / ((HYBRID.gammaTh - 1) * rho[j]);
    P[j] = c.P + top;
  }

  // Each shell's starting heat, so the shock's heating can be told from the mantle's own warmth.
  const eStart = Float64Array.from({ length: N }, (_, j) => e[j] - cold(rho[j]).e);
  const energyNow = () => {
    let E = 0;
    for (let j = 0; j < N; j++) {
      const uc = 0.5 * (u[j] + u[j + 1]);
      E += dm[j] * (e[j] + 0.5 * uc * uc);
    }
    for (let i = 1; i <= N; i++) {
      const dmi = i < N ? 0.5 * (dm[i - 1] + dm[i]) : 0.5 * dm[N - 1];
      E -= (G_CGS * mEdge[i] * dmi) / r[i];
    }
    return E;
  };
  // The pressure beyond the mantle does work on it as it moves (−P dV), which the bookkeeping counts.
  let external = 0;
  const start = energyNow();
  let heating = 0;
  let cooling = 0;
  let dissociation = 0;

  const frames: CollapseFrame[] = [];
  let t = 0;
  let bounce = NaN;
  let innerCore = NaN;
  let dt = 1e-5;
  let nextFrame = 0;
  const frameEvery = 2e-3;
  let maxShock = 0;
  let maxShockT = 0;
  let shock = 0;

  const frame = () => {
    frames.push({
      t,
      r: Float32Array.from(r.subarray(1), (x) => x / 100),
      v: Float32Array.from({ length: N }, (_, j) => 0.5 * (u[j] + u[j + 1]) / 100),
      rho: Float32Array.from(rho, (x) => x * 1000),
      shock: shock / 100,
    });
  };

  // Once the newborn neutron star has settled, its dense shells are held fixed and the shell outside them sits on a
  // hard wall, so the time step is set by the gas outside it rather than by the stiff matter inside.
  let wall = 0;
  let frozenLoss = 0;
  let steps = 0;
  for (; steps < 400_000; steps++) {
    if (t >= nextFrame) {
      frame();
      nextFrame += frameEvery;
    }
    if (Number.isFinite(bounce) && t > bounce + after) break;
    if (!Number.isFinite(bounce) && t > 1.5) break;

    // Time step: a fraction of the fastest sound crossing of any shell.
    if (Number.isFinite(bounce) && t > bounce + SETTLE) {
      while (wall < N - 20 && rho[wall] > FROZEN) {
        wall++;
        const uw = u[wall];
        frozenLoss += 0.5 * uw * uw * (0.5 * (dm[wall - 1] + (wall < N ? dm[wall] : 0)));
        u[wall] = 0;
      }
    }
    let dtMin = Infinity;
    for (let j = wall; j < N; j++) {
      const c = cold(rho[j]);
      const pth = Math.max(0, P[j] - c.P);
      const cs = Math.sqrt((c.gamma * c.P + HYBRID.gammaTh * pth) / rho[j]);
      const dr = r[j + 1] - r[j];
      const du = Math.abs(u[j + 1] - u[j]);
      dtMin = Math.min(dtMin, dr / (cs + 2 * du + 1e-30));
    }
    dt = Math.min(0.4 * dtMin, 1.1 * dt);

    // Momentum: the pressure and viscosity gradient and gravity at each interface (the centre stays put).
    for (let i = wall + 1; i <= N; i++) {
      const pin = P[i - 1] + q[i - 1];
      const pout = i < N ? P[i] + q[i] : pExt;
      const dmi = i < N ? 0.5 * (dm[i - 1] + dm[i]) : 0.5 * dm[N - 1];
      u[i] += dt * ((-4 * Math.PI * r[i] * r[i] * (pout - pin)) / dmi - (G_CGS * mEdge[i]) / (r[i] * r[i]));
    }
    external -= pExt * 4 * Math.PI * r[N] * r[N] * u[N] * dt;
    for (let i = wall + 1; i <= N; i++) r[i] = Math.max(r[i] + dt * u[i], r[i - 1] * 1.000001 + 1);

    const bounced = Number.isFinite(bounce);
    for (let j = wall; j < N; j++) {
      const v = volume(j);
      const rhoNew = dm[j] / v;
      const dV = 1 / rhoNew - 1 / rho[j];
      const du = u[j + 1] - u[j];
      // Artificial viscosity, quadratic and linear, only while squeezed.
      let qNew = 0;
      if (du < 0) {
        const c = cold(rhoNew);
        const cs = Math.sqrt((c.gamma * c.P) / rhoNew);
        qNew = rhoNew * (2 * du * du + 0.1 * cs * Math.abs(du));
      }
      // Energy: de = −(P̄ + q) dV, with P̄ the mean of the old and new pressures, solved exactly for the new e.
      const cNew = cold(rhoNew);
      const g = (HYBRID.gammaTh - 1) * rhoNew;
      let eNew = (e[j] - (0.5 * P[j] + qNew + 0.5 * (cNew.P - g * cNew.e)) * dV) / (1 + 0.5 * g * dV);
      // Splitting iron: shocked matter (thermal energy above a tenth of the cost) pays for it out of its heat.
      let eTh = eNew - cNew.e;
      if (bounced && split[j] < DISSOCIATION && eTh - eStart[j] > 0.1 * DISSOCIATION && rhoNew < HYBRID.rhoNuc) {
        const pay = Math.min(DISSOCIATION - split[j], 0.5 * (eTh - eStart[j]));
        split[j] += pay;
        eNew -= pay;
        eTh -= pay;
        dissociation -= pay * dm[j];
      }
      // Neutrinos: heating by the core's light bulb and cooling by the gas's own, outside the neutrinospheres.
      if (bounced && split[j] > 0 && rhoNew < NEUTRINOSPHERE) {
        const rc = 0.5 * (r[j] + r[j + 1]);
        const heat = Lnu > 0 ? 1.544e20 * Lnu * (1e7 / rc) ** 2 : 0;
        // Cooling ∝ T⁶, taken semi-implicitly (as a loss in proportion to the heat there is) so it can't overshoot.
        const start = Math.max(0, eTh);
        const cool = start > 0 ? 1.399e20 * ((K_B_CGS * temperature(start, rhoNew)) / (2 * MEV)) ** 6 : 0;
        const x = start > 0 ? (start + dt * heat) / (1 + (dt * cool) / start) : dt * heat;
        const gain = x - start;
        const heated = dt * heat;
        heating += heated * dm[j];
        cooling -= (heated - gain) * dm[j];
        eNew += gain;
      }
      rho[j] = rhoNew;
      e[j] = eNew;
      q[j] = qNew;
      P[j] = cNew.P + g * Math.max(0, eNew - cNew.e);
    }
    t += dt;

    // The bounce: the centre passes nuclear density and its inner shells turn round.
    if (!bounced && rho[0] > HYBRID.rhoNuc && u[2] > 0) {
      bounce = t;
    }
    // The shock: the outer edge of the outermost shell it has heated (each shell is marked once it has begun to pay
    // for splitting its iron, which only the shock's heat can start).
    if (Number.isFinite(bounce)) {
      let outer = -1;
      let inner = -1;
      for (let j = 0; j < N; j++) {
        if (split[j] > 0) {
          outer = j;
          if (inner < 0) inner = j;
        }
      }
      if (outer >= 0) {
        // Inside the next shell out, by how far its heat has climbed towards the mark.
        const k = outer + 1;
        const frac = k < N ? Math.min(1, Math.max(0, (e[k] - cold(rho[k]).e - eStart[k]) / (0.1 * DISSOCIATION))) : 0;
        shock = r[outer + 1] + (k < N ? frac * (r[k + 1] - r[k]) : 0);
        if (!Number.isFinite(innerCore)) innerCore = mEdge[inner] / MSUN_G;
        if (shock > maxShock) {
          maxShock = shock;
          maxShockT = t;
        }
      }
    }
  }
  frame();

  // The explosion's energy: shells moving out with positive total energy (kinetic + internal − gravitational).
  let explosionEnergy = 0;
  let outgoing = 0;
  for (let j = 0; j < N; j++) {
    const uc = 0.5 * (u[j] + u[j + 1]);
    const rc = 0.5 * (r[j] + r[j + 1]);
    const eTh = Math.max(0, e[j] - cold(rho[j]).e);
    const spec = 0.5 * uc * uc + eTh - (G_CGS * (mEdge[j] + 0.5 * dm[j])) / rc;
    if (uc > 0 && spec > 0) {
      explosionEnergy += spec * dm[j];
      outgoing += dm[j];
    }
  }
  const exploded = outgoing > 0.02 * MSUN_G && explosionEnergy > 1e49;
  return {
    neutrinoLuminosity: Lnu,
    steps,
    mass: Array.from(mEdge.subarray(1), (m) => m / MSUN_G),
    frames,
    bounce,
    innerCore,
    stall: { radius: maxShock / 100, t: maxShockT },
    exploded,
    explosionEnergy: explosionEnergy * 1e-7,
    energy: { start: start * 1e-7, end: (energyNow() + frozenLoss) * 1e-7, external: external * 1e-7, heating: heating * 1e-7, cooling: cooling * 1e-7, dissociation: dissociation * 1e-7 },
  };
}

/** The mass an untruncated n = 3 polytrope of the toy's K would hold, M☉ (the Chandrasekhar mass for μ_e = 2, near enough). */
export function toyPolytropeMass(): number {
  const le = solveLaneEmden(3);
  return (4 * Math.PI * (HYBRID.K / (Math.PI * G_CGS)) ** 1.5 * le.massConstant) / MSUN_G;
}

export { temperature as toyTemperature };
