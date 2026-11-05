import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[22];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Where the elements come from' })).toBeVisible();
}

test('Chapter 23 shows its sections, three figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['23.1', '23.2', '23.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Where the elements come from' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the chart of nuclides: a nucleus by keyboard, Go to, the layers and the binding curve', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-iron-peak');
  const figure = figureByNumber(page, '23.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Iron-56 is stable: 91\.8% of the iron on Earth\./)).toBeVisible();
  const chart = figure.getByRole('application', { name: /^The chart of nuclides/ });
  await chart.focus();
  await chart.press('ArrowRight');
  await chart.press('ArrowRight');
  await expect(caption(figure, /^Iron-58 is stable/)).toBeVisible();
  await chart.press('ArrowUp');
  await chart.press('ArrowUp');
  await expect(caption(figure, /^Nickel-60 is stable/)).toBeVisible();
  await figure.getByRole('combobox', { name: /Go to/ }).selectOption({ label: '⁵⁶Ni, nickel-56' });
  await expect(caption(figure, /^Nickel-56 has a half-life of 6\.1 days: β⁺ decay or electron capture.* doubly magic/)).toBeVisible();
  await figure.getByRole('button', { name: 'Binding energy' }).click();
  await figure.getByRole('combobox', { name: /Go to/ }).selectOption({ label: '⁶²Ni, nickel-62' });
  await expect(caption(figure, /^Nickel-62: each of its 62 nucleons is bound by 8\.795 MeV/)).toBeVisible();
  await figure.getByRole('button', { name: 'Valley of stability' }).click();
  await figure.getByRole('button', { name: 'Drip lines' }).click();
  await figure.getByRole('button', { name: 'The binding curve' }).click();
  await expect(caption(figure, /^A = 56: the most tightly bound is iron-56, at 8\.790 MeV per nucleon/)).toBeVisible();
  await figure.getByRole('button', { name: 'Split into the drop’s terms' }).click();
  await expect(caption(figure, /^At A = 56, the drop holds each nucleon by 15\.8 MeV/)).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /^At A = 27\d, .*The repulsion’s cost grows with the protons/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 23.1' }).click();
  await expect(figure.getByRole('button', { name: 'The chart' })).toHaveAttribute('aria-pressed', 'true');
  await expect(caption(figure, /^Iron-56 is stable/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('neutron captures: the slow process piles up at N = 50, then the pattern, then the rapid process’s peaks', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'slow-neutron-captures');
  const figure = figureByNumber(page, '23.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^After an exposure of 0\.05 per mb \(about 66 years at 10⁸ per cm³\)/)).toBeVisible();
  const exposure = figure.getByRole('slider', { name: /^Neutron exposure/ });
  await exposure.fill('0.8');
  await expect(caption(figure, /most nuclei are now strontium-88 \(38 protons, 50 neutrons\): its 50 neutrons close a shell/)).toBeVisible();
  await exposure.fill('2');
  await expect(caption(figure, /most nuclei are now lead-208 .*126 neutrons close a shell/)).toBeVisible();
  await figure.getByRole('button', { name: 'The pattern' }).click();
  await figure.getByRole('button', { name: 'Exposures spread as in the Sun' }).click();
  await expect(caption(figure, /^σN against mass number for exposures spread as the Sun’s main component/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^σN against mass number for the slow process/ })).toBeVisible();
  await figure.getByRole('button', { name: 'The rapid process (a toy)' }).click();
  await figure.getByRole('slider', { name: /^Time/ }).fill('20');
  await expect(caption(figure, /^Bursts of every length up to 20 s, decayed back to stability: peaks near A = 8\d, 1[23]\d, 19\d\./)).toBeVisible();
  await figure.getByRole('button', { name: 'On the chart' }).click();
  await figure.getByRole('slider', { name: /^Time/ }).fill('1');
  await expect(caption(figure, /^After (9\d\d ms|1(\.\d+)? s) at 10²⁴ per cm³ and 1\.5 billion K, .*bound by about 3\.1 MeV/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 23.2' }).click();
  await expect(figure.getByRole('button', { name: 'The slow process' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('every element’s birthplace: gold, then iron and lithium by keyboard, and the Sun’s abundances', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'every-elements-birthplace');
  const figure = figureByNumber(page, '23.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Gold: 94% from merging neutron stars, 6% from dying low-mass stars\./)).toBeVisible();
  const table = figure.getByRole('application', { name: /^The periodic table/ });
  await table.focus();
  await table.press('Home');
  await expect(caption(figure, /^Hydrogen: 100% from the Big Bang\..* 10% of your mass/)).toBeVisible();
  await table.press('ArrowDown');
  await expect(caption(figure, /^Lithium: /)).toBeVisible();
  await expect(figure.getByText(/about 200 times less than the meteorites/)).toBeVisible();
  for (let i = 0; i < 23; i++) await table.press('ArrowRight');
  await expect(caption(figure, /^Iron: 64% from exploding white dwarfs, 36% from exploding massive stars\./)).toBeVisible();
  await figure.getByRole('button', { name: 'How much the Sun has' }).click();
  await expect(figure.getByRole('application', { name: /how much of each the Sun has/ })).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /^Uranium: 100% from merging neutron stars\./)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: where the slow process first piles up', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /first pile up/ });
  const select = question.getByRole('combobox', { name: 'Neutrons' });
  await select.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/iron-56 seed already has 30 neutrons/)).toBeVisible();
  await select.selectOption('50');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/N = 50: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 23, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '23.1').getByRole('button', { name: 'Half-life' }).click();
      await figureByNumber(page, '23.2').getByRole('button', { name: 'The pattern' }).click();
      await figureByNumber(page, '23.3').getByRole('button', { name: 'How much the Sun has' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
