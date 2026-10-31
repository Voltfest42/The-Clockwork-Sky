import { DETECTION_SIGMA } from '../../core/exoplanets/detect';
import { campaign, earthTwin, TRANSITS_NEEDED, verdictOf } from '../../figures/otherWorlds';

/** Answers for Chapter 19's interactive Check yourself question: an Earth twin, seen edge-on round a Sun-like star, made detectable in Figure 19.1's simulation. */

export interface TwinSettings {
  /** Wobble precision, m/s; light precision per half hour, ppm; nights watched. */
  rv: number;
  light: number;
  nights: number;
}

export const TWIN_START: TwinSettings = { rv: 1, light: 300, nights: 365 };

export function checkEarthTwin({ rv, light, nights }: TwinSettings) {
  const c = campaign(earthTwin(rv, light, nights));
  const v = verdictOf(c);
  const said = `With ${rv < 1 ? `${Math.round(rv * 100)} cm/s` : `${rv.toFixed(1)} m/s`}, ${Math.round(light)} ppm and ${Math.round(nights).toLocaleString('en-GB')} nights`;
  const wobble = `the wobble stands out by ${c.wobble.significance.toFixed(1)}σ`;
  const transit = `the transit by ${c.dip.significance.toFixed(1)}σ in ${c.transitCount === 1 ? 'one transit' : `${c.transitCount} transits`}`;
  if (v.wobble || v.transit) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: {wobble} and {transit}: found{v.wobble && v.transit ? ' both ways' : v.transit ? ' by its transit' : ' by its wobble'}. Kepler was built to do this by its
          transits: years of watching from space, to tens of parts per million. Real stars make it harder than the figure does: their surfaces jitter by
          about 1 m/s, far more than Earth’s 9 cm/s, which is why no Earth twin has yet been found by its wobble.
        </p>
      ),
    };
  }
  const falls = c.transitCount === 0 ? 'No transit falls' : c.transitCount === 1 ? 'Only one transit falls' : `Only ${c.transitCount} transits fall`;
  const short = c.transitCount < TRANSITS_NEEDED ? ` ${falls} in that time, and a planet needs ${TRANSITS_NEEDED}: watch for longer.` : '';
  return {
    correct: false,
    feedback: (
      <p>
        {said}: {wobble} and {transit}. Neither reaches {DETECTION_SIGMA}σ.{short} Better precision helps as much as watching longer: halving the scatter is worth
        four times the nights.
      </p>
    ),
  };
}
