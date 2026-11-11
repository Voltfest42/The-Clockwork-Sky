import { rocheStream, ROCHE_START, streamMisses } from '../../figures/binaries28';

/**
 * Answers for Chapter 28's interactive Check yourself question: in Figure
 * 28.1, with the companion at its starting radius (0.08 of the separation),
 * set a mass ratio at which the stream from L1 misses the companion and forms
 * a disc. The stream is integrated, as in the figure; it misses for donors
 * lighter than about a third of the companion (q < 0.327, which a unit test
 * checks), so any such ratio counts.
 */

export const STREAM_MISS_BELOW = 0.327;
export const STREAM_START = ROCHE_START.q;

export function checkStream({ q }: { q: number }) {
  const said = `A mass ratio of ${q < 1 ? q.toFixed(2) : q.toFixed(1)}`;
  const s = rocheStream(q, ROCHE_START.r2);
  if (streamMisses(q)) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right. The stream swings past {s.rMin.toFixed(3)} separations from the companion’s centre, outside its radius of{' '}
          {ROCHE_START.r2}, so it misses and circles it, and the gas settles into a disc about {s.rCirc.toFixed(2)} separations out. The lighter
          the donor, the larger the companion’s lobe and the wider the stream swings: with this companion, any donor lighter than about a third of
          it makes a disc. Cataclysmic variables, with light donors and tiny white dwarfs, nearly always have one.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said}: the stream comes within {s.rMin.toFixed(3)} separations of the companion’s centre, inside its radius of {ROCHE_START.r2}, so it
        hits. In Figure 28.1, fill the donor’s lobe and watch where the stream goes as you make the donor lighter than its companion.
      </p>
    ),
  };
}
