/**
 * The Star Forge's model: the limits on what a reader can ask for, a whole
 * life summed up (its landmarks, phases and fate), brown dwarfs from published
 * cooling tracks, and what other models say where SSE's formulas stop.
 *
 * Units are SSE's: masses in M☉, luminosities in L☉, radii in R☉, times in Myr.
 */
import { T_SUN } from '../constants';
import { brownDwarfLuminosity, brownDwarfTemperature, HYDROGEN_BURNING_LIMIT } from './brownDwarfs';
import { zoneOf, type Zone } from './calibration';
import { fateFromTrack, phasesOf, stateAt, TYPE_NAMES, type Fate, type Phase } from './lives';
import { keptMassFate, type PairFate } from './pairInstability';
import { pmsAt, type PmsTrack } from './pms';
import type { SseStep, SseTrack } from './sse/evolve';

/** A star in the Forge: initial mass (M☉), metallicity Z on SSE's scale, and a multiplier on every wind. */
export interface ForgeStar {
  mass: number;
  z: number;
  wind: number;
}

/** What the inputs allow: masses from a brown dwarf of 10 Jupiters to 300 M☉, SSE's metallicities, and winds from none to three times SSE's. */
export const FORGE_LIMITS = {
  mass: [0.01, 300],
  z: [0.0001, 0.03],
  wind: [0, 3],
} as const;

/** The Sun's metallicity on SSE's scale, and as measured today (Asplund et al. 2021). */
export const Z_SUN_TODAY = 0.0139;

/**
 * Rounds a star's inputs so that nearby slider positions give the same star (and the same cached life): masses
 * and metallicities to three significant figures, winds to the nearest 0.05.
 */
export function snapStar(s: ForgeStar): ForgeStar {
  return { mass: Number(s.mass.toPrecision(3)), z: Number(s.z.toPrecision(3)), wind: Math.round(s.wind * 20) / 20 };
}

/** Keeps a star inside the limits, with a sentence for each value that had to move. Values that aren't numbers fall back to the Sun's. */
export function clampStar(input: { mass: number; z: number; wind: number }): { star: ForgeStar; notes: string[] } {
  const notes: string[] = [];
  const fit = (value: number, [lo, hi]: readonly [number, number], fallback: number, what: string, unit: string) => {
    if (!Number.isFinite(value)) {
      notes.push(`That ${what} isn’t a number, so it is ${fallback}${unit}.`);
      return fallback;
    }
    if (value < lo || value > hi) {
      const to = value < lo ? lo : hi;
      notes.push(`${what[0].toUpperCase()}${what.slice(1)} runs from ${lo} to ${hi}${unit}, so ${value}${unit} became ${to}${unit}.`);
      return to;
    }
    return value;
  };
  const star = {
    mass: fit(input.mass, FORGE_LIMITS.mass, 1, 'mass', ' M☉'),
    z: fit(input.z, FORGE_LIMITS.z, 0.02, 'metallicity', ''),
    wind: fit(input.wind, FORGE_LIMITS.wind, 1, 'wind strength', '×'),
  };
  return { star: snapStar(star), notes };
}

// —— Brown dwarfs ——

/** Not one of SSE's types: a brown dwarf, which never settles into fusing hydrogen and cools for ever. */
export const BROWN_DWARF_KW = 16;

/** How far the Forge follows a brown dwarf, Myr: 10 billion years, the end of Burrows et al.'s fits. */
export const BROWN_DWARF_END = 10_000;

/** Luminosity (L☉) and temperature (K) on a cooling track at an age (years): the table's, or beyond its end Burrows et al.'s fits, scaled to meet it. */
function cooling(track: PmsTrack, age: number): { L: number; T: number } {
  const s = pmsAt(track, age);
  if (s) return { L: s.luminosity, T: s.kelvin };
  const last = track.points[track.points.length - 1];
  const tLast = 10 ** last[0];
  if (age < tLast) {
    const first = track.points[0];
    return { L: 10 ** first[2], T: first[1] };
  }
  const L = (10 ** last[2] / brownDwarfLuminosity(track.mass, tLast)) * brownDwarfLuminosity(track.mass, age);
  const T = (last[1] / brownDwarfTemperature(track.mass, tLast)) * brownDwarfTemperature(track.mass, age);
  return { L, T };
}

/**
 * A brown dwarf's life (M☉ below the hydrogen-burning limit): BHAC15's tracks, interpolated in log mass between
 * the two nearest, and carried on to 10 billion years by Burrows et al.'s power laws where a table stops. The
 * steps are SSE-shaped, with the brown dwarf's own type number.
 */
