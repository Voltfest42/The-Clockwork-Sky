import { useId } from 'react';
import { PinsAndString } from '../../figures/EllipseFigure';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkHalley } from './chapter6Answers';
import styles from './checks.module.css';

const isEccentricity = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value < 1;

export function HalleyShape() {
  return (
    <InteractiveQuestion
      id="halley-shape"
      prompt="Set the eccentricity so that the orbit has the shape of Halley’s comet’s."
      initial={0.3}
      isState={isEccentricity}
      check={(e) => checkHalley(e)}
    >
      {(e, setE) => <Eccentricity e={e} onE={setE} />}
    </InteractiveQuestion>
  );
}

function Eccentricity({ e, onE }: { e: number; onE: (e: number) => void }) {
  const id = useId();
  return (
    <div style={{ maxWidth: 420 }}>
      <PinsAndString e={e} t={Math.PI / 3} drawn={2 * Math.PI} />
      <div className={styles.guess}>
        <label htmlFor={id}>Eccentricity</label>
        <input id={id} type="range" min={0} max={0.99} step={0.001} value={e} onChange={(ev) => onE(Number(ev.target.value))} aria-valuetext={e.toFixed(3)} />
        <output htmlFor={id}>{e.toFixed(3)}</output>
      </div>
    </div>
  );
}
