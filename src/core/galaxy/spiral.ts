import { KMS } from '../nbody/cluster';
import { Random } from '../random';

/**
 * Spiral arms, kinematically (Figure 30.4). A disc turns faster inside than
 * out, so arms made of the same stars wind up: an arm of pitch p₀ after a time
 * t has tan p = 1 / (1/tan p₀ − R t dΩ/dR), which for a flat rotation curve
 * (R dΩ/dR = −Ω) is 1 / (1/tan p₀ + Ωt). Kalnajs (1973) showed how a pattern
 * can last instead: stars on nested ovals, each turned a little from the one
 * inside, crowd along a spiral, and if the ovals all turn at one speed the
 * spiral keeps its shape while the stars move through it.
 *
 * Radii in kpc, times in Myr, speeds in km/s, angles in radians; discs turn
 * anticlockwise here, with trailing arms.
 */

/** Angular speed (rad/Myr) of a circular orbit at radius R (kpc) moving at v (km/s). */
export function angularSpeed(v: number, R: number): number {
  return (v * KMS) / (R * 1000);
}

/** An arm's pitch (radians) at radius R after time t (Myr), starting at p₀, for a rotation curve v(R) (km/s), by differentiating Ω numerically. */
export function windingPitch(R: number, t: number, speed: (R: number) => number, p0: number): number {
  const h = 1e-3 * R;
  const dOmega = (angularSpeed(speed(R + h), R + h) - angularSpeed(speed(R - h), R - h)) / (2 * h);
  return Math.atan(1 / (1 / Math.tan(p0) - R * t * dOmega));
}

export interface ArmStar {
  R: number;
  /** Angle at the start. */
  theta: number;
}

/**
 * Stars along `arms` trailing logarithmic arms of pitch p₀ from R = rMin to rMax
 * (kpc), scattered a little across each arm. Seeded.
 */
export function armStars(count: number, arms: number, p0: number, rMin: number, rMax: number, seed = 1): ArmStar[] {
  const random = new Random(seed);
  const k = 1 / Math.tan(p0);
  return Array.from({ length: count }, (_, n) => {
    const arm = n % arms;
    const R = rMin + (rMax - rMin) * Math.sqrt(random.next());
    // Trailing for an anticlockwise disc: the arm's angle falls as R grows
    const theta = (2 * Math.PI * arm) / arms - k * Math.log(R / rMin) + random.normal() * 0.06;
    return { R, theta };
  });
}

/** Where arm stars are after t Myr, each on its circle at its own angular speed: x, y pairs in kpc. */
export function windArms(stars: readonly ArmStar[], t: number, speed: (R: number) => number): Float64Array {
  const out = new Float64Array(2 * stars.length);
  stars.forEach((s, i) => {
    const angle = s.theta + angularSpeed(speed(s.R), s.R) * t;
    out[2 * i] = s.R * Math.cos(angle);
    out[2 * i + 1] = s.R * Math.sin(angle);
  });
  return out;
}

/** One of Kalnajs's ovals: an ellipse round the centre with mean radius R (kpc), semi-axes R(1 ± ε), its long axis at `angle`. */
export interface Oval {
  R: number;
  epsilon: number;
  angle: number;
}

/**
 * Nested ovals from rMin to rMax (kpc), each turned `twist` radians per kpc
 * further than the one inside it: where they crowd together, two spiral arms.
 */
export function kalnajsOvals(count: number, rMin: number, rMax: number, epsilon = 0.1, twist = 0.32): Oval[] {
  return Array.from({ length: count }, (_, i) => {
    const R = rMin + ((rMax - rMin) * i) / (count - 1);
    return { R, epsilon, angle: twist * (R - rMin) };
  });
}

/** A point on an oval at parameter ψ, in the oval's frame turned by `frame` radians: x, y in kpc. */
export function ovalPoint(oval: Oval, psi: number, frame = 0): [number, number] {
  const a = oval.R * (1 + oval.epsilon);
  const b = oval.R * (1 - oval.epsilon);
  const c = Math.cos(oval.angle + frame);
  const s = Math.sin(oval.angle + frame);
  const x = a * Math.cos(psi);
  const y = b * Math.sin(psi);
  return [x * c - y * s, x * s + y * c];
}

/**
 * Stars on Kalnajs's ovals after t Myr: every oval turns at the pattern speed
 * Ωp (rad/Myr), and each star runs round its oval at Ω(R) − Ωp, so it moves
 * through the pattern while the pattern keeps its shape. `perOval` stars,
 * evenly spaced at the start.
 */
export function ovalStars(ovals: readonly Oval[], perOval: number, t: number, patternSpeed: number, speed: (R: number) => number): Float64Array {
  const out = new Float64Array(2 * ovals.length * perOval);
  let k = 0;
  for (const oval of ovals) {
    const own = angularSpeed(speed(oval.R), oval.R) - patternSpeed;
    for (let j = 0; j < perOval; j++) {
      const psi = (2 * Math.PI * j) / perOval + own * t;
      const [x, y] = ovalPoint(oval, psi, patternSpeed * t);
      out[k++] = x;
      out[k++] = y;
    }
  }
  return out;
}

/** Ω − κ/2 (rad/Myr) at radius R for a rotation curve: the speed at which an oval turns if its stars go round it twice per turn of their epicycle. */
export function innerLindbladSpeed(R: number, speed: (R: number) => number): number {
  const h = 1e-3 * R;
  const omega = angularSpeed(speed(R), R);
  const dOmega2 = (angularSpeed(speed(R + h), R + h) ** 2 - angularSpeed(speed(R - h), R - h) ** 2) / (2 * h);
  const kappa = Math.sqrt(Math.max(0, R * dOmega2 + 4 * omega * omega));
  return omega - kappa / 2;
}
