import { JUPITER_A, orbitsPerPlanetOrbit, resonanceAxis } from '../../core/orbits/resonance';

/** Answers for Chapter 8's interactive Check yourself question. */

/** Whether a distance (AU) is where an asteroid would go round three times for each of Jupiter's orbits: 2.45–2.55 AU, round the 3 : 1 resonance at 2.50. */
export function checkThreeToOne(a: number) {
  const target = resonanceAxis(JUPITER_A, 3, 1);
  const laps = orbitsPerPlanetOrbit(a, JUPITER_A);
  const said = `At ${a.toFixed(2)} AU an asteroid goes round ${laps.toFixed(2)} times for each of Jupiter’s orbits`;
  if (a >= 2.45 - 1e-9 && a <= 2.55 + 1e-9) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}, so every three laps it meets Jupiter at the same place, and the tugs add up. That is the 3 : 1 Kirkwood gap at{' '}
          {target.toFixed(2)} AU: almost empty in the histogram.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said}. {laps > 3 ? 'That is too fast: move outward, where orbits are slower.' : 'That is too slow: move inward, where orbits are faster.'}
      </p>
    ),
  };
}
