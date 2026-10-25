import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[1];

/** The sky view inside a figure, once its stars have loaded (they load as the figure nears the screen). */
async function skyView(figure: Locator) {
  const view = figure.locator('[aria-roledescription="sky view"]').first();
  await view.scrollIntoViewIfNeeded();
  await expect(view).toBeVisible();
  await expect(view).not.toHaveAccessibleDescription(/Loading the stars/, { timeout: 15_000 });
  return view;
}

/** Sets Figure 2.1's clock to a local date and time. */
async function setClock(figure: Locator, day: string, month: string, year: string, time: string) {
  await figure.getByRole('spinbutton', { name: 'Day' }).fill(day);
  await figure.getByRole('combobox', { name: 'Month' }).selectOption({ label: month });
  await figure.getByRole('spinbutton', { name: 'Year' }).fill(year);
  await figure.getByLabel('Time', { exact: true }).fill(time);
}

/** A figure's caption (not the hidden descriptions that repeat it for screen readers). */
function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The turning sky' })).toBeVisible();
}

test('Chapter 2 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  await expect(main.getByRole('link', { name: 'Angles in the sky' }).first()).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['2.1', '2.2', '2.3', '2.4', '2.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
    await expect(figure.getByRole('list', { name: 'Legend' })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  await skyView(figureByNumber(page, '2.1'));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the sky tonight: a set date and place, Find, the info card and the keyboard @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '2.1');
  const view = await skyView(figure);

  // 1 February 2026, 21:00 in London: night, with Sirius low in the south.
  await setClock(figure, '1', 'February', '2026', '21:00');
  await expect(figure.getByText('London time, UTC', { exact: true })).toBeVisible();
  await expect(figure.getByText(/London, night:/)).toBeVisible();
  await expect(figure.getByRole('group', { name: 'In view' }).getByRole('button', { name: 'Sirius' })).toBeVisible();

  // Find picks a star and says what it is.
  await figure.getByRole('combobox', { name: /Find/ }).selectOption({ label: 'Sirius' });
  const card = figure.getByRole('heading', { level: 3, name: /Sirius/ }).locator('..').locator('..');
  await expect(card.getByText('α Canis Major')).toBeVisible();
  await expect(card.getByText(/8.6 light-years: you see light that left it 9 years ago/)).toBeVisible();
  await expect(card.getByText(/above the horizon, towards the south/)).toBeVisible();
  await expect(card.getByText('rises and sets from here')).toBeVisible();
  await card.getByRole('button', { name: /Close the details/ }).click();

  // The keyboard turns the view; the description follows.
  await view.focus();
  await expect(view).toHaveAccessibleDescription(/Looking south/);
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft');
  await expect(view).toHaveAccessibleDescription(/Looking (south-east|east)/);
  await page.keyboard.press('Home');
  await expect(view).toHaveAccessibleDescription(/Looking south/);
  await figure.getByRole('button', { name: 'Look north' }).click();
  await expect(view).toHaveAccessibleDescription(/Looking north/);
  await expect(view).toHaveAccessibleDescription(/Polaris/);

  // Stepping by a star day brings the same stars back 4 minutes earlier on the clock.
  await figure.getByRole('combobox', { name: 'Step size' }).selectOption({ label: 'a star day (23 h 56 min)' });
  await figure.getByRole('button', { name: 'Forward a star day (23 h 56 min)' }).click();
  await expect(figure.getByLabel('Time', { exact: true })).toHaveValue('20:56');
  await expect(figure.getByRole('spinbutton', { name: 'Day' })).toHaveValue('2');

  // A BC date is in the Julian calendar.
  await figure.getByRole('spinbutton', { name: 'Year' }).fill('500');
  await figure.getByRole('combobox', { name: 'Era' }).selectOption('BC');
  await expect(figure.getByText(/Dates before 15 October 1582 are in the Julian calendar/)).toBeVisible();
  await expect(figure.getByText(/London, night:/)).toBeVisible();

  // Daylight hides the stars at noon; switching it off shows them.
  await figure.getByRole('button', { name: 'Reset figure 2.1' }).click();
  await setClock(figure, '21', 'June', '2026', '13:00');
  await expect(figure.getByText(/London, daytime:/)).toBeVisible();
  await expect(figure.getByText(/hides the stars/)).toBeVisible();
  await figure.getByRole('button', { name: 'Daylight' }).click();
  await expect(figure.getByText(/stars are above the horizon/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the place picker offers cities, coordinates and remembers the choice', async ({ page }) => {
  await openChapter(page);
  const figure = figureByNumber(page, '2.1');
  await skyView(figure);
  const picker = figure.getByRole('group', { name: 'Where you are' });
  await picker.getByRole('combobox', { name: 'Where you are' }).selectOption({ label: 'Sydney' });
  await expect(picker.getByText('33.9° S, 151.2° E')).toBeVisible();
  await setClock(figure, '15', 'January', '2026', '22:00');
  await expect(figure.getByText('Sydney time, UTC+11')).toBeVisible();

  // Every sky figure on the page shares the place.
  await expect(figureByNumber(page, '2.2').getByRole('combobox', { name: 'Where you are' })).toHaveValue('sydney');

  await picker.getByRole('combobox', { name: 'Where you are' }).selectOption({ label: 'Latitude and longitude…' });
  await picker.getByRole('spinbutton', { name: 'Latitude' }).fill('64.1');
  await picker.getByRole('spinbutton', { name: 'Longitude' }).fill('-21.9');
  await expect(figure.getByText(/UTC−1, by longitude/)).toBeVisible();

  await page.reload();
  await expect(figureByNumber(page, '2.1').getByRole('combobox', { name: 'Where you are' })).toHaveValue('custom');
  await expect(figureByNumber(page, '2.1').getByRole('spinbutton', { name: 'Latitude' })).toHaveValue('64.1');
});

test('star trails circle the pole facing north, and slant facing east', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'everything-turns-about-the-pole');
  const figure = figureByNumber(page, '2.2');
  const view = await skyView(figure);
  await expect(figure.getByText('Press Run the night to open the shutter.')).toBeVisible();
  await figure.getByRole('slider', { name: 'Exposure' }).fill('6');
  await expect(caption(figure, /the sky has turned 90° about the pole, 15° an hour/)).toBeVisible();
  await expect(caption(figure, /Facing the pole, the trails are circles round it/)).toBeVisible();
  await figure.getByRole('button', { name: 'Face east' }).click();
  await expect(view).toHaveAccessibleDescription(/Facing east, the stars rise at a slant/);
  await figure.getByRole('button', { name: 'Reset figure 2.2' }).click();
  await expect(figure.getByRole('slider', { name: 'Exposure' })).toHaveValue('0');
  expect(errors).toEqual([]);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the night runs in whole-hour steps', async ({ page }) => {
    await openChapter(page, 'everything-turns-about-the-pole');
    const figure = figureByNumber(page, '2.2');
    await skyView(figure);
    await figure.getByRole('button', { name: '▶ Run the night' }).click();
    await expect.poll(async () => Number(await figure.getByRole('slider', { name: 'Exposure' }).inputValue()), { timeout: 6000 }).toBeGreaterThanOrEqual(2);
    await figure.getByRole('button', { name: '❚❚ Pause' }).click();
    expect(Number.isInteger(Number(await figure.getByRole('slider', { name: 'Exposure' }).inputValue()))).toBe(true);
  });
});

