import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { MODEL_S_MASS, SOLAR, solarShells } from './holding';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';
import figureStyles from './figures.module.css';

/**
 * Shells (Figure T9.1): the Sun's mass added up from Model S's density, shell
 * by shell. Each shell's mass is its area, 4πr², times its thickness times its
 * density; the sum converges on one solar mass as the shells get thinner.
 */

const COUNTS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50, 100, 200];
const START = 4; // five shells
const D = 220;

export function ShellsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [choice, setChoice] = useState(START);
  const reset = () => setChoice(START);
  const count = COUNTS[choice];
  const shells = solarShells(count);
  const total = shells.reduce((a, s) => a + s.mass, 0) / MODEL_S_MASS;
  const cumulative = [{ x: 0, y: 0 }];
  for (const s of shells) cumulative.push({ x: s.to, y: cumulative[cumulative.length - 1].y + s.mass / MODEL_S_MASS });
  const heaviest = shells.reduce((a, s) => (s.mass > a.mass ? s : a), shells[0]);
  const maxShare = Math.max(...shells.map((s) => s.mass / MODEL_S_MASS));
  const off = (total - 1) * 100;

  return (
    <Figure
      number={number}
      title="Shells"
      description="The Sun cut into shells, from one to two hundred. Each shell’s mass is its area times its thickness times its density, taken from Model S at its middle; added up, they give the Sun’s mass. With few, thick shells the sum is well off; as they get thinner it settles on one solar mass. That limit is the integral."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'each shell’s mass', symbol: <rect x="-8" y="-6" width="16" height="12" fill="var(--series-1)" fillOpacity={0.7} /> },
        { label: 'mass added up so far', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'Model S’s mass inside', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--series-2)" strokeWidth="3" strokeDasharray="4 3" /> },
      ]}
      simplified={<p>Each shell’s density is Model S’s at its middle, found by straight-line interpolation between the model’s 117 tabulated shells.</p>}
    >
      <div className={styles.controls}>
        <Slider label="Shells" value={choice} min={0} max={COUNTS.length - 1} step={1} format={(k) => String(COUNTS[Math.round(k)])} onChange={(k) => setChoice(Math.round(k))} />
      </div>
      <div className={figureStyles.withSide}>
        <ProfilePlot
          series={[
            { name: 'added up', color: 'var(--accent)', points: cumulative },
            { name: 'Model S', color: 'var(--series-2)', dashed: true, points: SOLAR.map((s) => ({ x: s.x, y: s.m / MODEL_S_MASS })) },
          ]}
          hideLegend
          yMin={0}
          yMax={1.6}
          xLabel="Distance from the centre (fraction of the radius)"
          yLabel="Mass (Suns)"
          ariaLabel={`The Sun’s mass added up over ${count} shells: ${total.toFixed(3)} solar masses`}
          height={280}
        >
          {(sx, sy) => (
            <g>
              {shells.map((s) => (
                <rect
                  key={s.from}
                  x={sx(s.from)}
                  y={sy((s.mass / MODEL_S_MASS / maxShare) * 0.5)}
                  width={Math.max(0.5, sx(s.to) - sx(s.from) - (count <= 50 ? 1 : 0))}
                  height={sy(0) - sy((s.mass / MODEL_S_MASS / maxShare) * 0.5)}
                  fill="var(--series-1)"
                  fillOpacity={0.55}
                >
                  <title>{`${s.from.toFixed(2)}–${s.to.toFixed(2)} R☉: ${(s.mass / MODEL_S_MASS).toFixed(3)} of the Sun’s mass`}</title>
                </rect>
              ))}
            </g>
          )}
        </ProfilePlot>
        <div>
          <svg viewBox={`0 0 ${D} ${D}`} width="100%" style={{ maxWidth: 240, display: 'block', margin: '0 auto' }} role="img" aria-label={`The Sun cut into ${count} shells`}>
            {shells
              .slice()
              .reverse()
              .map((s) => {
                const shade = 0.2 + 0.75 * Math.max(0, Math.log10(s.rho / 0.2) / Math.log10(154_000 / 0.2));
                return <circle key={s.from} cx={D / 2} cy={D / 2} r={Math.max(0.5, (s.to * D) / 2 - 1)} fill="var(--sun)" fillOpacity={shade} stroke={count <= 50 ? 'var(--bg)' : 'none'} strokeWidth="0.8" />;
              })}
          </svg>
          <dl className={styles.facts}>
            <div>
              <dt>Added up</dt>
              <dd>{total.toFixed(3)} solar masses</dd>
            </div>
            <div>
              <dt>Off by</dt>
              <dd>{Math.abs(off) < 0.05 ? 'under 0.05%' : `${off > 0 ? '+' : '−'}${Math.abs(off) >= 10 ? Math.round(Math.abs(off)) : Math.abs(off).toFixed(1)}%`}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Caption>
        {`${count} shell${count > 1 ? 's' : ''} give ${total.toFixed(3)} solar masses. `}
        {count >= 10
          ? `The heaviest shell is the one at ${heaviest.from.toFixed(2)}–${heaviest.to.toFixed(2)} of the radius, not the centre: the density is highest in the middle, but shells farther out are much bigger.`
          : 'With so few shells, each takes one density for a thick slab of very different gas. Cut thinner shells.'}
      </Caption>
    </Figure>
  );
}
