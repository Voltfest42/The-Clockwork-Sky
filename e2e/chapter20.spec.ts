import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[19];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Holding a star up' })).toBeVisible();
}

test('Chapter 20 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['20.1', '20.2', '20.3', '20.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Rates of change' }).first()).toHaveAttribute('href', '/toolkit/rates-of-change/');
  await expect(main.getByRole('region', { name: 'Gravity, heat and the age of the Sun' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('how hot must the centre be: the Sun’s layers hold themselves up, and Jupiter’s temperature estimate fails', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'weight-and-pressure');
  const figure = figureByNumber(page, '20.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 0\.30 of the Sun’s radius the gas above weighs .* they agree to 0\.\d%/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Shell at' }).fill('0.8');
  await expect(caption(figure, /^At 0\.80 of the Sun’s radius/)).toBeVisible();
  await expect(figure.getByText(/Model S: 1\.6 × 10⁷ K|Model S: 15\.7 million K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Jupiter' }).click();
  await expect(figure.getByText(/interior models \(20,000–35,000 K\): 20,000 K \(the estimate is 6\.\d times too high\)/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 20.1' }).click();
  await expect(figure.getByRole('button', { name: 'The Sun' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('the star that heats as it cools: predict, then the Sun ignites and a brown dwarf stalls', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'losing-energy-getting-hotter');
  const figure = figureByNumber(page, '20.2');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByLabel('It cools down, like an ember').check();
  await figure.getByRole('button', { name: 'Check' }).click();
  await expect(figure.getByText(/✗ Not quite\. It heats up/)).toBeVisible();
  const time = figure.getByRole('slider', { name: 'Time' });
  await time.focus();
  await time.press('PageUp');
  await expect(caption(figure, /Gravity has released .* J: 50% radiated away, 50% heating the gas/)).toBeVisible();
  await time.press('End');
  await expect(caption(figure, /^Hydrogen ignites when the centre reaches 1\d(\.\d)? million K, after \d+ million years of shrinking/)).toBeVisible();
  await figure.getByRole('button', { name: 'A brown dwarf' }).click();
  await time.press('End');
  await expect(caption(figure, /^It never gets hot enough to fuse hydrogen\. Its centre peaks at 1\.\d million K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Luminosity' }).click();
  await expect(figure.getByRole('img', { name: /^Luminosity against time/ })).toBeVisible();
  // Play runs it to the end by itself.
  await figure.getByRole('button', { name: 'The Sun' }).click();
  await figure.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(caption(figure, /^Hydrogen ignites/)).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('fragmentation: a cloud breaks into pieces until the gas turns opaque', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'why-clouds-make-many-stars');
  const figure = figureByNumber(page, '20.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 10,000 per cm³ the Jeans mass is/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Density' }).fill('12');
  await expect(caption(figure, /^The gas is now opaque: fragments of about 0\.01 M☉ \(10 Jupiters\)/)).toBeVisible();
  await expect(figure.getByText(/…and 10 more levels/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Lane–Emden solver: Eddington’s Sun, each step, the profiles and n = 5', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-star-from-one-equation');
  const figure = figureByNumber(page, '20.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^n = 3: the surface is at ξ₁ = 6\.8968, reached in \d+ steps\. .* centre would be 76 g\/cm³ and 12 million K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Show each step' }).click();
  await figure.getByRole('slider', { name: 'Step' }).fill('20');
  await expect(caption(figure, /^Step 20 of \d+: at ξ = /)).toBeVisible();
  await figure.getByRole('button', { name: 'Show each step' }).click();
  await figure.getByRole('button', { name: 'Density' }).click();
  await expect(figure.getByRole('img', { name: /^Density \(g\/cm³\) against distance from the centre/ })).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('Home');
  await expect(cursor).toHaveAttribute('aria-valuetext', /^0\.00 of the radius: 76 g\/cm³/);
  await figure.getByRole('slider', { name: 'Index n' }).fill('5');
  await expect(caption(figure, /^n = 5 never reaches a surface/)).toBeVisible();
  await expect(figure.getByRole('button', { name: 'Density' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('the interactive question: the polytrope with the Sun’s central density', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Which index n gives it the Sun’s central density/ });
  const slider = question.getByRole('slider', { name: 'Index n' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/n = 1\.50 gives a centre of 8\.4 g\/cm³, 18\.\d times too thin/)).toBeVisible();
  await slider.fill('3.3');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/n = 3\.30 gives a centre of 1\d\d g\/cm³: right/)).toBeVisible();
});

test('Toolkit T8: zoom in until the curve is straight, and the Sun’s slope is its weight', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/rates-of-change/');
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Rates of change' })).toBeVisible();
  const figure = figureByNumber(page, 'T8.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 2\.00 s the ball is 80\.4 m up, and its height is falling at 19\.6 m every second/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Zoom' }).fill('6');
  await expect(figure.getByText(/At ×1,000 the curve and its tangent are indistinguishable here/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Sun’s pressure' }).click();
  await expect(caption(figure, /One cubic metre of gas there weighs .* the slope is the weight it holds up/)).toBeVisible();
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('Toolkit T9: the Sun’s mass, shell by shell', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/adding-up-small-pieces/');
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Adding up small pieces' })).toBeVisible();
  const figure = figureByNumber(page, 'T9.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^5 shells give 1\.03\d solar masses/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Shells' }).fill('12');
  await expect(caption(figure, /^200 shells give 1\.00\d solar masses\. The heaviest shell is the one at 0\.\d\d–0\.\d\d of the radius, not the centre/)).toBeVisible();
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('Toolkit T11: the estimate machine, factor by factor', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/estimating-with-orders-of-magnitude/');
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Estimating with orders of magnitude' })).toBeVisible();
  const figure = figureByNumber(page, 'T11.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: 'Central temperature' }).click();
  await figure.getByRole('button', { name: 'Next factor' }).click();
  await expect(figure.getByText(/^× G: Newton’s constant of gravity/)).toBeVisible();
  await figure.getByRole('button', { name: 'All at once' }).click();
  await expect(caption(figure, /^Central temperature: the estimate, 14,000,000 K|^Central temperature: the estimate, 1\.4 × 10⁷ K, is 1\.1 times lower than the true value/)).toBeVisible();
  await figure.getByRole('button', { name: 'A photon’s escape' }).click();
  await figure.getByRole('button', { name: 'All at once' }).click();
  await expect(caption(figure, /^A photon’s escape: the estimate, 5,100 years, is 8\.1 times lower than the true value/)).toBeVisible();
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 20, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '20.1').getByRole('button', { name: 'Jupiter' }).click();
      await figureByNumber(page, '20.2').getByRole('button', { name: 'A brown dwarf' }).click();
      await figureByNumber(page, '20.3').getByRole('slider', { name: 'Density' }).fill('8');
      await figureByNumber(page, '20.4').getByRole('button', { name: 'Pressure' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('Toolkit T8, T9 and T11 pass the accessibility checks', async ({ page }) => {
      await page.goto('/toolkit/rates-of-change/');
      await figureByNumber(page, 'T8.1').getByRole('button', { name: 'The Sun’s pressure' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
      await page.goto('/toolkit/adding-up-small-pieces/');
      await figureByNumber(page, 'T9.1').getByRole('slider', { name: 'Shells' }).fill('8');
      expect(await accessibilityViolations(page)).toEqual([]);
      await page.goto('/toolkit/estimating-with-orders-of-magnitude/');
      await figureByNumber(page, 'T11.1').getByRole('button', { name: 'All at once' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
