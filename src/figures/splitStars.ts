import { fractionalYear, visualPosition } from '../core/binaries/visual';
import { airy, airyEncircled, encircled, pointSpread, psfAt, rayleighLimit, seeingAt, type Air } from '../core/light/diffraction';
import { ARCSEC } from '../core/units';
import { VISUAL_PAIRS, type VisualPair } from '../data/binaries';

/**
 * Split the stars (Figure 10.4): two stars seen through a telescope, each
 * blurred into the Airy pattern of its aperture, and by the air. The image
 * adds the two stars' light; "split" means the brightness dips between them,
 * so the eye sees two peaks.
 */

export type AirChoice = 'none' | 'good' | 'poor' | 'adaptive';

export const AIR_CHOICES: readonly { id: AirChoice; name: string; fwhm: number }[] = [
  { id: 'none', name: 'No air (space)', fwhm: 0 },
  { id: 'good', name: 'A good night (0.7″)', fwhm: 0.7 },
  { id: 'poor', name: 'A poor night (2″)', fwhm: 2 },
  { id: 'adaptive', name: 'Adaptive optics', fwhm: 0.7 },
];

export const WAVELENGTHS = [
  { id: 'blue', name: 'Blue, 450 nm', value: 450e-9 },
  { id: 'green', name: 'Green, 550 nm', value: 550e-9 },
  { id: 'infrared', name: 'Infrared, 2.2 µm', value: 2.2e-6 },
] as const;

/**
 * The Strehl ratio adaptive optics reaches, as a simple model: the share of the
 * light put back into the sharp core, exp(−σ²) with the leftover wobble σ
 * shrinking as 1/λ. 60% at 2.2 µm, as good systems reach; almost nothing in
 * visible light.
 */
export function adaptiveStrehl(wavelength: number): number {
  return Math.exp(-0.51 * (2.2e-6 / wavelength) ** 2);
}

export function airFor(choice: AirChoice, wavelength: number): Air {
  const fwhm = (AIR_CHOICES.find((a) => a.id === choice)!.fwhm * ARCSEC) as number;
  if (choice === 'none') return { kind: 'none' };
  if (choice === 'adaptive') return { kind: 'adaptive', fwhm, strehl: adaptiveStrehl(wavelength) };
  return { kind: 'seeing', fwhm };
}

export interface Optics {
  wavelength: number;
  aperture: number;
  air: Air;
}

/** How wide a star's image is (rad): the diffraction limit, or the seeing disc, whichever is bigger (adaptive optics: the diffraction limit once the core holds a fair share). */
export function blurWidth({ wavelength, aperture, air }: Optics): number {
  const diffraction = rayleighLimit(wavelength, aperture);
  if (air.kind === 'none') return diffraction;
  const seeing = seeingAt(air.fwhm, wavelength);
  if (air.kind === 'adaptive' && air.strehl > 0.2) return diffraction;
  return Math.max(diffraction, seeing);
}

/** The point-spread function of the optics, with its encircled light, tabulated out to `extent` (rad). Without air, none is needed: the Airy pattern is exact. */
export function makePsf(optics: Optics, extent: number) {
  if (optics.air.kind === 'none') return null;
  const table = pointSpread(optics.wavelength, optics.aperture, { ...optics.air, ...(optics.air.kind === 'adaptive' ? { strehl: 0 } : {}) }, extent, 900);
  return { table, ee: encircled(table) };
}

type Psf = ReturnType<typeof makePsf>;

/** Brightness (per steradian, for unit flux) at an angle (rad) from a star. */
export function brightnessAt(optics: Optics, psf: Psf, angle: number): number {
  const peak = (Math.PI / 4) * (optics.aperture / optics.wavelength) ** 2;
  const diffraction = peak * airy((Math.PI * optics.aperture * angle) / optics.wavelength);
  if (!psf) return diffraction;
  const seeing = psfAt(psf.table, angle);
  return optics.air.kind === 'adaptive' ? optics.air.strehl * diffraction + (1 - optics.air.strehl) * seeing : seeing;
}

/** The share of a star's light inside an angle (rad). */
function encircledAt(optics: Optics, psf: Psf, angle: number): number {
  const sharp = airyEncircled(angle, optics.wavelength, optics.aperture);
  if (!psf) return sharp;
  const i = angle / psf.table.step;
  const k = Math.floor(i);
  const blurred = k >= psf.ee.length - 1 ? psf.ee[psf.ee.length - 1] : psf.ee[k] + (i - k) * (psf.ee[k + 1] - psf.ee[k]);
  return optics.air.kind === 'adaptive' ? optics.air.strehl * sharp + (1 - optics.air.strehl) * blurred : blurred;
}

/**
 * The light (unit flux per star) falling in a pixel of side `pixel` (rad) whose
 * centre is an angle r from the star: the light in the ring from r − p/2 to
 * r + p/2, shared out by area. It works whether the star's image is far smaller
 * than a pixel (all its light lands in one) or far bigger.
 */
