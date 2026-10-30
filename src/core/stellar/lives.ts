/**
 * Whole lives from the SSE port, for Chapters 17 and 18 and the Star Forge:
 * main-sequence and nuclear lifetimes, a life to its remnant, its phases, a
 * track read at any age, isochrones (every mass at one age), the turn-off, and
 * the fate of every initial mass, with pair instability and brown dwarfs added.
 *
 * Units are SSE's: masses in M☉, luminosities in L☉, radii in R☉, times in Myr.
 */
import { HYDROGEN_BURNING_LIMIT } from './brownDwarfs';
import { pairFate, pairRemnant, type PairFate } from './pairInstability';
import { DEFAULTS, evolveStar, type SseOptions, type SseStep, type SseTrack } from './sse/evolve';
import { landmarks, star } from './sse/star';
import { zcnsts } from './sse/zcnsts';
import type { ZConstants } from './sse/zfuncs';

/** SSE's solar metallicity. */
export const Z_SUN_SSE = 0.02;

/** SSE's metallicity for an iron abundance [Fe/H], on SSE's scale (Z = 0.02 is solar), kept inside its fitted range. */
export const zFromFeH = (feh: number): number => Math.min(0.03, Math.max(0.0001, Z_SUN_SSE * 10 ** feh));

const constants = new Map<number, ZConstants>();
function zc(z: number): ZConstants {
  let c = constants.get(z);
  if (!c) {
    c = zcnsts(z);
    constants.set(z, c);
  }
  return c;
}

/** How long a star of initial mass `mass` spends on the main sequence (Myr), from SSE's landmarks. */
export function msLifetime(mass: number, z = Z_SUN_SSE): number {
  const lm = landmarks();
  star(mass < 0.7 ? 0 : 1, mass, mass, lm, zc(z));
  return lm.tm;
}

/** How long it burns anything (Myr): SSE's nuclear lifetime, the end of the AGB or of the helium star. */
export function nuclearLifetime(mass: number, z = Z_SUN_SSE): number {
  const lm = landmarks();
  star(mass < 0.7 ? 0 : 1, mass, mass, lm, zc(z));
  return lm.tn;
}

/** The mass (M☉) whose main sequence lasts `age` Myr: the turn-off of a cluster of that age. Bisection in log mass. */
export function turnoffMass(age: number, z = Z_SUN_SSE): number {
  return massWhere((m) => msLifetime(m, z) - age);
}

/** The mass whose nuclear burning ends at `age` Myr: the heaviest star still shining in a cluster of that age. */
export function dyingMass(age: number, z = Z_SUN_SSE): number {
  return massWhere((m) => nuclearLifetime(m, z) - age);
}

/** The root of a function that falls with mass, between 0.1 and 100 M☉. */
function massWhere(f: (m: number) => number): number {
  let lo = Math.log(0.1);
  let hi = Math.log(100);
  if (f(Math.exp(lo)) <= 0) return 0.1;
  if (f(Math.exp(hi)) >= 0) return 100;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(Math.exp(mid)) > 0) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** A whole life, from the zero-age main sequence until it becomes a remnant (or leaves none), and a little beyond. */
export function lifeOf(mass: number, z = Z_SUN_SSE, options: Partial<SseOptions> = {}): SseTrack {
  // SSE's nuclear lifetime ignores winds, which only shorten a life; a little extra makes sure the remnant is reached.
  // (Below 0.1 M☉ SSE caps it at 10¹⁶ years; the main sequence is then nearly the whole life.)
  // Heavy stars stripped by their winds live on as helium stars past it, so the run is lengthened until it ends.
  let tEnd = Math.min(nuclearLifetime(mass, z), 2 * msLifetime(mass, z)) * 1.02 + 0.01;
  for (let tries = 0; ; tries++) {
    const track = evolveStar(mass, z, tEnd, options);
    if (track.types.some((t) => t.kw >= 10) || tries === 5) return track;
    tEnd *= 1.5;
  }
}

/** A track read at a time (Myr): interpolated between steps, or null before its start or after its end. */
export function stateAt(track: SseTrack, t: number): SseStep | null {
  const s = track.steps;
  if (!s.length || t < s[0].t || t > s[s.length - 1].t) return null;
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = s[lo];
  const b = s[hi];
  if (a.kw !== b.kw || b.t === a.t) return t - a.t < b.t - t || b.t === a.t ? a : b;
  const f = (t - a.t) / (b.t - a.t);
  const lin = (x: number, y: number) => x + f * (y - x);
  const log = (x: number, y: number) => (x > 0 && y > 0 ? Math.exp(lin(Math.log(x), Math.log(y))) : lin(x, y));
  const L = log(a.L, b.L);
  const R = log(a.R, b.R);
  return { ...a, t, mt: lin(a.mt, b.mt), mc: lin(a.mc, b.mc), L, R, T: 5772 * (L / R ** 2) ** 0.25, rc: lin(a.rc, b.rc), menv: lin(a.menv, b.menv), renv: lin(a.renv, b.renv) };
}

