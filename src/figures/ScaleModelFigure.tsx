import { useId, useState, type ReactNode } from 'react';
import { AU } from '../core/constants';
import { MEAN_ORBITS, PLANETS, type PlanetName } from '../core/ephemeris/meanLongitude';
import { formatGrouped, formatInWords, formatSignificant } from '../core/math/scientific';
import { formatLength } from '../core/scale/format';
import { modelScale } from '../core/scale/model';
import { LIGHT_YEAR } from '../core/units';
import { SUN_MODELS } from '../data/everyday';
import { BODY_NAMES, DIAMETERS_KM, MOON_DISTANCE_KM, STARS } from '../data/scale';
import { ContentTable } from '../site/content/blocks';
import { Caption, Figure } from '../viz/Figure';
import { describeModelDistance, describeModelSize, roundRealKilometres } from './scaleModel';
import figureStyles from './figures.module.css';
import styles from './ScaleModelFigure.module.css';

const SUN = DIAMETERS_KM.sun * 1000;
const PROXIMA = STARS.find((s) => s.id === 'proxima')!;
const PROXIMA_DIAMETER = PROXIMA.radiusSun! * SUN;
const PROXIMA_DISTANCE = PROXIMA.distanceLy * LIGHT_YEAR;
const DEFAULT_MODEL = 1; // the grapefruit

