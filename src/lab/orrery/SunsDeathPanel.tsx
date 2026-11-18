import { useDeferredValue, useMemo } from 'react';
import { Slider } from '../../figures/Slider';
import { LineChart } from '../../viz/LineChart';
import figureStyles from '../../figures/figures.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import styles from './Orrery.module.css';
import { FROM, PLANET_STYLE, sunsDeathModel, TIDE_CHOICES, TO, fateWords } from './sunsDeath';

/**
 * The Sun's death beside the Orrery's run: the same model, followed by the
 * averaged equations (dyingSun.ts) so the answer shows at once for any
 * winds and tide, as charts of each planet's distance against the Sun's
 * radius, a verdict for each planet, and the line inside which a planet is
 * swallowed. The n-body run plays the same story out with the real planets.
 */

export function SunsDeathPanel({
  windScale,
  tide,
  age,
  onChange,
  onRunAgain,
  changed,
}: {
  windScale: number;
  tide: number;
  /** The run's Sun's age now, Myr, to mark on the chart. */
  age: number | null;
  onChange: (next: { windScale: number; tide: number }) => void;
  onRunAgain: () => void;
  /** The settings differ from those of the run on screen. */
  changed: boolean;
}) {
  const wind = useDeferredValue(windScale);
  const strength = useDeferredValue(tide);
  const model = useMemo(() => sunsDeathModel(wind, strength), [wind, strength]);
  const series = [
    { name: 'the Sun’s radius', color: 'var(--series-2)', points: model.sun },
    ...model.paths
      .filter((p) => p.id !== 'jupiter')
      .map((p) => ({
        name: p.name,
        ...PLANET_STYLE[p.id],
        points: p.path.t.map((t, k) => ({ x: t / 1000, y: p.path.a[k] })).filter((q) => q.x >= FROM / 1000 - 0.02),
      })),
  ];
  const yMax = 3;
  const xTicks = [12.2, 12.25, 12.3, 12.35, 12.4, 12.45].map((v) => ({ value: v, label: v.toFixed(2) }));
  const marker = age !== null && age >= FROM && age <= TO ? [{ x: age / 1000, label: 'the run now' }] : [];
  const verdicts = model.paths.map((p) => fateWords(p.name, p.path));

  return (
    <div className={styles.box} style={{ marginTop: 16 }}>
      <h3>The Sun’s death: the answer for these settings</h3>
      <div className={skyStyles.controls}>
        <Slider
          label="The Sun’s wind"
          value={windScale}
          min={0.25}
          max={3}
          step={0.05}
          format={(v) => (Math.abs(v - 1) < 0.01 ? 'SSE’s own (Reimers, η = 0.5)' : `${v.toFixed(2)} × SSE’s`)}
          onChange={(v) => onChange({ windScale: Math.round(v * 20) / 20, tide })}
        />
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="The tide’s strength">
          {TIDE_CHOICES.map((k) => (
            <button key={k} type="button" aria-pressed={tide === k} onClick={() => onChange({ windScale, tide: k })}>
              {k === 0 ? 'No tide' : k === 1 ? 'Tide × 1' : `× ${k}`}
            </button>
          ))}
        </span>
        <button type="button" className={figureStyles.toolButton} onClick={onRunAgain} disabled={!changed}>
          Run it again with these
        </button>
      </div>
      <p className={styles.note}>
        The tide × 1 is Mustill and Villaver’s (2012); its strength is uncertain by a factor of several either way. The Sun’s wind × 1 is SSE’s
        own, Reimers’s formula with η = 0.5; its strength on the giant branches is uncertain by about as much.
      </p>
      <p className={skyStyles.panelTitle}>Distance from the Sun’s centre: each planet’s orbit against the Sun’s surface</p>
      <LineChart
        series={series}
        xLabel="The Sun’s age (billion years)"
        yLabel="Distance (AU)"
        xMin={FROM / 1000}
        xMax={TO / 1000}
        xTicks={xTicks}
        yMin={0}
        yMax={yMax}
        markers={marker}
        formatY={(y) => y.toFixed(1)}
        height={260}
        ariaLabel={`Each rocky planet’s distance from the Sun and the Sun’s radius against the Sun’s age, from 12.2 to 12.48 billion years. ${verdicts.join(' ')}`}
      />
      <ul className={styles.verdicts}>
        {verdicts.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
      <p className={styles.note}>
        Any planet starting closer than {model.earthLine.toFixed(2)} AU would be swallowed if it weighed as much as Earth, and closer than{' '}
        {model.jupiterLine.toFixed(2)} AU if it weighed as much as Jupiter: the heavier the planet, the harder it pulls on the bulge it raises, and the
        harder the bulge pulls back.
      </p>
    </div>
  );
}
