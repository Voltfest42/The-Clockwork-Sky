import { useMemo, useState, type ReactNode } from 'react';
import { pulseProfile, type BeamGeometry } from '../core/compact/beam';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useReducedMotion } from '../viz/hooks';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { lighthouseScene, type LighthouseState } from './lighthouse/scene';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The pulsar lighthouse (Figure 26.3): a neutron star whose magnetic axis is
 * tilted from its spin axis, with a beam of radio waves round each end of it,
 * and our line of sight. As it turns, a beam that sweeps across us makes a
 * pulse; one that misses makes none. Below, the pulses we receive over three
 * turns. Tilt the axes and the pulse appears, splits, gains an interpulse
 * from the other beam, or vanishes.
 */

const DEG = Math.PI / 180;
const CAMERA: OrbitCameraState = { target: [0, 0, 0], azimuth: -1.2, elevation: 0.35, distance: 6.2 };
const TURNS = 3;
/** Seconds of animation per turn. */
const TURN_TIME = 4;

interface Preset {
  id: string;
  name: string;
  alpha: number;
  zeta: number;
  rho: number;
}

const PRESETS: readonly Preset[] = [
  { id: 'one', name: 'One beam sweeps past', alpha: 40, zeta: 45, rho: 14 },
  { id: 'middle', name: 'Through the middle', alpha: 30, zeta: 31, rho: 15 },
  { id: 'both', name: 'Both beams: an interpulse', alpha: 88, zeta: 86, rho: 10 },
  { id: 'miss', name: 'Misses us', alpha: 25, zeta: 70, rho: 12 },
];
const START = PRESETS[0];

