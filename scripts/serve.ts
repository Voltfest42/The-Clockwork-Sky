/**
 * Serves the built site (dist/) the way CloudFront and S3 do, for the end-to-end
 * tests: every request goes through the same viewer-request function as the live
 * site (infra/lib/viewer-request.ts), and an address with no file behind it gets
 * 404.html with a 404 status.
 *
 * Run with: node scripts/serve.ts [--port 4175] [--dist dist]
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { viewerRequestCode } from '../infra/lib/viewer-request.ts';

const portArg = process.argv.indexOf('--port');
const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 4175;
const host = `localhost:${port}`;
const distArg = process.argv.indexOf('--dist');
const dist = fileURLToPath(new URL(`../${distArg > 0 ? process.argv[distArg + 1] : 'dist'}/`, import.meta.url));

interface EdgeRequest {
  uri: string;
  headers: Record<string, { value: string }>;
  querystring: Record<string, { value: string }>;
}
type EdgeResult = EdgeRequest | { statusCode: number; headers: { location: { value: string } } };
const handler = new Function(`${viewerRequestCode(host)}\nreturn handler;`)() as (event: { request: EdgeRequest }) => EdgeResult;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/** Decodes %-escapes; a malformed one (a mistyped link) is no file, so it gets the 404 page. */
function decode(path: string): string | null {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}`);
  const querystring = Object.fromEntries([...url.searchParams].map(([k, v]) => [k, { value: v }]));
  // CloudFront hands the function the path as it was sent, still %-encoded.
  const result = handler({ request: { uri: url.pathname, headers: { host: { value: req.headers.host ?? '' } }, querystring } });

  if ('statusCode' in result) {
    // The function redirects to https; this server only speaks http.
    res.writeHead(result.statusCode, { location: result.headers.location.value.replace(/^https:/, 'http:') });
    res.end();
    return;
  }

  const path = decode(result.uri);
  const file = normalize(join(dist, path ?? '/no-such-file'));
  try {
    if (path === null || !file.startsWith(normalize(dist))) throw new Error('no such file');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await readFile(join(dist, '404.html')));
  }
}).listen(port, () => console.log(`Serving dist/ on http://${host}`));
