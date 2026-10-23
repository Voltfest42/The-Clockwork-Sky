import { describe, expect, it } from 'vitest';
import { viewerRequestCode } from '../infra/lib/viewer-request';
import { CHAPTERS, LABS, PARTS, TOOLKIT } from '../src/site/course';
import { href } from '../src/site/router';
import { NOT_FOUND, pageMeta, PAGES, SITE_URL } from '../src/site/routes';
import { canonicalUrl, courseJsonLd, headTags, pageJsonLd, robotsTxt, sitemapXml } from '../src/site/seo';

describe('the route list', () => {
  it('has every page of the course, each once, in reading order', () => {
    const expected = [
      '',
      ...PARTS.flatMap((p) => [p.slug, ...CHAPTERS.filter((c) => c.part === p.number).map((c) => c.slug)]),
      'toolkit',
      ...TOOLKIT.map((t) => `toolkit/${t.slug}`),
      'labs',
      ...LABS.map((l) => l.slug),
      'glossary',
      'about',
    ];
    expect(PAGES.map((p) => p.page)).toEqual(expected);
  });

  it('gives each page its own address, title and description', () => {
    for (const p of PAGES) {
      expect(p.path).toBe(href(p.page));
      expect(p.path).toMatch(/^\/([a-z0-9-]+\/)*$/);
      expect(pageMeta(p.page)).toBe(p);
      expect(p.description.length, p.page).toBeGreaterThan(50);
    }
    for (const key of ['path', 'title', 'description'] as const) expect(new Set(PAGES.map((p) => p[key])).size, key).toBe(PAGES.length);
  });

  it('takes chapters’ titles and descriptions from the course registry', () => {
    const chapter = pageMeta('the-turning-sky')!;
    expect(chapter.title).toBe('2. The turning sky · The Clockwork Sky');
    expect(chapter.description).toBe(CHAPTERS[1].blurb);
    expect(pageMeta('no-such-page')).toBeNull();
  });
});

describe('the sitemap and robots.txt', () => {
  it('lists exactly the routes, at their canonical addresses, with no fragments', () => {
    const xml = sitemapXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(PAGES.map((p) => `${SITE_URL}${p.path}`));
    expect(xml).not.toContain('#');
    expect(xml).not.toContain('404');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
  });

  it('points robots to the sitemap', () => {
    expect(robotsTxt()).toBe('User-agent: *\nAllow: /\n\nSitemap: https://sky.moving-parts.dev/sitemap.xml\n');
  });
});

describe('head tags', () => {
  const tag = (html: string, pattern: RegExp) => html.match(pattern)?.[1];

  it('give every page its title, description, canonical address and link previews', () => {
    for (const p of PAGES) {
      const html = headTags(p);
      const url = canonicalUrl(p.path);
      expect(tag(html, /<title>([^<]*)<\/title>/), p.page).toBe(p.title.replace(/&/g, '&amp;'));
      expect(tag(html, /<link rel="canonical" href="([^"]*)"/)).toBe(url);
      expect(tag(html, /<meta property="og:url" content="([^"]*)"/)).toBe(url);
      expect(html).toContain('<meta property="og:site_name" content="Moving Parts" />');
      expect(html).toContain('<meta property="og:image" content="https://sky.moving-parts.dev/og-image.png" />');
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
      expect(html).toContain('<meta property="og:image:height" content="630" />');
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    }
  });

  it('escape quotes and angle brackets', () => {
    const html = headTags({ page: 'x', kind: 'about', path: '/x/', title: 'A <b> & "c"', description: 'Say "hi" <now>.' });
    expect(html).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
    expect(html).toContain('content="Say &quot;hi&quot; &lt;now&gt;."');
  });

  it('ask search engines not to index the not-found page, which has no canonical address', () => {
    const html = headTags(NOT_FOUND);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('canonical');
  });
});

