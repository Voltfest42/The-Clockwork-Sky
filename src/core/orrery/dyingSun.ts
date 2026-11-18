import { AU, L_SUN, M_EARTH, M_SUN, R_SUN } from '../constants';
import type { SseStep, SseTrack } from '../stellar/sse/evolve';
import { SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * The Sun's death, for the Orrery (Part III; the master plan's coupling of the
 * two labs). The Sun follows SSE's track for a star of 1 M☉ (the Star Forge's
 * engine): it swells to a red giant, loses mass in its wind, swells again on
 * the asymptotic giant branch and shrinks to a white dwarf of about half its
 * mass. Two things happen to a planet's orbit:
 *
 * - **It widens** as the Sun loses mass. The wind leaves slowly, over many
 *   orbits, so the orbit's angular momentum √(GMa) is kept and a × M stays the
 *   same (Mustill & Villaver 2012, Eq. 9).
 * - **It shrinks** by tides. The planet raises a bulge on the giant's
 *   convective envelope, which turbulence drags behind it; the bulge pulls the
 *   planet back (Zahn 1977). For a circular orbit, Mustill & Villaver's
 *   (2012) Eq. 1 becomes
 *
 *     d ln a / dt = −(2 f₂ / 9 t_conv) (M_env / M) q (1 + q) (R / a)⁸,
 *
 *   with q = m_planet / M, the convective turnover time
 *   t_conv = (M_env R² / (η_F L))^(1/3) (their Eq. 4) and
 *   f₂ = f′ min[1, (P / (2 c_F t_conv))^γ_F] (their Eq. 5, P the orbital
 *   period), with their fiducial η_F = 3, c_F = 1, f′ = 9/2 and γ_F = 2.
 *   The (R/a)⁸ makes it a cliff: negligible until the star is nearly as big as
 *   the orbit, then overwhelming.
 *
 * A planet is swallowed when the star's surface reaches its orbit.
 *
 * Two ways to follow it: `followPlanet` integrates the averaged equations, as
 * Mustill & Villaver do, for the charts, the verdict and the boundary; and
 * `DyingStar` drives the Orrery's own n-body engine, which runs the real
 * planets round the changing Sun, with the Sun's clock running far faster
 * than theirs (see `pace`).
 *
 * Units: ages in Myr (millions of years), distances in AU, masses in M☉,
 * luminosities in L☉; rates per Myr.
 */

/** The Sun's radius in AU. */
export const R_SUN_AU = R_SUN / AU;
/** The Sun's age now, Myr. */
export const SUN_NOW = 4_570;
/** SSE's solar metallicity. */
export const SUN_Z = 0.02;
/** An Earth mass in M☉. */
export const EARTH_MASS = M_EARTH / M_SUN;

/** Mustill & Villaver's (2012) fiducial tide (their §2, after Villaver & Livio 2009). */
export const FIDUCIAL_TIDE = { etaF: 3, cF: 1, fPrime: 9 / 2, gammaF: 2 } as const;

/** The planets followed, with their semi-major axes (AU) and masses (Earths) today. Earth carries the Moon. */
export const DYING_SUN_PLANETS = [
  { id: 'mercury', name: 'Mercury', a: 0.387_1, mass: 0.055_3 },
  { id: 'venus', name: 'Venus', a: 0.723_3, mass: 0.815 },
  { id: 'earth', name: 'Earth', a: 1.000_0, mass: 1.012_3 },
  { id: 'mars', name: 'Mars', a: 1.523_7, mass: 0.107_4 },
  { id: 'jupiter', name: 'Jupiter', a: 5.202_6, mass: 317.83 },
] as const;

/** The Sun at one moment. */
export interface StarNow {
  /** Age, Myr. */
  t: number;
  /** SSE's stellar type. */
  kw: number;
  /** Mass, M☉. */
  mass: number;
  /** Radius, AU. */
  radius: number;
  /** Luminosity, L☉. */
  L: number;
  /** The convective envelope's mass, M☉. */
  menv: number;
  /** Between the giant's last step and the white dwarf's first: throwing off its last envelope. */
  ejecting?: boolean;
}

