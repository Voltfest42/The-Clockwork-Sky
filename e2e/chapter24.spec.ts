import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[23];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Matter at its limit' })).toBeVisible();
}

test('Chapter 24 shows its sections, three figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['24.1', '24.2', '24.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Matter at its limit' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Fermi sea: white-dwarf matter packed, the Sun’s centre barely, hot thin gas free, and the pressure curve by keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'packed-electrons');
  const figure = figureByNumber(page, '24.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 1 × 10⁶ g\/cm³ and 10 million K, .*a Fermi energy of 140 keV.* the electrons are packed: .* push 63 times as hard/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Sun’s centre' }).click();
  await expect(caption(figure, /^At 154 g\/cm³ and 15\.7 million K, .*Heat and packing are about equal: 15% of the states .* is 4% above an ideal gas’s/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Density/ }).fill('6');
  await figure.getByRole('slider', { name: /^Temperature/ }).fill('9');
  await expect(caption(figure, /^At 1 × 10³ g\/cm³ and 1 billion K, .*the electrons are free/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /^At 1 × 10¹⁰ g\/cm³ and 1 billion K, .*the electrons are packed/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^The core’s map for helium, with the line where the electrons’ Fermi energy equals kT/ })).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 24.1' }).click();
  await expect(caption(figure, /^At 1 × 10⁶ g\/cm³ and 10 million K/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('build a white dwarf: the prediction, heavier is smaller, the limit and iron', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'heavier-is-smaller');
  await waitForHydration(page);
  const figure = figureByNumber(page, '24.2');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('radio', { name: 'Smaller' }).check();
  await figure.getByRole('button', { name: 'Check' }).click();
  await expect(figure.getByText('✓ Right.')).toBeVisible();
  await expect(caption(figure, /the white dwarf weighs 0\.\d{3} M☉ and is 8,\d{3} km in radius, 1\.4 times Earth’s/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Density at the centre/ }).fill('12');
  await expect(caption(figure, /^With 1 × 10⁹ g\/cm³ at its centre, .* weighs 1\.367 M☉ and is 2,4\d0 km in radius, 39% of Earth’s/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /it is within 1% of the limit, 1\.46 M☉/)).toBeVisible();
  await figure.getByRole('button', { name: 'Iron', exact: true }).click();
  await expect(caption(figure, /it is within 1% of the limit, 1\.26 M☉/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('cooling and crystallising: the heat freezing gives out, without it, and a young heavy white dwarf', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'embers-that-crystallise');
  const figure = figureByNumber(page, '24.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^After 2 billion years, a 0\.6 M☉ white dwarf that crystallises shines with 1\/13,000 of the Sun’s light, .* 29% of its mass has frozen into a crystal/)).toBeVisible();
  await figure.getByRole('button', { name: 'Crystallisation' }).click();
  await expect(caption(figure, /^After 2 billion years, a 0\.6 M☉ white dwarf that didn’t crystallise shines with 1\/21,000 of the Sun’s light/)).toBeVisible();
  await figure.getByRole('button', { name: '1.1 M☉' }).click();
  const age = figure.getByRole('slider', { name: /^Cooling for/ });
  await age.focus();
  await age.press('Home');
  await expect(caption(figure, /^After 10 million years, a 1\.1 M☉ white dwarf .* Its centre will start to freeze at 9\.\d+ million K, after \d+ million years/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^White dwarfs on the HR diagram with their cooling paths and the line where their centres start to freeze/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: a white dwarf the size of Earth', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /white dwarf the size of Earth/ });
  const slider = question.getByRole('slider', { name: 'Mass' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/0\.50 M☉ is too light/)).toBeVisible();
  await slider.fill('0.91');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/0\.91 M☉: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 24, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '24.1').getByRole('button', { name: 'A red giant’s core' }).click();
      await figureByNumber(page, '24.2').getByRole('button', { name: 'Iron', exact: true }).click();
      await figureByNumber(page, '24.3').getByRole('button', { name: '0.9 M☉' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
