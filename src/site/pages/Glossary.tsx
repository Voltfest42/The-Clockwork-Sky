import { GLOSSARY } from '../glossary';
import styles from './pages.module.css';

const ENTRIES = Object.entries(GLOSSARY).sort(([, a], [, b]) => a.term.localeCompare(b.term, 'en-GB'));

export function Glossary() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Glossary</p>
        <h1>Every term in the course</h1>
        <p className={styles.lede}>
          Plain-language definitions. In the chapters, words with a dotted underline show theirs when you hover over them or tap them.
        </p>
      </header>
      <dl className={styles.glossary}>
        {ENTRIES.map(([id, { term, definition }]) => (
          <div key={id} id={`term-${id}`}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
