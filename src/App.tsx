import { useEffect, useRef, type ReactNode } from 'react';
import { findChapter, findLab, findPart, findToolkitPage } from './site/course';
import { ErrorBoundary } from './site/ErrorBoundary';
import { Layout } from './site/Layout';
import { About } from './site/pages/About';
import { ChapterPage } from './site/pages/ChapterPage';
import { Glossary } from './site/pages/Glossary';
import { LabPage, LabsIndex } from './site/pages/LabPages';
import { Landing } from './site/pages/Landing';
import { NotFound } from './site/pages/NotFound';
import { PartPage } from './site/pages/PartPage';
import { ToolkitIndex, ToolkitPage } from './site/pages/ToolkitPages';
import { useRoute } from './site/router';

const SITE = 'The Clockwork Sky';

/** The page for an address, and its title in the browser tab. */
function resolve(page: string, section: string | null): { content: ReactNode; title: string } {
  if (page === '') return { content: <Landing />, title: `${SITE}: an interactive course in astronomy` };

  const chapter = findChapter(page);
  if (chapter) {
    return { content: <ChapterPage key={chapter.slug} chapter={chapter} section={section} />, title: `${chapter.number}. ${chapter.title} · ${SITE}` };
  }
  const part = findPart(page);
  if (part) return { content: <PartPage part={part} />, title: `Part ${part.numeral}: ${part.title} · ${SITE}` };

  const toolkit = page.startsWith('toolkit/') ? findToolkitPage(page) : undefined;
  if (toolkit) return { content: <ToolkitPage page={toolkit} />, title: `${toolkit.title} · Toolkit · ${SITE}` };

  const lab = findLab(page);
  if (lab) return { content: <LabPage lab={lab} />, title: `${lab.title} · ${SITE}` };

  switch (page) {
    case 'toolkit':
      return { content: <ToolkitIndex />, title: `Toolkit · ${SITE}` };
    case 'labs':
      return { content: <LabsIndex />, title: `Labs · ${SITE}` };
    case 'glossary':
      return { content: <Glossary />, title: `Glossary · ${SITE}` };
    case 'about':
      return { content: <About />, title: `About · ${SITE}` };
    default:
      return { content: <NotFound />, title: `Not found · ${SITE}` };
  }
}

export function App() {
  const { page, section } = useRoute();
  const { content, title } = resolve(page, section);
  const isChapter = findChapter(page) !== undefined;

  useEffect(() => {
    document.title = title;
  }, [title]);

  // New page: start at the top (chapters handle their own #section scrolling) and
  // move keyboard and screen-reader focus to the new content. The first page is
  // left alone, so that the first Tab still lands on "Skip to content".
  const shownPage = useRef(page);
  useEffect(() => {
    if (!isChapter) window.scrollTo({ top: 0 });
    if (shownPage.current === page) return;
    shownPage.current = page;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [page, isChapter]);

  return (
    <Layout>
      <ErrorBoundary key={page} what="this page">
        {content}
      </ErrorBoundary>
    </Layout>
  );
}
