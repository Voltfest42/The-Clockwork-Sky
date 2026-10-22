import { useRef, useState, type ReactNode } from 'react';
import { RUNGS, ZOOM_MAX, ZOOM_MIN, type ZoomObject } from '../core/scale/catalogue';
import { formatEarths, formatKilometres, formatLength } from '../core/scale/format';
import { formatScientific, powerOfTen } from '../core/math/scientific';
import { clamp } from '../core/math/angles';
import { LIGHT_YEAR } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ScaleZoom } from '../viz/scaleZoom/ScaleZoom';
import { zoomObjectsToday } from './zoomObjects';
import figureStyles from './figures.module.css';
import styles from './ZoomFigure.module.css';

/** Where the zoom starts: just wide enough to see the whole person. */
const START = 0.65;

export function ZoomFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const objects = zoomObjectsToday();
  const [power, setPower] = useState(START);
  const [selected, setSelected] = useState<string | null>(null);
  const [touring, setTouring] = useState<'out' | 'in' | null>(null);
  const reducedMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const stepClock = useRef(0);

  // The tour glides at two powers of ten a second; with reduced motion it jumps a whole power of ten every 1.2 s instead.
  useAnimationFrame(touring !== null && onScreen, (dt) => {
    const direction = touring === 'out' ? 1 : -1;
    let next: number;
    if (reducedMotion) {
      stepClock.current += dt;
      if (stepClock.current < 1.2) return;
      stepClock.current = 0;
      next = direction > 0 ? Math.floor(power + 1e-9) + 1 : Math.ceil(power - 1e-9) - 1;
    } else {
      next = power + direction * 0.5 * dt;
    }
    next = clamp(next, ZOOM_MIN, ZOOM_MAX);
    setPower(next);
    if (next === ZOOM_MIN || next === ZOOM_MAX) setTouring(null);
  });

  const reset = () => {
    setPower(START);
    setSelected(null);
    setTouring(null);
  };

  const tour = (direction: 'out' | 'in') => {
    stepClock.current = 1.2;
    setTouring((t) => (t === direction ? null : direction));
  };

  const object = objects.find((o) => o.id === selected) ?? null;
  const rung = Math.round(clamp(power, 0, RUNGS.length - 1));

  return (
    <Figure
      number={number}
      title="The zoom: from you to the Milky Way"
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'drawn at its true size', symbol: <circle r="7" fill="#4f8fe0" /> },
        { label: 'smaller than a pixel: shown as a dot', symbol: <circle r="2.5" fill="var(--text)" /> },
        { label: 'a region (a belt or cloud)', symbol: <circle r="6" fill="none" stroke="#b8a888" strokeWidth="4" opacity="0.6" /> },
        { label: 'a boundary', symbol: <circle r="7" fill="none" stroke="#8fb0e8" strokeWidth="1.5" strokeDasharray="3 3" /> },
        { label: 'an orbit', symbol: <circle r="7" fill="none" stroke="var(--text-muted)" strokeWidth="1" /> },
      ]}
      simplified={
        <>
          <p>
            Sizes and distances are true. Directions are flattened: Earth is seen from straight above you, the planets from above their orbits, and
            the stars from above the Milky Way. Anything above or below those planes (Voyager 1, most stars) is swung down into the picture at its
            true distance.
          </p>
          <p>
            The planets are at their average distances, roughly where they are today, and the Moon at its average distance. The Oort cloud’s size is
            an estimate, and the Milky Way is a sketch: the shapes of its arms are still being mapped from inside. Anything too small to see is drawn
            as a dot so you can find it.
          </p>
        </>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button
            type="button"
            className={figureStyles.toolButton}
            aria-pressed={touring === 'out'}
            onClick={() => tour('out')}
            disabled={power >= ZOOM_MAX}
          >
            {touring === 'out' ? '❚❚ Stop' : '▶ Fly out'}
          </button>
          <button
            type="button"
            className={figureStyles.toolButton}
            aria-pressed={touring === 'in'}
            onClick={() => tour('in')}
            disabled={power <= ZOOM_MIN}
          >
            {touring === 'in' ? '❚❚ Stop' : '◀ Fly back in'}
          </button>
          <label className={figureStyles.inputLabel}>
            Go to
            <select
              className={styles.select}
              value=""
              onChange={(e) => {
                const target = objects.find((o) => o.id === e.target.value);
                if (!target) return;
                setTouring(null);
                setPower(target.goTo);
                setSelected(target.id);
              }}
            >
              <option value="">Choose…</option>
              {[...objects]
                .filter((o) => o.kind !== 'marker')
                .sort((a, b) => a.goTo - b.goTo)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <ScaleZoom objects={objects} power={power} onPower={setPower} selected={selected} onSelect={setSelected} onManual={() => setTouring(null)} />

        <div className={styles.info} aria-live="polite">
          {object ? (
            <ObjectInfo object={object} onGo={() => setPower(object.goTo)} onClose={() => setSelected(null)} />
          ) : (
            <p className={styles.infoHint}>Pick anything in the view to see how big it is.</p>
          )}
        </div>
      </div>
      <Caption>
        <b>
          {powerOfTen(rung)} m across{rung === 0 ? '' : `, ${rung} ${rung === 1 ? 'step' : 'steps'} of ×10 from 1 m`}:
        </b>{' '}
        {RUNGS[rung]}
      </Caption>
    </Figure>
  );
}

/** How big an object is, in metres, kilometres and Earths. */
function ObjectInfo({ object, onGo, onClose }: { object: ZoomObject; onGo: () => void; onClose: () => void }) {
  const ring = object.kind === 'ring' || object.kind === 'circle';
  const across = object.acrossLy ? `about ${object.acrossLy.toLocaleString('en-GB')} light-years` : formatLength(object.diameter);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{object.name}</h3>
        <button type="button" className={figureStyles.toolButton} onClick={onGo}>
          Zoom to it
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={onClose} aria-label={`Close the details of ${object.name}`}>
          ✕
        </button>
      </div>
      {object.diameter > 0 && (
        <dl className={styles.sizes}>
          <div>
            <dt>{ring ? 'Across, outer edge' : object.kind === 'person' ? 'Length' : 'Across'}</dt>
            <dd>{across}</dd>
          </div>
          <div>
            <dt>In metres</dt>
            <dd>{formatScientific(object.diameter, 3)} m</dd>
          </div>
          {!across.endsWith(' km') && (
            <div>
              <dt>In kilometres</dt>
              <dd>{object.diameter < 1000 ? `${formatScientific(object.diameter / 1000, 3)} km` : formatKilometres(object.diameter)}</dd>
            </div>
          )}
          <div>
            <dt>In Earths</dt>
            <dd>{formatEarths(object.diameter)}</dd>
          </div>
          {object.diameter > 0.1 * LIGHT_YEAR && !object.acrossLy && (
            <div>
              <dt>In light-years</dt>
              <dd>{formatLength(object.diameter)}</dd>
            </div>
          )}
        </dl>
      )}
      {object.where && <p className={styles.where}>{object.where}.</p>}
      <p className={styles.fact}>{object.fact}</p>
    </div>
  );
}
