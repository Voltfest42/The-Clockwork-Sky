import { rayleighLimit } from '../../core/light/diffraction';
import { VISUAL_PAIRS } from '../../data/binaries';
import { formatAperture, formatArcsec, isSplit, pairToday, type Optics } from '../../figures/splitStars';

/** Answers for Chapter 10's interactive Check yourself question: split ε¹ Lyrae, with no air, in green light. */

export const EPSILON_1 = VISUAL_PAIRS.find((p) => p.id === 'epsilon-lyrae-1')!;
const GREEN = 550e-9;

export function epsilonOptics(aperture: number): Optics {
  return { wavelength: GREEN, aperture, air: { kind: 'none' } };
}

/** The smallest aperture (m) that splits ε¹ Lyrae on a date (Unix ms), by bisection on the figure's own test. */
export function smallestToSplit(ms: number): number {
  const layout = pairToday(EPSILON_1, ms);
  let lo = 0.005;
  let hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = Math.sqrt(lo * hi);
    if (isSplit(epsilonOptics(mid), layout)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Right when the telescope splits the pair and is no more than a quarter wider than it needs to be. */
export function checkEpsilonLyrae(aperture: number, ms: number) {
  const layout = pairToday(EPSILON_1, ms);
  const smallest = smallestToSplit(ms);
  const split = isSplit(epsilonOptics(aperture), layout);
  const rayleigh = (1.22 * GREEN) / layout.separation;
  const sep = formatArcsec(layout.separation);
  if (split && aperture <= smallest * 1.25) {
    return {
      correct: true,
      feedback: (
        <p>
          A {formatAperture(aperture)} telescope just splits the two stars, {sep} apart: the light dips between them from about {formatAperture(smallest)}.
          Rayleigh’s rule, 1.22 λ/D, gives {formatAperture(rayleigh)} for two equal stars; one of these is fainter, which makes it a little harder. A small
          backyard telescope is enough, on a steady night.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: split ? (
      <p>
        That splits them easily. Make the telescope narrower: how small can it be and still show two stars? (Its limit is {formatArcsec(rayleighLimit(GREEN, aperture))}, and
        the stars are {sep} apart.)
      </p>
    ) : (
      <p>
        At {formatAperture(aperture)} each star’s blur, about {formatArcsec(rayleighLimit(GREEN, aperture))} across, is wider than the gap of {sep}: the stars merge. Try a wider
        telescope.
      </p>
    ),
  };
}
