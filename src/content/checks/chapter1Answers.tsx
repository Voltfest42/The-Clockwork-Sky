import { AU } from '../../core/constants';
import { MEAN_ORBITS } from '../../core/ephemeris/meanLongitude';

/** Answers for Chapter 1's interactive Check yourself questions. */

/** Neptune's orbit, as a power of ten of metres across: about 12.95. */
export const NEPTUNE_ORBIT_POWER = Math.log10(2 * MEAN_ORBITS.neptune.a * AU);

/** Whether a view 10^power m across just fits Neptune's orbit: the orbit fits, and the view is no more than 2.5 times as wide. */
export function checkNeptuneFit(power: number) {
  if (power < NEPTUNE_ORBIT_POWER) {
    return { correct: false, feedback: <p>Not yet: Neptune’s orbit is still wider than the view. Zoom out a little more.</p> };
  }
  if (power > NEPTUNE_ORBIT_POWER + 0.4) {
    return {
      correct: false,
      feedback: (
        <p>
          It fits, with lots of room to spare (the view is {(10 ** (power - NEPTUNE_ORBIT_POWER)).toFixed(1)} times wider than the orbit). Zoom back in until the
          orbit nearly fills the view.
        </p>
      ),
    };
  }
  return {
    correct: true,
    feedback: (
      <p>
        Neptune’s orbit is about 9 × 10¹² m across, 9 billion km, so it just fits in a view 10¹³ m wide: 13 steps of ×10 from you. Only eight more
        steps take you past the whole Milky Way.
      </p>
    ),
  };
}
