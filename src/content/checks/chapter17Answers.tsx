import { turnoffMass } from '../../core/stellar/lives';
import { clusterById, clusterZ, formatMyr } from '../../figures/starLives';

/** Answers for Chapter 17's interactive Check yourself question: the age of the Pleiades, fitted by its turn-off in Figure 17.3. */

/** Ages (Myr) accepted: where SSE's turn-off sits among the Pleiades' brightest main-sequence stars, from about 70 to 180 million years. The published ages are 110–125. */
export const PLEIADES_ACCEPTED: [number, number] = [70, 180];

export function checkPleiadesAge(age: number) {
  const said = formatMyr(age);
  const pleiades = clusterById('pleiades');
  const [lo, hi] = pleiades.age;
  const mass = turnoffMass(age, clusterZ(pleiades));
  if (age < PLEIADES_ACCEPTED[0]) {
    return {
      correct: false,
      feedback: <p>{said}: too young. At that age stars up to {mass.toFixed(1)} Suns would still be on the main sequence, brighter than any the Pleiades has there. Make it older.</p>,
    };
  }
  if (age > PLEIADES_ACCEPTED[1]) {
    return {
      correct: false,
      feedback: <p>{said}: too old. By then stars of {mass.toFixed(1)} Suns would have left the main sequence, but the Pleiades still has stars that bright on it. Make it younger.</p>,
    };
  }
  return {
    correct: true,
    feedback: (
      <p>
        {said}: right. The turn-off is near stars of {mass.toFixed(1)} Suns, blue-white B stars like Alcyone. Published ages are {lo} to {hi} million years; the
        lithium the faintest members have kept gives 112 ± 5 million (Dahm 2015). The Pleiades were born while dinosaurs walked the Earth.
      </p>
    ),
  };
}
