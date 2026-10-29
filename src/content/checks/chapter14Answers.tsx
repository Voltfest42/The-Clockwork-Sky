import { eclipseLimit } from '../../core/binaries/orbit';
import { ECLIPSE_PRESETS } from '../../figures/binaries';

/** Answers for Chapter 14's interactive Check yourself question: the tilt at which Figure 14.3's pair starts to eclipse. */

export const TILT_PAIR = ECLIPSE_PRESETS[0].pair;

/** cos i = (R₁ + R₂)/a: about 79.0° for the workbench's own pair. */
export const ECLIPSE_START = eclipseLimit(TILT_PAIR, TILT_PAIR.r1, TILT_PAIR.r2);

/** Accepted: from the limit to half a degree beyond it, where the dips are still slivers. */
export const TILT_TOLERANCE = 0.5;

export function checkEclipseStart(tilt: number) {
  const said = `${tilt.toFixed(1)}°`;
  if (tilt < ECLIPSE_START) {
    return {
      correct: false,
      feedback: <p>{said}: no eclipses yet. The stars pass above and below each other; tilt the orbit nearer to edge-on.</p>,
    };
  }
  if (tilt <= ECLIPSE_START + TILT_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right, the eclipses begin at {ECLIPSE_START.toFixed(1)}°. There the stars just graze each other as we see them: the orbit is{' '}
          {(Math.cos((ECLIPSE_START * Math.PI) / 180) * 100).toFixed(0)}% short of edge-on, and the stars’ radii add up to the same share of the
          distance between them. Closer pairs, or bigger stars, eclipse over a wider range of tilts.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: <p>{said}: they eclipse here, but they started further back. Tilt the orbit back towards face-on until the dips are just about to vanish.</p>,
  };
}
