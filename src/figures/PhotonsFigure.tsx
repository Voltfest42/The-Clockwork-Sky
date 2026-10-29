import { useMemo, useRef, useState, type ReactNode } from 'react';
import { hash32 } from '../core/random';
import { formatDuration } from '../core/time/duration';
import { BUCKETS, eyesWorth } from '../data/telescopes';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { onSky } from './sky/legend';
import { describeExposure, Exposure, formatCount, GRID, photonRate, TARGETS, total } from './photons';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Counting photons (Figure 10.2): a star's photons landing on a grid of
 * pixels at real rates. Choose the bucket, the star and the exposure; the
 * time-lapse shows the image building up, grainy at first, as the noise falls
 * as 1/√N.
 */

const CELL = 12;
const SIZE = GRID * CELL;
const START = { bucket: 'eye', target: 'limit', logT: Math.log10(0.1) };
const LOG_T_MIN = -3;
const LOG_T_MAX = Math.log10(360_000);
const LAPSE_SECONDS = 4;

export function PhotonsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [bucketId, setBucketId] = useState(START.bucket);
  const [targetId, setTargetId] = useState<string>(START.target);
  const [logT, setLogT] = useState(START.logT);
  const [seed, setSeed] = useState(1);
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);

  const bucket = BUCKETS.find((b) => b.id === bucketId)!;
  const target = TARGETS.find((t) => t.id === targetId)!;
  const seconds = 10 ** logT;
  const rate = photonRate(target.V, bucket);
  const expected = rate * seconds;
  const exposure = useMemo(() => new Exposure(expected, seed), [expected, seed]);
  const counts = useMemo(() => exposure.countsAt(progress), [exposure, progress]);
  const counted = total(counts);
  let peak = 0;
  for (const c of counts) peak = Math.max(peak, c);

  useAnimationFrame(playing && onScreen, (dt) => {
    setProgress((p) => {
      const next = Math.min(1, p + dt / LAPSE_SECONDS);
      if (next >= 1) setPlaying(false);
      return next;
    });
  });

  const reset = () => {
    setBucketId(START.bucket);
    setTargetId(START.target);
    setLogT(START.logT);
    setSeed(1);
    setProgress(1);
    setPlaying(false);
  };
  const changed = () => {
    setProgress(1);
    setPlaying(false);
  };
  const play = () => {
    setSeed((s) => s + 1);
    if (reduced) {
      setProgress(1);
      return;
    }
    setProgress(0);
    setPlaying(true);
  };

  const elapsed = seconds * progress;
  const caption = playing
    ? `Exposing: ${formatDuration(elapsed)} of ${formatDuration(seconds)}, ${counted.toLocaleString('en-GB')} photons so far.`
    : describeExposure(expected, counted, rate, seconds, target.name, bucket.name);

  // Single photons, drawn as dots while there are few of them.
  const dots: { x: number; y: number }[] = [];
  if (counted <= 400) {
    counts.forEach((c, p) => {
      for (let k = 0; k < c; k++) {
        const h = hash32(p * 7919 + k * 104_729 + seed * 31);
        dots.push({ x: (p % GRID) * CELL + 2 + ((h & 0xff) / 255) * (CELL - 4), y: Math.floor(p / GRID) * CELL + 2 + (((h >>> 8) & 0xff) / 255) * (CELL - 4) });
      }
    });
  }

  return (
    <Figure
      number={number}
      title="Counting photons"
      description="A star’s light arriving as single photons on a camera’s grid of pixels, at the real rate for the chosen star and telescope, from your eye to the Extremely Large Telescope. A short exposure catches a few scattered photons; a long one, a smooth image. The randomness, the noise, shrinks compared with the signal as the square root of the number of photons."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a single photon', symbol: onSky(<circle r="2.2" fill="#fff6d8" />) },
        { label: 'a pixel: the brighter, the more photons it caught', symbol: onSky(<rect x="-6" y="-6" width="12" height="12" fill="#9aa8c4" />) },
      ]}
      simplified={
        <p>
          The detector is perfect: it catches every photon that reaches it, adds no noise of its own, and sees no sky glow. Real cameras miss
          some photons and add a little noise; the sky’s own glow sets the faintest limit from the ground. Photons are counted in visible
          (V-band) light only, and the star’s image is spread over a few pixels as if by a slightly blurred telescope.
        </p>
      }
    >
      <div ref={ref}>
        <div className={styles.controls}>
          <div className={styles.toggles} role="group" aria-label="Light bucket">
            <span className={styles.togglesLabel}>Bucket:</span>
            {BUCKETS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={styles.toggle}
                aria-pressed={b.id === bucketId}
                onClick={() => {
                  setBucketId(b.id);
                  changed();
                }}
              >
                {b.name.replace(/^(a|your|the) /, '')}
              </button>
            ))}
          </div>
          <label className={figureStyles.inputLabel}>
            Star
            <select
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                changed();
              }}
            >
              {TARGETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (magnitude {t.V < 0 ? `−${-t.V}` : t.V})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.slider}>
            Exposure
            <input
              type="range"
              min={LOG_T_MIN}
              max={LOG_T_MAX}
              step={0.01}
              value={logT}
              onChange={(e) => {
                setLogT(Number(e.target.value));
                changed();
              }}
              aria-valuetext={formatDuration(seconds)}
            />
            <output>{formatDuration(seconds)}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} onClick={play} disabled={playing}>
              ▶ Take the exposure
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => setSeed((s) => s + 1)} disabled={playing}>
              Same again (new photons)
            </button>
          </div>
        </div>
        <div className={styles.split} style={{ alignItems: 'center' }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={seasonStyles.svg} style={{ maxWidth: 320, justifySelf: 'center' }} role="img" aria-label={`The camera’s ${GRID} by ${GRID} pixels: ${counted.toLocaleString('en-GB')} photons caught`}>
            <rect width={SIZE} height={SIZE} fill="#070b16" />
            {peak > 0 &&
              Array.from(counts, (c, p) =>
                c > 0 ? (
                  <rect
                    key={p}
                    x={(p % GRID) * CELL}
                    y={Math.floor(p / GRID) * CELL}
                    width={CELL}
                    height={CELL}
                    fill="#c8d4f0"
                    opacity={counted <= 400 ? 0.12 + 0.25 * Math.sqrt(c / peak) : Math.sqrt(c / peak)}
                  />
                ) : null,
              )}
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={1.3} fill="#fff6d8" />
            ))}
          </svg>
          <div className={styles.readout} style={{ flexDirection: 'column', gap: 4 }}>
            <span>
              Photons a second: <b>{formatCount(rate)}</b>
            </span>
            <span>
              Caught: <b>{counted.toLocaleString('en-GB')}</b>
            </span>
            <span>
              Noise, √N: <b>{counted > 0 ? `${formatCount(Math.sqrt(counted))} (${(100 / Math.sqrt(counted)).toPrecision(2)}% of the signal)` : '—'}</b>
            </span>
            <span>
              {bucket.name.replace(/^./, (c) => c.toUpperCase())}: <b>{bucket.aperture >= 1 ? `${bucket.aperture} m` : `${Math.round(bucket.aperture * 1000)} mm`}</b> across, as much light as{' '}
              <b>{formatCount(eyesWorth(bucket))}</b> {eyesWorth(bucket) < 1.5 ? 'eye' : 'eyes'}
            </span>
          </div>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
