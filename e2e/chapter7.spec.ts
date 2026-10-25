import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[6];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Newton’s gravity' })).toBeVisible();
}

test('Chapter 7 shows its sections, six figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Solving by stepping' }).first()).toHaveAttribute('href', '/toolkit/solving-by-stepping/');
  await expect(main.getByRole('region', { name: 'From Newton to the space age' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('Newton’s cannon: falling back, orbiting and escaping', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const cannon = figureByNumber(page, '7.1');
  await cannon.scrollIntoViewIfNeeded();
  await cannon.getByRole('slider', { name: 'Speed' }).fill('4');
  await cannon.getByRole('button', { name: 'Fire at 4.0 km/s' }).click();
  await expect(caption(cannon, /At 4\.0 km\/s the ball falls back to the ground 6\d\d km away/)).toBeVisible();
  await cannon.getByRole('button', { name: '7.9 km/s' }).click();
  await expect(caption(cannon, /falls all the way round: it is in orbit, going round every 1 hour 28 minutes/)).toBeVisible();
  await expect(cannon.getByText(/after firing · \d+ km up/)).toBeVisible();
  await cannon.getByRole('button', { name: '11.2 km/s' }).click();
  await expect(caption(cannon, /escapes/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('step by step: the orbit runs in the n-body worker @cross', async ({ page }) => {
  const errors = watchErrors(page);
  const workers: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));
  await openChapter(page, 'orbits-one-step-at-a-time');
  const stepping = figureByNumber(page, '7.2');
  await stepping.scrollIntoViewIfNeeded();
  await expect(caption(stepping, /Press Play, or One step, to compute the orbit with Euler’s method in steps of 6\.1 days/)).toBeVisible();
  await stepping.getByRole('button', { name: '▶ Play' }).click();
  await expect(caption(stepping, /Euler’s method gains energy on every step/)).toBeVisible();
  await expect.poll(async () => Number((await stepping.getByText(/^Steps taken:/).innerText()).replace(/\D/g, ''))).toBeGreaterThan(20);
  expect(workers.some((url) => url.includes('nbody'))).toBe(true);

  await stepping.getByRole('button', { name: 'RK4' }).click();
  await stepping.getByRole('slider', { name: 'Steps an orbit' }).fill('1');
  await stepping.getByRole('button', { name: 'One step' }).click();
  await expect(stepping.getByText('Steps taken: 1')).toBeVisible();
  await expect(stepping.getByText('Pulls worked out: 4')).toBeVisible();
  await expect(stepping.locator('svg[role="img"] circle[stroke="#f28cb1"]')).toHaveCount(4);
  await stepping.getByRole('button', { name: 'Leapfrog' }).click();
  await stepping.getByRole('button', { name: '▶ Play' }).click();
  await expect(caption(stepping, /Leapfrog’s energy error rises and falls/)).toBeVisible();
  await expect(stepping.getByRole('img', { name: /Energy error over 20 orbits with 12 steps an orbit/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the cosmic scale weighs Earth with the Moon’s orbit', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'weighing-the-sun');
  const scale = figureByNumber(page, '7.3');
  await scale.scrollIntoViewIfNeeded();
  await scale.getByRole('slider', { name: 'Ruler' }).fill('384400');
  await expect(scale.getByRole('img', { name: /on the orbit/ })).toBeVisible();
  await scale.getByRole('button', { name: '⏱ Start the stopwatch' }).click();
  await page.waitForTimeout(3_000);
  await scale.getByRole('button', { name: '⏱ Stop the stopwatch' }).click();
  // Stopped after about half a lap, so the period is about half the true one and the mass about four times too big.
  await expect(caption(scale, /From your measurements, Earth weighs \d\.\d\d × 10²[⁴⁵] kg/)).toBeVisible();
  await expect(scale.getByText(/Accurate value: 6\.05 × 10²⁴ kg, Earth plus the Moon/)).toBeVisible();
  await scale.getByRole('button', { name: 'Jupiter and Io' }).click();
  await expect(scale.getByText(/Accurate value: 1\.90 × 10²⁷ kg/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the barycentre, the tides and the trip to Mars', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'both-bodies-move');
  const balance = figureByNumber(page, '7.4');
  await balance.scrollIntoViewIfNeeded();
  await expect(caption(balance, /4,6\d\d km from Earth’s centre: inside Earth/)).toBeVisible();
  await balance.getByRole('button', { name: 'Pluto and Charon' }).click();
  await expect(caption(balance, /outside Pluto/)).toBeVisible();
  await balance.getByRole('button', { name: 'Sun and Jupiter' }).click();
  await expect(caption(balance, /outside the Sun, 1\.07 times its radius out/)).toBeVisible();
  await expect(balance.getByText(/The Sun wobbles at 12\.\d m\/s/)).toBeVisible();
  await balance.getByRole('slider', { name: 'Mass ratio' }).fill('0');
  await expect(caption(balance, /exactly halfway/)).toBeVisible();

  const tides = figureByNumber(page, '7.5');
  await tides.scrollIntoViewIfNeeded();
  await expect(caption(tides, /pulls the near side of Earth harder than the centre/)).toBeVisible();
  await tides.getByRole('button', { name: 'Minus the average' }).click();
  await expect(caption(tides, /Two bulges, so two high tides a day/)).toBeVisible();
  await tides.getByRole('button', { name: 'Add the Sun' }).click();
  await expect(caption(tides, /Spring tides/)).toBeVisible();
  await tides.getByRole('slider', { name: 'Days after new Moon' }).fill('7.4');
  await expect(caption(tides, /Neap tides/)).toBeVisible();
  await expect(tides.getByText(/High to low water: 0\.29 m \(neap tide\)/)).toBeVisible();
  await tides.getByRole('slider', { name: 'Hours' }).fill('6.2');
  await expect(tides.getByText(/Harbour: −0\.\d\d m · 6 h 1\d min/)).toBeVisible();

  const mars = figureByNumber(page, '7.6');
  await mars.scrollIntoViewIfNeeded();
  await mars.getByRole('button', { name: 'Go to the next window' }).click();
  await expect(mars.getByText(/Mars 44° ahead of Earth/)).toBeVisible();
  await mars.getByRole('button', { name: '🚀 Launch now' }).click();
  await expect(caption(mars, /Arrived after 259 days, and Mars is there/)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('the interactive question: a speed for orbit', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Set the cannon’s speed so that the ball goes into orbit/ });
  const slider = question.getByRole('slider', { name: 'Speed' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('6');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/the ground doesn’t curve away fast enough/)).toBeVisible();
  await slider.fill('9');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

test('Toolkit T4: solving by stepping', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/solving-by-stepping/');
  await expect(page.getByRole('heading', { level: 1, name: 'Solving by stepping' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Height, stepped');
  const figure = figureByNumber(page, 'T4.1');
  await expect(caption(figure, /Euler’s method uses the speed at the start of each step/)).toBeVisible();
  await figure.getByRole('button', { name: 'Leapfrog' }).click();
  await expect(caption(figure, /The swings stay the same size for ever/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Steps a swing' }).fill('0');
  await expect(figure.getByRole('img', { name: /Leapfrog with 8 steps a swing/ })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 7 and Toolkit T4, with every figure in use, pass the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '7.1').getByRole('button', { name: '7.9 km/s' }).click();
      await figureByNumber(page, '7.2').getByRole('button', { name: 'One step' }).click();
      await figureByNumber(page, '7.4').getByRole('button', { name: 'Pluto and Charon' }).click();
      const tides = figureByNumber(page, '7.5');
      await tides.getByRole('button', { name: 'Show the bulges' }).click();
      await tides.getByRole('button', { name: 'Add the Sun' }).click();
      await figureByNumber(page, '7.6').getByRole('button', { name: 'Go to the next window' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);

      await page.goto('/toolkit/solving-by-stepping/');
      await figureByNumber(page, 'T4.1').getByRole('button', { name: 'RK4' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
