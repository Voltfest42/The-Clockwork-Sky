import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useHydrated } from '../hydration';
import { useRoute } from '../router';
import { answerKey, forgetAnswers, recordAnswer, tally, useAnswers, type StoredAnswer } from './answers';
import styles from './check.module.css';

/**
 * Check yourself: the questions at the end of every chapter.
 *
 * <CheckYourself>
 *   <Question id="eclipse-phase" prompt="What phase is the Moon in during a solar eclipse?">
 *     <Choice label="New" correct>Right: …</Choice>
 *     <Choice label="Full">That's when lunar eclipses happen: …</Choice>
 *   </Question>
 *   <InteractiveQuestion id="first-quarter" … />
 * </CheckYourself>
 *
 * Wrong answers are the common misconceptions, each with its own explanation.
 * Interactive questions put a figure in "question mode" and check its state.
 * Answers are kept in the browser only.
 *
 * The questions are prerendered unanswered. Stored answers can only be read
 * once the page has hydrated, so the questions start again then, picking them up.
 */

interface Block {
  scope: string;
  register: (id: string) => () => void;
}

const BlockContext = createContext<Block | null>(null);

interface CheckYourselfProps {
  /** Where the answers are kept. Defaults to the page's address, which for a chapter is its slug. */
  scope?: string;
  title?: string;
  children: ReactNode;
}

export function CheckYourself({ scope, title = 'Check yourself', children }: CheckYourselfProps) {
  const route = useRoute();
  const blockScope = scope ?? route.page;
  const answers = useAnswers();
  const [ids, setIds] = useState<readonly string[]>([]);
  // Clearing the answers starts every question again from scratch.
  const [round, setRound] = useState(0);
  const hydrated = useHydrated();
  const headingId = useId();

  const block = useMemo<Block>(
    () => ({
      scope: blockScope,
      register: (id) => {
        setIds((current) => (current.includes(id) ? current : [...current, id]));
        return () => setIds((current) => current.filter((x) => x !== id));
      },
    }),
    [blockScope],
  );

  const { total, answered, correct } = tally(answers, blockScope, ids);
  const clear = () => {
    forgetAnswers(blockScope, ids);
    setRound((r) => r + 1);
  };

  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <BlockContext.Provider value={block}>
        <div key={hydrated ? round : 'prerendered'} className={styles.questions}>
          {children}
        </div>
      </BlockContext.Provider>
      <div className={styles.footer}>
        <p className={styles.summary} aria-live="polite">
          {answered === 0
            ? 'Your answers stay in this browser.'
            : `You’ve answered ${answered} of ${total}, and got ${correct} right.`}
        </p>
        {answered > 0 && (
          <button type="button" className={styles.button} onClick={clear}>
            Clear my answers
          </button>
        )}
      </div>
    </section>
  );
}

/** The question's stored answer, and a way to record a new one. */
function useQuestion(id: string): { stored: StoredAnswer | undefined; record: (answer: StoredAnswer) => void } {
  const block = useContext(BlockContext);
  const answers = useAnswers();
  const register = block?.register;
  useEffect(() => register?.(id), [register, id]);
  if (!block) throw new Error(`Question "${id}" must be inside <CheckYourself>.`);
  return {
    stored: answers[answerKey(block.scope, id)],
    record: (answer) => recordAnswer(block.scope, id, answer),
  };
}

interface ChoiceProps {
  /** The answer, as the reader sees it. */
  label: ReactNode;
  correct?: boolean;
  /** Why this answer is right, or where the idea behind it goes wrong. */
  children: ReactNode;
}

/** One answer to a Question. The Question draws it; on its own it draws nothing. */
export function Choice(props: ChoiceProps): ReactNode {
  void props;
  return null;
}

