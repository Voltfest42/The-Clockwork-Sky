import { useId, useState, type ReactNode } from 'react';
import { GASES } from '../data/spectra/lamps';
import { Caption, Figure } from '../viz/Figure';
import { rgb, spectralColour } from '../viz/spectrum/format';
import { describeKirchhoff, gas, VIEWS, type View } from './spectra';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Kirchhoff's three spectra (Figure 12.1): a hot lamp, a cloud of gas and
 * three places to look from. Straight at the lamp, a continuous spectrum; at
 * the cloud against the dark, bright lines; at the lamp through the cloud,
 * dark lines at the same wavelengths. Real wavelengths for five gases.
 */

const FROM = 380;
const TO = 750;
const W = 560;

export function KirchhoffFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [view, setView] = useState<View>('through');
  const [gasId, setGasId] = useState('hydrogen');
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reset = () => {
    setView('through');
    setGasId('hydrogen');
  };
  const g = gas(gasId);
  const x = (nm: number) => 10 + ((nm - FROM) / (TO - FROM)) * (W - 20);
  const stops = Array.from({ length: 38 }, (_, i) => FROM + (i * (TO - FROM)) / 37);

  const eyes: { id: View; x: number; y: number; to: [number, number] }[] = [
    { id: 'lamp', x: 150, y: 22, to: [70, 88] },
    { id: 'cloud', x: 280, y: 166, to: [280, 104] },
    { id: 'through', x: 520, y: 88, to: [70, 88] },
  ];

  return (
    <Figure
      number={number}
      title="Kirchhoff’s three spectra"
      description="A hot lamp, a cloud of cooler gas, and three places to look from. Straight at the lamp you see a continuous spectrum, every colour. At the cloud against a dark background you see bright lines, the gas’s own colours. At the lamp through the cloud you see the continuous spectrum with dark lines at exactly those colours. Choose the gas: hydrogen, helium, sodium, neon or mercury, each with its real wavelengths."
      height={470}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the hot lamp (a dense, glowing body)', symbol: <circle r="7" fill="#fde68a" stroke="#f59e0b" /> },
        { label: 'the thin cloud of gas', symbol: <ellipse rx="9" ry="6" fill="#93c5fd" opacity="0.5" stroke="#60a5fa" /> },
        { label: 'your line of sight', symbol: <line x1="-10" x2="10" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" /> },
      ]}
      simplified={
        <p>
          The wavelengths are real; how bright each line is is only a rough guide. A cool gas absorbs most strongly the lines that start on its lowest
          energy levels, so a really cold cloud would darken fewer lines than it gives out when hot (Chapter 12’s next sections show why). The
          lamp is drawn as a perfect continuous source.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.segmented} role="group" aria-label="Where you look from">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className={styles.toggles} role="group" aria-label="The gas in the cloud">
          <span className={styles.togglesLabel}>Gas:</span>
          {GASES.map((x) => (
            <button key={x.id} type="button" className={styles.toggle} aria-pressed={gasId === x.id} onClick={() => setGasId(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} 180`} className={seasonStyles.svgLight} role="img" aria-label={`A lamp, a cloud of ${g.name.toLowerCase()} and the eye looking at ${VIEWS.find((v) => v.id === view)!.label.toLowerCase()}`}>
        <defs>
          <radialGradient id={`lamp${uid}`}>
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset="0.6" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height="180" rx="8" fill="#070b16" />
        <circle cx={70} cy={88} r={34} fill={`url(#lamp${uid})`} />
        <text x={70} y={142} fontSize="11.5" textAnchor="middle" fill="#e5e7eb">
          Hot lamp
        </text>
        <ellipse cx={280} cy={88} rx={62} ry={30} fill="#93c5fd" opacity={0.28} stroke="#93c5fd" strokeOpacity={0.6} />
        <text x={280} y={92} fontSize="11.5" textAnchor="middle" fill="#e5e7eb">
          Cooler {g.name.toLowerCase()}
        </text>
        {eyes.map((e) => {
          const on = e.id === view;
          return (
            <g key={e.id} style={{ cursor: 'pointer' }} onClick={() => setView(e.id)}>
              <line x1={e.x} y1={e.y} x2={e.to[0]} y2={e.to[1]} stroke={on ? 'var(--accent)' : '#64748b'} strokeWidth={on ? 2.2 : 1.2} strokeDasharray="5 4" />
              <ellipse cx={e.x} cy={e.y} rx={11} ry={6.5} fill="#f8fafc" stroke={on ? 'var(--accent)' : '#94a3b8'} strokeWidth={on ? 2.5 : 1} />
              <circle cx={e.x} cy={e.y} r={3.2} fill="#1e293b" />
            </g>
          );
        })}
      </svg>
      <svg viewBox={`0 0 ${W} 74`} className={seasonStyles.svgLight} role="img" aria-label={`The spectrum seen: ${VIEWS.find((v) => v.id === view)!.kind}`}>
        <defs>
          <linearGradient id={`rainbow${uid}`} x1="0" x2="1">
            {stops.map((nm) => (
              <stop key={nm} offset={(nm - FROM) / (TO - FROM)} stopColor={rgb(spectralColour(nm))} />
            ))}
          </linearGradient>
        </defs>
        <rect x={10} y={4} width={W - 20} height={40} fill={view === 'cloud' ? '#000' : `url(#rainbow${uid})`} stroke="var(--border)" />
        {view !== 'lamp' &&
          g.lines.map(([nm, b]) => (
            <rect
              key={nm}
              x={x(nm) - 1.2}
              y={4}
              width={2.4}
              height={40}
              fill={view === 'cloud' ? rgb(spectralColour(nm)) : '#000'}
              opacity={view === 'cloud' ? 0.35 + 0.65 * b : 0.45 + 0.5 * Math.sqrt(b)}
            />
          ))}
        {[400, 450, 500, 550, 600, 650, 700].map((nm) => (
          <g key={nm}>
            <line x1={x(nm)} x2={x(nm)} y1={44} y2={49} stroke="var(--text-muted)" />
            <text x={x(nm)} y={61} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
              {nm} nm
            </text>
          </g>
        ))}
      </svg>
      <Caption>{describeKirchhoff(view, gasId)}</Caption>
      <p className={figureStyles.below} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
        Where you’ve seen {g.name.toLowerCase()} glow: {g.seen}.
      </p>
    </Figure>
  );
}
