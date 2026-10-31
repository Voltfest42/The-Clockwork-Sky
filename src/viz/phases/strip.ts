/** The life strip's scales, names and colours (see LifeStrip.tsx). Times in Myr. */

export type StripScale = 'linear' | 'before-end';

/** Short names, to fit in the blocks. */
export const PHASE_SHORT: Record<number, string> = {
  1: 'Main sequence',
  2: 'Crossing',
  3: 'Red giant',
  4: 'Helium burning',
  5: 'AGB',
  6: 'AGB',
  7: 'Helium star',
  8: 'Helium star',
  9: 'Helium giant',
  10: 'White dwarf',
  11: 'White dwarf',
  12: 'White dwarf',
  13: 'Neutron star',
  14: 'Black hole',
  15: 'Nothing',
  16: 'Brown dwarf, cooling',
};

/** Light fills, so dark text reads on all of them in both themes. */
export const FILL: Record<number, string> = {
  1: '#8ecae6',
  2: '#ffe08a',
  3: '#f4a261',
  4: '#e9c46a',
  5: '#ef8a6f',
  6: '#ef8a6f',
  7: '#cdb4f6',
  8: '#cdb4f6',
  9: '#cdb4f6',
  10: '#ced4da',
  11: '#ced4da',
  12: '#ced4da',
  13: '#b8c0ff',
  14: '#6c757d',
  15: '#e9ecef',
  16: '#d4a373',
};

/** SSE's remnants, types 10–15 (16, the Star Forge's brown dwarf, is a living object). */
export const isRemnant = (kw: number) => kw >= 10 && kw <= 15;

/** Where a time falls on the strip, as a fraction of the life's width (0–1). `end` is when the star becomes a remnant. */
export function stripPosition(t: number, start: number, end: number, scale: StripScale): number {
  if (scale === 'linear') return (t - start) / (end - start);
  const tau = (end - start) * 1e-5;
  const left = Math.max(0, end - t);
  return 1 - Math.log10(1 + left / tau) / Math.log10(1 + (end - start) / tau);
}

/** The time at a fraction of the strip's width: stripPosition's inverse. */
export function stripTime(f: number, start: number, end: number, scale: StripScale): number {
  if (scale === 'linear') return start + f * (end - start);
  const tau = (end - start) * 1e-5;
  const left = tau * (10 ** ((1 - f) * Math.log10(1 + (end - start) / tau)) - 1);
  return end - left;
}

