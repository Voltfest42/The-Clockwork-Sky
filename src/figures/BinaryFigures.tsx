import { useMemo, useRef, useState, type ReactNode } from 'react';
import { lightShares, type EclipsingPair } from '../core/binaries/eclipse';
import { binaryState, eclipseLimit, minimumMasses, semiMajorAxis, type BinaryOrbit } from '../core/binaries/orbit';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { Caption, Figure } from '../viz/Figure';
import { OrbitView } from '../viz/binary/OrbitView';
import { LightCurve } from '../viz/lightCurve/LightCurve';
import {
  bestEclipseFit,
  bestVelocityFit,
  DEFAULT_VISUAL,
  debcatSystem,
  describeEclipses,
  ECLIPSE_FIT,
  ECLIPSE_PRESETS,
  eclipseMisfit,
  eclipseUncertainties,
  formatPeriod,
  fromLog,
  lightCurvePoints,
  plusMinus,
  R_SUN_PER_AU,
  three,
  VELOCITY_FIT,
  velocityCurves,
  velocityMisfit,
  VISUAL_PRESETS,
  weighByVelocities,
  weighVisual,
  type EclipseFit,
} from './binaries';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The binary workbench (Figures 14.1–14.3): one pair of stars seen three ways.
 * Its orbit, from above and as we see it (14.1), weighs the pair by Kepler's
 * third law; its velocity curves (14.2) give the mass ratio and, with the
 * tilt, the masses; its light curve (14.3) gives the sizes when the orbit is
 * close to edge-on. Each figure can play the orbit, or step through it by
 * dragging the cursor on a chart.
 */

const ORBIT_SECONDS = 8;
const BLUE = '#3b82f6';
const ORANGE = '#f97316';

function usePhase(start = 0.1) {
  const [phase, setPhase] = useState(start);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const reduced = useReducedMotion();
  useAnimationFrame(playing && onScreen, (dt) => setPhase((p) => (p + dt / ORBIT_SECONDS) % 1));
  return { phase, setPhase, playing, setPlaying, ref, reduced };
}

function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={figureStyles.toolButton} onClick={onToggle}>
      {playing ? 'Pause' : 'Play the orbit'}
    </button>
  );
}

const ORBIT_LEGEND = [
  { label: 'star 1’s path', symbol: <line x1="-9" x2="9" stroke="#93c5fd" strokeWidth="2" /> },
  { label: 'star 2’s path', symbol: <line x1="-9" x2="9" stroke="#fdba74" strokeWidth="2" strokeDasharray="4 3" /> },
  { label: 'the balance point (centre of mass)', symbol: <path d="M-5 0 h10 M0 -5 v10" stroke="var(--text)" strokeWidth="1.6" /> },
];

// —— Figure 14.1: the orbit ——

