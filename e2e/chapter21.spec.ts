import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[20];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Getting the energy out' })).toBeVisible();
}

test('Chapter 21 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['21.1', '21.2', '21.3', '21.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Differential equations' }).first()).toHaveAttribute('href', '/toolkit/differential-equations/');
  await expect(main.getByRole('region', { name: 'Radiation, convection and model stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the random walk: step by step, many at once, and the Sun’s 31,000 years', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-photons-random-walk');
  const figure = figureByNumber(page, '21.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: 'One step' }).click();
  await expect(caption(figure, /^After 1 step the photon is 1\.0 steps from where it started/)).toBeVisible();
  await figure.getByRole('button', { name: '100 steps' }).click();
  await expect(caption(figure, /^After 101 steps .* √101 is 10\.0/)).toBeVisible();
  await figure.getByRole('button', { name: 'Many walks' }).click();
  await expect(caption(figure, /^Over 400 walks, the typical distance after N steps is √N steps: \d\d after 3,000 steps/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Sun' }).click();
  await expect(figure.getByText(/31,000 years \(published: 10,000 years to 170,000 years\)/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /Here the gas convects, and carries the energy up in weeks/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 21.1' }).click();
  await expect(figure.getByRole('button', { name: 'One walk' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('what blocks the light: the cross-hair by keyboard, and the fits against Model S’s tables', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'what-blocks-the-light');
  const figure = figureByNumber(page, '21.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 3\.16 million K and 1 g\/cm³, bound–free \(Kramers\) blocks most of the light/)).toBeVisible();
  const map = figure.getByRole('application');
  await map.focus();
  for (let i = 0; i < 3; i++) await map.press('Shift+ArrowRight');
  for (let i = 0; i < 6; i++) await map.press('Shift+ArrowDown');
  await expect(caption(figure, /electron scattering blocks most of the light/)).toBeVisible();
  await figure.getByRole('button', { name: 'Few metals (a twentieth)' }).click();
  await figure.getByRole('button', { name: 'Along the Sun' }).click();
  await expect(caption(figure, /Model S’s tables give .*; the textbook fits give .* and the refitted ones/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('convection or not: a parcel rises in a steep gradient and settles in a shallow one; the Sun parts at 0.71', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'when-convection-takes-over');
  const figure = figureByNumber(page, '21.3');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('slider', { name: /How fast the star’s temperature falls/ }).fill('0.6');
  await figure.getByRole('button', { name: 'Nudge it up' }).click();
  await expect(caption(figure, /^The parcel: it rose all the way: the gas convects/)).toBeVisible({ timeout: 15_000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await figure.getByRole('slider', { name: /How fast the star’s temperature falls/ }).fill('0.25');
  await figure.getByRole('button', { name: 'Nudge it up' }).click();
  await expect(caption(figure, /^The parcel: it bobbed and settled back/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /Radiation can’t carry the energy here, so the gas convects/)).toBeVisible();
  await cursor.press('Home');
  await expect(caption(figure, /Radiation can carry the energy here/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('build a star: the young Sun, today’s Sun against Model S, the thermostat and a main sequence', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'four-equations-make-a-star');
  const figure = figureByNumber(page, '21.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^A star of 1 M☉ \(X = 0\.7, Z = 0\.02\) has a radius of 0\.799 R☉, shines with 0\.59 L☉/)).toBeVisible({ timeout: 20_000 });
  await expect(caption(figure, /^Try \d+ of \d+: .* They meet: this is the star\./)).toBeVisible();
  const tryNumber = figure.getByRole('slider', { name: 'Try' });
  await tryNumber.focus();
  await tryNumber.press('Home');
  await expect(caption(figure, /^Try 1 of \d+: at the fitting point, halfway out in mass, the centre’s half and the surface’s half differ by/)).toBeVisible();
  await figure.getByRole('button', { name: 'Today’s Sun' }).click();
  await expect(figure.getByText(/^Today’s Sun, built with Model S’s burnt-down core, has a radius of 0\.870 R☉, shines with 0\.88 L☉/)).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('button', { name: 'Inside' }).click();
  await figure.getByRole('button', { name: 'Gradients' }).click();
  await expect(figure.getByRole('img', { name: /^d ln T \/ d ln P inside the built star .* beside Model S/ })).toBeVisible();
  await figure.getByRole('button', { name: 'The young Sun' }).click();
  await figure.getByRole('button', { name: 'Burning ×10' }).click();
  await expect(figure.getByText(/burning ×10\) has a radius of .* shines with 0\.4 L☉ .* Its centre is 9\.13 million K/).first()).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('button', { name: 'HR diagram' }).click();
  await figure.getByRole('button', { name: 'Build a main sequence' }).click();
  await expect(figure.getByRole('button', { name: /A main sequence of 2\d stars$/ })).toBeVisible({ timeout: 60_000 });
  await figure.getByRole('button', { name: 'Mass and light' }).click();
  await expect(figure.getByRole('img', { name: /^Luminosity against mass on log axes/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: a star of two Suns', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /build a star of twice the Sun’s mass/ });
  const slider = question.getByRole('slider', { name: 'Luminosity' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/2 L☉ is too faint/)).toBeVisible();
  await slider.fill('1.32');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/21 L☉: right/)).toBeVisible();
});

test('Figure 20.1 gives Proxima’s and Sirius A’s centres', async ({ page }) => {
  await page.goto('/holding-a-star-up/#weight-and-pressure');
  const figure = figureByNumber(page, '20.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: 'Sirius A' }).click();
  await expect(figure.getByText(/Chapter 21’s star builder: 22 million K \(the estimate is/)).toBeVisible();
  await figure.getByRole('button', { name: 'Proxima Centauri' }).click();
  await expect(figure.getByText(/an n = 1\.5 polytrope of its mass and radius: \d(\.\d+)? million K/)).toBeVisible();
});

test('Toolkit T10: shooting the cannon and the red dwarf until they hit', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/differential-equations/');
  const figure = figureByNumber(page, 'T10.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The last try, 6\.000 km\/s, came out short by 159 km/)).toBeVisible();
  const correct = figure.getByRole('button', { name: 'Correct from the last two misses' });
  for (let i = 0; i < 8 && (await correct.isEnabled()); i++) await correct.click();
  await expect(caption(figure, /^A hit: .* lands the ball within a kilometre of the target, 1,500 km away/)).toBeVisible();
  await figure.getByRole('button', { name: 'A red dwarf' }).click();
  for (let i = 0; i < 10 && (await correct.isEnabled()); i++) await correct.click();
  await expect(caption(figure, /^A hit: .* gives a star of 0\.122 M☉/)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 21, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '21.1').getByRole('button', { name: 'The Sun' }).click();
      await figureByNumber(page, '21.2').getByRole('button', { name: 'Few metals (a twentieth)' }).click();
      await figureByNumber(page, '21.3').getByRole('slider', { name: /How fast the star’s temperature falls/ }).fill('0.5');
      const build = figureByNumber(page, '21.4');
      await expect(build.getByText(/^A star of 1 M☉/)).toBeVisible({ timeout: 20_000 });
      await build.getByRole('button', { name: 'Inside' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('Toolkit T10 passes the accessibility checks', async ({ page }) => {
      await page.goto('/toolkit/differential-equations/');
      await figureByNumber(page, 'T10.1').getByRole('button', { name: 'A red dwarf' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
