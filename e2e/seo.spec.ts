import { expect, test, type Page } from '@playwright/test';
import { findChapter, findLab, findPart, findToolkitPage } from '../src/site/course';
import { PAGES, SITE_URL, type PageMeta } from '../src/site/routes';
import { accessibilityViolations, watchErrors } from './helpers';

/** The heading each page opens with. */
function expectedH1(meta: PageMeta): string {
  switch (meta.kind) {
    case 'start':
      return 'The Clockwork Sky';
    case 'part':
      return findPart(meta.page)!.title;
    case 'chapter':
      return findChapter(meta.page)!.title;
    case 'toolkit':
      return findToolkitPage(meta.page)!.title;
    case 'lab':
      return findLab(meta.page)!.title;
    case 'toolkit-index':
      return 'The Toolkit';
    case 'labs':
      return 'The labs';
    case 'glossary':
      return 'Every term in the course';
    case 'about':
      return 'About this course';
  }
}

/** A prerendered page as a search engine sees it: its own h1, title, canonical address and description. */
async function expectOwnHead(page: Page, meta: PageMeta) {
  await expect(page.locator('main h1'), meta.path).toHaveText(expectedH1(meta));
  await expect(page).toHaveTitle(meta.title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}${meta.path}`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', meta.description);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${SITE_URL}${meta.path}`);
}

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('every page is real HTML with its own h1, title, canonical address and description', async ({ page }) => {
    for (const meta of PAGES) {
      const response = await page.goto(meta.path);
      expect(response?.status(), meta.path).toBe(200);
      await expectOwnHead(page, meta);
    }
  });

  test('written chapters have their full text, section headings and figures in the HTML', async ({ page }) => {
    // It visits every written page and checks every figure, so it grows with the course.
    test.slow();
    for (const meta of PAGES.filter((p) => p.kind === 'chapter' || p.kind === 'toolkit')) {
      const item = findChapter(meta.page) ?? findToolkitPage(meta.page)!;
      if (!item.load) continue;
      await page.goto(meta.path);
      const main = page.locator('main');
      await expect(main.getByText('Loading')).toHaveCount(0);
      if ('sections' in item) for (const title of item.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
      await expect(main.getByRole('heading', { level: 2, name: 'Check yourself' })).toHaveCount('sections' in item ? 1 : 0);
      // Each figure keeps its frame (title, legend, "Try this") and shows its description in place of the live figure.
      const figures = main.locator('figure');
      expect(await figures.count(), meta.path).toBeGreaterThan(0);
      for (const figure of await figures.all()) {
        await expect(figure.locator('figcaption')).toContainText(/Figure T?\d+\.\d+/);
        // A figure in a closed deep dive is in the HTML but out of sight until the reader opens it.
        const hidden = await figure.evaluate((el) => !!el.closest('details:not([open])'));
        await expect(figure.getByText('Try this')).toBeAttached();
        await expect(figure.getByText(/needs JavaScript/)).toBeAttached();
        if (!hidden) {
          await expect(figure.getByText('Try this')).toBeVisible();
          await expect(figure.getByText(/needs JavaScript/)).toBeVisible();
        }
      }
    }
  });

  test('the start page describes the course, and chapters say they are part of it', async ({ page }) => {
    const jsonLd = async () => JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? 'null');
    await page.goto('/');
    expect(await jsonLd()).toMatchObject({ '@type': 'Course', name: 'The Clockwork Sky', isAccessibleForFree: true, provider: { name: 'Moving Parts' } });
    await page.goto('/the-turning-sky/');
    expect(await jsonLd()).toMatchObject({ '@type': 'LearningResource', isPartOf: { '@type': 'Course', '@id': `${SITE_URL}/#course` } });
  });
});

test('every prerendered page passes the accessibility checks before its scripts run', async ({ page }) => {
  // Scripts blocked, so axe sees the HTML as prerendered (axe itself still runs).
  await page.route('**/assets/*.js', (route) => route.abort());
  for (const path of ['/', '/part-1/', '/a-sense-of-scale/', '/the-turning-sky/', '/the-moon/', '/toolkit/powers-of-ten/', '/glossary/', '/about/', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await accessibilityViolations(page), path).toEqual([]);
  }
});