export function BinaryOrbitFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [presetId, setPresetId] = useState(DEFAULT_VISUAL.id);
  const [orbit, setOrbit] = useState<BinaryOrbit>(DEFAULT_VISUAL.orbit);
  const { phase, setPhase, playing, setPlaying, ref } = usePhase(0.1);
  const preset = VISUAL_PRESETS.find((p) => p.id === presetId) ?? DEFAULT_VISUAL;
  const reset = () => {
    setPresetId(DEFAULT_VISUAL.id);
    setOrbit(DEFAULT_VISUAL.orbit);
    setPhase(0.1);
    setPlaying(false);
  };
  const change = (patch: Partial<BinaryOrbit>) => {
    setOrbit({ ...orbit, ...patch });
    if (presetId !== DEFAULT_VISUAL.id) setPresetId(DEFAULT_VISUAL.id);
  };
  const choose = (id: string) => {
    const p = VISUAL_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setOrbit(p.orbit);
  };

  const w = weighVisual(orbit, preset.parallax);
  const s = binaryState(orbit, phase);
  const names = preset.names;
  const scaleAu = w.aAu > 30 ? 10 : w.aAu > 6 ? 5 : 1;
  const bar = { length: scaleAu * R_SUN_PER_AU, label: `${scaleAu} AU` };
  const year = (phase * w.years).toFixed(1);

  return (
    <Figure
      number={number}
      title="Binary workbench: the orbit"
      description="Two stars circling their balance point, drawn from above the orbit and as we see them from Earth, tilted. Set the two masses, the period, the orbit’s shape and its tilt, or load Sirius or α Centauri. Below, the orbit weighs the pair: its size from its angle on the sky and the parallax, then M₁ + M₂ = a³/P², and each star’s distance from the balance point gives the split."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={ORBIT_LEGEND}
      notToScale
      simplified={
        <p>
          The stars are drawn as dots sized by mass; at this scale they would be far too small to see. The orbit is exact for two point masses.
          The tilt runs from face-on to edge-on, so a pair tilted beyond edge-on (Sirius, at 136°) is drawn at 44°, its mirror image. Measuring
          a real orbit on the sky takes decades of measurements and an allowance for the tilt; here the figure does that part for you.
        </p>
      }
    >
      <div ref={ref} className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Pairs">
          <span className={styles.togglesLabel}>Load:</span>
          {VISUAL_PRESETS.map((p) => (
            <button key={p.id} type="button" className={styles.toggle} aria-pressed={presetId === p.id} onClick={() => choose(p.id)}>
              {p.name}
            </button>
          ))}
          <PlayButton playing={playing} onToggle={() => setPlaying(!playing)} />
        </div>
        <Slider label="Star 1’s mass" value={orbit.m1} min={0.1} max={20} log format={(m) => `${three(m)} M☉`} onChange={(m1) => change({ m1 })} />
        <Slider label="Star 2’s mass" value={orbit.m2} min={0.1} max={20} log format={(m) => `${three(m)} M☉`} onChange={(m2) => change({ m2 })} />
        <Slider label="Period" value={orbit.period / 365.25} min={1} max={200} log format={(y) => `${three(y)} years`} onChange={(y) => change({ period: y * 365.25 })} />
        <Slider label="Eccentricity" value={orbit.e} min={0} max={0.9} step={0.01} format={(e) => e.toFixed(2)} onChange={(e) => change({ e })} />
        <Slider label="Tilt" value={orbit.i} min={0} max={90} step={0.5} format={(i) => `${Math.round(i)}°`} onChange={(i) => change({ i })} />
        <Slider label="Time" value={phase} min={0} max={0.999} step={0.001} format={(p) => `year ${(p * w.years).toFixed(1)}`} onChange={setPhase} />
      </div>
      <div className={styles.split}>
        <OrbitView orbit={orbit} phase={phase} view="above" temperatures={preset.temperatures} names={names} title="From above the orbit" scaleBar={bar} ariaLabel={`The orbit from above, ${names[0]} and ${names[1]} ${three(s.separation / R_SUN_PER_AU)} AU apart`} />
        <OrbitView orbit={orbit} phase={phase} view="sky" temperatures={preset.temperatures} names={names} title="As we see it" scaleBar={bar} ariaLabel={`The orbit as seen from Earth, tilted ${Math.round(orbit.i)}° from face-on`} />
      </div>
      <div className={styles.card}>
        <p className={styles.panelTitle}>Weigh the pair</p>
        <ol style={{ margin: 0, paddingLeft: '1.2em', fontSize: '0.9rem' }}>
          <li>
            Size: the orbit is <b>{three(w.aArcsec)}″</b> across its half-width on the sky, allowing for the tilt. At a parallax of {three(preset.parallax)}″ ({three(1 / preset.parallax)} parsecs), that is {three(w.aArcsec)} ÷ {three(preset.parallax)} = <b>{three(w.aAu)} AU</b>.
          </li>
          <li>
            Period: <b>{three(w.years)} years</b>. Together the stars weigh {three(w.aAu)}³ ÷ {three(w.years)}² = <b>{three(w.total)} Suns</b>.
          </li>
          <li>
            Split: {names[0]} keeps {three(w.a1)} AU from the balance point, {names[1]} {three(w.a2)} AU, so {names[0]} is {three(w.a2 / w.a1)} times as heavy: <b>{three(w.m1)}</b> and <b>{three(w.m2)} Suns</b>.
          </li>
        </ol>
      </div>
      <Caption>
        {`${presetId === DEFAULT_VISUAL.id ? 'Your pair' : preset.name}, year ${year} of ${three(w.years)}: the stars are ${three(s.separation / R_SUN_PER_AU)} AU apart, ${
          orbit.e > 0.05 && s.separation < semiMajorAxis(orbit.m1 + orbit.m2, orbit.period) * (1 - orbit.e * 0.7) ? 'near their closest, moving fastest' : orbit.e > 0.05 && s.separation > semiMajorAxis(orbit.m1 + orbit.m2, orbit.period) * (1 + orbit.e * 0.7) ? 'near their farthest, moving slowest' : 'on their way round'
        }. ${preset.note}`}
      </Caption>
    </Figure>
  );
}

