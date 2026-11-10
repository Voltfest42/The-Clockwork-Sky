import { M_SUN } from '../core/constants';
import { classify, circularOrbit, CAPTURE_IMPACT, orbitWithTurningPoints, traceOrbit, traceRay, type Orbit } from '../core/gr/schwarzschild';
import { makeDisc, discSpectrum, type Disc } from '../core/gr/disc';

/**
 * Chapter 27's figures' shared pieces: orbits near a black hole (Figure
 * 27.1), light bent by one (27.2) and accretion discs (27.3). Distances in
 * GM/c² unless marked.
 */

// ---------- Figure 27.1: orbits ----------

export interface OrbitPreset {
  id: string;
  name: string;
  E: number;
  L: number;
}

const far = orbitWithTurningPoints(300, 600);
const precessing = orbitWithTurningPoints(10, 30);
const isco = circularOrbit(6);

export const ORBIT_PRESETS: readonly OrbitPreset[] = [
  { id: 'far', name: 'Far away', E: far.E, L: far.L },
  { id: 'precessing', name: 'Precessing', E: precessing.E, L: precessing.L },
  { id: 'whirl', name: 'Zoom and whirl', E: Math.sqrt(0.95), L: 3.8 },
  { id: 'isco', name: 'The innermost stable orbit', E: isco.E, L: isco.L },
  { id: 'plunge', name: 'Plunge', E: Math.sqrt(0.95), L: 3.6 },
  { id: 'flyby', name: 'Fly past', E: 1.01, L: 4.6 },
];

export const ORBIT_START = ORBIT_PRESETS[1];
export const L_RANGE = [3, 30] as const;
export const E_RANGE = [0.85, 1.03] as const;

export interface OrbitPair {
  relativity: Orbit;
  newton: Orbit;
}

/** Both orbits from the same start: relativity's and Newton's. */
export function orbitPair(E: number, L: number): OrbitPair {
  const kind = classify(E, L).kind;
  const turns = kind === 'flyby' || kind === 'captured' ? 2 : kind === 'circular' ? 3 : 5;
  return { relativity: traceOrbit(E, L, { turns }), newton: traceOrbit(E, L, { turns, newton: true }) };
}

/** How far out the orbit view should reach, GM/c². */
export function viewExtent(orbit: Orbit): number {
  if (orbit.kind === 'flyby' || orbit.kind === 'captured') return Math.max(30, Math.min(120, (orbit.periapsis ?? 6) * 5));
  return Math.max(14, Math.min(800, orbit.start * 1.12));
}

/** Where the orbit is at time t (GM/c³), by interpolating its points; the last point once past its end. */
export function positionAt(orbit: Orbit, t: number): { x: number; y: number } {
  const pts = orbit.points;
  if (t <= 0) return pts[0];
  let lo = 0;
  let hi = pts.length - 1;
  if (t >= pts[hi].t) return pts[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - pts[lo].t) / (pts[hi].t - pts[lo].t || 1);
  return { x: pts[lo].x + f * (pts[hi].x - pts[lo].x), y: pts[lo].y + f * (pts[hi].y - pts[lo].y) };
}

/** How many times the orbit went round before it reached the horizon. */
export function turnsBeforeFalling(orbit: Orbit): number {
  let angle = 0;
  for (let i = 1; i < orbit.points.length; i++) {
    const a = orbit.points[i - 1];
    const b = orbit.points[i];
    let d = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
    if (d < -Math.PI) d += 2 * Math.PI;
    if (d > Math.PI) d -= 2 * Math.PI;
    angle += d;
  }
  return angle / (2 * Math.PI);
}

/** The direction a fly-past leaves in, against the one it came in on: how far it was turned, radians. */
export function turnedBy(orbit: Orbit): number {
  const p = orbit.points;
  const a = p[0];
  const b = p[Math.min(p.length - 1, 5)];
  const c = p[Math.max(0, p.length - 6)];
  const d = p[p.length - 1];
  const inDir = Math.atan2(b.y - a.y, b.x - a.x);
  const outDir = Math.atan2(d.y - c.y, d.x - c.x);
  let turn = outDir - inDir;
  while (turn < 0) turn += 2 * Math.PI;
  return turn;
}

/** Degrees, to one decimal under 10. */
export function formatDegrees(rad: number): string {
  const d = (rad * 180) / Math.PI;
  return `${d < 10 ? d.toFixed(1) : Math.round(d)}°`;
}

/** The radius of the smallest stable circular orbit, for the interactive question. */
export const SMALLEST_STABLE_ORBIT = 6;

// ---------- Figure 27.2: light ----------

export const FAN = [2, 3, 4, 5, 5.5, 6.5, 8, 10, 13] as const;
export const B_START = 7;
export const B_RANGE = [1, 60] as const;
/** The Sun's edge as an impact parameter, GM/c²: R☉ / (GM☉/c²). */
export const SUN_IMPACT = 6.957e8 / 1476.625;

export function rayFan() {
  return FAN.map((b) => ({ b, ray: traceRay(b, { from: 40, to: 45 }) }));
}

export { CAPTURE_IMPACT };

// ---------- Figure 27.3: the disc ----------

export interface HoleChoice {
  id: string;
  name: string;
  mass: number;
  example: string;
}

export const HOLES: readonly HoleChoice[] = [
  { id: 'stellar', name: '10 M☉', mass: 10, example: 'a black hole in an X-ray binary, like Cygnus X-1' },
  { id: 'quasar', name: '10⁸ M☉', mass: 1e8, example: 'a quasar’s black hole' },
];

export const DISC_START = { hole: 'stellar', spin: 0, eddington: 0.3 } as const;

export function discFor(holeId: string, spin: number, eddington: number): Disc {
  const hole = HOLES.find((h) => h.id === holeId) ?? HOLES[0];
  return makeDisc(hole.mass * M_SUN, spin, eddington);
}

/** Wavelengths for the spectrum, from 10⁻¹¹ m (hard X-rays) to 10⁻⁵ m (mid-infrared). */
export const WAVELENGTHS = Array.from({ length: 121 }, (_, i) => 10 ** (-11 + (6 * i) / 120));

export function spectrumOf(disc: Disc) {
  return discSpectrum(disc, WAVELENGTHS);
}

/** A photon energy for a wavelength: "2.5 keV", "12 eV". */
export function formatPhotonEnergy(lambda: number): string {
  const eV = 1239.84193e-9 / lambda;
  if (eV >= 1000) return `${Number((eV / 1000).toPrecision(2))} keV`;
  return `${Number(eV.toPrecision(2))} eV`;
}

/** Which band a wavelength (m) is in. */
export function bandOf(lambda: number): string {
  if (lambda < 1e-8) return 'X-rays';
  if (lambda < 3.8e-7) return 'ultraviolet';
  if (lambda < 7.5e-7) return 'visible light';
  return 'infrared';
}
