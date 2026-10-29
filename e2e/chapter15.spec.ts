import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[14];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The Sun up close' })).toBeVisible();
}

test('Chapter 15 shows its sections, three figures, a table and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['15.1', '15.2', '15.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('table')).toContainText('8 minutes 19 seconds');
  await expect(main.getByRole('region', { name: 'Watching the Sun' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Sun cutaway: slide outwards, change the chart, pick a layer', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'inside-the-sun');
  const figure = figureByNumber(page, '15.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^10% of the way out, in the core: 13\.1 million K, 87 times water’s density\./)).toBeVisible();
  await figure.getByRole('slider', { name: 'Distance from the centre' }).fill('0.5');
  await expect(caption(figure, /^50% of the way out, in the radiative zone: 3\.98 million K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Power made inside' }).click();
  await expect(figure.getByRole('img', { name: /^Power made inside, against distance from the Sun’s centre$/ })).toBeVisible();
  const corona = figure.getByRole('button', { name: 'Corona (not to scale)' });
  await corona.focus();
  await page.keyboard.press('Enter');
  await expect(figure.getByRole('heading', { name: 'Corona' })).toBeVisible();
  // The layers are nested, so the convection zone's middle is covered by the layers inside it: pick it by keyboard.
  await figure.getByRole('button', { name: 'Convection zone' }).focus();
  await page.keyboard.press(' ');
  await expect(caption(figure, /in the convection zone/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the sunspot cycle: step through the cycles', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'sunspots-and-the-11-year-cycle');
  const figure = figureByNumber(page, '15.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Cycle 25 began at the minimum of December 2019 and is still going\. It peaked in October 2024 at a smoothed 160\.9 sunspots\. The record runs to [A-Z][a-z]+ 20\d\d\.$/)).toBeVisible();
  await figure.getByRole('combobox', { name: 'Pick a cycle' }).selectOption('19');
  await expect(caption(figure, /^Cycle 19 began at the minimum of April 1954 and was 10\.5 years long\. It peaked in March 1958 at a smoothed 285 sunspots, the highest since the counts began\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Previous cycle' }).click();
  await expect(caption(figure, /^Cycle 18 began/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the fuel gauge: only fusion lasts', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'what-keeps-the-sun-shining');
  const figure = figureByNumber(page, '15.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /only fusion lasts billions/)).toBeVisible();
  await figure.getByRole('button', { name: 'Burning, like coal' }).click();
  await expect(caption(figure, /^Burning, like coal: 4,900 years\.$/)).toBeVisible();
  await figure.getByRole('button', { name: 'Shrinking under its own weight' }).click();
  await expect(figure.getByText(/Kelvin’s answer in the 1860s/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fusing hydrogen into helium' }).click();
  await expect(caption(figure, /^Fusing hydrogen into helium: 10\.5 billion years\.$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the cycle with the most sunspots', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /which solar cycle had the most sunspots at its peak/ });
  const pick = question.getByRole('combobox', { name: 'Cycle' });
  await pick.scrollIntoViewIfNeeded();
  await pick.selectOption('25');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Cycle 25 peaked at a smoothed 160\.9 in October 2024/)).toBeVisible();
  await pick.selectOption('19');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Cycle 19: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 15, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '15.1').getByRole('button', { name: 'Density' }).click();
      await figureByNumber(page, '15.2').getByRole('combobox', { name: 'Pick a cycle' }).selectOption('19');
      await figureByNumber(page, '15.3').getByRole('button', { name: 'Fusing hydrogen into helium' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
