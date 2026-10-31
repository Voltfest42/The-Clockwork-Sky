import { useMemo, useState, type ReactNode } from 'react';
import { DETECTION_SIGMA } from '../core/exoplanets/detect';
import { transitLight } from '../core/exoplanets/transit';
import { planetOrbit, starVelocity } from '../core/exoplanets/wobble';
import { bin, fold } from '../core/signal/series';
import { Caption, Figure } from '../viz/Figure';
import { LightCurve } from '../viz/lightCurve/LightCurve';
import {
  CADENCE,
  campaign,
  geometryOf,
  HOST_STARS,
  MAX_NIGHTS,
  PLANET_PRESETS,
  START_PRESET,
  starById,
  thinned,
  TRANSITS_NEEDED,
  verdictOf,
  type PlanetSetup,
} from './otherWorlds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Find the planet (Figure 19.1): one planet seen two ways at once. Its star's
 * velocity, measured once a night, swings as the planet pulls it; its light,
 * measured every half hour from space, dips if the orbit is edge-on. Set the
 * planet, the star, the instruments' precision and how long to watch; fold
 * the measurements at the planet's period (Toolkit T6) and see whether either
 * signal stands out of the noise.
 */

const start = PLANET_PRESETS.find((p) => p.id === START_PRESET)!;

const earths = (m: number) => (m >= 100 ? `${Math.round(m).toLocaleString('en-GB')} M⊕` : `${Number(m.toPrecision(2))} M⊕`);
const radii = (r: number) => `${Number(r.toPrecision(2))} R⊕`;
const days = (d: number) => (d >= 730 ? `${(d / 365.25).toFixed(1)} years` : d >= 20 ? `${Math.round(d)} days` : `${d.toFixed(2)} days`);
const ms = (v: number) => (v >= 10 ? `${v.toFixed(1)} m/s` : v >= 1 ? `${v.toFixed(2)} m/s` : `${(v * 100).toPrecision(2)} cm/s`);
const ppm = (f: number) => (f >= 0.001 ? `${(f * 100).toFixed(f >= 0.01 ? 1 : 2)}%` : `${Math.round(f * 1e6)} ppm`);
const sigmas = (s: number) => `${s.toFixed(1)}σ`;

