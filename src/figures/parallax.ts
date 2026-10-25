import { eclipticFromEquatorial } from '../core/coords/transforms';
import { J2000_OBLIQUITY } from '../core/ephemeris/planets';
import { lightYearsFromParsecs, parsecsFromParallax } from '../core/stars/distance';
import { DEG } from '../core/units';

/**
 * Parallax (Figure 9.1). As Earth goes round the Sun, a nearby star seems to
 * trace a small ellipse against much more distant ones, once a year. Its
 * semi-major axis is the parallax p, and the star is 1/p parsecs away. Along
 * the ecliptic the ellipse squashes to a line; at the ecliptic's pole it is a
 * circle: its short axis is p × sin(ecliptic latitude).
 */

export interface ParallaxStar {
  id: string;
  name: string;
  /** Parallax, milliarcseconds. */
  mas: number;
  /** Ecliptic latitude, radians (from the J2000 position). */
  latitude: number;
  source: string;
  note: string;
}

const star = (id: string, name: string, mas: number, raDeg: number, decDeg: number, source: string, note: string): ParallaxStar => ({
  id,
  name,
  mas,
  latitude: eclipticFromEquatorial({ ra: raDeg * DEG, dec: decDeg * DEG }, J2000_OBLIQUITY).lat,
  source,
  note,
});

/** Real parallaxes, with J2000 positions for the shape of the yearly ellipse. */
export const PARALLAX_STARS: readonly ParallaxStar[] = [
  star('proxima', 'Proxima Centauri', 768.07, 217.429, -62.679, 'Gaia DR3', 'The nearest star, so it has the biggest parallax of any star.'),
  star('sirius', 'Sirius', 379.21, 101.287, -16.716, 'Hipparcos (van Leeuwen 2007)', 'The brightest star in the night sky is also one of the nearest.'),
  star('61cyg', '61 Cygni', 285.99, 316.725, 38.749, 'Gaia DR3 (61 Cygni A)', 'Bessel’s star: the first parallax ever measured, in 1838. He found 0.314″.'),
  star('vega', 'Vega', 130.23, 279.235, 38.784, 'Hipparcos (van Leeuwen 2007)', 'Struve measured Vega’s parallax at about the same time as Bessel.'),
  star('betelgeuse', 'Betelgeuse', 5.95, 88.793, 7.407, 'Joyce et al. (2020)', 'So far that its parallax is uncertain by about 10%: a big, flickering star is hard to pin down.'),
];

/** The star's shift from its average place (arcseconds east and north, as two small angles) when Earth is at angle t round its orbit from the star's ecliptic longitude. */
export function parallaxShift(arcsec: number, latitude: number, t: number): { east: number; north: number } {
  return { east: arcsec * Math.sin(t), north: -arcsec * Math.sin(latitude) * Math.cos(t) };
}

/** Distance in words, for a parallax in arcseconds: "1.30 parsecs (4.25 light-years)". */
export function distanceWords(arcsec: number): string {
  const pc = parsecsFromParallax(arcsec);
  const ly = lightYearsFromParsecs(pc);
  const f = (x: number) => (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString('en-GB'));
  return `${f(pc)} parsecs (${f(ly)} light-years)`;
}

/** A parallax in arcseconds in words, with milliarcseconds below a tenth: "0.768″", "0.00595″ (5.95 thousandths)". */
export function parallaxWords(arcsec: number): string {
  if (arcsec >= 0.1) return `${arcsec.toFixed(3)}″`;
  return `${arcsec.toPrecision(3)}″`;
}

/** How far away a coin 2.3 cm across must be to look as small as an angle of `arcsec` (km). */
export function coinDistanceKm(arcsec: number): number {
  return 0.023 / ((arcsec / 3600) * DEG) / 1000;
}
