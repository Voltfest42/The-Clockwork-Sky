import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { preloadPage } from './site/pageContent';
import { interceptLinks, movedAddress, parseLocation } from './site/router';
import './styles/global.css';

const container = document.getElementById('root')!;

// An old "#/page/section" link: move to the page's own address. The HTML that came
// with it is the start page's, so the app renders from scratch instead of
// hydrating. (A script in index.html hid it until now, so it never flashes.)
const moved = movedAddress(window.location.hash);
if (moved) window.history.replaceState(null, '', moved);

interceptLinks();

// The first page's content is loaded before rendering, so hydration renders it
// at once, just as the prerender did.
try {
  await preloadPage(parseLocation(window.location.pathname).page);
} catch {
  // A failed download shows up as the page's own error once it renders.
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (container.hasChildNodes() && !moved) {
  hydrateRoot(container, app);
} else {
  // The dev server, which doesn't prerender, or a moved link.
  container.replaceChildren();
  const root = createRoot(container);
  flushSync(() => root.render(app));
  document.documentElement.removeAttribute('data-moved');
}