// —— Figure 14.2: velocities ——

const CLOSE_PRESETS = ECLIPSE_PRESETS;

export function BinaryVelocityFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [presetId, setPresetId] = useState('model');
  const [orbit, setOrbit] = useState<EclipsingPair>(CLOSE_PRESETS[0].pair);
  const [fitting, setFitting] = useState(false);
  const [k, setK] = useState({ k1: 80, k2: 80 });
  const { phase, setPhase, playing, setPlaying, ref } = usePhase(0.15);
  const reset = () => {
    setPresetId('model');
    setOrbit(CLOSE_PRESETS[0].pair);
    setFitting(false);
    setK({ k1: 80, k2: 80 });
    setPhase(0.15);
    setPlaying(false);
  };
  const choose = (id: string) => {
    setPresetId(id);
    setOrbit(CLOSE_PRESETS.find((p) => p.id === id)!.pair);
    setFitting(false);
  };
  const change = (patch: Partial<BinaryOrbit>) => {
    setOrbit({ ...orbit, ...patch });
    setPresetId('model');
  };
  const shown = fitting ? VELOCITY_FIT.pair : orbit;
  const curves = useMemo(() => velocityCurves(shown), [shown]);
  const w = weighByVelocities(shown);
  const s = binaryState(shown, phase);
  const fitCurves = useMemo(() => {
    const { pair } = VELOCITY_FIT;
    const shape = Array.from({ length: 201 }, (_, j) => ({ x: j / 200, c: Math.cos(binaryState(pair, j / 200).nu + (pair.omega * Math.PI) / 180) }));
    return { v1: shape.map(({ x, c }) => ({ x, y: k.k1 * c })), v2: shape.map(({ x, c }) => ({ x, y: -k.k2 * c })) };
  }, [k]);
  const misfit = velocityMisfit(k.k1, k.k2);
  const vMax = fitting ? 160 : Math.max(20, ...curves.v1.map((p) => Math.abs(p.y)), ...curves.v2.map((p) => Math.abs(p.y))) * 1.15;
  const fitMasses = minimumMasses(VELOCITY_FIT.pair.period, k.k1, k.k2);
  const beta = debcatSystem('beta Aur');
  const sin3 = Math.sin((76 * Math.PI) / 180) ** 3;

  return (
    <Figure
      number={number}
      title="Binary workbench: velocities"
      description="A close pair of stars seen from above, beside the speeds at which each moves towards or away from us through one orbit. The curves mirror each other: the lighter star swings faster, so the ratio of the swings is the ratio of the masses, and with the period they give each star’s mass times the sine of the tilt, cubed. In the fitting mode, match two curves to β Aurigae’s measured velocities."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'star 1', symbol: <line x1="-9" x2="9" stroke={BLUE} strokeWidth="2.5" /> },
        { label: 'star 2', symbol: <line x1="-9" x2="9" stroke={ORANGE} strokeWidth="2.5" strokeDasharray="4 3" /> },
        { label: 'a measurement, with its error bar', symbol: <g><line y1="-7" y2="7" stroke={BLUE} /><rect x="-2.5" y="-2.5" width="5" height="5" fill={BLUE} /></g> },
        { label: 'now (drag it)', symbol: <line y1="-9" y2="9" stroke="var(--accent)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The stars are points pulling on each other, so the curves are exact Keplerian ones; real stars are also distorted by each other’s pull
          and heat each other’s facing sides. β Aurigae’s measurements are simulated from its published orbit (DEBCat; Southworth and
          colleagues, 2007) with errors of 3 km/s, about what its broad lines allow.
        </p>
      }
    >
      <div ref={ref} className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Pairs">
          <span className={styles.togglesLabel}>Load:</span>
          {CLOSE_PRESETS.map((p) => (
            <button key={p.id} type="button" className={styles.toggle} aria-pressed={!fitting && presetId === p.id} onClick={() => choose(p.id)}>
              {p.name}
            </button>
          ))}
          <button type="button" className={styles.toggle} aria-pressed={fitting} onClick={() => setFitting(!fitting)}>
            Fit β Aurigae’s velocities
          </button>
          <PlayButton playing={playing} onToggle={() => setPlaying(!playing)} />
        </div>
        {fitting ? (
          <>
            <Slider label="Star 1’s swing, K₁" value={k.k1} min={20} max={150} step={0.5} format={(v) => `${v.toFixed(1)} km/s`} onChange={(k1) => setK({ ...k, k1 })} />
            <Slider label="Star 2’s swing, K₂" value={k.k2} min={20} max={150} step={0.5} format={(v) => `${v.toFixed(1)} km/s`} onChange={(k2) => setK({ ...k, k2 })} />
          </>
        ) : (
          <>
            <Slider label="Star 1’s mass" value={orbit.m1} min={0.1} max={20} log format={(m) => `${three(m)} M☉`} onChange={(m1) => change({ m1 })} />
            <Slider label="Star 2’s mass" value={orbit.m2} min={0.1} max={20} log format={(m) => `${three(m)} M☉`} onChange={(m2) => change({ m2 })} />
            <Slider label="Period" value={orbit.period} min={0.5} max={100} log format={(d) => formatPeriod(d)} onChange={(period) => change({ period })} />
            <Slider label="Eccentricity" value={orbit.e} min={0} max={0.8} step={0.01} format={(e) => e.toFixed(2)} onChange={(e) => change({ e })} />
            <Slider label="Tilt" value={orbit.i} min={0} max={90} step={0.5} format={(i) => `${Math.round(i)}°`} onChange={(i) => change({ i })} />
          </>
        )}
      </div>
      <div className={figureStyles.withSide}>
        <LightCurve
          xMin={0}
          xMax={1}
          yMin={-vMax}
          yMax={vMax}
          xLabel="Phase (fraction of an orbit)"
          yLabel="Speed away from us (km/s)"
          formatX={(x) => x.toFixed(1)}
          formatY={(y) => (y > 0 ? `+${y}` : `${y}`.replace('-', '−'))}
          curves={
            fitting
              ? [
                  { name: 'Your curve for star 1', color: BLUE, points: fitCurves.v1 },
                  { name: 'Your curve for star 2', color: ORANGE, dashed: true, points: fitCurves.v2 },
                ]
              : [
                  { name: 'Star 1', color: BLUE, points: curves.v1 },
                  { name: 'Star 2', color: ORANGE, dashed: true, points: curves.v2 },
                ]
          }
          dots={
            fitting
              ? [
                  { name: 'Star 1 measured', color: BLUE, xs: VELOCITY_FIT.phases, ys: VELOCITY_FIT.v1, errors: VELOCITY_FIT.phases.map(() => VELOCITY_FIT.sigma) },
                  { name: 'Star 2 measured', color: ORANGE, xs: VELOCITY_FIT.phases, ys: VELOCITY_FIT.v2, errors: VELOCITY_FIT.phases.map(() => VELOCITY_FIT.sigma) },
                ]
              : []
          }
          levels={[{ y: 0, label: 'the pair’s own speed' }]}
          cursor={phase}
          onCursor={setPhase}
          cursorStep={0.01}
          cursorText={(p) => `Phase ${p.toFixed(2)}: star 1 ${binaryState(shown, p).v1.toFixed(0)} km/s, star 2 ${binaryState(shown, p).v2.toFixed(0)} km/s`}
          ariaLabel="Velocity curves of both stars through one orbit; move the cursor with the arrow keys"
          height={260}
        />
        <OrbitView
          orbit={shown}
          phase={phase}
          view="above"
          temperatures={[shown.t1, shown.t2]}
          radii={[shown.r1, shown.r2]}
          title="From above the orbit"
          size={220}
          ariaLabel={`The pair from above, star 1 moving at ${s.v1.toFixed(0)} km/s and star 2 at ${s.v2.toFixed(0)} km/s along our line of sight`}
        />
      </div>
      <div className={styles.readout}>
        {fitting ? (
          <>
            <span>
              Misfit: <b>{misfit.toFixed(2)}</b> per measurement {misfit < 1.5 ? '(as good as the errors allow)' : ''}
            </span>
            <span>
              Masses × sin³i: <b>{three(fitMasses.m1)}</b> and <b>{three(fitMasses.m2)} M☉</b>
            </span>
            <span>
              With the tilt from the eclipses, 76°: <b>{three(fitMasses.m1 / sin3)}</b> and <b>{three(fitMasses.m2 / sin3)} M☉</b> (DEBCat: {three(fromLog(beta.logM[0]!, beta.eLogM[0]!).value)} and {three(fromLog(beta.logM[1]!, beta.eLogM[1]!).value)})
            </span>
            <button type="button" className={figureStyles.toolButton} onClick={() => setK(bestVelocityFit())}>
              Fit for me
            </button>
          </>
        ) : (
          <>
            <span>
              Swings: K₁ = <b>{w.k1.toFixed(1)}</b>, K₂ = <b>{w.k2.toFixed(1)} km/s</b>
            </span>
            <span>
              Mass ratio K₂/K₁ = <b>{w.ratio.toFixed(2)}</b>
            </span>
            <span>
              Masses × sin³i: {three(w.min1)} and {three(w.min2)} M☉; ÷ sin³{Math.round(shown.i)}° = <b>{three(shown.m1)}</b> and <b>{three(shown.m2)} M☉</b>
            </span>
          </>
        )}
      </div>
      <Caption>
        {fitting
          ? `Match the two curves to the measurements: the misfit is ${misfit.toFixed(1)} per measurement, and about 1 means the curves pass within the error bars as often as they should.`
          : shown.i < 1
            ? 'Face-on, the stars move across our view, never towards or away from us: no Doppler shift at all.'
            : `Phase ${phase.toFixed(2)}: star 1 is ${s.v1 >= 0 ? 'moving away at' : 'coming towards us at'} ${Math.abs(s.v1).toFixed(0)} km/s, star 2 ${s.v2 >= 0 ? 'moving away at' : 'coming towards us at'} ${Math.abs(s.v2).toFixed(0)} km/s. The lighter star swings ${w.ratio.toFixed(2)} times as far.`}
      </Caption>
    </Figure>
  );
}

