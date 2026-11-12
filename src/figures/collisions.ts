import { CROSSING, stellarCollisions } from '../core/galaxy/encounters';
import { relativeMotion, mostLikelyLocalGroup } from '../core/galaxy/localGroup';
import type { FutureSummary, LocalGroupConfig } from '../core/galaxy/localGroupHost';
import {
  COLLISION_PRESETS,
  encounterSpec,
  MAIN_GALAXY,
  type CollisionConfig,
  type CollisionInfo,
  type CollisionPreset,
  type CollisionSample,
} from '../core/nbody/collisionHost';
import { GalaxyEncounter, isRing, ringReading, type RingReading } from '../core/nbody/restricted';
import { formatScientific } from '../core/math/scientific';
import { LOCAL_GROUP_ODDS, LOCAL_GROUP_SETS, SUN_FRAME } from '../data/localGroup';
import { ramp, rgb } from '../viz/particles/colour';

/**
 * What Chapter 31's figures share and their tests check: the presets'
 * descriptions, colours, captions, the ring check for the interactive
 * question, and the Local Group's odds.
 */

// ---------- Figure 31.1: colliding galaxies ----------

export const PRESET_INFO: Record<CollisionPreset, { label: string; about: string }> = {
  antennae: {
    label: 'The Antennae',
    about: 'The Antennae, after Toomre and Toomre (1972): two equal galaxies on a bound orbit (e = 0.5), both discs tilted 60° to it and turning with it',
  },
  mice: {
    label: 'The Mice',
    about: 'The Mice, after Toomre and Toomre (1972): two equal galaxies on a bound orbit (e = 0.6), one disc tilted 15° to it and the other 60°',
  },
  ring: {
    label: 'A ring galaxy',
    about: 'A ring galaxy, as Lynds and Toomre (1976) made them: a companion a third as heavy, with no disc of its own, plunging fast through the middle of the main disc along its axis',
  },
  flyby: {
    label: 'A flyby',
    about: 'A flyby: a companion a third as heavy, with no disc of its own, passing once on a parabolic orbit, in the main disc’s plane and in its direction of spin',
  },
};

export const SPEEDS = [
  { rate: 10, label: 'Slow' },
  { rate: 30, label: 'Normal' },
  { rate: 100, label: 'Fast' },
] as const;

export const MAIN_COLOUR = '#9cc8ff';
export const COMPANION_COLOUR = '#ffb36b';

/** A star's colour by where it started in its disc: yellow-white in the middle to blue at the edge. */
export function radiusColour(r: number, outer: number): [number, number, number] {
  return ramp([rgb('#fff1c9'), rgb('#f3b35b'), rgb('#e2603f'), rgb('#7dd3fc'), rgb('#6d8cff')], r / outer);
}

/** Which preset a configuration still is, if nothing has been changed. */
export function presetOf(config: CollisionConfig): CollisionPreset | null {
  const p = COLLISION_PRESETS[config.preset];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return same({ ...p, stars: 0, seed: 0 }, { ...config, stars: 0, seed: 0 }) ? config.preset : null;
}

/** "320 million years after the closest approach", "1.2 billion years before it". */
export function formatWhen(t: number): string {
  const a = Math.abs(t);
  const amount = a >= 1000 ? `${(a / 1000).toFixed(2)} billion years` : `${Math.round(a)} million years`;
  if (a < 0.5) return 'At the closest approach';
  return `${amount} ${t < 0 ? 'before' : 'after'} the closest approach`;
}

/** A tilt in words: "tilted 60° to the orbit and turning with it". */
function discWords(tilt: number, spin: 1 | -1): string {
  const turning = spin === 1 ? 'with' : 'against';
  if (tilt === 0) return `in the orbit’s plane, turning ${turning} the orbit`;
  if (tilt === 90) return 'standing upright to the orbit';
  return `tilted ${tilt}° to the orbit, turning ${turning} it`;
}

