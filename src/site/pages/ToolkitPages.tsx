import { lazy, Suspense } from 'react';
import { chapterNumbered, PARTS, TOOLKIT, type ToolkitInfo } from '../course';
import { mdxComponents } from '../content/mdxComponents';
import { href } from '../router';
import { SoonTag, ToolkitCard } from './CourseCards';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

const lazyContent = new Map(TOOLKIT.flatMap((t) => (t.load ? [[t.slug, lazy(t.load)] as const] : [])));

export function ToolkitIndex() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Toolkit</p>
        <h1>The Toolkit</h1>
        <p className={styles.lede}>Short refreshers on the maths and physics the course uses, one idea per page, each with a small figure.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>Chapters link to a Toolkit page where they first need it. Skip the ones you know; come back when a chapter sends you.</p>
      </div>
      {PARTS.map((part) => (
        <section key={part.slug} aria-labelledby={`toolkit-${part.slug}`}>
          <h2 id={`toolkit-${part.slug}`} className={styles.sectionTitle}>
            For Part {part.numeral}: {part.title}
          </h2>
          <ul className={styles.cards}>
            {TOOLKIT.filter((t) => t.part === part.number).map((page) => (
              <li key={page.slug}>
                <ToolkitCard page={page} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

export function ToolkitPage({ page }: { page: ToolkitInfo }) {
  const Content = lazyContent.get(page.slug);
  const chapter = page.firstNeeded ? chapterNumbered(page.firstNeeded) : undefined;
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>Toolkit · {page.code}</p>
        <h1>{page.title}</h1>
        <p className={styles.lede}>{page.blurb}</p>
        {chapter && (
          <p className={styles.buildsOn}>
            <span className={styles.buildsOnLabel}>First needed in:</span>{' '}
            <a href={href(chapter.slug)}>
              Chapter {chapter.number}, {chapter.title}
            </a>
          </p>
        )}
      </header>
      <div className={contentStyles.prose}>
        {Content ? (
          <Suspense fallback={<p className={styles.loading}>Loading…</p>}>
            {/* Every lazy component is made once, at module level, in lazyContent. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Content components={mdxComponents} />
          </Suspense>
        ) : (
          <p>
            <SoonTag /> This page isn’t written yet. It arrives with the chapter that first needs it.
          </p>
        )}
        <p>
          <a href={href('toolkit')}>← The whole Toolkit</a>
        </p>
      </div>
    </article>
  );
}
