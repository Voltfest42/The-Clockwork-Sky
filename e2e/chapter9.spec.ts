import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[8];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The stars are suns' })).toBeVisible();
}

test('Chapter 9 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['9.1', '9.2', '9.3', '9.4', '9.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByText(/Its fourth data release, (due on|on) 2 December 2026/)).toBeVisible();
  await expect(main.getByRole('region', { name: 'Measuring the stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('parallax: real stars, a year of shifting, and 1 ÷ parallax', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '9.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /Proxima Centauri: a parallax of 0\.768″, so it is 1\.30 parsecs \(4\.25 light-years\) away/)).toBeVisible();
  await figure.getByRole('button', { name: 'Betelgeuse' }).click();
  await expect(caption(figure, /Betelgeuse: a parallax of 0\.00595″, so it is 168 parsecs \(548 light-years\) away/)).toBeVisible();
  await expect(figure.getByText('0.005″')).toBeVisible();
  await figure.getByRole('slider', { name: 'Distance' }).fill('1');
  await expect(caption(figure, /The star: a parallax of 0\.100″, so it is 10\.0 parsecs \(32\.6 light-years\) away/)).toBeVisible();
  await figure.getByRole('button', { name: '▶ Play a year' }).click();
  await expect(figure.getByRole('button', { name: '❚❚ Pause' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the neighbourhood in WebGL: filter by type and pick a star', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'our-neighbours');
  const figure = figureByNumber(page, '9.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.locator('canvas')).toBeVisible();
  await expect(figure.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(caption(figure, /^323 stars within 10 parsecs \(33 light-years\) of the Sun: 214 red dwarfs/)).toBeVisible();
  await figure.getByRole('button', { name: 'M: red dwarf' }).click();
  await expect(caption(figure, 'Showing 109 of the 323 stars within 10 parsecs.')).toBeVisible();
  await figure.getByRole('combobox', { name: 'Pick a star' }).selectOption({ label: 'Sirius (8.6 ly)' });
  await expect(caption(figure, /^Sirius: a hot white star, about twice the Sun’s mass/)).toBeVisible();
  await expect(figure.getByRole('heading', { name: /Sirius/ })).toBeVisible();
  // Clicking the empty edge of the view picks nothing.
  const view = figure.getByRole('group', { name: 'The stars within 10 parsecs of the Sun' });
  const box = (await view.boundingBox())!;
  await page.mouse.click(box.x + 6, box.y + 6);
  await expect(figure.getByRole('heading', { name: /Sirius/ })).toHaveCount(0);
  // Keyboard: the view turns with the arrow keys.
  await view.focus();
  await page.keyboard.press('ArrowLeft');
  expect(errors).toEqual([]);
});

test('move the Sun away, and the Milky Way from inside', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-sun-from-far-away');
  const sun = figureByNumber(page, '9.3');
  await sun.scrollIntoViewIfNeeded();
  await expect(caption(sun, 'From 4.37 light-years the Sun is magnitude 0.5: one of the brightest stars in the sky, brighter than Polaris.')).toBeVisible();
  await sun.getByRole('button', { name: 'the Pleiades' }).click();
  await expect(caption(sun, /From 444 light-years the Sun is magnitude 10\.5: too faint to see/)).toBeVisible();
  await sun.getByRole('slider', { name: 'Distance' }).fill('1.25');
  await expect(sun.getByText(/Magnitude: 6\.1/)).toBeVisible();

  const sky = figureByNumber(page, '9.4');
  await sky.scrollIntoViewIfNeeded();
  await expect(caption(sky, /the Milky Way is the disc of our own Galaxy seen edge-on from inside/)).toBeVisible({ timeout: 20_000 });
  await sky.getByRole('button', { name: 'Look towards the centre' }).click();
  await sky.getByRole('button', { name: 'Hide the Galaxy’s midline' }).click();
  await expect(sky.getByRole('button', { name: 'Show the Galaxy’s midline' })).toBeVisible();

  const zoom = figureByNumber(page, '9.5');
  await zoom.scrollIntoViewIfNeeded();
  await expect(zoom.getByText(/10¹³ m across, 13 steps of ×10 from 1 m/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the Sun at the edge of sight', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Move the Sun away until it is just too faint to see/ });
  const slider = question.getByRole('slider', { name: 'Distance' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('0.5');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/It is still easy to see: move it farther away/)).toBeVisible();
  await slider.fill('1.23');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 9, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '9.1').getByRole('button', { name: 'Vega' }).click();
      await figureByNumber(page, '9.2').getByRole('combobox', { name: 'Pick a star' }).selectOption({ label: 'Sirius (8.6 ly)' });
      await figureByNumber(page, '9.3').getByRole('button', { name: 'Vega' }).click();
      const look = figureByNumber(page, '9.4').getByRole('button', { name: 'Look towards the centre' });
      await look.scrollIntoViewIfNeeded();
      await expect(look).toBeEnabled({ timeout: 20_000 });
      await look.click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