export function pixelLight(optics: Optics, psf: Psf, r: number, pixel: number): number {
  const h = pixel / 2;
  // The pixel the star sits in: the light inside a circle of the pixel's area.
  if (r < h) return encircledAt(optics, psf, pixel / Math.sqrt(Math.PI));
  const inner = Math.max(0, r - h);
  const outer = r + h;
  const ring = encircledAt(optics, psf, outer) - encircledAt(optics, psf, inner);
  return (ring * pixel * pixel) / (Math.PI * (outer * outer - inner * inner));
}

export interface PairLayout {
  /** Separation, rad. */
  separation: number;
  /** Position angle of the fainter star, rad from north through east. */
  positionAngle: number;
  /** The fainter star's brightness relative to the brighter. */
  ratio: number;
}

/** The pair as it is at a date (Unix ms). */
export function pairToday(pair: VisualPair, ms: number): PairLayout {
  const p = visualPosition(pair.orbit, fractionalYear(ms));
  return { separation: p.separation, positionAngle: p.positionAngle, ratio: 10 ** (-0.4 * (pair.secondary.V - pair.primary.V)) };
}

/** The image of the pair: N × N pixels across a field `fov` (rad), north up and east to the left as on the sky. Values are light per pixel. */
export function renderPair(optics: Optics, layout: PairLayout, fov: number, n: number): Float32Array {
  const psf = makePsf(optics, fov * 0.75 + layout.separation);
  const out = new Float32Array(n * n);
  const pixel = fov / n;
  // Centre the pair on its midpoint (light-weighted, so a faint companion doesn't pull the bright star off-centre).
  const w = layout.ratio / (1 + layout.ratio);
  const dx = -layout.separation * Math.sin(layout.positionAngle); // east is to the left
  const dy = -layout.separation * Math.cos(layout.positionAngle); // north is up
  // A star whose image is smaller than a couple of pixels is put at the middle of its pixel, so all its light lands there.
  const snap = blurWidth(optics) < 2 * pixel ? (v: number) => (Math.floor(v / pixel) + 0.5) * pixel : (v: number) => v;
  const stars = [
    { x: snap(-w * dx), y: snap(-w * dy), flux: 1 },
    { x: snap((1 - w) * dx), y: snap((1 - w) * dy), flux: layout.ratio },
  ];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5 - n / 2) * pixel;
      const y = (j + 0.5 - n / 2) * pixel;
      let v = 0;
      for (const s of stars) v += s.flux * pixelLight(optics, psf, Math.hypot(x - s.x, y - s.y), pixel);
      out[j * n + i] = v;
    }
  }
  return out;
}

/** The brightness along the line through both stars, from a little beyond the brighter to a little beyond the fainter: [offset from the brighter (rad), brightness]. */
export function profile(optics: Optics, layout: PairLayout, samples = 400): [number, number][] {
  const extra = Math.max(layout.separation * 0.6, 2.5 * blurWidth(optics));
  const from = -extra;
  const to = layout.separation + extra;
  const psf = makePsf(optics, Math.max(Math.abs(from), to) + layout.separation);
  const out: [number, number][] = [];
  for (let k = 0; k <= samples; k++) {
    const s = from + ((to - from) * k) / samples;
    out.push([s, brightnessAt(optics, psf, Math.abs(s)) + layout.ratio * brightnessAt(optics, psf, Math.abs(s - layout.separation))]);
  }
  return out;
}

/**
 * Whether the eye would see two stars: the brightness between them must dip
 * below 90% of the brightness at the fainter one. For equal stars this is a
 * little finer than Rayleigh's 1.22 λ/D; the fainter the companion, the
 * coarser.
 */
export function isSplit(optics: Optics, layout: PairLayout): boolean {
  const psf = makePsf(optics, layout.separation * 2 + 6 * blurWidth(optics));
  const at = (s: number) => brightnessAt(optics, psf, Math.abs(s)) + layout.ratio * brightnessAt(optics, psf, Math.abs(s - layout.separation));
  const atFaint = at(layout.separation);
  let lowest = Infinity;
  const n = 400;
  for (let k = 1; k < n; k++) lowest = Math.min(lowest, at((layout.separation * k) / n));
  return lowest < 0.9 * atFaint;
}

/** A telescope's width: "7 mm", "6.0 cm", "20 cm", "2.4 m". */
export function formatAperture(d: number): string {
  if (d >= 1) return `${d.toFixed(d < 10 ? 1 : 0)} m`;
  if (d >= 0.1) return `${Math.round(d * 100)} cm`;
  return d >= 0.02 ? `${(d * 100).toFixed(1)} cm` : `${Math.round(d * 1000)} mm`;
}

/** An angle (rad) in arcseconds, to a sensible precision. */
export function formatArcsec(rad: number): string {
  const a = rad / ARCSEC;
  if (a >= 10) return `${a.toFixed(0)}″`;
  if (a >= 0.1) return `${a.toFixed(a >= 1 ? 1 : 2)}″`;
  return `${a.toFixed(3)}″`;
}

/** The figure's pairs: the real doubles, today. */
export const PAIRS = VISUAL_PAIRS;
