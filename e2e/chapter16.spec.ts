import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[15];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Born in the dark' })).toBeVisible();
}

test('Chapter 16 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['16.1', '16.2', '16.3', '16.4', '16.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByText(/the coldest known, WISE 0855−0714, is about 285 K/)).toBeVisible();
  await expect(main.getByRole('region', { name: 'How stars are born' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('dust: the centre of the Galaxy lets infrared through', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-space-between-the-stars');
  const figure = figureByNumber(page, '16.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^No dust: the star as it is\./)).toBeVisible();
  await figure.getByRole('button', { name: 'The centre of the Galaxy' }).click();
  await expect(caption(figure, /^Through 30\.0 magnitudes of dust: 1 part in 10¹² of the visible light and 4% of the infrared get through/)).toBeVisible();
  await figure.getByRole('slider', { name: /Dust/ }).fill('1.5');
  await expect(figure.getByRole('button', { name: '1 kiloparsec of the Milky Way’s disc' })).toHaveAttribute('aria-pressed', 'true');
  await figure.getByRole('button', { name: 'Reset figure 16.1' }).click();
  await expect(caption(figure, /^No dust/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('collapse or not: warm gas holds up, a giant molecular cloud falls in', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'clouds-that-collapse');
  const figure = figureByNumber(page, '16.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Gravity wins/)).toBeVisible();
  await expect(figure.getByText(/^Collapses: its gravity beats its heat/)).toBeVisible();
  await figure.getByRole('button', { name: 'Warm gas between the stars' }).click();
  await expect(caption(figure, /^Heat wins/)).toBeVisible();
  await expect(figure.getByText(/^Holds up: its heat beats its gravity/)).toBeVisible();
  await figure.getByRole('button', { name: 'Barnard 68' }).click();
  await expect(figure.getByText(/A small dark cloud about 400 light-years away/)).toBeVisible();
  // Cool it down by keyboard until it collapses.
  const temperature = figure.getByRole('slider', { name: 'Temperature' });
  await temperature.focus();
  for (let k = 0; k < 160; k++) await page.keyboard.press('ArrowLeft');
  await expect(caption(figure, /^Gravity wins/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('young stars: slide the age until the Sun-like star arrives', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'from-protostar-to-star');
  const figure = figureByNumber(page, '16.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^1 M☉ at 1 million years:/)).toBeVisible();
  await expect(figure.getByText(/Still shrinking/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Age' }).fill('7.7');
  await expect(figure.getByText(/It has reached the main sequence/)).toBeVisible();
  await expect(caption(figure, /^At 50 million years the stars of 1 M☉ and more have reached the main sequence/)).toBeVisible();
  await figure.getByRole('button', { name: '0.1 M☉' }).click();
  await expect(figure.getByText(/It reaches the main sequence at about \d+ million years/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('cooling for ever: a brown dwarf fades, a star levels off', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'failed-stars');
  const figure = figureByNumber(page, '16.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^0\.05 M☉ \(52 Jupiters\)/)).toBeVisible();
  await figure.getByRole('button', { name: '10 MJ' }).click();
  await expect(figure.getByText(/0\.01 M☉ \(10 Jupiters\) is a brown dwarf/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Age' }).fill('10');
  await expect(figure.getByText(/class Y/)).toBeVisible();
  await figure.getByRole('button', { name: '0.2 M☉' }).click();
  await expect(figure.getByText(/0\.2 M☉ is a star/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a new cluster: draw again and change its size', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'many-small-stars-few-big-ones');
  const figure = figureByNumber(page, '16.5');
  await figure.scrollIntoViewIfNeeded();
  const card = figure.getByText(/^1,000 stars and \d+ brown dwarfs/);
  await expect(card).toBeVisible();
  const first = await figure.locator('[aria-live="polite"]').first().textContent();
  await figure.getByRole('button', { name: 'Draw another cluster' }).click();
  await expect.poll(() => figure.locator('[aria-live="polite"]').first().textContent()).not.toBe(first);
  await figure.getByRole('slider', { name: 'Stars' }).fill('4');
  await expect(figure.getByText(/^10,000 stars and \d[\d,]* brown dwarfs/)).toBeVisible();
  await expect(figure.getByRole('table')).toContainText('Over 8 Suns');
  expect(errors).toEqual([]);
});

test('the interactive question: the least mass that collapses', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /What is the least mass that collapses/ });
  const mass = question.getByRole('slider', { name: 'Mass' });
  await mass.scrollIntoViewIfNeeded();
  await mass.fill('3');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/3\.0 M☉: it holds up/)).toBeVisible();
  await mass.fill('4.3');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/4\.3 M☉: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 16, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '16.1').getByRole('button', { name: 'The centre of the Galaxy' }).click();
      await figureByNumber(page, '16.2').getByRole('button', { name: 'Barnard 68' }).click();
      await figureByNumber(page, '16.3').getByRole('button', { name: '0.3 M☉' }).click();
      await figureByNumber(page, '16.4').getByRole('button', { name: '0.1 M☉' }).click();
      await figureByNumber(page, '16.5').getByRole('button', { name: 'Draw another cluster' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
