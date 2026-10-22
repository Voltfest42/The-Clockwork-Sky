import { useId } from 'react';
import { R_EARTH, R_SUN } from '../../core/constants';
import { CheckYourself, Choice, InteractiveQuestion, Question } from '../check/CheckYourself';
import styles from './pages.module.css';

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
    feedback: <p>{guess < SUN_IN_EARTHS ? 'Too few. The Sun is bigger than that: try a larger number.' : 'Too many. The Sun is big, but not that big: try a smaller number.'}</p>,
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

/** Two sample questions on the landing page, to show how Check yourself works. */
export function SampleCheck() {
  return (
    <CheckYourself scope="sample" title="Try a Check yourself">
      <Question id="closest-to-the-sun" prompt="When is Earth closest to the Sun?">
        <Choice label="In early July, in the middle of the northern summer">
          <p>
            That’s the most common answer, and it comes from the idea that the seasons are caused by our distance from the Sun. In fact, early
            July is when Earth is <em>farthest</em> from the Sun, about 152 million km away. Chapter 3 shows what really causes the seasons.
          </p>
        </Choice>
        <Choice label="In early January" correct>
          <p>
            Earth passes closest to the Sun, about 147 million km away, in early January: the middle of the northern winter. It even gets about
            7% more sunlight then than in July. So distance can’t be what makes the seasons. The tilt of Earth’s axis does, as Chapter 3 shows.
          </p>
        </Choice>
        <Choice label="It depends on which hemisphere you live in">
          <p>
            Both hemispheres are the same distance from the Sun, give or take Earth’s own width: 13,000 km against 150 million. If distance
            made the seasons, December would be winter everywhere. Instead it’s summer in Sydney while it’s winter in London.
          </p>
        </Choice>
        <Choice label="Never: its distance doesn’t change">
          <p>
            Earth’s orbit is very nearly a circle, but not quite. Its distance from the Sun swings by about 3%, from about 147 million km in
            early January to about 152 million km in early July.
          </p>
        </Choice>
      </Question>

      <InteractiveQuestion
        id="earths-across-the-sun"
        prompt="How many Earths would fit side by side across the Sun? Set your guess."
        initial={100}
        isState={isPosition}
        check={checkGuess}
      >
        {(position, setPosition) => <GuessSlider position={position} onChange={setPosition} />}
      </InteractiveQuestion>
    </CheckYourself>
  );
}
