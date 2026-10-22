import { lazy, Suspense, useEffect, useRef } from 'react';
import { chapterNumbered, CHAPTERS, partNumbered, sectionId, type ChapterInfo } from '../course';
import { mdxComponents } from '../content/mdxComponents';
import { markChapterRead } from '../progress';
import { href, scrollToSection } from '../router';
import { BuildsOn, SoonTag } from './CourseCards';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

const lazyContent = new Map(CHAPTERS.flatMap((c) => (c.load ? [[c.slug, lazy(c.load)] as const] : [])));

export function ChapterPage({ chapter, section }: { chapter: ChapterInfo; section: string | null }) {
  const Content = lazyContent.get(chapter.slug);
  const part = partNumbered(chapter.part);

  const header = (
    <header className={styles.chapterHeader}>
      <p className={styles.kicker}>
        Part {part.numeral} · Chapter {chapter.number}
        {chapter.optional && ' · optional'}
      </p>
      <h1>{chapter.title}</h1>
      <p className={styles.lede}>{chapter.blurb}</p>
      <BuildsOn chapter={chapter} />
    </header>
  );

  if (!Content) {
    return (
      <article className={styles.page}>
        {header}
        <PlannedChapter chapter={chapter} />
        <ChapterPager chapter={chapter} />
      </article>
    );
  }

  return (
    <article className={styles.page}>
      {header}
      <div className={contentStyles.prose}>
        <Suspense fallback={<p className={styles.loading}>Loading the chapter…</p>}>
          {/* Not created during render: every lazy component is made once, at module level, in lazyContent. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Content components={mdxComponents} />
          <ScrollToSection chapter={chapter.slug} section={section} />
          {/* Inside Suspense, so the footer can't be "seen" (and the chapter marked read) before the text loads. */}
          <ReadMarker chapter={chapter} />
        </Suspense>
      </div>
      <ChapterPager chapter={chapter} />
    </article>
  );
}

/** A chapter that isn't written yet: what it will cover, as far as it is planned. */
function PlannedChapter({ chapter }: { chapter: ChapterInfo }) {
  const part = partNumbered(chapter.part);
  return (
    <div className={contentStyles.prose}>
      <p>
        <SoonTag /> This chapter isn’t written yet. The course is being built one chapter at a time, starting with Part I.
      </p>
      {chapter.sections.length > 0 ? (
        <>
          <h2>What it will cover</h2>
          <ol className={styles.planned}>
            {chapter.sections.map((title, i) => (
              <li key={sectionId(title)}>
                <span className={styles.plannedNumber}>
                  {chapter.number}.{i + 1}
                </span>{' '}
                {title}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p>
          Part {part.numeral} is planned in outline, so the chapter’s sections and figures will be worked out when the part is planned in
          detail.
        </p>
      )}
      <p>
        <a href={href(part.slug)}>
          All of Part {part.numeral}: {part.title} →
        </a>
      </p>
    </div>
  );
}

/** Rendered after the chapter content, so the section heading exists when this runs. */
function ScrollToSection({ chapter, section }: { chapter: string; section: string | null }) {
  const first = useRef(true);
  useEffect(() => {
    const behavior = first.current ? 'auto' : 'smooth';
    first.current = false;
    if (!section || !scrollToSection(section, behavior)) window.scrollTo({ top: 0 });
  }, [chapter, section]);
  return null;
}

/** Reaching the end of a chapter counts as having read it. */
function ReadMarker({ chapter }: { chapter: ChapterInfo }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) markChapterRead(chapter.slug);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [chapter.slug]);
  return <div ref={ref} />;
}

/** Previous and next chapter, straight through the parts. */
function ChapterPager({ chapter }: { chapter: ChapterInfo }) {
  const previous = chapterNumbered(chapter.number - 1);
  const next = chapterNumbered(chapter.number + 1);
  return (
    <nav className={styles.pager} aria-label="Chapters">
      {previous ? (
        <a href={href(previous.slug)} className={styles.pagerLink}>
          <span className={styles.pagerLabel}>← Chapter {previous.number}</span>
          <span className={styles.pagerTitle}>{previous.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a href={href(next.slug)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
          <span className={styles.pagerLabel}>
            {next.part !== chapter.part ? `Part ${partNumbered(next.part).numeral} · ` : ''}Chapter {next.number} →
          </span>
          <span className={styles.pagerTitle}>{next.title}</span>
        </a>
      ) : (
        <a href={href('')} className={`${styles.pagerLink} ${styles.pagerNext}`}>
          <span className={styles.pagerLabel}>The end</span>
          <span className={styles.pagerTitle}>Back to the start →</span>
        </a>
      )}
    </nav>
  );
}
