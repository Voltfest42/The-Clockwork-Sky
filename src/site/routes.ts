import { chaptersOf, LABS, PARTS, TOOLKIT, toolkitPage, type PartInfo } from './course';
import { href } from './router';

/**
 * Every page of the site, with its title and description, made from the course
 * registry plus the extra pages. It is the one list that the prerender, the head
 * tags, the sitemap and the browser tab's title all read, so a chapter added to
 * course.ts gets its own address, HTML, head tags and sitemap entry by itself.
 */

export const SITE_NAME = 'The Clockwork Sky';
/** The site's one address: every canonical link and sitemap entry starts with it. */
export const SITE_URL = 'https://sky.moving-parts.dev';

export type PageKind = 'start' | 'part' | 'chapter' | 'toolkit-index' | 'toolkit' | 'labs' | 'lab' | 'glossary' | 'about';

export interface PageMeta {
  /** The page as the router names it: "", "the-turning-sky", "toolkit/powers-of-ten". */
  page: string;
  kind: PageKind;
  /** Its address: "/", "/the-turning-sky/". */
  path: string;
  /** The browser tab's title, and the title in search results and link previews. */
  title: string;
  /** The search-result and link-preview description: a sentence or two. */
  description: string;
}

export const START_DESCRIPTION =
  'An interactive course in astronomy and astrophysics that starts from scratch: from the sky you can see to the physics inside the stars, with live figures that run real physics in your browser.';

/** The pages that aren't in the course registry, with their titles and descriptions. */
const EXTRAS: readonly { page: string; kind: PageKind; title: string; description: string }[] = [
  {
    page: 'toolkit',
    kind: 'toolkit-index',
    title: 'Toolkit',
    description: 'Short refreshers on the maths and physics The Clockwork Sky uses, one idea per page, each with a small interactive figure.',
  },
  {
    page: 'labs',
    kind: 'labs',
    title: 'Labs',
    description:
      'The Clockwork Sky’s two labs, the Orrery and the Star Forge: build planetary systems and stars, set the starting conditions, and let the physics run.',
  },
  {
    page: 'glossary',
    kind: 'glossary',
    title: 'Glossary',
    description: 'Plain-language definitions of every astronomy term used in The Clockwork Sky, from the arcsecond to the zenith.',
  },
  {
    page: 'about',
    kind: 'about',
    title: 'About',
    description:
      'About The Clockwork Sky: how its figures compute real physics in your browser, what they simplify, where the data comes from, and how it is tested.',
  },
];

function meta(page: string, kind: PageKind, title: string, description: string): PageMeta {
  return { page, kind, path: href(page), title, description };
}

function partDescription(part: PartInfo): string {
  const chapters = chaptersOf(part.number);
  const span = `${chapters[0].number}–${chapters[chapters.length - 1].number}`;
  return `Part ${part.numeral} of ${SITE_NAME}, an interactive astronomy course: ${part.subject.toLowerCase()}, in chapters ${span}. ${part.level} level. ${part.thread.text}`;
}

/** Every page, in reading order: the start page, then each part followed by its chapters, then the Toolkit, the labs and the rest. */
export const PAGES: readonly PageMeta[] = [
  meta('', 'start', `${SITE_NAME}: an interactive course in astronomy`, START_DESCRIPTION),
  ...PARTS.flatMap((part) => [
    meta(part.slug, 'part', `Part ${part.numeral}: ${part.title} · ${SITE_NAME}`, partDescription(part)),
    ...chaptersOf(part.number).map((c) => meta(c.slug, 'chapter', `${c.number}. ${c.title} · ${SITE_NAME}`, c.blurb)),
  ]),
  ...EXTRAS.filter((e) => e.kind === 'toolkit-index').map((e) => meta(e.page, e.kind, `${e.title} · ${SITE_NAME}`, e.description)),
  ...TOOLKIT.map((t) => meta(toolkitPage(t), 'toolkit', `${t.title} · Toolkit · ${SITE_NAME}`, t.blurb)),
  ...EXTRAS.filter((e) => e.kind === 'labs').map((e) => meta(e.page, e.kind, `${e.title} · ${SITE_NAME}`, e.description)),
  ...LABS.map((l) => meta(l.slug, 'lab', `${l.title} · ${SITE_NAME}`, l.blurb)),
  ...EXTRAS.filter((e) => e.kind === 'glossary' || e.kind === 'about').map((e) => meta(e.page, e.kind, `${e.title} · ${SITE_NAME}`, e.description)),
];

/** The page for an unknown address. It is prerendered as 404.html and never listed. */
export const NOT_FOUND: Omit<PageMeta, 'kind'> = {
  page: '404',
  path: '/404.html',
  title: `Not found · ${SITE_NAME}`,
  description: 'There is no page at this address in The Clockwork Sky.',
};

const BY_PAGE = new Map(PAGES.map((p) => [p.page, p]));

/** A page's title and description, or null for an unknown address. */
export function pageMeta(page: string): PageMeta | null {
  return BY_PAGE.get(page) ?? null;
}
