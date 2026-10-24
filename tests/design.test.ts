import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The design tokens in src/styles/global.css, checked for WCAG 2.1 contrast in
 * both themes, so that a change to one colour can't quietly break legibility.
 */
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

function tokens(block: string): Map<string, string> {
  return new Map([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

const lightBlock = css.match(/^:root \{([^}]*)\}/m)?.[1] ?? '';
const darkBlock = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/)?.[1] ?? '';
const light = tokens(lightBlock);
const darkOverrides = tokens(darkBlock);
const themes = { light, dark: new Map([...light, ...darkOverrides]) };

/** WCAG relative luminance of an sRGB colour such as #1c1f24. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('parses both themes', () => {
    expect(light.size).toBeGreaterThan(15);
    expect(darkOverrides.size).toBeGreaterThan(8);
  });

  it('only overrides tokens that exist in the light theme', () => {
    for (const name of darkOverrides.keys()) expect(light.has(name), name).toBe(true);
  });

  for (const [theme, t] of Object.entries(themes)) {
    describe(`in the ${theme} theme`, () => {
      const color = (name: string) => {
        const value = t.get(name);
        if (!value) throw new Error(`--${name} is not defined`);
        return value;
      };

      it('keeps text readable on every background (≥ 4.5:1)', () => {
        for (const text of ['text', 'text-muted', 'accent', 'text-warm', 'right', 'wrong']) {
          for (const bg of ['bg', 'surface']) {
            expect(contrast(color(text), color(bg)), `--${text} on --${bg}`).toBeGreaterThanOrEqual(4.5);
          }
        }
        expect(contrast(color('text-warm'), color('highlight-bg')), '"Try this" label').toBeGreaterThanOrEqual(4.5);
        expect(contrast(color('text'), color('highlight-bg')), '"Try this" text').toBeGreaterThanOrEqual(4.5);
        expect(contrast('#ffffff', color('accent-fill')), 'white on filled buttons').toBeGreaterThanOrEqual(4.5);
      });

      it('draws chart lines that stand out from the page (≥ 3:1)', () => {
        for (const series of ['series-1', 'series-2', 'series-3']) expect(contrast(color(series), color('bg')), `--${series}`).toBeGreaterThanOrEqual(3);
      });

      it('keeps the night sky dark, with readable labels on it', () => {
        expect(luminance(color('sky-bg'))).toBeLessThan(0.01);
        expect(contrast(color('sky-text'), color('sky-bg'))).toBeGreaterThanOrEqual(7);
        expect(contrast(color('sky-muted'), color('sky-bg'))).toBeGreaterThanOrEqual(4.5);
        expect(contrast(color('sun'), color('sky-bg'))).toBeGreaterThanOrEqual(3);
      });

      it('draws the Sun with an edge that stands out on a light background (≥ 3:1)', () => {
        expect(contrast(color('sun-edge'), '#ffffff')).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it('never changes the sky with the theme', () => {
    for (const name of light.keys()) if (name.startsWith('sky-') || name.startsWith('sun')) expect(darkOverrides.has(name), name).toBe(false);
  });
});
