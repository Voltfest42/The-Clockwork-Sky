import { useMemo, useState, type ReactNode } from 'react';
import { sampleGalaxy, type GalaxyPart } from '../core/galaxy/model';
import { MILKY_WAY } from '../data/galaxy';
import { Caption, Figure } from '../viz/Figure';
import { rgb } from '../viz/particles/colour';
import { particleScene, type ParticleOverlay, type ParticleState } from '../viz/particles/scene';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { GALACTIC_YEAR, GALAXY_PART_INFO } from './crowds';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Galaxy from outside (Figure 30.2): a model Milky Way as points, its
 * parts switchable: the thin disc with its arms, the thick disc, the bar and
 * bulge, the stellar halo and the globular clusters, with the Sun and its
 * orbit marked. A model, not a map: no one has seen the Milky Way from
 * outside.
 */

const PARTS: readonly GalaxyPart[] = ['thin', 'thick', 'bar', 'halo', 'globulars'];
const ALL_ON: Record<GalaxyPart, boolean> = { thin: true, thick: true, bar: true, halo: true, globulars: true };

const VIEWS: Record<string, { label: string; camera: OrbitCameraState }> = {
  face: { label: 'Face on', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 1.45, distance: 50 } },
  edge: { label: 'Edge on', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 0.03, distance: 50 } },
  sun: { label: 'Behind the Sun', camera: { target: [-MILKY_WAY.sunRadius, 0, 0], azimuth: Math.PI * 0.94, elevation: 0.14, distance: 10 } },
};

export function GalaxyOutsideFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [shown, setShown] = useState(ALL_ON);
  const [view, setView] = useState('face');
  const [cameraReset, setCameraReset] = useState(0);
  const reset = () => {
    setShown(ALL_ON);
    setView('face');
    setCameraReset((k) => k + 1);
  };
  const choose = (v: string) => {
    setView(v);
    setCameraReset((k) => k + 1);
  };

  const clouds = useMemo(() => sampleGalaxy(MILKY_WAY), []);
  const base = useMemo(() => {
    const total = clouds.reduce((s, c) => s + c.positions.length / 3, 0);
    const positions = new Float32Array(3 * total);
    const colours = new Float32Array(3 * total);
    let at = 0;
    for (const cloud of clouds) {
      positions.set(cloud.positions, 3 * at);
      const colour = rgb(GALAXY_PART_INFO[cloud.part].colour);
      const n = cloud.positions.length / 3;
      for (let i = 0; i < n; i++) {
        // The thin disc's arms are brighter
        const k = cloud.armness ? 0.55 + 0.45 * cloud.armness[i] : 1;
        colours.set([colour[0] * k, colour[1] * k, colour[2] * k], 3 * (at + i));
      }
      at += n;
    }
    return { positions, colours };
  }, [clouds]);

  const sizes = useMemo(() => {
    const out = new Float32Array(base.positions.length / 3);
    let at = 0;
    for (const cloud of clouds) {
      const n = cloud.positions.length / 3;
      out.fill(shown[cloud.part] ? GALAXY_PART_INFO[cloud.part].size : 0, at, at + n);
      at += n;
    }
    return out;
  }, [clouds, base, shown]);

  const overlay = useMemo<ParticleOverlay>(() => {
    const R = MILKY_WAY.sunRadius;
    return {
      rings: [
        { centre: [0, 0, 0], radius: R, colour: '#fde68a', dashed: true },
        { centre: [0, 0, 0], radius: 20, colour: '#475569' },
      ],
      markers: [{ position: [-R, 0, MILKY_WAY.sunHeight], colour: '#fde68a', size: 9 }],
      labels: [
        { text: 'Sun', position: [-R, 0, MILKY_WAY.sunHeight], priority: 100, emphasis: true },
        { text: 'Sagittarius A*', position: [0, 0, 0], priority: 60 },
        { text: '20 kpc', position: [14.1, -14.1, 0], priority: 20 },
      ],
    };
  }, []);

  const state = useMemo<ParticleState>(() => ({ positions: base.positions, colours: base.colours, sizes, overlay, additive: true, opacity: 0.3 }), [base, sizes, overlay]);

  const on = PARTS.filter((p) => shown[p]);
  const caption = `${on.length === 0 ? 'Every part is hidden.' : `Showing ${list(on.map((p) => `the ${GALAXY_PART_INFO[p].label.toLowerCase()} (${GALAXY_PART_INFO[p].what})`))}.`} The Sun is ${MILKY_WAY.sunRadius} kpc from the centre and ${Math.round(MILKY_WAY.sunHeight * 1000)} pc above the midplane, going round at ${MILKY_WAY.circularSpeed} km/s, once every ${Math.round(GALACTIC_YEAR / 10) * 10} million years.`;

  return (
    <Figure
      number={number}
      title="The Galaxy from outside"
      description="A model of the Milky Way seen from outside, as points: a thin disc with four spiral arms, a thicker and older disc, a bar and bulge in the middle, a sparse halo of old stars and about 160 globular clusters, with the Sun 8.2 kpc from the centre. Each part can be switched off, and the view turned face on, edge on or from just behind the Sun."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...PARTS.map((p) => ({
          label: GALAXY_PART_INFO[p].label,
          symbol: (
            <>
              <circle r="10" fill="#070b16" />
              <circle r={p === 'globulars' ? 4 : 3} fill={GALAXY_PART_INFO[p].colour} />
            </>
          ),
        })),
        {
          label: 'the Sun and its orbit',
          symbol: (
            <>
              <circle r="10" fill="#070b16" />
              <circle r="6.5" fill="none" stroke="#fde68a" strokeDasharray="3 2" />
              <circle r="2.5" fill="#fde68a" />
            </>
          ),
        },
      ]}
      simplified={
        <p>
          A model drawn from simple formulas, not a map: we see the Milky Way only from inside, through its dust. The parts’ sizes are measured
          (Bland-Hawthorn and Gerhard 2016), but how many dots each gets is chosen to show it, not to weigh it: the thin disc holds most of the
          stars, the halo about 1%. The arms follow the course’s sketch (four arms of 12°); how many arms the Milky Way has, and where, is still
          debated. The dark halo, by far the heaviest part, can’t be drawn: it would fill a ball about ten times wider than this view.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={styles.togglesLabel}>Show:</span>
        {PARTS.map((p) => (
          <button key={p} type="button" className={styles.toggle} aria-pressed={shown[p]} onClick={() => setShown((s) => ({ ...s, [p]: !s[p] }))}>
            {GALAXY_PART_INFO[p].label}
          </button>
        ))}
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="View">
          {Object.entries(VIEWS).map(([id, v]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => choose(id)}>
              {v.label}
            </button>
          ))}
        </span>
      </div>
      <Scene3D
        label="3D view of a model Milky Way"
        description={caption}
        factory={particleScene}
        state={state}
        camera={VIEWS[view].camera}
        limits={{ minDistance: 1, maxDistance: 400 }}
        cameraReset={cameraReset}
      />
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
