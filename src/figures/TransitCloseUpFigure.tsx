import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { fullDuration, isGrazing, totalDuration, transitLight, uniformDepth } from '../core/exoplanets/transit';
import type { LimbDarkening } from '../core/binaries/eclipse';
import { Caption, Figure } from '../viz/Figure';
import { useReducedMotion } from '../viz/hooks';
import { LightCurve } from '../viz/lightCurve/LightCurve';
import { closeUpGeometry, JUPITER_RADII, lineUpChance, TRANSIT_PLANETS } from './otherWorlds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * A transit up close (Figure 19.2): a planet crossing a Sun-like star whose
 * disc darkens towards its edge, with the light curve drawn as it goes. A
 * planet crossing the middle gives a rounded, flat-bottomed dip; one near the
 * edge a shallow V. Below, how often an orbit tilted at random lines up at all.
 */

const SUN_LIMB: LimbDarkening = [0.4, 0.25];
const START = { radius: JUPITER_RADII, b: 0.3, limb: true, hours: -1.2, au: 1 };
const R = 110;
const W = 360;
const H = 260;

const starRgb = [255, 232, 190];

export function TransitCloseUpFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [radius, setRadius] = useState(START.radius);
  const [b, setB] = useState(START.b);
  const [limb, setLimb] = useState(START.limb);
  const [hours, setHours] = useState(START.hours);
  const [au, setAu] = useState(START.au);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const gradient = `limb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reset = () => {
    setRadius(START.radius);
    setB(START.b);
    setLimb(START.limb);
    setHours(START.hours);
    setAu(START.au);
    setPlaying(false);
  };

  const law: LimbDarkening = limb ? SUN_LIMB : [0, 0];
  const g = closeUpGeometry(radius, b, law);
  const t14 = totalDuration(g) * 24;
  const t23 = fullDuration(g) * 24;
  const span = Math.max(1.5, 0.75 * t14 + 0.5);
  const grazing = isGrazing(g);
  const misses = t14 === 0;
  const light = transitLight(g, hours / 24, 300);
  const deepest = 1 - transitLight(g, 0, 400);

  const now = useRef(hours);
  useEffect(() => {
    now.current = hours;
  }, [hours]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (time: number) => {
      const next = now.current + ((time - last) / 1000) * (span / 4);
      last = time;
      if (next >= span) {
        setHours(span);
        setPlaying(false);
        return;
      }
      setHours(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, span]);

  // The planet on the sky: across the star's face along x, b stellar radii from its centre in y.
  const phase = hours / 24 / g.period;
  const px = g.aOverR * Math.sin(2 * Math.PI * phase);
  const stops = [0, 0.3, 0.5, 0.65, 0.78, 0.88, 0.94, 0.98, 1].map((s) => {
    const mu = Math.sqrt(1 - s * s);
    const I = 1 - law[0] * (1 - mu) - law[1] * (1 - mu) ** 2;
    return { s, colour: `rgb(${starRgb.map((c) => Math.round(c * I)).join(',')})` };
  });
  const curve = Array.from({ length: 301 }, (_, k) => {
    const h = -span + (2 * span * k) / 300;
    return { x: h, y: transitLight(g, h / 24, 200) };
  });
  const flatCurve = { name: 'with no limb darkening', color: 'var(--text-muted)', dashed: true, points: curve.map((p) => ({ x: p.x, y: transitLight({ ...g, limb: [0, 0] }, p.x / 24, 200) })) };
  const chance = lineUpChance(au);
  const named = TRANSIT_PLANETS.find((p) => Math.abs(p.radius - radius) < 0.01);

  return (
    <Figure
      number={number}
      title="A transit up close"
      description="A planet the size of Jupiter crossing a Sun-like star, drawn to scale, with the star’s light dipping as it goes: by about 1%, for about three hours, in a rounded dip, because the star’s disc is darker towards its edge. A planet crossing near the edge makes a shallow V; an Earth dims a Sun-like star by 84 parts per million. Only orbits seen nearly edge-on transit at all: one in 215 for an orbit like Earth’s."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the light, as the planet crosses', symbol: <line x1="-9" x2="9" stroke="var(--series-1)" strokeWidth="2.5" /> },
        { label: 'the same, if the star were evenly bright', symbol: <line x1="-9" x2="9" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'now', symbol: <line y1="-8" y2="8" stroke="var(--accent)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The star darkens towards its edge by the quadratic law with the Sun’s coefficients in visible light (0.4 and 0.25). The orbit is circular, ten
          stellar radii out with a 3-day period, like a hot Jupiter’s; farther planets cross more slowly. The planet is a black disc: its own glow and
          its atmosphere are left out (Figure 19.5 is about the atmosphere).
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Planet">
          <span className={styles.togglesLabel}>Planet:</span>
          {TRANSIT_PLANETS.map((p) => (
            <button key={p.id} type="button" className={styles.toggle} aria-pressed={named?.id === p.id} onClick={() => setRadius(p.radius)}>
              {p.name}
            </button>
          ))}
        </div>
        <Slider label="Planet’s size" value={radius} min={0.5} max={25} log format={(r) => `${Number(r.toPrecision(2))} R⊕`} onChange={setRadius} />
        <Slider label="Crosses at (0 is the middle, 1 the edge)" value={b} min={0} max={1.3} step={0.01} format={(v) => v.toFixed(2)} onChange={setB} />
        <Slider label="Time from mid-transit" value={hours} min={-span} max={span} step={0.01} format={(h) => `${h >= 0 ? '+' : '−'}${Math.abs(h).toFixed(2)} h`} onChange={(h) => { setPlaying(false); setHours(h); }} />
        <div className={figureStyles.toolbar}>
          <button type="button" className={styles.toggle} aria-pressed={limb} onClick={() => setLimb(!limb)}>
            Limb darkening
          </button>
          {!reduced && (
            <button
              type="button"
              className={figureStyles.toolButton}
              onClick={() => {
                if (!playing && hours >= span - 1e-6) setHours(-span);
                setPlaying(!playing);
              }}
            >
              {playing ? 'Pause' : 'Play the transit'}
            </button>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The star, with the planet ${misses ? 'passing beyond its edge' : Math.abs(px) < 1 + g.k ? 'in front of it' : 'beside it'}, drawn to scale: the planet is ${(g.k * 100).toFixed(1)}% of the star’s width.`} style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto', background: '#05070f', borderRadius: 8 }}>
        <defs>
          <radialGradient id={gradient}>
            {stops.map((s) => (
              <stop key={s.s} offset={s.s} stopColor={s.colour} />
            ))}
          </radialGradient>
        </defs>
        <circle cx={W / 2} cy={H / 2} r={R} fill={`url(#${gradient})`} />
        <line x1={W / 2 - R - 30} x2={W / 2 + R + 30} y1={H / 2 + b * R} y2={H / 2 + b * R} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" />
        <circle cx={W / 2 + px * R} cy={H / 2 + b * R} r={Math.max(0.8, g.k * R)} fill="#000" stroke={g.k * R < 3 ? '#9cf' : 'none'} strokeWidth={g.k * R < 3 ? 1 : 0} />
        {g.k * R < 3 && (
          <circle cx={W / 2 + px * R} cy={H / 2 + b * R} r={7} fill="none" stroke="#9cf" strokeWidth="1" strokeDasharray="2 2" />
        )}
        <text x={10} y={20} fontSize="12" fill="#fff">
          {`Light: ${(light * 100).toFixed(light > 0.999 ? 4 : 3)}%`}
        </text>
      </svg>
      <LightCurve
        xMin={-span}
        xMax={span}
        yMin={1 - Math.max(1.35 * deepest, 2e-4)}
        yMax={1 + Math.max(0.15 * deepest, 3e-5)}
        xLabel="Hours from mid-transit"
        yLabel="Light (share of usual)"
        formatX={(x) => String(Number(x.toFixed(1)))}
        formatY={(y) => `${(y * 100).toFixed(deepest < 0.002 ? 3 : 1)}%`}
        curves={[...(limb ? [flatCurve] : []), { name: 'the light', color: 'var(--series-1)', points: curve }]}
        cursor={hours}
        onCursor={(h) => {
          setPlaying(false);
          setHours(h);
        }}
        cursorStep={0.05}
        cursorText={(h) => `${h.toFixed(2)} hours from mid-transit`}
        ariaLabel={`The light curve of the transit: ${misses ? 'no dip, the planet misses the star' : `${(deepest * 100).toFixed(deepest < 0.002 ? 3 : 2)}% deep for ${t14.toFixed(1)} hours`}.`}
        height={200}
        hideLegend
      />
      <div className={styles.readout}>
        <span>
          Depth: <b>{misses ? 'none' : deepest < 0.001 ? `${Math.round(deepest * 1e6)} ppm` : `${(deepest * 100).toFixed(2)}%`}</b> (k² = {(uniformDepth(g.k) * 100).toFixed(uniformDepth(g.k) < 0.001 ? 4 : 2)}%)
        </span>
        <span>
          Transit: <b>{misses ? '—' : `${t14.toFixed(1)} h`}</b>, flat bottom {t23 > 0 ? `${t23.toFixed(1)} h` : 'none'}
        </span>
      </div>
      <div className={styles.card}>
        <Slider label="An orbit round a Sun-like star at" value={au} min={0.02} max={30} log format={(a) => `${Number(a.toPrecision(2))} AU`} onChange={setAu} />
        <p style={{ margin: '6px 0 0' }} aria-live="polite">
          Tilted at random, an orbit {Number(au.toPrecision(2))} AU out transits <b>{(chance * 100).toPrecision(2)}%</b> of the time: one in {Math.round(1 / chance).toLocaleString('en-GB')}. For every planet like it seen to
          transit, about {Math.max(0, Math.round(1 / chance) - 1).toLocaleString('en-GB')} more are there, unseen.
        </p>
      </div>
      <Caption>
        {misses
          ? 'The planet passes beyond the star’s edge: no transit at all.'
          : grazing
            ? `A grazing transit: the planet never gets wholly onto the star, so the dip is a shallow V, ${(deepest * 100).toFixed(deepest < 0.002 ? 3 : 2)}% deep, with no flat bottom.`
            : `The dip is ${(deepest * 100).toFixed(deepest < 0.002 ? 3 : 2)}% deep and ${t14.toFixed(1)} hours long${limb ? ', rounded at the bottom because the star’s middle is brighter than its edge' : ', flat at the bottom because the star is evenly bright'}.`}
      </Caption>
    </Figure>
  );
}
