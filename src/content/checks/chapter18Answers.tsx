import { fateBoundary, fateOf, FATE_NAMES } from '../../core/stellar/lives';

/** Answers for Chapter 18's interactive Check yourself question: the lightest star that leaves a neutron star, in Figure 18.4 (the Sun's make-up, SSE's winds). */

const isCollapse = (kind: string) => kind === 'neutron-star' || kind === 'black-hole';

let boundary: number | null = null;
/** The lightest initial mass (M☉) that ends as a neutron star, at Z = 0.02 with SSE's own winds: about 8.0. */
export function lightestNeutronStar(): number {
  boundary ??= fateBoundary(5, 15, (f) => isCollapse(f.kind));
  return boundary;
}

/** Accepted: from the boundary to 5% above it. */
export const NS_TOLERANCE = 0.05;

export function checkLightestNeutronStar(mass: number) {
  const said = `${mass.toFixed(1)} M☉`;
  const fate = fateOf(mass);
  const edge = lightestNeutronStar();
  if (!isCollapse(fate.kind)) {
    return {
      correct: false,
      feedback: (
        <p>
          {said}: it ends as {FATE_NAMES[fate.kind] === 'Nothing left' ? 'nothing' : `a ${FATE_NAMES[fate.kind].toLowerCase()}`} of {fate.remnant.toFixed(2)} M☉. Its core never gets
          heavy enough to collapse. Make it heavier.
        </p>
      ),
    };
  }
  if (mass <= edge * (1 + NS_TOLERANCE)) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. In the engine, stars from about {edge.toFixed(1)} Suns end in a supernova and leave a neutron star; just below, an oxygen–neon white dwarf
          close to the 1.4-Sun limit. Real boundaries are uncertain by a Sun or two, and some stars near the edge may collapse when their cores capture electrons.
        </p>
      ),
    };
  }
  return { correct: false, feedback: <p>{said}: it leaves a {FATE_NAMES[fate.kind].toLowerCase()}, but so would a lighter star. Take mass away until it only just does.</p> };
}
