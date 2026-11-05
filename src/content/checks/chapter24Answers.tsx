import { earthSizedMass } from '../../figures/limits';

/**
 * Answers for Chapter 24's interactive Check yourself question: in Figure
 * 24.2, find the mass of a white dwarf the size of Earth. The solver gives
 * 0.91 M☉ for helium, carbon or oxygen (a unit test keeps this in step with
 * it); answers within 0.05 M☉ count.
 */

export const EARTH_SIZED_TOLERANCE = 0.05;
export const EARTH_SIZED_START = 0.5;

export function checkEarthSized({ mass }: { mass: number }) {
  const answer = earthSizedMass();
  const said = `${mass.toFixed(2)} M☉`;
  if (Math.abs(mass - answer) <= EARTH_SIZED_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. The solver makes a white dwarf of {answer.toFixed(2)} M☉ exactly Earth’s size, 6,371 km in radius. Lighter ones are larger
          (Procyon B, of 0.59 Suns, is 8,600 km), heavier ones smaller (Sirius B, of 1.02 Suns, is 5,600 km): nearly a Sun’s worth of matter in a
          ball the size of a planet.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said} is too {mass < answer ? 'light: a white dwarf that light is larger than Earth' : 'heavy: a white dwarf that heavy is smaller than Earth'}. In
        Figure 24.2, slide the central density until the white dwarf’s radius is Earth’s, where its point crosses the line marked “Earth’s radius”, and
        read its mass.
      </p>
    ),
  };
}
