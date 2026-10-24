import { useMemo, useRef, useState, type ReactNode } from 'react';
import { wrapPi } from '../core/math/angles';
import { bestFit, PARAM_RANGES, ptolemyAt, scoreFit, type PtolemyParams } from '../core/orbits/ptolemy';
import { DAYS_PER_JULIAN_YEAR, DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { LineChart } from '../viz/LineChart';
import { onSky } from './sky/legend';
import { formatParam, FIT_FROM_YEAR, FIT_STEP, FIT_YEARS, fitWindow, PLAIN_START, ptolemysValues } from './ptolemyFit';
import { dateLabel } from './retrograde';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Ptolemy's model of Mars, with every part adjustable, scored against where
 * Mars really was and will be from 2020 to 2035. Left: the construction, with
 * Earth at the centre, the deferent, its off-centre middle, the equant and the
 * epicycle, and two lines of sight, the model's and the real Mars's. Right:
 * how far off the model is, day by day, over the 15 years.
 */

const SIZE = 400;
const C = SIZE / 2;
const UNIT = 88;
const RIM = 192;
const MARS = '#ff8a5c';
const EARTH = '#5b9bff';
const SLIDERS: readonly { key: keyof PtolemyParams; label: string; step: number }[] = [
  { key: 'epicycle', label: 'Epicycle size', step: 0.01 },
  { key: 'centre', label: 'Deferent’s centre, off Earth', step: 0.005 },
  { key: 'equant', label: 'Equant, off Earth', step: 0.005 },
  { key: 'apogee', label: 'Direction of the offsets', step: 1 },
  { key: 'deferentPeriod', label: 'Once round the deferent', step: 1 },
  { key: 'epicyclePeriod', label: 'Once round the epicycle', step: 1 },
];
const DAYS_PER_SECOND = 60;

export function PtolemyFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const fitData = useMemo(() => fitWindow(), []);
  const ptolemy = useMemo(() => ptolemysValues(fitData.epoch.jdTT), [fitData]);
  const [params, setParams] = useState<PtolemyParams>(PLAIN_START);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lastPreset, setLastPreset] = useState<string>('Start again');
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const { times, real, epoch } = fitData;

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = (dt * DAYS_PER_SECOND) / FIT_STEP;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 6;
    }
    setIndex((i) => {
      const next = i + step;
      if (next >= times.length - 1) {
        setPlaying(false);
        return times.length - 1;
      }
      return next;
    });
  });

  const score = useMemo(() => scoreFit(params, epoch, times, real), [params, epoch, times, real]);
  const ptolemyScore = useMemo(() => scoreFit(ptolemy, epoch, times, real), [ptolemy, epoch, times, real]);
  const misses = useMemo(
    () => times.map((t, i) => ({ x: FIT_FROM_YEAR + (t - times[0]) / DAYS_PER_JULIAN_YEAR, y: wrapPi(ptolemyAt(params, epoch, t).longitude - real[i]) / DEG })),
    [params, epoch, times, real],
  );
  const i = Math.min(times.length - 1, Math.round(index));
  const t = times[i];
  const state = ptolemyAt(params, epoch, t);
  const miss = misses[i].y;

  // The model planet's path over one loop either side of now.
  const path = useMemo(() => {
    const out: string[] = [];
    for (let d = -400; d <= 400; d += 8) {
      const s = ptolemyAt(params, epoch, t + d);
      out.push(`${(C + UNIT * s.planet.x).toFixed(1)},${(C - UNIT * s.planet.y).toFixed(1)}`);
    }
    return out.join(' ');
  }, [params, epoch, t]);

  const apply = (name: string, next: PtolemyParams) => {
    setParams(next);
    setLastPreset(name);
  };
  const fit = (noEquant: boolean) => {
    const sub = times.filter((_, k) => k % 2 === 0);
    const subReal = real.filter((_, k) => k % 2 === 0);
    apply(noEquant ? 'Best fit without an equant' : 'Best fit', bestFit(noEquant ? { ...ptolemy, equant: ptolemy.centre } : ptolemy, epoch, sub, subReal, { noEquant }));
  };
  const reset = () => {
    setParams(PLAIN_START);
    setLastPreset('Start again');
    setIndex(0);
    setPlaying(false);
  };

  const at = (p: { x: number; y: number }) => ({ x: C + UNIT * p.x, y: C - UNIT * p.y });
  const P = at(state.epicycleCentre);
  const M = at(state.planet);
  const D = at(state.deferentCentre);
  const Q = at(state.equantPoint);
  const ray = (lon: number) => ({ x: C + RIM * Math.cos(lon), y: C - RIM * Math.sin(lon) });
  const modelEnd = ray(state.longitude);
  const realEnd = ray(real[i]);
  const yLimit = Math.min(60, Math.max(5, Math.ceil(Math.max(...misses.map((m) => Math.abs(m.y))) / 5) * 5));
  const mean = score.mean / DEG;
  const verdict =
    mean < 0.3
      ? 'about as good as this kind of model can get'
      : mean < 0.7
        ? 'as good as Ptolemy’s own'
        : mean < 2
          ? 'close: Ptolemy did a little better'
          : mean < 6
            ? 'on the right track'
            : 'far off: the loops come at the wrong times or the wrong size';

  return (
    <Figure
      number={number}
      title="Tune Ptolemy"
      description="Ptolemy’s model of Mars: Earth at the centre, Mars on a small circle (the epicycle) whose centre goes round a larger circle (the deferent), set off-centre, at a steady rate seen from a third point, the equant. Sliders change every part, and a chart shows how far the model’s Mars is from the real one over the 15 years from 2020 to 2035, with a score."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'Earth, at the centre', symbol: onSky(<circle r="5" fill={EARTH} />) },
        { label: 'the deferent, and the epicycle riding on it', symbol: onSky(<g><circle r="8" fill="none" stroke="#7d8db0" /><circle cx="8" cy="0" r="3" fill="none" stroke="#c8d2e8" /></g>) },
        { label: 'the deferent’s centre (+) and the equant (×)', symbol: onSky(<path d="M-8 0 H-2 M-5 -3 V3 M3 -3 L9 3 M9 -3 L3 3" stroke="#c8d2e8" strokeWidth="1.5" />) },
        { label: 'the model’s Mars, and where it appears from Earth', symbol: onSky(<g><path d="M-10 4 L10 -4" stroke={MARS} strokeWidth="2" /><circle r="4" fill={MARS} /></g>) },
        { label: 'where the real Mars appears', symbol: onSky(<path d="M-10 4 L10 -4" stroke="#ffffff" strokeWidth="2" strokeDasharray="4 3" />) },
      ]}
      simplified={
        <p>
          This is Ptolemy’s model for a planet beyond the Sun, flattened into one plane: he had a separate theory for how far a planet strays
          above and below the ecliptic, which is left out, and only longitudes are scored. The real positions come from JPL’s orbital elements.
          “Ptolemy’s proportions” uses his sizes for the epicycle and the offsets, with today’s direction for the offsets and the true speeds;
          his own tables were made for his own time and frame of reference. The circles are drawn to the model’s scale, which says nothing about
          real distances: Ptolemy’s model only fixed directions.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={styles.togglesLabel}>Set</span>
          <button type="button" className={figureStyles.toolButton} onClick={() => apply('Start again', PLAIN_START)}>
            Start again
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => apply('Ptolemy’s proportions', ptolemy)}>
            Ptolemy’s proportions
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => fit(false)}>
            Best fit
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => fit(true)}>
            Best fit without an equant
          </button>
        </div>
        <div className={styles.split}>
          <div>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={seasonStyles.svg} role="img" aria-label={`Ptolemy’s model on ${dateLabel(t)}: the model’s Mars is ${Math.abs(miss).toFixed(1)}° ${miss > 0 ? 'east' : 'west'} of the real one.`}>
              <circle cx={C} cy={C} r={RIM} fill="none" stroke="#3b4c72" strokeDasharray="2 5" />
              <polyline points={path} fill="none" stroke={MARS} strokeOpacity="0.35" strokeWidth="1.2" />
              <circle cx={D.x} cy={D.y} r={UNIT} fill="none" stroke="#7d8db0" strokeWidth="1.5" />
              <line x1={C} y1={C} x2={C + UNIT * (params.centre + 1.12) * Math.cos(params.apogee)} y2={C - UNIT * (params.centre + 1.12) * Math.sin(params.apogee)} stroke="#7d8db0" strokeDasharray="3 4" />
              <line x1={Q.x} y1={Q.y} x2={P.x} y2={P.y} stroke="#c8d2e8" strokeOpacity="0.5" />
              <circle cx={P.x} cy={P.y} r={UNIT * params.epicycle} fill="none" stroke="#c8d2e8" strokeWidth="1.3" />
              <line x1={P.x} y1={P.y} x2={M.x} y2={M.y} stroke="#c8d2e8" />
              <line x1={C} y1={C} x2={realEnd.x} y2={realEnd.y} stroke="#ffffff" strokeWidth="2" strokeDasharray="5 4" />
              <line x1={C} y1={C} x2={modelEnd.x} y2={modelEnd.y} stroke={MARS} strokeWidth="2" />
              <path d={`M ${D.x - 5} ${D.y} H ${D.x + 5} M ${D.x} ${D.y - 5} V ${D.y + 5}`} stroke="#c8d2e8" strokeWidth="1.8" />
              <path d={`M ${Q.x - 4} ${Q.y - 4} L ${Q.x + 4} ${Q.y + 4} M ${Q.x + 4} ${Q.y - 4} L ${Q.x - 4} ${Q.y + 4}`} stroke="#c8d2e8" strokeWidth="1.8" />
              <circle cx={C} cy={C} r="6" fill={EARTH} />
              <circle cx={M.x} cy={M.y} r="5.5" fill={MARS} />
              <text x={realEnd.x + (realEnd.x > C ? 4 : -4)} y={realEnd.y + (realEnd.y > C ? 14 : -6)} fontSize="11" textAnchor={realEnd.x > C ? 'start' : 'end'} fill="#ffffff">
                real
              </text>
              <text x={12} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {dateLabel(t)}
              </text>
              <text x={12} y={40} fontSize="12" fill="var(--sky-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                Off by {Math.abs(miss).toFixed(1)}°
              </text>
            </svg>
            <div className={styles.slider} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={figureStyles.toolButton}
                aria-pressed={playing}
                onClick={() => {
                  if (!playing && index >= times.length - 1) setIndex(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? '❚❚' : '▶'}
                <span className="visually-hidden">{playing ? 'Pause' : 'Play'}</span>
              </button>
              <label className={styles.slider} style={{ flex: 1 }}>
                Date
                <input
                  type="range"
                  min={0}
                  max={times.length - 1}
                  step={1}
                  value={i}
                  onChange={(e) => {
                    setIndex(Number(e.target.value));
                    setPlaying(false);
                  }}
                  aria-valuetext={`${dateLabel(t)}, off by ${Math.abs(miss).toFixed(1)}°`}
                />
              </label>
            </div>
          </div>
          <div className={figureStyles.side}>
            {SLIDERS.map((s) => {
              const [lo, hi] = PARAM_RANGES[s.key];
              const isAngle = s.key === 'apogee';
              const value = isAngle ? Math.round(((params.apogee / DEG) % 360 + 360) % 360) : params[s.key];
              return (
                <label key={s.key} className={styles.slider}>
                  <span style={{ minWidth: '11.5em' }}>{s.label}</span>
                  <input
                    type="range"
                    min={isAngle ? 0 : lo}
                    max={isAngle ? 359 : hi}
                    step={s.step}
                    value={value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setParams({ ...params, [s.key]: isAngle ? v * DEG : v });
                      setLastPreset('');
                    }}
                    aria-valuetext={formatParam(s.key, params[s.key])}
                  />
                  <output style={{ minWidth: '4.5em' }}>{formatParam(s.key, params[s.key])}</output>
                </label>
              );
            })}
            <div className={figureStyles.summary} aria-live="polite">
              <p>
                Average miss: <b>{mean.toFixed(2)}°</b> · worst: <b>{(score.worst / DEG).toFixed(1)}°</b> ({dateLabel(score.worstAt)})
              </p>
              <p>
                {lastPreset ? `${lastPreset}: ` : ''}
                {verdict}. Ptolemy’s proportions average {(ptolemyScore.mean / DEG).toFixed(2)}°.
              </p>
            </div>
          </div>
        </div>
        <LineChart
          series={[{ name: 'Model minus real Mars', color: 'var(--series-2)', points: misses }]}
          xLabel="Year"
          yLabel="Model minus real (°)"
          xMin={FIT_FROM_YEAR}
          xMax={FIT_FROM_YEAR + FIT_YEARS}
          yMin={-yLimit}
          yMax={yLimit}
          formatY={(y) => `${y}°`}
          formatX={(x) => String(Math.round(x))}
          baseline={0}
          dots={false}
          markers={[{ x: misses[i].x, label: dateLabel(t), color: 'var(--text)' }]}
          onPick={(x) => {
            setIndex(Math.round(((x - FIT_FROM_YEAR) * DAYS_PER_JULIAN_YEAR) / FIT_STEP));
            setPlaying(false);
          }}
          width={720}
          height={220}
          hideLegend
          ariaLabel={`How far the model’s Mars is from the real one, 2020 to 2035: an average of ${mean.toFixed(2)}° and at worst ${(score.worst / DEG).toFixed(1)}°.`}
        />
      </div>
      <Caption>
        {Math.abs(params.deferentPeriod - 687) > 15 || Math.abs(params.epicyclePeriod - 780) > 15
          ? 'One circle and one epicycle, centred on Earth, make loops, but not at the right times or sizes. Try matching the speeds first: Mars takes about 687 days to go round the stars and about 780 days from one loop to the next. Then grow the epicycle until the loops are the right size.'
          : params.centre === 0 && params.equant === 0
            ? 'The loops are in step now. Grow the epicycle until they are the right size. What is left is that Mars runs fast in some years and slow in others, with bigger loops on one side of the sky. Move the deferent’s centre and the equant off Earth, and turn their direction.'
            : Math.abs(params.equant - 2 * params.centre) < 0.02 && mean < 0.7
              ? 'With the equant twice as far out as the deferent’s centre, Ptolemy’s “bisected eccentricity”, the model follows Mars to within a degree or so most of the time. It took Kepler’s ellipse to do better.'
              : 'Mars runs fast and slow because it goes round the Sun on an ellipse. Ptolemy imitated that with the off-centre deferent and the equant. Try the equant at twice the centre’s distance.'}
      </Caption>
    </Figure>
  );
}
