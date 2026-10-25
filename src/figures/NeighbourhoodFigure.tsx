import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { lightYearsFromParsecs } from '../core/stars/distance';
import { Caption, Figure } from '../viz/Figure';
import { Scene3D } from '../viz/scene3d/Scene3D';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { CLASS_INFO, classCounts, CLASSES, describeNeighbour, dotSize, fainterThanSun, NEIGHBOURS, type StarClass } from './neighbourhood';
import { neighbourhoodScene, type NeighbourhoodState, type NeighbourPoint } from './neighbourhood/scene';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The neighbourhood: the stars within 10 parsecs (33 light-years) of the Sun
 * in 3D, coloured by type and sized by how much light they give out, each on
 * a stalk to the plane of the Galaxy. Turn it round, filter by type, and pick
 * a star (by clicking, or from the list) to see what it is.
 */

const CAMERA: OrbitCameraState = { target: [0, 0, 0], azimuth: -Math.PI / 2 + 0.5, elevation: 0.45, distance: 27 };

const COUNTS = classCounts();
const FAINTER = fainterThanSun();
const ALL_SHOWN = Object.fromEntries(CLASSES.map((c) => [c, true])) as Record<StarClass, boolean>;
const POINTS: readonly NeighbourPoint[] = NEIGHBOURS.map((s) => ({
  position: s.position,
  colour: CLASS_INFO[s.cls].colour,
  size: dotSize(s.absmag),
  label: s.name !== s.gl && !s.name.startsWith('HIP') && !s.name.startsWith('GJ') ? s.name : null,
  priority: 40 - s.absmag,
}));
/** The stars in the "Pick a star" list: every one with a name, nearest first. */
const NAMED = NEIGHBOURS.map((s, i) => ({ i, s })).filter(({ i }) => POINTS[i].label !== null);

export function NeighbourhoodFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [shownClasses, setShownClasses] = useState<Record<StarClass, boolean>>(ALL_SHOWN);
  const [selected, setSelected] = useState<number | null>(null);
  const [cameraReset, setCameraReset] = useState(0);
  const listId = useId();

  const onPick = useCallback((i: number | null) => setSelected(i), []);
  const shown = useMemo(() => NEIGHBOURS.map((s) => shownClasses[s.cls]), [shownClasses]);
  const state: NeighbourhoodState = useMemo(() => ({ points: POINTS, shown, selected, onPick }), [shown, selected, onPick]);

  const reset = () => {
    setShownClasses(ALL_SHOWN);
    setSelected(null);
    setCameraReset((n) => n + 1);
  };

  const total = NEIGHBOURS.length;
  const visibleCount = shown.filter(Boolean).length;
  const star = selected === null ? null : NEIGHBOURS[selected];
  const summary = `${total} stars within 10 parsecs (33 light-years) of the Sun: ${COUNTS.M} red dwarfs, ${COUNTS.K} orange K stars, ${COUNTS.G} yellow G stars like the Sun, ${COUNTS.F} F stars, ${COUNTS.A} white A stars and ${COUNTS.D} white dwarfs. The Sun gives out more light than ${Math.round(100 * FAINTER)}% of them.`;
  const caption = star ? describeNeighbour(star) : visibleCount === total ? summary : `Showing ${visibleCount} of the ${total} stars within 10 parsecs.`;

  return (
    <Figure
      number={number}
      title="The neighbourhood"
      description={`A 3D map of the ${total} known stars within 10 parsecs (33 light-years) of the Sun, at their real positions, with the Sun at the centre and the plane of the Milky Way as rings every 2 parsecs. Each star is coloured by its type and sized by how much light it gives out. Most are small, faint red dwarfs; only a handful are brighter than the Sun.`}
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...CLASSES.map((c) => ({ label: `${CLASS_INFO[c].name} (${COUNTS[c]})`, symbol: onSky(<circle r={c === 'M' ? 3 : c === 'D' ? 2.5 : 5} fill={CLASS_INFO[c].colour} />) })),
        { label: 'the Sun', symbol: onSky(<circle r="5" fill="var(--sun)" />) },
        { label: 'a star’s height above or below the Galaxy’s plane', symbol: onSky(<path d="M0 -8 V6 M-8 6 H8" stroke="#5c6b8a" />) },
      ]}
      simplified={
        <p>
          The stars and their distances come from the HYG catalogue, which has the Gliese catalogue’s nearby stars; dots are far bigger than
          stars. A careful modern census (Reylé et al. 2021) finds 375 stars within 10 parsecs, including more faint red dwarfs, plus 85 brown
          dwarfs too dim for these catalogues, and 77 known planets. Types for {NEIGHBOURS.filter((s) => s.guessed).length} faint stars with no
          measured spectrum are estimated from their colour.
        </p>
      }
    >
      <div>
        <div className={styles.presets} role="group" aria-label="Show stars of type" style={{ marginBottom: 10 }}>
          {CLASSES.map((c) => (
            <button key={c} type="button" className={styles.toggle} aria-pressed={shownClasses[c]} onClick={() => setShownClasses((s) => ({ ...s, [c]: !s[c] }))}>
              {CLASS_INFO[c].name}
            </button>
          ))}
        </div>
        <Scene3D
          label="The stars within 10 parsecs of the Sun"
          description={`${summary} ${star ? `Picked: ${describeNeighbour(star)}` : ''}`}
          factory={neighbourhoodScene}
          state={state}
          camera={CAMERA}
          limits={{ minDistance: 4, maxDistance: 60 }}
          cameraReset={cameraReset}
          height="clamp(300px, 56vw, 480px)"
        />
        <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
          <label className={figureStyles.inputLabel} htmlFor={listId}>
            Pick a star
          </label>
          <select
            id={listId}
            className={figureStyles.textInput}
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">None</option>
            {NAMED.map(({ i, s }) => (
              <option key={i} value={i}>
                {s.name} ({lightYearsFromParsecs(s.distance).toFixed(1)} ly)
              </option>
            ))}
          </select>
        </div>
        {star && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h4 className={styles.cardTitle}>
                {star.name} <span className={styles.cardSubtitle}>· {CLASS_INFO[star.cls].name}</span>
              </h4>
              <button type="button" className={figureStyles.toolButton} onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <p className={styles.hint}>{describeNeighbour(star)}</p>
          </div>
        )}
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
