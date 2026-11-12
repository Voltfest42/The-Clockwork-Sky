import { ringCheck } from '../../figures/collisions';

/**
 * Answers for Chapter 31's interactive Check yourself question: set up a
 * collision that makes a ring galaxy. The answer is judged by the same
 * engine as Figure 31.1: a companion of the chosen mass passes the main
 * galaxy fast, on an open orbit, at the chosen distance from its centre, with
 * the main disc at the chosen tilt to the orbit (90°: the companion's path at
 * its closest approach runs along the disc's axis), and the answer is right if
 * a ring spreads through the disc (`ringCheck`).
 */

export interface RingSetup {
  /** The companion's mass as a share of the main galaxy's. */
  massRatio: number;
  /** kpc. */
  pericentre: number;
  /** Degrees. */
  tilt: number;
}

export const RING_START: RingSetup = { massRatio: 0.3, pericentre: 30, tilt: 0 };

/** Runs are kept: the question re-checks on every render. */
const runs = new Map<string, ReturnType<typeof ringCheck>>();

function run(setup: RingSetup) {
  const key = `${setup.massRatio}|${setup.pericentre}|${setup.tilt}`;
  let result = runs.get(key);
  if (!result) {
    result = ringCheck(setup);
    runs.set(key, result);
  }
  return result;
}

export function checkRing(setup: RingSetup) {
  const said = `A companion ${Math.round(setup.massRatio * 100)}% as heavy, passing ${setup.pericentre} kpc from the centre, with the disc tilted ${setup.tilt}° to its orbit`;
  const { ring, best, at } = run(setup);
  if (ring) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right, a ring {Math.round(2 * best.radius)} kpc across spreads through the disc, {Math.round(at)} million years after the companion
          passes. Plunging through the middle, the companion pulls every star inwards at once; they fall in together, overshoot and swing out
          again, and their outward swings pile up into a ring that travels out like a ripple from a stone dropped in a pond. The Cartwheel galaxy
          is the famous example.
        </p>
      ),
    };
  }
  const hint =
    setup.pericentre > 4
      ? 'The companion has to pass through the middle of the disc: bring the closest approach down to a few kiloparsecs.'
      : setup.massRatio < 0.15
        ? 'The companion is too light to pull the disc’s stars far: make it heavier.'
        : setup.tilt < 45
          ? 'The companion is moving too nearly in the disc’s own plane: tilt the disc so the companion plunges through it face on.'
          : 'Close: the disc shows only a weak wave. Make the companion a little heavier, or aim it straighter through the middle.';
  return { correct: false, feedback: <p>{said} makes no ring. {hint}</p> };
}
