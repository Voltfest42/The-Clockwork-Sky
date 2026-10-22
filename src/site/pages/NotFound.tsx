import { href } from '../router';
import styles from './pages.module.css';

export function NotFound() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Not found</p>
        <h1>There’s no page here</h1>
      </header>
      <p>
        The link may be mistyped. <a href={href('')}>Go to the start page →</a>
      </p>
    </article>
  );
}
