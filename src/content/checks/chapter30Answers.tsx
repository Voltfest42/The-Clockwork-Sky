import { keplerMass } from '../../core/galaxy/s2';
import { SGR_A_STAR, S2_ORBIT } from '../../data/s2';
import { S2_A_AU, SGR_A_RANGE } from '../../figures/crowds';

/**
 * Answers for Chapter 30's interactive Check yourself question: weigh
 * Sagittarius A* from S2's orbit, as measured in Figure 30.5 with the ruler
 * (half the long axis, in AU) and the stopwatch (one lap, in years). An answer
 * counts if the semi-major axis is within 4% of the published orbit's, the
 * period within 3%, and the mass they give, a³/P², within SGR_A_RANGE: what a
 * ruler read to a couple of per cent and a stopwatch to half a year allow.
 */

export const WEIGH_START = { a: 700, period: 12 } as const;

export function checkWeighing({ a, period }: { a: number; period: number }) {
  const mass = keplerMass(a, period);
  const said = `A semi-major axis of ${a.toLocaleString('en-GB')} AU and a period of ${period.toFixed(1)} years give ${(mass / 1e6).toFixed(2)} million M☉`;
  const aOff = (a - S2_A_AU) / S2_A_AU;
  const pOff = (period - S2_ORBIT.period) / S2_ORBIT.period;
  if (Math.abs(aOff) <= 0.04 && Math.abs(pOff) <= 0.03 && mass >= SGR_A_RANGE[0] && mass <= SGR_A_RANGE[1]) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. Kepler’s third law in the Sun’s units, M = a³/P², weighs the black hole at about four and a quarter million Suns, all
          inside 120 AU. GRAVITY’s fit to 27 years of positions and speeds gives {(SGR_A_STAR.mass / 1e6).toFixed(3)} million, to a third of a per
          cent; most of that uncertainty is in the distance, since the semi-major axis in AU is the angle times the distance.
        </p>
      ),
    };
  }
  const hint =
    Math.abs(aOff) > 0.04
      ? `The semi-major axis is ${aOff > 0 ? 'too long' : 'too short'}: in Figure 30.5, turn the orbit face on and stretch the ruler across the whole long axis; the semi-major axis is half of it.`
      : Math.abs(pOff) > 0.03
        ? `The period is ${pOff > 0 ? 'too long' : 'too short'}: start the stopwatch as S2 passes the black hole and stop it when it comes back round.`
        : 'Check the arithmetic: cube the semi-major axis in AU and divide by the square of the period in years.';
  return { correct: false, feedback: <p>{said}. {hint}</p> };
}
