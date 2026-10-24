import { timelineBetween } from '../../data/timeline';
import { chapterNumbered } from '../course';
import { href } from '../router';
import styles from './Timeline.module.css';

/**
 * The history timeline: the observers and their measurements, from the
 * research brief. Chapters show the stretch they tell (by astronomical year);
 * the entries of the chapter itself are marked, and the others link to the
 * chapter that tells their story.
 */
export function Timeline({ from = -10_000, to = 10_000, chapter, title = 'Timeline' }: { from?: number; to?: number; chapter?: number; title?: string }) {
  const events = timelineBetween(from, to);
  return (
    <section className={styles.timeline} aria-label={title}>
      <p className={styles.title}>{title}</p>
      <ol className={styles.list}>
        {events.map((e) => {
          const own = chapter !== undefined && e.chapter === chapter;
          const other = e.chapter !== undefined && e.chapter !== chapter ? chapterNumbered(e.chapter) : undefined;
          return (
            <li key={`${e.year}-${e.what}`} className={own ? styles.own : undefined}>
              <span className={styles.when}>{e.when}</span>
              <span className={styles.what}>
                {e.who && <b>{e.who} </b>}
                {e.what}
                {other && (
                  <>
                    {' '}
                    <a className={styles.chapterLink} href={href(other.slug)}>
                      Chapter {other.number}
                    </a>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
