import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { CENSUS } from '../src/data/exoplanets';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[18];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Other worlds' })).toBeVisible();
}

test('Chapter 19 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['19.1', '19.2', '19.3', '19.4', '19.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByText(new RegExp(`as of ${CENSUS.asOf} the count of confirmed`))).toContainText(`is ${CENSUS.count.toLocaleString('en-GB')}. Almost none`);
  await expect(main.getByText(new RegExp(`${CENSUS.tess.toLocaleString('en-GB')} confirmed as of ${CENSUS.asOf}`))).toBeVisible();
  await expect(main.getByRole('link', { name: 'the Orrery' })).toHaveAttribute('href', '/orrery/?preset=kepler-16');
  await expect(main.getByRole('region', { name: 'Other worlds' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('find the planet: 51 Pegasi b by its wobble, an Earth twin lost, an Earth round a red dwarf found', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-wobble-in-pegasus');
  const figure = figureByNumber(page, '19.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/the planet swings its star by 58\.\d m\/s/)).toBeVisible();
  await expect(figure.getByText(/none\. The orbit is tilted 10\.00° from edge-on/)).toBeVisible();
  await expect(caption(figure, /The wobble stands out at 1\d\.\dσ, so the planet is found/)).toBeVisible();
  await figure.getByRole('button', { name: 'Folded at the planet’s period' }).click();
  await expect(figure.getByRole('img', { name: /The star’s velocity, folded at the planet’s period/ })).toBeVisible();
  await figure.getByRole('button', { name: 'An Earth twin' }).click();
  await expect(caption(figure, /Neither signal stands out yet/)).toBeVisible();
  await expect(figure.getByText(/swings its star by 8\.\d cm\/s/)).toBeVisible();
  await figure.getByRole('button', { name: 'An Earth round a red dwarf' }).click();
  await expect(caption(figure, /The transit stands out at \d+\.\dσ/)).toBeVisible();
  // Tilting the orbit away from edge-on loses the transit.
  await figure.getByRole('slider', { name: 'Tilt (90° is edge-on)' }).fill('85');
  await expect(figure.getByText(/none\. The orbit is tilted 5\.00° from edge-on/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('a transit up close: a rounded dip, a grazing V, and the odds of lining up', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'shadows');
  const figure = figureByNumber(page, '19.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The dip is 1\.\d\d% deep and \d\.\d hours long, rounded at the bottom/)).toBeVisible();
  await figure.getByRole('button', { name: 'Limb darkening' }).click();
  await expect(caption(figure, /flat at the bottom because the star is evenly bright/)).toBeVisible();
  await figure.getByRole('slider', { name: /Crosses at/ }).fill('1.05');
  await expect(caption(figure, /^A grazing transit/)).toBeVisible();
  await figure.getByRole('slider', { name: /Crosses at/ }).fill('1.3');
  await expect(caption(figure, /no transit at all/)).toBeVisible();
  await expect(figure.getByText(/transits 0\.47% of the time: one in 215/)).toBeVisible();
  await figure.getByRole('button', { name: 'Earth' }).click();
  await figure.getByRole('slider', { name: /Crosses at/ }).fill('0');
  await expect(figure.getByText(/Depth: 84 ppm/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the census: pick planets by click, buttons and keys, and run it back to 1994', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'what-weve-found');
  const figure = figureByNumber(page, '19.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(new RegExp(`Found by ${CENSUS.asOf}: ${CENSUS.count.toLocaleString('en-GB')}`))).toBeVisible();
  await expect(figure.getByText('51 Peg b', { exact: true }).last()).toBeVisible();
  await expect(figure.getByText(/1995, by radial velocity/)).toBeVisible();
  await figure.getByRole('button', { name: 'Kepler-16 b' }).click();
  await expect(figure.getByText(/it orbits a pair of stars/)).toBeVisible();
  const plot = figure.getByRole('application');
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect(figure.getByRole('button', { name: 'Kepler-16 b' })).toHaveAttribute('aria-pressed', 'false');
  await figure.getByRole('button', { name: '51 Peg b' }).click();
  await figure.getByRole('button', { name: 'Size' }).click();
  await expect(figure.getByText(/Not on the plot: its size hasn’t been measured/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Found by' }).fill('1994');
  await expect(caption(figure, /^By the end of 1994: 3 planets, all round a pulsar/)).toBeVisible();
  // A click on the plot picks the nearest planet.
  await figure.getByRole('button', { name: 'Mass' }).click();
  await figure.getByRole('slider', { name: 'Found by' }).fill('2026');
  const box = (await plot.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.45);
  await expect(figure.getByRole('button', { name: '51 Peg b' })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('habitable zones: the Sun’s, TRAPPIST-1’s, and the Sun’s moving outward', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'where-water-could-be-liquid');
  const figure = figureByNumber(page, '19.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The Sun today: its zone runs from 0\.95 to 1\.68 AU/)).toBeVisible();
  await expect(figure.getByRole('listitem').filter({ hasText: /^Venus, 0\.72 AU/ })).toContainText('too hot');
  await figure.getByRole('slider', { name: 'The Sun’s age' }).fill('10000');
  await expect(caption(figure, /its zone has moved out past Earth/)).toBeVisible();
  await figure.getByRole('button', { name: 'TRAPPIST-1' }).click();
  await expect(caption(figure, /with e, f, g in it/)).toBeVisible();
  await figure.getByRole('button', { name: 'Any star' }).click();
  await figure.getByRole('slider', { name: /Star’s temperature/ }).fill('3000');
  await expect(caption(figure, /so close that a planet there/)).toBeVisible();
  await figure.getByRole('button', { name: 'Every known planet' }).click();
  await expect(caption(figure, /^Every known planet with a measured orbit/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /known planets by the starlight they receive/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('starlight through an atmosphere: a hot Jupiter’s bands, clouds, and Earth’s tiny ones', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'reading-other-worlds-air');
  const figure = figureByNumber(page, '19.5');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /stand out by about [\d,]+ parts per million: easy for JWST/)).toBeVisible();
  await figure.getByRole('button', { name: 'High clouds' }).click();
  await expect(caption(figure, /^High clouds hide the air below them/)).toBeVisible();
  await figure.getByRole('button', { name: 'Earth, seen across the Sun' }).click();
  await expect(caption(figure, /far too little to measure/)).toBeVisible();
  await figure.getByRole('button', { name: 'Water' }).click();
  await figure.getByRole('button', { name: 'Carbon dioxide' }).click();
  await expect(caption(figure, /only the slope of scattered blue light is left/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: make an Earth twin detectable', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /an Earth twin orbits a Sun-like star/ });
  const light = question.getByRole('slider', { name: 'Light precision' });
  await light.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Neither reaches 7\.1σ\. Only one transit falls/)).toBeVisible();
  await light.fill('2');
  await question.getByRole('slider', { name: 'Nights watched' }).fill('3.16');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/found by its transit/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 19, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '19.1').getByRole('button', { name: 'HD 209458 b' }).click();
      await figureByNumber(page, '19.1').getByRole('button', { name: 'Folded at the planet’s period' }).click();
      await figureByNumber(page, '19.2').getByRole('button', { name: 'Neptune' }).click();
      await figureByNumber(page, '19.3').getByRole('button', { name: 'TRAPPIST-1 e' }).click();
      await figureByNumber(page, '19.4').getByRole('button', { name: 'Proxima Centauri' }).click();
      await figureByNumber(page, '19.5').getByRole('button', { name: /A sub-Neptune/ }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
