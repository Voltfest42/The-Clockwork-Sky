import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[17];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'How stars die' })).toBeVisible();
}

test('Chapter 18 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['18.1', '18.2', '18.3', '18.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByText(/is PSR J0952−0607, at 2\.35 ± 0\.17 solar masses/)).toBeVisible();
  await expect(main.getByText(/the heaviest known from a star in the Galaxy is Gaia BH3, at 33 solar masses/)).toBeVisible();
  await expect(main.getByRole('region', { name: 'How stars die' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('white dwarfs as clocks: a white dwarf fades as it ages', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-gentle-end');
  const figure = figureByNumber(page, '18.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^A 0\.6 M☉ white dwarf, 1 billion years after it formed: 7,274 K/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Cooling for' }).fill('4');
  await expect(figure.getByText(/^A 0\.6 M☉ white dwarf, 10 billion years after it formed: 3,2\d\d K/)).toBeVisible();
  await figure.getByRole('button', { name: '1.2 M☉' }).click();
  await expect(figure.getByText(/^A 1\.2 M☉ white dwarf/)).toBeVisible();
  await expect(figure.getByText(/have been cooling for about 8\.8 billion years/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('dead stars to scale: zoom from Earth to a neutron star', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'neutron-stars');
  const figure = figureByNumber(page, '18.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /Sirius B, with the mass of the Sun, is a little smaller than Earth/)).toBeVisible();
  await figure.getByRole('button', { name: 'A neutron star and black holes' }).click();
  await expect(caption(figure, /a neutron star is about as wide as Manhattan is long/)).toBeVisible();
  await expect(figure.getByRole('img', { name: /A view 120 km across showing .*A neutron star \(24 km\)/ })).toBeVisible();
  await expect(figure.getByRole('table')).toContainText('1.9 billion tonnes');
  await expect(figure.getByRole('table')).toContainText('14 tonnes');
  expect(errors).toEqual([]);
});

test('weigh the invisible companion: Gaia BH1 is a black hole, a white dwarf is not', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'finding-black-holes');
  const figure = figureByNumber(page, '18.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/a swing of 67\.1 km\/s/)).toBeVisible();
  await expect(figure.getByText(/It must be a black hole\./)).toBeVisible();
  await figure.getByRole('button', { name: 'A white-dwarf companion' }).click();
  await expect(figure.getByText(/light enough to be a faint star or a white dwarf/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Hidden companion’s mass' }).fill('1');
  await expect(figure.getByText(/It must be a black hole\./)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the fork in the road: fates by mass, metals and winds', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-fork-in-the-road');
  const figure = figureByNumber(page, '18.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/^A star of 1 M☉ ends as a carbon–oxygen white dwarf of 0\.52 M☉\./)).toBeVisible();
  await expect(caption(figure, /neutron stars from about 7\.\d+ M☉, black holes from about 2\d M☉/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Mass at birth' }).fill('1.398');
  await expect(figure.getByText(/^A star of 25 M☉ ends as a black hole/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Mass at birth' }).fill('-1.5');
  await expect(figure.getByText(/ends as a brown dwarf\. It never fuses hydrogen for long/)).toBeVisible();
  await figure.getByRole('button', { name: 'Almost none (Z = 0.0001)' }).click();
  await figure.getByRole('button', { name: 'A fifth' }).click();
  await figure.getByRole('slider', { name: 'Mass at birth' }).fill('2.176');
  await expect(figure.getByText(/pair instability to make it pulse and shed mass/)).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});

test('the interactive question: the lightest star that leaves a neutron star', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /the lightest star that leaves a neutron star/ });
  const mass = question.getByRole('slider', { name: 'Mass at birth' });
  await mass.scrollIntoViewIfNeeded();
  await mass.fill('6');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/6\.0 M☉: it ends as a carbon–oxygen white dwarf/)).toBeVisible();
  await mass.fill('8.2');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/8\.2 M☉: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 18, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '18.1').getByRole('button', { name: '0.8 M☉' }).click();
      await figureByNumber(page, '18.2').getByRole('button', { name: 'A neutron star and black holes' }).click();
      await figureByNumber(page, '18.3').getByRole('button', { name: 'Cygnus X-1' }).click();
      await figureByNumber(page, '18.4').getByRole('button', { name: 'Poor (0.001)' }).click();
      await expect(caption(figureByNumber(page, '18.4'), /With few metals/)).toBeVisible({ timeout: 15000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
