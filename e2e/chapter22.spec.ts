import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[21];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The nuclear furnace' })).toBeVisible();
}

test('Chapter 22 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['22.1', '22.2', '22.3', '22.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Estimating with orders of magnitude' }).first()).toHaveAttribute('href', '/toolkit/estimating-with-orders-of-magnitude/');
  await expect(main.getByRole('region', { name: 'The nuclear furnace' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Gamow peak: two protons at the Sun’s centre, no tunnelling, carbon, and the peak up close', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-gamow-peak');
  const figure = figureByNumber(page, '22.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^p \+ p at 15\.7 million K: a typical pair has 1\.35 keV, and the barrier is 857 keV\. Fusion happens in a window at 6\.1 keV/)).toBeVisible();
  await figure.getByRole('button', { name: 'Without tunnelling' }).click();
  await expect(caption(figure, /^Without tunnelling, only p \+ p pairs with more than the barrier’s 857 keV could fuse: 10⁻²⁷⁴ of them/)).toBeVisible();
  await figure.getByRole('button', { name: 'Without tunnelling' }).click();
  await figure.getByRole('button', { name: '¹²C + ¹²C' }).click();
  await expect(caption(figure, /^¹²C \+ ¹²C at 800 million K: .* window at 2\.1 MeV.* climbs as T to the power 29\.6/)).toBeVisible();
  await figure.getByRole('button', { name: 'The peak up close' }).click();
  await expect(figure.getByRole('img', { name: /^The Gamow peak for ¹²C \+ ¹²C on linear scales/ })).toBeVisible();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await figure.getByRole('button', { name: 'Reset figure 22.1' }).click();
  await expect(figure.getByRole('button', { name: 'p + p' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('the pp chains and the CNO cycle: CNO takes over when hotter, each step’s wait, and the catalysts turning to nitrogen', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'four-protons-make-helium');
  const figure = figureByNumber(page, '22.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 15\.7 million K and 100 g\/cm³, .*: the pp chains win/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Temperature/ }).fill('25000000');
  await expect(caption(figure, /^At 25 million K and 100 g\/cm³, .*: the CNO cycle wins/)).toBeVisible();
  await figure.getByRole('combobox', { name: /^Step/ }).selectOption({ label: '¹⁴N + p → ¹⁵O + γ' });
  await expect(caption(figure, /¹⁴N \+ p → ¹⁵O \+ γ: a nucleus waits/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Sun’s centre today' }).click();
  await figure.getByRole('slider', { name: /^Temperature/ }).fill('15700000');
  await expect(caption(figure, /^At 15\.7 million K and 154 g\/cm³, .*ppI 40%, ppII 60%/)).toBeVisible();
  await figure.getByRole('button', { name: 'Catalysts over time' }).click();
  const cursor = figure.getByRole('slider', { name: /^Cursor/ });
  await cursor.focus();
  await cursor.press('End');
  await expect(caption(figure, /^After 10 billion years at 15\.7 million K, .*¹⁴N 100%, .*: the carbon has piled up as nitrogen-14/)).toBeVisible();
  await cursor.press('Home');
  await expect(caption(figure, /most is still the Sun’s starting carbon/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Hoyle’s resonance: moving the state up, down, and taking it away', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'hoyles-resonance');
  const figure = figureByNumber(page, '22.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^With the Hoyle state 380 keV above three helium nuclei \(as in nature\), .*T to the power 41.* leaves 22% carbon/)).toBeVisible();
  const slider = figure.getByRole('slider', { name: /^The Hoyle state’s energy/ });
  await slider.fill('0.44');
  await expect(caption(figure, /^With the Hoyle state 440 keV .*about 300 times slower than nature’s.* leaves 0\.\d+% carbon/)).toBeVisible();
  await slider.fill('0.32');
  await expect(caption(figure, /^With the Hoyle state 320 keV .* leaves 9\d% carbon/)).toBeVisible();
  await figure.getByRole('button', { name: 'No Hoyle state' }).click();
  await expect(caption(figure, /^With no Hoyle state, .*about 500 times slower.* under 0\.001% carbon/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the last days of a massive star: stage by stage to the collapse, for 15 and 25 Suns', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-last-days-of-a-massive-star');
  const figure = figureByNumber(page, '22.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /before the collapse of a star of 15 Suns: its core burns hydrogen at 35\.3 million K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Carbon', exact: true }).click();
  await expect(caption(figure, /its core burns carbon at 834 million K .* 2,000 years in all \(other codes: up to 3 times longer or shorter\)/)).toBeVisible();
  await figure.getByRole('button', { name: 'Silicon', exact: true }).click();
  await expect(caption(figure, /^1\d days before the collapse of a star of 15 Suns: its core burns silicon at 3\.34 billion K/)).toBeVisible();
  await figure.getByRole('button', { name: 'Collapse' }).click();
  await expect(caption(figure, /an iron core of 1\.45 solar masses, with no fuel left to burn, is about to fall in/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /iron and nickel/ })).toBeVisible();
  await figure.getByRole('button', { name: '25 Suns' }).click();
  await figure.getByRole('button', { name: 'Silicon', exact: true }).click();
  await expect(caption(figure, /hours before the collapse of a star of 25 Suns: its core burns silicon at 3\.65 billion K/)).toBeVisible();
  const clock = figure.getByRole('slider', { name: /^Time before the collapse/ });
  await clock.focus();
  await clock.press('Home');
  await expect(caption(figure, /^20 million years before the collapse of a star of 25 Suns: its core burns hydrogen/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /^The core’s map with the lines where hydrogen, helium, carbon, neon, oxygen and silicon light/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: where the CNO cycle takes over', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /CNO cycle start to make more heat/ });
  const slider = question.getByRole('slider', { name: 'Temperature' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/15 million K is too cool/)).toBeVisible();
  await slider.fill('20');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/20 million K: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 22, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '22.1').getByRole('button', { name: 'Without tunnelling' }).click();
      await figureByNumber(page, '22.2').getByRole('slider', { name: /^Temperature/ }).fill('22000000');
      await figureByNumber(page, '22.3').getByRole('button', { name: 'No Hoyle state' }).click();
      await figureByNumber(page, '22.4').getByRole('button', { name: 'Oxygen', exact: true }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
