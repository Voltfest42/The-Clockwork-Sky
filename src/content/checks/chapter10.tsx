import { useEffect, useId, useRef, useState } from 'react';
import { blurWidth, formatAperture, pairToday, renderPair } from '../../figures/splitStars';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkEpsilonLyrae, EPSILON_1, epsilonOptics } from './chapter10Answers';
import styles from './checks.module.css';

const isAperture = (value: unknown): value is number => typeof value === 'number' && value >= 0.005 && value <= 1;
const N = 120;

export function SplitEpsilonLyrae() {
  const [now] = useState(() => Date.now());
  return (
    <InteractiveQuestion
      id="split-epsilon-lyrae"
      prompt="With no air in the way, in green light, find the smallest telescope that splits ε¹ Lyrae into two stars."
      initial={0.02}
      isState={isAperture}
      check={(d) => checkEpsilonLyrae(d, now)}
    >
      {(d, setD) => <Telescope aperture={d} onAperture={setD} now={now} />}
    </InteractiveQuestion>
  );
}

function Telescope({ aperture, onAperture, now }: { aperture: number; onAperture: (d: number) => void; now: number }) {
  const id = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const optics = epsilonOptics(aperture);
    const layout = pairToday(EPSILON_1, now);
    const fov = Math.max(3 * layout.separation, 6 * blurWidth(optics));
    const img = renderPair(optics, layout, fov, N);
    let max = 0;
    for (const v of img) max = Math.max(max, v);
    const data = ctx.createImageData(N, N);
    for (let p = 0; p < img.length; p++) {
      const g = Math.max(0, Math.min(1, (Math.log10(Math.max(img[p], 1e-30) / max) + 2.5) / 2.5)) ** 1.4;
      data.data.set([7 + g * 248, 11 + g * 241, 22 + g * 218, 255], 4 * p);
    }
    ctx.putImageData(data, 0, 0);
  }, [aperture, now]);
  return (
    <div style={{ maxWidth: 420 }}>
      <canvas ref={canvas} width={N} height={N} role="img" aria-label={`ε¹ Lyrae through a ${formatAperture(aperture)} telescope`} style={{ width: 180, height: 180, display: 'block', borderRadius: 8 }} />
      <div className={styles.guess}>
        <label htmlFor={id}>Telescope width</label>
        <input
          id={id}
          type="range"
          min={-2.3}
          max={0}
          step={0.002}
          value={Math.log10(aperture)}
          onChange={(e) => onAperture(Math.round(10 ** Number(e.target.value) * 10_000) / 10_000)}
          aria-valuetext={formatAperture(aperture)}
        />
        <output htmlFor={id}>{formatAperture(aperture)}</output>
      </div>
    </div>
  );
}
