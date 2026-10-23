/** Answers for Chapter 2's interactive Check yourself question. */

/** Polaris is this far from the north celestial pole in 2026, degrees, so it circles between latitude ± 0.63° in altitude. */
export const POLARIS_FROM_POLE = 0.63;

/** Whether a latitude (degrees) puts Polaris on the horizon: within 1.5° of the equator. */
export function checkPolarisOnHorizon(latitude: number) {
  if (Math.abs(latitude) <= 1.5) {
    return {
      correct: true,
      feedback: (
        <p>
          On the equator the north celestial pole sits on the northern horizon, so Polaris, 0.6° from the pole, skims along it, just above at
          some hours and just below at others. Sailors crossing the equator used to watch Polaris sink into the sea.
        </p>
      ),
    };
  }
  if (latitude > 0) {
    return {
      correct: false,
      feedback: (
        <p>
          Polaris is still about {Math.round(latitude)}° up: its height equals your latitude. Move south until the pole’s height, and your
          latitude, is about zero.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        Too far south: Polaris is now about {Math.round(-latitude)}° below the horizon and never rises. Move north until your latitude is about
        zero.
      </p>
    ),
  };
}
