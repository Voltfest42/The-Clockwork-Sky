import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[26];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Black holes' })).toBeVisible();
}

test('Chapter 27 shows its sections, three figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['27.1', '27.2', '27.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Black holes' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('orbits near a black hole: the prediction, precession, the innermost stable orbit and a plunge', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'orbits-near-a-black-hole');
  await waitForHydration(page);
  const figure = figureByNumber(page, '27.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('radio', { name: 'No: far away, it pulls just like the star' }).check();
  await figure.getByRole('button', { name: 'Check' }).click();
  await expect(figure.getByText('✓ Right.')).toBeVisible();
  await expect(caption(figure, /^Energy 0\.9763, angular momentum 4\.38 GM\/c\. It swings between 10\.0 and 30\.0 GM\/c² from the centre\. Each turn its closest point moves on by 106° \(the weak-field rule, .* says 72°\)/)).toBeVisible();
  await figure.getByRole('button', { name: 'The innermost stable orbit' }).click();
  await expect(caption(figure, /A circular orbit at 6\.0 GM\/c²: the innermost stable orbit/)).toBeVisible();
  await figure.getByRole('button', { name: 'Plunge' }).click();
  await expect(caption(figure, /It plunges: .* crosses the horizon after \d+\.\d turns/)).toBeVisible();
  await figure.getByRole('button', { name: 'Far away' }).click();
  await expect(caption(figure, /It swings between 300 and 600 GM\/c² .* moves on by 2\.7°/)).toBeVisible();
  const energy = figure.getByRole('slider', { name: /^Energy/ });
  await energy.focus();
  await energy.press('End');
  await expect(caption(figure, /^Energy 1\.0300, .* It comes in from far away/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('bending light: a bent ray, a captured one, and the weak-field rule', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'light-near-a-black-hole');
  const figure = figureByNumber(page, '27.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Aimed 7\.00 GM\/c² from the centre, the light comes within 5\.6\d GM\/c² and is turned by 65°\. The weak-field rule 4GM\/c²b says 33°/)).toBeVisible();
  const aim = figure.getByRole('slider', { name: /^Aim/ });
  await aim.fill('0.7');
  await expect(caption(figure, /^Aimed 5\.01 GM\/c² from the centre, inside √27 = 5\.20, the light is captured/)).toBeVisible();
  await aim.fill('1.6');
  await expect(caption(figure, /^Aimed 39\.81 GM\/c² .* close to the truth this far out/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the accretion disc: X-rays round a stellar black hole, ultraviolet round a quasar, and spin', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-brightest-engines');
  const figure = figureByNumber(page, '27.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^A black hole of 10 M☉ .* inner edge is at 6\.00 GM\/c² \(89 km\), and gas reaching it has given out 5\.7% .* its light peaks in X-rays/)).toBeVisible();
  await figure.getByRole('button', { name: '10⁸ M☉' }).click();
  await expect(caption(figure, /its light peaks in ultraviolet/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Spin/ }).fill('0.998');
  await expect(caption(figure, /inner edge is at 1\.24 GM\/c² .* given out 32\.\d% of its rest-mass energy/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the smallest stable circular orbit', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /smallest stable circular orbit/ });
  const slider = question.getByRole('slider', { name: 'Distance from the centre' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/10\.0 GM\/c² is too far out/)).toBeVisible();
  await slider.fill('6');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/6\.0 GM\/c²: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 27, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '27.1').getByRole('button', { name: 'Zoom and whirl' }).click();
      await figureByNumber(page, '27.2').getByRole('slider', { name: /^Aim/ }).fill('0.7');
      await figureByNumber(page, '27.3').getByRole('button', { name: '10⁸ M☉' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
