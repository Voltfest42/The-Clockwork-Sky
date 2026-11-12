import { useMemo, useRef, useState, type ReactNode } from 'react';
import { fractionalYear } from '../core/binaries/visual';
import { orbitAt, pericentre, precessionPerOrbit, relativisticRedshift, toArcmin } from '../core/galaxy/s2';
import { SGR_A_STAR, S2_ORBIT } from '../data/s2';
import { usePageTime } from '../site/hydration';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ScatterChart } from '../viz/ScatterChart';
import { nextS2Pericentre, weigh, yearLabel } from './crowds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * S2's orbit (Figure 30.5): the star S2 round Sagittarius A*, from GRAVITY's
 * published elements, on the sky or face on, played through the years. A
 * ruler across the orbit's long axis and a stopwatch for one lap weigh the
 * black hole by Kepler's third law, as Figure 7.3 weighed the planets. With
 * relativity switched on, the orbit's turning per lap (12′) is drawn forty
 * times larger, and the chart shows the extra redshift near pericentre.
 */

type View = 'sky' | 'face';

const W = 480;
const H = 320;
const EXAGGERATION = 40;
const LAPS = 5;
const RULER_START = 180;
const YEARS_PER_SECOND = 2;
const M = SGR_A_STAR.mass;
const D = SGR_A_STAR.distance;
const DPHI = precessionPerOrbit(S2_ORBIT, M, D);
const PERI = pericentre(S2_ORBIT, M, D);

/** The orbit face on, in mas, the pericentre to the right of the black hole: x along the long axis. */
function faceOn(year: number, turn = 0): [number, number] {
  const p = orbitAt({ ...S2_ORBIT, i: 0, node: 0, omega: 0 }, year, D, turn);
  return [p.north * 1000, p.east * 1000];
}

