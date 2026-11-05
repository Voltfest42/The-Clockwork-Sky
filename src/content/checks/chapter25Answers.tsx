import { SN_2011FE } from '../../data/supernovae';
import { formatSupernovaLuminosity, NICKEL_PRESETS, peakFor } from '../../figures/explosions';

/**
 * Answers for Chapter 25's interactive Check yourself question: in Figure
 * 25.3, with the white dwarf's settings (1.4 M☉ thrown out at 10,000 km/s,
 * 0.1 cm²/g), find the nickel that puts the peak on SN 2011fe's,
 * 1.17 × 10³⁶ W. Arnett's model gives 0.52 M☉ (a unit test keeps this in
 * step with it); answers within 0.06 M☉ count.
 */

export const NICKEL_ANSWER = 0.52;
export const NICKEL_TOLERANCE = 0.06;
export const NICKEL_QUESTION_START = 0.2;
const IA = NICKEL_PRESETS.find((p) => p.id === 'ia')!;

/** The peak the white dwarf's settings give with this much nickel (M☉), W. */
export const peakWithNickel = (nickel: number) => peakFor({ ...IA, nickel }).L;

export function checkNickel({ nickel }: { nickel: number }) {
  const said = `${nickel.toFixed(2)} M☉`;
  const L = peakWithNickel(nickel);
  if (Math.abs(nickel - NICKEL_ANSWER) <= NICKEL_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. That peaks at {formatSupernovaLuminosity(L)}, against SN 2011fe’s {formatSupernovaLuminosity(SN_2011FE.peak.L)}: Arnett’s
          model needs {NICKEL_ANSWER} Suns of nickel-56, as Pereira and colleagues found from its light ({SN_2011FE.nickel.mass} ± {SN_2011FE.nickel.error}).
          Half the white dwarf’s mass became radioactive nickel; nearly all of it is iron now.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said} peaks at {formatSupernovaLuminosity(L)}, {nickel < NICKEL_ANSWER ? 'fainter' : 'brighter'} than SN 2011fe’s{' '}
        {formatSupernovaLuminosity(SN_2011FE.peak.L)}. The peak’s height is in proportion to the nickel: in Figure 25.3, choose{' '}
        <b>A white dwarf (Type Ia)</b> and slide the nickel until the peak sits on SN 2011fe’s point.
      </p>
    ),
  };
}