export function ScaleModelFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [modelSun, setModelSun] = useState(SUN_MODELS[DEFAULT_MODEL].size);
  const [custom, setCustom] = useState('');
  const customId = useId();
  const scale = modelScale(SUN, modelSun);
  const preset = SUN_MODELS.find((m) => m.size === modelSun);

  const reset = () => {
    setModelSun(SUN_MODELS[DEFAULT_MODEL].size);
    setCustom('');
  };

  const onCustom = (text: string) => {
    setCustom(text);
    const cm = Number(text);
    if (Number.isFinite(cm) && cm >= 0.1 && cm <= 100_000) setModelSun(cm / 100);
  };
  const customInvalid = custom !== '' && !(Number(custom) >= 0.1 && Number(custom) <= 100_000);

  const neptune = MEAN_ORBITS.neptune.a * AU * scale;
  const proxima = PROXIMA_DISTANCE * scale;
  const realKm = roundRealKilometres(scale);
  const sunName = preset ? preset.name : `a ball ${formatLength(modelSun)} across`;

  return (
    <Figure
      number={number}
      title="Build a scale model of the Solar System"
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Sun', symbol: <circle r="8" fill="var(--sun)" stroke="var(--sun-edge)" /> },
        { label: 'a planet', symbol: <circle r="4" fill="var(--series-1)" /> },
        { label: 'scale bar of the model', symbol: <path d="M-9 3 V-3 M-9 0 H9 M9 3 V-3" stroke="var(--text)" strokeWidth="1.5" fill="none" /> },
      ]}
      simplified={
        <p>
          Every planet is at its average distance from the Sun, all in a line, which they never are at once. Diameters are at the equator. The
          everyday objects are typical sizes, and the city-to-city distances are straight lines across the globe. The dots in the distance strip are
          drawn far bigger than the model planets would be.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={styles.label} id={`sun-${number}`}>
          The Sun is:
        </span>
        <div className={figureStyles.segmented} role="group" aria-labelledby={`sun-${number}`}>
          {SUN_MODELS.map((m) => (
            <button
              key={m.name}
              type="button"
              aria-pressed={modelSun === m.size}
              onClick={() => {
                setModelSun(m.size);
                setCustom('');
              }}
            >
              {m.name.replace(/^an? /, '')} ({formatLength(m.size)})
            </button>
          ))}
        </div>
        <label htmlFor={customId} className={figureStyles.inputLabel}>
          or your own size:
          <input
            id={customId}
            className={styles.number}
            type="number"
            inputMode="decimal"
            min={0.1}
            max={100000}
            step="any"
            placeholder="cm"
            value={custom}
            aria-invalid={customInvalid}
            aria-describedby={`${customId}-unit`}
            onChange={(e) => onCustom(e.target.value)}
          />
          <span id={`${customId}-unit`}>cm across</span>
        </label>
      </div>

      <p className={styles.scale}>
        Scale: 1 to {formatScaleNumber(1 / scale)}. Every {formatInWords(realKm)} km in space is {formatLength(realKm * 1000 * scale)} in the model.
      </p>

      <SizesStrip />
      <DistanceStrip scale={scale} />

      <ContentTable>
        <thead>
          <tr>
            <th scope="col">Object</th>
            <th scope="col">Real size</th>
            <th scope="col">In the model</th>
            <th scope="col">Distance in the model</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{BODY_NAMES.sun}</th>
            <td>{formatGrouped(DIAMETERS_KM.sun)} km</td>
            <td>{describeModelSize(modelSun)}</td>
            <td>at the centre</td>
          </tr>
          {PLANETS.map((planet: PlanetName) => (
            <tr key={planet}>
              <th scope="row">{BODY_NAMES[planet]}</th>
              <td>{formatGrouped(DIAMETERS_KM[planet])} km</td>
              <td>{describeModelSize(DIAMETERS_KM[planet] * 1000 * scale)}</td>
              <td>{describeModelDistance(MEAN_ORBITS[planet].a * AU * scale, 'the Sun')}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{BODY_NAMES.moon}</th>
            <td>{formatGrouped(DIAMETERS_KM.moon)} km</td>
            <td>{describeModelSize(DIAMETERS_KM.moon * 1000 * scale)}</td>
            <td>{describeModelDistance(MOON_DISTANCE_KM * 1000 * scale, 'Earth')}</td>
          </tr>
          <tr>
            <th scope="row">{PROXIMA.name}</th>
            <td>{formatGrouped(Number((PROXIMA_DIAMETER / 1000).toPrecision(3)))} km</td>
            <td>{describeModelSize(PROXIMA_DIAMETER * scale)}</td>
            <td>{describeModelDistance(proxima, 'the Sun')}</td>
          </tr>
        </tbody>
      </ContentTable>

      <Caption>
        With the Sun as {sunName}, Earth is {formatLength(DIAMETERS_KM.earth * 1000 * scale)} across and {formatLength(AU * scale)} away. Neptune is{' '}
        {formatLength(neptune)} out. The nearest star, Proxima Centauri, is {formatLength(proxima)} away:{' '}
        about {formatSignificant(proxima / neptune, 2)} times farther than Neptune. Almost everything in between is empty.
      </Caption>
    </Figure>
  );
}

/** "14 billion" for a scale number. */
function formatScaleNumber(x: number): string {
  if (x >= 1e9) return `${formatSignificant(x / 1e9, 2)} billion`;
  if (x >= 1e6) return `${formatSignificant(x / 1e6, 2)} million`;
  return formatGrouped(Math.round(x));
}

const W = 640;

/** The Sun's edge and the planets beside it, all to the same scale. */
function SizesStrip() {
  const sunR = 300;
  const k = sunR / (DIAMETERS_KM.sun / 2);
  const left = 92;
  const xs = [128, 160, 200, 236, 330, 460, 548, 610];
  return (
    <div className={styles.strip}>
      <svg
        viewBox={`0 0 ${W} 170`}
        role="img"
        aria-label="The edge of the Sun and the eight planets beside it, drawn to the same scale. Jupiter is a tenth of the Sun's width, Earth a hundredth."
      >
        <circle cx={left - sunR} cy={85} r={sunR} className={styles.sun} />
        {PLANETS.map((planet, i) => {
          const r = (DIAMETERS_KM[planet] / 2) * k;
          return (
            <g key={planet}>
              {planet === 'saturn' && <ellipse cx={xs[i]} cy={85} rx={r * 2.3} ry={r * 0.5} className={styles.rings} />}
              <circle cx={xs[i]} cy={85} r={Math.max(r, 0.6)} className={styles.planet} />
              <text x={xs[i]} y={i % 2 ? 150 : 30} textAnchor="middle" className={styles.stripLabel}>
                {BODY_NAMES[planet]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.stripCaption}>Sizes, all to the same scale (the Sun is cut off on the left)</p>
    </div>
  );
}

/** The planets' distances from the Sun along a line, to scale, with a scale bar in model units. */
function DistanceStrip({ scale }: { scale: number }) {
  const x0 = 24;
  const span = W - 48;
  const perAu = span / MEAN_ORBITS.neptune.a;
  const totalModel = MEAN_ORBITS.neptune.a * AU * scale;
  // A round scale bar of about a third of the strip.
  const exponent = Math.floor(Math.log10(totalModel / 3));
  const step = [5, 2, 1].map((s) => s * 10 ** exponent).find((s) => s <= totalModel / 3) ?? 10 ** exponent;
  const barPx = (step / totalModel) * span;
  return (
    <div className={styles.strip}>
      <span className={styles.stripTag}>Dots not to scale</span>
      <svg
        viewBox={`0 0 ${W} 130`}
        role="img"
        aria-label={`The planets' distances from the Sun along a line, to scale. Neptune is ${formatLength(totalModel)} from the Sun in this model.`}
      >
        <line x1={x0} y1={50} x2={x0 + span} y2={50} className={styles.track} />
        <circle cx={x0} cy={50} r={7} className={styles.sun} />
        {PLANETS.map((planet, i) => {
          const x = x0 + MEAN_ORBITS[planet].a * perAu;
          const inner = i < 4;
          return (
            <g key={planet}>
              <circle cx={x} cy={50} r={3.5} className={styles.planet} />
              {inner ? (
                <>
                  <path d={`M${x} 56 L${46 + i * 58} 70`} className={styles.leader} />
                  <text x={46 + i * 58} y={82} textAnchor="middle" className={styles.stripLabel}>
                    {BODY_NAMES[planet]}
                  </text>
                </>
              ) : (
                <text x={x} y={34} textAnchor="middle" className={styles.stripLabel}>
                  {BODY_NAMES[planet]}
                </text>
              )}
            </g>
          );
        })}
        <path d={`M${x0} 118 v-6 M${x0} 115 H${x0 + barPx} M${x0 + barPx} 118 v-6`} className={styles.bar} />
        <text x={x0 + barPx + 8} y={119} className={styles.stripLabel}>
          {formatLength(step)} in the model
        </text>
      </svg>
      <p className={styles.stripCaption}>Distances from the Sun, to scale. The inner four planets crowd in at the left.</p>
    </div>
  );
}
