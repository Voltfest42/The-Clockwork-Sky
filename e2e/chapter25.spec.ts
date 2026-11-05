import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[24];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Stellar explosions' })).toBeVisible();
}

test('Chapter 25 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['25.1', '25.2', '25.3', '25.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Stellar explosions' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('collapse and bounce: the toy runs in the worker, stalls without heating and explodes with strong heating', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-core-that-cant-hold');
  await waitForHydration(page);
  const figure = figureByNumber(page, '25.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^0 ms after the core’s pressure gives way: it is falling in, .* The inner 0\.60 M☉ falls together, .* bounces at 0\.11 s/)).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('button', { name: 'Strong heating' }).click();
  await expect(caption(figure, /^With neutrinos of 3 × 10⁵² erg\/s heating the gas behind it, the shock is revived and breaks out: the star explodes, with 0\.\d+ × 10⁵¹ erg/)).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('button', { name: 'No heating' }).click();
  await expect(caption(figure, /^Without neutrino heating, the shock stalls about \d+ km out/)).toBeVisible({ timeout: 20_000 });
  const time = figure.getByRole('slider', { name: /^Time/ });
  await time.focus();
  await time.press('Home');
  await expect(caption(figure, /^0 ms after the core’s pressure gives way/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^Shells’ distances from the centre against time/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('supernova spectra, sorted: each type down the tree', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-kinds-of-supernova');
  const figure = figureByNumber(page, '25.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Type Ia: no hydrogen or helium, but silicon: .* Hydrogen lines\? No\. Silicon near 615 nm\? Yes\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Type II', exact: true }).click();
  await expect(caption(figure, /^Type II: hydrogen: .* Hydrogen lines\? Yes\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Type Ic' }).click();
  await expect(caption(figure, /^Type Ic: .* Helium lines\? No\. .*stripped of its hydrogen and its helium/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^A sketched Type Ic spectrum/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('light from radioactive nickel: Arnett’s rule, SN 1987A’s settings and the plateau', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'light-from-radioactive-nickel');
  await waitForHydration(page);
  const figure = figureByNumber(page, '25.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^0\.6 M☉ of nickel in 1\.4 M☉ thrown out at 10,000 km\/s: .* peaks on day 1[56] at 1\.4 × 10³⁶ W .*Arnett’s rule/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Nickel made/ }).fill('-0.52');
  await expect(caption(figure, /^0\.3 M☉ of nickel .* peaks on day 1[56] at 6\.\d × 10³⁵ W/)).toBeVisible();
  await figure.getByRole('button', { name: 'A blue supergiant (like SN 1987A)' }).click();
  await expect(caption(figure, /^0\.069 M☉ of nickel in 14 M☉ thrown out at 3,000 km\/s: light takes about 78 days to diffuse out, so the light curve peaks on day 9\d/)).toBeVisible();
  await figure.getByRole('button', { name: 'Hydrogen envelope (Popov’s plateau)' }).click();
  await expect(caption(figure, /the hydrogen envelope holds the light at .* for \d+ days \(Popov’s plateau\)/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(figure.getByText(/^On day 500$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the pair-instability wedge: a heavy core tips over, a light one holds', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'stars-that-leave-nothing-behind');
  await waitForHydration(page);
  const figure = figureByNumber(page, '25.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^A core of 80 M☉, 75% held up by light, .* below 4\/3: it can’t hold itself up\. Published models: blown apart, leaving nothing\./)).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('slider', { name: /^Helium core/ }).fill('1.175');
  await expect(caption(figure, /^A core of 15 M☉, .* Its centre stays outside the wedge: its average Γ₁ never falls below 1\.3\d+\. Published models: core collapse, as in lighter stars\./)).toBeVisible({ timeout: 20_000 });
  await expect(figure.getByRole('img', { name: /^The core’s map for oxygen, with the wedge where Γ₁ falls below 4\/3, from/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the nickel for SN 2011fe’s peak', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /SN 2011fe’s/ });
  const slider = question.getByRole('slider', { name: 'Nickel-56' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/0\.20 M☉ peaks at .* fainter than SN 2011fe’s/)).toBeVisible();
  await slider.fill('0.52');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/0\.52 M☉: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 25, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '25.1').getByRole('button', { name: 'Strong heating' }).click();
      await figureByNumber(page, '25.2').getByRole('button', { name: 'Type Ib' }).click();
      await figureByNumber(page, '25.3').getByRole('button', { name: 'Hydrogen envelope (Popov’s plateau)' }).click();
      await figureByNumber(page, '25.4').getByRole('slider', { name: /^Helium core/ }).fill('1.5');
      await expect(caption(figureByNumber(page, '25.1'), /the star explodes/)).toBeVisible({ timeout: 20_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
