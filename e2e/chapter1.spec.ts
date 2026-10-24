import { expect, test, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[0];

/** The zoom's slider value, as a number. */
async function zoomPower(page: Page) {
  return Number(await figureByNumber(page, '1.1').getByRole('slider', { name: 'Zoom' }).inputValue());
}

test('Chapter 1 shows its sections, three figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/${chapter.slug}/`);
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 1, name: 'A sense of scale' })).toBeVisible();
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['1.1', '1.2', '1.3']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
    await expect(figure.getByRole('list', { name: 'Legend' })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  await expect(main.getByRole('link', { name: /Part III · The Engine Room/ })).toBeVisible();
  await expect(main.getByText(/Voyager 1 will become the first spacecraft|Voyager 1 became the first spacecraft/)).toBeVisible();

  // Nothing is wider than the screen.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the zoom works by keyboard, and tells you how big things are', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/${chapter.slug}/`);
  const figure = figureByNumber(page, '1.1');
  const slider = figure.getByRole('slider', { name: 'Zoom' });
  await expect(figure.getByText(/10¹ m across, 1 step of ×10 from 1 m:/)).toBeVisible();

  // Page Up rounds up to the next whole power of ten, then steps by one.
  await slider.focus();
  await page.keyboard.press('PageUp');
  expect(await zoomPower(page)).toBe(1);
  for (let i = 0; i < 12; i++) await page.keyboard.press('PageUp');
  expect(await zoomPower(page)).toBe(13);
  await expect(figure.getByText(/10¹³ m across, 13 steps of ×10 from 1 m:/)).toBeVisible();
  await expect(figure.getByText(/All eight planets/)).toBeVisible();

  // The "In view" buttons pick objects, and the card gives the size three ways.
  await figure.getByRole('button', { name: 'Neptune', exact: true }).click();
  const card = figure.getByRole('heading', { level: 3, name: 'Neptune' }).locator('..').locator('..');
  await expect(card.getByText('49,528 km')).toBeVisible();
  await expect(card.getByText('4.95 × 10⁷ m')).toBeVisible();
  await expect(card.getByText('3.89 Earths')).toBeVisible();

  // The ÷10 and ×10 buttons.
  await figure.getByRole('button', { name: 'Zoom in ten times' }).click();
  expect(await zoomPower(page)).toBe(12);
  await figure.getByRole('button', { name: 'Zoom out ten times' }).click();
  expect(await zoomPower(page)).toBe(13);

  // Go to jumps to an object and picks it.
  await figure.getByRole('combobox', { name: /Go to/ }).selectOption({ label: 'Proxima Centauri' });
  expect(await zoomPower(page)).toBe(17);
  await expect(figure.getByText('4.25 light-years from the Sun.')).toBeVisible();

  // Reset puts it back.
  await figure.getByRole('button', { name: 'Reset figure 1.1' }).click();
  expect(await zoomPower(page)).toBe(0.65);
  await expect(figure.getByText('Pick anything in the view to see how big it is.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('clicking the zoom picks what is under the pointer, and the wheel zooms once the view is clicked', async ({ page }) => {
  await page.goto(`/${chapter.slug}/`);
  const figure = figureByNumber(page, '1.1');
  await figure.getByRole('combobox', { name: /Go to/ }).selectOption({ label: 'The Sun' });
  await figure.getByRole('button', { name: /Close the details/ }).click();
  const canvas = figure.locator('canvas');
  const box = (await canvas.boundingBox())!;
  // The Sun sits in the middle of the view.
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(figure.getByRole('heading', { level: 3, name: 'The Sun' })).toBeVisible();
  const before = await zoomPower(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => zoomPower(page)).toBeGreaterThan(before);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the zoom’s tour steps a whole power of ten at a time instead of gliding', async ({ page }) => {
    await page.goto(`/${chapter.slug}/`);
    const figure = figureByNumber(page, '1.1');
    await figure.getByRole('button', { name: '▶ Fly out' }).click();
    await expect.poll(() => zoomPower(page), { timeout: 5_000 }).toBeGreaterThanOrEqual(2);
    await figure.getByRole('button', { name: '❚❚ Stop' }).click();
    expect(Number.isInteger(await zoomPower(page))).toBe(true);
  });
});