// —— Phases ——

/** Stellar types in words (SSE's numbering). */
export const TYPE_NAMES: Record<number, string> = {
  0: 'Main sequence (fully convective)',
  1: 'Main sequence',
  2: 'Crossing to a giant (the Hertzsprung gap)',
  3: 'Red giant',
  4: 'Burning helium in the core',
  5: 'Asymptotic giant branch',
  6: 'Asymptotic giant branch, pulsing',
  7: 'Helium star',
  8: 'Helium star, crossing',
  9: 'Helium giant',
  10: 'Helium white dwarf',
  11: 'Carbon–oxygen white dwarf',
  12: 'Oxygen–neon white dwarf',
  13: 'Neutron star',
  14: 'Black hole',
  15: 'Nothing left',
};

export interface Phase {
  kw: number;
  /** Start and end, Myr. */
  start: number;
  end: number;
}

/** A track's phases: runs of one stellar type, joining the two main-sequence types. */
export function phasesOf(track: SseTrack): Phase[] {
  const out: Phase[] = [];
  for (const step of track.steps) {
    const kw = step.kw === 0 ? 1 : step.kw;
    const last = out[out.length - 1];
    if (last && last.kw === kw) last.end = step.t;
    else {
      if (last) last.end = step.t;
      out.push({ kw, start: last ? last.end : step.t, end: step.t });
    }
  }
  return out.filter((p, i) => p.end > p.start || i === out.length - 1);
}

// —— Isochrones ——

export interface IsochronePoint {
  /** Initial mass, M☉. */
  mass: number;
  kw: number;
  L: number;
  R: number;
  T: number;
}

/**
 * Every star of one age (Myr) and metallicity that is still shining: masses from 0.1 M☉ to the heaviest not yet
 * a remnant. The main sequence is sampled evenly in log mass; above the turn-off, masses are chosen by how far
 * through their post-main-sequence lives they are, so the short phases near the turn-off get points too.
 */
export function isochrone(age: number, z = Z_SUN_SSE, options: { msPoints?: number; giantPoints?: number } = {}): IsochronePoint[] {
  const { msPoints = 40, giantPoints = 90 } = options;
  const mTo = turnoffMass(age, z);
  const mHi = dyingMass(age, z);
  const at = (m: number): IsochronePoint | null => {
    const track = evolveStar(m, z, age);
    const s = track.steps[track.steps.length - 1];
    if (!s || s.kw >= 10 || Math.abs(s.t - age) > 1e-6 * age) return null;
    return { mass: m, kw: s.kw, L: s.L, R: s.R, T: s.T };
  };
  const out: IsochronePoint[] = [];
  const lo = Math.log(0.1);
  const top = Math.log(Math.min(mTo, 100) * 0.999);
  for (let i = 0; i < msPoints; i++) {
    const p = at(Math.exp(lo + ((top - lo) * i) / (msPoints - 1)));
    if (p) out.push(p);
  }
  if (mTo < 100) {
    // The fraction φ of its post-main-sequence life each mass has lived, from 0 at the turn-off to 1 at mHi.
    const phi = (m: number) => (age - msLifetime(m, z)) / (nuclearLifetime(m, z) - msLifetime(m, z));
    for (let i = 1; i < giantPoints; i++) {
      const u = i / giantPoints;
      const target = u * u * (3 - 2 * u) * 0.5 + u * 0.5; // denser near both ends
      let a = Math.log(mTo);
      let b = Math.log(Math.min(mHi, 100));
      for (let k = 0; k < 40; k++) {
        const mid = (a + b) / 2;
        if (phi(Math.exp(mid)) < target) a = mid;
        else b = mid;
      }
      const p = at(Math.exp((a + b) / 2));
      if (p && (!out.length || p.mass > out[out.length - 1].mass)) out.push(p);
    }
  }
  return out;
}

// —— Fates ——

export type FateKind = 'brown-dwarf' | 'helium-wd' | 'co-wd' | 'one-wd' | 'neutron-star' | 'black-hole' | 'nothing';

export const FATE_NAMES: Record<FateKind, string> = {
  'brown-dwarf': 'Brown dwarf',
  'helium-wd': 'Helium white dwarf',
  'co-wd': 'Carbon–oxygen white dwarf',
  'one-wd': 'Oxygen–neon white dwarf',
  'neutron-star': 'Neutron star',
  'black-hole': 'Black hole',
  nothing: 'Nothing left',
};

export interface Fate {
  mass: number;
  kind: FateKind;
  /** The remnant's mass, M☉ (0 for nothing). */
  remnant: number;
  /** The helium core's mass at the end, M☉, and what pair instability makes of it. */
  heCore: number;
  pair: PairFate;
  /** When the star became a remnant, Myr (Infinity for a brown dwarf). */
  death: number;
}