test('inside and outside: the 3D sphere loads and the latitude changes both views', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'where-you-stand-changes-the-sky');
  const figure = figureByNumber(page, '2.3');
  await skyView(figure);
  const outside = figure.getByRole('group', { name: 'The celestial sphere seen from outside' });
  await expect(outside.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(outside.getByText(/couldn’t start the 3D view/)).toHaveCount(0);
  await expect(caption(figure, /Latitude 51.5° N: The north celestial pole stands 51.5° above the northern horizon/)).toBeVisible();
  await expect(figure.getByRole('heading', { level: 4, name: /Never set: 19% of the sky/ })).toBeVisible();

  const slider = figure.getByRole('slider', { name: 'Latitude' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(caption(figure, /At the north pole the celestial pole is straight overhead/)).toBeVisible();
  await expect(figure.getByRole('heading', { level: 4, name: /Never set: 50% of the sky/ })).toBeVisible();

  await figure.getByRole('button', { name: 'Equator' }).click();
  await expect(caption(figure, /On the equator both celestial poles sit on the horizon/)).toBeVisible();
  await expect(figure.getByRole('heading', { level: 4, name: /Rise and set: 100% of the sky/ })).toBeVisible();

  await figure.getByRole('button', { name: 'Sydney' }).click();
  const never = figure.getByRole('heading', { level: 4, name: /Never rise/ }).locator('..');
  await expect(never.getByText(/Polaris/)).toBeVisible();

  // The 3D view turns by keyboard.
  await outside.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  expect(errors).toEqual([]);
});

test('one spin, two days: the star comes back before the Sun', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'star-time-and-sun-time');
  const figure = figureByNumber(page, '2.4');
  await expect(figure.getByText('Star day: 22 h 09 min 14 s')).toBeVisible();
  await figure.getByRole('button', { name: 'Next star crossing' }).click();
  await expect(figure.getByText('★ The star crossed your meridian at 22 h 09 min 14 s')).toBeVisible();
  await figure.getByRole('button', { name: 'Next Sun crossing' }).click();
  await expect(figure.getByText('☀ The Sun crossed your meridian (noon) at 1 day 0 h 00 min')).toBeVisible();
  await expect(figure.getByText(/The star came back to your meridian 1 h 50 min 46 s before the Sun did/)).toBeVisible();

  await figure.getByRole('button', { name: 'Real year (365¼ days)' }).click();
  await expect(figure.getByText('Star day: 23 h 56 min 04 s')).toBeVisible();
  await expect(figure.getByText('Difference: 3.9 min')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the wandering pole: Thuban, Polaris and Vega take turns', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-slow-wobble');
  const figure = figureByNumber(page, '2.5');
  await skyView(figure);
  await expect(caption(figure, /Polaris is the pole star, 0.6\d° from the pole/)).toBeVisible();
  await figure.getByRole('button', { name: '2560 BC: the Great Pyramid' }).click();
  await expect(caption(figure, /Thuban is the pole star, 1.3\d° from the pole/)).toBeVisible();
  await figure.getByRole('button', { name: 'AD 13,600' }).click();
  await expect(caption(figure, /Vega is the nearest bright star to the pole, 5.\d° away/)).toBeVisible();
  await figure.getByRole('button', { name: '130 BC: Hipparchus' }).click();
  await expect(caption(figure, /No bright star is near the pole/)).toBeVisible();

  const slider = figure.getByRole('slider', { name: 'Year' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuetext', '10,000 BC');

  await figure.getByRole('button', { name: /^From / }).click();
  await expect(figure.locator('[aria-roledescription="sky view"]')).toHaveAccessibleName(/The sky from London in 10,000 BC/);
  await figure.getByRole('button', { name: 'Reset figure 2.5' }).click();
  await expect(slider).toHaveAttribute('aria-valuetext', 'AD 2026');
  expect(errors).toEqual([]);
});

test('the interactive question: put Polaris on the horizon', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Drag the latitude until Polaris/ });
  // The question remounts once the page has hydrated (to pick up stored answers): wait for its live slider.
  const slider = question.getByRole('slider', { name: 'Latitude' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('30');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Polaris is still about 30° up/)).toBeVisible();
  await slider.fill('0');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 2, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      const sky = figureByNumber(page, '2.1');
      await skyView(sky);
      await sky.getByRole('combobox', { name: /Find/ }).selectOption({ index: 3 });
      await figureByNumber(page, '2.2').getByRole('slider', { name: 'Exposure' }).fill('4');
      await figureByNumber(page, '2.4').getByRole('button', { name: 'Next star crossing' }).click();
      await figureByNumber(page, '2.5').getByRole('button', { name: 'AD 13,600' }).click();
      await figureByNumber(page, '2.3').scrollIntoViewIfNeeded();
      await expect(figureByNumber(page, '2.3').getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
      await skyView(figureByNumber(page, '2.5'));
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
