import type { Acceleration } from '../integrate/steppers';

/**
 * Relativity's correction for the Orrery (Part III): orbits about one heavy
 * body turn slowly, by 6πGM / (c²a(1 − e²)) a lap (Chapter 27): Mercury's
 * extra 43″ a century, S2's 12′ a lap round Sagittarius A*.
 *
 * The correction is added as Nobili & Roxburgh's (1986) potential about the
 * heaviest body, −3(GM)²/(c²r²) per unit mass, which REBOUNDx calls
 * gr_potential. It is the simplest form of the first post-Newtonian
 * correction that turns every orbit by exactly relativity's amount (to first
 * order in GM/c²r); it leaves out relativity's other, smaller effects on the
 * orbit's speed. Because it is a potential, the energy is kept (with this term
 * added), and it needs only positions, so all three integrators carry it.
 *
 * Units: AU and days; G·m in AU³/day².
 */

/** The speed of light, AU/day. */
export const LIGHT_AU_DAY = (299_792.458 * 86_400) / 149_597_870.7;

/**
 * Gravity with relativity's correction about body `root`, `strength` times
 * the true one (1; more to exaggerate it). The root feels the reaction, so
 * momentum is kept.
 */
export function withRelativity(base: Acceleration, gm: Float64Array, root: number, strength: number): Acceleration {
  return (x, out) => {
    base(x, out);
    if (!(strength > 0)) return;
    const n = gm.length;
    const mu = gm[root];
    const k = (6 * strength * mu * mu) / (LIGHT_AU_DAY * LIGHT_AU_DAY);
    const r0 = 3 * root;
    for (let i = 0; i < n; i++) {
      if (i === root) continue;
      const dx = x[3 * i] - x[r0];
      const dy = x[3 * i + 1] - x[r0 + 1];
      const dz = x[3 * i + 2] - x[r0 + 2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const f = k / (r2 * r2);
      out[3 * i] -= f * dx;
      out[3 * i + 1] -= f * dy;
      out[3 * i + 2] -= f * dz;
      // The reaction on the heavy body: −(m_i/M) times the pull on body i.
      const share = gm[i] / mu;
      out[r0] += share * f * dx;
      out[r0 + 1] += share * f * dy;
      out[r0 + 2] += share * f * dz;
    }
  };
}

/** The correction's potential energy, times G (as the engine's energies are): the sum of G·m_i × −3 s (GM)²/(c²r_i²). */
export function relativityEnergy(gm: Float64Array, x: Float64Array, root: number, strength: number): number {
  if (!(strength > 0)) return 0;
  const mu = gm[root];
  const k = (3 * strength * mu * mu) / (LIGHT_AU_DAY * LIGHT_AU_DAY);
  let e = 0;
  for (let i = 0; i < gm.length; i++) {
    if (i === root || gm[i] === 0) continue;
    const r2 = (x[3 * i] - x[3 * root]) ** 2 + (x[3 * i + 1] - x[3 * root + 1]) ** 2 + (x[3 * i + 2] - x[3 * root + 2]) ** 2;
    e -= (gm[i] * k) / r2;
  }
  return e;
}

/** Relativity's turning of an orbit, radians a lap: 6πGM / (c²a(1 − e²)), with G·M in AU³/day² and a in AU. */
export function einsteinPrecession(gm: number, a: number, e: number): number {
  return (6 * Math.PI * gm) / (LIGHT_AU_DAY * LIGHT_AU_DAY * a * (1 - e * e));
}

/**
 * Watches one orbit's periapsis turn: the angle of the eccentricity vector
 * (measured in the orbit's plane from where it pointed at the start), sampled
 * through the run and fitted with a straight line, so the short wobbles from
 * other bodies average out.
 */
export class PeriapsisWatch {
  readonly id: string;
  readonly parent: string;
  readonly since: number;
  private readonly e0: [number, number, number];
  private readonly interval: number;
  private next: number;
  private last = 0;
  private turned = 0;
  private n = 0;
  private st = 0;
  private sy = 0;
  private stt = 0;
  private sty = 0;

  /** Starts at time `t` (days), sampling every `interval` days, from the eccentricity vector `e0`. */
  constructor(id: string, parent: string, t: number, interval: number, e0: readonly [number, number, number]) {
    this.id = id;
    this.parent = parent;
    this.since = t;
    this.interval = interval;
    this.next = t;
    const size = Math.hypot(e0[0], e0[1], e0[2]) || 1;
    this.e0 = [e0[0] / size, e0[1] / size, e0[2] / size];
  }

  /** Whether a sample is due at time t. */
  due(t: number): boolean {
    return t >= this.next;
  }

  /** Takes a sample: the eccentricity vector e and the orbit's normal h at time t (days). */
  sample(t: number, e: readonly number[], h: readonly number[]) {
    const [a, b, c] = this.e0;
    const hn = Math.hypot(h[0], h[1], h[2]) || 1;
    const cx = b * e[2] - c * e[1];
    const cy = c * e[0] - a * e[2];
    const cz = a * e[1] - b * e[0];
    const angle = Math.atan2((cx * h[0] + cy * h[1] + cz * h[2]) / hn, a * e[0] + b * e[1] + c * e[2]);
    // Unwrap: the turn since the last sample is the shortest way round.
    let step = angle - this.last;
    step -= 2 * Math.PI * Math.round(step / (2 * Math.PI));
    this.turned += step;
    this.last = angle;
    const x = t - this.since;
    this.n++;
    this.st += x;
    this.sy += this.turned;
    this.stt += x * x;
    this.sty += x * this.turned;
    this.next = t + this.interval;
  }

  /** The fitted rate (radians a day), how long it has watched (days) and the net turn (radians). */
  reading(now: number): { rate: number; span: number; turned: number; samples: number } {
    const d = this.n * this.stt - this.st * this.st;
    const rate = this.n > 2 && d > 0 ? (this.n * this.sty - this.st * this.sy) / d : 0;
    return { rate, span: now - this.since, turned: this.turned, samples: this.n };
  }
}

/** A body's eccentricity vector and orbit normal relative to another (G·m in AU³/day², AU, AU/day). */
export function eccentricityVector(mu: number, r: readonly number[], w: readonly number[]): { e: [number, number, number]; h: [number, number, number] } {
  const h: [number, number, number] = [r[1] * w[2] - r[2] * w[1], r[2] * w[0] - r[0] * w[2], r[0] * w[1] - r[1] * w[0]];
  const d = Math.hypot(r[0], r[1], r[2]);
  const vxh = [w[1] * h[2] - w[2] * h[1], w[2] * h[0] - w[0] * h[2], w[0] * h[1] - w[1] * h[0]];
  return { e: [vxh[0] / mu - r[0] / d, vxh[1] / mu - r[1] / d, vxh[2] / mu - r[2] / d], h };
}
