import { useMemo, useState, type ReactNode } from 'react';
import { fromPhysics } from '../core/stars/hr';
import { TYPE_NAMES } from '../core/stellar/lives';
import { Caption, Figure } from '../viz/Figure';
import { HRDiagram } from '../viz/hr/HRDiagram';
import { LifeStrip } from '../viz/phases/LifeStrip';
import { stripPosition, stripTime, type StripScale } from '../viz/phases/strip';
import { ScatterChart } from '../viz/ScatterChart';
import { StarDisc } from '../viz/star/StarDisc';
import { Slider } from './Slider';
import { AU_IN_R_SUN, formatMyr, INNER_PLANETS, shortMyr, sunAt, sunDeath, sunLife, sunMilestones, sunPhases, SUN_AGE, swallowed, widenedOrbit } from './starLives';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Sun's life (Figure 17.2): its track on the HR diagram from the SSE
 * engine, scrubbed through time; the Sun drawn true beside the inner planets'
 * orbits, which widen as it loses mass; its luminosity, size or temperature
 * against time; and its phases as a strip, with today marked. Time can run
 * plainly or as "time before the end", so the last stages get room.
 */

type Quantity = 'L' | 'R' | 'T';
const QUANTITIES: { id: Quantity; name: string; label: string }[] = [
  { id: 'L', name: 'Luminosity', label: 'Luminosity (Suns today)' },
  { id: 'R', name: 'Radius', label: 'Radius (Suns today)' },
  { id: 'T', name: 'Temperature', label: 'Surface temperature (K)' },
];

const VIEW = 300;