describe('structured data', () => {
  it('describes the course on the start page, free, in English, from Moving Parts', () => {
    const course = courseJsonLd();
    expect(course['@type']).toBe('Course');
    // Google's required properties for Course: name and description; provider is recommended.
    expect(course.name).toBe('The Clockwork Sky');
    expect(course.description.length).toBeGreaterThan(60);
    expect(course.provider).toEqual({ '@type': 'Organization', name: 'Moving Parts', url: 'https://moving-parts.dev/', sameAs: 'https://moving-parts.dev/' });
    expect(course.isAccessibleForFree).toBe(true);
    expect(course.offers.category).toBe('Free');
    expect(course.inLanguage).toMatch(/^en/);
    expect(course.educationalLevel).toBe('Beginner');
    expect(course.syllabusSections).toHaveLength(3);
    expect(pageJsonLd(pageMeta('')!)).toEqual(course);
  });

  it('makes each chapter a learning resource that is part of the course', () => {
    for (const chapter of CHAPTERS) {
      const data = pageJsonLd(pageMeta(chapter.slug)!) as Record<string, unknown>;
      expect(data['@type']).toBe('LearningResource');
      expect(data.name).toBe(`Chapter ${chapter.number}: ${chapter.title}`);
      expect(data.url).toBe(`${SITE_URL}/${chapter.slug}/`);
      expect(data.isPartOf).toMatchObject({ '@type': 'Course', '@id': courseJsonLd()['@id'] });
    }
    expect(pageJsonLd(pageMeta('glossary')!)).toBeNull();
  });

  it('is written so that no text in it can close its script element', () => {
    const html = headTags(pageMeta('')!);
    const json = html.slice(html.indexOf('<script type="application/ld+json">') + 35, html.lastIndexOf('</script>'));
    expect(JSON.parse(json)).toEqual(courseJsonLd());
    expect(json).not.toContain('</');
  });
});

// ---------- The CloudFront Function ----------

interface EdgeRequest {
  uri: string;
  headers: Record<string, { value: string }>;
  querystring: Record<string, { value: string; multiValue?: { value: string }[] }>;
}
interface EdgeRedirect {
  statusCode: number;
  statusDescription: string;
  headers: { location: { value: string } };
}

const HOST = 'sky.moving-parts.dev';
const handler = new Function(`${viewerRequestCode(HOST)}\nreturn handler;`)() as (event: { request: EdgeRequest }) => EdgeRequest | EdgeRedirect;

function request(uri: string, host = HOST, querystring: EdgeRequest['querystring'] = {}) {
  return handler({ request: { uri, headers: { host: { value: host } }, querystring } });
}

function location(result: EdgeRequest | EdgeRedirect): string | null {
  if (!('statusCode' in result)) return null;
  expect(result.statusCode).toBe(301);
  expect(result.statusDescription).toBe('Moved Permanently');
  return result.headers.location.value;
}

describe('the viewer-request function', () => {
  it('serves a page’s folder from its index.html', () => {
    expect(request('/')).toMatchObject({ uri: '/index.html' });
    expect(request('/the-turning-sky/')).toMatchObject({ uri: '/the-turning-sky/index.html' });
    expect(request('/toolkit/powers-of-ten/')).toMatchObject({ uri: '/toolkit/powers-of-ten/index.html' });
  });

  it('passes files through untouched', () => {
    for (const uri of ['/assets/index-abc123.js', '/og-image.png', '/sitemap.xml', '/robots.txt', '/favicon.svg', '/404.html']) {
      expect(request(uri)).toMatchObject({ uri });
    }
  });

  it('adds the trailing slash to a page’s address, keeping the query', () => {
    expect(location(request('/the-turning-sky'))).toBe('https://sky.moving-parts.dev/the-turning-sky/');
    expect(location(request('/toolkit/powers-of-ten'))).toBe('https://sky.moving-parts.dev/toolkit/powers-of-ten/');
    expect(location(request('/the-moon', HOST, { ref: { value: 'x' } }))).toBe('https://sky.moving-parts.dev/the-moon/?ref=x');
  });

  it('drops a typed index.html, so each page has one address', () => {
    expect(location(request('/index.html'))).toBe('https://sky.moving-parts.dev/');
    expect(location(request('/the-moon/index.html'))).toBe('https://sky.moving-parts.dev/the-moon/');
  });

  it('sends every other host name to the site’s own, keeping the path and query, in one hop', () => {
    const other = 'd1234abcd.cloudfront.net';
    expect(location(request('/', other))).toBe('https://sky.moving-parts.dev/');
    expect(location(request('/the-moon/', other))).toBe('https://sky.moving-parts.dev/the-moon/');
    expect(location(request('/the-moon', other))).toBe('https://sky.moving-parts.dev/the-moon/');
    expect(location(request('/assets/a.js', other))).toBe('https://sky.moving-parts.dev/assets/a.js');
    expect(location(request('/', other, { a: { value: '1' }, flag: { value: '' }, b: { value: '2', multiValue: [{ value: '2' }, { value: '3' }] } }))).toBe(
      'https://sky.moving-parts.dev/?a=1&flag&b=2&b=3',
    );
  });

  it('leaves unknown addresses to S3, whose 403 the distribution turns into the 404 page', () => {
    expect(request('/no-such-page/')).toMatchObject({ uri: '/no-such-page/index.html' });
  });
});
