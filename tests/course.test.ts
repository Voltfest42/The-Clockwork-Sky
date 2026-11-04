import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  chaptersOf,
  findChapter,
  findLab,
  findPart,
  findToolkitPage,
  LABS,
  PARTS,
  partOfPage,
  partReady,
  partsComplete,
  RESERVED_PAGES,
  sectionId,
  TOOLKIT,
  toolkitPage,
} from '../src/site/course';
import { slugify } from '../src/site/router';

describe('the course registry', () => {
  it('has three parts and 31 chapters, numbered straight through', () => {
    expect(PARTS.map((p) => p.numeral)).toEqual(['I', 'II', 'III']);
    expect(CHAPTERS.map((c) => c.number)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(chaptersOf(1).map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(chaptersOf(2).map((c) => c.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(chaptersOf(3).map((c) => c.number)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
    expect(CHAPTERS.filter((c) => c.optional).map((c) => c.number)).toEqual([31]);
  });

  it('makes every address from its title, and no two pages share one', () => {
    for (const c of CHAPTERS) expect(c.slug).toBe(slugify(c.title));
    for (const t of TOOLKIT) expect(t.slug).toBe(slugify(t.title));
    const addresses = [...CHAPTERS.map((c) => c.slug), ...PARTS.map((p) => p.slug), ...LABS.map((l) => l.slug), ...RESERVED_PAGES];
    expect(new Set(addresses).size).toBe(addresses.length);
    expect(findChapter('the-turning-sky')?.number).toBe(2);
    expect(findChapter('keplers-laws')?.number).toBe(6);
  });

  it('gives every chapter its planned sections, with unique ids', () => {
    for (const c of CHAPTERS) {
      expect(c.sections.length, `Chapter ${c.number}`).toBeGreaterThanOrEqual(4);
      const ids = c.sections.map(sectionId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(sectionId('Where you stand changes the sky')).toBe('where-you-stand-changes-the-sky');
  });

  it('builds only on earlier chapters, and every planned chapter says what it builds on', () => {
    for (const c of CHAPTERS) {
      expect(c.buildsOn, `Chapter ${c.number}`).toBeDefined();
      for (const n of c.buildsOn ?? []) {
        expect(n).toBeLessThan(c.number);
        expect(n).toBeGreaterThanOrEqual(1);
      }
    }
    expect(findChapter('a-sense-of-scale')?.buildsOn).toEqual([]);
    expect(findChapter('the-stars-are-suns')?.buildsOn).toEqual([1, 6, 7]);
    expect(findChapter('light-the-messenger')?.buildsOn).toEqual([1, 9]);
    expect(findChapter('other-worlds')?.buildsOn).toEqual([7, 12, 14]);
    expect(findChapter('holding-a-star-up')?.buildsOn).toEqual([7, 15, 16, 17]);
    expect(findChapter('colliding-galaxies')?.buildsOn).toEqual([7, 27, 30]);
  });

  it('links chapters and Toolkit pages both ways', () => {
    for (const c of CHAPTERS) for (const slug of c.toolkit ?? []) expect(findToolkitPage(slug), slug).toBeDefined();
    for (const t of TOOLKIT) {
      if (t.firstNeeded === undefined) continue;
      const chapter = CHAPTERS.find((c) => c.number === t.firstNeeded);
      expect(chapter?.toolkit, t.slug).toContain(t.slug);
      expect(chapter?.part).toBe(t.part);
    }
    expect(TOOLKIT.map((t) => t.code)).toEqual(TOOLKIT.map((_, i) => `T${i + 1}`));
    expect(TOOLKIT.filter((t) => t.part === 1).map((t) => t.title)).toEqual(['Powers of ten', 'Angles in the sky', 'Ratios and scaling', 'Solving by stepping']);
    // Part II's Toolkit pages, each first needed in the chapter that lists it.
    expect(TOOLKIT.filter((t) => t.part === 2).map((t) => [t.title, t.firstNeeded])).toEqual([
      ['Logarithms and magnitudes', 11],
      ['Measurements and uncertainty', 14],
    ]);
    // Part III's: three first needed in Chapter 20, then Chapter 21 and Chapter 26.
    expect(TOOLKIT.filter((t) => t.part === 3).map((t) => [t.title, t.firstNeeded])).toEqual([
      ['Vectors', 26],
      ['Rates of change', 20],
      ['Adding up small pieces', 20],
      ['Differential equations', 21],
      ['Estimating with orders of magnitude', 20],
    ]);
  });

  it('says which parts are complete, for the coming-soon pages', () => {
    const done = PARTS.filter(partReady);
    const sentence = partsComplete();
    if (done.length === 0) expect(sentence).toBeNull();
    else {
      expect(sentence).toMatch(done.length === 1 ? /^Part [IV]+ is complete$/ : /^Parts [IV, ]+ and [IV]+ are complete$/);
      for (const p of done) expect(sentence).toContain(p.numeral);
    }
  });

  it('gives every part its outcomes and reading time', () => {
    for (const p of PARTS) {
      expect(p.outcomes?.length, p.slug).toBeGreaterThanOrEqual(10);
      expect(p.minutes, p.slug).toMatch(/^about \d+–\d+ minutes each$/);
    }
    expect(findPart('part-3')?.outcomes).toHaveLength(chaptersOf(3).length);
  });

  it('gives each part its lab: the Orrery after Part I, the Star Forge after Part II, both upgraded in Part III', () => {
    for (const p of PARTS) for (const { slug } of p.labs) expect(findLab(slug)).toBeDefined();
    expect(findPart('part-1')?.labs).toEqual([{ slug: 'orrery', version: 1 }]);
    expect(findPart('part-2')?.labs).toEqual([{ slug: 'star-forge', version: 1 }]);
    expect(findPart('part-3')?.labs.map((l) => l.version)).toEqual([2, 2]);
    for (const lab of LABS) {
      const first = lab.versions[0];
      expect(findPart(`part-${first.part}`)?.labs).toContainEqual({ slug: lab.slug, version: 1 });
    }
  });

  it('knows which part a page belongs to', () => {
    expect(partOfPage('the-moon')).toBe(1);
    expect(partOfPage('part-2')).toBe(2);
    expect(partOfPage('black-holes')).toBe(3);
    expect(partOfPage(toolkitPage(findToolkitPage('vectors')!))).toBe(3);
    expect(partOfPage('star-forge')).toBe(2);
    expect(partOfPage('glossary')).toBeNull();
    expect(partOfPage('vectors')).toBeNull();
  });

  it('lists exactly the ## headings of every written chapter', () => {
    for (const chapter of CHAPTERS.filter((c) => c.load)) {
      const source = readFileSync(new URL(`../src/content/chapter${chapter.number}.mdx`, import.meta.url), 'utf8');
      const headings = [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
      expect(headings, `Chapter ${chapter.number}`).toEqual(chapter.sections);
    }
  });
});
