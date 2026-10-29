import { blackBodyColour } from '../../core/stars/photometry';

/** A star's colour and the darkening of its disc towards the edge, for StarDisc and the figures. */

/** Linear limb darkening, I(μ) = 1 − u (1 − μ), with u = 0.6, about the Sun's in visible light. */
export const LIMB_DARKENING = 0.6;

/** The brightness of a star's disc at a fraction ρ (0–1) of its radius from the centre, relative to the centre. */
export function limbBrightness(rho: number, u = LIMB_DARKENING): number {
  const mu = Math.sqrt(Math.max(0, 1 - rho * rho));
  return 1 - u * (1 - mu);
}

/** A star's colour (CSS) at a temperature (K). */
export function starCss(kelvin: number, brightness = 1): string {
  const [r, g, b] = blackBodyColour(kelvin);
  return `rgb(${Math.round(r * brightness)}, ${Math.round(g * brightness)}, ${Math.round(b * brightness)})`;
}

