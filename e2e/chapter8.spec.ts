import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[7];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'A tour of the Solar System' })).toBeVisible();
}

test('Chapter 8 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['8.1', '8.2', '8.3', '8.4', '8.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByText(/as of March 2026, Saturn has 285 known moons, Jupiter 101, Uranus 29 and Neptune 16/)).toBeVisible();
  await expect(main.getByRole('region', { name: 'Exploring the Solar System' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Solar System today: zooms, true sizes and a planet’s card', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '8.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /Out to Jupiter: Mercury, Venus, Earth, Mars, Jupiter, seen from above/)).toBeVisible();
  await figure.getByRole('button', { name: 'Out to Neptune' }).click();
  await expect(caption(figure, /Out to Neptune: all eight planets/)).toBeVisible();
  await figure.getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Neptune' }).click();
  await expect(figure.getByText(/^29\.\d\d AU \(4,\d\d\d million km\): sunlight takes 4 hours \d+ minutes/)).toBeVisible();
  await figure.getByRole('button', { name: '▶ Play' }).click();
  await expect(figure.getByRole('button', { name: '❚❚ Pause' })).toBeVisible();
  await figure.getByRole('button', { name: 'True sizes' }).click();
  await expect(caption(figure, /side by side at their true sizes/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /Jupiter is about a tenth of the Sun’s width/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('planet cards: two globes in WebGL, your weight and your age', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'rocky-worlds');
  const figure = figureByNumber(page, '8.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.locator('canvas')).toBeVisible();
  await expect(figure.getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  await expect(figure.getByRole('group', { name: 'Earth and Jupiter side by side, to scale' })).toBeVisible();
  const table = figure.getByRole('table');
  await expect(table.getByRole('row', { name: /A scale would read 70 kg 177 kg/ })).toBeVisible();
  await figure.getByRole('combobox', { name: 'Right' }).selectOption('mars');
  await expect(table.getByRole('row', { name: /A scale would read 70 kg 27 kg/ })).toBeVisible();
  await figure.getByRole('slider', { name: 'Your age' }).fill('30');
  await expect(table.getByRole('row', { name: /Your age there 30\.0 years 1[56]\.\d years/ })).toBeVisible();
  await figure.getByRole('combobox', { name: 'Left' }).selectOption('venus');
  await expect(caption(figure, /Mars is 1\.78 times narrower than Venus/)).toBeVisible();
  await expect(table.getByRole('row', { name: /Spins once in 243 days, backwards/ })).toBeVisible();
  await figure.getByRole('button', { name: '▶ Spin' }).click();
  await expect(figure.getByRole('button', { name: '❚❚ Stop spinning' })).toBeVisible();
  // The globes' maps arrived.
  await expect.poll(async () => (await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /\.webp/.test(r.name)).length)) > 0).toBe(true);
  expect(errors).toEqual([]);
});

test('Jupiter’s moons run in the n-body worker and keep their 1 : 2 : 4 rhythm', async ({ page }) => {
  const errors = watchErrors(page);
  const workers: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));
  await openChapter(page, 'giants-and-their-moons');
  const figure = figureByNumber(page, '8.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /Press Play, or run one lap of Ganymede/)).toBeVisible();
  await figure.getByRole('button', { name: 'Run one lap of Ganymede' }).click();
  await expect(caption(figure, /After 7\.2 days\. Io has gone round 4 times, Europa 2 times, Ganymede 1 time and Callisto 0 times/)).toBeVisible({ timeout: 15_000 });
  expect(workers.some((url) => url.includes('nbody'))).toBe(true);
  await figure.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(async () => Number((await figure.getByText(/^Day \d/).textContent())!.replace(/[^\d.]/g, ''))).toBeGreaterThan(8);
  await figure.getByRole('button', { name: '❚❚ Pause' }).click();
  await figure.getByRole('button', { name: 'The inner three' }).click();
  expect(errors).toEqual([]);
});

test('gaps in the belt, and the snow line', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'small-worlds');
  const belt = figureByNumber(page, '8.4');
  await belt.scrollIntoViewIfNeeded();
  await belt.getByRole('button', { name: 'Show Jupiter’s resonances' }).click();
  await expect(caption(belt, /The gaps fall exactly where an asteroid would go round a whole number of times/)).toBeVisible();
  const chart = belt.getByRole('img', { name: /Histogram of the numbered asteroids/ });
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(caption(belt, /AU: [\d,]+ asteroids\. An orbit there takes/)).toBeVisible();
  await belt.getByRole('button', { name: 'Out to Jupiter' }).click();
  await belt.getByRole('button', { name: 'Log scale' }).click();
  await belt.getByRole('button', { name: 'How empty is it?' }).click();
  await expect(caption(belt, /A patch of the belt 50 million km square/)).toBeVisible();
  await expect(belt.getByText(/Typical gap to the nearest: 2\.7 million km/)).toBeVisible();

  const snow = figureByNumber(page, '8.5');
  await snow.scrollIntoViewIfNeeded();
  await expect(caption(snow, /At 5\.2 AU the disc is 123 K \(−150 °C\)\. Solid there: metal and rock, water ice\. Beyond the snow line \(2\.7 AU\)/)).toBeVisible();
  await snow.getByRole('slider', { name: 'Distance' }).fill('0');
  await expect(caption(snow, /At 1\.0 AU the disc is 280 K .*Inside the snow line/)).toBeVisible();
  await snow.getByRole('slider', { name: 'The star’s brightness' }).fill('0.6');
  await expect(caption(snow, /Inside the snow line \(5\.4 AU\)/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the 3 : 1 gap', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Move the marker to where an asteroid would go round the Sun exactly three times/ });
  const slider = question.getByRole('slider', { name: 'Distance from the Sun' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('2.8');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/That is too slow: move inward/)).toBeVisible();
  await slider.fill('2.5');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 8, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '8.1').getByRole('button', { name: 'True sizes' }).click();
      await figureByNumber(page, '8.2').getByRole('combobox', { name: 'Right' }).selectOption('saturn');
      await figureByNumber(page, '8.3').getByRole('button', { name: 'Run one lap of Ganymede' }).click();
      await figureByNumber(page, '8.4').getByRole('button', { name: 'Show Jupiter’s resonances' }).click();
      await figureByNumber(page, '8.5').getByRole('slider', { name: 'Distance' }).fill('1');
      expect(await accessibilityViolations(page)).toEqual([]);
      await figureByNumber(page, '8.4').getByRole('button', { name: 'How empty is it?' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
