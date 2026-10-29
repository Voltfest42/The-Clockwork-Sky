import { useId, useMemo } from 'react';
import { lightCurvePoints } from '../../figures/binaries';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { LightCurve } from '../../viz/lightCurve/LightCurve';
import { checkEclipseStart, TILT_PAIR } from './chapter14Answers';
import styles from './checks.module.css';

const isTilt = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 90;

export function EclipseStart() {
  return (
    <InteractiveQuestion
      id="eclipse-start"
      prompt="Figure 14.3’s own pair of stars, three days round each other. Tilt the orbit until the stars just begin to eclipse."
      initial={70}
      isState={isTilt}
      check={(t) => checkEclipseStart(t)}
    >
      {(tilt, set) => <TiltPicker tilt={tilt} onTilt={set} />}
    </InteractiveQuestion>
  );
}

function TiltPicker({ tilt, onTilt }: { tilt: number; onTilt: (t: number) => void }) {
  const id = useId();
  const curve = useMemo(() => lightCurvePoints({ ...TILT_PAIR, i: tilt }, 400), [tilt]);
  return (
    <div style={{ maxWidth: 480 }}>
      <LightCurve
        xMin={0}
        xMax={1}
        yMin={0.5}
        yMax={1.02}
        xLabel="Phase"
        yLabel="Light"
        formatX={(x) => x.toFixed(1)}
        formatY={(y) => `${Math.round(y * 100)}%`}
        curves={[{ name: 'The pair’s light', color: 'var(--series-1)', points: curve }]}
        ariaLabel={`The pair’s light curve at a tilt of ${tilt.toFixed(1)}°`}
        height={170}
        hideLegend
      />
      <div className={styles.guess}>
        <label htmlFor={id}>Tilt</label>
        <input id={id} type="range" min={60} max={90} step={0.1} value={tilt} onChange={(e) => onTilt(Number(e.target.value))} aria-valuetext={`${tilt.toFixed(1)}° from face-on`} />
        <output htmlFor={id}>{tilt.toFixed(1)}°</output>
      </div>
    </div>
  );
}
