import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[29];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Crowds of stars' })).toBeVisible();
}

test('Chapter 30 shows its sections, five figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['30.1', '30.2', '30.3', '30.4', '30.5']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Crowds of stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  // S2's next pericentre is computed from today
  await expect(main.getByText(/and comes round again in (January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\./)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('a cluster evaporates: the worker runs it, the stars leave, and the controls rebuild it', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'clusters-evaporate');
  await waitForHydration(page);
  const figure = figureByNumber(page, '30.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^1,000 stars with Kroupa’s mix of masses from 0\.08 to 3 M☉ \(\d+ M☉ in all\), 8\.2 kpc from the Galaxy’s centre, .* a relaxation time of 49 million years\. The Galaxy’s tide sets a Jacobi radius of 10 pc\./)).toBeVisible();
  await figure.getByRole('button', { name: '500 stars' }).click();
  await figure.getByRole('button', { name: '4 kpc from the centre' }).click();
  await expect(caption(figure, /^500 stars .* 4 kpc from the Galaxy’s centre/)).toBeVisible();
  await figure.getByRole('button', { name: 'Run the cluster' }).click();
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(caption(figure, /After \d+ million years \([1-9]\.\d relaxation times\): \d+% of the mass is still within the Jacobi radius of \d\.\d pc, and \d+ stars have left it\..* Energy error: /)).toBeVisible({ timeout: 30_000 });
  await figure.getByRole('button', { name: 'Pause' }).click();
  await figure.getByRole('button', { name: 'Bound or escaped' }).click();
  await figure.getByRole('button', { name: 'Whole tails' }).click();
  await expect(figure.getByRole('button', { name: 'Carry on' })).toBeVisible();
  await expect(figure.getByRole('group', { name: '3D view of the star cluster' })).toBeVisible();
  await figure.getByRole('button', { name: 'All equal' }).click();
  await expect(caption(figure, /^500 stars all of 0\.5 M☉ \(250 M☉ in all\)/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 30.1' }).click();
  await expect(caption(figure, /^1,000 stars with Kroupa’s mix/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Galaxy from outside: parts switched off and on, three views, and the keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-shape-of-the-milky-way');
  await waitForHydration(page);
  const figure = figureByNumber(page, '30.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Showing the thin disc .* and the globular clusters .*\. The Sun is 8\.2 kpc from the centre and 21 pc above the midplane, going round at 230 km\/s, once every 220 million years\./)).toBeVisible();
  for (const part of ['Thin disc', 'Thick disc', 'Bar and bulge', 'Stellar halo']) await figure.getByRole('button', { name: part }).click();
  await expect(caption(figure, /^Showing the globular clusters \(about 160 balls/)).toBeVisible();
  await figure.getByRole('button', { name: 'Globular clusters' }).click();
  await expect(caption(figure, /^Every part is hidden\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Edge on' }).click();
  await figure.getByRole('button', { name: 'Behind the Sun' }).click();
  const view = figure.getByRole('group', { name: '3D view of a model Milky Way' });
  await view.focus();
  await view.press('ArrowLeft');
  await view.press('+');
  await figure.getByRole('button', { name: 'Reset figure 30.2' }).click();
  await expect(figure.getByRole('button', { name: 'Thin disc' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('the rotation curve: no halo, the best halo, and the Milky Way', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-rotation-curve');
  await waitForHydration(page);
  const figure = figureByNumber(page, '30.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^NGC 3198, 13\.8 Mpc away, from SPARC .* At 44 kpc out, its farthest measured point, it turns at 149 km\/s, which takes 2\.3 × 10¹¹ M☉ inside that radius\. .* would give 65 km\/s there\. With a dark halo of 5 × 10¹¹ M☉ .* it matches every measured point/)).toBeVisible();
  await figure.getByRole('button', { name: 'No halo' }).click();
  await expect(caption(figure, /With no dark halo, the model falls short; it misses \d+ of the 43 measured points/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Stars’ mass-to-light ratio' }).fill('1.5');
  await expect(caption(figure, /at a mass-to-light ratio of 1\.50/)).toBeVisible();
  await figure.getByRole('button', { name: 'Best halo for these stars' }).click();
  // Even the best halo can't save stars this heavy: they overshoot in the middle
  await expect(caption(figure, /With a dark halo of [\d.]+ × 10\S+ M☉ in all, .* the model gives \d+ km\/s; it misses \d+ of the 43/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Milky Way' }).click();
  await expect(caption(figure, /^The Milky Way, measured from the motions of red giants .* At 27 kpc out, its farthest measured point, it turns at 173 km\/s/)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 30.3' }).click();
  await expect(caption(figure, /^NGC 3198/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the winding problem: arms of fixed stars wind up, the ovals’ pattern doesn’t', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'spiral-arms');
  await waitForHydration(page);
  const figure = figureByNumber(page, '30.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^Two arms of stars with a pitch of 25°/)).toBeVisible();
  await figure.getByRole('slider', { name: 'Time' }).fill('1000');
  await expect(caption(figure, /^After 1000 million years the stars at the Sun’s distance have gone round 4\.6 times\. The arms made of fixed stars have wound up to a pitch of 1\.\d° there\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Play again' }).click();
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible();
  await figure.getByRole('button', { name: 'Pause' }).click();
  await figure.getByRole('button', { name: 'Reset figure 30.4' }).click();
  await expect(caption(figure, /^Two arms of stars/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('S2’s orbit: weighing Sagittarius A* with the ruler and the stopwatch', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-black-hole-at-the-centre');
  await waitForHydration(page);
  const figure = figureByNumber(page, '30.5');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /S2 is [\d,]+ AU from Sagittarius A\*.* Its orbit takes 16\.05 years and comes within 119 AU at 7,739 km\/s; its next pericentre is in \w+ 20\d\d, [\d.]+ years from today\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Face on' }).click();
  await figure.getByRole('slider', { name: 'Ruler across the long axis' }).fill('250');
  const year = figure.getByRole('slider', { name: 'Year' });
  await year.fill('2018.38');
  await expect(caption(figure, /^May 2018: S2 is 119 AU from Sagittarius A\*, moving at 7,7\d\d km\/s/)).toBeVisible();
  await figure.getByRole('button', { name: 'Start the stopwatch' }).click();
  await year.fill('2034.42');
  await figure.getByRole('button', { name: 'Stop the stopwatch' }).click();
  await expect(figure.getByText('Timed: 16.04 years')).toBeVisible();
  await expect(caption(figure, /Your ruler gives a semi-major axis of 1,031 AU and your stopwatch a period of 16\.04 years, so Sagittarius A\* weighs 4\.2\d million Suns \(GRAVITY: 4\.26 million\)\./)).toBeVisible();
  await figure.getByRole('button', { name: /Relativity’s turning/ }).click();
  await expect(figure.getByText('Not to scale')).toBeVisible();
  await expect(caption(figure, /Relativity turns the orbit by 12′ a lap, drawn 40 times larger\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 30.5' }).click();
  await expect(figure.getByText('Stopwatch: not started')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: weigh Sagittarius A*', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /Weigh Sagittarius A\*: measure S2’s semi-major axis/ });
  const axis = question.getByRole('slider', { name: 'Semi-major axis' });
  await axis.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A semi-major axis of 700 AU and a period of 12\.0 years give 2\.38 million M☉\. The semi-major axis is too short/)).toBeVisible();
  await axis.fill('1030');
  await question.getByRole('slider', { name: 'Period' }).fill('16');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A semi-major axis of 1,030 AU and a period of 16\.0 years give 4\.27 million M☉: right\./)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 30, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '30.1').getByRole('button', { name: 'Bound or escaped' }).click();
      await figureByNumber(page, '30.2').getByRole('button', { name: 'Stellar halo' }).click();
      await figureByNumber(page, '30.3').getByRole('button', { name: 'No halo' }).click();
      await figureByNumber(page, '30.4').getByRole('slider', { name: 'Time' }).fill('300');
      await figureByNumber(page, '30.5').getByRole('button', { name: 'Face on' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
