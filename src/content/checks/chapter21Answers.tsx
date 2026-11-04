import { formatLuminosity } from '../../figures/energy';

/**
 * Answers for Chapter 21's interactive Check yourself question: in Figure
 * 21.4, build a star of twice the Sun's mass (X = 0.7, Z = 0.02) and read its
 * luminosity. The builder gives 21 L☉ (a unit test keeps this in step with
 * it); answers within a quarter of that count. Measured stars of two Suns
 * (DEBCat) shine with about 10 to 25.
 */

export const TWO_SUNS_LUMINOSITY = 21.3;
export const TWO_SUNS_TOLERANCE = 0.25;
export const TWO_SUNS_START = 2;

export function checkTwoSuns({ luminosity }: { luminosity: number }) {
  const ratio = luminosity / TWO_SUNS_LUMINOSITY;
  const said = `${formatLuminosity(luminosity)}`;
  if (Math.abs(ratio - 1) <= TWO_SUNS_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. The builder gives {formatLuminosity(TWO_SUNS_LUMINOSITY)}, and measured stars of two Suns shine with about 10 to 25. Twice
          the mass, some twenty times the light: L grows as about M⁴ here, because a heavier star’s heat leaks out so much faster. Its centre is only
          70% hotter than the young Sun’s.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said} is {ratio > 1 ? 'too bright' : 'too faint'}. Build it in Figure 21.4: set the mass to 2 M☉ with X = 0.7 and Z = 0.02, and read the
        luminosity from the card. (Doubling the mass multiplies a star’s light by about 2⁴.)
      </p>
    ),
  };
}
