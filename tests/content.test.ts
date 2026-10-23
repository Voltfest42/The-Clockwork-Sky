import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS, LABS, PARTS, TOOLKIT } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';
import { href, movedAddress, parseLocation, slugify } from '../src/site/router';

/** Every source file under a folder, recursively. */
function filesUnder(dir: URL, pattern: RegExp): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return filesUnder(url, pattern);
    return pattern.test(entry.name) ? [url] : [];
  });
}

const src = new URL('../src/', import.meta.url);

describe('router', () => {
  it('reads the page from the path and the section from the fragment', () => {
    expect(parseLocation('/')).toEqual({ page: '', section: null });
    expect(parseLocation('/the-moon/')).toEqual({ page: 'the-moon', section: null });
    expect(parseLocation('/the-moon')).toEqual({ page: 'the-moon', section: null });
    expect(parseLocation('/the-moon/index.html')).toEqual({ page: 'the-moon', section: null });
    expect(parseLocation('/the-turning-sky/', '#where-you-stand-changes-the-sky')).toEqual({
      page: 'the-turning-sky',
      section: 'where-you-stand-changes-the-sky',
    });
    expect(parseLocation('/toolkit/powers-of-ten/', '#prefixes')).toEqual({ page: 'toolkit/powers-of-ten', section: 'prefixes' });
  });

  it('gives every page an address with a trailing slash, and sections a fragment', () => {
    expect(href('')).toBe('/');
    expect(href('the-moon')).toBe('/the-moon/');
    expect(href('toolkit/powers-of-ten', 'prefixes')).toBe('/toolkit/powers-of-ten/#prefixes');
    for (const [page, section] of [['', null], ['the-moon', 'eclipses'], ['toolkit/powers-of-ten', 'prefixes'], ['about', null]] as const) {
      const address = href(page, section);
      const at = address.indexOf('#');
      expect(at < 0 ? parseLocation(address) : parseLocation(address.slice(0, at), address.slice(at))).toEqual({ page, section });
    }
  });

  it('moves old #/ links to their pages’ addresses', () => {
    expect(movedAddress('')).toBeNull();
    expect(movedAddress('#the-sky-as-a-dome')).toBeNull();
    expect(movedAddress('#/')).toBe('/');
    expect(movedAddress('#/the-moon')).toBe('/the-moon/');
    expect(movedAddress('#/the-turning-sky/where-you-stand-changes-the-sky')).toBe('/the-turning-sky/#where-you-stand-changes-the-sky');
    expect(movedAddress('#/toolkit')).toBe('/toolkit/');
    expect(movedAddress('#/toolkit/powers-of-ten')).toBe('/toolkit/powers-of-ten/');
    expect(movedAddress('#/toolkit/powers-of-ten/prefixes')).toBe('/toolkit/powers-of-ten/#prefixes');
  });

  it('survives mistyped links', () => {
    expect(parseLocation('/%E0%A4%A/')).toEqual({ page: '%E0%A4%A', section: null });
    expect(parseLocation('//the-moon//')).toEqual({ page: 'the-moon', section: null });
    expect(movedAddress('#//the-moon//')).toBe('/the-moon/');
  });

  it('slugifies headings into URL-safe ids, dropping apostrophes', () => {
    expect(slugify('The Sun’s year')).toBe('the-suns-year');
    expect(slugify("Kepler's laws")).toBe('keplers-laws');
    expect(slugify('How far is a star?')).toBe('how-far-is-a-star');
    expect(slugify('Solstices, equinoxes and the midnight Sun')).toBe('solstices-equinoxes-and-the-midnight-sun');
  });
});

describe('glossary', () => {
  it('defines every term in a sentence or two', () => {
    for (const [id, entry] of Object.entries(GLOSSARY)) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(entry.term.length).toBeGreaterThan(1);
      expect(entry.definition, id).toMatch(/^[A-Z0-9].*\.$/);
    }
  });

  it('only uses glossary ids that exist', () => {
    const ids = new Set(Object.keys(GLOSSARY));
    for (const file of filesUnder(src, /\.(mdx|tsx)$/)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<Term id="([^"]+)"/g)) expect(ids, `${file.pathname}: ${match[1]}`).toContain(match[1]);
    }
  });
});

describe('house style', () => {
  // American spellings that British English spells differently. Code (CSS "color", "center") is not checked, only prose.
  const AMERICAN = /\b(color|colors|colored|center|centers|centered|neighbor|neighbors|neighborhood|meter|meters|kilometer|kilometers|gray|behavior|favorite|analyze|catalog|catalogs|traveled|modeled)\b/i;

  const prose = [
    ...PARTS.flatMap((p) => [p.title, p.subject, p.maths, p.thread.text, p.startHere, ...(p.outcomes ?? [])]),
    ...CHAPTERS.flatMap((c) => [c.title, c.blurb, ...c.sections]),
    ...TOOLKIT.flatMap((t) => [t.title, t.blurb]),
    ...LABS.flatMap((l) => [l.title, l.subject, l.blurb, ...l.versions.map((v) => v.summary)]),
    ...Object.values(GLOSSARY).flatMap((g) => [g.term, g.definition]),
  ];

  it('spells the registry and the glossary the British way', () => {
    for (const text of prose) expect(text).not.toMatch(AMERICAN);
  });

  it('spells the MDX prose the British way', () => {
    for (const file of filesUnder(src, /\.mdx$/)) {
      const text = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      expect(text, file.pathname).not.toMatch(AMERICAN);
    }
  });
});
