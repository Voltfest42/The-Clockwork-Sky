import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[4];

/** A figure's caption (not the hidden descriptions that repeat it for screen readers). */
function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Wanderers' })).toBeVisible();
}

/** Steps a figure's year stepper to a year, whatever year it opens on. */
async function goToYear(figure: Locator, year: number) {
  const output = figure.getByRole('group', { name: 'Year' }).locator('output');
  for (let i = 0; i < 50; i++) {
    const shown = Number(await output.textContent());
    if (shown === year) return;
    await figure.getByRole('button', { name: shown < year ? 'Next year' : 'Previous year' }).click();
    await expect(output).not.toHaveText(String(shown));
  }
}

test('Chapter 5 shows its sections, five figures, the timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['5.1', '5.2', '5.3', '5.4', '5.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
    await expect(figure.getByRole('list', { name: 'Legend' })).toBeVisible();
  }
  const timeline = main.getByRole('region', { name: 'From Aristarchus to Kepler' });
  await expect(timeline.getByText('Tycho Brahe').first()).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  for (const n of ['5.1', '5.2']) {
    await figureByNumber(page, n).scrollIntoViewIfNeeded();
    await expect(figureByNumber(page, n).locator('canvas').first()).toBeVisible();
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('a year of planets: Mars goes backwards at the start of 2025, and Mercury stays near the Sun', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '5.1');
  await figure.scrollIntoViewIfNeeded();
  await goToYear(figure, 2025);
  const mars = figure.getByRole('row').filter({ has: page.getByRole('button', { name: 'Follow Mars' }) });
  await expect(mars).toContainText('1 January to 24 February');
  const mercury = figure.getByRole('row').filter({ has: page.getByRole('button', { name: 'Follow Mercury' }) });
  await expect(mercury).toContainText(/2[78]°/);
  await figure.getByRole('group', { name: 'Planet the chart follows' }).getByRole('button', { name: 'Mars' }).click();
  await figure.getByRole('slider', { name: 'Date' }).fill('15');
  await expect(caption(figure, /16 January 2025: Mars is in \w+, 1[78]\d° from the Sun, opposite it: up all night, and moving backwards/)).toBeVisible();
  await figure.getByRole('button', { name: 'Mars’s path' }).click();
  await expect(figure.getByRole('button', { name: 'Mars’s path' })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('retrograde loops: Mars in 2024–25, then Venus', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'backward-loops');
  const figure = figureByNumber(page, '5.2');
  await figure.scrollIntoViewIfNeeded();
  const opposition = figure.getByText(/^Opposition:/);
  for (let i = 0; i < 6 && !(await opposition.textContent())?.includes('16 January 2025'); i++) {
    const before = await opposition.textContent();
    await figure.getByRole('button', { name: '← Previous loop' }).click();
    await expect(opposition).not.toHaveText(before ?? '');
  }
  await expect(opposition).toHaveText('Opposition: 16 January 2025');
  await expect(figure.getByText('Backwards from 6 December 2024 to 24 February 2025 (79 days, 19°)')).toBeVisible();
  await figure.getByRole('slider', { name: 'Date' }).fill('0');
  await expect(caption(figure, /16 January 2025: Mars is in \w+, moving backwards \(west\)\. Earth, on its smaller, faster orbit, is overtaking Mars/)).toBeVisible();
  await figure.getByRole('button', { name: 'Venus' }).click();
  await expect(figure.getByText(/^Inferior conjunction:/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('tune Ptolemy: Ptolemy’s proportions, the best fit, and the equant', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'circles-on-circles');
  const figure = figureByNumber(page, '5.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /One circle and one epicycle/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Once round the deferent' }).fill('687');
  await figure.getByRole('slider', { name: 'Once round the epicycle' }).fill('780');
  await expect(caption(figure, /The loops are in step now/)).toBeVisible();
  await figure.getByRole('button', { name: 'Ptolemy’s proportions' }).click();
  await expect(figure.getByText(/Average miss: 0\.[4-6]\d°/)).toBeVisible();
  await expect(caption(figure, /bisected eccentricity/)).toBeVisible();
  await figure.getByRole('button', { name: 'Best fit', exact: true }).click();
  await expect(figure.getByText(/about as good as this kind of model can get/)).toBeVisible();
  await figure.getByRole('button', { name: 'Best fit without an equant' }).click();
  await expect(figure.getByText(/Average miss: [1-9]\.\d\d°/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Venus: its greatest elongation and its phases in two worlds', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-sun-in-the-middle');
  const orbit = figureByNumber(page, '5.4');
  await orbit.scrollIntoViewIfNeeded();
  await orbit.getByRole('slider', { name: 'Venus’s place round its orbit' }).fill('226');
  await expect(caption(orbit, /Venus is at its greatest angle from the Sun, 46\.3°/)).toBeVisible();
  await expect(orbit.getByText(/the Sun–Venus side measures 0\.72/)).toBeVisible();
  await orbit.getByRole('button', { name: 'Mercury' }).click();
  await orbit.getByRole('slider', { name: 'Mercury’s place round its orbit' }).fill('203');
  await expect(caption(orbit, /Mercury is at its greatest angle from the Sun, 22\.8°/)).toBeVisible();

  const phases = figureByNumber(page, '5.5');
  await phases.scrollIntoViewIfNeeded();
  await expect(phases.getByRole('img', { name: /^1 Oct 1610: 78% lit/ })).toBeVisible();
  await phases.getByRole('slider', { name: 'Days since Venus was behind the Sun' }).fill('292');
  await expect(caption(phases, /Venus is on our side of the Sun now/)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 5, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      for (const n of ['5.1', '5.2']) {
        await figureByNumber(page, n).scrollIntoViewIfNeeded();
        await expect(figureByNumber(page, n).locator('canvas').first()).toBeVisible();
      }
      await figureByNumber(page, '5.3').getByRole('button', { name: 'Ptolemy’s proportions' }).click();
      await figureByNumber(page, '5.4').getByRole('slider', { name: 'Venus’s place round its orbit' }).fill('226');
      await page.locator('summary').filter({ hasText: 'Why the epicycle is Earth’s orbit' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
