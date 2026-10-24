import { useMemo, useState, type ReactNode } from 'react';
import { precessionObliquity } from '../core/coords/precession';
import { J2000 } from '../core/time/julian';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import styles from './sky/sky.module.css';

/**
 * The tilt of Earth's axis over the last 200,000 years and the next 50,000,
 * from the long-term precession model of Vondrák, Capitaine and Wallace
 * (2011), which follows it to within a few hundredths of a degree.
 */

/** Years from now (counted from AD 2000, close enough on this scale). */
const FIRST = -200_000;
const LAST = 50_000;
const NOW = 0;

const obliquityAt = (fromNow: number) => precessionObliquity(J2000 + fromNow * 365.25) / DEG;

function yearText(fromNow: number): string {
  if (Math.abs(fromNow) < 500) return 'today';
  const k = Math.round(Math.abs(fromNow) / 1000);
  return fromNow < 0 ? `${k.toLocaleString('en-GB')},000 years ago` : `${k.toLocaleString('en-GB')},000 years from now`;
}

export function TiltHistoryFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [year, setYear] = useState(NOW);
  const series = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    for (let y = FIRST; y <= LAST; y += 500) points.push({ x: y / 1000, y: obliquityAt(y) });
    return [{ name: 'Tilt of Earth’s axis', color: 'var(--series-1)', points }];
  }, []);
  const tilt = obliquityAt(year);

  return (
    <Figure
      number={number}
      title="Earth’s changing tilt"
      description="A chart of the tilt of Earth’s axis from 200,000 years ago to 50,000 years from now. It rocks between about 22.1° and 24.5° and back every 41,000 years. More tilt means hotter summers and colder winters."
      height={470}
      tryThis={tryThis}
      onReset={() => setYear(NOW)}
      simplified={
        <p>
          The tilt comes from a long-term model of Earth’s axis fitted to numerical simulations of the Solar System. The other two cycles, the
          wobble of the axis and the stretching of the orbit, aren’t shown here.
        </p>
      }
    >
      <div>
        <label className={styles.slider}>
          When
          <input
            type="range"
            min={FIRST}
            max={LAST}
            step={500}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-valuetext={yearText(year)}
          />
          <output>{yearText(year)}</output>
        </label>
        <LineChart
          series={series}
          xLabel="Thousands of years from now"
          yLabel="Tilt"
          yMin={22}
          yMax={24.8}
          formatY={(y) => `${y.toFixed(1)}°`}
          xTicks={[-200, -150, -100, -50, 0, 50].map((value) => ({ value, label: value > 0 ? `+${value}` : String(value) }))}
          xMin={FIRST / 1000}
          xMax={LAST / 1000}
          markers={[{ x: year / 1000, label: `${tilt.toFixed(2)}°`, color: 'var(--text)' }]}
          dots={false}
          onPick={(x) => setYear(Math.round((x * 1000) / 500) * 500)}
          height={240}
          ariaLabel={`The tilt of Earth’s axis over 250,000 years, between about 22.1° and 24.5°. ${yearText(year)}: ${tilt.toFixed(2)}°.`}
        />
      </div>
      <Caption>
        <b>{yearText(year)[0].toUpperCase() + yearText(year).slice(1)}:</b> Earth’s axis is tilted {tilt.toFixed(2)}°, so the tropics lie at{' '}
        {tilt.toFixed(1)}° and the polar circles at {(90 - tilt).toFixed(1)}°. {tilt > 23.8 ? 'Summers are hotter and winters colder than today’s.' : tilt < 22.9 ? 'Summers are milder than today’s, and winters less harsh.' : ''}
      </Caption>
    </Figure>
  );
}
