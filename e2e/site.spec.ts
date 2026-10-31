import { expect, test } from '@playwright/test';
import { CHAPTERS, chaptersOf, LABS, partNumbered, PARTS, partReady, TOOLKIT } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';
import { href } from '../src/site/router';
import { accessibilityViolations, expectNoBrokenFigures, watchErrors } from './helpers';

/** One page of each kind, for the checks that don't need every page. */
const SAMPLE_PAGES = ['', 'part-1', 'part-2', 'part-3', 'a-sense-of-scale', 'the-moon', 'light-the-messenger', 'black-holes', 'toolkit', 'toolkit/powers-of-ten', 'toolkit/angles-in-the-sky', 'toolkit/logarithms-and-magnitudes', 'labs', 'orrery', 'glossary', 'about'];

/** Every page of the site. */
const ALL_PAGES = [
  '',
  ...PARTS.map((p) => p.slug),
  ...CHAPTERS.map((c) => c.slug),
  'toolkit',
  ...TOOLKIT.map((t) => `toolkit/${t.slug}`),
  'labs',
  ...LABS.map((l) => l.slug),
  'glossary',
  'about',
];

test('the landing page introduces the course and its three parts @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'The Clockwork Sky' })).toBeVisible();
  await expect(page.getByText(/On Christmas night 1758, Johann Palitzsch/)).toBeVisible();
  const main = page.locator('main');
  // Parts and labs that are ready are links; the rest are plain cards marked "Coming soon".
  for (const part of PARTS) {
    const link = main.getByRole('link', { name: new RegExp(`Part ${part.numeral} .*${part.title}`) });
    if (partReady(part)) await expect(link).toBeVisible();
    else {
      await expect(link).toHaveCount(0);
      await expect(main.getByRole('listitem').filter({ hasText: new RegExp(`^Part ${part.numeral}.*${part.title}.*Coming soon`) })).toBeVisible();
    }
  }
  for (const lab of LABS) await expect(main.getByRole('link', { name: new RegExp(`^Lab · .*${lab.title}`) })).toHaveCount(lab.load ? 1 : 0);
  await expect(main.getByRole('link', { name: 'Start reading: Chapter 1, A sense of scale →' })).toHaveAttribute('href', '/a-sense-of-scale/');
  await expect(main.getByRole('img', { name: /A ruler of sizes/ })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'How to use the figures' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Where to start' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Start with Chapter 1, A sense of scale →' })).toHaveAttribute('href', '/a-sense-of-scale/');
  // Part II is out: every chapter is written, so "Where to start" links to its first chapter.
  await expect(main.getByRole('link', { name: 'Start with Chapter 10, Light, the messenger →' })).toHaveAttribute('href', '/light-the-messenger/');
  await expect(main.getByText('Part III, The Engine Room:')).toContainText('Coming soon');
  expect(await accessibilityViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('every page of the course opens without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (const path of ALL_PAGES) {
    await page.goto(href(path));
    await expect(page.locator('main h1'), path || 'landing').toBeVisible();
    await expect(page.getByRole('heading', { name: 'There’s no page here' })).toHaveCount(0);
    await expectNoBrokenFigures(page);
  }
  expect(errors).toEqual([]);
});

test('Part I’s page lists its chapters, the lab and what readers will be able to explain', async ({ page }) => {
  await page.goto('/part-1/');
  await expect(page.getByRole('heading', { level: 1, name: 'The Clockwork' })).toBeVisible();
  const main = page.locator('main');
  for (const c of chaptersOf(1)) await expect(main.getByRole('link', { name: new RegExp(`Chapter ${c.number} .*${c.title}`) })).toBeVisible();
  await expect(main.getByText('why we have seasons, and why distance from the Sun isn’t the reason;')).toBeVisible();
  await expect(main.getByRole('link', { name: /^Lab · .*The Orrery/ })).toBeVisible();
  await expect(main.getByText('0 of 9 read')).toBeVisible();
});

test('Part II’s page lists its chapters, the lab and what readers will be able to explain', async ({ page }) => {
  await page.goto('/part-2/');
  await expect(page.getByRole('heading', { level: 1, name: 'The Stars' })).toBeVisible();
  const main = page.locator('main');
  for (const c of chaptersOf(2)) await expect(main.getByRole('link', { name: new RegExp(`Chapter ${c.number} .*${c.title}`) })).toBeVisible();
  await expect(main.getByText('how stars die, and what they leave behind: white dwarfs, neutron stars and black holes;')).toBeVisible();
  await expect(main.getByText('10–19, about 25–35 minutes each')).toBeVisible();
  await expect(main.getByText('0 of 10 read')).toBeVisible();
});

test('a planned chapter shows what it builds on and its planned sections, numbered', async ({ page }) => {
  for (const chapter of [...chaptersOf(1), ...chaptersOf(2)].filter((c) => !c.load)) {
    await page.goto(href(chapter.slug));
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1, name: chapter.title })).toBeVisible();
    await expect(main.getByText(`Part ${partNumbered(chapter.part).numeral} · Chapter ${chapter.number}`)).toBeVisible();
    await expect(main.getByText('Builds on:')).toBeVisible();
    for (const [i, title] of chapter.sections.entries()) {
      await expect(main.getByRole('listitem').filter({ hasText: `${chapter.number}.${i + 1} ${title}` })).toHaveCount(1);
    }
  }
  // "Builds on" links lead to the earlier chapters.
  await page.goto('/the-moon/');
  await page.locator('main').getByRole('link', { name: 'Chapter 3, The Sun’s year' }).click();
  await expect(page).toHaveURL(/\/the-suns-year\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'The Sun’s year' })).toBeVisible();
});

