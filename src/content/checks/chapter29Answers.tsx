import { fitToData, GW150914_SOURCE, modelChirp } from '../../figures/gw150914';

/**
 * Answers for Chapter 29's interactive Check yourself question: in Figure
 * 29.3, find the chirp mass whose sweep matches GW150914. The model keeps
 * GW150914's mass ratio (30.6 ÷ 35.6) and its distance, and is fitted to both
 * detectors' data as the figure fits it; a chirp mass counts if the model's
 * mean overlap with the two is within an eighth of the best this model can
 * do (a unit test finds the best, 25 M☉ at the source, and checks the range
 * below on the slider's half-Sun steps). LIGO measured 28.6 M☉ at the source
 * with its full waveforms (GWTC-1), about 31 as the waves reached us.
 */

/** The chirp masses at the source (M☉) that the question accepts, from the model's own fits. */
export const CHIRP_RANGE = [21.5, 29.5] as const;
/** Where the model fits the data best, M☉ at the source. */
export const CHIRP_BEST = 25;
/** Where the slider starts, M☉ at the source. */
export const CHIRP_START = 15;
/** LIGO's chirp mass for GW150914 at the source, M☉, with its 90% interval (GWTC-1). */
export const LIGO_CHIRP = { median: 28.6, minus: 1.5, plus: 1.6 } as const;

const RATIO = GW150914_SOURCE.m2 / GW150914_SOURCE.m1;

/** The masses with this chirp mass and GW150914's mass ratio, M☉. */
export function massesFor(mc: number): { m1: number; m2: number } {
  const m1 = (mc * (1 + RATIO) ** 0.2) / RATIO ** 0.6;
  return { m1, m2: m1 * RATIO };
}

/** The model's mean overlap with Hanford's and Livingston's data for a chirp mass at the source (M☉). */
export function chirpFit(mc: number): number {
  const { m1, m2 } = massesFor(mc);
  const c = modelChirp(m1, m2);
  return (fitToData(c, 'H1').match.overlap + fitToData(c, 'L1').match.overlap) / 2;
}

export function checkChirp({ mc }: { mc: number }) {
  const fit = chirpFit(mc);
  const said = `A chirp mass of ${mc.toFixed(1)} M☉ at the source`;
  const seen = (mc * (1 + GW150914_SOURCE.z)).toFixed(1);
  if (mc >= CHIRP_RANGE[0] && mc <= CHIRP_RANGE[1]) {
    return {
      correct: true,
      feedback: (
        <p>
          {said} ({seen} M☉ as the waves reached us): right. The model’s sweep lines up with the data, with an overlap of {fit.toFixed(2)}{' '}
          averaged over the two detectors, close to the best it can do. LIGO, with waveforms calibrated to numerical relativity and both detectors
          analysed together, measured {LIGO_CHIRP.median} M☉ (from {(LIGO_CHIRP.median - LIGO_CHIRP.minus).toFixed(1)} to{' '}
          {(LIGO_CHIRP.median + LIGO_CHIRP.plus).toFixed(1)}): this model’s sketched merger pulls its best fit a little lower. Either way the
          sweep alone weighs the pair: about 30 Suns’ worth of chirp mass, far too much for neutron stars.
        </p>
      ),
    };
  }
  const tooLight = mc < CHIRP_RANGE[0];
  return {
    correct: false,
    feedback: (
      <p>
        {said}: the overlap is {fit.toFixed(2)}. {tooLight ? 'A lighter pair sweeps more slowly and merges at a higher pitch' : 'A heavier pair sweeps faster and merges at a lower pitch'} than the
        data show. In Figure 29.3, switch the spectrogram to Hanford’s data and watch where the model’s track falls on the arc as you change the
        masses.
      </p>
    ),
  };
}
