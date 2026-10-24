/** Answers for Chapter 4's interactive Check yourself question. */

/** How close (degrees) to first quarter counts as right. */
export const QUARTER_TOLERANCE = 15;

/** Whether the Moon, at an elongation east of the Sun (degrees), is at first quarter. */
export function checkFirstQuarter(elongation: number) {
  const e = ((elongation % 360) + 360) % 360;
  const off = (target: number) => Math.abs(((e - target + 540) % 360) - 180);
  if (off(90) <= QUARTER_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          At first quarter the Moon is a quarter of the way round its orbit from new: 90° east of the Sun, at right angles to the sunlight. We
          see half of its lit half, so it looks half lit, on the right from the northern hemisphere. It is highest in the sky at sunset.
        </p>
      ),
    };
  }
  let feedback: string;
  if (off(270) <= QUARTER_TOLERANCE) {
    feedback =
      'That’s last quarter, three-quarters of the way round. The Moon goes round anticlockwise seen from above the North Pole, the same way Earth spins, so a quarter of an orbit after new Moon it is on the other side.';
  } else if (off(180) <= QUARTER_TOLERANCE) {
    feedback = 'That’s full Moon: the Moon is opposite the Sun, and we see the whole of its lit half. First quarter comes halfway between new and full.';
  } else if (off(0) <= QUARTER_TOLERANCE) {
    feedback = 'That’s new Moon: the Moon is between Earth and the Sun, and its lit half faces away from us. First quarter is a quarter of an orbit further on.';
  } else {
    feedback = `The Moon is ${Math.round(e)}° round from new Moon here. First quarter is a quarter of the way round, at right angles to the sunlight, with half the side facing us lit.`;
  }
  return { correct: false, feedback: <p>{feedback}</p> };
}