test('addresses without the trailing slash, or with index.html, redirect to the page', async ({ page }) => {
  for (const [from, to] of [
    ['/the-turning-sky', '/the-turning-sky/'],
    ['/toolkit/powers-of-ten', '/toolkit/powers-of-ten/'],
    ['/about/index.html', '/about/'],
  ]) {
    const response = await page.request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(301);
    expect(new URL(response.headers().location).pathname).toBe(to);
  }
  const files = await page.request.get('/sitemap.xml');
  expect(files.status()).toBe(200);
  expect(await files.text()).toContain(`<loc>${SITE_URL}/the-turning-sky/</loc>`);
  expect(await (await page.request.get('/robots.txt')).text()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test('old #/ links land on the page’s own address, at the right section', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/the-turning-sky/where-you-stand-changes-the-sky');
  await expect(page).toHaveURL(/\/the-turning-sky\/#where-you-stand-changes-the-sky$/);
  await expect(page.locator('main h1')).toHaveText('The turning sky');
  await expect(page.getByRole('heading', { level: 2, name: 'Where you stand changes the sky' })).toBeInViewport();
  await expect(page.locator('html')).not.toHaveAttribute('data-moved');
  await expect(page).toHaveTitle('2. The turning sky · The Clockwork Sky');

  await page.goto('/#/toolkit/powers-of-ten');
  await expect(page).toHaveURL(/\/toolkit\/powers-of-ten\/$/);
  await expect(page.locator('main h1')).toHaveText('Powers of ten');
  await page.goto('/#/part-2');
  await expect(page).toHaveURL(/\/part-2\/$/);
  await expect(page.locator('main h1')).toHaveText('The Stars');
  expect(errors).toEqual([]);
});

test('links move between pages without reloading, and back and forward retrace them', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => ((window as unknown as { sameDocument: boolean }).sameDocument = true));
  const nav = page.getByRole('navigation', { name: 'Contents' });
  const main = page.locator('main');

  await nav.getByRole('link', { name: /The turning sky/ }).click();
  await expect(page).toHaveURL(/\/the-turning-sky\/$/);
  await expect(main.locator('h1')).toHaveText('The turning sky');
  await expect(main).toBeFocused();
  await expect(page).toHaveTitle('2. The turning sky · The Clockwork Sky');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}/the-turning-sky/`);

  // A section link in the sidebar scrolls to its heading and marks it as being read.
  const sectionLink = nav.getByRole('link', { name: 'Where you stand changes the sky' });
  await sectionLink.click();
  await expect(page).toHaveURL(/\/the-turning-sky\/#where-you-stand-changes-the-sky$/);
  const heading = main.getByRole('heading', { level: 2, name: 'Where you stand changes the sky' });
  await expect(heading).toBeInViewport();
  await expect(sectionLink).toHaveAttribute('aria-current', 'location');

  // A heading's own # link points at its section.
  await expect(heading.getByRole('link', { name: 'Link to this section' })).toHaveAttribute('href', '/the-turning-sky/#where-you-stand-changes-the-sky');

  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: /Chapter 1/ }).click();
  await expect(main.locator('h1')).toHaveText('A sense of scale');
  await expect(page).toHaveURL(/\/a-sense-of-scale\/$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/the-turning-sky\/#where-you-stand-changes-the-sky$/);
  await expect(main.locator('h1')).toHaveText('The turning sky');
  await expect(heading).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/the-turning-sky\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(main.locator('h1')).toHaveText('The Clockwork Sky');
  await expect(page).toHaveTitle('The Clockwork Sky: an interactive course in astronomy');
  await page.goForward();
  await expect(main.locator('h1')).toHaveText('The turning sky');

  expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
  expect(errors).toEqual([]);
});

test('reading progress survives a reload, and the sidebar shows it after hydration', async ({ page }) => {
  await page.goto('/the-turning-sky/');
  await page.evaluate(() => localStorage.setItem('clockwork-sky:read-chapters', JSON.stringify(['a-sense-of-scale'])));
  await page.reload();
  const nav = page.getByRole('navigation', { name: 'Contents' });
  const read = nav.getByRole('link', { name: /A sense of scale \(read\)/ });
  await expect(read).toBeVisible();
  // The chapter keeps its number; the tick sits at the right-hand edge, after the title.
  await expect(read).toContainText('1');
  const [title, tick] = await Promise.all([read.getByText('A sense of scale').boundingBox(), read.locator('svg').boundingBox()]);
  expect(tick!.x).toBeGreaterThan(title!.x + title!.width);
  expect(tick!.width).toBeLessThan(12);
});
