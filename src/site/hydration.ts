import { useSyncExternalStore } from 'react';

/**
 * Every page is prerendered to HTML at build time and then hydrated in the
 * browser. During hydration React must render exactly what the server did, so
 * anything that depends on the browser (canvas, WebGL, storage, the clock) waits
 * until hydration is over. These hooks say when that is.
 */

const never = () => () => {};

/**
 * False on the server and while the page hydrates, true from then on (and at
 * once for pages opened later without a reload). A component that renders
 * something else once it is true re-renders straight after hydration.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

let loadedAt: number | null = null;
let serverTime = 0;

/** When the page loaded in this browser, in Unix milliseconds. */
export function pageLoadedAt(): number {
  return (loadedAt ??= Date.now());
}

/** On the server: the time the HTML is rendered at, which the prerender also writes into the page. */
export function setRenderTime(ms: number): void {
  serverTime = ms;
}

/** The time the HTML was rendered at: written on <html data-rendered> by the prerender. */
function renderTime(): number {
  if (typeof document === 'undefined') return serverTime;
  const rendered = Number(document.documentElement.dataset.rendered);
  return Number.isFinite(rendered) && rendered > 0 ? rendered : pageLoadedAt();
}

/**
 * "Now" for text that depends on today's date, in Unix milliseconds: the time the
 * page was rendered at during prerendering and hydration, so the two agree, and
 * then the moment the page loaded in the reader's browser.
 */
export function usePageTime(): number {
  return useSyncExternalStore(never, pageLoadedAt, renderTime);
}
