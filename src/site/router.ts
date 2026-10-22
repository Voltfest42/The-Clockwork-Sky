import { useSyncExternalStore } from 'react';

/**
 * Hash-based routing: "#/<page>/<section>". Every URL is served by the same
 * index.html, so the static host needs no rewrite rules. Toolkit pages live one
 * level down, "#/toolkit/<page>/<section>", and their page is "toolkit/<page>".
 */
export interface Route {
  page: string;
  section: string | null;
}

/** First parts of a URL that group pages beneath them. */
const NAMESPACES = new Set(['toolkit']);

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode);
  if (parts.length > 1 && NAMESPACES.has(parts[0])) parts.splice(0, 2, `${parts[0]}/${parts[1]}`);
  return { page: parts[0] ?? '', section: parts[1] ?? null };
}

/** Decodes %-escapes, leaving a malformed part (a mistyped link) as it is instead of throwing. */
function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function href(page: string, section?: string | null): string {
  return `#/${page}${section ? `/${section}` : ''}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  return parseHash(hash);
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
