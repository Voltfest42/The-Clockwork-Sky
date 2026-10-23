import { findChapter, findToolkitPage, partNumbered, PARTS, type PartInfo } from './course';
import { NOT_FOUND, PAGES, SITE_NAME, SITE_URL, START_DESCRIPTION, type PageMeta } from './routes';

/**
 * What search engines and link previews read: each page's head tags, its
 * structured data (JSON-LD), the sitemap and robots.txt. All of it is made from
 * the route list in routes.ts, at build time, by scripts/prerender.ts.
 */

/** The link-preview image, rendered in the Moving Parts project (`npm run previews` there). */
export const OG_IMAGE = { url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'The Clockwork Sky: a planet on its orbit round the Sun, beside the title' };

const PROVIDER = { '@type': 'Organization', name: 'Moving Parts', url: 'https://moving-parts.dev/', sameAs: 'https://moving-parts.dev/' };
const COURSE_ID = `${SITE_URL}/#course`;

/** A page's full address: "https://sky.moving-parts.dev/the-turning-sky/". */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Escapes text for an HTML attribute value or element content. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON for a <script> element: "<" is escaped, so no string in it can close the element. */
function scriptJson(data: unknown): string {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

/** The schema.org Course: the start page's structured data. */
export function courseJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': COURSE_ID,
    name: SITE_NAME,
    description: START_DESCRIPTION,
    url: `${SITE_URL}/`,
    image: OG_IMAGE.url,
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    educationalLevel: 'Beginner',
    about: ['Astronomy', 'Astrophysics'],
    provider: PROVIDER,
    offers: { '@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'GBP' },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', inLanguage: 'en-GB' },
    syllabusSections: PARTS.map((part) => ({ '@type': 'Syllabus', name: `Part ${part.numeral}: ${part.title}`, description: `${part.subject}. ${part.thread.text}` })),
  };
}

/** A chapter or Toolkit page: a schema.org LearningResource that is part of the course. */
function learningResource(page: PageMeta, name: string, type: string, part: PartInfo, position?: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name,
    description: page.description,
    url: canonicalUrl(page.path),
    image: OG_IMAGE.url,
    learningResourceType: type,
    ...(position === undefined ? {} : { position }),
    educationalLevel: part.level,
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    provider: PROVIDER,
    isPartOf: { '@type': 'Course', '@id': COURSE_ID, name: SITE_NAME, url: `${SITE_URL}/` },
  };
}

/** A page's structured data, if it has any: the course on the start page, a learning resource on each chapter and Toolkit page. */
export function pageJsonLd(page: PageMeta): object | null {
  switch (page.kind) {
    case 'start':
      return courseJsonLd();
    case 'chapter': {
      const chapter = findChapter(page.page)!;
      return learningResource(page, `Chapter ${chapter.number}: ${chapter.title}`, 'Chapter', partNumbered(chapter.part), chapter.number);
    }
    case 'toolkit': {
      const toolkit = findToolkitPage(page.page)!;
      return learningResource(page, `${toolkit.code}: ${toolkit.title}`, 'Refresher', partNumbered(toolkit.part));
    }
    default:
      return null;
  }
}

/**
 * The tags that go in a page's <head>: title, description, canonical address,
 * Open Graph and X/Twitter link previews, and structured data. The 404 page gets
 * a title and description only, and asks not to be indexed.
 */
export function headTags(page: PageMeta | typeof NOT_FOUND): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  if (!('kind' in page)) {
    return [`<title>${title}</title>`, `<meta name="description" content="${description}" />`, '<meta name="robots" content="noindex" />'].join('\n    ');
  }
  const url = escapeHtml(canonicalUrl(page.path));
  const jsonLd = pageJsonLd(page);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    '',
    '<!-- Link previews (Open Graph and X/Twitter). The image is rendered in the Moving Parts project. -->',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Moving Parts" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE.url}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE.alt)}" />`,
    '<meta property="og:locale" content="en_GB" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    ...(jsonLd ? ['', `<script type="application/ld+json">\n${scriptJson(jsonLd)}\n    </script>`] : []),
  ].join('\n    ');
}

/** The sitemap: every page's canonical address, and nothing else. */
export function sitemapXml(pages: readonly PageMeta[] = PAGES): string {
  const urls = pages.map((p) => `  <url>\n    <loc>${escapeHtml(canonicalUrl(p.path))}</loc>\n  </url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

export function robotsTxt(): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n');
}

/**
 * Keeps the head right after the app moves to another page without a reload:
 * the title, description and canonical address. (Crawlers read the prerendered
 * head; this is for the browser tab, bookmarks and anything that reads the live page.)
 */
export function applyHead(page: PageMeta | typeof NOT_FOUND): void {
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!('kind' in page)) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.append(canonical);
  }
  canonical.setAttribute('href', canonicalUrl(page.path));
}
