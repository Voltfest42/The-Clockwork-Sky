import { NAKED_EYE_LIMIT } from '../../core/stars/distance';
import { lightYearsFromParsecs } from '../../core/stars/distance';
import { sunMagnitude, sunVisibleTo } from '../../figures/sunAway';

/** Answers for Chapter 9's interactive Check yourself question. */

/** Whether the Sun, moved to `parsecs`, is just at the edge of naked-eye visibility: magnitude 5.7 to 6.4, about 15–21 parsecs. */
export function checkSunAtTheLimit(parsecs: number) {
  const m = sunMagnitude(parsecs);
  const ly = Math.round(lightYearsFromParsecs(parsecs));
  const edge = sunVisibleTo();
  const said = `At ${ly} light-years the Sun is magnitude ${m.toFixed(1)}`;
  if (m >= 5.7 && m <= 6.4) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right at the edge of what the eye can see in a dark sky. Beyond about {Math.round(lightYearsFromParsecs(edge))} light-years (
          {edge.toFixed(0)} parsecs) it fades from view, so most of the stars you can see are either near or far brighter than the Sun.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said}. {m < NAKED_EYE_LIMIT ? 'It is still easy to see: move it farther away.' : 'That is too faint to see: bring it closer.'}
      </p>
    ),
  };
}
