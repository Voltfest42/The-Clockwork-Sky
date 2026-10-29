import { fromPhysics, regionOf, type HRPoint, type Region } from '../../core/stars/hr';

/** Answers for Chapter 13's interactive Check yourself question: pick the white dwarf on a small HR diagram. */

export interface Candidate {
  letter: string;
  point: HRPoint;
}

/** Six stars, one from each part of the diagram: a Sun-like star, a red dwarf, a giant, a white dwarf, a supergiant and a hot main-sequence star. */
export const CANDIDATES: readonly Candidate[] = [
  { letter: 'A', point: fromPhysics(5800, 1.1) },
  { letter: 'B', point: fromPhysics(3200, 0.004) },
  { letter: 'C', point: fromPhysics(4300, 170) },
  { letter: 'D', point: fromPhysics(9000, 0.001) },
  { letter: 'E', point: fromPhysics(3600, 90000) },
  { letter: 'F', point: fromPhysics(9600, 40) },
];

const WHAT: Record<Region, string> = {
  'main-sequence': 'on the main sequence',
  'red-dwarfs': 'a red dwarf, at the bottom of the main sequence',
  subgiants: 'a subgiant',
  giants: 'a giant',
  supergiants: 'a supergiant',
  'white-dwarfs': 'a white dwarf',
  between: 'in the gap below the main sequence',
};

export function checkWhiteDwarf(letter: string) {
  const c = CANDIDATES.find((x) => x.letter === letter);
  if (!c) return { correct: false, feedback: <p>Pick one of the stars first.</p> };
  const region = regionOf(c.point.kelvin, c.point.luminosity);
  if (region === 'white-dwarfs') {
    return {
      correct: true,
      feedback: (
        <p>
          Star {letter}: right. Hot (9,000 K) but a thousandth of the Sun’s luminosity, so it must be tiny, about the size of Earth: a white dwarf,
          below and to the left of the main sequence.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        Star {letter} is {WHAT[region]}. A white dwarf is hot but very dim, so it lies below the main
        sequence, towards the left.
      </p>
    ),
  };
}
