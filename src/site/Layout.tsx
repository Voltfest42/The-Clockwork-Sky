import { useEffect, useState, type ReactNode } from 'react';
import {
  chaptersOf,
  findLab,
  partOfPage,
  PARTS,
  sectionId,
  type ChapterInfo,
  type PartInfo,
  type PartNumber,
} from './course';
import { useReadChapters } from './progress';
import { href, scrollToSection, useRoute } from './router';
import styles from './Layout.module.css';

/** The front page that lists all the explainers, this one included. */
const HOME_URL = 'https://moving-parts.dev';

const EXTRAS = [
  { page: 'toolkit', label: 'Toolkit' },
  { page: 'labs', label: 'Labs' },
  { page: 'glossary', label: 'Glossary' },
  { page: 'about', label: 'About this course' },
];

export function Layout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPart = partOfPage(route.page);
  const [openParts, setOpenParts] = useState<ReadonlySet<PartNumber>>(() => new Set([currentPart ?? 1]));

  // On navigation: close the mobile menu, and open the sidebar group of the part being read.
  const routeKey = href(route.page, route.section);
  const [lastRoute, setLastRoute] = useState(routeKey);
  if (lastRoute !== routeKey) {
    setLastRoute(routeKey);
    setMenuOpen(false);
    if (currentPart && !openParts.has(currentPart)) setOpenParts(new Set([...openParts, currentPart]));
  }

  const toggle = (part: PartNumber) => {
    const next = new Set(openParts);
    if (next.has(part)) next.delete(part);
    else next.add(part);
    setOpenParts(next);
  };

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>

      <header className={styles.topbar}>
        <a href={href('')} className={styles.brand}>
          The Clockwork Sky
        </a>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Contents'}
        </button>
      </header>

      <nav id="site-nav" className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`} aria-label="Contents">
        <a href={HOME_URL} className={styles.home}>
          <span aria-hidden="true">←</span> Moving Parts
        </a>
        <a href={href('')} className={`${styles.brand} ${styles.sidebarBrand}`}>
          The Clockwork Sky
        </a>
        <p className={styles.tagline}>An interactive course in astronomy and astrophysics</p>

        <ul className={styles.partList}>
          {PARTS.map((part) => (
            <PartGroup key={part.slug} part={part} page={route.page} open={openParts.has(part.number)} onToggle={() => toggle(part.number)} />
          ))}
        </ul>

        <ul className={styles.extraList}>
          {EXTRAS.map(({ page, label }) => {
            const active = route.page === page || route.page.startsWith(`${page}/`) || (page === 'labs' && findLab(route.page) !== undefined);
            return (
              <li key={page}>
                <a href={href(page)} className={active ? styles.active : undefined} aria-current={route.page === page ? 'page' : undefined}>
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

function PartGroup({ part, page, open, onToggle }: { part: PartInfo; page: string; open: boolean; onToggle: () => void }) {
  const read = useReadChapters();
  const listId = `${part.slug}-contents`;
  const active = page === part.slug;
  return (
    <li className={styles.part}>
      <div className={styles.partHeader}>
        <a href={href(part.slug)} className={`${styles.partLink} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>
          <span className={styles.partNumber}>Part {part.numeral}</span>
          <span className={styles.partTitle}>{part.title}</span>
        </a>
        <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={listId} onClick={onToggle}>
          <span className="visually-hidden">Chapters of Part {part.numeral}</span>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={open ? styles.chevronOpen : undefined}>
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <ol id={listId} className={styles.chapterList} hidden={!open}>
        {chaptersOf(part.number).map((chapter) => (
          <ChapterLink key={chapter.slug} chapter={chapter} active={chapter.slug === page} done={read.includes(chapter.slug)} />
        ))}
        {part.labs.map(({ slug, version }) => {
          const lab = findLab(slug)!;
          return (
            <li key={slug}>
              <a href={href(slug)} className={`${styles.chapterLink} ${page === slug ? styles.active : ''}`} aria-current={page === slug ? 'page' : undefined}>
                <span className={`${styles.badge} ${styles.labBadge}`} aria-hidden="true">
                  ⚙
                </span>
                <span>
                  {lab.title}
                  {version > 1 && <span className={styles.version}> v{version}</span>}
                  {!lab.load && <span className={styles.soon}>soon</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

function ChapterLink({ chapter, active, done }: { chapter: ChapterInfo; active: boolean; done: boolean }) {
  const activeSection = useActiveSection(active && chapter.load ? chapter.sections.map(sectionId) : []);
  return (
    <li>
      <a href={href(chapter.slug)} className={`${styles.chapterLink} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>
        <span className={`${styles.badge} ${done ? styles.badgeDone : ''}`} aria-hidden="true">
          {done ? '✓' : chapter.number}
        </span>
        <span>
          <span className="visually-hidden">Chapter {chapter.number}: </span>
          {chapter.title}
          {!chapter.load && <span className={styles.soon}>soon</span>}
          {done && <span className="visually-hidden"> (read)</span>}
        </span>
      </a>
      {active && chapter.load && chapter.sections.length > 0 && (
        <ol className={styles.sectionList}>
          {chapter.sections.map((title) => {
            const id = sectionId(title);
            return (
              <li key={id}>
                <a
                  href={href(chapter.slug, id)}
                  className={id === activeSection ? styles.activeSection : undefined}
                  aria-current={id === activeSection ? 'location' : undefined}
                  onClick={() => {
                    // Same URL as now: no hashchange will fire, so scroll directly.
                    if (window.location.hash === href(chapter.slug, id)) scrollToSection(id);
                  }}
                >
                  {title}
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

/** Headings above this line (px from the top of the window) count as "scrolled past". */
const ACTIVE_LINE = 140;

/**
 * The section being read, for highlighting in the sidebar: normally the last
 * heading scrolled past the line near the top of the window. A short final
 * section can never reach that line, because the page runs out first, so once
 * the page is scrolled to the very bottom, the last heading visible on screen wins.
 */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    const sectionIds = key ? key.split('|') : [];
    if (sectionIds.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const line = atBottom ? window.innerHeight : ACTIVE_LINE;
      let current: string | null = null;
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top < line) current = id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}
