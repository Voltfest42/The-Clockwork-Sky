import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[28];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Ripples in spacetime' })).toBeVisible();
}

test('Chapter 29 shows its sections, five figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['29.1', '29.2', '29.3', '29.4', '29.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Listening to gravity' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the shrinking orbit: the Hulse–Taylor pulsar, its last seconds, and other pairs', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-clock-in-orbit');
  await waitForHydration(page);
  const figure = figureByNumber(page, '29.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The Hulse–Taylor pulsar: .* shorten the period by 2\.4 × 10⁻¹² seconds every second, 75\.8 µs a year; measured, 0\.9983 ± 0\.0016 of that\. They will merge in 301 million years\. Today: /)).toBeVisible();
  await figure.getByRole('slider', { name: 'Time left before they merge' }).fill('0.9');
  await expect(caption(figure, /With 40 seconds left: 327 km apart, .* eccentricity under 0\.001, waves at 32\.9 Hz\./)).toBeVisible();
  await figure.getByRole('button', { name: 'The double pulsar' }).click();
  await expect(caption(figure, /^The double pulsar: .* They will merge in 86 million years\./)).toBeVisible();
  await figure.getByRole('button', { name: 'The Sun and Jupiter' }).click();
  await expect(caption(figure, /They will merge in 2\.4 × 10²³ years\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 29.1' }).click();
  await expect(caption(figure, /^The Hulse–Taylor pulsar/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('stretch and squeeze: plus, cross, and a detector that can’t hear', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'what-a-gravitational-wave-is');
  await waitForHydration(page);
  const figure = figureByNumber(page, '29.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The plus polarisation stretches the ring .* differ by up to 100% .* the light at the output is 100% of its brightest\./)).toBeVisible();
  await figure.getByRole('slider', { name: 'Detector turned by' }).fill('45');
  await expect(caption(figure, /turned 45° .* don’t change at all/)).toBeVisible();
  await figure.getByRole('button', { name: 'Cross (×)' }).click();
  await expect(caption(figure, /^The cross polarisation .* turned 45° .* differ by up to 100%/)).toBeVisible();
  await figure.getByRole('button', { name: 'Let the wave pass' }).click();
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible();
  await figure.getByRole('button', { name: 'Pause' }).click();
  await expect(figure.getByText(/about 1\/840 of a proton’s width/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('make a chirp: GW150914 fitted to LIGO’s data, neutron stars, and sound on a click', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-chirp');
  await waitForHydration(page);
  const figure = figureByNumber(page, '29.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^35\.6 and 30\.6 M☉ at the source, 440 Mpc away\. The chirp mass is 28\.7 M☉ \(31\.3 M☉ as the waves reach us, stretched 9% on the way\)\. .* rings at 24\d Hz, .* The black hole left has 63\.0 M☉, spinning at 0\.68 .* 3\.2 M☉ went into waves\. Fitted to GW150914’s data, its overlap with them is 0\.6\d at Hanford and 0\.\d\d at Livingston\./)).toBeVisible();
  await figure.getByRole('button', { name: 'GW150914 at Hanford' }).click();
  await expect(figure.getByRole('img', { name: /^Spectrogram of Hanford’s whitened data/ })).toBeVisible();
  // Sound only on a click: the button turns to Stop while it plays, and back when it ends
  await figure.getByRole('button', { name: 'Play the chirp' }).click();
  await expect(figure.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect(figure.getByRole('button', { name: 'Play the chirp' })).toBeVisible({ timeout: 5000 });
  await figure.getByRole('button', { name: 'GW170817 (neutron stars)' }).click();
  await expect(caption(figure, /^1\.46 and 1\.27 M☉ at the source, 40 Mpc away\. The chirp mass is 1\.18 M☉ .* They are light enough to be neutron stars: .* the stars touch at about 1,6\d\d Hz/)).toBeVisible();
  await expect(figure.getByText('Two neutron stars are far too light to fit GW150914: choose black holes to compare.')).toBeVisible();
  await figure.getByRole('slider', { name: 'First mass' }).fill('1.5');
  await expect(caption(figure, /^31\.6 and 1\.27 M☉/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 29.3' }).click();
  await expect(caption(figure, /^35\.6 and 30\.6 M☉/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the merger census: the runs, a card, and the keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'hundreds-of-collisions');
  await waitForHydration(page);
  const figure = figureByNumber(page, '29.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^391 events up to the end of O4b \(2024–25\), 282 with their masses estimated: .* Picked: GW150914, 14 September 2015: 34\.6 \(32\.0 to 39\.0\) and 30\.0 \(25\.4 to 32\.9\) M☉\./)).toBeVisible();
  await figure.getByRole('slider', { name: 'Up to the end of' }).fill('0');
  await expect(caption(figure, /^3 events up to the end of O1 \(2015–16\)/)).toBeVisible();
  await figure.getByRole('combobox', { name: 'Event' }).selectOption('GW231123_135430');
  await expect(figure.getByRole('heading', { name: 'GW231123_135430' })).toBeVisible();
  await expect(caption(figure, /Picked: GW231123_135430, 23 November 2023 \(not yet found at this point\): 137 \(119 to 160\) and 101 \(51 to 123\) M☉\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 29.4' }).click();
  const map = figure.getByRole('img', { name: /^Map of the mergers’ masses/ });
  await map.focus();
  await map.press('End');
  await expect(caption(figure, /Picked: GW231123_135430/)).toBeVisible();
  await map.press('Home');
  await expect(caption(figure, /Picked: GW170817/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the gravitational-wave spectrum: LIGO, LISA and the pulsars', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'merging-neutron-stars');
  await waitForHydration(page);
  const figure = figureByNumber(page, '29.5');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^At 100 Hz, one cycle takes 10 ms and the waves are 2,998 km long\. .* Listening here: Advanced LIGO \(design\)\./)).toBeVisible();
  await figure.getByRole('button', { name: 'LISA' }).click();
  await expect(caption(figure, /^At 3 mHz, one cycle takes 5\.6 minutes .* Listening here: LISA/)).toBeVisible();
  await figure.getByRole('button', { name: 'Pulsar timing' }).click();
  await expect(caption(figure, /^At 3 nHz, one cycle takes 11 years .* light-years\)\. .* Listening here: Pulsar timing arrays/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: the chirp mass that matches GW150914', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /chirp mass at the source makes the model’s sweep match GW150914’s/ });
  const slider = question.getByRole('slider', { name: 'Chirp mass at the source' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A chirp mass of 15\.0 M☉ at the source: the overlap is 0\.\d\d\. A lighter pair sweeps more slowly/)).toBeVisible();
  await slider.fill('25');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A chirp mass of 25\.0 M☉ at the source \(27\.3 M☉ as the waves reached us\): right\./)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 29, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '29.1').getByRole('button', { name: 'Your own pair' }).click();
      await figureByNumber(page, '29.2').getByRole('button', { name: 'Both, a quarter-cycle apart' }).click();
      await figureByNumber(page, '29.3').getByRole('button', { name: 'GW150914 at Hanford' }).click();
      await figureByNumber(page, '29.4').getByRole('combobox', { name: 'Event' }).selectOption('GW170817');
      await figureByNumber(page, '29.5').getByRole('button', { name: 'LISA' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