/** The setup in words. */
export function setupWords(config: CollisionConfig): string {
  const preset = presetOf(config);
  const mass = formatScientific(MAIN_GALAXY.mass, 1);
  const orbit = config.eccentricity < 1 ? `a bound orbit (e = ${config.eccentricity})` : config.eccentricity === 1 ? 'a parabolic orbit' : `an open orbit (e = ${config.eccentricity})`;
  const start = preset
    ? PRESET_INFO[preset].about
    : `Your own encounter: a main galaxy and a companion ${config.massRatio === 1 ? 'as heavy' : `${Math.round(config.massRatio * 100)}% as heavy`} on ${orbit}`;
  // A preset's own description already says how its discs lie
  const discs = preset
    ? ''
    : config.companion
      ? ` The main disc is ${discWords(config.main.tilt, config.main.spin)}; the companion’s is ${discWords(config.companion.tilt, config.companion.spin)}.`
      : ` The main disc is ${discWords(config.main.tilt, config.main.spin)}; the companion has no disc.`;
  return `${start}. The main galaxy weighs ${mass} M☉. Closest approach ${config.pericentre} kpc.${discs} Dynamical friction is ${config.friction ? 'on' : 'off'}.`;
}

/** Shares of all the stars: still home, taken by the other galaxy, or loose. */
export function fateShares(sample: CollisionSample): { home: number; taken: number; loose: number } {
  const n = sample.fates.A[0] + sample.fates.A[1] + sample.fates.A[2] + sample.fates.B[0] + sample.fates.B[1] + sample.fates.B[2];
  if (n === 0) return { home: 1, taken: 0, loose: 0 };
  return {
    home: (sample.fates.A[0] + sample.fates.B[0]) / n,
    taken: (sample.fates.A[1] + sample.fates.B[1]) / n,
    loose: (sample.fates.A[2] + sample.fates.B[2]) / n,
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The encounter's state in words, for the caption and the 3D view's description. */
export function collisionCaption(config: CollisionConfig, info: CollisionInfo, sample: CollisionSample, merged: number | null, closest: number): string {
  const setup = setupWords(config);
  const when = formatWhen(sample.t);
  let now: string;
  if (merged !== null && sample.t >= merged) {
    now = `${when}: the galaxies have merged into one (since ${Math.round(merged)} million years after their first closest approach)`;
  } else {
    now = `${when}: the galaxies are ${Math.round(sample.separation)} kpc apart, moving at ${Math.round(sample.speed)} km/s relative to each other`;
  }
  const f = fateShares(sample);
  const fates =
    f.taken + f.loose < 0.005
      ? 'Every star is still in its own galaxy.'
      : f.taken < 0.005
        ? `${pct(f.loose)} of the stars are loose, in tails and bridges.`
        : `${pct(f.loose)} of the stars are loose, in tails and bridges, and ${pct(f.taken)} now belong to the other galaxy.`;
  const close = sample.t > 0 ? ` They came within ${closest.toFixed(closest < 10 ? 1 : 0)} kpc.` : '';
  const ring = sample.t > 0 && isRing(sample.ring) ? ` A ring ${Math.round(2 * sample.ring.radius)} kpc across is spreading through the main disc.` : '';
  void info;
  return `${setup} ${now}.${close} ${fates}${ring}`;
}

/**
 * The interactive question's check: does this collision make a ring galaxy?
 * The same engine as Figure 31.1, with 3,000 stars in the main disc, followed
 * to 350 million years after the closest approach; a ring counts if at any
 * reading (every 10 million years, from 40 on) the main disc has one by
 * `isRing`.
 */
export function ringCheck(setup: { massRatio: number; pericentre: number; tilt: number }): { ring: boolean; best: RingReading; at: number } {
  const config: CollisionConfig = {
    ...COLLISION_PRESETS.ring,
    massRatio: setup.massRatio,
    pericentre: setup.pericentre,
    main: { tilt: setup.tilt, omega: 0, spin: 1 },
    stars: 3000,
    seed: 1,
  };
  const enc = new GalaxyEncounter(encounterSpec(config));
  let best: RingReading = { radius: 0, contrast: 1, coverage: 0 };
  let at = 0;
  let ring = false;
  while (enc.t < 350) {
    enc.step();
    if (enc.t >= 40 && Math.round(enc.t) % 10 === 0) {
      const r = ringReading(enc, 0);
      if (isRing(r) && !ring) {
        ring = true;
        best = r;
        at = enc.t;
      }
      if (!ring && r.coverage >= 0.75 && r.contrast > best.contrast) {
        best = r;
        at = enc.t;
      }
    }
  }
  return { ring, best, at };
}

/** §31.2's numbers: stars crossing a galaxy. */
export function crossingNumbers(speed = 300) {
  return stellarCollisions({ ...CROSSING, speed });
}

// ---------- Figure 31.2: will we collide? ----------

/** The futures so far, summed up. */
export function oddsOf(futures: readonly FutureSummary[]) {
  const n = futures.length;
  const times = futures
    .map((f) => f.merger)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  const share = n ? times.length / n : 0;
  const within5 = n ? times.filter((t) => t <= 5000).length / n : 0;
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  // Two standard errors of a share
  const error = n ? 2 * Math.sqrt((share * (1 - share)) / n) : 1;
  const lmc = futures.filter((f) => f.satellites.some((s) => s.name === 'LMC')).length;
  const m33 = futures.filter((f) => f.satellites.some((s) => s.name === 'M33' && s.into === 'M31')).length;
  return { n, merged: times.length, share, within5, median, error, lmc: n ? lmc / n : 0, m33: n ? m33 / n : 0, times };
}

/** The share of futures merged by each time (Myr), for the curve. */
export function mergedBy(times: readonly number[], n: number, step = 250, horizon = 10_000): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  let k = 0;
  for (let t = 0; t <= horizon; t += step) {
    while (k < times.length && times[k] <= t) k++;
    out.push({ x: t / 1000, y: n ? (100 * k) / n : 0 });
  }
  return out;
}

/** Which galaxies, in words. */
export function galaxiesWords(include: LocalGroupConfig['include']): string {
  if (include.M33 && include.LMC) return 'the Milky Way, Andromeda, M33 and the Large Magellanic Cloud';
  if (include.M33) return 'the Milky Way, Andromeda and M33';
  if (include.LMC) return 'the Milky Way, Andromeda and the Large Magellanic Cloud';
  return 'the Milky Way and Andromeda alone';
}

/** What the team found for the same galaxies, if they published it. */
export function publishedShare(config: LocalGroupConfig): number | null {
  const { M33, LMC } = config.include;
  const full = config.narrowing.m31Motion === 1 && config.narrowing.masses === 1 && config.narrowing.rest === 1 && config.friction;
  if (!full) return null;
  if (config.set === 'sawala2025') {
    const s = LOCAL_GROUP_ODDS.sawala2025;
    return M33 && LMC ? s.four : M33 ? s.withM33 : LMC ? s.withLmc : s.two;
  }
  return M33 && LMC ? LOCAL_GROUP_ODDS.wu2026.four : null;
}

/** Andromeda's motion at the most likely values of a set. */
export function andromedaMotion(set: LocalGroupConfig['set']) {
  return relativeMotion(mostLikelyLocalGroup(LOCAL_GROUP_SETS[set].data, SUN_FRAME));
}

/** The odds in words. */
export function localGroupCaption(config: LocalGroupConfig, odds: ReturnType<typeof oddsOf>, finished: boolean): string {
  if (odds.n === 0) return 'Computing the futures…';
  const set = LOCAL_GROUP_SETS[config.set];
  const narrowed: string[] = [];
  if (config.narrowing.m31Motion < 1) narrowed.push(`Andromeda’s sideways motion to ${pct(config.narrowing.m31Motion)}`);
  if (config.narrowing.masses < 1) narrowed.push(`the masses to ${pct(config.narrowing.masses)}`);
  if (config.narrowing.rest < 1) narrowed.push(`every other uncertainty to ${pct(config.narrowing.rest)}`);
  const head = `${finished ? '' : `So far ${odds.n.toLocaleString('en-GB')} of ${config.count.toLocaleString('en-GB')} futures. `}With ${galaxiesWords(config.include)}, measured as ${set.label} took them${narrowed.length ? `, uncertainties narrowed (${narrowed.join(', ')})` : ''}${config.friction ? '' : ', and no dynamical friction'}:`;
  const share = `the Milky Way and Andromeda merge within 10 billion years in ${pct(odds.share)} of the futures (give or take ${Math.max(1, Math.round(odds.error * 100))}%), and within 5 billion in ${pct(odds.within5)}.`;
  const median = odds.median !== null ? ` Those that merge take ${(odds.median / 1000).toFixed(1)} billion years at the median.` : '';
  const published = publishedShare(config);
  const theirs = published !== null && finished ? ` ${set.label} found ${pct(published)}.` : '';
  return `${head} ${share}${median}${theirs}`;
}