export function LighthouseFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [alpha, setAlpha] = useState<number>(START.alpha);
  const [zeta, setZeta] = useState<number>(START.zeta);
  const [rho, setRho] = useState<number>(START.rho);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const reducedMotion = useReducedMotion();
  const reset = () => {
    setAlpha(START.alpha);
    setZeta(START.zeta);
    setRho(START.rho);
    setPhase(0);
    setPlaying(false);
    setCameraReset((n) => n + 1);
  };
  const apply = (p: Preset) => {
    setAlpha(p.alpha);
    setZeta(p.zeta);
    setRho(p.rho);
  };
  useAnimationFrame(playing && !reducedMotion, (dt) => setPhase((ph) => (ph + (2 * Math.PI * dt) / TURN_TIME) % (2 * Math.PI)));

  const geometry: BeamGeometry = useMemo(() => ({ alpha: alpha * DEG, zeta: zeta * DEG, rho: rho * DEG }), [alpha, zeta, rho]);
  const profile = useMemo(() => pulseProfile(geometry), [geometry]);
  const n = profile.brightness.length;
  const index = Math.round((phase / (2 * Math.PI)) * n) % n;
  const onUs = profile.beam[index] as 0 | 1 | 2;
  const state: LighthouseState = useMemo(() => ({ alpha: alpha * DEG, zeta: zeta * DEG, rho: rho * DEG, phase, onUs }), [alpha, zeta, rho, phase, onUs]);
  const train = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let t = 0; t < TURNS; t++) for (let i = 0; i < n; i += 2) pts.push({ x: t + i / n, y: profile.brightness[i] });
    pts.push({ x: TURNS, y: profile.brightness[0] });
    return pts;
  }, [profile, n]);

  const pulses = profile.pulses;
  const share = (w: number) => `${Math.round((w / (2 * Math.PI)) * 100)}%`;
  const parts = (k: number) => (k === 1 ? 'one peak' : k === 2 ? 'two peaks' : k === 3 ? 'three peaks' : `${k} peaks`);
  const described =
    pulses.length === 0
      ? `Neither beam crosses our line of sight: the beam comes within ${Math.round(Math.min(...profile.closest) / DEG)}° of us at best, and it is ${rho}° wide. We see no pulses; this pulsar is invisible to us, though others may see it.`
      : pulses.length === 1 && pulses[0].width >= 2 * Math.PI - 1e-6
        ? 'One beam faces us all the time, so its light hardly changes as the star turns: no clear pulse.'
        : pulses.length === 1
          ? `One pulse a turn, from the ${pulses[0].beam === 1 ? 'upper' : 'lower'} beam, lasting ${share(pulses[0].width)} of a turn with ${parts(pulses[0].peaks)}.`
          : `Two pulses a turn, half a turn apart: a main pulse and an interpulse from the other beam, each lasting about ${share(pulses[0].width)} of a turn.`;
  const geometryText = `The magnetic axis is tilted ${alpha}° from the spin axis; we look from ${zeta}° off it; each beam is ${rho}° wide.`;
  const caption = `${geometryText} ${described}`;

  return (
    <Figure
      number={number}
      title="The pulsar lighthouse"
      description="A neutron star turning about its spin axis, with its magnetic axis tilted and a cone of radio waves round each magnetic pole. Each time a cone sweeps across our line of sight we see a pulse, as from a lighthouse; if both do, a pulse and an interpulse half a turn apart; if neither does, nothing. The pulses below are what a radio telescope on Earth would record."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'the beams (bright while one is on us)', symbol: <path d="M -8 -6 L 8 0 L -8 6 Z" fill="#f59e0b" fillOpacity="0.6" /> },
        { label: 'the magnetic axis', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f59e0b" strokeWidth="2" /> },
        { label: 'the spin axis', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" /> },
        { label: 'our line of sight', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--right)" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'the pulses we receive', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The beams are cones with a bright core and a ring, the pattern radio pulsars’ pulses suggest (Rankin 1983, 1993); real beams are patchier,
          and their widths shrink with the period (about 6° for a pulsar turning once a second, wider for faster ones). The star turns once in{' '}
          {TURN_TIME} seconds here; a real pulsar turns from once a minute to 700 times a second. The beams are drawn far longer than the star: they come
          from a few hundred kilometres up, and reach across the Galaxy.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={styles.presets} role="group" aria-label="Examples">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={figureStyles.toolButton} onClick={() => apply(p)}>
              {p.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Magnetic axis tilted by" value={alpha} min={0} max={90} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setAlpha(Math.round(v))} />
        <Slider label="Our line of sight from the spin axis" value={zeta} min={0} max={180} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setZeta(Math.round(v))} />
        <Slider label="Beam width" value={rho} min={3} max={40} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setRho(Math.round(v))} />
      </div>
      <Scene3D
        label="3D view of a pulsar and its beams"
        description={`${caption} ${onUs ? 'Right now a beam is on us.' : 'Right now neither beam is on us.'}`}
        factory={lighthouseScene}
        state={state}
        camera={CAMERA}
        limits={{ minDistance: 2.5, maxDistance: 12 }}
        cameraReset={cameraReset}
        height="clamp(280px, 50vw, 420px)"
        running={playing && !reducedMotion}
      />
      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying((p) => !p)} disabled={reducedMotion} aria-pressed={playing && !reducedMotion}>
          {playing && !reducedMotion ? 'Pause' : 'Turn the star'}
        </button>
        <Slider label="Turned" value={(phase / (2 * Math.PI)) * 360} min={0} max={359} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setPhase((v * Math.PI) / 180)} />
      </div>
      <p className={styles.panelTitle}>What a radio telescope receives, over {TURNS} turns</p>
      <ProfilePlot
        series={[{ name: 'pulses', color: 'var(--accent)', points: train }]}
        hideLegend
        xMin={0}
        xMax={TURNS}
        formatX={(x) => `${x}`}
        xLabel="Time (turns of the star)"
        yLabel="Brightness"
        yMin={0}
        yMax={1.1}
        formatY={(y) => (y === 0 ? '0' : y.toFixed(1))}
        ariaLabel={`The pulses over three turns. ${described}`}
        height={180}
      >
        {(sx, sy) => <line x1={sx(phase / (2 * Math.PI))} x2={sx(phase / (2 * Math.PI))} y1={sy(0)} y2={sy(1.1)} stroke="var(--text-muted)" strokeDasharray="3 3" />}
      </ProfilePlot>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