export function S2OrbitFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const pageTime = usePageTime();
  const today = Math.round(fractionalYear(pageTime) * 100) / 100;
  const [year, setYear] = useState(today);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>('sky');
  const [ruler, setRuler] = useState(RULER_START);
  const [started, setStarted] = useState<number | null>(null);
  const [timed, setTimed] = useState<number | null>(null);
  const [relativity, setRelativity] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const reset = () => {
    setYear(today);
    setPlaying(false);
    setView('sky');
    setRuler(RULER_START);
    setStarted(null);
    setTimed(null);
    setRelativity(false);
  };

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * YEARS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.25) return;
      pending.current = 0;
      step = 0.25 * YEARS_PER_SECOND;
    }
    setYear(Math.min(2100, year + step));
  });

  const now = orbitAt(S2_ORBIT, year, D);
  const next = nextS2Pericentre(today);
  const sinceStart = started === null ? null : year - started;
  const mass = timed !== null ? weigh(ruler, timed) : null;
  const rulerAu = (ruler / 2 / 1000) * D;

  // The orbit drawn: one lap, or laps turned by relativity's precession, exaggerated
  const laps = relativity ? LAPS : 1;
  const paths = useMemo(() => {
    const out: [number, number][][] = [];
    for (let k = 0; k < laps; k++) {
      const turn = k * DPHI * EXAGGERATION;
      const points: [number, number][] = [];
      for (let j = 0; j <= 360; j++) {
        // Sample by eccentric anomaly's worth of time, densely near pericentre
        const u = j / 360;
        const yr = S2_ORBIT.periastron + (u - 0.5) * S2_ORBIT.period;
        if (view === 'face') points.push(faceOn(yr, turn));
        else {
          const p = orbitAt(S2_ORBIT, yr, D, turn);
          points.push([-p.east * 1000, p.north * 1000]);
        }
      }
      out.push(points);
    }
    return out;
  }, [laps, view]);

  // Fit the drawing: millarcseconds to pixels
  const all = paths.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs, 0), Math.max(...xs, 0), Math.min(...ys, 0), Math.max(...ys, 0)];
  const scale = Math.min((W - 60) / (x1 - x0), (H - 60) / (y1 - y0));
  const cx = (W - (x1 + x0) * scale) / 2;
  const cy = (H + (y1 + y0) * scale) / 2;
  const sx = (x: number) => cx + x * scale;
  const sy = (y: number) => cy - y * scale;
  const star = view === 'face' ? faceOn(year) : ([-now.east * 1000, now.north * 1000] as [number, number]);
  // Year marks along the current orbit
  const marks = Array.from({ length: 16 }, (_, k) => {
    const yr = Math.ceil(S2_ORBIT.periastron) + k - 8;
    const p = view === 'face' ? faceOn(yr) : ([-orbitAt(S2_ORBIT, yr, D).east * 1000, orbitAt(S2_ORBIT, yr, D).north * 1000] as [number, number]);
    return { yr, p };
  });
  // The ruler lies along the face-on long axis, from the far end of the orbit
  const apo = -S2_ORBIT.a * 1000 * (1 + S2_ORBIT.e);
  const scaleBar = 50;

  const redshiftAt = (yr: number) => relativisticRedshift(orbitAt(S2_ORBIT, yr, D), M);
  const peakExtra = redshiftAt(S2_ORBIT.periastron);

  const caption = `${yearLabel(year)}: S2 is ${Math.round(now.r).toLocaleString('en-GB')} AU from Sagittarius A*, moving at ${Math.round(now.speed).toLocaleString('en-GB')} km/s, ${now.vz >= 0 ? 'away from us' : 'towards us'} at ${Math.abs(Math.round(now.vz)).toLocaleString('en-GB')} km/s. Its orbit takes ${S2_ORBIT.period.toFixed(2)} years and comes within ${Math.round(PERI.r)} AU at ${Math.round(PERI.speed).toLocaleString('en-GB')} km/s; its next pericentre is in ${yearLabel(next)}, ${(next - today).toFixed(1)} years from today. ${
    mass !== null
      ? `Your ruler gives a semi-major axis of ${Math.round(rulerAu).toLocaleString('en-GB')} AU and your stopwatch a period of ${timed!.toFixed(2)} years, so Sagittarius A* weighs ${(rulerAu ** 3 / timed! ** 2 / 1e6).toFixed(2)} million Suns (GRAVITY: ${(M / 1e6).toFixed(2)} million).`
      : started !== null
        ? `The stopwatch is running: ${sinceStart!.toFixed(2)} years so far.`
        : 'Measure the orbit with the ruler (face on) and time a lap with the stopwatch to weigh the black hole.'
  }${relativity ? ` Relativity turns the orbit by ${toArcmin(DPHI).toFixed(0)}′ a lap, drawn ${EXAGGERATION} times larger.` : ''}`;

  return (
    <Figure
      number={number}
      title="S2’s orbit"
      description="The star S2’s orbit round Sagittarius A*, the Milky Way’s black hole, from the GRAVITY collaboration’s published elements: a 16-year ellipse that brings it within 120 AU of the black hole at 7,700 km/s. A ruler and a stopwatch weigh the black hole by Kepler’s third law, at about 4.3 million Suns. Relativity turns the orbit by 12 arcminutes each lap and adds about 200 km/s to the star’s redshift at pericentre."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      notToScale={relativity}
      legend={[
        { label: 'Sagittarius A*', symbol: <circle r="4" fill="#111" stroke="#fde68a" strokeWidth="2" /> },
        { label: 'S2 now', symbol: <circle r="5" fill="#7dd3fc" /> },
        { label: 'S2’s orbit, with years marked', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#7dd3fc" strokeWidth="2" /> },
        { label: 'your ruler', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f59e0b" strokeWidth="3" /> },
        ...(relativity ? [{ label: 'later laps, turned by relativity (×40)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#a78bfa" strokeWidth="1.5" /> }] : []),
      ]}
      simplified={
        <p>
          The orbit is GRAVITY’s Keplerian ellipse (2020), with relativity’s precession and redshift computed to first order and added on. On
          the sky, east is to the left and north up, as astronomers draw it; the face-on view is the same orbit turned flat using the star’s
          radial velocities. Light’s travel time across the orbit (about eight days), the bending of its light and the Galaxy’s motion are left
          out. The black hole’s weight from Kepler’s law depends on its distance: the fit’s 8.25 kpc. The precession is drawn {EXAGGERATION} times
          larger than it is.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play the years'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => setYear(today)}>
            Today
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'sky'} onClick={() => setView('sky')}>
              On the sky
            </button>
            <button type="button" aria-pressed={view === 'face'} onClick={() => setView('face')}>
              Face on
            </button>
          </span>
          <button type="button" className={styles.toggle} aria-pressed={relativity} onClick={() => setRelativity((r) => !r)}>
            Relativity’s turning (×{EXAGGERATION})
          </button>
        </div>
        <div className={styles.controls}>
          <Slider label="Year" value={year} min={1992} max={2060} step={0.01} format={(v) => yearLabel(v)} onChange={(v) => setYear(Math.round(v * 100) / 100)} />
          <Slider label="Ruler across the long axis" value={ruler} min={100} max={400} step={1} format={(v) => `${Math.round(v)} mas (${Math.round((v / 2 / 1000) * D).toLocaleString('en-GB')} AU across half)`} onChange={(v) => setRuler(Math.round(v))} />
        </div>
        <div className={figureStyles.toolbar}>
          {started === null ? (
            <button
              type="button"
              className={figureStyles.toolButton}
              onClick={() => {
                setStarted(year);
                setTimed(null);
              }}
            >
              Start the stopwatch
            </button>
          ) : (
            <button
              type="button"
              className={figureStyles.toolButton}
              onClick={() => {
                setTimed(Math.max(0.01, year - started));
                setStarted(null);
              }}
            >
              Stop the stopwatch
            </button>
          )}
          <span>
            {started !== null ? `Running: ${sinceStart!.toFixed(2)} years` : timed !== null ? `Timed: ${timed.toFixed(2)} years` : 'Stopwatch: not started'}
          </span>
          {mass !== null && <strong>Sagittarius A*: {(mass / 1e6).toFixed(2)} million M☉</strong>}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={`S2’s orbit ${view === 'sky' ? 'on the sky' : 'face on'}. ${caption}`}>
          {paths.map((points, k) => (
            <path
              key={k}
              d={points.map((p, j) => `${j ? 'L' : 'M'} ${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={k === 0 ? '#7dd3fc' : '#a78bfa'}
              strokeWidth={k === 0 ? 2 : 1.2}
              strokeOpacity={k === 0 ? 1 : 0.8}
            />
          ))}
          {marks.map(({ yr, p }) => (
            <g key={yr}>
              <circle cx={sx(p[0])} cy={sy(p[1])} r={2} fill="#7dd3fc" />
              {yr % 2 === 0 && (
                <text x={sx(p[0]) + 5} y={sy(p[1]) - 4} fontSize="10" fill="#9aa8c4">
                  {yr}
                </text>
              )}
            </g>
          ))}
          {view === 'face' && (
            <g>
              <line x1={sx(apo)} x2={sx(apo + ruler)} y1={sy(0) + 18} y2={sy(0) + 18} stroke="#f59e0b" strokeWidth="3" />
              <line x1={sx(apo)} x2={sx(apo)} y1={sy(0) + 12} y2={sy(0) + 24} stroke="#f59e0b" strokeWidth="2" />
              <line x1={sx(apo + ruler)} x2={sx(apo + ruler)} y1={sy(0) + 12} y2={sy(0) + 24} stroke="#f59e0b" strokeWidth="2" />
              <text x={sx(apo + ruler) + 6} y={sy(0) + 22} fontSize="11" fill="#f59e0b">
                ruler: {ruler} mas
              </text>
            </g>
          )}
          <circle cx={sx(0)} cy={sy(0)} r={4} fill="#111" stroke="#fde68a" strokeWidth="2" />
          <circle cx={sx(star[0])} cy={sy(star[1])} r={5} fill="#7dd3fc" stroke="#000" strokeWidth="0.5" />
          <line x1={W - 20 - scaleBar * scale} x2={W - 20} y1={H - 16} y2={H - 16} stroke="#9aa8c4" strokeWidth="2" />
          <text x={W - 20} y={H - 22} fontSize="10" fill="#9aa8c4" textAnchor="end">
            {scaleBar} mas = {Math.round((scaleBar / 1000) * D)} AU
          </text>
          {view === 'sky' && (
            <text x={12} y={18} fontSize="10" fill="#9aa8c4">
              north ↑ · east ←
            </text>
          )}
          {view === 'sky' && (
            <text x={12} y={H - 12} fontSize="10" fill="#9aa8c4">
              Turn it face on to measure it
            </text>
          )}
        </svg>
        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>Speed along our line of sight round the 2018 pericentre</p>
            <ScatterChart
              groups={[]}
              lines={[
                { name: 'Newton', color: 'var(--series-2)', dashed: true, f: (yr) => orbitAt(S2_ORBIT, yr, D).vz },
                { name: 'with relativity', color: 'var(--series-1)', f: (yr) => orbitAt(S2_ORBIT, yr, D).vz + redshiftAt(yr) },
              ]}
              xScale="linear"
              yScale="linear"
              xMin={2017.6}
              xMax={2019}
              yMin={-2500}
              yMax={4500}
              xLabel="Year"
              yLabel="Away from us (km/s)"
              formatX={(x) => x.toFixed(1)}
              formatY={(y) => String(Math.round(y)).replace('-', '−')}
              highlight={year >= 2017.6 && year <= 2019 ? { x: year, y: now.vz + redshiftAt(year), label: 'now', color: 'var(--text)' } : undefined}
              height={260}
              ariaLabel={`S2’s radial velocity through its 2018 pericentre, from about +4,000 km/s to −1,900 km/s, with and without relativity’s extra redshift.`}
            />
          </div>
          <div>
            <p className={styles.panelTitle}>Relativity’s extra redshift, as a speed</p>
            <ScatterChart
              groups={[]}
              lines={[{ name: 'gravitational redshift and time dilation', color: 'var(--series-1)', f: redshiftAt }]}
              xScale="linear"
              yScale="linear"
              xMin={2017.6}
              xMax={2019}
              yMin={0}
              yMax={250}
              xLabel="Year"
              yLabel="Extra (km/s)"
              formatX={(x) => x.toFixed(1)}
              formatY={(y) => String(Math.round(y))}
              height={260}
              ariaLabel={`Relativity’s extra redshift, rising to ${Math.round(peakExtra)} km/s at pericentre in May 2018.`}
            />
          </div>
        </div>
        <Caption>{caption}</Caption>
      </div>
    </Figure>
  );
}
