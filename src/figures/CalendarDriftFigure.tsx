import { useMemo, useState, type ReactNode } from 'react';
import { formatYear } from '../core/time/calendar';
import { DRIFT_START_YEAR, equinoxDate, equinoxDrift, yearsPerDayOfDrift, type CalendarRule } from '../core/time/calendarDrift';
import { Caption, Figure } from '../viz/Figure';
import { LineChart, type ChartMarker, type Series } from '../viz/LineChart';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * How far the March equinox slips through the calendar from 45 BC to AD 2500
 * under three rules: no leap years, Julian leap years, and Gregorian ones.
 * The equinoxes come from the solar theory, so the small wobbles of the leap
 * cycle and the slow change in the year's length are real.
 */

const LAST_YEAR = 2500;
/** Every fourth year, so every sample sits at the same point of the leap-year cycle and the lines show only the real slips. */
const STEP = 4;
const RULES: { rule: CalendarRule; name: string; color: string; dashed?: boolean }[] = [
  { rule: 'no-leap', name: 'No leap years (365 days)', color: 'var(--series-3)' },
  { rule: 'julian', name: 'Julian rules (365¼ days)', color: 'var(--series-2)' },
  { rule: 'gregorian', name: 'Gregorian rules (365.2425 days)', color: 'var(--series-1)' },
];
const START_YEAR = 2026;

/** "15 days earlier than in 45 BC". */
function slipText(days: number): string {
  const d = Math.round(days);
  if (d === 0) return 'the same day as in 45 BC';
  return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'later' : 'earlier'} than in 45 BC`;
}

export function CalendarDriftFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [year, setYear] = useState(START_YEAR);
  const [closeUp, setCloseUp] = useState(false);

  const series = useMemo<Series[]>(() => {
    const years: number[] = [];
    for (let y = DRIFT_START_YEAR; y <= LAST_YEAR; y += STEP) years.push(y);
    return RULES.map((r) => ({ name: r.name, color: r.color, points: years.map((y) => ({ x: y, y: equinoxDrift(y, r.rule) })) }));
  }, []);
  const shown = closeUp ? series.slice(1) : series;
  const yMin = closeUp ? -20 : -50;
  const yMax = closeUp ? 5 : 650;
  const markers: ChartMarker[] = [
    { x: 325, label: 'Nicaea', color: 'var(--text-muted)', faint: true },
    { x: 1582, label: 'Gregory', color: 'var(--text-muted)', faint: true },
    { x: year, label: formatYear(year, 'always'), color: 'var(--text)' },
  ];
  const at = RULES.map((r) => ({ ...r, date: equinoxDate(year, r.rule).label, drift: equinoxDrift(year, r.rule) }));

  const reset = () => {
    setYear(START_YEAR);
    setCloseUp(false);
  };

  return (
    <Figure
      number={number}
      title="Calendar drift"
      description="A chart of how far the March equinox slips through the calendar between 45 BC and AD 2500 under three rules. With no leap years it slips about a day every four years, right round the calendar. With Julian leap years it comes about a day earlier every 128 years, 13 days by now. With Gregorian rules it stays within a day or so of 20 March."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The no-leap calendar is lined up with the Julian one on 1 January 45 BC. The Gregorian line uses Gregory’s rules all the way back
          (the “proleptic” calendar), though nobody used them before 1582. Dates are counted at Greenwich. The lines show every fourth year,
          all at the same point of the leap-year cycle: in between, the equinox creeps about six hours later each year and jumps back a day
          after each leap day.
        </p>
      }
    >
      <div>
        <div className={styles.controls}>
          <label className={styles.slider}>
            Year
            <input
              type="range"
              min={DRIFT_START_YEAR}
              max={LAST_YEAR}
              step={1}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-valuetext={formatYear(year, 'always')}
            />
            <output>{formatYear(year, 'always')}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={figureStyles.segmented} role="group" aria-label="Scale">
              <button type="button" aria-pressed={!closeUp} onClick={() => setCloseUp(false)}>
                All three
              </button>
              <button type="button" aria-pressed={closeUp} onClick={() => setCloseUp(true)}>
                Julian and Gregorian close up
              </button>
            </span>
            {[
              [325, 'AD 325'],
              [1582, '1582'],
              [START_YEAR, 'Today'],
            ].map(([y, label]) => (
              <button key={label} type="button" className={figureStyles.toolButton} onClick={() => setYear(y as number)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <LineChart
          series={shown}
          xLabel="Year"
          yLabel="Days the equinox has moved"
          yMin={yMin}
          yMax={yMax}
          formatY={(y) => (y > 0 ? `+${y}` : `${y}`)}
          formatX={(x) => (x <= 0 ? `${1 - x} BC` : `${x}`)}
          xTicks={[0, 500, 1000, 1500, 2000, 2500].map((value) => ({ value, label: value === 0 ? '1 BC' : String(value) }))}
          xMin={DRIFT_START_YEAR}
          xMax={LAST_YEAR}
          baseline={0}
          markers={markers}
          dots={false}
          onPick={(x) => setYear(Math.round(x))}
          height={280}
          ariaLabel={`How far the March equinox has moved in each calendar since 45 BC. In ${formatYear(year, 'always')}: ${at.map((a) => `${a.name}, ${slipText(a.drift)}`).join('; ')}.`}
        />
        <dl className={styles.facts}>
          {at.map((a) => (
            <div key={a.rule}>
              <dt>{a.name}</dt>
              <dd>
                equinox on <b>{a.date}</b> ({slipText(a.drift)}; a day’s drift every {Math.round(yearsPerDayOfDrift(a.rule)).toLocaleString('en-GB')} years)
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Caption>
        <b>{formatYear(year, 'always')}:</b>{' '}
        {year < 1582
          ? `the Julian calendar puts the March equinox on ${at[1].date}. `
          : `under the Julian calendar the equinox would fall on ${at[1].date}; under the Gregorian calendar, which most of the world now uses, it falls on ${at[2].date}. `}
        {year >= 1582 && year < 1600 ? 'In 1582 Pope Gregory XIII dropped ten days to bring it back to where it was at the Council of Nicaea in 325. ' : ''}
        Without leap years it would fall on {at[0].date}
        {Math.abs(at[0].drift) > 365 ? ', having slipped right round the calendar' : ''}.
      </Caption>
    </Figure>
  );
}
