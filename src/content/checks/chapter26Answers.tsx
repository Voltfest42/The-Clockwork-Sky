import { failingAt, maxMass } from '../../figures/neutronStars';
import { EOS_FITS } from '../../data/eos';
import { HEAVIEST_NEUTRON_STAR } from '../../data/records';

/**
 * Answers for Chapter 26's interactive Check yourself question: in Figure
 * 26.2, tick every equation of state that can't hold up a neutron star as
 * heavy as PSR J0952−0607 (2.35 M☉). The answer comes from the TOV solver
 * itself (a unit test keeps it in step): every equation of state whose
 * heaviest star is lighter than 2.35 M☉.
 */

export const HEAVY_MASS = HEAVIEST_NEUTRON_STAR.mass;

export function checkTooSoft({ ticked }: { ticked: readonly string[] }) {
  const failing = failingAt(HEAVY_MASS);
  const missed = failing.filter((id) => !ticked.includes(id));
  const wrong = ticked.filter((id) => !failing.includes(id));
  if (missed.length === 0 && wrong.length === 0) {
    return {
      correct: true,
      feedback: (
        <p>
          Right: {failing.length} of the ten can’t. Only {EOS_FITS.filter((f) => !failing.includes(f.id)).map((f) => `${f.name} (${maxMass(f.id).toFixed(2)} M☉)`).join(' and ')} reach{' '}
          {HEAVY_MASS} M☉. If PSR J0952−0607’s mass holds up, the matter in neutron stars is stiffer than most of these models: its pressure must
          rise steeply as it is squeezed. Its error is ±0.17 M☉, though, so at the low end APR4 and ENG would survive too.
        </p>
      ),
    };
  }
  const name = (id: string) => EOS_FITS.find((f) => f.id === id)?.name ?? id;
  return {
    correct: false,
    feedback: (
      <p>
        {wrong.length > 0 && <>{wrong.map(name).join(' and ')} can hold it up: {wrong.map((id) => `${name(id)}’s heaviest star is ${maxMass(id).toFixed(2)} M☉`).join(', ')}. </>}
        {missed.length > 0 && <>{missed.length === 1 ? 'One more can’t' : `${missed.length} more can’t`}. </>}
        In Figure 26.2, pick each equation of state and press <b>The heaviest star</b>: does it reach the band at {HEAVY_MASS} M☉?
      </p>
    ),
  };
}
