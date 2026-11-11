import { useMemo, useState, type ReactNode } from 'react';
import { lagrangePoints, muOf } from '../core/binaries/roche';
import { Caption, Figure } from '../viz/Figure';
import { landscapeScene, type LandscapeState } from '../viz/potential/landscape';
import { PotentialMap, type ContourStyle } from '../viz/potential/PotentialMap';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { donorOutline, lobes, ROCHE_START, rocheGrid, rocheLevels, rocheStream } from './binaries28';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Roche potential explorer (Figure 28.1): two stars on a circular orbit, in
 * the frame turning with them. Their pulls and the centrifugal push make the
 * Roche potential, drawn as contours and as a landscape; the figure-of-eight
 * through L1 marks both Roche lobes. Swell the donor until it fills its lobe,
 * and gas spills through L1, swung round by the Coriolis force, to hit the
 * companion or miss it and circle it as a disc.
 */

const CAMERA: OrbitCameraState = { target: [0, 0, -0.35], azimuth: -1.75, elevation: 0.62, distance: 3.4 };

const fmt = (x: number, d = 2) => x.toFixed(d);

export function RocheFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [q, setQ] = useState<number>(ROCHE_START.q);
  const [fill, setFill] = useState<number>(ROCHE_START.fill);
  const [r2, setR2] = useState<number>(ROCHE_START.r2);
  const [cameraReset, setCameraReset] = useState(0);
  const reset = () => {
    setQ(ROCHE_START.q);
    setFill(ROCHE_START.fill);
    setR2(ROCHE_START.r2);
    setCameraReset((n) => n + 1);
  };

  const mu = muOf(q);
  const grid = useMemo(() => rocheGrid(q), [q]);
  const coarse = useMemo(() => rocheGrid(q, 97, 73), [q]);
  const levels = useMemo(() => rocheLevels(q), [q]);
  const points = useMemo(() => lagrangePoints(mu), [mu]);
  const outline = useMemo(() => donorOutline(q, fill), [q, fill]);
  const overflowing = fill >= 1;
  const stream = useMemo(() => (overflowing ? rocheStream(q, r2) : null), [overflowing, q, r2]);
  const [rl1, rl2] = lobes(q);

  const contours: ContourStyle[] = useMemo(
    () => [
      ...levels.inner.map((level) => ({ level, stroke: '#7d8fb8', width: 0.9, opacity: 0.7, within: 1.25 })),
      ...levels.outer.map((level) => ({ level, stroke: '#7d8fb8', width: 0.9, opacity: 0.7 })),
      { level: levels.l3, stroke: '#9aa8c4', width: 1.2, dash: '5 4' },
      { level: levels.l2, stroke: '#9aa8c4', width: 1.2, dash: '5 4', within: 1.4 },
      { level: levels.l1, stroke: '#f59e0b', width: 2.2, within: 1.25 },
    ],
    [levels],
  );

  const landscape: LandscapeState = useMemo(
    () => ({
      grid: coarse,
      floor: levels.floor,
      top: levels.rim,
      highlight: levels.l1,
      highlightWithin: 1.25,
      markers: [
        { id: 'donor', label: 'donor', x: -mu, y: 0, r: 0.05, color: '#f97316', emphasis: true },
        { id: 'accretor', label: 'companion', x: 1 - mu, y: 0, r: 0.05, color: '#93c5fd', emphasis: true },
        ...points.map((p) => ({ id: p.name, label: p.name, x: p.x, y: p.y, color: '#e2e8f5' })),
      ],
      path: stream ? stream.points.map((p) => [p.x, p.y] as const) : null,
    }),
    [coarse, levels, mu, points, stream],
  );

  const verdict = !overflowing
    ? `The donor fills ${Math.round(fill * 100)}% of the way to L1: it is inside its lobe, and keeps its gas.`
    : stream!.hits
      ? `The donor fills its lobe and gas spills through L1. Swung round by the Coriolis force, the stream would pass ${fmt(stream!.rMin, 3)} separations from the companion’s centre, but the companion’s radius is ${fmt(r2, 3)}, so the stream hits it.`
      : `The donor fills its lobe and gas spills through L1. Swung round by the Coriolis force, the stream passes ${fmt(stream!.rMin, 3)} separations from the companion’s centre, outside its radius of ${fmt(r2, 3)}: it misses, circles the companion and forms a disc about ${fmt(stream!.rCirc, 3)} separations out.`;
  const caption = `The donor is ${fmt(q, q < 1 ? 2 : 1)} times the companion’s mass. Its Roche lobe, the left loop of the orange figure of eight, is ${fmt(rl1, 3)} separations in radius (by volume); the companion’s is ${fmt(rl2, 3)}. L1 lies ${fmt(points[0].x + mu, 3)} separations from the donor. ${verdict}`;

  return (
    <Figure
      number={number}
      title="Roche potential explorer"
      description="Two stars on a circular orbit, seen in the frame turning with them. Their pulls and the centrifugal push make a landscape with a hollow round each star, joined by a pass at the inner Lagrange point L1; the figure of eight through L1 is the two stars' Roche lobes. A star that swells to fill its lobe spills gas through L1. The Coriolis force swings the stream round, so that it either hits the companion or misses it and circles it as a disc, which happens when the giving star is the lighter one."
      height={1180}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Roche lobes: the equipotential through L1', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f59e0b" strokeWidth="3" /> },
        { label: 'equipotentials through L2 and L3', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#9aa8c4" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'other equipotentials', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#7d8fb8" strokeWidth="1.5" /> },
        { label: 'the donor’s surface', symbol: <circle r="6" fill="#f97316" fillOpacity="0.55" stroke="#f97316" /> },
        { label: 'the companion', symbol: <circle r="6" fill="#93c5fd" /> },
        { label: 'gas leaving L1', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#2dd4bf" strokeWidth="3" /> },
      ]}
      simplified={
        <p>
          The stars are point masses on a circular orbit, each spinning with it, as Roche assumed; their own shapes follow the equipotentials. The gas
          is followed as single particles, released at L1 with a thousandth of the orbital speed and then falling freely; real streams have pressure
          and width, but Lubow and Shu (1975) showed the ballistic path is close. The disc’s radius is where gas with the stream’s angular
          momentum would orbit in a circle. The landscape’s wells are cut off at a floor, and its height is the potential, not a distance.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Mass ratio, donor ÷ companion" value={q} min={0.1} max={10} log step={0.01} format={(v) => fmt(v, v < 1 ? 2 : 1)} onChange={(v) => setQ(Number(v.toPrecision(2)))} />
        <Slider label="How far the donor reaches towards L1" value={fill} min={0.3} max={1} step={0.01} format={(v) => (v >= 1 ? 'fills its lobe' : `${Math.round(v * 100)}%`)} onChange={(v) => setFill(Math.round(v * 100) / 100)} />
        <Slider label="Companion’s radius" value={r2} min={0.01} max={0.3} step={0.005} format={(v) => `${fmt(v, 3)} separations`} onChange={(v) => setR2(Math.round(v * 1000) / 1000)} />
      </div>
      <div className={figureStyles.toolbar}>
        <button type="button" className={styles.toggle} aria-pressed={overflowing} onClick={() => setFill(overflowing ? ROCHE_START.fill : 1)}>
          {overflowing ? 'Shrink the donor' : 'Fill the lobe'}
        </button>
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>From above: lines of equal potential</p>
          <PotentialMap
            grid={grid}
            contours={contours}
            ariaLabel={`Contours of the Roche potential for a mass ratio of ${fmt(q)}. ${verdict}`}
          >
            {(sx, sy, unit) => (
              <g>
                {outline.length > 2 && (
                  <path d={outline.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join('') + 'Z'} fill="#f97316" fillOpacity="0.5" stroke="#f97316" strokeWidth="1.5" />
                )}
                <circle cx={sx(1 - mu)} cy={sy(0)} r={Math.max(2, r2 * unit)} fill="#93c5fd" />
                {stream && (
                  <>
                    <path d={stream.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('')} fill="none" stroke="#2dd4bf" strokeWidth="2.2" />
                    {!stream.hits && <circle cx={sx(1 - mu)} cy={sy(0)} r={stream.rCirc * unit} fill="none" stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3 3" />}
                  </>
                )}
                <text x={sx(-mu)} y={sy(0) + 4} textAnchor="middle" fontSize="12" fill="#fff7ed" fontWeight="700">
                  donor
                </text>
                <line x1={sx(0) - 5} x2={sx(0) + 5} y1={sy(0)} y2={sy(0)} stroke="#e2e8f5" />
                <line x1={sx(0)} x2={sx(0)} y1={sy(0) - 5} y2={sy(0) + 5} stroke="#e2e8f5" />
                {points.map((p) => (
                  <g key={p.name}>
                    <circle cx={sx(p.x)} cy={sy(p.y)} r="3" fill="#e2e8f5" />
                    <text x={sx(p.x) + 5} y={sy(p.y) - 6} fontSize="12" fill="#e2e8f5">
                      {p.name}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </PotentialMap>
        </div>
        <div>
          <p className={styles.panelTitle}>As a landscape: the lobes are two hollows joined at a pass</p>
          <Scene3D
            label="3D view of the Roche potential as a landscape"
            description={`The Roche potential as terrain: a deep hollow round each star, the donor’s ${q >= 1 ? 'the deeper' : 'the shallower'}, joined by a mountain pass at L1. L2 and L3 are passes on the far sides; L4 and L5 are hilltops. The orange line is the Roche lobes’ edge.${stream ? ` The stream runs from L1 ${stream.hits ? 'into the companion' : 'round the companion'}.` : ''}`}
            factory={landscapeScene}
            state={landscape}
            camera={CAMERA}
            limits={{ minDistance: 1.6, maxDistance: 7 }}
            cameraReset={cameraReset}
            height="clamp(260px, 44vw, 420px)"
          />
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
