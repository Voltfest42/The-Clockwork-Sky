import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[12];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Sorting the stars' })).toBeVisible();
}

test('Chapter 13 shows its sections, three figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['13.1', '13.2', '13.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Reading starlight' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('plot a star: Sirius, Betelgeuse and a star of your own', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'two-numbers-for-every-star');
  const figure = figureByNumber(page, '13.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Sirius A lands at 9,7\d\d K and 26 times the Sun’s luminosity: the main sequence\.$/)).toBeVisible();
  await figure.getByRole('button', { name: 'Betelgeuse' }).click();
  await expect(caption(figure, /^Betelgeuse lands at .*: supergiants\.$/)).toBeVisible();
  await figure.getByRole('spinbutton', { name: 'Parallax' }).fill('10');
  await figure.getByRole('spinbutton', { name: 'Magnitude V' }).fill('5');
  await figure.getByRole('spinbutton', { name: 'Colour B − V' }).fill('1.1');
  await expect(caption(figure, /^Your star lands at 4,5\d\d K and 130 times the Sun’s luminosity: giants\.$/)).toBeVisible();
  await expect(figure.getByText(/Distance = 1 ÷ parallax: 100 parsecs/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the HR diagram of real stars: three samples, two sets of axes, and what lives where', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'hertzsprung-and-russells-diagram');
  const figure = figureByNumber(page, '13.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^Gaia’s 238,209 stars within 100 parsecs .* 9 in 10 lie on the main sequence/)).toBeVisible();
  await figure.getByRole('button', { name: 'Within 20 parsecs' }).click();
  await expect(figure.getByText(/^All 1,861 stars within 20 parsecs that Gaia measured well\. 2 in 3 are red dwarfs/)).toBeVisible();
  await figure.getByRole('button', { name: 'Naked-eye stars' }).click();
  await expect(figure.getByText(/^The [\d,]+ stars you can see with the naked eye whose distances Hipparcos measured/)).toBeVisible();
  await figure.getByRole('button', { name: 'Sirius B' }).click();
  await expect(caption(figure, /^Sirius B: White dwarfs\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Physicists’ axes' }).click();
  const diagram = figure.getByRole('application', { name: /HR diagram, physicists’ axes/ });
  await diagram.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');
  await expect(caption(figure, /Here: [\d,]+ K, /)).toBeVisible();
  await expect(caption(figure, /^Sirius B/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('stars to scale: from the Sun to Betelgeuse and the largest known', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'giants-dwarfs-and-the-sun');
  const figure = figureByNumber(page, '13.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The biggest star in full view: the Sun\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Betelgeuse' }).click();
  await expect(caption(figure, /^The biggest star in full view: Betelgeuse, 760 times the Sun’s radius \(published sizes range from 640 to 1,000\)\. Put in the Sun’s place/)).toBeVisible();
  await figure.getByRole('button', { name: 'The largest known' }).click();
  await expect(caption(figure, /^The biggest star in full view: the largest known star, 1,500 times the Sun’s radius/)).toBeVisible();
  const zoom = figure.getByRole('slider', { name: 'Zoom out' });
  await zoom.focus();
  await page.keyboard.press('Home');
  await expect(caption(figure, /^The biggest star in full view: Sirius B, 0\.0081 times the Sun’s radius\. A white dwarf/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: pick a white dwarf', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Which one is a white dwarf\?/ });
  const radios = question.getByRole('radio');
  await expect(radios).toHaveCount(6);
  await radios.nth(2).scrollIntoViewIfNeeded();
  await radios.nth(2).check();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Star C is a giant/)).toBeVisible();
  await radios.nth(3).check();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Star D: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 13, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '13.1').getByRole('button', { name: 'Arcturus' }).click();
      const hr = figureByNumber(page, '13.2');
      await hr.getByRole('button', { name: 'Physicists’ axes' }).click();
      await hr.getByRole('button', { name: 'Vega' }).click();
      await figureByNumber(page, '13.3').getByRole('button', { name: 'Rigel' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
