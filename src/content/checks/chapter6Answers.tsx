/** Answers for Chapter 6's interactive Check yourself question. */

/** Halley's comet's eccentricity (JPL Small-Body Database), and how close counts as right. */
export const HALLEY_E = 0.968;
export const HALLEY_TOLERANCE = 0.025;

/** Whether an eccentricity looks like Halley's comet's orbit. */
export function checkHalley(e: number) {
  if (Math.abs(e - HALLEY_E) <= HALLEY_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          Halley’s comet’s orbit has an eccentricity of about 0.97: a long, thin ellipse. It swings in to 0.58 AU from the Sun, inside Venus’s
          orbit, and out to 35 AU, beyond Neptune’s, taking about 76 years for the round trip.
        </p>
      ),
    };
  }
  let feedback: string;
  if (e < 0.3) feedback = 'That’s nearly a circle, like a planet’s orbit. Halley’s comet comes in close to the Sun and goes far out beyond Neptune: its orbit is much more stretched.';
  else if (e < HALLEY_E - HALLEY_TOLERANCE) feedback = `An eccentricity of ${e.toFixed(2)} is quite stretched, but Halley’s orbit is more so: about 60 times longer from end to end than the closest it comes to the Sun.`;
  else feedback = `At ${e.toFixed(3)} the ellipse is even thinner than Halley’s. Its eccentricity is about 0.97.`;
  return { correct: false, feedback: <p>{feedback}</p> };
}