/** A multiple-choice question: its <Choice> children are the answers, each with its explanation. */
export function Question({ id, prompt, children }: { id: string; prompt: ReactNode; children: ReactNode }) {
  const { stored, record } = useQuestion(id);
  const choices = Children.toArray(children).filter(
    (child): child is ReactElement<ChoiceProps> => isValidElement(child) && child.type === Choice,
  );
  const value = stored?.value;
  const checked = typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < choices.length ? value : null;
  const [selected, setSelected] = useState<number | null>(checked);
  const [showAll, setShowAll] = useState(false);
  const name = useId();

  const check = () => {
    if (selected !== null) record({ value: selected, correct: choices[selected].props.correct === true });
  };

  return (
    <fieldset className={styles.question}>
      <legend className={styles.prompt}>{prompt}</legend>
      <ul className={styles.choices}>
        {choices.map((choice, i) => (
          <li key={i}>
            <label className={styles.choice}>
              <input type="radio" name={name} checked={selected === i} onChange={() => setSelected(i)} />
              <span>{choice.props.label}</span>
            </label>
            {showAll && (
              <Verdict correct={choice.props.correct === true} compact>
                {choice.props.children}
              </Verdict>
            )}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={check} disabled={selected === null}>
          Check
        </button>
        {checked !== null && (
          <button type="button" className={styles.button} onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
            {showAll ? 'Hide the explanations' : 'Explain every answer'}
          </button>
        )}
      </div>
      <div aria-live="polite">
        {checked !== null && !showAll && (
          <Verdict correct={choices[checked].props.correct === true}>{choices[checked].props.children}</Verdict>
        )}
      </div>
    </fieldset>
  );
}

interface InteractiveQuestionProps<S> {
  id: string;
  prompt: ReactNode;
  /** The figure's state when the question starts. */
  initial: S;
  /** Recognises a stored state, so the reader's last answer comes back on a later visit. */
  isState?: (value: unknown) => value is S;
  /** Draws the figure (or a control) in question mode, showing a state and reporting changes. */
  children: (state: S, setState: (next: S) => void) => ReactNode;
  /** Whether a state answers the question, and what to tell the reader. */
  check: (state: S) => { correct: boolean; feedback: ReactNode };
}

/** A question answered by setting up a figure: "put the Moon where it would be at first quarter". */
export function InteractiveQuestion<S>({ id, prompt, initial, isState, children, check }: InteractiveQuestionProps<S>) {
  const { stored, record } = useQuestion(id);
  const restored = stored && isState && isState(stored.value) ? { state: stored.value } : null;
  const [state, setState] = useState<S>(restored ? restored.state : initial);
  const [checked, setChecked] = useState<{ state: S } | null>(restored);
  const hydrated = useHydrated();
  const result = checked ? check(checked.state) : null;

  const submit = () => {
    setChecked({ state });
    record({ value: state, correct: check(state).correct });
  };

  return (
    <fieldset className={styles.question}>
      <legend className={styles.prompt}>{prompt}</legend>
      <div className={styles.widget}>
        {/* The widget is a figure, so it needs the browser: it appears once the page has hydrated. */}
        {hydrated ? (
          children(state, setState)
        ) : (
          <noscript>
            <p>This question is interactive and needs JavaScript.</p>
          </noscript>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={submit}>
          Check
        </button>
      </div>
      <div aria-live="polite">{result && <Verdict correct={result.correct}>{result.feedback}</Verdict>}</div>
    </fieldset>
  );
}

/** Right or not, always in words and a ✓ or ✗ as well as colour. */
function Verdict({ correct, compact = false, children }: { correct: boolean; compact?: boolean; children: ReactNode }) {
  return (
    <div className={`${styles.feedback} ${correct ? styles.right : styles.wrong} ${compact ? styles.compact : ''}`}>
      <p className={styles.verdict}>
        <span aria-hidden="true">{correct ? '✓' : '✗'}</span> {correct ? 'Right.' : 'Not quite.'}
      </p>
      <div className={styles.explanation}>{children}</div>
    </div>
  );
}
