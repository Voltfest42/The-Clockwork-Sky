import { T_SUN } from '../../core/constants';
import { formatSuns, solarLuminosity } from '../../figures/thermal';

/** Answers for Chapter 11's interactive Check yourself question: a star as luminous as the Sun at half its temperature. */

export interface StarState {
  /** Radius, in Suns. */
  radius: number;
  /** Temperature, K. */
  kelvin: number;
}

/** Right when the temperature is within 5% of half the Sun's and the luminosity within 10% of the Sun's: a radius of about 4 Suns. */
export function checkHalfTemperature({ radius, kelvin }: StarState) {
  const L = solarLuminosity(radius, kelvin);
  const half = T_SUN / 2;
  const said = `${formatSuns(radius)} times the Sun’s radius at ${Math.round(kelvin).toLocaleString('en-GB')} K gives ${formatSuns(L)} times the Sun’s luminosity`;
  if (Math.abs(kelvin / half - 1) > 0.05) {
    return { correct: false, feedback: <p>First set the temperature to half the Sun’s: about {Math.round(half).toLocaleString('en-GB')} K.</p> };
  }
  if (Math.abs(L - 1) <= 0.1) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}. At half the temperature each square metre gives out (½)⁴ = 1/16 as much, so the star needs 16 times the surface: 4 times the
          Sun’s radius, since area goes with the square of the radius.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said}. {L < 1 ? 'Too dim: make it bigger.' : 'Too bright: make it smaller.'} Each square metre gives out a sixteenth as much as the Sun’s, so how
        much more surface does it need?
      </p>
    ),
  };
}
