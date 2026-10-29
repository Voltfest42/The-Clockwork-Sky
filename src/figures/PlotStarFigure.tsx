import { useId, useState, type ReactNode } from 'react';
import { regionOf } from '../core/stars/hr';
import { Caption, Figure } from '../viz/Figure';
import { HRDiagram, type HRMarker } from '../viz/hr/HRDiagram';
import { formatKelvin } from '../viz/spectrum/format';
import { PLOTTABLE, placeStar, REGIONS, type Plotted } from './hrStars';
import { formatSuns, signed } from './thermal';
import styles from './sky/sky.module.css';

/**
 * Plot a star (Figure 13.1): a parallax, a magnitude and a colour, the three
 * things a telescope measures, become a distance, an absolute magnitude, a
 * temperature and a luminosity, and the star lands on an empty HR diagram.
 * Each star plotted stays, so the diagram fills up.
 */

const START = PLOTTABLE[0];

export function PlotStarFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [input, setInput] = useState<Plotted>(START.plotted);
  const [name, setName] = useState<string | null>(START.name);
  const [history, setHistory] = useState<{ name: string; plotted: Plotted }[]>([]);
  const ids = { p: useId(), v: useId(), c: useId() };
  const reset = () => {
    setInput(START.plotted);
    setName(START.name);
    setHistory([]);
  };
  const placed = placeStar(input);
  const valid = input.parallax > 0 && Number.isFinite(input.V) && Number.isFinite(input.BV);
  const label = name ?? 'Your star';

  const plot = (n: string | null, p: Plotted) => {
    if (valid) setHistory((h) => [...h.filter((x) => x.name !== label), { name: label, plotted: input }].slice(-8));
    setName(n);
    setInput(p);
  };

  const markers: HRMarker[] = [
    ...history.filter((h) => h.name !== label).map((h) => ({ id: h.name, label: h.name, point: placeStar(h.plotted).point })),
    ...(valid ? [{ id: 'now', label, point: placed.point, highlight: true }] : []),
  ];

  const field = (id: string, text: string, value: number, step: number, min: number, max: number, key: keyof Plotted, unit: string) => (
    <label htmlFor={id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}>
      {text}
      <input
        id={id}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        style={{ width: '6.5em', font: 'inherit' }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value === '' || !Number.isFinite(v)) return;
          setName(null);
          setInput({ ...input, [key]: v });
        }}
      />
      <span style={{ color: 'var(--text-muted)' }}>{unit}</span>
    </label>
  );

  return (
    <Figure
      number={number}
      title="Plot a star"
      description="Three measurements put a star on the HR diagram: its parallax, its apparent magnitude and its colour. The parallax gives its distance; distance and apparent magnitude give its absolute magnitude, how bright it would look from 10 parsecs; the colour gives its temperature; and the absolute magnitude, corrected for the light outside the V band, gives its luminosity. Pick a star or type your own numbers, and watch it land on the diagram."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the star you are plotting', symbol: <circle r="6" fill="#fff4ea" stroke="var(--accent)" strokeWidth="2.5" /> },
        { label: 'stars you plotted before', symbol: <circle r="4.5" fill="#fff4ea" stroke="#fff" strokeWidth="1.2" /> },
      ]}
      simplified={
        <p>
          The temperature and the bolometric correction come from a table of main-sequence stars’ colours (Mamajek’s), so giants come out a
          little off, and dust between us and a far star, which reddens and dims it, is ignored.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Pick a star">
          <span className={styles.togglesLabel}>Stars:</span>
          {PLOTTABLE.map((s) => (
            <button key={s.id} type="button" className={styles.toggle} aria-pressed={name === s.name} onClick={() => plot(s.name, s.plotted)}>
              {s.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {field(ids.p, 'Parallax', input.parallax, 0.1, 0.1, 1000, 'parallax', 'mas')}
          {field(ids.v, 'Magnitude V', input.V, 0.01, -2, 20, 'V', '')}
          {field(ids.c, 'Colour B − V', input.BV, 0.01, -0.35, 2.1, 'BV', '')}
        </div>
      </div>
      <ol className={styles.readout} style={{ display: 'grid', gap: 2, paddingLeft: 20, margin: '0 0 8px' }}>
        <li>
          Distance = 1 ÷ parallax: <b>{placed.parsecs < 100 ? placed.parsecs.toFixed(2) : Math.round(placed.parsecs).toLocaleString('en-GB')} parsecs</b> ({Math.round(placed.lightYears).toLocaleString('en-GB')} light-years)
        </li>
        <li>
          Absolute magnitude M = V − 5 log₁₀(d ÷ 10 pc): <b>{signed(placed.mV)}</b>
        </li>
        <li>
          Temperature from colour: <b>{formatKelvin(placed.kelvin)}</b>
        </li>
        <li>
          Luminosity, after adding {signed(placed.bc)} for light outside V: <b>{formatSuns(placed.luminosity)} Suns</b>, so a radius of <b>{formatSuns(placed.radius)} Suns</b>
        </li>
      </ol>
      <HRDiagram axes="physicist" markers={markers} radiusLines ariaLabel={`An HR diagram with ${label} at ${formatKelvin(placed.kelvin)} and ${formatSuns(placed.luminosity)} Suns`} />
      <Caption>
        {valid
          ? `${label} lands at ${formatKelvin(placed.kelvin)} and ${formatSuns(placed.luminosity)} times the Sun’s luminosity: ${REGIONS[regionOf(placed.kelvin, placed.luminosity)].name.toLowerCase()}.`
          : 'Type a parallax above zero.'}
      </Caption>
    </Figure>
  );
}