// —— Figure 14.3: eclipses ——

export function BinaryEclipseFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [presetId, setPresetId] = useState('model');
  const [pair, setPair] = useState<EclipsingPair>(ECLIPSE_PRESETS[0].pair);
  const [fitting, setFitting] = useState(false);
  const [fit, setFit] = useState<EclipseFit>({ r1: 2, r2: 2, i: 80 });
  const [errors, setErrors] = useState<EclipseFit | null>(null);
  const { phase, setPhase, playing, setPlaying, ref } = usePhase(0.2);
  const reset = () => {
    setPresetId('model');
    setPair(ECLIPSE_PRESETS[0].pair);
    setFitting(false);
    setFit({ r1: 2, r2: 2, i: 80 });
    setErrors(null);
    setPhase(0.2);
    setPlaying(false);
  };
  const choose = (id: string) => {
    setPresetId(id);
    setPair(ECLIPSE_PRESETS.find((p) => p.id === id)!.pair);
    setFitting(false);
  };
  const change = (patch: Partial<EclipsingPair>) => {
    setPair({ ...pair, ...patch });
    if (presetId !== 'model') setPresetId('model');
  };
  const changeFit = (patch: Partial<EclipseFit>) => {
    setFit({ ...fit, ...patch });
    setErrors(null);
  };
  const shown: EclipsingPair = useMemo(() => (fitting ? { ...ECLIPSE_FIT.pair, ...fit } : pair), [fitting, fit, pair]);
  const curve = useMemo(() => lightCurvePoints(shown, 500), [shown]);
  const dip = Math.min(...curve.map((p) => p.y));
  const yMin = fitting ? 0.92 : Math.max(0, Math.floor((dip - 0.05) * 20) / 20);
  const s = binaryState(shown, phase);
  const now = curve[Math.round(phase * 500)]?.y ?? 1;
  const misfit = fitting ? eclipseMisfit(fit) : 0;
  const limit = shown.e === 0 ? eclipseLimit(shown, shown.r1, shown.r2) : null;
  const beta = debcatSystem('beta Aur');
  const r1Published = fromLog(beta.logR[0]!, beta.eLogR[0]!);
  const r2Published = fromLog(beta.logR[1]!, beta.eLogR[1]!);
  const [l1] = lightShares(shown);
  const extent = semiMajorAxis(shown.m1 + shown.m2, shown.period) * 0.75 + Math.max(shown.r1, shown.r2);

  return (
    <Figure
      number={number}
      title="Binary workbench: eclipses"
      description="A close pair seen nearly edge-on, drawn to scale as we see it, beside its light curve: the pair’s total light through one orbit. When one star passes in front of the other the light dips. Change the tilt, the stars’ sizes and temperatures: the dips’ lengths give the sizes, their depths the ratio of the stars’ surface brightnesses. In the fitting mode, match the sizes and tilt to β Aurigae’s measured light."
      height={700}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the pair’s light, model', symbol: <line x1="-9" x2="9" stroke="var(--series-1)" strokeWidth="2.5" /> },
        { label: 'a measurement', symbol: <rect x="-2" y="-2" width="4" height="4" fill="var(--text-muted)" /> },
        { label: 'now (drag it)', symbol: <line y1="-9" y2="9" stroke="var(--accent)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The stars are spheres with the same darkening towards their edges, giving light by Planck’s law at their temperatures; close pairs are
          really stretched by each other’s pull and heat each other’s facing sides, which adds gentle bumps between the dips. β Aurigae’s
          measurements are simulated from its published solution (DEBCat; Southworth and colleagues, 2007) with a scatter of 2 parts in 1,000.
          The uncertainties come from how fast the misfit grows as the radii and tilt move away from the best fit, allowing for their trading
          off against each other; they leave out errors in the model itself, such as the limb darkening.
        </p>
      }
    >
      <div ref={ref} className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Pairs">
          <span className={styles.togglesLabel}>Load:</span>
          {ECLIPSE_PRESETS.map((p) => (
            <button key={p.id} type="button" className={styles.toggle} aria-pressed={!fitting && presetId === p.id} onClick={() => choose(p.id)}>
              {p.name}
            </button>
          ))}
          <button type="button" className={styles.toggle} aria-pressed={fitting} onClick={() => setFitting(!fitting)}>
            Fit β Aurigae’s eclipses
          </button>
          <PlayButton playing={playing} onToggle={() => setPlaying(!playing)} />
        </div>
        {fitting ? (
          <>
            <Slider label="Star 1’s radius" value={fit.r1} min={1} max={4} step={0.005} format={(r) => `${r.toFixed(2)} R☉`} onChange={(r1) => changeFit({ r1 })} />
            <Slider label="Star 2’s radius" value={fit.r2} min={1} max={4} step={0.005} format={(r) => `${r.toFixed(2)} R☉`} onChange={(r2) => changeFit({ r2 })} />
            <Slider label="Tilt" value={fit.i} min={70} max={90} step={0.05} format={(i) => `${i.toFixed(1)}°`} onChange={(i) => changeFit({ i })} />
          </>
        ) : (
          <>
            <Slider label="Tilt" value={pair.i} min={60} max={90} step={0.1} format={(i) => `${i.toFixed(1)}°`} onChange={(i) => change({ i })} />
            <Slider label="Star 1’s radius" value={pair.r1} min={0.1} max={5} log format={(r) => `${three(r)} R☉`} onChange={(r1) => change({ r1 })} />
            <Slider label="Star 2’s radius" value={pair.r2} min={0.1} max={5} log format={(r) => `${three(r)} R☉`} onChange={(r2) => change({ r2 })} />
            <Slider label="Star 1’s temperature" value={pair.t1} min={2500} max={30000} log format={(t) => `${Math.round(t).toLocaleString('en-GB')} K`} onChange={(t1) => change({ t1 })} />
            <Slider label="Star 2’s temperature" value={pair.t2} min={2500} max={30000} log format={(t) => `${Math.round(t).toLocaleString('en-GB')} K`} onChange={(t2) => change({ t2 })} />
          </>
        )}
      </div>
      <div className={figureStyles.withSide}>
        <LightCurve
          xMin={0}
          xMax={1}
          yMin={yMin}
          yMax={1.02}
          xLabel="Phase (fraction of an orbit)"
          yLabel="Light (share of the total)"
          formatX={(x) => x.toFixed(1)}
          formatY={(y) => `${Math.round(y * 100)}%`}
          curves={[{ name: fitting ? 'Your model' : 'The pair’s light', color: 'var(--series-1)', points: curve }]}
          dots={fitting ? [{ name: 'β Aurigae, measured', color: 'var(--text-muted)', xs: ECLIPSE_FIT.phases, ys: ECLIPSE_FIT.light }] : []}
          cursor={phase}
          onCursor={setPhase}
          cursorStep={0.005}
          cursorText={(p) => `Phase ${p.toFixed(3)}: ${(curve[Math.round(p * 500)].y * 100).toFixed(1)}% of the light`}
          ariaLabel="The pair’s light curve through one orbit; move the cursor with the arrow keys"
          height={260}
        />
        <OrbitView
          orbit={shown}
          phase={phase}
          view="sky"
          temperatures={[shown.t1, shown.t2]}
          radii={[shown.r1, shown.r2]}
          extent={extent}
          title="As we see it, to scale"
          size={220}
          ariaLabel={`The pair as we see it: ${s.projected < shown.r1 + shown.r2 ? `star ${s.front} in front of star ${s.front === 1 ? 2 : 1}` : 'side by side'}`}
        />
      </div>
      <div className={styles.readout}>
        {fitting ? (
          <>
            <span>
              Misfit: <b>{misfit.toFixed(2)}</b> per measurement {misfit < 1.2 ? '(as good as the scatter allows)' : ''}
            </span>
            <button
              type="button"
              className={figureStyles.toolButton}
              onClick={() => {
                const best = bestEclipseFit(fit);
                setFit(best);
                setErrors(eclipseUncertainties(best));
              }}
            >
              Fit for me
            </button>
            {errors && (
              <span>
                Radii <b>{plusMinus(fit.r1, errors.r1)}</b> and <b>{plusMinus(fit.r2, errors.r2)} R☉</b>, tilt {plusMinus(fit.i, errors.i)}°. DEBCat: {plusMinus(r1Published.value, r1Published.error)} and {plusMinus(r2Published.value, r2Published.error)} R☉.
              </span>
            )}
          </>
        ) : (
          <>
            <span>
              Light now: <b>{(now * 100).toFixed(1)}%</b>
            </span>
            <span>
              Star 1 gives {Math.round(l1 * 100)}% of the light, star 2 {Math.round((1 - l1) * 100)}%
            </span>
            {limit !== null && <span>Eclipses from a tilt of {limit.toFixed(1)}°</span>}
          </>
        )}
      </div>
      <Caption>{fitting ? `Your radii, ${fit.r1.toFixed(2)} and ${fit.r2.toFixed(2)} R☉, at a tilt of ${fit.i.toFixed(1)}°, miss the measurements by ${misfit.toFixed(1)} per point; about 1 is a good fit.` : describeEclipses(shown)}</Caption>
    </Figure>
  );
}