test('the pager runs straight through the chapters, across parts', async ({ page }) => {
  await page.goto('/the-stars-are-suns/');
  const pager = page.getByRole('navigation', { name: 'Chapters' });
  await pager.getByRole('link', { name: /Part II · Chapter 10/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Light, the messenger' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: /Chapter 9/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The stars are suns' })).toBeVisible();
});

test('the sidebar groups chapters by part, and its groups open and close by keyboard', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Contents' });
  const partOne = nav.getByRole('button', { name: 'Chapters of Part I', exact: true });
  const partTwo = nav.getByRole('button', { name: 'Chapters of Part II', exact: true });
  await expect(partOne).toHaveAttribute('aria-expanded', 'true');
  await expect(partTwo).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: /A sense of scale/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Colour is temperature/ })).toBeHidden();

  await partTwo.focus();
  await page.keyboard.press('Enter');
  await expect(partTwo).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: /Colour is temperature/ })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(nav.getByRole('link', { name: /Colour is temperature/ })).toBeHidden();

  // Opening a chapter opens its part's group and marks the chapter as the current page.
  await page.goto('/black-holes/');
  await expect(nav.getByRole('button', { name: 'Chapters of Part III', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: /Black holes/ })).toHaveAttribute('aria-current', 'page');
});

test('the Toolkit and the labs list their pages', async ({ page }) => {
  await page.goto('/toolkit/');
  const main = page.locator('main');
  for (const t of TOOLKIT) await expect(main.getByRole('link', { name: new RegExp(t.title) })).toBeVisible();
  await main.getByRole('link', { name: /Angles in the sky/ }).click();
  await expect(page).toHaveURL(/\/toolkit\/angles-in-the-sky\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Angles in the sky' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Chapter 2, The turning sky' })).toBeVisible();

  // The Star Forge isn't built: its card is marked "Coming soon" and isn't a link, but its plans are in the sidebar.
  await page.goto('/labs/');
  await expect(page.locator('main').getByRole('link', { name: /The Star Forge/ })).toHaveCount(0);
  await expect(page.locator('main').getByText('The Star Forge').locator('..')).toContainText('Coming soon');
  const nav = page.getByRole('navigation', { name: 'Contents' });
  const partTwo = nav.getByRole('button', { name: 'Chapters of Part II', exact: true });
  if ((await partTwo.getAttribute('aria-expanded')) !== 'true') await partTwo.click();
  await nav.getByRole('link', { name: /The Star Forge/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'The Star Forge' })).toBeVisible();
  await expect(page.locator('main').getByText(/Version 1, with/)).toBeVisible();
});

test('the glossary lists every term, and terms explain themselves on hover and focus', async ({ page }) => {
  await page.goto('/glossary/');
  await expect(page.locator('main dt').first()).toBeVisible();
  const terms = await page.locator('main dt').allTextContents();
  expect([...terms].sort()).toEqual(Object.values(GLOSSARY).map((g) => g.term).sort());

  await page.goto('/');
  const term = page.locator('main').getByRole('button', { name: 'zenith' });
  await term.focus();
  await expect(page.getByRole('tooltip').filter({ hasText: GLOSSARY.zenith.definition })).toBeVisible();
});

test('the skip link moves focus to the content', async ({ page }) => {
  await page.goto('/about/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('every kind of page passes the accessibility checks', async ({ page }) => {
  for (const path of SAMPLE_PAGES) {
    await page.goto(href(path));
    await expect(page.locator('main h1')).toBeVisible();
    expect(await accessibilityViolations(page), path || 'landing').toEqual([]);
  }
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('every kind of page passes the accessibility checks in dark mode too', async ({ page }) => {
    for (const path of SAMPLE_PAGES) {
      await page.goto(href(path));
      await expect(page.locator('main h1')).toBeVisible();
      expect(await accessibilityViolations(page), path || 'landing').toEqual([]);
    }
  });
});

test.describe('at 375 pixels wide', () => {
  // A desktop browser at phone width: unlike phone emulation, it can't zoom out to hide a page that is too wide.
  test.use({ viewport: { width: 375, height: 812 } });

  test('no page scrolls sideways', async ({ page }) => {
    for (const path of SAMPLE_PAGES) {
      await page.goto(href(path));
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path || 'landing').toBeLessThanOrEqual(0);
    }
  });

  test('the contents menu opens, and closes when the reader picks a page @phone', async ({ page }) => {
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Contents' });
    await menu.click();
    const nav = page.getByRole('navigation', { name: 'Contents' });
    await expect(nav).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
    await nav.getByRole('link', { name: /The turning sky/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'The turning sky' })).toBeVisible();
    await expect(nav).toBeHidden();
  });
});

test('unknown addresses get the not-found page with a 404 status', async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ['/no-such-page/', '/toolkit/no-such-tool/', '/the-moon/extra/']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { name: 'There’s no page here' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Contents' }).locator('[aria-current="page"]')).toHaveCount(0);
  }
  // A malformed address is never a page: CloudFront itself answers 400 Bad Request (the local server says 404).
  expect([400, 404]).toContain((await page.request.get('/%E0%A4%A/')).status());
  // An old link to a page that doesn't exist lands on the not-found page too.
  await page.goto('/#/no-such-page');
  await expect(page.getByRole('heading', { name: 'There’s no page here' })).toBeVisible();
  expect(errors.filter((e) => !e.includes('404'))).toEqual([]);
});
