import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[2];

/** The sky view inside a figure, once its stars have loaded. */
async function skyView(figure: Locator) {
  const view = figure.locator('[aria-roledescription="sky view"]').first();
  await view.scrollIntoViewIfNeeded();
  await expect(view).toBeVisible();
  await expect(view).not.toHaveAccessibleDescription(/Loading the stars/, { timeout: 15_000 });
  return view;
}

/** A figure's caption (not the hidden descriptions that repeat it for screen readers). */
function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The Sun’s year' })).toBeVisible();
}

/** Opens the deep dive on the ice ages, where Figure 3.6 lives. */
async function openDeepDive(page: Page) {
  await page.locator('summary').filter({ hasText: 'The ice ages' }).click();
}

test('Chapter 3 shows its sections, six figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  await openDeepDive(page);
  for (const n of ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
    await expect(figure.getByRole('list', { name: 'Legend' }).first()).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  await skyView(figureByNumber(page, '3.1'));
  await skyView(figureByNumber(page, '3.3'));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Sun’s year: the zodiac’s 13 constellations, and the equinox in Aries in 100 BC', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '3.1');
  const view = await skyView(figure);
  const table = figure.getByRole('table');
  await expect(table.getByRole('button', { name: /^Go to Ophiuchus/ })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(15);
  await expect(caption(figure, /the Sun is in \w+/)).toBeVisible();

  await figure.getByRole('button', { name: '100 BC' }).click();
  await figure.getByRole('button', { name: 'March equinox' }).click();
  await expect(figure.getByText('The Sun is in: Aries', { exact: false })).toBeVisible();
  await expect(view).toHaveAccessibleDescription(/The Sun is in Aries/);
  await figure.getByRole('button', { name: 'This year' }).click();
  await figure.getByRole('button', { name: 'March equinox' }).click();
  await expect(view).toHaveAccessibleDescription(/The Sun is in Pisces/);

  // The date slider works by keyboard.
  const slider = figure.getByRole('slider', { name: 'Date' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveAttribute('aria-valuetext', /31 December/);
  await expect(view).toHaveAccessibleDescription(/The Sun is in Sagittarius/);
  expect(errors).toEqual([]);
});

test('the seasons machine: predict, then tilt the axis', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'why-we-have-seasons');
  const figure = figureByNumber(page, '3.2');
  await figure.scrollIntoViewIfNeeded();
  const scene = figure.getByRole('group', { name: 'Earth going round the Sun, with its axis tilted' });
  await expect(scene.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(scene.getByText(/couldn’t start the 3D view/)).toHaveCount(0);

  await figure.getByRole('radio', { name: 'In December or January' }).check();
  await figure.getByRole('button', { name: 'Check' }).click();
  await expect(figure.getByText(/✓ Right\. Earth is closest on [2-5] January/)).toBeVisible();

  // Midsummer in London: a long day and a high Sun; the south has its winter.
  await figure.getByRole('slider', { name: 'Date' }).fill('171');
  await expect(caption(figure, /21 June, 51\.5° N: summer here, winter at 51\.5° S\. The noon Sun climbs to 62° and the Sun is up for 16 h 3\d min/)).toBeVisible();
  await figure.getByRole('button', { name: 'South', exact: true }).click();
  await expect(caption(figure, /21 June, 51\.5° S: winter here/)).toBeVisible();

  await figure.getByRole('button', { name: 'No tilt' }).click();
  await expect(caption(figure, /With no tilt there are no seasons/)).toBeVisible();
  await figure.getByRole('button', { name: 'Distance from the Sun' }).click();
  await expect(figure.getByRole('list', { name: 'Legend' }).getByText('facing the Sun: distance alone').first()).toBeVisible();

  await scene.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  await figure.getByRole('button', { name: 'Reset figure 3.2' }).click();
  await expect(figure.getByRole('slider', { name: 'Tilt' })).toHaveValue('23.44');
  expect(errors).toEqual([]);
});

test('the Sun’s daily path: London’s solstices, the midnight Sun and the tropics', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'solstices-equinoxes-and-the-midnight-sun');
  const figure = figureByNumber(page, '3.3');
  const view = await skyView(figure);
  await figure.getByRole('button', { name: 'June solstice' }).click();
  await expect(caption(figure, /London, 2[01] June: The Sun rises at 04:4\d in the north-east \(49°\), climbs to 62° at 13:0\d and sets at 21:2\d/)).toBeVisible();
  await figure.getByRole('button', { name: 'December solstice' }).click();
  await expect(caption(figure, /rises at 08:0\d in the south-east/)).toBeVisible();
  await expect(view).toHaveAccessibleDescription(/sets at 15:5\d/);

  const picker = figure.getByRole('combobox', { name: 'Where you are' });
  await picker.selectOption({ label: 'Tromsø' });
  await expect(caption(figure, /The Sun never rises today/)).toBeVisible();
  await figure.getByRole('button', { name: 'June solstice' }).click();
  await expect(caption(figure, /The Sun never sets today/)).toBeVisible();
  await picker.selectOption({ label: 'Singapore' });
  await expect(caption(figure, /between the tropics, the noon Sun can be overhead/)).toBeVisible();

  await figure.getByRole('button', { name: 'Facing the equator' }).click();
  await figure.getByRole('slider', { name: 'Time' }).fill('6');
  await expect(figure.getByText(/06:00 · Sun/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('calendar drift, the analemma and the changing tilt', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'calendars');
  const drift = figureByNumber(page, '3.4');
  await drift.getByRole('button', { name: '1582', exact: true }).click();
  await expect(caption(drift, /In 1582 Pope Gregory XIII dropped ten days/)).toBeVisible();
  await expect(drift.getByText(/equinox on 1[01] March/)).toBeVisible();
  await drift.getByRole('button', { name: 'Julian and Gregorian close up' }).click();
  await expect(drift.getByRole('list', { name: 'Legend' }).getByText('No leap years (365 days)')).toHaveCount(0);

  const analemma = figureByNumber(page, '3.5');
  await analemma.scrollIntoViewIfNeeded();
  await analemma.getByRole('button', { name: 'Elliptical orbit' }).click();
  await expect(caption(analemma, /The tilt alone gives a neat, symmetrical figure eight/)).toBeVisible();
  await analemma.getByRole('button', { name: 'Tilted axis' }).click();
  await expect(caption(analemma, /With neither, the Sun comes back to the same spot every day/)).toBeVisible();
  await analemma.getByRole('slider', { name: 'Date' }).fill('42');
  await analemma.getByRole('button', { name: 'Reset figure 3.5' }).click();
  await analemma.getByRole('slider', { name: 'Date' }).fill('42');
  await expect(analemma.getByText(/behind the clock/).first()).toBeVisible();

  await openDeepDive(page);
  const tilt = figureByNumber(page, '3.6');
  const slider = tilt.getByRole('slider', { name: 'When' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuetext', '200,000 years ago');
  await expect(caption(tilt, /Earth’s axis is tilted 23\.\d\d°/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the day of the highest noon Sun', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Set the date when the noon Sun is highest/ });
  const slider = question.getByRole('slider', { name: 'Date' });
  // The question starts again once the page has hydrated, and its slider appears then.
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('59');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Look for the day when the Sun is farthest north/)).toBeVisible();
  await slider.fill('172');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 3, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await skyView(figureByNumber(page, '3.1'));
      await figureByNumber(page, '3.2').getByRole('radio', { name: 'In June or July' }).check();
      await figureByNumber(page, '3.2').getByRole('button', { name: 'Check' }).click();
      await figureByNumber(page, '3.2').scrollIntoViewIfNeeded();
      await expect(figureByNumber(page, '3.2').getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
      await skyView(figureByNumber(page, '3.3'));
      await figureByNumber(page, '3.4').getByRole('button', { name: 'AD 325' }).click();
      await openDeepDive(page);
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
