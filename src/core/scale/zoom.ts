import { AU } from '../constants';
import { clamp } from '../math/angles';
import { formatInWords, formatSignificant } from '../math/scientific';
import { LIGHT_YEAR } from '../units';
import type { PositionTree, Vec2 } from './tree';

/**
 * The scale zoom's camera. Its zoom is a "power": the view is 10^power metres
 * across. As it zooms out, its centre glides from one anchor to the next (the
 * person, then the Sun, then the Galaxy's centre), so the biggest thing in view
 * stays in the middle.
 */

/** At `power`, the camera is centred on `anchor`. Between two stops it glides from one anchor to the next. */
export interface CameraStop {
  power: number;
  anchor: string;
}

export interface CameraCentre {
  from: string;
  to: string;
  /** How far along the glide from `from` to `to`, 0–1. */
  t: number;
}

/** A smooth step from 0 to 1, flat at both ends, so a glide starts and ends gently. */
export function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Where the camera is centred at a power, given its stops (in increasing power). */
export function cameraCentre(stops: readonly CameraStop[], power: number): CameraCentre {
  if (stops.length === 0) throw new Error('The camera needs at least one stop');
  if (power <= stops[0].power) return { from: stops[0].anchor, to: stops[0].anchor, t: 0 };
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (power <= b.power) {
      if (a.anchor === b.anchor) return { from: a.anchor, to: a.anchor, t: 0 };
      return { from: a.anchor, to: b.anchor, t: smoothstep((power - a.power) / (b.power - a.power)) };
    }
  }
  const last = stops[stops.length - 1];
  return { from: last.anchor, to: last.anchor, t: 0 };
}

/** Where an object is relative to the camera's centre, m. */
export function offsetFromCentre(tree: PositionTree, id: string, centre: CameraCentre): Vec2 {
  const [x, y] = tree.relative(id, centre.from);
  if (centre.t === 0 || centre.from === centre.to) return [x, y];
  const [gx, gy] = tree.relative(centre.to, centre.from);
  return [x - centre.t * gx, y - centre.t * gy];
}

/**
 * A fade window on the power scale: 1 between `from` and `to`, falling linearly
 * to 0 over `fade` powers of ten on either side.
 */
export function fadeWindow(power: number, from: number, to: number, fade = 0.5): number {
  if (power < from) return clamp(1 - (from - power) / fade, 0, 1);
  if (power > to) return clamp(1 - (power - to) / fade, 0, 1);
  return 1;
}

/** Pixels per metre for a view `10^power` metres across that is `widthPx` pixels wide. */
export function pixelsPerMetre(power: number, widthPx: number): number {
  return widthPx / 10 ** power;
}

/** The units a scale bar can be in, smallest first, with the longest bar (in metres) each is used for. */
const BAR_UNITS = [
  { name: 'm', metres: 1, upTo: 1e4 },
  { name: 'km', metres: 1e3, upTo: 0.1 * AU },
  { name: 'AU', metres: AU, upTo: 0.2 * LIGHT_YEAR },
  { name: 'light-years', metres: LIGHT_YEAR, upTo: Infinity },
] as const;

/**
 * A round length for a scale bar: the largest 1, 2 or 5 × 10ⁿ of a suitable
 * unit (m, km, AU or light-years) that fits in `maxPx` pixels. Returns the
 * length in metres and pixels, and as text: "50 m", "2 million km", "10 AU".
 */
export function scaleBar(pxPerMetre: number, maxPx: number): { metres: number; px: number; text: string } {
  const most = maxPx / pxPerMetre;
  const unit = BAR_UNITS.find((u) => most < u.upTo) ?? BAR_UNITS[BAR_UNITS.length - 1];
  const inUnits = most / unit.metres;
  const exponent = Math.floor(Math.log10(inUnits));
  const count = [5, 2, 1].map((step) => step * 10 ** exponent).find((n) => n <= inUnits) ?? 10 ** exponent;
  const metres = count * unit.metres;
  const number = count >= 1e6 ? formatInWords(count) : formatSignificant(count, 1);
  const name = unit.name === 'light-years' && count === 1 ? 'light-year' : unit.name;
  return { metres, px: metres * pxPerMetre, text: `${number} ${name}` };
}
