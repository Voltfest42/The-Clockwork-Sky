import { useId, useState, type ReactNode } from 'react';
import { formatDms } from '../core/math/angles';
import { angularSize, smallAngle, smallAngleError } from '../core/math/angularSize';
import { formatSignificant } from '../core/math/scientific';
import { formatLength } from '../core/scale/format';
import { ARCMIN, DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { ARM, DISTANCE_RANGE, EXAMPLES, formatAngle, SIZE_RANGE } from './angles';
import figureStyles from './figures.module.css';
import styles from './AnglesFigure.module.css';

export function AnglesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [size, setSize] = useState(EXAMPLES[3].size);
  const [distance, setDistance] = useState(EXAMPLES[3].distance);
  const exampleId = useId();
  const sizeId = useId();
  const distanceId = useId();
  const example = EXAMPLES.findIndex((e) => e.size === size && e.distance === distance);

  const exact = angularSize(size, distance);
  const rule = smallAngle(size, distance);
  const error = smallAngleError(size, distance);
  const fingers = exact / angularSize(0.01, ARM);
  const moons = exact / angularSize(EXAMPLES[3].size, EXAMPLES[3].distance);
  // Below 4° the drawing would be a sliver, so it's drawn wider and tagged "not to scale".
  const exaggerated = exact < 4 * DEG;

  const reset = () => {
    setSize(EXAMPLES[3].size);
    setDistance(EXAMPLES[3].distance);
  };

  return (
    <Figure
      number={number}
      title="How big does it look?"
      description="A diagram of an eye looking at an object of some size at some distance, with the angle it spans. Examples run from your little finger at arm’s length (about 1°) to the full Moon and the Sun (each about half a degree), and the figure compares the exact angle with the small-angle rule: size divided by distance, in radians."
      height={580}
      tryThis={tryThis}
      onReset={reset}
      notToScale={exaggerated}
      legend={[
        { label: 'your eye', symbol: <circle r="5" fill="var(--text)" /> },
        { label: 'the object, seen edge on', symbol: <rect x="-2" y="-8" width="4" height="16" fill="var(--series-2)" /> },
        { label: 'the angle it spans', symbol: <path d="M-8 6 A 14 14 0 0 1 6 -8" fill="none" stroke="var(--series-1)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The drawing squeezes the distance to fit, so small angles are drawn wider than they are; the numbers are exact. Arm’s length is taken as 57
          cm, at which 1 cm spans 1°. Real arms and fingers vary, but they grow together, so the rule works for most people.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <label htmlFor={exampleId} className={figureStyles.inputLabel}>
          Example:
          <select
            id={exampleId}
            className={styles.select}
            value={example}
            onChange={(e) => {
              const chosen = EXAMPLES[Number(e.target.value)];
              if (!chosen) return;
              setSize(chosen.size);
              setDistance(chosen.distance);
            }}
          >
            {example < 0 && <option value={-1}>Your own</option>}
            {EXAMPLES.map((e, i) => (
              <option key={e.name} value={i}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Diagram exact={exact} exaggerated={exaggerated} />

      <div className={styles.sliders}>
        <label htmlFor={sizeId}>Size</label>
        <input
          id={sizeId}
          type="range"
          min={SIZE_RANGE[0] * 100}
          max={SIZE_RANGE[1] * 100}
          value={Math.round(Math.log10(size) * 100)}
          onChange={(e) => setSize(Number((10 ** (Number(e.target.value) / 100)).toPrecision(3)))}
          aria-valuetext={formatLength(size)}
        />
        <output htmlFor={sizeId}>{formatLength(size)}</output>
        <label htmlFor={distanceId}>Distance</label>
        <input
          id={distanceId}
          type="range"
          min={DISTANCE_RANGE[0] * 100}
          max={DISTANCE_RANGE[1] * 100}
          value={Math.round(Math.log10(distance) * 100)}
          onChange={(e) => setDistance(Number((10 ** (Number(e.target.value) / 100)).toPrecision(3)))}
          aria-valuetext={formatLength(distance)}
        />
        <output htmlFor={distanceId}>{formatLength(distance)}</output>
      </div>

      <dl className={styles.results}>
        <div>
          <dt>Angle</dt>
          <dd>
            <b>{formatAngle(exact)}</b>
            <span className={styles.sub}>{formatDms(exact, exact < ARCMIN ? 1 : 0).replace(/^\+/, '')}</span>
          </dd>
        </div>
        <div>
          <dt>Small-angle rule: size ÷ distance</dt>
          <dd>
            {formatSignificant(rule, 3)} radians = {formatAngle(rule)}
            <span className={styles.sub}>
              {Math.abs(error) < 0.0005 ? 'spot on, to 0.05%' : `${formatSignificant(Math.abs(error) * 100, 2)}% too ${error > 0 ? 'big' : 'small'}`}
            </span>
          </dd>
        </div>
        <div>
          <dt>In little fingers at arm’s length</dt>
          <dd>{formatSignificant(fingers, 2)}</dd>
        </div>
        <div>
          <dt>In full Moons</dt>
          <dd>{formatSignificant(moons, 2)}</dd>
        </div>
      </dl>

      <Caption>
        {example >= 0 ? `${EXAMPLES[example].name}: ` : ''}
        {formatLength(size)} across, {formatLength(distance)} away, spans {formatAngle(exact)}
        {exact >= 180 * DEG * 0.999 ? ' (you’re inside it!)' : ''}.{' '}
        {Math.abs(error) < 0.01
          ? 'The small-angle rule, size ÷ distance in radians, gets it right to within 1%.'
          : 'This angle is too big for the small-angle rule: it overestimates by more than 1%.'}
      </Caption>
    </Figure>
  );
}

/** The eye, the object and the angle between the two lines of sight. */
function Diagram({ exact, exaggerated }: { exact: number; exaggerated: boolean }) {
  const W = 640;
  const H = 200;
  const eye: [number, number] = [40, H / 2];
  const shown = Math.min(Math.max(exact, 4 * DEG), 150 * DEG);
  const half = shown / 2;
  // The object sits where it fits: farther away for small angles.
  const reach = Math.min(W - 90, (H / 2 - 16) / Math.tan(half));
  const objectX = eye[0] + Math.max(60, reach);
  const top = eye[1] - Math.tan(half) * (objectX - eye[0]);
  const bottom = eye[1] + Math.tan(half) * (objectX - eye[0]);
  const arcR = Math.min(70, (objectX - eye[0]) * 0.5);
  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Lines of sight from an eye to the top and bottom of the object, ${formatAngle(exact)} apart${exaggerated ? ', drawn wider than they really are' : ''}.`}
    >
      <line x1={eye[0]} y1={eye[1]} x2={objectX} y2={top} className={styles.sight} />
      <line x1={eye[0]} y1={eye[1]} x2={objectX} y2={bottom} className={styles.sight} />
      <line x1={eye[0]} y1={eye[1]} x2={objectX} y2={eye[1]} className={styles.distance} />
      <path
        d={`M${eye[0] + arcR * Math.cos(half)} ${eye[1] - arcR * Math.sin(half)} A ${arcR} ${arcR} 0 0 1 ${eye[0] + arcR * Math.cos(half)} ${eye[1] + arcR * Math.sin(half)}`}
        className={styles.arc}
      />
      <rect x={objectX - 3} y={top} width={6} height={bottom - top} className={styles.object} />
      <circle cx={eye[0]} cy={eye[1]} r={7} className={styles.eye} />
      <text x={eye[0] + arcR + 8} y={eye[1] - 8} className={styles.text}>
        {formatAngle(exact)}
      </text>
      <text x={(eye[0] + objectX) / 2} y={eye[1] + 18} textAnchor="middle" className={styles.muted}>
        distance
      </text>
      <text x={objectX + 10} y={eye[1] + 4} className={styles.muted}>
        size
      </text>
    </svg>
  );
}