function fromStep(s: SseStep): StarNow {
  return { t: s.t, kw: s.kw, mass: s.mt, radius: s.R * R_SUN_AU, L: s.L, menv: s.menv };
}

/**
 * The star between two steps of its track at age t (Myr): mass and envelope
 * linearly, radius and luminosity logarithmically. Unlike the Star Forge's
 * reading, this runs across a change of type too, so the envelope thrown off
 * at the end of the giant branch leaves over the stretch between the steps
 * (about 200,000 years for the Sun), not in an instant: orbits respond to it
 * slowly, as they would to the real superwind.
 */
function between(a: SseStep, b: SseStep, t: number): StarNow {
  if (!(b.t > a.t)) return fromStep(a);
  const f = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  const lin = (x: number, y: number) => x + f * (y - x);
  const log = (x: number, y: number) => (x > 0 && y > 0 ? Math.exp(lin(Math.log(x), Math.log(y))) : lin(x, y));
  const now: StarNow = { t, kw: f < 0.5 ? a.kw : b.kw, mass: lin(a.mt, b.mt), radius: log(a.R, b.R) * R_SUN_AU, L: log(a.L, b.L), menv: lin(a.menv, b.menv) };
  if (a.kw < 10 && b.kw >= 10 && f > 0 && f < 1) now.ejecting = true;
  return now;
}