test('the scale model changes with the size of the Sun', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/${chapter.slug}/`);
  const figure = figureByNumber(page, '1.2');
  await expect(figure.getByRole('button', { name: /grapefruit/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(figure.getByText(/Earth is 0.92 mm across and 10.8 m away. Neptune is 323 m out./)).toBeVisible();
  const earthRow = figure.getByRole('row', { name: /^Earth/ });
  await expect(earthRow.getByText('0.92 mm: about a grain of sand')).toBeVisible();

  await figure.getByRole('button', { name: /house/ }).click();
  await expect(figure.getByText(/With the Sun as a house, Earth is 9.2 cm across/)).toBeVisible();

  await figure.getByRole('spinbutton', { name: /your own size/ }).fill('1');
  await expect(figure.getByText(/With the Sun as a ball 1 cm across/)).toBeVisible();

  await figure.getByRole('button', { name: 'Reset figure 1.2' }).click();
  await expect(figure.getByRole('button', { name: /grapefruit/ })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('light’s race runs in 3D, steps from stop to stop, and reaches Proxima Centauri', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`/${chapter.slug}/#light-as-a-measuring-stick`);
  const figure = figureByNumber(page, '1.3');
  const view = figure.getByRole('group', { name: /3D view of the Solar System/ });
  await expect(view).toBeVisible();
  await expect(view.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(view.getByText(/couldn’t start the 3D view/)).toHaveCount(0);

  // Jump to a stop; the caption says when the light got there.
  await figure.getByRole('button', { name: /Jump to Earth\s*: light takes 8 min 19 s/ }).click();
  await expect(figure.getByText(/It reached Earth 8 min 19 s after leaving the Sun. Next: Mars/)).toBeVisible();

  // The camera turns and zooms by keyboard; zooming by hand stops following the light.
  await view.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('+');
  await expect(figure.getByRole('button', { name: 'Follow the light' })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Home');

  // At a year a second, Proxima is about 4 seconds away (longer when the whole suite is busy, since frames come slower).
  await figure.getByRole('button', { name: '1 year a second' }).click();
  await figure.getByRole('button', { name: '▶ Play' }).click();
  await expect(figure.getByText(/The light has reached Proxima Centauri, 4.25 years after leaving the Sun/)).toBeVisible({ timeout: 40_000 });
  await expect(figure.getByRole('button', { name: '↺ Again' })).toBeVisible();

  await figure.getByRole('button', { name: 'Reset figure 1.3' }).click();
  await expect(figure.getByText(/A flash of light is about to leave the Sun/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Toolkit pages work: the exponent machine and the angle figure', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/powers-of-ten/');
  await expect(page.getByRole('heading', { level: 1, name: 'Powers of ten' })).toBeVisible();
  const machine = figureByNumber(page, 'T1.1');
  await expect(machine.getByText(/The answer is 4.99 × 10²/)).toBeVisible();
  await machine.getByRole('combobox', { name: 'Example:' }).selectOption({ label: 'How far is a light-year?' });
  await expect(machine.getByText(/9.46 trillion kilometres/)).toBeVisible();
  await machine.getByRole('spinbutton', { name: 'Second number: the power of ten' }).fill('3');
  await expect(machine.getByText(/Its order of magnitude, the nearest power of ten, is 10¹²/)).toBeVisible();

  await page.goto('/toolkit/angles-in-the-sky/');
  await expect(page.getByRole('heading', { level: 1, name: 'Angles in the sky' })).toBeVisible();
  const angles = figureByNumber(page, 'T2.1');
  await expect(angles.getByText(/The full Moon: 3,475 km across, 384,400 km away, spans 31.1′/)).toBeVisible();
  await expect(angles.getByText('Not to scale')).toBeVisible();
  await angles.getByRole('combobox', { name: 'Example:' }).selectOption({ label: 'Your spread hand at arm’s length' });
  await expect(angles.getByText(/spans 19.8°/)).toBeVisible();
  await expect(angles.getByText('Not to scale')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 1, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await page.goto(`/${chapter.slug}/`);
      await figureByNumber(page, '1.1').getByRole('combobox', { name: /Go to/ }).selectOption({ label: 'Jupiter' });
      await figureByNumber(page, '1.3').getByRole('button', { name: /Jump to Neptune/ }).click();
      await expect(figureByNumber(page, '1.3').getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
