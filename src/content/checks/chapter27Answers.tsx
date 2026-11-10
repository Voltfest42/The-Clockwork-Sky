import { SMALLEST_STABLE_ORBIT } from '../../figures/blackHoles';

/**
 * Answers for Chapter 27's interactive Check yourself question: in Figure
 * 27.1, find the smallest stable circular orbit. It is at 6GM/c² (a unit test
 * checks the solver agrees); answers within 0.25 GM/c² count.
 */

export const ISCO_TOLERANCE = 0.25;
export const ISCO_START = 10;

export function checkIsco({ radius }: { radius: number }) {
  const said = `${radius.toFixed(1)} GM/c²`;
  if (Math.abs(radius - SMALLEST_STABLE_ORBIT) <= ISCO_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. The innermost stable circular orbit is at 6GM/c², three times the horizon’s radius, about 9 km for each
          solar mass. Closer in, circular orbits exist down to 3GM/c², but the slightest nudge sends them in. Gas in a disc spirals down to here,
          then plunges.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said} is too {radius < SMALLEST_STABLE_ORBIT ? 'close: circular orbits there exist, but they are unstable, like a marble on a hilltop' : 'far out: stable circular orbits go closer in than that'}. In Figure 27.1, lower the angular
        momentum and watch the effective potential’s well: where does it merge with the peak and vanish?
      </p>
    ),
  };
}