export function FindPlanetFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [preset, setPreset] = useState<string | null>(start.id);
  const [setup, setSetup] = useState<PlanetSetup>(start);
  const [folded, setFolded] = useState(false);
  const choose = (id: string) => {
    const p = PLANET_PRESETS.find((q) => q.id === id)!;
    setPreset(id);
    setSetup(p);
  };
  const reset = () => {
    choose(start.id);
    setFolded(false);
  };
  const edit = (change: Partial<PlanetSetup>) => {
    setPreset(null);
    setSetup((s) => ({ ...s, ...change }));
  };

  const c = useMemo(() => campaign(setup), [setup]);
  const verdict = verdictOf(c);
  const star = starById(setup.star);
  const named = PLANET_PRESETS.find((p) => p.id === preset);
  const g = geometryOf(setup);
  const nights = c.velocities.times.length;

  // What each signal would stand out by, on average, from the planet's true signal: the search's expected result.
  const expectedWobble = (c.k / setup.rvPrecision) * Math.sqrt(nights / 2);
  const inTransit = c.transitCount * (c.duration / CADENCE);
  const expectedDip = c.transits ? (c.depth / (setup.lightPrecision * 1e-6)) * Math.sqrt(Math.max(inTransit, 0)) : 0;
  const nightsFor = (expected: number) => (expected > 0 ? nights * (DETECTION_SIGMA / expected) ** 2 : Infinity);

  const rvPlot = useMemo(() => {
    const orbit = planetOrbit(setup.mass, star.mass, setup.period, setup.tilt);
    const v = c.velocities;
    const xs = folded ? fold(v.times, setup.period, c.t0) : v.times;
    const binned = folded && v.times.length > 40 ? bin(xs, v.values, 0.05, 0, setup.rvPrecision) : null;
    const model = folded
      ? Array.from({ length: 201 }, (_, k) => ({ x: k / 200, y: starVelocity(orbit, (k / 200) * setup.period) }))
      : nights / setup.period <= 60
        ? Array.from({ length: 1201 }, (_, k) => {
            const t = (k / 1200) * nights;
            return { x: t, y: starVelocity(orbit, t - c.t0) };
          })
        : [];
    return { xs, binned, model };
  }, [c, folded, setup, star, nights]);

  const lightPlot = useMemo(() => {
    const L = c.light;
    const sigma = setup.lightPrecision * 1e-6;
    if (!folded) {
      const pick = thinned(L.times.length, 4000);
      return { xs: pick.map((k) => L.times[k]), ys: pick.map((k) => L.values[k]), binned: null, model: [], window: 0 };
    }
    // Hours from the nearest mid-transit, in a window a few transits long.
    const window = Math.max(2.5 * c.duration, 0.25) * 24;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k < L.times.length; k++) {
      const p = (L.times[k] - c.t0) / setup.period;
      const hours = (p - Math.round(p)) * setup.period * 24;
      if (Math.abs(hours) <= window) {
        xs.push(hours);
        ys.push(L.values[k]);
      }
    }
    const pick = thinned(xs.length, 4000);
    const width = Math.max(0.25, (c.duration * 24) / 8);
    const binned = bin(xs, ys, width, -window, sigma).filter((b) => Math.abs(b.x) <= window);
    const model = Array.from({ length: 241 }, (_, k) => {
      const h = -window + (2 * window * k) / 240;
      return { x: h, y: transitLight(g, h / 24, 200) };
    });
    return { xs: pick.map((k) => xs[k]), ys: pick.map((k) => ys[k]), binned, model, window };
  }, [c, folded, setup, g]);

  const vmax = Math.max(3 * setup.rvPrecision, 1.3 * c.k);
  const lsig = setup.lightPrecision * 1e-6;
  const lmin = 1 - Math.max(1.4 * c.depth, 4 * lsig, 2e-4);
  const lmax = 1 + Math.max(4 * lsig, 1e-4);
  // Small changes read better in parts per million.
  const inPpm = lmax - lmin < 0.003;

  const both = verdict.wobble && verdict.transit;
  const density = both ? (setup.mass / setup.radius ** 3) * 5.51 : null;

  return (
    <Figure
      number={number}
      title="Find the planet"
      description="A planet seen two ways at once in simulated measurements: its star’s velocity, measured once a night, swinging towards and away from us as the planet pulls it, and its light, measured every half hour from space, dipping if the orbit is edge-on. The planet’s mass, size, orbit and tilt, the star, the instruments’ precision and the nights watched can all be set; folding the measurements at the planet’s period shows whether each signal stands out. 51 Pegasi b’s swing of 56 m/s stands out in a month; an Earth twin’s 9 cm/s and 84 parts per million need years."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a measurement', symbol: <rect x="-2" y="-2" width="4" height="4" fill="var(--text-muted)" /> },
        { label: 'an average of folded measurements, with its error bar', symbol: <g><line y1="-7" y2="7" stroke="var(--series-1)" /><rect x="-3" y="-3" width="6" height="6" fill="var(--series-1)" /></g> },
        { label: 'the planet’s true signal', symbol: <line x1="-9" x2="9" stroke="var(--series-2)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The orbits are circular and the noise is the simplest kind, the same size for every measurement and independent of the last. Real stars
          add their own: spots and the boiling of their surfaces shift a Sun-like star’s lines by about 1 m/s and its light by tens of parts per
          million, which is what really hides Earth twins. The signals are measured here at the planet’s known period; a real search tries
          thousands of periods (Toolkit T6), so this course, like Kepler, asks for 7.1σ, and for three transits.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Planet" style={{ marginBottom: 6 }}>
        {PLANET_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset === p.id} onClick={() => choose(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Star">
          <span className={styles.togglesLabel}>Star:</span>
          {HOST_STARS.map((s) => (
            <button key={s.id} type="button" className={styles.toggle} aria-pressed={setup.star === s.id} onClick={() => edit({ star: s.id })}>
              {s.name}
            </button>
          ))}
        </div>
        <Slider label="Planet’s mass" value={setup.mass} min={0.1} max={5000} log format={earths} onChange={(mass) => edit({ mass })} />
        <Slider label="Planet’s size" value={setup.radius} min={0.3} max={25} log format={radii} onChange={(radius) => edit({ radius })} />
        <Slider label="Orbital period" value={setup.period} min={0.5} max={5000} log format={days} onChange={(period) => edit({ period })} />
        <Slider label="Tilt (90° is edge-on)" value={setup.tilt} min={45} max={90} step={0.01} format={(i) => `${i.toFixed(2)}°`} onChange={(tilt) => edit({ tilt })} />
        <Slider label="Wobble precision" value={setup.rvPrecision} min={0.05} max={30} log format={ms} onChange={(rvPrecision) => edit({ rvPrecision })} />
        <Slider label="Light precision (per half hour)" value={setup.lightPrecision} min={10} max={10000} log format={(p) => `${Math.round(p).toLocaleString('en-GB')} ppm`} onChange={(lightPrecision) => edit({ lightPrecision })} />
        <Slider label="Nights watched" value={setup.nights} min={10} max={MAX_NIGHTS} log format={(n) => Math.round(n).toLocaleString('en-GB')} onChange={(n) => edit({ nights: Math.round(n) })} />
        <div className={figureStyles.toolbar}>
          <div className={figureStyles.segmented} role="group" aria-label="Plot against">
            <button type="button" aria-pressed={!folded} onClick={() => setFolded(false)}>
              Time
            </button>
            <button type="button" aria-pressed={folded} onClick={() => setFolded(true)}>
              Folded at the planet’s period
            </button>
          </div>
        </div>
      </div>

      <LightCurve
        xMin={0}
        xMax={folded ? 1 : nights}
        yMin={-vmax}
        yMax={vmax}
        xLabel={folded ? 'Phase of the orbit, from the transit' : 'Time (nights)'}
        yLabel="Star’s velocity (m/s)"
        formatX={(x) => (folded ? x.toFixed(1) : String(Math.round(x)))}
        formatY={(y) => String(Number(y.toPrecision(2)))}
        dots={[
          { name: `${nights.toLocaleString('en-GB')} velocities`, color: rvPlot.binned ? 'color-mix(in srgb, var(--text-muted) 45%, transparent)' : 'var(--text-muted)', xs: rvPlot.xs, ys: c.velocities.values, errors: rvPlot.xs.map(() => setup.rvPrecision) },
          ...(rvPlot.binned ? [{ name: 'averages', color: 'var(--series-1)', xs: rvPlot.binned.map((b) => b.x), ys: rvPlot.binned.map((b) => b.mean), errors: rvPlot.binned.map((b) => b.error), large: true }] : []),
        ]}
        curves={rvPlot.model.length ? [{ name: 'the true swing', color: 'var(--series-2)', points: rvPlot.model }] : []}
        levels={[{ y: 0 }]}
        ariaLabel={`The star’s velocity, ${folded ? 'folded at the planet’s period' : `over ${nights} nights`}: a true swing of ${ms(c.k)} in measurements scattered by ${ms(setup.rvPrecision)}.`}
        height={210}
        hideLegend
      />
      <LightCurve
        xMin={folded ? -lightPlot.window : 0}
        xMax={folded ? lightPlot.window : nights}
        yMin={lmin}
        yMax={lmax}
        xLabel={folded ? 'Hours from mid-transit' : 'Time (nights)'}
        yLabel={inPpm ? 'Change in light (ppm)' : 'Change in light (%)'}
        formatX={(x) => String(Math.round(x))}
        formatY={(y) => (inPpm ? Math.round((y - 1) * 1e6).toLocaleString('en-GB') : String(Number(((y - 1) * 100).toFixed(2))))}
        dots={[
          { name: 'light', color: lightPlot.binned ? 'color-mix(in srgb, var(--text-muted) 40%, transparent)' : 'var(--text-muted)', xs: lightPlot.xs, ys: lightPlot.ys },
          ...(lightPlot.binned ? [{ name: 'averages', color: 'var(--series-1)', xs: lightPlot.binned.map((b) => b.x), ys: lightPlot.binned.map((b) => b.mean), errors: lightPlot.binned.map((b) => b.error), large: true }] : []),
        ]}
        curves={lightPlot.model.length ? [{ name: 'the true dip', color: 'var(--series-2)', points: lightPlot.model }] : []}
        ariaLabel={`The star’s light, ${folded ? 'folded on the transit' : `over ${nights} nights`}: ${c.transits ? `a true dip of ${ppm(c.depth)}` : 'no transit'} in measurements scattered by ${Math.round(setup.lightPrecision)} ppm.`}
        height={210}
        hideLegend
      />

      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>The wobble:</b> the planet swings its star by {ms(c.k)}. Fitted at its period: {ms(c.wobble.k)} ± {ms(c.wobble.error)}, standing out by{' '}
          <b>{sigmas(c.wobble.significance)}</b>.{' '}
          {verdict.wobble
            ? 'Found.'
            : `Not found: it needs ${DETECTION_SIGMA}σ.${Number.isFinite(nightsFor(expectedWobble)) && nightsFor(expectedWobble) <= 1e6 ? ` On average it would take about ${Math.round(nightsFor(expectedWobble)).toLocaleString('en-GB')} nights at this precision.` : ''}`}
        </p>
        <p style={{ margin: '6px 0 0' }}>
          <b>The transit:</b>{' '}
          {c.transits ? (
            <>
              a dip of {ppm(c.depth)} for {(c.duration * 24).toFixed(1)} hours, {c.transitCount === 1 ? 'once' : `${c.transitCount} times`} in {nights.toLocaleString('en-GB')} nights. Measured:{' '}
              {ppm(Math.max(0, c.dip.depth))} ± {ppm(c.dip.error)}, standing out by <b>{sigmas(c.dip.significance)}</b>.{' '}
              {verdict.transit
                ? 'Found.'
                : c.transitCount < TRANSITS_NEEDED
                  ? `Not found: ${c.transitCount === 0 ? 'no transit falls' : 'too few transits fall'} in the nights watched; a planet needs ${TRANSITS_NEEDED}.`
                  : `Not found: it needs ${DETECTION_SIGMA}σ.${nightsFor(expectedDip) <= 1e6 ? ` On average it would take about ${Math.round(nightsFor(expectedDip)).toLocaleString('en-GB')} nights at this precision.` : ''}`}
            </>
          ) : (
            <>none. The orbit is tilted {(90 - setup.tilt).toFixed(2)}° from edge-on, and the planet passes above or below its star; it would transit only within {(90 - (Math.acos(Math.min(1, (1 + g.k) / g.aOverR)) * 180) / Math.PI).toFixed(2)}° of edge-on.</>
          )}
        </p>
        {density !== null && (
          <p style={{ margin: '6px 0 0' }}>
            <b>Both:</b> the mass and the size give a density of {density.toFixed(1)} g/cm³: {density > 3.5 ? 'rock and iron, like Earth (5.5).' : density > 1.8 ? 'between rock and gas: perhaps rock with water or a thin envelope.' : 'mostly gas, like Jupiter (1.3) or Saturn (0.7).'}
          </p>
        )}
        {named && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{named.name}: {named.note}.</p>}
      </div>
      <Caption>
        {verdict.wobble && verdict.transit
          ? `Both signals stand out: the wobble gives the planet’s mass (${earths(setup.mass)}), the transit its size (${radii(setup.radius)}).`
          : verdict.wobble
            ? `The wobble stands out at ${sigmas(c.wobble.significance)}, so the planet is found, but without a transit its size is unknown and its mass only a least value.`
            : verdict.transit
              ? `The transit stands out at ${sigmas(c.dip.significance)}: the planet’s size is known, but its wobble is lost in the noise.`
              : `Neither signal stands out yet: the wobble at ${sigmas(c.wobble.significance)}, the transit at ${c.transits ? sigmas(c.dip.significance) : 'none'}. Watch longer, or use better instruments.`}
      </Caption>
    </Figure>
  );
}
