import { GM_EARTH, R_EARTH } from '../core/constants';
import { relativeOrbit } from '../core/nbody/diagnostics';
import { Simulation } from '../core/nbody/simulation';
import { circularSpeed, escapeSpeed, orbitPeriod } from '../core/nbody/twoBody';

/**
 * Newton's cannon (Figure 7.1): a ball fired sideways from the top of a very
 * tall mountain, computed with the n-body engine (Earth and a test particle,
 * leapfrog). Earth is a point mass with no air and no spin. Lengths in metres,
 * times in seconds, speeds in m/s.
 */

/** The mountain: 100 km high, above nearly all the air, as in Newton's thought experiment. */
export const LAUNCH_HEIGHT = 100_000;
const R0 = R_EARTH + LAUNCH_HEIGHT;

/** The speeds that matter at the cannon's mouth, m/s: 7.85 km/s to circle, 11.1 to escape. (At the ground they are 7.9 and 11.2.) */
export const CIRCULAR_SPEED = circularSpeed(GM_EARTH, R0);
export const ESCAPE_SPEED = escapeSpeed(GM_EARTH, R0);

/** How far the picture reaches from Earth's centre, in Earth radii; a path that goes farther leaves it. */
export const VIEW_LIMIT = 8;

export type Outcome = 'lands' | 'orbits' | 'escapes';

export interface Shot {
  /** Launch speed, m/s. */
  speed: number;
  outcome: Outcome;
  /** The path from the launch, as positions (m, Earth's centre at the origin, the mountain straight up) and times (s). */
  path: { x: number; y: number; t: number }[];
  /** How long the path lasts (s): to the landing, one full orbit, or leaving the picture. */
  duration: number;
  /** Where it lands, as a distance along the ground from the foot of the mountain (m). */
  range?: number;
  /** For an orbit: its period (s), and its lowest and highest heights above the ground (m). */
  period?: number;
  lowest?: number;
  highest?: number;
  /** Farthest from Earth's centre along the path (m). */
  farthest: number;
  /** The path runs out of the picture before it lands or comes round. */
  leaves: boolean;
}

/** Fires the cannon at a speed (m/s) and follows the ball until it lands, goes once round, or leaves the picture. */
export function fire(speed: number): Shot {
  const sim = new Simulation(
    [
      { gm: GM_EARTH, x: [0, 0, 0], v: [0, 0, 0] },
      { gm: 0, x: [0, R0, 0], v: [speed, 0, 0] },
    ],
    'leapfrog',
    1,
  );
  const orbit = relativeOrbit(sim.system, 1, 0);
  const escapes = orbit.energy >= 0;
  // A step of a 4,000th of the orbit (or 2 s on an open path), short enough that the path is drawn smooth and lands to within a few hundred metres.
  const dt = escapes ? 2 : Math.min(2, orbitPeriod(GM_EARTH, orbit.a) / 4_000);
  sim.configure('leapfrog', dt);
  const s = sim.system;
  const path = [{ x: 0, y: R0, t: 0 }];
  let swept = 0;
  let angle = Math.PI / 2;
  let farthest = R0;
  let outcome: Outcome = escapes ? 'escapes' : 'orbits';
  let range: number | undefined;
  let leaves = false;
  const limit = VIEW_LIMIT * R_EARTH;
  for (let k = 0; k < 400_000; k++) {
    const prev = { x: s.x[3], y: s.x[4], t: s.t };
    sim.advance(1);
    const x = s.x[3];
    const y = s.x[4];
    const r = Math.hypot(x, y);
    farthest = Math.max(farthest, r);
    const a = Math.atan2(y, x);
    if (r < R_EARTH) {
      // Land on the surface, between the last two points.
      const r0 = Math.hypot(prev.x, prev.y);
      const f = (r0 - R_EARTH) / (r0 - r);
      const hit = { x: prev.x + f * (x - prev.x), y: prev.y + f * (y - prev.y), t: prev.t + f * (s.t - prev.t) };
      path.push(hit);
      outcome = 'lands';
      range = (swept + clockwise(angle, Math.atan2(hit.y, hit.x))) * R_EARTH;
      break;
    }
    swept += clockwise(angle, a);
    angle = a;
    if (swept >= 2 * Math.PI) {
      path.push({ x: 0, y: R0, t: s.t });
      break;
    }
    if (r > limit) {
      path.push({ x, y, t: s.t });
      leaves = true;
      break;
    }
    if (k % 4 === 0) path.push({ x, y, t: s.t });
  }
  const shot: Shot = { speed, outcome, path, duration: path[path.length - 1].t, farthest, range, leaves };
  if (outcome === 'orbits') {
    shot.period = orbitPeriod(GM_EARTH, orbit.a);
    shot.lowest = orbit.a * (1 - orbit.e) - R_EARTH;
    shot.highest = orbit.a * (1 + orbit.e) - R_EARTH;
  }
  return shot;
}

