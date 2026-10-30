import { useId, useMemo, useState, type ReactNode } from 'react';
import { DEG } from '../core/units';
import { MOONS_AS_OF, SATURN_RINGS_KM, WORLDS, worldById, type World, type WorldId } from '../data/planets';
import { SATURN_RING_TEXTURE, TEXTURES } from '../data/textures';
import { Caption, Figure } from '../viz/Figure';
import { useReducedMotion } from '../viz/hooks';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { ageThere, compareSizes, formatHours, formatYear, lowerThe, threeFigures, weightThere } from './planetCards';
import { pairCamera, planetPairScene, type CardGlobe, type PlanetPairState } from './planetCards/scene';
import figureStyles from './figures.module.css';
import tableStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Planet cards: compare any two worlds, side by side as globes at their true
 * relative sizes (spinning at their true relative rates when played), with a
 * table of their sizes, gravity (your weight there), days and years (your
 * age there), temperatures, atmospheres and moons.
 */

const SPEEDS = [
  { label: '1 hour a second', hours: 1 },
  { label: '1 day a second', hours: 24 },
] as const;

function globeFor(world: World, scale: number): CardGlobe {
  const radius = (world.diameterKm / 2) * scale;
  return {
    id: world.id,
    name: world.name,
    radius,
    colour: world.colour,
    texture: TEXTURES[world.id],
    tilt: world.tiltDeg * DEG,
    rotationHours: world.rotationHours,
    rings:
      world.id === 'saturn'
        ? { inner: SATURN_RINGS_KM.inner * scale, outer: SATURN_RINGS_KM.outer * scale, texture: SATURN_RING_TEXTURE }
        : null,
  };
}

function spinWords(world: World): string {
  const backwards = world.rotationHours < 0 || world.tiltDeg > 90;
  return `${formatHours(world.rotationHours)}${backwards ? ', backwards' : ''}`;
}

function temperatureWords(world: World): string {
  const t = `${world.temperatureC < 0 ? '−' : ''}${Math.abs(world.temperatureC)} °C`;
  return world.temperatureNote ? `${t} on average, ${world.temperatureNote}` : `${t} on average`;
}

function atmosphereWords(world: World): string {
  if (world.pressureBar === null) return `No solid surface. ${world.atmosphere}.`;
  if (world.pressureBar === 0) return `${world.atmosphere}.`;
  const p = world.pressureBar >= 1 ? `${threeFigures(world.pressureBar)} times Earth’s air pressure` : `${(world.pressureBar * 100).toFixed(1)}% of Earth’s air pressure`;
  return world.id === 'earth' ? `${world.atmosphere}.` : `${p}: ${world.atmosphere}.`;
}

