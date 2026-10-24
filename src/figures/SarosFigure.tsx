import { useMemo, useState, type ReactNode } from 'react';
import { eclipseAt, SAROS_MONTHS, sarosNumber, type Eclipse } from '../core/ephemeris/eclipses';
import { calendarFromJd, formatYear } from '../core/time/calendar';
import { utFromTt } from '../core/time/deltaT';
import { Caption, Figure } from '../viz/Figure';
import { dateText, eclipseName } from './eclipseSeasons';
import seasonStyles from './seasons.module.css';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * A Saros series: the eclipses that follow one another every 223 lunations
 * (18 years 11 days), from the first, a small partial eclipse near one pole,
 * through central ones, to the last near the other pole. Every member comes
 * from the eclipse finder.
 */

const SERIES = [
  { k: 329, label: '12 August 2026, total solar' },
  { k: 341, label: '2 August 2027, total solar' },
  { k: 323.5, label: '3 March 2026, total lunar' },
];

/** All the eclipses of the series that contains the eclipse at lunation k, in order. */
function seriesOf(k: number): Eclipse[] {
  const members: Eclipse[] = [];
  for (let j = 0; j < 120; j++) {
    const e = eclipseAt(k - j * SAROS_MONTHS);
    if (!e) break;
    members.unshift(e);
  }
  for (let j = 1; j < 120; j++) {
    const e = eclipseAt(k + j * SAROS_MONTHS);
    if (!e) break;
    members.push(e);
  }
  return members;
}

const yearOf = (e: Eclipse) => calendarFromJd(utFromTt(e.jdTT)).year;

const W = 640;
const H = 260;
const PAD = { left: 46, right: 16, top: 16, bottom: 34 };
const COLOURS: Record<string, string> = { total: '#ffd166', annular: '#ff9f70', hybrid: '#c4a1ff', partial: '#9aa8c4', penumbral: '#9aa8c4' };

export function SarosFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [seriesIndex, setSeriesIndex] = useState(0);
  const members = useMemo(() => seriesOf(SERIES[seriesIndex].k), [seriesIndex]);
  const startIndex = members.findIndex((e) => e.k === SERIES[seriesIndex].k);
  const [picked, setPicked] = useState<number | null>(null);
  const index = picked ?? startIndex;
  const e = members[index];
  const first = yearOf(members[0]);
  const last = yearOf(members[members.length - 1]);
  const x = (year: number) => PAD.left + ((year - first) / Math.max(1, last - first)) * (W - PAD.left - PAD.right);
  const y = (gamma: number) => PAD.top + ((1.65 - gamma) / 3.3) * (H - PAD.top - PAD.bottom);
  const saros = sarosNumber(e);
  const counts = members.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.type]: (acc[m.type] ?? 0) + 1 }), {});

  const reset = () => {
    setSeriesIndex(0);
    setPicked(null);
  };

  return (
    <Figure
      number={number}
      title="A Saros series"
      description="One Saros series of eclipses, each 18 years and 11 days after the one before, plotted by year and by how far the shadow passes from Earth’s centre. The series starts with small partial eclipses near one pole, works its way across Earth over more than a thousand years, and dies out near the other pole."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'total', symbol: <circle r="5" fill={COLOURS.total} /> },
        { label: 'annular', symbol: <circle r="5" fill={COLOURS.annular} /> },
        { label: 'hybrid', symbol: <circle r="5" fill={COLOURS.hybrid} /> },
        { label: 'partial or penumbral', symbol: <circle r="4" fill="none" stroke={COLOURS.partial} strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          Each eclipse comes from the same eclipse finder as Figure 4.4, which follows Meeus’s method and is checked against NASA’s catalogue for
          1900–2100. Far from the present its times are less certain, and the very first and last members of a series, grazing eclipses at the
          edge of the shadow, may come or go by one.
        </p>
      }
    >
      <div>
        <div className={figureStyles.toolbar}>
          <span className={styles.togglesLabel}>The series of</span>
          {SERIES.map((s, i) => (
            <button
              key={s.k}
              type="button"
              className={figureStyles.toolButton}
              aria-pressed={seriesIndex === i}
              onClick={() => {
                setSeriesIndex(i);
                setPicked(null);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className={styles.slider}>
          Eclipse
          <input
            type="range"
            min={0}
            max={members.length - 1}
            step={1}
            value={index}
            onChange={(ev) => setPicked(Number(ev.target.value))}
            aria-valuetext={`${index + 1} of ${members.length}: ${dateText(e.jdTT)} ${formatYear(yearOf(e))}`}
          />
          <output>
            {index + 1} of {members.length}
          </output>
        </label>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`Saros ${saros}: ${members.length} eclipses from ${formatYear(first)} to ${formatYear(last)}.`}>
          {[1.5, 1, 0.5, 0, -0.5, -1, -1.5].map((g) => (
            <g key={g}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke={g === 0 ? '#5d6a8c' : '#2a3a5e'} />
              <text x={PAD.left - 6} y={y(g) + 4} fontSize="10.5" fill="#9aa8c4" textAnchor="end">
                {g}
              </text>
            </g>
          ))}
          <text x={8} y={y(1.25)} fontSize="10.5" fill="#9aa8c4">
            N
          </text>
          <text x={8} y={y(-1.25)} fontSize="10.5" fill="#9aa8c4">
            S
          </text>
          {members.map((m, i) => {
            const central = m.type !== 'partial' && m.type !== 'penumbral';
            return central ? (
              <circle key={m.k} cx={x(yearOf(m))} cy={y(m.gamma)} r={i === index ? 7 : 4.5} fill={COLOURS[m.type]} stroke={i === index ? '#fff' : 'none'} strokeWidth="2" />
            ) : (
              <circle key={m.k} cx={x(yearOf(m))} cy={y(m.gamma)} r={i === index ? 7 : 4} fill="none" stroke={i === index ? '#fff' : COLOURS.partial} strokeWidth="2" />
            );
          })}
          {[first, Math.round((first + last) / 2 / 100) * 100, last].map((yr) => (
            <text key={yr} x={x(yr)} y={H - 10} fontSize="10.5" fill="#9aa8c4" textAnchor="middle">
              {formatYear(yr)}
            </text>
          ))}
        </svg>
        <p className={styles.hint}>Up and down: where the shadow passes, from Earth’s north pole (top) through the centre (0) to its south pole, in Earth radii.</p>
        <div className={styles.readout}>
          <span>
            <b>
              {dateText(e.jdTT)} {formatYear(yearOf(e))}
            </b>
            : {eclipseName(e).toLowerCase()}
          </span>
          <span>
            Saros <b>{saros}</b>: {members.length} eclipses, {Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ')}
          </span>
        </div>
      </div>
      <Caption>
        <b>Saros {saros}</b> runs from {formatYear(first)} to {formatYear(last)}, {last - first} years. Each eclipse comes 18 years and 11 days after
        the one before, at nearly the same point of the Moon’s orbit, but the shadow shifts a little {members[0].gamma > 0 ? 'south' : 'north'}{' '}
        each time, so the series creeps across Earth from one pole to the other.
      </Caption>
    </Figure>
  );
}
