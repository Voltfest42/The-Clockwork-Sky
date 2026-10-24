import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[5];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Kepler’s laws' })).toBeVisible();
}

async function openSolver(page: Page) {
  await page.locator('summary').filter({ hasText: 'Solving Kepler’s equation' }).click();
  const figure = figureByNumber(page, '6.4');
  await expect(figure).toBeVisible();
  return figure;
}

test('Chapter 6 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  await openSolver(page);
  for (const n of ['6.1', '6.2', '6.3', '6.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Ratios and scaling' }).first()).toHaveAttribute('href', '/toolkit/ratios-and-scaling/');
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('ellipses and equal areas', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const ellipse = figureByNumber(page, '6.1');
  await ellipse.getByRole('button', { name: 'Earth' }).click();
  await expect(caption(ellipse, /Earth’s orbit, to scale: eccentricity 0\.0167\. It is so close to a circle/)).toBeVisible();
  await ellipse.getByRole('button', { name: 'Halley’s comet' }).click();
  await expect(caption(ellipse, /eccentricity 0\.968\. A long, thin ellipse/)).toBeVisible();
  await ellipse.getByRole('slider', { name: 'Pencil' }).fill('120');
  await expect(ellipse.getByText(/= 2\.00, always/)).toBeVisible();
  await ellipse.getByRole('button', { name: 'Draw it' }).click();

  const areas = figureByNumber(page, '6.2');
  await areas.scrollIntoViewIfNeeded();
  await expect(areas.getByText('8.33% to 8.33%')).toBeVisible();
  await areas.getByRole('button', { name: 'Halley’s comet' }).click();
  await expect(areas.getByText(/55\.1 km\/s nearest the Sun/)).toBeVisible();
  await areas.getByRole('slider', { name: 'Time' }).fill('0.5');
  await expect(areas.getByRole('img', { name: /in wedge 7, moving at 0\.9 km\/s/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the harmonic law and the Kepler solver', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-harmonic-law');
  const harmonic = figureByNumber(page, '6.3');
  await harmonic.scrollIntoViewIfNeeded();
  await expect(harmonic.getByText('A planet 4.00 AU from the Sun takes 8.0 years to go round')).toBeVisible();
  await harmonic.getByRole('slider', { name: 'Your planet’s distance from the Sun' }).fill('1');
  await expect(harmonic.getByText('A planet 10.0 AU from the Sun takes 32 years to go round')).toBeVisible();
  await harmonic.getByRole('button', { name: 'Ordinary axes' }).click();
  await expect(caption(harmonic, /On ordinary axes/)).toBeVisible();

  const solver = await openSolver(page);
  await solver.getByRole('button', { name: 'Next guess →' }).click();
  await expect(caption(solver, /After 1 step the guess is off by/)).toBeVisible();
  await solver.getByRole('button', { name: 'All the way' }).click();
  await expect(caption(solver, /^Done in [3-6] steps/)).toBeVisible();
  await solver.getByRole('button', { name: 'Danby’s guess' }).click();
  await expect(caption(solver, /Starting guess/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: Halley’s comet’s shape', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Set the eccentricity so that the orbit has the shape of Halley/ });
  const slider = question.getByRole('slider', { name: 'Eccentricity' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('0.5');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/is quite stretched, but Halley’s orbit is more so/)).toBeVisible();
  await slider.fill('0.97');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

test('Toolkit T3: ratios and scaling', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/ratios-and-scaling/');
  await expect(page.getByRole('heading', { level: 1, name: 'Ratios and scaling' })).toBeVisible();
  const figure = figureByNumber(page, 'T3.1');
  await expect(caption(figure, /Doubling the size/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Scale by' }).fill('3');
  await expect(figure.getByText('Volume: ×27')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 6 and Toolkit T3, with every figure in use, pass the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '6.1').getByRole('button', { name: 'Halley’s comet' }).click();
      await figureByNumber(page, '6.2').getByRole('button', { name: 'Mercury' }).click();
      const solver = await openSolver(page);
      await solver.getByRole('button', { name: 'All the way' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);

      await page.goto('/toolkit/ratios-and-scaling/');
      await figureByNumber(page, 'T3.1').getByRole('slider', { name: 'Scale by' }).fill('3');
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
