import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkLightestNeutronStar } from './chapter18Answers';
import styles from './checks.module.css';

const isMass = (value: unknown): value is number => typeof value === 'number' && value >= 3 && value <= 20;

export function LightestNeutronStar() {
  return (
    <InteractiveQuestion
      id="lightest-neutron-star"
      prompt="Use Figure 18.4, with the Sun’s make-up and SSE’s own winds: what is the lightest star that leaves a neutron star?"
      initial={5}
      isState={isMass}
      check={(m) => checkLightestNeutronStar(m)}
    >
      {(mass, set) => <MassPicker mass={mass} onMass={set} />}
    </InteractiveQuestion>
  );
}

function MassPicker({ mass, onMass }: { mass: number; onMass: (m: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Mass at birth</label>
      <input id={id} type="range" min={3} max={20} step={0.1} value={mass} onChange={(e) => onMass(Number(e.target.value))} aria-valuetext={`${mass.toFixed(1)} solar masses`} />
      <output htmlFor={id}>{mass.toFixed(1)} M☉</output>
    </div>
  );
}