/** The angle (radians) from direction `from` clockwise to direction `to`, between −π and π. */
function clockwise(from: number, to: number): number {
  let d = from - to;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** The point on a shot's path at time t (s), between the stored points. */
export function positionAt(shot: Shot, t: number): { x: number; y: number } {
  const p = shot.path;
  if (t <= 0) return p[0];
  if (t >= shot.duration) return p[p.length - 1];
  let lo = 0;
  let hi = p.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - p[lo].t) / (p[hi].t - p[lo].t || 1);
  return { x: p[lo].x + f * (p[hi].x - p[lo].x), y: p[lo].y + f * (p[hi].y - p[lo].y) };
}

/** Gravity's strength at a height above the ground (m), as a fraction of its strength at the ground. */
export function gravityAt(height: number): number {
  return (R_EARTH / (R_EARTH + height)) ** 2;
}

/** "9 minutes", "1 hour 28 minutes", "2 days". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minute${rest === 1 ? '' : 's'}` : ''}`;
  return `${Math.round(hours / 24)} days`;
}

/** What happened to a shot, in a sentence. */
export function describeShot(shot: Shot): string {
  const kms = (shot.speed / 1000).toFixed(1);
  if (shot.outcome === 'lands') {
    if (shot.speed === 0) return `At 0 km/s the ball drops straight down the side of the mountain, reaching the ground after ${formatDuration(shot.duration)}.`;
    const km = Math.round(shot.range! / 1000).toLocaleString('en-GB');
    return `At ${kms} km/s the ball falls back to the ground ${km} km away, after ${formatDuration(shot.duration)}.`;
  }
  if (shot.outcome === 'orbits') {
    const low = Math.round(shot.lowest! / 1000).toLocaleString('en-GB');
    const high = Math.round(shot.highest! / 1000).toLocaleString('en-GB');
    const out = shot.leaves ? ', swinging out beyond the edge of the picture' : '';
    return `At ${kms} km/s the ball falls all the way round: it is in orbit, going round every ${formatDuration(shot.period!)}, between ${low} and ${high} km up${out}.`;
  }
  return `At ${kms} km/s the ball escapes: Earth’s gravity slows it down but never stops it, and it never comes back.`;
}

/** The part of space the picture shows (m): a centre and half its width, fitted round the shots' paths and the mountain, with a little room. `aspect` is width ÷ height. */
export function viewFor(shots: readonly Shot[], aspect: number): { cx: number; cy: number; half: number } {
  let x0 = -150_000;
  let x1 = 150_000;
  let y0 = R_EARTH - 40_000;
  let y1 = R0 + 40_000;
  for (const shot of shots) {
    for (const p of shot.path) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = 1.12 * Math.max((x1 - x0) / 2, ((y1 - y0) / 2) * aspect);
  return { cx, cy, half };
}

/** A round length for a scale bar about a fifth of a view `half` metres across: 100 km, 2,000 km. */
export function scaleBarLength(half: number): number {
  const target = (2 * half) / 5;
  const p = 10 ** Math.floor(Math.log10(target));
  return [5, 2, 1].map((k) => k * p).find((len) => len <= target) ?? p;
}