/** The star at age t (Myr): the track's state, held at its ends. */
export function starAt(track: SseTrack, t: number): StarNow {
  const steps = track.steps;
  if (t <= steps[0].t) return fromStep(steps[0]);
  if (t >= steps[steps.length - 1].t) return fromStep(steps[steps.length - 1]);
  let lo = 0;
  let hi = steps.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (steps[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return between(steps[lo], steps[hi], t);
}

/** The convective turnover time, years: (M_env R² / (η_F L))^(1/3) (Mustill & Villaver's Eq. 4, with the envelope reaching the surface). */
export function turnoverTime(star: StarNow, etaF: number = FIDUCIAL_TIDE.etaF): number {
  if (!(star.menv > 0) || !(star.L > 0)) return Infinity;
  const seconds = Math.cbrt((star.menv * M_SUN * (star.radius * AU) ** 2) / (etaF * star.L * L_SUN));
  return seconds / SECONDS_PER_JULIAN_YEAR;
}

/** An orbit's period, years, for a (AU) about masses M and m (M☉). */
export function periodYears(a: number, mass: number, planet = 0): number {
  return Math.sqrt(a ** 3 / (mass + planet));
}

/**
 * How fast the tide shrinks a circular orbit of a (AU) for a planet of mass
 * m (M☉): −d ln a / dt, per Myr, `strength` times Mustill & Villaver's.
 */
export function tidalRate(star: StarNow, a: number, m: number, strength = 1): number {
  if (!(strength > 0) || !(star.menv > 0) || star.kw >= 10) return 0;
  const tc = turnoverTime(star);
  if (!Number.isFinite(tc) || tc <= 0) return 0;
  const { cF, fPrime, gammaF } = FIDUCIAL_TIDE;
  const P = periodYears(a, star.mass, m);
  const f2 = fPrime * Math.min(1, (P / (2 * cF * tc)) ** gammaF);
  const q = m / star.mass;
  const perYear = ((2 * f2) / (9 * tc)) * (star.menv / star.mass) * q * (1 + q) * (star.radius / a) ** 8;
  return strength * perYear * 1e6;
}

export interface PlanetPath {
  /** Ages (Myr) and semi-major axes (AU) along the way. */
  t: number[];
  a: number[];
  /** When the star swallowed it (Myr), or null. */
  engulfed: number | null;
  /** Where it ends up (AU): its last orbit, or the star's radius when swallowed. */
  final: number;
  /** The closest the star's surface came, as a share of the orbit (the largest R/a). */
  closest: number;
}

/**
 * Follows one planet on a circular orbit from `from` (Myr) to the end of the
 * track by the averaged equations: a × M is kept by the wind, and the tide
 * pulls it in. J = ln(aM) changes only by the tide, which is integrated by the
 * midpoint rule with steps short enough that J changes by under 1% and the
 * star's radius by under 2% (when the star is near) each step.
 */
export function followPlanet(track: SseTrack, a0: number, m: number, strength = 1, from = SUN_NOW): PlanetPath {
  const steps = track.steps;
  const end = steps[steps.length - 1].t;
  let t = from;
  let star = starAt(track, t);
  let J = Math.log(a0 * star.mass);
  const path: PlanetPath = { t: [t], a: [a0], engulfed: null, final: a0, closest: star.radius / a0 };
  let k = steps.findIndex((s) => s.t > t);
  if (k < 0) k = steps.length - 1;
  let lastLogged = t;
  while (t < end) {
    const node = steps[Math.min(k, steps.length - 1)].t;
    const a = Math.exp(J) / star.mass;
    const gamma = tidalRate(star, a, m, strength);
    let h = node - t;
    if (gamma > 0) h = Math.min(h, 0.01 / gamma);
    if (star.radius > 0.3 * a) {
      // Near the surface: don't step past the moment the star reaches the orbit.
      const next = starAt(track, Math.min(end, t + h));
      const growth = Math.abs(Math.log(next.radius / star.radius));
      if (growth > 0.02) h *= 0.02 / growth;
    }
    h = Math.max(h, 1e-9);
    const mid = starAt(track, t + h / 2);
    const aMid = Math.exp(J - (gamma * h) / 2) / mid.mass;
    J -= tidalRate(mid, aMid, m, strength) * h;
    t = Math.min(end, t + h);
    if (t >= node) k++;
    star = starAt(track, t);
    const aNow = Math.exp(J) / star.mass;
    path.closest = Math.max(path.closest, star.radius / aNow);
    if (aNow <= star.radius) {
      path.engulfed = t;
      path.final = star.radius;
      path.t.push(t);
      path.a.push(star.radius);
      return path;
    }
    // Keep a point at least every 0.5% of the way, and wherever the orbit moves by 0.2%.
    const prev = path.a[path.a.length - 1];
    if (Math.abs(aNow / prev - 1) > 0.002 || t - lastLogged > 0.005 * (end - from) || t >= end) {
      path.t.push(t);
      path.a.push(aNow);
      lastLogged = t;
    }
  }
  path.final = Math.exp(J) / star.mass;
  return path;
}

/** The largest starting orbit (AU) that the star swallows, for a planet of mass m (M☉), by bisection. */
export function engulfmentBoundary(track: SseTrack, m: number, strength = 1, from = SUN_NOW): number {
  let lo = 0.05;
  let hi = 20;
  if (followPlanet(track, hi, m, strength, from).engulfed !== null) return hi;
  if (followPlanet(track, lo, m, strength, from).engulfed === null) return lo;
  for (let i = 0; i < 40 && hi / lo > 1 + 1e-6; i++) {
    const mid = Math.sqrt(lo * hi);
    if (followPlanet(track, mid, m, strength, from).engulfed !== null) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Without tides, a planet is swallowed exactly when the star's radius ever
 * reaches the widened orbit, a₀ M₀ / M: so the boundary is the largest R × M /
 * M₀ along the track (AU).
 */
export function tidelessBoundary(track: SseTrack, from = SUN_NOW): number {
  const m0 = starAt(track, from).mass;
  let best = 0;
  for (const s of track.steps) if (s.t >= from && s.kw < 10) best = Math.max(best, (s.R * R_SUN_AU * s.mt) / m0);
  return best;
}

/**
 * The Sun's clock for the Orrery's n-body run. The real Sun changes over
 * millions of years, far too slowly to watch with the planets going round at
 * their true pace, so the Sun's clock runs faster than the planets'. That is
 * safe as long as each change is still slow compared with the orbits it
 * affects: the pace is chosen so that the Sun's mass changes by at most a
 * five-hundredth of itself during one lap of the outermost planet, and the
 * tide moves any orbit by as little during one of its laps. The orbits then
 * respond just as they would to the real, slower change. While the Sun swells
 * towards the planets (beyond a twentieth of the innermost orbit), its radius
 * is held to the same five-hundredth a lap of the outermost planet, which
 * matters for nothing but the watching: it gives the swelling, when planets
 * are swallowed, its share of the run.
 */
export class DyingStar {
  readonly track: SseTrack;
  readonly strength: number;
  readonly end: number;
  /** The largest pace allowed (Myr of the star's life per day of the planets'). */
  static readonly MAX_PACE = 2;
  /** The most the star or an orbit may change (as a share of itself) during one lap of the planets it affects. */
  static readonly SHARE = 2e-3;
  private _age: number;
  /** The track's step that starts the stretch holding the age (the clock only moves forwards, so this is cached). */
  private k = 0;
  private cached: StarNow | null = null;

  constructor(track: SseTrack, age = SUN_NOW, strength = 1) {
    this.track = track;
    this._age = age;
    this.strength = strength;
    this.end = track.steps[track.steps.length - 1].t;
  }

  /** The star's age, Myr. */
  get age(): number {
    return this._age;
  }

  set age(t: number) {
    if (t !== this._age) this.cached = null;
    this._age = t;
  }

  /** The index of the track's step at or before the age. */
  private index(): number {
    const s = this.track.steps;
    if (this.k > 0 && s[this.k].t > this._age) this.k = 0;
    while (this.k < s.length - 2 && s[this.k + 1].t <= this._age) this.k++;
    return this.k;
  }

  now(): StarNow {
    if (!this.cached) {
      const s = this.track.steps;
      const k = this.index();
      const t = this._age;
      if (t <= s[0].t) this.cached = fromStep(s[0]);
      else if (t >= this.end) this.cached = fromStep(s[s.length - 1]);
      else this.cached = between(s[k], s[k + 1], t);
    }
    return this.cached;
  }

  /** How fast the star's mass and radius change now: d ln M / dt and d ln R / dt, per Myr, over the track's stretch holding this age. */
  rates(): { mass: number; radius: number; stretch: number } {
    const s = this.track.steps;
    if (this._age >= this.end) return { mass: 0, radius: 0, stretch: 0 };
    const k = this.index();
    const a = s[k];
    const b = s[k + 1];
    const dt = b.t - a.t;
    if (!(dt > 0)) return { mass: 0, radius: 0, stretch: 0 };
    return { mass: Math.log(b.mt / a.mt) / dt, radius: Math.log(b.R / a.R) / dt, stretch: dt };
  }

  /**
   * The pace, Myr of the star's life per day of the planets' clock, for
   * planets on orbits of these sizes (AU) and masses (M☉), with periods in days.
   */
  pace(planets: readonly { a: number; m: number; period: number }[]): number {
    if (this._age >= this.end || planets.length === 0) return DyingStar.MAX_PACE;
    const r = this.rates();
    const star = this.now();
    let inner = Infinity;
    let outer = 0;
    let nearest = Infinity;
    for (const p of planets) {
      inner = Math.min(inner, p.period);
      outer = Math.max(outer, p.period);
      nearest = Math.min(nearest, p.a);
    }
    let pace = DyingStar.MAX_PACE;
    if (r.mass !== 0) pace = Math.min(pace, DyingStar.SHARE / (outer * Math.abs(r.mass)));
    if (r.radius > 0 && star.radius > 0.05 * nearest) pace = Math.min(pace, DyingStar.SHARE / (outer * r.radius));
    for (const p of planets) {
      const g = tidalRate(star, p.a, p.m, this.strength);
      if (g > 0) pace = Math.min(pace, DyingStar.SHARE / (p.period * g));
    }
    // At most one stretch of the track per lap of the innermost planet.
    if (r.stretch > 0) pace = Math.min(pace, r.stretch / inner);
    return pace;
  }
}
