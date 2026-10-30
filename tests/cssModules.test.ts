import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every class a component reads from a CSS module exists in that module. A
 * missing one is silently undefined (Stage 13 found a table left unstyled that
 * way), and the prerender's own check sees only what the server renders, not
 * the figures, which mount in the browser.
 */

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function classesOf(cssPath: string): Set<string> {
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set([...css.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((m) => m[1]));
}

describe('CSS modules', () => {
  const sources = files(resolve('src'));
  const uses: { file: string; name: string; css: string; className: string }[] = [];
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
      const [, name, spec] = m;
      const css = resolve(dirname(file), spec);
      for (const u of text.matchAll(new RegExp(`\\b${name}\\.(\\w+)`, 'g'))) uses.push({ file, name, css, className: u[1] });
    }
  }

  it('finds the components that use them', () => {
    expect(uses.length).toBeGreaterThan(200);
  });

  it('every class used exists in its module', () => {
    const cache = new Map<string, Set<string>>();
    const missing = uses.filter((u) => {
      if (!cache.has(u.css)) cache.set(u.css, classesOf(u.css));
      return !cache.get(u.css)!.has(u.className);
    });
    expect(missing.map((u) => `${u.file.replace(resolve('.'), '')}: ${u.name}.${u.className}`)).toEqual([]);
  });
});
