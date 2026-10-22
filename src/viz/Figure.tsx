import type { KeyboardEventHandler, ReactNode } from 'react';
import styles from './Figure.module.css';

interface FigureProps {
  /** Chapter and figure, e.g. "7.3". */
  number: string;
  title: string;
  children: ReactNode;
  /** What each colour and shape means, shown under the figure. (A chart may carry its own legend instead.) */
  legend?: readonly LegendItem[];
  /** A short prompt for something to try. Every figure has one. */
  tryThis: ReactNode;
  /** Puts the figure back as it started. Every figure has one. */
  onReset: () => void;
  /** What the figure leaves out or bends, for the "What's simplified here?" note. */
  simplified?: ReactNode;
  /** Sizes, distances or angles are exaggerated: shows the "not to scale" tag. */
  notToScale?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
}

/**
 * The frame around every figure: its number and title, a "not to scale" tag
 * when it exaggerates, a reset button, the figure itself, its legend, a "Try
 * this" prompt, and a "What's simplified here?" note when it simplifies.
 */
export function Figure({ number, title, children, legend, tryThis, onReset, simplified, notToScale, onKeyDown }: FigureProps) {
  const id = `figure-${number}`;
  return (
    <figure className={styles.figure} onKeyDown={onKeyDown} aria-labelledby={id}>
      <figcaption className={styles.header}>
        <span id={id} className={styles.name}>
          <span className={styles.number}>Figure {number}</span> <span className={styles.title}>{title}</span>
        </span>
        {notToScale && <span className={styles.notToScale}>Not to scale</span>}
        <button type="button" className={styles.reset} onClick={onReset} aria-label={`Reset figure ${number}`} title="Put the figure back as it started">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reset
        </button>
      </figcaption>
      {children}
      {legend && <Legend items={legend} />}
      <aside className={styles.tryThis}>
        <span className={styles.tryLabel}>Try this</span>
        <div>{tryThis}</div>
      </aside>
      {simplified && (
        <details className={styles.simplified}>
          <summary>What’s simplified here?</summary>
          <div className={styles.simplifiedBody}>{simplified}</div>
        </details>
      )}
    </figure>
  );
}

/** The narration under a figure: what it shows right now. Read out by screen readers as it changes. */
export function Caption({ children }: { children: ReactNode }) {
  return (
    <p className={styles.caption} aria-live="polite">
      {children}
    </p>
  );
}

/** One legend entry: a symbol (SVG drawn around 0,0 in a 22 × 22 box) and what it stands for. */
export interface LegendItem {
  label: string;
  symbol: ReactNode;
}

/** What each colour and shape in a figure means. Every figure has one. */
export function Legend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {items.map((item) => (
        <li key={item.label}>
          <svg viewBox="-11 -11 22 22" width="18" height="18" aria-hidden="true">
            {item.symbol}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