const KIND_OF: Record<number, FateKind> = { 10: 'helium-wd', 11: 'co-wd', 12: 'one-wd', 13: 'neutron-star', 14: 'black-hole', 15: 'nothing' };

/**
 * What a star of initial mass `mass` (M☉) leaves behind. Below the hydrogen-burning limit it is a brown dwarf of
 * the same mass. Otherwise SSE runs the star to its remnant, and the helium core's mass at the end decides whether
 * pair instability shrinks the remnant or leaves nothing (SSE models neither).
 */
export function fateOf(mass: number, z = Z_SUN_SSE, options: Partial<SseOptions> = {}): Fate {
  if (mass < HYDROGEN_BURNING_LIMIT) return { mass, kind: 'brown-dwarf', remnant: mass, heCore: 0, pair: 'core-collapse', death: Infinity };
  return fateFromTrack(lifeOf(mass, z, options));
}

/** The fate of a star whose whole life (lifeOf) has been run. */
export function fateFromTrack(track: SseTrack): Fate {
  const steps = track.steps;
  const endIndex = steps.findIndex((s) => s.kw >= 10);
  const final = endIndex < 0 ? steps[steps.length - 1] : steps[endIndex];
  const before = endIndex > 0 ? steps[endIndex - 1] : final;
  const heCore = before.kw >= 7 && before.kw <= 9 ? before.mt : before.mc;
  const last = track.types[track.types.length - 1];
  let kind: FateKind = KIND_OF[final.kw] ?? (last.kw === 15 ? 'nothing' : 'co-wd');
  let remnant = kind === 'nothing' ? 0 : final.mt;
  const pair = kind === 'black-hole' || kind === 'neutron-star' ? pairFate(heCore) : 'core-collapse';
  if (pair !== 'core-collapse') {
    remnant = pairRemnant(heCore, remnant);
    if (remnant === 0) kind = 'nothing';
    else if (pair === 'direct-collapse' || pair === 'pulsational') kind = 'black-hole';
  }
  const death = endIndex < 0 ? Infinity : steps[endIndex].t;
  return { mass: track.m, kind, remnant, heCore, pair, death };
}

/** Fates across initial masses, log-spaced from 0.01 to `top` M☉. */
export function fateCurve(z = Z_SUN_SSE, options: Partial<SseOptions> = {}, n = 120, top = 300): Fate[] {
  const out: Fate[] = [];
  for (let i = 0; i < n; i++) out.push(fateOf(0.01 * (top / 0.01) ** (i / (n - 1)), z, options));
  return out;
}

/** The lightest initial mass (M☉) whose fate is `kind` or heavier in the list, by bisection between two masses that bracket the change. */
export function fateBoundary(lo: number, hi: number, isAbove: (f: Fate) => boolean, z = Z_SUN_SSE, options: Partial<SseOptions> = {}): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 30; i++) {
    const mid = Math.sqrt(a * b);
    if (isAbove(fateOf(mid, z, options))) b = mid;
    else a = mid;
  }
  return Math.sqrt(a * b);
}

export { DEFAULTS as SSE_DEFAULTS };

// —— White dwarfs ——

const MCH = 1.44;

/**
 * A white dwarf's luminosity (L☉) and radius (R☉) at a cooling age (Myr), by SSE's modified Mestel law (wdflag 1,
 * as in hrdiag.ts): carbon–oxygen cores unless `helium`.
 */
export function whiteDwarf(mass: number, coolingAge: number, z = Z_SUN_SSE, helium = false): { L: number; R: number; T: number } {
  const a = helium ? 4 : 16;
  const zp = z ** 0.4;
  let L: number;
  if (coolingAge < 9000) L = (300 * mass * zp) / (a * (coolingAge + 0.1)) ** 1.18;
  else {
    const fac = (9000.1 * a) ** 5.3;
    L = (300 * fac * mass * zp) / (a * (coolingAge + 0.1)) ** 6.48;
  }
  const R = Math.min(0.1, 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mass) ** (2 / 3) - (mass / MCH) ** (2 / 3))));
  return { L, R, T: 5772 * (L / R ** 2) ** 0.25 };
}

/** The cooling age (Myr) at which a white dwarf reaches a luminosity (L☉), inverting whiteDwarf by bisection in log age. */
export function coolingAgeFor(mass: number, L: number, z = Z_SUN_SSE): number {
  let lo = Math.log(1e-3);
  let hi = Math.log(1e6);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (whiteDwarf(mass, Math.exp(mid), z).L > L) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** Where the fate figures stop trusting the engine: the hydrogen-burning limit, SSE's validity, and pair instability's reach. */
export const FATE_LIMITS = { brownDwarf: HYDROGEN_BURNING_LIMIT, sseTop: 100 } as const;
