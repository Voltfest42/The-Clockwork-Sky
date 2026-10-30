import { M_SUN } from '../../core/constants';
import { criticalMassForRadius, MU_MOLECULAR } from '../../core/ism/jeans';
import { PARSEC } from '../../core/units';
import { collapseReadout } from '../../figures/starBirth';

/** Answers for Chapter 16's interactive Check yourself question: the lightest cloud of a given size that collapses at 10 K. */

export const QUESTION_RADIUS = 0.1; // parsecs
export const QUESTION_KELVIN = 10;

/** M = 5kTR / (Gμm_H): about 4.1 M☉ for 0.1 pc of cold molecular gas. */
export const SMALLEST = criticalMassForRadius(QUESTION_RADIUS * PARSEC, QUESTION_KELVIN, MU_MOLECULAR) / M_SUN;

/** Accepted: from the least mass that collapses to a quarter more. */
export const MASS_TOLERANCE = 0.25;

export function checkSmallestCloud(mass: number) {
  const said = `${mass.toFixed(1)} M☉`;
  const r = collapseReadout(mass, QUESTION_RADIUS, QUESTION_KELVIN, true);
  if (!r.collapses) {
    return {
      correct: false,
      feedback: <p>{said}: it holds up. Its heat still beats its gravity; add mass until gravity wins.</p>,
    };
  }
  if (mass <= SMALLEST * (1 + MASS_TOLERANCE)) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right, it collapses, and the least that does is about {SMALLEST.toFixed(1)} M☉. A cloud this size at 10 K is dense enough
          (about {Math.round(collapseReadout(SMALLEST, QUESTION_RADIUS, QUESTION_KELVIN, true).perCm3).toLocaleString('en-GB')} molecules per
          cubic centimetre) that a few Suns’ worth of gas is enough. That is about the mass of the dense cores where stars form.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: <p>{said}: it collapses, but so would a lighter cloud. Take mass away until it only just collapses.</p>,
  };
}
