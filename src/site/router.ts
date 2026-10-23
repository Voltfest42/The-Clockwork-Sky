import { useSyncExternalStore } from 'react';

/**
 * Routing on real paths: every page has its own address with a trailing slash,
 * "/the-turning-sky/", and sections within it are plain fragments,
 * "/the-turning-sky/#the-sky-as-a-dome". Toolkit pages live one level down,
 * "/toolkit/powers-of-ten/", and their page is "toolkit/powers-of-ten".
 *
 * Each address is prerendered to its own HTML file, so search engines and link
 * previews see the page. In the browser, clicks on internal links are caught and
 * turned into History API navigations, so the app never reloads.
 *
 * Nothing here touches `window` at import time: the module also runs on the
 * server, where `setServerLocation` says which page is being rendered.
 */
export interface Route {
  page: string;
  section: string | null;
}

/** The route for a path and fragment: ("/toolkit/powers-of-ten/", "#prefixes") → toolkit/powers-of-ten, prefixes. */
export function parseLocation(pathname: string, hash = ''): Route {
  const parts = pathname.split('/').filter(Boolean).map(decode);
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  const section = decode(hash.replace(/^#/, ''));
  return { page: parts.join('/'), section: section || null };
}

/** The address of a page, and optionally a section on it: "/toolkit/powers-of-ten/#prefixes". */
export function href(page: string, section?: string | null): string {
  return `/${page ? `${page}/` : ''}${section ? `#${section}` : ''}`;
}

/** First parts of an old "#/" address that grouped pages beneath them. */
const NAMESPACES = new Set(['toolkit']);

/**
 * The new address for an old hash link ("#/<page>/<section>", from before pages had
 * paths), or null if the fragment isn't one: "#/the-moon/eclipses" → "/the-moon/#eclipses".
 */
export function movedAddress(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const parts = hash.slice(2).split('/').filter(Boolean).map(decode);
  if (parts.length > 1 && NAMESPACES.has(parts[0])) parts.splice(0, 2, `${parts[0]}/${parts[1]}`);
  return href(parts[0] ?? '', parts[1] ?? null);
}

/** Decodes %-escapes, leaving a malformed part (a mistyped link) as it is instead of throwing. */
function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

// ---------- The current location ----------

const listeners = new Set<() => void>();
let serverLocation = '/';

/** On the server: the path being prerendered. */
export function setServerLocation(path: string): void {
  serverLocation = path;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

const currentLocation = () => window.location.pathname + window.location.hash;

/**
 * While hydrating, the browser's own address is right: the HTML was prerendered
 * for this path (the fragment changes nothing that is rendered).
 */
const initialLocation = () => (typeof window === 'undefined' ? serverLocation : currentLocation());

export function useRoute(): Route {
  const location = useSyncExternalStore(subscribe, currentLocation, initialLocation);
  const hashAt = location.indexOf('#');
  return hashAt < 0 ? parseLocation(location) : parseLocation(location.slice(0, hashAt), location.slice(hashAt));
}

/** Goes to an address inside the site without reloading. Going to the address already shown just scrolls to its section. */
export function navigate(to: string): void {
  const url = new URL(to, window.location.href);
  const next = url.pathname + url.search + url.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash) {
    const { section } = parseLocation(url.pathname, url.hash);
    if (section) scrollToSection(section);
    return;
  }
  window.history.pushState(null, '', next);
  notify();
}

/** A path that is a page of the site, not a file such as /sitemap.xml or /og-image.png. */
function isPagePath(pathname: string): boolean {
  return !/\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('/index.html');
}

/**
 * Catches plain left-clicks on links to pages of this site and navigates without
 * reloading. Modified clicks (new tab, new window, download), links with a target,
 * and links that something else already handled are left to the browser.
 */
export function interceptLinks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || !link.href || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || !isPagePath(url.pathname)) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

/** Scrolls a section heading into view, leaving room for the sticky top bar on small screens. */
export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth'): boolean {
  const element = document.getElementById(id);
  if (!element) return false;
  const top = element.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior });
  return true;
}

/** A URL-safe id for a heading: "The Sun’s year" → "the-suns-year". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
