import { CIRCULAR_SPEED, ESCAPE_SPEED } from '../../figures/cannon';

/** Answers for Chapter 7's interactive Check yourself question. */

/** Whether a launch speed (m/s) from Newton's mountain puts the ball in orbit: at least the circular speed, and below the escape speed. */
export function checkOrbitSpeed(speed: number) {
  const kms = (v: number) => (v / 1000).toFixed(2);
  if (speed >= CIRCULAR_SPEED && speed < ESCAPE_SPEED) {
    return {
      correct: true,
      feedback: (
        <p>
          At {kms(speed)} km/s the ball falls all the way round and never lands. Any speed from {kms(CIRCULAR_SPEED)} km/s (a circle) up to just
          under {kms(ESCAPE_SPEED)} km/s (a longer and longer ellipse) is an orbit.
        </p>
      ),
    };
  }
  const feedback =
    speed < CIRCULAR_SPEED
      ? `At ${kms(speed)} km/s the ground doesn’t curve away fast enough: the ball falls back. It needs at least ${kms(CIRCULAR_SPEED)} km/s.`
      : `At ${kms(speed)} km/s the ball escapes and never comes back. An orbit needs less than ${kms(ESCAPE_SPEED)} km/s.`;
  return { correct: false, feedback: <p>{feedback}</p> };
}
