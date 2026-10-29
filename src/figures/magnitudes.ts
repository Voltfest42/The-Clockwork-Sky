import { superscript } from '../core/math/scientific';

/**
 * Magnitudes (Toolkit T5): the astronomers' backwards logarithmic scale of
 * brightness. Five magnitudes are a factor of 100 exactly (Pogson 1856), so
 * one magnitude is 100^(1/5) ≈ 2.512, and bigger numbers are fainter.
 */

/** How many times brighter a star of magnitude `bright` is than one of magnitude `faint`: 100^((faint − bright)/5). */
export function brightnessRatio(bright: number, faint: number): number {
  return 10 ** (0.4 * (faint - bright));
}

/** The magnitude difference for a brightness ratio: 2.5 log₁₀(ratio). */
export function magnitudeDifference(ratio: number): number {
  return 2.5 * Math.log10(ratio);
}

/** The magnitude of two stars' light together: add the light, not the magnitudes. Two equal stars are 0.75 magnitudes brighter than one. */
export function combinedMagnitude(...magnitudes: number[]): number {
  return -2.5 * Math.log10(magnitudes.reduce((sum, m) => sum + 10 ** (-0.4 * m), 0));
}

/** The magnitude ladder (Figure T5.1): things in the sky by visual magnitude, from the brief (§5) and SIMBAD. */
export const LADDER = [
  { id: 'sun', name: 'The Sun', V: -26.74 },
  { id: 'moon', name: 'The full Moon', V: -12.7 },
  { id: 'venus', name: 'Venus at its brightest', V: -4.6 },
  { id: 'jupiter', name: 'Jupiter at its brightest', V: -2.9 },
  { id: 'sirius', name: 'Sirius', V: -1.46 },
  { id: 'vega', name: 'Vega', V: 0.03 },
  { id: 'polaris', name: 'Polaris', V: 1.98 },
  { id: 'andromeda', name: 'The Andromeda Galaxy', V: 3.4 },
  { id: 'eye', name: 'The faintest stars the eye sees', V: 6 },
  { id: 'binoculars', name: 'The faintest stars in binoculars', V: 9.5 },
  { id: 'proxima', name: 'Proxima Centauri', V: 11.13 },
  { id: 'pluto', name: 'Pluto', V: 14.4 },
  { id: 'hubble', name: 'Hubble’s deepest images', V: 30 },
  { id: 'jwst', name: 'JWST’s faintest galaxies', V: 31 },
] as const;

/** A big ratio, for reading: "2.5", "100", "10,000", "40 billion", "6 × 10²¹". */
export function formatRatio(x: number): string {
  if (x < 10) return x.toPrecision(3).replace(/\.?0+$/, '');
  if (x < 1e6) return Math.round(x).toLocaleString('en-GB', { maximumSignificantDigits: 3 });
  if (x < 1e9) return `${(x / 1e6).toPrecision(2)} million`;
  if (x < 1e12) return `${(x / 1e9).toPrecision(2)} billion`;
  const e = Math.floor(Math.log10(x));
  return `${(x / 10 ** e).toFixed(1)} × 10${superscript(e)}`;
}

/** How a magnitude difference breaks into hundreds: 7.5 magnitudes = 100 × 100 × … × 2.512^r. */
export function explainDifference(difference: number): string {
  const d = Math.abs(difference);
  const hundreds = Math.floor(d / 5 + 1e-9);
  const rest = d - 5 * hundreds;
  const parts: string[] = [];
  if (hundreds) parts.push(`100${hundreds > 1 ? superscript(hundreds) : ''}`);
  if (rest > 0.005) parts.push(`2.512^${rest.toFixed(2).replace(/\.?0+$/, '')}`);
  return parts.length ? parts.join(' × ') : '1';
}
