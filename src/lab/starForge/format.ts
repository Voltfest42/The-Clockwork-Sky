import type { ForgeStar } from '../../core/stellar/forge';
import { R_SUN } from '../../core/constants';

/** Numbers in words and symbols for the Star Forge. Masses in M☉, radii in R☉, luminosities in L☉, temperatures in K. */

const sig = (x: number, n = 2) => Number(x.toPrecision(n)).toLocaleString('en-GB');

/** "0.05 M☉", "1.4 M☉", "18 M☉", "150 M☉". */
export function msun(m: number): string {
  if (m === 0) return '0 M☉';
  return `${m < 10 ? sig(m, m < 1 ? 2 : 3) : Math.round(m).toLocaleString('en-GB')} M☉`;
}

/** A metallicity as a plain decimal, to two significant figures: "0.02", "0.0001". */
export const zText = (z: number) => String(Number(z.toPrecision(2)));

/** Metallicity as Z, with what it means: "Z = 0.02 (SSE’s Sun)". */
export function formatZ(z: number): string {
  const name = z === 0.02 ? ' (SSE’s Sun)' : z <= 0.0002 ? ' (almost none)' : '';
  return `Z = ${zText(z)}${name}`;
}

/** Wind strength: "SSE’s own", "none", "×0.5". */
export function formatWind(w: number): string {
  if (w === 0) return 'none';
  if (w === 1) return '×1 (SSE’s own)';
  return `×${sig(w, 2)}`;
}

/** A star in a few symbols, for chips, tables and legends: "18 M☉, Z 0.02, winds ×1". */
export const starLabel = (s: ForgeStar) => `${msun(s.mass)}, Z ${zText(s.z)}, winds ×${sig(s.wind, 2)}`;

/** Luminosity in Suns: "0.96", "250,000", "0.000 02". */
export function formatSuns(x: number): string {
  if (x >= 1000) return Number(x.toPrecision(2)).toLocaleString('en-GB');
  if (x >= 0.01) return sig(x, 2);
  return x.toExponential(1).replace(/e([+-]\d+)/, (_, e) => ` × 10${superscript(Number(e))}`);
}

/** A radius in R☉ in words: "1.7 times the Sun’s width", "17,000 km across" (a white dwarf), "19 km across" (a neutron star). */
export function formatRadius(r: number): string {
  const km = r * (R_SUN / 1000);
  if (r >= 0.05) return `${formatSuns(r)} times the Sun’s width`;
  if (2 * km >= 2000) return `${(Math.round((2 * km) / 100) * 100).toLocaleString('en-GB')} km across`;
  return `${sig(2 * km, 2)} km across`;
}

export const formatKelvin = (t: number) => `${(t >= 10000 ? Math.round(t / 100) * 100 : Math.round(t / 10) * 10).toLocaleString('en-GB')} K`;

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const superscript = (n: number) =>
  String(n)
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('');

/** Line colours on the HR diagram's dark plot and on the theme's charts, and a dash for each, so colour isn't the only cue. */
export const STAR_STYLES = [
  { hr: '#cdd6f4', chart: 'var(--series-1)', dash: undefined, name: 'solid' },
  { hr: '#ffd166', chart: 'var(--series-2)', dash: '8 4', name: 'dashed' },
  { hr: '#7bdff2', chart: 'var(--series-3)', dash: '2 3', name: 'dotted' },
  { hr: '#f28fb0', chart: 'var(--text)', dash: '10 3 2 3', name: 'dash-dot' },
] as const;
