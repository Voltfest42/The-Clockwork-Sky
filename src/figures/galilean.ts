import { cross, normalize, type Vec3 } from '../core/math/vec3';
import { SECONDS_PER_DAY } from '../core/units';
import type { BodySpec } from '../core/nbody/system';
import data from '../data/galilean.json';

/**
 * Jupiter's clockwork moons (Figure 8.3): Jupiter and its four large moons
 * from JPL Horizons on 1 January 2026, run by the n-body engine in km and
 * days. Io, Europa and Ganymede are locked in a 1 : 2 : 4 resonance (the
 * Laplace resonance): for every lap of Ganymede, Europa goes round twice and
 * Io four times, and the three never line up on the same side of Jupiter.
 */

export type MoonId = 'io' | 'europa' | 'ganymede' | 'callisto';

export const MOONS = data.moons.map((m) => ({ id: m.id as MoonId, name: m.name, gm: m.gm, x: m.x as unknown as Vec3, v: m.v as unknown as Vec3 }));
export const JUPITER_RADIUS_KM = data.jupiter.radiusKm;
export const EPOCH_TT = data.epochTT;

export const MOON_COLOURS: Record<MoonId, string> = { io: '#f2c94c', europa: '#e8e0d0', ganymede: '#a9b8d6', callisto: '#b08a68' };

/** Seconds² per day²: G·m in km³/s² becomes km³/day². */
const DAY2 = SECONDS_PER_DAY * SECONDS_PER_DAY;

/**
 * The bodies for the engine: Jupiter first, then the four moons; km and days,
 * in the frame of their centre of mass, so the system doesn't drift across the
 * picture (Jupiter wobbles by a few hundred metres).
 */
export function galileanBodies(): BodySpec[] {
  const bodies: BodySpec[] = [
    { gm: data.jupiter.gm * DAY2, x: [0, 0, 0], v: [0, 0, 0] },
    ...MOONS.map((m) => ({ gm: m.gm * DAY2, x: m.x, v: [m.v[0] * SECONDS_PER_DAY, m.v[1] * SECONDS_PER_DAY, m.v[2] * SECONDS_PER_DAY] as Vec3 })),
  ];
  const total = bodies.reduce((s, b) => s + b.gm, 0);
  const centre = [0, 1, 2].map((k) => bodies.reduce((s, b) => s + b.gm * b.x[k], 0) / total);
  const drift = [0, 1, 2].map((k) => bodies.reduce((s, b) => s + b.gm * b.v[k], 0) / total);
  return bodies.map((b) => ({
    gm: b.gm,
    x: [b.x[0] - centre[0], b.x[1] - centre[1], b.x[2] - centre[2]],
    v: [b.v[0] - drift[0], b.v[1] - drift[1], b.v[2] - drift[2]],
  }));
}

/**
 * The time step, days: about 350 steps for each of Io's laps. Leapfrog's
 * small lag per step adds up: at 0.02 days Io's lap would come out 0.3% too
 * long, more than the error from leaving out Jupiter's bulge.
 */
export const STEP_DAYS = 0.005;

/** The real periods (days), for the readouts: JPL's mean sidereal periods. */
export const PERIODS: Record<MoonId, number> = { io: 1.769, europa: 3.551, ganymede: 7.155, callisto: 16.689 };

/**
 * Axes for drawing the moons from above their orbits: z along the moons'
 * total angular momentum (Jupiter's equator, near enough), x as close to the
 * ecliptic's x as that allows. Returns the three unit vectors.
 */
export function orbitFrame(bodies: readonly BodySpec[] = galileanBodies()): [Vec3, Vec3, Vec3] {
  let L: Vec3 = [0, 0, 0];
  for (const b of bodies.slice(1)) {
    const l = cross(b.x, b.v);
    L = [L[0] + b.gm * l[0], L[1] + b.gm * l[1], L[2] + b.gm * l[2]];
  }
  const z = normalize(L);
  const y = normalize(cross(z, [1, 0, 0]));
  const x = cross(y, z);
  return [x, y, z];
}

/** A moon's position relative to Jupiter in the orbit frame (km): x, y in the plane. */
export function inFrame(frame: readonly [Vec3, Vec3, Vec3], jupiter: Vec3, moon: Vec3): { x: number; y: number } {
  const d: Vec3 = [moon[0] - jupiter[0], moon[1] - jupiter[1], moon[2] - jupiter[2]];
  const dot = (a: Vec3) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return { x: dot(frame[0]), y: dot(frame[1]) };
}

/**
 * Counts laps from angles seen one after another: adds each change of angle,
 * taken the short way round, so a moon that has gone round 2½ times reads 2.5.
 * Works as long as a moon turns less than half a lap between two looks.
 */
export class LapCounter {
  private last: number | null = null;
  turned = 0;

  see(angle: number) {
    if (this.last !== null) {
      let d = angle - this.last;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      this.turned += d;
    }
    this.last = angle;
  }

  get laps(): number {
    return this.turned / (2 * Math.PI);
  }
}

/**
 * The Laplace angle λ_Io − 3 λ_Europa + 2 λ_Ganymede (radians, wrapped to
 * (−π, π]), from the three moons' longitudes in the orbit plane. It stays near
 * 180° (π): whenever two of them line up, the third is elsewhere.
 */
export function laplaceAngle(io: number, europa: number, ganymede: number): number {
  const a = io - 3 * europa + 2 * ganymede;
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI) - 1e-12);
}

/** The caption: how many laps each moon has made after a number of days. */
export function describeLaps(days: number, laps: Record<MoonId, number>): string {
  if (days < 0.05) return 'Press Play, or run one lap of Ganymede, and count how often each moon goes round.';
  const whole = (id: MoonId) => Math.floor(laps[id] + 0.01);
  const plural = (n: number) => `${n} time${n === 1 ? '' : 's'}`;
  const g = whole('ganymede');
  const parts = `Io has gone round ${plural(whole('io'))}, Europa ${plural(whole('europa'))}, Ganymede ${plural(g)} and Callisto ${plural(whole('callisto'))}`;
  const ratio = laps.ganymede > 0.2 ? ` For each lap of Ganymede: Europa ${(laps.europa / laps.ganymede).toFixed(2)}, Io ${(laps.io / laps.ganymede).toFixed(2)}.` : '';
  return `After ${days.toFixed(1)} days. ${parts}.${ratio}`;
}
