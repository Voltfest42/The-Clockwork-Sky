import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[10];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Colour is temperature' })).toBeVisible();
}

test('Chapter 11 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['11.1', '11.2', '11.3', '11.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Light and heat' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the blackbody explorer: predict first, then glows from you to a white dwarf', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '11.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, 'At 5,772 K the glow peaks at 502 nm and it looks white, faintly warm. Each square metre gives out 63 MW, 37% of it as visible light.')).toBeVisible();
  await figure.getByRole('radio', { name: 'The blue star' }).check();
  await figure.getByRole('button', { name: 'Check, and show Rigel' }).click();
  await expect(figure.getByText('✓ Right.')).toBeVisible();
  await expect(caption(figure, /^At 12,100 K the glow peaks at 239 nm and it looks bluish white/)).toBeVisible();
  await figure.getByRole('button', { name: 'You', exact: true }).click();
  await expect(caption(figure, /^At 310 K the glow peaks at 9\.35 µm and it gives out no visible light to speak of, only infrared/)).toBeVisible();
  await expect(figure.getByText(/off the chart to the right, in the infrared: try the log axes/)).toBeVisible();
  await figure.getByRole('button', { name: 'Log axes' }).click();
  await expect(figure.getByText(/off the chart/)).toHaveCount(0);
  const slider = figure.getByRole('slider', { name: 'Temperature' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(caption(figure, /^At 100,000 K the glow peaks at 29 nm/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('two filters: stars on the colour scale, and no green stars', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-thermometer-made-of-two-filters');
  const figure = figureByNumber(page, '11.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 5,772 K the spectrum peaks at 502 nm, and B − V = \+0\.64: redder than Vega/)).toBeVisible();
  await figure.getByRole('button', { name: 'Betelgeuse' }).click();
  await expect(caption(figure, /^At 3,600 K the spectrum peaks at 805 nm|^At 3,600 K the spectrum peaks in the infrared, beyond V/)).toBeVisible();
  await expect(caption(figure, /Betelgeuse, at about this temperature, measures \+1\.85\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Peak in the green' }).click();
  await expect(caption(figure, /in the green, but it is broad: .* No star can look green\./)).toBeVisible();
  expect(errors).toEqual([]);
});

test('size, temperature, power: Betelgeuse, Sirius B and the map', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'hotter-is-far-brighter');
  const figure = figureByNumber(page, '11.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Betelgeuse: 760 times the Sun’s radius at 3,600 K, giving out 88,000 times the Sun’s power\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Sirius B' }).click();
  await expect(caption(figure, /^Sirius B: 0\.0081 times the Sun’s radius at 25,000 K, giving out 0\.023 times the Sun’s power\./)).toBeVisible();
  await figure.getByRole('combobox', { name: 'Compare with' }).selectOption({ label: 'Betelgeuse' });
  await expect(caption(figure, /Against Betelgeuse:/)).toBeVisible();
  const radius = figure.getByRole('slider', { name: 'Radius' });
  await radius.focus();
  await page.keyboard.press('Home');
  await expect(caption(figure, /^Your star: 0\.005 times the Sun’s radius/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the inverse-square law: a quarter at twice the distance, and the Sun’s power', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'how-bright-it-looks-and-how-bright-it-is');
  const figure = figureByNumber(page, '11.4');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('slider', { name: 'Detector’s distance' }).fill('2');
  await expect(caption(figure, 'At 2.00 units the same detector catches 1/4.00 = 25.0% of the light it catches at 1 unit: the light is spread over 4.00 times the area.')).toBeVisible();
  await expect(figure.getByRole('img', { name: /Sunlight at each planet: Mercury 9,08\d watts per square metre/ })).toBeVisible();
  await figure.getByRole('button', { name: 'Weigh the Sun’s power' }).click();
  await expect(caption(figure, /^The Sun’s power, from sunlight at Earth and the inverse-square law: 3\.83 × 10²⁶ watts\.$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: as luminous as the Sun at half its temperature', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /Make a star exactly as luminous as the Sun/ });
  const temperature = question.getByRole('slider', { name: 'Temperature' });
  await expect(temperature).toBeAttached();
  await temperature.scrollIntoViewIfNeeded();
  await temperature.fill('2890');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Too dim: make it bigger/)).toBeVisible();
  await question.getByRole('slider', { name: 'Radius' }).fill('0.602');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

test('Toolkit T5: the magnitude ladder compares any two things', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/logarithms-and-magnitudes/');
  await expect(page.getByRole('heading', { level: 1, name: 'Logarithms and magnitudes' })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Chapter 11, Colour is temperature' })).toBeVisible();
  const figure = figureByNumber(page, 'T5.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, 'Vega (magnitude 0.03) is 5.97 magnitudes brighter than the faintest stars the eye sees (6): 100 × 2.512^0.97 = 244 times as bright.')).toBeVisible();
  await figure.getByRole('combobox', { name: 'Compare' }).selectOption({ label: 'The Sun (−26.74)' });
  await figure.getByRole('combobox', { name: 'with' }).selectOption({ label: 'The full Moon (−12.7)' });
  await expect(caption(figure, /^The Sun \(magnitude −26\.74\) is 14\.04 magnitudes brighter than the full Moon \(−12\.7\): 100² × 2\.512\^4\.04 = [\d,]+ times as bright\.$/)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 11, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '11.1').getByRole('button', { name: 'Log axes' }).click();
      await figureByNumber(page, '11.2').getByRole('button', { name: 'Rigel' }).click();
      await figureByNumber(page, '11.3').getByRole('button', { name: 'Antares' }).click();
      await figureByNumber(page, '11.4').getByRole('button', { name: 'Weigh the Sun’s power' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('Toolkit T5 passes the accessibility checks', async ({ page }) => {
      await page.goto('/toolkit/logarithms-and-magnitudes/');
      await figureByNumber(page, 'T5.1').getByRole('combobox', { name: 'with' }).selectOption({ label: 'Pluto (14.4)' });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
