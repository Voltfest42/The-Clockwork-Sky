import { useId, useMemo } from 'react';
import { JUPITER_A, orbitsPerPlanetOrbit } from '../../core/orbits/resonance';
import { beltBins } from '../../figures/asteroidBelt';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkThreeToOne } from './chapter8Answers';
import styles from './checks.module.css';

const isDistance = (value: unknown): value is number => typeof value === 'number' && value >= 2 && value <= 3.4;

export function ThreeToOne() {
  return (
    <InteractiveQuestion
      id="three-to-one"
      prompt="Move the marker to where an asteroid would go round the Sun exactly three times for each of Jupiter’s orbits."
      initial={2.2}
      isState={isDistance}
      check={(a) => checkThreeToOne(a)}
    >
      {(a, setA) => <Distance a={a} onA={setA} />}
    </InteractiveQuestion>
  );
}

const FROM = 2;
const TO = 3.4;

function Distance({ a, onA }: { a: number; onA: (a: number) => void }) {
  const id = useId();
  return (
    <div style={{ maxWidth: 420 }}>
      <Bars a={a} />
      <div className={styles.guess}>
        <label htmlFor={id}>Distance from the Sun</label>
        <input
          id={id}
          type="range"
          min={FROM}
          max={TO}
          step={0.01}
          value={a}
          onChange={(e) => onA(Number(e.target.value))}
          aria-valuetext={`${a.toFixed(2)} AU: ${orbitsPerPlanetOrbit(a, JUPITER_A).toFixed(2)} laps for each of Jupiter’s`}
        />
        <output htmlFor={id}>{a.toFixed(2)} AU</output>
      </div>
    </div>
  );
}

/** The belt's histogram, small, with the marker. */
function Bars({ a }: { a: number }) {
  const bins = useMemo(() => beltBins().filter((b) => b.a0 >= FROM && b.a1 <= TO), []);
  const most = Math.max(...bins.map((b) => b.count));
  const x = (v: number) => 10 + ((v - FROM) / (TO - FROM)) * 380;
  return (
    <svg viewBox="0 0 400 110" width="100%" style={{ maxWidth: 400, display: 'block' }} aria-hidden="true">
      {bins.map((b) => (
        <rect key={b.a0} x={x(b.a0)} y={100 - (90 * b.count) / most} width={380 / bins.length + 0.3} height={(90 * b.count) / most} fill="#8a9cc8" />
      ))}
      <line x1={x(a)} x2={x(a)} y1={4} y2={104} stroke="var(--text)" strokeWidth="2" />
      <line x1={10} x2={390} y1={100.5} y2={100.5} stroke="var(--text-muted)" />
    </svg>
  );
}
