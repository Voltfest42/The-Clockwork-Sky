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
import { NOT_FOUND, pageMeta } from './site/routes';
import { scrollToSection, useRoute } from './site/router';
import { applyHead } from './site/seo';

/** The page for an address. Its title and description come from the route list (routes.ts). */
function resolve(page: string, section: string | null): ReactNode {
  if (page === '') return <Landing />;

  const chapter = findChapter(page);
  if (chapter) return <ChapterPage key={chapter.slug} chapter={chapter} section={section} />;
  const part = findPart(page);
  if (part) return <PartPage part={part} />;

  const toolkit = page.startsWith('toolkit/') ? findToolkitPage(page) : undefined;
  if (toolkit) return <ToolkitPage page={toolkit} />;

  const lab = findLab(page);
  if (lab) return <LabPage lab={lab} />;

  switch (page) {
    case 'toolkit':
      return <ToolkitIndex />;
    case 'labs':
      return <LabsIndex />;
    case 'glossary':
      return <Glossary />;
    case 'about':
      return <About />;
    default:
      return <NotFound />;
  }
}

export function App() {
  const { page, section } = useRoute();
  const content = resolve(page, section);
  const isChapter = findChapter(page) !== undefined;

  useEffect(() => {
    applyHead(pageMeta(page) ?? NOT_FOUND);
  }, [page]);

  // New page: start at the top, or at the #section asked for (chapters handle their
  // own, once their content is in), and move keyboard and screen-reader focus to the
  // new content. The first page is left alone, so that the first Tab still lands on
  // "Skip to content".
  const shownPage = useRef(page);
  useEffect(() => {
    if (!isChapter && !(section && scrollToSection(section, 'auto'))) window.scrollTo({ top: 0 });
    if (shownPage.current === page) return;
    shownPage.current = page;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [page, section, isChapter]);

  return (
    <Layout>
      <ErrorBoundary key={page} what="this page">
        {content}
      </ErrorBoundary>
    </Layout>
  );
}
