import { chaptersOf, findLab, PARTS, type PartInfo } from '../course';
import { useReadChapters } from '../progress';
import { href } from '../router';
import { ChapterCard, LabCard } from './CourseCards';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

export function PartPage({ part }: { part: PartInfo }) {
  const read = useReadChapters();
  const chapters = chaptersOf(part.number);
  const done = chapters.filter((c) => read.includes(c.slug)).length;
  const first = chapters[0].number;
  const last = chapters[chapters.length - 1].number;
  const previous = PARTS.find((p) => p.number === part.number - 1);
  const next = PARTS.find((p) => p.number === part.number + 1);

  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Part {part.numeral}</p>
        <h1>{part.title}</h1>
        <p className={styles.lede}>{part.subject}</p>
      </header>

      <dl className={styles.facts}>
        <div>
          <dt>Level</dt>
          <dd>{part.level}</dd>
        </div>
        <div>
          <dt>Maths</dt>
          <dd>{part.maths}</dd>
        </div>
        <div>
          <dt>Chapters</dt>
          <dd>
            {first}–{last}
            {part.minutes && `, ${part.minutes}`}
          </dd>
        </div>
        <div>
          <dt>Your progress</dt>
          <dd>
            {done} of {chapters.length} read
          </dd>
        </div>
      </dl>

      <div className={contentStyles.prose}>
        <p>
          <b>The thread: {part.thread.name.toLowerCase()}.</b> {part.thread.text}
        </p>
        {part.outcomes ? (
          <>
            <h2>By the end of Part {part.numeral}, you’ll be able to explain</h2>
            <ul>
              {part.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            Part {part.numeral} is planned in outline. Its chapters are listed below as the course plan has them now; their sections and
            figures will be worked out when the part is planned in detail, after Part {PARTS[part.number - 2].numeral} is finished.
          </p>
        )}
      </div>

      <h2 className={styles.sectionTitle}>The chapters</h2>
      <ol className={styles.cards}>
        {chapters.map((c) => (
          <li key={c.slug}>
            <ChapterCard chapter={c} done={read.includes(c.slug)} />
          </li>
        ))}
      </ol>

      <h2 className={styles.sectionTitle}>{part.labs.length > 1 ? 'The labs' : 'The lab'}</h2>
      <ul className={styles.cards}>
        {part.labs.map(({ slug }) => (
          <li key={slug}>
            <LabCard lab={findLab(slug)!} />
          </li>
        ))}
      </ul>

      <nav className={styles.pager} aria-label="Parts">
        {previous ? (
          <a href={href(previous.slug)} className={styles.pagerLink}>
            <span className={styles.pagerLabel}>← Part {previous.numeral}</span>
            <span className={styles.pagerTitle}>{previous.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={href(next.slug)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
            <span className={styles.pagerLabel}>Part {next.numeral} →</span>
            <span className={styles.pagerTitle}>{next.title}</span>
          </a>
        )}
      </nav>
    </article>
  );
}
