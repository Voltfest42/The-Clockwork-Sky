import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[11];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Barcodes in starlight' })).toBeVisible();
}

test('Chapter 12 shows its sections, five figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['12.1', '12.2', '12.3', '12.4', '12.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Reading starlight' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('Kirchhoff’s three spectra: continuous, bright lines and dark lines', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'dark-lines-in-sunlight');
  const figure = figureByNumber(page, '12.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Looking at the lamp through the cooler cloud of hydrogen: the lamp’s continuous spectrum with dark lines/)).toBeVisible();
  await figure.getByRole('button', { name: 'Sodium' }).click();
  await figure.getByRole('button', { name: 'The cloud, from the side' }).click();
  await expect(
    caption(figure, 'Looking at the thin cloud of sodium against a dark background: bright lines, light at only a few wavelengths, the strongest at 589.0 nm and 589.6 nm. That pattern is sodium’s alone.'),
  ).toBeVisible();
  await figure.getByRole('button', { name: 'The lamp', exact: true }).click();
  await expect(caption(figure, /^Looking straight at the hot, dense lamp: a continuous spectrum/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('hydrogen’s ladder: Hα, Lyman α and absorption', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'atoms-as-ladders');
  const figure = figureByNumber(page, '12.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, 'The electron drops from level 3 to level 2 and the atom gives out a photon: 1.89 eV, 656 nm, visible. This is Hα, in the Balmer series.')).toBeVisible();
  await figure.getByRole('button', { name: 'Lyα: between levels 1 and 2' }).click();
  await expect(caption(figure, /10\.20 eV, 122 nm, ultraviolet, invisible to the eye\. This is Lyα, in the Lyman series\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Take in light (absorption)' }).click();
  await expect(caption(figure, /^An atom on level 1 takes in a photon and its electron climbs to level 2/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('make a spectrum: through the classes, without iron, and Payne’s curves', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-alphabet-of-the-stars');
  const figure = figureByNumber(page, '12.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 5,772 K, a G2 star on the main sequence\. The strongest lines: Ca II K.* Beside it: HD 13043, class G2 V/)).toBeVisible();
  await figure.getByRole('button', { name: 'A', exact: true }).click();
  await expect(caption(figure, /^At 9,500 K, an A0 star on the main sequence\. The strongest lines: Hα, Hβ, Hγ\. Beside it: HD 166283/)).toBeVisible();
  await figure.getByRole('button', { name: 'M', exact: true }).click();
  await expect(caption(figure, /Bands of titanium oxide/)).toBeVisible();
  await figure.getByRole('button', { name: 'Make the Sun without iron' }).click();
  await expect(caption(figure, /You have changed iron to none\. Beside it: HD 140283/)).toBeVisible();
  await figure.getByRole('button', { name: 'Payne’s curves' }).click();
  await expect(figure.getByRole('img', { name: /^Payne’s curves: hydrogen’s lines peak near 10,000 K/ })).toBeVisible();
  const slider = figure.getByRole('slider', { name: 'Temperature' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(caption(figure, /^At (39,9|40,0)\d\d K, an O/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('what the Sun is made of, by mass and by number', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'stars-are-made-of-hydrogen');
  const figure = figureByNumber(page, '12.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^By mass, a kilogram of Sun is 744 g of hydrogen, 242 g of helium and 14 g of everything else/)).toBeVisible();
  await figure.getByRole('button', { name: 'By number of atoms' }).click();
  await expect(caption(figure, /^By number, 92\.3% of the Sun’s atoms are hydrogen/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Doppler shifter: Barnard’s star, Aldebaran and a pair in orbit', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'starlights-speedometer');
  const figure = figureByNumber(page, '12.5');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The star isn’t moving towards us or away/)).toBeVisible();
  await figure.getByRole('button', { name: 'Barnard’s star' }).click();
  await expect(caption(figure, /^The star is moving 110\.5 km\/s towards us, so its lines are shifted to the blue/)).toBeVisible();
  await expect(figure.locator('b', { hasText: '588.778 nm' })).toBeVisible();
  await figure.getByRole('button', { name: 'Aldebaran' }).click();
  await expect(caption(figure, /^The star is moving 54\.3 km\/s away from us, so its lines are shifted to the red/)).toBeVisible();
  await figure.getByRole('button', { name: 'A pair of stars in orbit' }).click();
  await expect(caption(figure, /^Two stars circle each other every 4 days/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: where hydrogen’s lines are strongest', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /set the temperature where hydrogen’s lines/ });
  const slider = question.getByRole('slider', { name: 'Temperature' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Hotter: here few hydrogen atoms sit on the second rung/)).toBeVisible();
  await slider.fill('4');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/10,000 K, an A0 star: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 12, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '12.1').getByRole('button', { name: 'Neon' }).click();
      await figureByNumber(page, '12.2').getByRole('button', { name: 'Take in light (absorption)' }).click();
      await figureByNumber(page, '12.3').getByRole('button', { name: 'Payne’s curves' }).click();
      await figureByNumber(page, '12.4').getByRole('button', { name: 'By number of atoms' }).click();
      await figureByNumber(page, '12.5').getByRole('button', { name: 'Aldebaran' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
