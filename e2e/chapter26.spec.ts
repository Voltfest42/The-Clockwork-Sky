import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[25];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Neutron stars' })).toBeVisible();
}

test('Chapter 26 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['26.1', '26.2', '26.3', '26.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Neutron stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('inside a neutron star: its crust, its layers by keyboard, and a heavier star', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'a-nucleus-the-size-of-a-city');
  const figure = figureByNumber(page, '26.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^A neutron star of 1\.4 M☉ \(the SLy equation of state\) is 11\.7 km in radius\. Its crust is 9\d0 m thick, 8% of the radius, and holds 1\.\d% of its mass; neutrons drip out of the nuclei 4\d0 m down/)).toBeVisible();
  const core = figure.getByRole('button', { name: 'Outer core' });
  await core.focus();
  await core.press('Enter');
  await expect(caption(figure, /Outer core: .* of the mass\.$/)).toBeVisible();
  await expect(figure.getByText(/A liquid of neutrons with 5–10% protons/)).toBeVisible();
  await figure.getByRole('button', { name: '2.0 M☉' }).click();
  await expect(caption(figure, /^A neutron star of 2\.0 M☉ \(the SLy equation of state\) is 1[01]\.\d km in radius/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('build a neutron star: the heaviest SLy star, a stiffer equation of state, and Newton’s gravity', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-heaviest-neutron-star');
  await waitForHydration(page);
  const figure = figureByNumber(page, '26.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^SLy, with 8\.9 × 10¹⁴ g\/cm³ at its centre .*: a neutron star of 1\.\d\d M☉, 11\.7 km in radius\. The heaviest star SLy allows weighs 2\.05 M☉, too light for PSR J0952−0607’s 2\.35/)).toBeVisible();
  await figure.getByRole('button', { name: 'The heaviest star' }).click();
  await expect(caption(figure, /a neutron star of 2\.0[45] M☉, 10\.\d km in radius/)).toBeVisible();
  await figure.getByLabel('Equation of state').selectOption('MPA1');
  // SLy's heaviest star's centre is past MPA1's heaviest.
  await expect(caption(figure, /^MPA1, .* It is past the heaviest star this equation of state allows, 2\.46 M☉/)).toBeVisible();
  await figure.getByRole('button', { name: 'The heaviest star' }).click();
  await expect(caption(figure, /The heaviest star MPA1 allows weighs 2\.46 M☉, enough for PSR J0952−0607’s 2\.35/)).toBeVisible();
  await figure.getByRole('button', { name: 'Newton only' }).click();
  await expect(caption(figure, /In Newton’s gravity the same centre holds up \d+\.\d\d M☉ in \d+\.\d km, and squeezing harder only makes it heavier/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Density at the centre/ }).fill('18');
  await expect(caption(figure, /^MPA1, with 1 × 10¹⁵ g\/cm³ at its centre/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 26.2' }).click();
  await expect(caption(figure, /^SLy, with 8\.9 × 10¹⁴ g\/cm³/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the pulsar lighthouse: one pulse, a miss, an interpulse, and the star turned by keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'lighthouses');
  const figure = figureByNumber(page, '26.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The magnetic axis is tilted 40° from the spin axis; we look from 45° off it; each beam is 14° wide\. One pulse a turn, from the upper beam/)).toBeVisible();
  await figure.getByRole('button', { name: 'Misses us' }).click();
  await expect(caption(figure, /Neither beam crosses our line of sight/)).toBeVisible();
  await figure.getByRole('button', { name: 'Both beams: an interpulse' }).click();
  await expect(caption(figure, /Two pulses a turn, half a turn apart: a main pulse and an interpulse/)).toBeVisible();
  await figure.getByRole('button', { name: 'Through the middle' }).click();
  await expect(caption(figure, /with three peaks/)).toBeVisible();
  const turned = figure.getByRole('slider', { name: /^Turned/ });
  await turned.focus();
  await turned.press('End');
  await expect(figure.getByRole('group', { name: '3D view of a pulsar and its beams' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the P–Ṗ diagram: the first pulsar’s card, a pulsar aged into the graveyard and recycled', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'clocks-that-slow-down');
  await waitForHydration(page);
  const figure = figureByNumber(page, '26.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByText(/At the heart of the Crab Nebula/)).toBeVisible();
  await figure.getByLabel('Pulsar', { exact: true }).selectOption('PSR B1919+21');
  await expect(figure.getByText('The first pulsar, found by Jocelyn Bell in 1967.')).toBeVisible();
  await expect(caption(figure, /^Your pulsar, 1,000 years after its birth, turns every 30\.9 ms/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Age/ }).fill('9');
  await expect(caption(figure, /^Your pulsar, 1 billion years after its birth, .* It is past the death line/)).toBeVisible();
  await figure.getByRole('button', { name: 'Recycle it: a companion spins it up' }).click();
  await expect(caption(figure, /^Your recycled pulsar, 1 million years after its companion spun it up, turns every 2\.45 ms/)).toBeVisible();
  await figure.getByRole('button', { name: 'Equal power' }).click();
  await expect(figure.getByRole('button', { name: 'Equal power' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('the interactive question: the equations of state too soft for 2.35 M☉', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /which equations of state can’t hold up a neutron star of 2\.35 M☉/ });
  await question.scrollIntoViewIfNeeded();
  await question.getByRole('checkbox', { name: 'MS1' }).check();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/MS1 can hold it up/)).toBeVisible();
  await question.getByRole('checkbox', { name: 'MS1' }).uncheck();
  for (const name of ['PAL6', 'FPS', 'GNH3', 'H4', 'SLy', 'WFF1', 'APR4', 'ENG']) await question.getByRole('checkbox', { name, exact: true }).check();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Right: 8 of the ten can’t/)).toBeVisible();
});

test('Toolkit T7: the dot product’s shadow and the cross product standing up', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/toolkit/vectors/');
  const figure = figureByNumber(page, 'T7.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^a = \(3, 1\) and b = \(1, 3\), 53° apart\. Their sum is \(4, 4\)\. Their dot product is 3 × 1 \+ 1 × 3 = 6/)).toBeVisible();
  await figure.getByRole('button', { name: 'Cross product' }).click();
  await expect(caption(figure, /Their cross product is 8, pointing up out of the floor/)).toBeVisible();
  await figure.getByRole('slider', { name: 'b’s direction' }).fill('198');
  await expect(caption(figure, /pointing backwards/)).toBeVisible();
  await expect(caption(figure, /Their cross product is (−0\.\d+|0), /)).toBeVisible();
  await expect(figure.getByRole('group', { name: '3D view of a, b and their cross product' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 26, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '26.1').getByRole('button', { name: '2.0 M☉' }).click();
      await figureByNumber(page, '26.2').getByRole('button', { name: 'Newton only' }).click();
      await figureByNumber(page, '26.3').getByRole('button', { name: 'Both beams: an interpulse' }).click();
      await figureByNumber(page, '26.4').getByRole('button', { name: 'Equal power' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });

    test('Toolkit T7 passes the accessibility checks', async ({ page }) => {
      await page.goto('/toolkit/vectors/');
      await figureByNumber(page, 'T7.1').getByRole('button', { name: 'Sum' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