export function brownDwarfLife(mass: number, tracks: readonly PmsTrack[], n = 120): SseTrack {
  const sorted = [...tracks].sort((a, b) => a.mass - b.mass);
  const lo = [...sorted].reverse().find((t) => t.mass <= mass) ?? sorted[0];
  const hi = sorted.find((t) => t.mass >= mass) ?? sorted[sorted.length - 1];
  const f = hi.mass === lo.mass ? 0 : Math.min(1, Math.max(0, Math.log(mass / lo.mass) / Math.log(hi.mass / lo.mass)));
  const start = Math.max(10 ** lo.points[0][0], 10 ** hi.points[0][0]);
  const end = BROWN_DWARF_END * 1e6;
  const steps: SseStep[] = [];
  for (let i = 0; i < n; i++) {
    const age = start * (end / start) ** (i / (n - 1));
    const a = cooling(lo, age);
    const b = cooling(hi, age);
    const L = 10 ** ((1 - f) * Math.log10(a.L) + f * Math.log10(b.L));
    const T = 10 ** ((1 - f) * Math.log10(a.T) + f * Math.log10(b.T));
    const R = Math.sqrt(L) / (T / T_SUN) ** 2;
    steps.push({ t: age / 1e6, kw: BROWN_DWARF_KW, mass0: mass, mt: mass, L, R, T, mc: 0, rc: 0, menv: mass, renv: R, epoch: 0 });
  }
  return {
    m: mass,
    z: 0.02,
    steps,
    types: [
      { t: steps[0].t, kw: BROWN_DWARF_KW, mt: mass },
      { t: steps[steps.length - 1].t, kw: BROWN_DWARF_KW, mt: mass },
    ],
  };
}

// —— Other models, where SSE stops ——

export interface OtherModels {
  /** The helium core (M☉) the star would end with if it kept its mass. */
  heCore: number;
  pair: PairFate;
  /** M☉; 0 for nothing left. */
  remnant: number;
}

/**
 * What models of metal-poor stars that keep their mass say about a star above 100 M☉, where SSE's formulas are
 * held at their edge (Heger & Woosley 2002): only for stars with a tenth of the Sun's metals or fewer (Z ≤ 0.002
 * on SSE's scale), since richer stars' winds are thought to strip them first. Null elsewhere.
 */
export function otherModels(star: ForgeStar): OtherModels | null {
  if (star.mass <= 100 || star.z > 0.002) return null;
  return keptMassFate(star.mass);
}

// —— A life summed up ——

export interface ForgeLife {
  star: ForgeStar;
  brownDwarf: boolean;
  track: SseTrack;
  phases: Phase[];
  fate: Fate;
  zone: Zone;
  other: OtherModels | null;
  /** When it leaves the main sequence and when it becomes a remnant, Myr (Infinity for a brown dwarf). */
  msEnd: number;
  death: number;
  /** The step where it is largest and where it is brightest, while still a star. */
  largest: SseStep;
  brightest: SseStep;
  /** The first step as a remnant, if it leaves one. */
  remnant: SseStep | null;
}

/** Sums up a life the engine has run (or a brown dwarf's). */
export function summarise(star: ForgeStar, track: SseTrack): ForgeLife {
  const brownDwarf = star.mass < HYDROGEN_BURNING_LIMIT;
  const living = track.steps.filter((s) => s.kw < 10 || s.kw === BROWN_DWARF_KW);
  const remnant = track.steps.find((s) => s.kw >= 10 && s.kw !== BROWN_DWARF_KW) ?? null;
  const fate: Fate = brownDwarf
    ? { mass: star.mass, kind: 'brown-dwarf', remnant: star.mass, heCore: 0, pair: 'core-collapse', death: Infinity }
    : fateFromTrack(track);
  const msEnd = brownDwarf ? Infinity : (track.steps.find((s) => s.kw >= 2)?.t ?? Infinity);
  const pick = (better: (a: SseStep, b: SseStep) => boolean) => living.reduce((a, b) => (better(b, a) ? b : a));
  return {
    star,
    brownDwarf,
    track,
    phases: brownDwarf ? [{ kw: BROWN_DWARF_KW, start: track.steps[0].t, end: track.steps[track.steps.length - 1].t }] : phasesOf(track),
    fate,
    zone: zoneOf(star.mass, star.z),
    other: otherModels(star),
    msEnd,
    death: fate.death,
    largest: pick((a, b) => a.R > b.R),
    brightest: pick((a, b) => a.L > b.L),
    remnant,
  };
}

/** Stellar types in words, with the brown dwarf added. */
export const FORGE_TYPE_NAMES: Record<number, string> = { ...TYPE_NAMES, [BROWN_DWARF_KW]: 'Brown dwarf, cooling' };

/** The state at a time (Myr): interpolated while it lives, the remnant's first step once it is one; null before the track starts. */
export function stateOf(life: ForgeLife, t: number): SseStep | null {
  if (t >= life.death && life.remnant) return life.remnant;
  const s = life.track.steps;
  if (t < s[0].t) return null;
  if (t >= s[s.length - 1].t) return s[s.length - 1];
  return stateAt(life.track, t);
}

// —— Links ——

/** One star as it appears in a link: "18,0.02,1". */
export const starToken = (s: ForgeStar) => `${s.mass},${s.z},${s.wind}`;

/** Stars from a link's "stars=" value ("25,0.02,1;25,0.0001,1"), at most four, each clamped; null if it can't be read. */
export function parseStars(text: string): { stars: ForgeStar[]; notes: string[] } | null {
  const parts = text.split(';').filter(Boolean).slice(0, 4);
  if (!parts.length) return null;
  const stars: ForgeStar[] = [];
  const notes: string[] = [];
  for (const p of parts) {
    const values = p.split(',').map(Number);
    if (values.length !== 3 || values.some((v) => !Number.isFinite(v))) return null;
    const c = clampStar({ mass: values[0], z: values[1], wind: values[2] });
    stars.push(c.star);
    notes.push(...c.notes);
  }
  return { stars, notes };
}
