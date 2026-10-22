import { Fragment } from 'react';
import {
  chapterNumbered,
  chaptersOf,
  findLab,
  findToolkitPage,
  partNumbered,
  toolkitPage,
  type ChapterInfo,
  type LabInfo,
  type PartInfo,
  type ToolkitInfo,
} from '../course';
import { href } from '../router';
import styles from './pages.module.css';

/** "Builds on: Chapter 2, The turning sky · Chapter 3, The Sun’s year. Toolkit: Angles in the sky." */
export function BuildsOn({ chapter }: { chapter: ChapterInfo }) {
  if (!chapter.buildsOn) return null;
  const earlier = chapter.buildsOn.map((n) => chapterNumbered(n)!);
  const toolkit = (chapter.toolkit ?? []).map((slug) => findToolkitPage(slug)!);
  return (
    <p className={styles.buildsOn}>
      <span className={styles.buildsOnLabel}>Builds on:</span>{' '}
      {earlier.length === 0
        ? 'nothing. A good place to start.'
        : earlier.map((c, i) => (
            <Fragment key={c.slug}>
              {i > 0 && ' · '}
              <a href={href(c.slug)}>
                Chapter {c.number}, {c.title}
              </a>
            </Fragment>
          ))}
      {toolkit.length > 0 && (
        <>
          {' '}
          <span className={styles.buildsOnLabel}>Toolkit:</span>{' '}
          {toolkit.map((t, i) => (
            <Fragment key={t.slug}>
              {i > 0 && ' · '}
              <a href={href(toolkitPage(t))}>{t.title}</a>
            </Fragment>
          ))}
        </>
      )}
    </p>
  );
}

/** A small dashed "Coming soon" tag: an outline rather than faded text, which would fail contrast checks. */
export function SoonTag({ children = 'Coming soon' }: { children?: string }) {
  return <span className={styles.soonTag}>{children}</span>;
}

export function ChapterCard({ chapter, done }: { chapter: ChapterInfo; done: boolean }) {
  return (
    <a href={href(chapter.slug)} className={`${styles.card} ${chapter.load ? '' : styles.cardSoon}`}>
      <span className={styles.cardNumber}>
        <span>
          Chapter {chapter.number}
          {chapter.optional && ' · optional'}
        </span>
        {done && <span className={styles.readTag}>✓ read</span>}
      </span>
      <span className={styles.cardTitle}>{chapter.title}</span>
      <span className={styles.cardBlurb}>{chapter.blurb}</span>
      {!chapter.load && <SoonTag />}
    </a>
  );
}

export function PartCard({ part }: { part: PartInfo }) {
  const chapters = chaptersOf(part.number);
  const labs = part.labs.map(({ slug, version }) => `${findLab(slug)!.title}${version > 1 ? ` v${version}` : ''}`);
  return (
    <a href={href(part.slug)} className={styles.card}>
      <span className={styles.cardNumber}>
        <span>Part {part.numeral}</span>
        <span className={styles.level}>{part.level}</span>
      </span>
      <span className={styles.cardTitle}>{part.title}</span>
      <span className={styles.cardBlurb}>{part.subject}.</span>
      <span className={styles.cardMeta}>
        Chapters {chapters[0].number}–{chapters[chapters.length - 1].number} · {labs.join(' and ')}
      </span>
      <span className={styles.cardMeta}>Maths: {part.maths}</span>
      <span className={styles.startHere}>{part.startHere}</span>
    </a>
  );
}

export function LabCard({ lab }: { lab: LabInfo }) {
  return (
    <a href={href(lab.slug)} className={`${styles.card} ${lab.load ? '' : styles.cardSoon}`}>
      <span className={styles.cardNumber}>
        <span>Lab · {lab.subject}</span>
      </span>
      <span className={styles.cardTitle}>{lab.title}</span>
      <span className={styles.cardBlurb}>{lab.blurb}</span>
      <span className={styles.cardMeta}>
        {lab.versions.map((v) => `Version ${v.version} with Part ${partNumbered(v.part).numeral}`).join(' · ')}
      </span>
      {!lab.load && <SoonTag />}
    </a>
  );
}

export function ToolkitCard({ page }: { page: ToolkitInfo }) {
  return (
    <a href={href(toolkitPage(page))} className={`${styles.card} ${page.load ? '' : styles.cardSoon}`}>
      <span className={styles.cardNumber}>
        <span>{page.code}</span>
        {page.firstNeeded && <span className={styles.level}>First needed in Chapter {page.firstNeeded}</span>}
      </span>
      <span className={styles.cardTitle}>{page.title}</span>
      <span className={styles.cardBlurb}>{page.blurb}</span>
      {!page.load && <SoonTag />}
    </a>
  );
}
