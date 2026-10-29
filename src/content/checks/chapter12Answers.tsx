import { paynePeak } from '../../core/spectra/atmosphere';
import { spectralTypeOf } from '../../core/stars/hr';
import { formatKelvin } from '../../viz/spectrum/format';

/** Answers for Chapter 12's interactive Check yourself question: the temperature where hydrogen's lines are strongest. */

/** The toy atmosphere's peak for hydrogen's Balmer lines, K (about 10,500 K; the lines' widths peak a little cooler, near 9,500 K). */
export const BALMER_PEAK = paynePeak('H I');

/** Accepted: 8,500 to 12,500 K, the late B and A stars. */
export const BALMER_RANGE = [8500, 12500] as const;

export function checkBalmerPeak(kelvin: number) {
  const type = spectralTypeOf(kelvin).replace(/V$/, '');
  const said = `${formatKelvin(kelvin)}, ${/^[AFOM]/.test(type) ? 'an' : 'a'} ${type} star`;
  if (kelvin >= BALMER_RANGE[0] && kelvin <= BALMER_RANGE[1]) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right, the A stars, near 10,000 K. Cooler, too few hydrogen atoms sit on the second rung to absorb visible light; hotter, most of
          the hydrogen is ionised and has no electron left to absorb anything.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback:
      kelvin < BALMER_RANGE[0] ? (
        <p>{said}. Hotter: here few hydrogen atoms sit on the second rung, where the visible lines start.</p>
      ) : (
        <p>{said}. Cooler: here most of the hydrogen is ionised, with no electron left to absorb light.</p>
      ),
  };
}
