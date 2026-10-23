import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { App } from './App';
import { setRenderTime } from './site/hydration';
import { preloadPage } from './site/pageContent';
import { parseLocation, setServerLocation } from './site/router';

/**
 * The server side of prerendering, built by Vite in SSR mode and run by
 * scripts/prerender.ts at build time (never in the browser).
 */

export { NOT_FOUND, PAGES } from './site/routes';
export { headTags, robotsTxt, sitemapXml } from './site/seo';

/** Renders the app at a path to HTML, with every page's content loaded first, so nothing is left behind a "Loading…" fallback. */
export async function render(path: string, renderedAt: number): Promise<string> {
  setServerLocation(path);
  setRenderTime(renderedAt);
  await preloadPage(parseLocation(path).page);
  const { prelude } = await prerender(
    <StrictMode>
      <App />
    </StrictMode>,
    // React streams a large Suspense boundary (a whole chapter) as a hidden segment that a script
    // moves into place. A static page must have it in place, readable without JavaScript.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  return new Response(prelude).text();
}
