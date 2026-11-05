import { formatHotKelvin } from '../../figures/furnace';

/**
 * Answers for Chapter 22's interactive Check yourself question: in Figure
 * 22.2, with a newborn star's make-up (100 g/cm³, X = 0.7, Z = 0.02), find the
 * temperature at which the CNO cycle overtakes the pp chains. The network
 * gives 20.0 million K (a unit test keeps this in step with it); answers
 * within a million kelvin count.
 */

export const CROSSOVER_T = 20.0e6;
export const CROSSOVER_TOLERANCE = 1.0e6;
export const CROSSOVER_START = 15e6;

export function checkCrossover({ T }: { T: number }) {
  const said = formatHotKelvin(T);
  if (Math.abs(T - CROSSOVER_T) <= CROSSOVER_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. The network puts the crossing at {formatHotKelvin(CROSSOVER_T)} for a newborn star like the Sun. Below it, the pp chains
          make most of the heat; above it, the CNO cycle, whose rate climbs as about the 18th power of temperature against the pp chains’ fourth,
          leaves them far behind. The Sun’s centre, at 15.7 million K, gets about 6% of its heat from CNO; stars heavier than about 1.3 Suns,
          hotter inside, get most of theirs from it.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said} is {T < CROSSOVER_T ? 'too cool: the pp chains still make most of the heat there' : 'too hot: the CNO cycle has already taken over there'}.
        In Figure 22.2, choose <b>A newborn star</b> and slide the temperature until the two bars of heat are equal.
      </p>
    ),
  };
}
