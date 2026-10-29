import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[13];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Weighing the stars' })).toBeVisible();
}

test('Chapter 14 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['14.1', '14.2', '14.3', '14.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Stars in pairs' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the orbit: weigh Sirius from its orbit on the sky', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'stars-in-pairs');
  const figure = figureByNumber(page, '14.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Your pair, year 4\.0 of 40: the stars are [\d.]+ AU apart/)).toBeVisible();
  await figure.getByRole('button', { name: 'Sirius' }).click();
  await expect(figure.getByText(/Together the stars weigh 19\.8³ ÷ 50\.1² = 3\.08 Suns/)).toBeVisible();
  await expect(figure.getByText(/so Sirius A is 2\.03 times as heavy: 2\.06 and 1\.02 Suns/)).toBeVisible();
  const time = figure.getByRole('slider', { name: 'Time' });
  await time.focus();
  await page.keyboard.press('End');
  await expect(caption(figure, /^Sirius, year 50\.1 of 50\.1: the stars are [\d.]+ AU apart, near their closest/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Star 1’s mass' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(caption(figure, /^Your pair/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 14.1' }).click();
  await expect(caption(figure, /^Your pair, year 4\.0 of 40/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('velocities: move the cursor by keyboard, then fit β Aurigae', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'weighing-with-the-doppler-effect');
  const figure = figureByNumber(page, '14.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Phase 0\.15: star 1 is /)).toBeVisible();
  const chart = figure.getByRole('slider', { name: /Velocity curves of both stars/ });
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(caption(figure, /^Phase 0\.16: /)).toBeVisible();
  await figure.getByRole('slider', { name: 'Tilt' }).focus();
  await page.keyboard.press('Home');
  await expect(caption(figure, /^Face-on, the stars move across our view/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fit β Aurigae’s velocities' }).click();
  await expect(caption(figure, /^Match the two curves to the measurements: the misfit is \d+\.\d per measurement/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fit for me' }).click();
  await expect(figure.getByText(/^\d\.\d\d$/).first()).toBeVisible();
  await expect(figure.getByText('(as good as the errors allow)')).toBeVisible();
  await expect(figure.getByText(/With the tilt from the eclipses, 76°: 2\.\d\d and 2\.\d\d M☉ \(DEBCat: 2\.38 and 2\.29\)/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('eclipses: tilt the pair, then fit β Aurigae’s light curve', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'eclipses-give-sizes');
  const figure = figureByNumber(page, '14.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The deepest dip takes away 39% of the pair’s light\. Star 1 gives 88% of the light/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Tilt' }).focus();
  await page.keyboard.press('Home');
  await expect(caption(figure, /^No eclipses: tilted 60° from face-on.* They start to eclipse at 79\.0°\./)).toBeVisible();
  await figure.getByRole('button', { name: 'CM Draconis' }).click();
  await expect(caption(figure, /^The deepest dip takes away \d+% of the pair’s light/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fit β Aurigae’s eclipses' }).click();
  await expect(caption(figure, /^Your radii, 2\.00 and 2\.00 R☉, at a tilt of 80\.0°/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fit for me' }).click();
  await expect(figure.getByText(/^Radii 2\.\d\d ± 0\.\d\d and 2\.\d\d ± 0\.\d\d R☉, tilt 76\.\d ± 0\.\d°\. DEBCat: 2\.76 ± 0\.02 and 2\.57 ± 0\.02 R☉\.$/)).toBeVisible();
  await expect(figure.getByText('(as good as the scatter allows)')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the mass–luminosity relation: fit the slopes, then radius', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'heavier-means-brighter');
  const figure = figureByNumber(page, '14.4');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: '0.7 to 2 Suns' }).click();
  await expect(caption(figure, /^On a log–log plot .* The best slope for stars 0\.7 to 2 Suns is 3\.9: twice the mass, 15 times the light\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Above 10 Suns' }).click();
  await expect(caption(figure, /flatter than in the middle/)).toBeVisible();
  await figure.getByRole('button', { name: 'Radius' }).click();
  await expect(caption(figure, /^Radius grows more slowly than mass/)).toBeVisible();
  const line = figure.getByRole('slider', { name: /Your line/ });
  await line.focus();
  await page.keyboard.press('Home');
  await expect(figure.getByText(/twice the mass gives 1\.0 times the width/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the tilt where eclipses begin', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Tilt the orbit until the stars just begin to eclipse/ });
  const tilt = question.getByRole('slider', { name: 'Tilt' });
  await tilt.scrollIntoViewIfNeeded();
  await tilt.fill('75');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/75\.0°: no eclipses yet/)).toBeVisible();
  await tilt.fill('79.2');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/79\.2°: right, the eclipses begin at 79\.0°/)).toBeVisible();
});

test('Toolkit T6: find the signal, and the false alarms', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/measurements-and-uncertainty/');
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Measurements and uncertainty' })).toBeVisible();
  const figure = figureByNumber(page, 'T6.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Sixty days of measurements/)).toBeVisible();
  await figure.getByRole('button', { name: '3 hours' }).click();
  await expect(figure.getByText(/An average of 6: ±0\.1\d%/)).toBeVisible();
  await figure.getByRole('button', { name: 'Search every period' }).click();
  await expect(caption(figure, /^The search finds a dip every 4\.29 days, 10σ out of the noise/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fold at the peak' }).click();
  await expect(figure.getByRole('slider', { name: 'Fold at a period of' })).toHaveAttribute('aria-valuetext', /^4\.29\d days$/);
  await figure.getByRole('button', { name: 'Noise alone' }).click();
  await expect(caption(figure, /^Noise alone, and still the highest of 1,500 trials stands out by 4\.9σ/)).toBeVisible();
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 14, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '14.1').getByRole('button', { name: 'α Centauri' }).click();
      await figureByNumber(page, '14.2').getByRole('button', { name: 'Fit β Aurigae’s velocities' }).click();
      await figureByNumber(page, '14.3').getByRole('button', { name: 'Fit β Aurigae’s eclipses' }).click();
      await figureByNumber(page, '14.4').getByRole('button', { name: '2 to 10 Suns' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('Toolkit T6 passes the accessibility checks', async ({ page }) => {
      await page.goto('/toolkit/measurements-and-uncertainty/');
      const figure = figureByNumber(page, 'T6.1');
      await figure.getByRole('button', { name: '1 hour' }).click();
      await figure.getByRole('button', { name: 'Search every period' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
