/**
 * Prerenders every page of the site, the last step of `npm run build`.
 *
 * Reads the client build's dist/index.html as a template and the server build of
 * src/entry-server.tsx (dist-server/), then writes, for every page in the route
 * list (src/site/routes.ts):
 *   dist/<path>/index.html  the page's HTML, with its own head tags
 *   dist/404.html           the "Not found" page, served for unknown addresses
 *   dist/sitemap.xml        every page's address
 *   dist/robots.txt
 *
 * Run with: node scripts/prerender.ts [--dist dist] [--server dist-server] (after both Vite builds).
 * The end-to-end tests also prerender a development build, whose React reports every
 * hydration mismatch, into other folders (playwright.config.ts).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type * as Entry from '../src/entry-server.tsx';

const root = fileURLToPath(new URL('..', import.meta.url));
const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const dist = join(root, option('--dist', 'dist'));
const entry = (await import(pathToFileURL(join(root, option('--server', 'dist-server'), 'entry-server.js')).href)) as typeof Entry;

const template = readFileSync(join(dist, 'index.html'), 'utf8');
for (const marker of ['<!--head-->', '<!--/head-->', '<html lang="en-GB">', '<div id="root"></div>']) {
  if (!template.includes(marker)) throw new Error(`dist/index.html has no ${marker}`);
}

/** One time for every page, also written into each page so that hydration renders dated text the same way. */
const renderedAt = Date.now();

/** A page's HTML file: the template with its head and its rendered app. (Replacer functions, so "$" in the text stays as it is.) */
function pageHtml(head: string, app: string): string {
  return template
    .replace(/<!--head-->[\s\S]*?<!--\/head-->/, () => head)
    .replace('<html lang="en-GB">', () => `<html lang="en-GB" data-rendered="${renderedAt}">`)
    .replace('<div id="root"></div>', () => `<div id="root">${app}</div>`);
}

function write(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const css = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(dist, 'assets', f), 'utf8'))
  .join('\n');

/**
 * The client and server builds name CSS-module classes the same way. If they ever
 * didn't, the prerendered pages would be unstyled until hydration, so check it.
 */
function checkClasses(path: string, html: string) {
  const missing = new Set<string>();
  for (const [, list] of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of list.split(/\s+/)) {
      if (/^_[\w-]+_[a-z0-9]{5}_\d+$/.test(name) && !css.includes(`.${name}`)) missing.add(name);
    }
  }
  if (missing.size > 0) throw new Error(`${path}: classes missing from the CSS: ${[...missing].slice(0, 5).join(', ')}`);
}

for (const page of entry.PAGES) {
  const app = await entry.render(page.path, renderedAt);
  checkClasses(page.path, app);
  write(join(dist, page.path, 'index.html'), pageHtml(entry.headTags(page), app));
}

const notFound = await entry.render(entry.NOT_FOUND.path, renderedAt);
write(join(dist, '404.html'), pageHtml(entry.headTags(entry.NOT_FOUND), notFound));
write(join(dist, 'sitemap.xml'), entry.sitemapXml());
write(join(dist, 'robots.txt'), entry.robotsTxt());

console.log(`Prerendered ${entry.PAGES.length} pages, 404.html, sitemap.xml and robots.txt.`);