export function SunLifeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const death = useMemo(() => sunDeath(), []);
  const phases = useMemo(() => sunPhases(), []);
  const milestones = useMemo(() => sunMilestones(), []);
  const track = sunLife();
  const [scale, setScale] = useState<StripScale>('linear');
  const [t, setT] = useState(SUN_AGE);
  const [quantity, setQuantity] = useState<Quantity>('L');
  const reset = () => {
    setScale('linear');
    setT(SUN_AGE);
    setQuantity('L');
  };

  const after = t >= death;
  const s = after ? track.steps.find((x) => x.kw >= 10)! : sunAt(t);
  const f = Math.min(1, stripPosition(Math.min(t, death), 0, death, scale));
  const gone = swallowed(s);
  const q = QUANTITIES.find((x) => x.id === quantity)!;
  const valueAt = (x: number) => {
    const st = sunAt(stripTime(Math.min(0.99999, Math.max(0, x)), 0, death, scale));
    return st[quantity];
  };

  // The view: the Sun at its size, the planets at their widened orbits, wide enough for Mars or the Sun, whichever is bigger.
  const half = Math.max(widenedOrbit(1.6, s.mt) * AU_IN_R_SUN, s.R * 1.1);
  const px = VIEW / 2 / half;
  // The living star's track, and the white dwarf's; SSE jumps from one to the other at once, so the jump is drawn dashed.
  const living = track.steps.filter((x) => x.kw < 10);
  const dead = track.steps.filter((x) => x.kw >= 10);
  const today = sunAt(SUN_AGE);

  return (
    <Figure
      number={number}
      title="The Sun’s life"
      description="The Sun’s whole life from the stellar-evolution engine: about 11 billion years on the main sequence, slowly brightening; then it swells into a red giant nearly as wide as Earth’s orbit is now, lights helium in its core, swells again and puffs off its outer layers, leaving a white dwarf of about half its mass. The track is drawn on the HR diagram; the Sun is drawn true beside the inner planets’ orbits, which widen as it loses mass; a strip shows its phases with today marked at 4.6 billion years."
      height={1180}
      tryThis={tryThis}
      onReset={reset}
      starForge="preset=sun"
      legend={[
        { label: 'the Sun’s track', symbol: <path d="M-10 6 L0 0 L10 -8" stroke="#cdd6f4" strokeWidth="2" fill="none" /> },
        { label: 'the Sun at the chosen time', symbol: <circle r="5" fill="#ffd27a" stroke="var(--accent)" strokeWidth="2" /> },
        { label: 'the planets’ orbits, widening as the Sun loses mass', symbol: <circle r="7" fill="none" stroke="var(--series-1)" strokeWidth="1.5" /> },
      ]}
      simplified={
        <p>
          The engine is SSE (Hurley, Pols &amp; Tout 2000) for a star of 1 solar mass and SSE’s solar make-up, starting on the zero-age main
          sequence. Its formulas make the Sun reach about {Math.round(milestones.agbMax.R)} times its present width at most; detailed models
          give up to about 250. SSE treats the last step from giant to white dwarf roughly: as the last of the envelope goes, the star crosses to
          the hot side at once, and the dashed line joins it to the white dwarf. In real stars that crossing takes some thousands of years, while
          the shed layers glow as a planetary nebula. The orbits widen as the Sun loses mass, but tides between the swollen Sun and the planets,
          which pull them in, are left out, so whether Earth survives is closer than the picture suggests.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Time runs">
          <span className={styles.togglesLabel}>Time runs</span>
          <button type="button" className={styles.toggle} aria-pressed={scale === 'linear'} onClick={() => setScale('linear')}>
            Evenly
          </button>
          <button type="button" className={styles.toggle} aria-pressed={scale === 'before-end'} onClick={() => setScale('before-end')}>
            As time before the end
          </button>
        </div>
        <Slider
          label="Time"
          value={after ? 1.0005 : f}
          min={0}
          max={1.0005}
          step={0.0005}
          format={() => (after ? 'A white dwarf' : `${formatMyr(t)}`)}
          onChange={(x) => setT(x > 1 ? death + 1 : stripTime(x, 0, death, scale))}
        />
        <div className={styles.presets} role="group" aria-label="Go to">
          {[
            { name: 'Today', t: SUN_AGE },
            { name: 'Leaving the main sequence', t: milestones.leavesMainSequence },
            { name: 'The red giant’s tip', t: milestones.tip.t - 0.01 },
            { name: 'The biggest it gets', t: milestones.agbMax.t },
            { name: 'A white dwarf', t: death + 1 },
          ].map((m) => (
            <button key={m.name} type="button" className={styles.toggle} aria-pressed={Math.abs(m.t - t) < 1e-6} onClick={() => setT(m.t)}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.panelTitle}>On the HR diagram</p>
      <HRDiagram
        axes="physicist"
        radiusLines
        markers={[
          { id: 'now', label: after ? 'white dwarf' : Math.abs(t - SUN_AGE) < 1 ? 'the Sun today' : 'the Sun then', point: fromPhysics(Math.min(45000, s.T), s.L), highlight: true },
          ...(Math.abs(t - SUN_AGE) > 300 ? [{ id: 'today', label: 'today', point: fromPhysics(today.T, today.L), side: 'left' as const }] : []),
        ]}
        ariaLabel={`The Sun’s track on the HR diagram. At ${formatMyr(t)} it is ${Math.round(s.T).toLocaleString('en-GB')} K and ${s.L.toPrecision(2)} times today’s luminosity.`}
      >
        {(place) => {
          const at = (x: { T: number; L: number }) => place(fromPhysics(Math.min(45000, x.T), x.L));
          const line = (pts: { T: number; L: number }[]) => pts.map((x, i) => `${i ? 'L' : 'M'}${at(x).join(' ')}`).join(' ');
          const [a, b] = [at(living[living.length - 1]), at(dead[0])];
          return (
            <g>
              <path d={line(living)} stroke="#cdd6f4" strokeWidth={1.8} fill="none" />
              <path d={`M${a.join(' ')} L${b.join(' ')}`} stroke="#cdd6f4" strokeWidth={1.4} strokeDasharray="5 5" fill="none" />
              <path d={line(dead)} stroke="#cdd6f4" strokeWidth={1.8} fill="none" />
            </g>
          );
        }}
      </HRDiagram>
      <div className={styles.split} style={{ marginTop: 10 }}>
        <div>
          <p className={styles.panelTitle}>Drawn true, from above</p>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" style={{ maxWidth: 420, background: '#070b16', borderRadius: 6 }} role="img" aria-label={`The Sun ${Math.round(s.R).toLocaleString('en-GB')} times its present width, with the inner planets’ orbits${gone.length ? `; it has swallowed ${gone.join(' and ')}` : ''}.`}>
            {INNER_PLANETS.map((p) => {
              const r = widenedOrbit(p.au, s.mt) * AU_IN_R_SUN * px;
              const inside = gone.includes(p.name);
              return (
                <g key={p.name}>
                  <circle cx={VIEW / 2} cy={VIEW / 2} r={r} fill="none" stroke="#8ecae6" strokeOpacity={inside ? 0.4 : 0.9} strokeDasharray={inside ? '3 4' : undefined} />
                </g>
              );
            })}
            {after ? (
              <circle cx={VIEW / 2} cy={VIEW / 2} r={1.2} fill="#fff" />
            ) : (
              <StarDisc cx={VIEW / 2} cy={VIEW / 2} r={Math.max(0.8, s.R * px)} kelvin={Math.min(40000, s.T)} title="The Sun" />
            )}
            {INNER_PLANETS.map((p) => {
              const r = widenedOrbit(p.au, s.mt) * AU_IN_R_SUN * px;
              return (
                <text key={p.name} x={VIEW / 2 + r * 0.71 + 3} y={VIEW / 2 - r * 0.71 - 3} fontSize="10.5" fill="#cdd6f4" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                  {p.name}
                </text>
              );
            })}
            <line x1={12} x2={12 + AU_IN_R_SUN * px} y1={VIEW - 14} y2={VIEW - 14} stroke="#cdd6f4" strokeWidth={2} />
            <text x={12} y={VIEW - 20} fontSize="10.5" fill="#cdd6f4">
              1 AU (Earth’s distance today)
            </text>
          </svg>
        </div>
        <div className={styles.card} aria-live="polite" style={{ marginTop: 0 }}>
          <p style={{ margin: 0 }}>
            <b>{after ? `After ${formatMyr(death)}` : `At ${formatMyr(t)}`}:</b> {after ? 'a carbon–oxygen white dwarf' : TYPE_NAMES[s.kw].toLowerCase()}.{' '}
            {Number(s.L.toPrecision(2)).toLocaleString('en-GB')} times today’s luminosity, {Number(s.R.toPrecision(2)).toLocaleString('en-GB')} times today’s radius,{' '}
            {Math.round(s.T).toLocaleString('en-GB')} K, {s.mt.toFixed(2)} of today’s mass.
          </p>
          <p style={{ margin: '6px 0 0' }}>
            {gone.length
              ? `Its surface has passed ${gone.join(' and ')}’s orbit. Earth’s orbit has widened to ${widenedOrbit(1, s.mt).toFixed(2)} AU.`
              : s.mt < 0.99
                ? `It has lost ${Math.round((1 - s.mt) * 100)}% of its mass, so the planets have drifted out: Earth to ${widenedOrbit(1, s.mt).toFixed(2)} AU.`
                : 'The planets are where they are today.'}
          </p>
        </div>
      </div>
      <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
        <span className={figureStyles.segmented} role="group" aria-label="Chart shows">
          {QUANTITIES.map((x) => (
            <button key={x.id} type="button" aria-pressed={quantity === x.id} onClick={() => setQuantity(x.id)}>
              {x.name}
            </button>
          ))}
        </span>
      </div>
      <ScatterChart
        groups={[]}
        lines={[{ name: q.name, color: 'var(--series-1)', f: valueAt }]}
        xScale="linear"
        yScale="log"
        xMin={0}
        xMax={1}
        yMin={quantity === 'T' ? 2000 : quantity === 'R' ? 0.5 : 0.3}
        yMax={quantity === 'T' ? 20000 : quantity === 'R' ? 400 : 10000}
        xLabel={scale === 'linear' ? 'Age' : 'Time left before it becomes a white dwarf'}
        yLabel={q.label}
        formatX={(x) => (scale === 'linear' ? shortMyr(stripTime(x, 0, death, scale)) : shortMyr(death - stripTime(x, 0, death, scale)))}
        highlight={after ? undefined : { x: f, y: s[quantity], label: after ? '' : 'then', color: 'var(--accent)' }}
        onPick={(x) => setT(stripTime(Math.min(0.99999, x), 0, death, scale))}
        height={300}
        ariaLabel={`The Sun’s ${q.name.toLowerCase()} through its life, against ${scale === 'linear' ? 'age' : 'time left'}.`}
      />
      <p className={styles.panelTitle} style={{ marginTop: 8 }}>
        Its phases
      </p>
      <LifeStrip phases={phases} scale={scale} now={after ? death + 1 : t} formatTime={shortMyr} ariaLabel={`The Sun’s phases: ${phases.map((p) => `${TYPE_NAMES[p.kw]} for ${formatMyr(p.end - p.start)}`).join('; ')}.`} />
      <Caption>
        {after
          ? `The Sun ends as a white dwarf of ${milestones.whiteDwarf.mass.toFixed(2)} solar masses, about the size of Earth, after ${formatMyr(death)}.`
          : t < milestones.leavesMainSequence
            ? `On the main sequence the Sun brightens slowly: ${s.L.toFixed(2)} times today’s luminosity at ${formatMyr(t)}.`
            : `The Sun has left the main sequence. It is ${TYPE_NAMES[s.kw].toLowerCase()}, ${Math.round(s.R)} times its present width.`}
      </Caption>
    </Figure>
  );
}
