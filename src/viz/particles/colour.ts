/**
 * Colours for the particle view, as sRGB components from 0 to 1. The view's
 * shader writes them straight to the screen, so they are given as they should
 * look, not converted to linear light.
 */

/** "#7dd3fc" or "#7cf" → [r, g, b] in 0–1. */
export function rgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Mixes two colours, t = 0 giving the first. */
export function mix(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Picks a colour along a ramp of stops (evenly spaced), t from 0 to 1. */
export function ramp(stops: readonly (readonly number[])[], t: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(u));
  return mix(stops[i], stops[i + 1], u - i);
}
