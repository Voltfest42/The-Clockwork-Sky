import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[16];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'A star’s life' })).toBeVisible();
}

test('Chapter 17 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['17.1', '17.2', '17.3', '17.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(figureByNumber(page, '17.2').getByRole('link', { name: 'Open this in the Star Forge →' })).toHaveAttribute('href', '/star-forge/?preset=sun');
  await expect(main.getByRole('region', { name: 'Lives of the stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('lifetimes: predict first, then a heavy star’s short life', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'living-fast-dying-young');
  const figure = figureByNumber(page, '17.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('radio', { name: 'The heavy star: it has more fuel' }).check();
  await figure.getByRole('button', { name: 'Check' }).click();
  await expect(figure.getByText(/Not quite\. The light star lives far longer/)).toBeVisible();
  await expect(figure.getByText(/^A star of 10 M☉ shines on the main sequence for about 24 million years/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Mass' }).fill('0');
  await expect(figure.getByText(/^A star of 1 M☉ shines on the main sequence for about 11 billion years, like the Sun/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Mass' }).fill('-1');
  await expect(figure.getByText(/No star this light has ever reached the end of its main sequence/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 17.1' }).click();
  await expect(figure.getByRole('radio', { name: 'The light star' })).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('the Sun’s life: from today to a red giant and a white dwarf', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'when-the-hydrogen-runs-out');
  const figure = figureByNumber(page, '17.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^At 4\.6 billion years:/)).toBeVisible();
  await expect(figure.getByText('The planets are where they are today.')).toBeVisible();
  await figure.getByRole('button', { name: 'The biggest it gets' }).click();
  await expect(figure.getByText(/Its surface has passed Mercury’s orbit\. Earth’s orbit has widened to 1\.6\d AU/)).toBeVisible();
  await figure.getByRole('button', { name: 'As time before the end' }).click();
  await expect(figure.getByRole('img', { name: /The Sun’s phases: Main sequence for 11 billion years/ })).toBeVisible();
  await figure.getByRole('button', { name: 'A white dwarf', exact: true }).click();
  await expect(caption(figure, /^The Sun ends as a white dwarf of 0\.52 solar masses/)).toBeVisible();
  await figure.getByRole('button', { name: 'Radius' }).click();
  await expect(figure.getByRole('img', { name: /The Sun’s radius through its life/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('age a cluster: M67’s turn-off and its published age', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'clusters-as-snapshots');
  const figure = figureByNumber(page, '17.3');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: 'M67' }).click();
  await figure.getByRole('slider', { name: 'Age' }).fill('3.6');
  await expect(figure.getByText(/At 4 billion years, stars heavier than 1\.3\d M☉ have left the main sequence/)).toBeVisible();
  await expect(caption(figure, /move it until its turn-off sits where M67’s stars leave the main sequence/)).toBeVisible();
  await figure.getByRole('button', { name: 'Show the published age' }).click();
  await expect(figure.getByText(/Published age: 3\.5 billion to 4\.5 billion years/)).toBeVisible();
  await expect(caption(figure, /close to the published age of M67/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Leavitt’s law: her two plots, and δ Cephei’s distance', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'stars-that-breathe');
  const figure = figureByNumber(page, '17.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/Leavitt wrote “about 0\.48”/)).toBeVisible();
  await figure.getByRole('button', { name: 'Period (her Figure 1)' }).click();
  await expect(figure.getByRole('img', { name: /against the period\./ })).toBeVisible();
  await expect(figure.getByText(/it must be about 26\d parsecs away/)).toBeVisible();
  await expect(figure.getByText(/puts it at 273 parsecs/)).toBeVisible();
  await figure.getByRole('button', { name: 'ℓ Carinae' }).click();
  await expect(figure.getByText(/puts it at 498 parsecs/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Mean brightness, V' }).fill('19');
  await expect(figure.getByRole('button', { name: 'Your own' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('the interactive question: the age of the Pleiades', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /How old are the Pleiades/ });
  const age = question.getByRole('slider', { name: 'Age' });
  await age.scrollIntoViewIfNeeded();
  await age.fill('3');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/1 billion years: too old/)).toBeVisible();
  await age.fill('2.08');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/120 million years: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 17, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      const f1 = figureByNumber(page, '17.1');
      await f1.getByRole('radio', { name: 'The light star' }).check();
      await f1.getByRole('button', { name: 'Check' }).click();
      await figureByNumber(page, '17.2').getByRole('button', { name: 'The red giant’s tip' }).click();
      await figureByNumber(page, '17.3').getByRole('button', { name: '47 Tucanae' }).click();
      await figureByNumber(page, '17.3').getByRole('button', { name: 'Show the published age' }).click();
      await figureByNumber(page, '17.4').getByRole('button', { name: 'Your own' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
