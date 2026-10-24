import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[3];

/** A figure's caption (not the hidden descriptions that repeat it for screen readers). */
function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The Moon' })).toBeVisible();
}

/** Steps Figure 4.4's year to 2026, whatever year it opens on. */
async function goToYear(figure: Locator, year: number) {
  const output = figure.getByRole('group', { name: 'Year' }).locator('output');
  for (let i = 0; i < 50; i++) {
    const shown = Number(await output.textContent());
    if (shown === year) return;
    await figure.getByRole('button', { name: shown < year ? 'Next year' : 'Previous year' }).click();
    await expect(output).not.toHaveText(String(shown));
  }
}

test('Chapter 4 shows its sections, six figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
    await expect(figure.getByRole('list', { name: 'Legend' })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const eclipses = figureByNumber(page, '4.4');
  await eclipses.scrollIntoViewIfNeeded();
  await expect(eclipses.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the phase machine: predict, then the full Moon, the daytime Moon and Earth’s shadow', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '4.1');
  await figure.getByRole('radio', { name: 'Higher, and farther from where the Sun set' }).check();
  await figure.getByRole('button', { name: 'Check, and move on three days' }).click();
  await expect(figure.getByText(/✓ Right\. In three days the Moon moves about 37°/)).toBeVisible();
  await expect(figure.getByText(/At 18:00: \d+° up/)).toBeVisible();

  await figure.getByRole('button', { name: 'Full', exact: true }).click();
  await expect(figure.getByText('full', { exact: true })).toBeVisible();
  await expect(caption(figure, /The Moon rises at about 18:00 and sets at about 06:00/)).toBeVisible();
  await figure.getByRole('button', { name: 'Earth’s shadow' }).click();
  await expect(caption(figure, /Earth’s shadow points at the Moon now, at full Moon/)).toBeVisible();

  await figure.getByRole('button', { name: 'First quarter' }).click();
  await figure.getByRole('slider', { name: 'Time' }).fill('15');
  await expect(caption(figure, /a daytime Moon/)).toBeVisible();

  // The Moon itself moves by keyboard.
  const moon = figure.getByRole('slider', { name: 'The Moon’s place in its orbit' });
  await moon.focus();
  await page.keyboard.press('Home');
  await expect(moon).toHaveAttribute('aria-valuetext', /0 days after new Moon: new/);
  await page.keyboard.press('ArrowRight');
  await expect(moon).toHaveAttribute('aria-valuetext', /^1 day after new Moon/);
  expect(errors).toEqual([]);
});

test('two months and the Moon’s spin', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'two-kinds-of-month');
  const months = figureByNumber(page, '4.2');
  await months.getByRole('button', { name: 'Next star alignment' }).click();
  await expect(months.getByText('★ Lined up with the star at 27 days 7 h 43 min')).toBeVisible();
  await months.getByRole('button', { name: 'Next new Moon' }).click();
  await expect(months.getByText('● New Moon at 29 days 12 h 44 min')).toBeVisible();
  await expect(caption(months, /lined up with the star 2 days 5 h 01 min before/)).toBeVisible();

  const spin = figureByNumber(page, '4.3');
  await spin.getByRole('slider', { name: 'Days' }).fill('13.75');
  await expect(spin.getByText(/Seen from Earth: (mostly )?the back/)).toBeVisible();
  await expect(spin.getByText('Seen from Earth: always the face')).toBeVisible();
  expect(errors).toEqual([]);
});

test('eclipse seasons: 2026’s eclipses, in the 3D view and the timeline', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'eclipses');
  const figure = figureByNumber(page, '4.4');
  await figure.scrollIntoViewIfNeeded();
  const scene = figure.getByRole('group', { name: 'The Moon’s tilted orbit round Earth, with the Sun’s direction' });
  await expect(scene.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(scene.getByText(/couldn’t start the 3D view/)).toHaveCount(0);
  await goToYear(figure, 2026);
  for (const name of ['17 February: annular solar eclipse', '3 March: total lunar eclipse', '12 August: total solar eclipse', '28 August: partial lunar eclipse']) {
    await expect(figure.getByRole('button', { name })).toBeVisible();
  }
  await expect(figure.getByText(/Saros 126/)).toBeVisible();
  await figure.getByRole('button', { name: '12 August: total solar eclipse' }).click();
  await expect(caption(figure, /a total solar eclipse\. The new Moon is in line with the Sun and Earth/)).toBeVisible();
  await expect(scene).toHaveAccessibleDescription(/there is a total solar eclipse/);

  await figure.getByRole('slider', { name: 'Date' }).fill('120');
  await expect(caption(figure, /outside an eclipse season/)).toBeVisible();
  await figure.getByRole('button', { name: 'Steeper tilt (×3)' }).click();
  await scene.focus();
  await page.keyboard.press('ArrowRight');
  expect(errors).toEqual([]);
});

test('shadows and a Saros series', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'eclipses');
  const shadows = figureByNumber(page, '4.5');
  await shadows.scrollIntoViewIfNeeded();
  await expect(caption(shadows, /a total eclipse/)).toBeVisible();
  await shadows.getByRole('button', { name: 'Annular' }).click();
  await expect(caption(shadows, /an annular eclipse/)).toBeVisible();
  await shadows.getByRole('button', { name: 'Lunar eclipse' }).click();
  await expect(caption(shadows, /coppery red: a total lunar eclipse/)).toBeVisible();
  await shadows.getByRole('button', { name: 'Missed' }).click();
  await expect(caption(shadows, /no eclipse/)).toBeVisible();

  const saros = figureByNumber(page, '4.6');
  await saros.scrollIntoViewIfNeeded();
  await expect(caption(saros, /Saros 126 runs from 1179 to 2459/)).toBeVisible();
  await saros.getByRole('button', { name: '2 August 2027, total solar' }).click();
  await expect(caption(saros, /Saros 136 runs from 1360 to 2622/)).toBeVisible();
  const slider = saros.getByRole('slider', { name: 'Eclipse' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuetext', /^1 of 71: \d+ \w+ 1360/);
  expect(errors).toEqual([]);
});

test('the interactive question: put the Moon at first quarter', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Drag the Moon to where it is at first quarter/ });
  const slider = question.getByRole('slider', { name: 'Moon' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('270');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/That’s last quarter/)).toBeVisible();
  await slider.fill('90');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 4, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '4.1').getByRole('radio', { name: 'In the same place' }).check();
      await figureByNumber(page, '4.1').getByRole('button', { name: 'Check, and move on three days' }).click();
      await figureByNumber(page, '4.1').getByRole('button', { name: 'Earth’s shadow' }).click();
      await figureByNumber(page, '4.2').getByRole('button', { name: 'Next new Moon' }).click();
      const eclipses = figureByNumber(page, '4.4');
      await eclipses.scrollIntoViewIfNeeded();
      await expect(eclipses.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
      await figureByNumber(page, '4.5').getByRole('button', { name: 'Lunar eclipse' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
