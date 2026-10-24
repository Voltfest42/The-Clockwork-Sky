import { AU, GM_SUN } from '../core/constants';
import { apsides, orbitalSpeed, pointAtMeanAnomaly, type Ellipse } from '../core/orbits/ellipse';
import { orbitById } from '../data/orbits';

/**
 * Orbits for Figures 6.1 and 6.2: real eccentricities and sizes, and speeds
 * from the vis-viva equation. Lengths in AU, speeds in km/s.
 */

export interface OrbitPreset {
  id: string;
  name: string;
  e: number;
  /** Semi-major axis, AU. */
  a: number;
}

const real = (id: string, name?: string): OrbitPreset => {
  const o = orbitById(id);
  return { id, name: name ?? o.name, e: o.e, a: o.a };
};

export const ORBIT_PRESETS: readonly OrbitPreset[] = [
  { id: 'circle', name: 'A circle', e: 0, a: 1 },
  real('earth'),
  real('mars'),
  real('mercury'),
  real('pluto'),
  real('halley', 'Halley’s comet'),
];

/** The preset whose eccentricity is within 0.0005 of e, if any. */
export function presetFor(e: number): OrbitPreset | undefined {
  return ORBIT_PRESETS.find((p) => Math.abs(p.e - e) < 0.0005);
}

/** Speed round the Sun at distance r on an orbit of semi-major axis a (both AU): km/s. */
export function speedKmS(r: number, a: number): number {
  return orbitalSpeed(GM_SUN, r * AU, a * AU) / 1000;
}

/** The fastest and slowest speeds on an orbit (at perihelion and aphelion): km/s. */
export function speedRange(orbit: Ellipse): { fastest: number; slowest: number } {
  const { perihelion, aphelion } = apsides(orbit);
  return { fastest: speedKmS(perihelion, orbit.a), slowest: speedKmS(aphelion, orbit.a) };
}

/** The outline of the part of an orbit swept between two mean anomalies, as points from the Sun (at the origin) round the arc and back. */
export function wedge(orbit: Ellipse, M1: number, M2: number, steps = 24): { x: number; y: number }[] {
  const out = [{ x: 0, y: 0 }];
  for (let i = 0; i <= steps; i++) {
    const p = pointAtMeanAnomaly(orbit, M1 + ((M2 - M1) * i) / steps);
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

/** "0.0167", "0.97", "0": an eccentricity as the figures show it. */
export function formatE(e: number): string {
  if (e === 0) return '0';
  return e < 0.1 ? e.toFixed(4).replace(/0+$/, '') : e.toFixed(3).replace(/0+$/, '');
}

/** "0.24 years (88 days)", "8.0 years", "1,300 years". */
export function formatPeriod(years: number): string {
  if (years < 1) return `${years.toFixed(2)} years (${Math.round(years * 365.25)} days)`;
  if (years < 10) return `${years.toFixed(1)} years`;
  return `${Math.round(years).toLocaleString('en-GB')} years`;
}
