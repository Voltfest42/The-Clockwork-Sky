import { useId, useMemo, useState } from 'react';
import { calendarFromJd } from '../../core/time/calendar';
import { jdNow } from '../../core/time/zone';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { usePlace } from '../../site/place';
import { dayLabel, daysInYear } from '../../figures/sunsYear';
import { checkHighestNoon, noonHeights } from './chapter3Answers';
import styles from './checks.module.css';

const isDay = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 366;

export function HighestNoonSun() {
  const place = usePlace();
  const [year] = useState(() => calendarFromJd(jdNow()).year);
  return (
    <InteractiveQuestion
      id="highest-noon-sun"
      prompt={`Set the date when the noon Sun is highest where you live (${place.name}).`}
      initial={60}
      isState={isDay}
      check={(day) => checkHighestNoon(year, place.latitude, Math.min(day, daysInYear(year) - 1))}
    >
      {(day, setDay) => <NoonDate year={year} latitude={place.latitude} day={day} onDay={setDay} />}
    </InteractiveQuestion>
  );
}

function NoonDate({ year, latitude, day, onDay }: { year: number; latitude: number; day: number; onDay: (day: number) => void }) {
  const id = useId();
  const heights = useMemo(() => noonHeights(year, latitude), [year, latitude]);
  const n = daysInYear(year);
  const d = Math.min(day, n - 1);
  const label = dayLabel(year, d);
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Date</label>
      <input id={id} type="range" min={0} max={n - 1} step={1} value={d} onChange={(e) => onDay(Number(e.target.value))} aria-valuetext={label} />
      <output htmlFor={id}>
        {label}: noon Sun {heights[d].toFixed(0)}° up
      </output>
    </div>
  );
}
