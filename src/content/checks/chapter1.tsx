import { useId, useState } from 'react';
import { R_EARTH, R_SUN } from '../../core/constants';
import { ZOOM_MAX, ZOOM_MIN } from '../../core/scale/catalogue';
import { zoomObjectsToday } from '../../figures/zoomObjects';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { ScaleZoom } from '../../viz/scaleZoom/ScaleZoom';
import { checkNeptuneFit } from './chapter1Answers';
import styles from './checks.module.css';

/** How many Earths fit across the Sun: about 109. */
const SUN_IN_EARTHS = R_SUN / R_EARTH;

/**
 * The guess is a slider position from 0 to 400, spaced evenly in powers of ten:
 * position p stands for 10^(p/100) Earths, from 1 to 10,000. Keeping the
 * position (rather than the rounded number) lets the arrow keys move it one step
 * at a time even where several steps round to the same number.
 */
const STEPS = 400;
const earths = (position: number) => Math.round(10 ** (position / 100));
const isPosition = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= STEPS;

function checkGuess(position: number) {
  const guess = earths(position);
  if (Math.abs(guess / SUN_IN_EARTHS - 1) <= 0.15) {
    return {
      correct: true,
      feedback: (
        <p>
          About {Math.round(SUN_IN_EARTHS)}. The Sun is about 1.39 million km across and Earth 12,742 km. By volume, about{' '}
          {(SUN_IN_EARTHS ** 3 / 1e6).toFixed(1)} million Earths would fit inside.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {guess < SUN_IN_EARTHS
          ? 'Too few. The Sun is bigger than that: try a larger number.'
          : 'Too many. The Sun is big, but not that big: try a smaller number.'}
      </p>
    ),
  };
}

/** A slider for a guess between 1 and 10,000 Earths. */
function GuessSlider({ position, onChange }: { position: number; onChange: (position: number) => void }) {
  const id = useId();
  const guess = earths(position);
  const words = `${guess.toLocaleString('en-GB')} ${guess === 1 ? 'Earth' : 'Earths'}`;
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Your guess</label>
      <input
        id={id}
        type="range"
        min={0}
        max={STEPS}
        value={position}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={words}
      />
      <output htmlFor={id}>{words}</output>
    </div>
  );
}

export function EarthsAcrossTheSun() {
  return (
    <InteractiveQuestion
      id="earths-across-the-sun"
      prompt="How many Earths would fit side by side across the Sun? Set your guess."
      initial={100}
      isState={isPosition}
      check={checkGuess}
    >
      {(position, setPosition) => <GuessSlider position={position} onChange={setPosition} />}
    </InteractiveQuestion>
  );
}

const isPower = (value: unknown): value is number => typeof value === 'number' && value >= ZOOM_MIN && value <= ZOOM_MAX;

export function NeptunesOrbit() {
  return (
    <InteractiveQuestion
      id="neptunes-orbit"
      prompt="In this copy of the zoom, zoom until the whole of Neptune’s orbit just fits across the view. About how many steps of ×10 from 1 m is that?"
      initial={9}
      isState={isPower}
      check={checkNeptuneFit}
    >
      {(power, setPower) => <QuestionZoom power={power} onPower={setPower} />}
    </InteractiveQuestion>
  );
}

function QuestionZoom({ power, onPower }: { power: number; onPower: (p: number) => void }) {
  const objects = zoomObjectsToday();
  const [selected, setSelected] = useState<string | null>(null);
  return <ScaleZoom objects={objects} power={power} onPower={onPower} selected={selected} onSelect={setSelected} />;
}