export function PlanetCardsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [leftId, setLeftId] = useState<WorldId>('earth');
  const [rightId, setRightId] = useState<WorldId>('jupiter');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(30);
  const [cameraReset, setCameraReset] = useState(0);
  const reducedMotion = useReducedMotion();
  const ids = { left: useId(), right: useId(), weight: useId(), age: useId() };

  const left = worldById(leftId);
  const right = worldById(rightId);
  const scale = 1 / (Math.max(left.diameterKm, right.diameterKm) / 2);
  const state: PlanetPairState = useMemo(
    () => ({ left: globeFor(left, scale), right: globeFor(right, scale), hoursPerSecond: SPEEDS[speed].hours }),
    [left, right, scale, speed],
  );
  const camera = useMemo(() => pairCamera(state.left, state.right), [state.left, state.right]);

  const choose = (side: 'left' | 'right', id: WorldId) => {
    (side === 'left' ? setLeftId : setRightId)(id);
    setCameraReset((n) => n + 1);
  };
  const reset = () => {
    setLeftId('earth');
    setRightId('jupiter');
    setPlaying(false);
    setSpeed(0);
    setWeight(70);
    setAge(30);
    setCameraReset((n) => n + 1);
  };

  const rows: [string, (w: World) => ReactNode][] = [
    ['Width', (w) => `${w.diameterKm.toLocaleString('en-GB')} km (${threeFigures(w.diameterKm / 12_756)} × Earth)`],
    ['Mass', (w) => `${threeFigures(w.mass)} × Earth`],
    ['Gravity', (w) => `${threeFigures(w.gravity)} × Earth’s${w.kind === 'gas giant' || w.kind === 'ice giant' ? ', at the cloud tops' : ''}`],
    ['A scale would read', (w) => <b>{Math.round(weightThere(weight, w))} kg</b>],
    ['Spins once in', spinWords],
    ['A day, noon to noon', (w) => formatHours(w.dayHours)],
    ['A year', (w) => (w.id === 'moon' ? '365 days, going round the Sun with Earth (and once round Earth in 27.3 days)' : formatYear(w))],
    ['Your age there', (w) => <b>{w.id === 'moon' ? age : threeFigures(ageThere(age, w))} years</b>],
    ['Tilt of the axis', (w) => `${w.tiltDeg < 1 ? w.tiltDeg.toFixed(2) : w.tiltDeg.toFixed(1)}°`],
    ['Temperature', temperatureWords],
    ['Atmosphere', atmosphereWords],
    [`Known moons (${MOONS_AS_OF})`, (w) => `${w.moons}${w.moonNote ? `, ${w.moonNote}` : ''}`],
    ['Rings', (w) => (w.rings ? 'Yes' : 'No')],
  ];

  const caption = `${compareSizes(right, left)} Someone who weighs ${weight} kg on Earth would weigh ${Math.round(weightThere(weight, left))} kg on ${lowerThe(left.name)} and ${Math.round(weightThere(weight, right))} kg on ${lowerThe(right.name)}${playing ? `, and ${left.rotationHours === right.rotationHours ? 'both spin at the same rate' : `${Math.abs(left.rotationHours) < Math.abs(right.rotationHours) ? left.name : right.name} spins faster`}` : ''}.`;

  return (
    <Figure
      number={number}
      title="Planet cards"
      description="Two worlds side by side as 3D globes at their true relative sizes, with real maps of their surfaces or cloud tops, each tilted and spinning at its own rate. Any two of the eight planets and the Moon can be compared: their width, mass and gravity (and what you would weigh there), their days and years (and how old you would be), their tilt, temperature, atmosphere and moons."
      height={1180}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The globes are real maps (the giants’ cloud tops, and Venus’s clouds) on smooth spheres: no mountains, no flattening of the fast-spinning
          giants, and no glowing atmospheres. The Moon counts as a world here, though it isn’t a planet. Gravity for the giant planets is at the level
          where the pressure is the same as at Earth’s surface, high in their clouds.
        </p>
      }
    >
      <div>
        <div className={figureStyles.toolbar}>
          <label className={figureStyles.inputLabel} htmlFor={ids.left}>
            Left
          </label>
          <select id={ids.left} className={figureStyles.textInput} value={leftId} onChange={(e) => choose('left', e.target.value as WorldId)}>
            {WORLDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <label className={figureStyles.inputLabel} htmlFor={ids.right}>
            Right
          </label>
          <select id={ids.right} className={figureStyles.textInput} value={rightId} onChange={(e) => choose('right', e.target.value as WorldId)}>
            {WORLDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)} disabled={reducedMotion}>
            {playing ? '❚❚ Stop spinning' : '▶ Spin'}
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="Speed">
            {SPEEDS.map((s, i) => (
              <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        <Scene3D
          label={`${left.name} and ${lowerThe(right.name)} side by side, to scale`}
          description={`${left.name} on the left and ${lowerThe(right.name)} on the right, drawn to the same scale. ${compareSizes(right, left)}`}
          factory={planetPairScene}
          state={state}
          running={playing && !reducedMotion}
          camera={camera}
          limits={{ minDistance: 0.6, maxDistance: 40 }}
          cameraReset={cameraReset}
          height="clamp(240px, 40vw, 360px)"
        />
        <div className={styles.split} style={{ marginTop: 10 }}>
          <label className={styles.slider}>
            Your weight on Earth
            <input id={ids.weight} type="range" min={10} max={150} step={1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} aria-valuetext={`${weight} kg`} />
            <output>{weight} kg</output>
          </label>
          <label className={styles.slider}>
            Your age
            <input id={ids.age} type="range" min={1} max={100} step={1} value={age} onChange={(e) => setAge(Number(e.target.value))} aria-valuetext={`${age} years`} />
            <output>{age} years</output>
          </label>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={tableStyles.table}>
            <caption className="visually-hidden">
              {left.name} and {lowerThe(right.name)} compared
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Fact</span>
                </th>
                <th scope="col">{left.name}</th>
                <th scope="col">{right.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, value]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{value(left)}</td>
                  <td>{value(right)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.hint}>
          {left.note} {right.id !== left.id && right.note}
        </p>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
