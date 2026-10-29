import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { HRDiagram } from '../../viz/hr/HRDiagram';
import { CANDIDATES, checkWhiteDwarf } from './chapter13Answers';
import styles from './checks.module.css';

const isLetter = (value: unknown): value is string => typeof value === 'string' && value.length <= 1;

export function PickWhiteDwarf() {
  return (
    <InteractiveQuestion
      id="pick-white-dwarf"
      prompt="Six stars on an HR diagram, like Figure 13.2’s. Which one is a white dwarf?"
      initial=""
      isState={isLetter}
      check={(l) => checkWhiteDwarf(l)}
    >
      {(letter, set) => (
        <div style={{ maxWidth: 460 }}>
          <HRDiagram
            axes="physicist"
            markers={CANDIDATES.map((c) => ({ id: c.letter, label: c.letter, point: c.point, highlight: c.letter === letter }))}
            ariaLabel="An HR diagram with six stars, labelled A to F"
          />
          <div className={styles.guess} role="radiogroup" aria-label="Pick a star">
            {CANDIDATES.map((c) => (
              <label key={c.letter} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <input type="radio" name="white-dwarf" checked={letter === c.letter} onChange={() => set(c.letter)} style={{ flex: 'none' }} />
                {c.letter}
              </label>
            ))}
          </div>
        </div>
      )}
    </InteractiveQuestion>
  );
}
