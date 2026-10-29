import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

const chapter = CHAPTERS[9];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Light, the messenger' })).toBeVisible();
}

test('Chapter 10 shows its sections, four figures and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['10.1', '10.2', '10.3', '10.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Catching light' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the spectrum ruler: buttons, the marker by keyboard, and what each band shows', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const figure = figureByNumber(page, '10.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, '550 nm: visible light (green), at 545 THz. Each photon carries 2.25 eV, and a body at 5,269 K glows brightest here.')).toBeVisible();
  await figure.getByRole('button', { name: 'Hydrogen’s 21 cm' }).click();
  await expect(caption(figure, /^21\.1 cm: radio, at 1\.42 GHz\. Each photon carries 5\.8\d µeV, and a body at 0\.014 K glows brightest here\.$/)).toBeVisible();
  const marker = figure.getByRole('slider', { name: 'Wavelength' });
  await marker.focus();
  await page.keyboard.press('Home');
  await expect(caption(figure, /^1 pm: gamma rays/)).toBeVisible();
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await expect(caption(figure, /^100 pm: x-rays/)).toBeVisible();
  await figure.getByRole('button', { name: 'What makes it' }).click();
  await expect(figure.getByText(/hospital X-ray tube/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('counting photons: a time-lapse exposure, and JWST on a faint galaxy', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'light-comes-in-packets');
  const figure = figureByNumber(page, '10.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^In 0\.1 s, your eye caught \d+ photons from a star at the eye’s limit/)).toBeVisible();
  await figure.getByRole('button', { name: '▶ Take the exposure' }).click();
  await expect(caption(figure, /^In 0\.1 s, your eye caught \d+ photons/)).toBeVisible({ timeout: 10_000 });
  await figure.getByRole('button', { name: 'JWST' }).click();
  await figure.getByRole('combobox', { name: 'Star' }).selectOption({ label: 'a distant galaxy (magnitude 24)' });
  await figure.getByRole('slider', { name: 'Exposure' }).fill('3');
  await expect(caption(figure, /^In 16 min 40 s, JWST caught [\d,]+ photons from a distant galaxy/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('how far down light gets: X-rays need a rocket, visible light reaches the ground', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'why-some-light-never-reaches-the-ground');
  const figure = figureByNumber(page, '10.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, '1 nm (x-rays) is absorbed about 75 km up. To see it, your telescope must go on a rocket, briefly (100 km and up).')).toBeVisible();
  const marker = figure.getByRole('slider', { name: 'Wavelength' });
  await marker.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('PageUp');
  await expect(caption(figure, /^1 µm \(infrared\) reaches the ground/)).toBeVisible();
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await expect(caption(figure, /^100 µm \(infrared\) is absorbed about 13 km up\. To see it, your telescope must go on an aircraft/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('split the stars: a wider telescope splits ε¹ Lyrae, and the air’s blur', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'sharper-eyes');
  const figure = figureByNumber(page, '10.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^ε¹ Lyrae in \d{4}: ε¹ Lyrae A and ε¹ Lyrae B are 2\.0″ apart\. A 3\.0 cm telescope at 550 nm blurs each star to about 4\.6″: not split: one blob\.$/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Telescope width' }).fill('-1');
  await expect(caption(figure, /A 10 cm telescope .*: split: you see two stars\.$/)).toBeVisible();
  await figure.getByRole('button', { name: 'A poor night (2″)' }).click();
  await expect(caption(figure, /and the air to 2\.0″: not split: one blob\.$/)).toBeVisible();
  await figure.getByRole('button', { name: 'Sirius', exact: true }).click();
  await figure.getByRole('button', { name: 'No air (space)' }).click();
  await expect(caption(figure, /^Sirius in \d{4}: Sirius A and Sirius B are 1\d\.\d″ apart|^Sirius in \d{4}: Sirius A and Sirius B are \d+″ apart/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the smallest telescope that splits ε¹ Lyrae', async ({ page }) => {
  await openChapter(page);
  const question = page.getByRole('group', { name: /find the smallest telescope that splits ε¹ Lyrae/ });
  const slider = question.getByRole('slider', { name: 'Telescope width' });
  await expect(slider).toBeAttached();
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('-1.522');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/the stars merge\. Try a wider telescope/)).toBeVisible();
  await slider.fill('-1.13');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 10, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await figureByNumber(page, '10.1').getByRole('button', { name: 'You' }).click();
      await figureByNumber(page, '10.2').getByRole('button', { name: 'Hubble' }).click();
      await figureByNumber(page, '10.4').getByRole('button', { name: 'Castor' }).click();
      await figureByNumber(page, '10.4').getByRole('button', { name: 'Adaptive optics' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
