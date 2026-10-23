# The Clockwork Sky

An interactive course in **astronomy and astrophysics** that starts from scratch: from the sky you can see with your own eyes to the physics inside the stars, in three parts that rise step by step, with two labs (the Orrery and the Star Forge). Every figure runs real physics in your browser: positions of the Sun, Moon and planets, orbits integrated step by step, and models of stars.

**Live site:** https://sky.moving-parts.dev (part of [Moving Parts](https://moving-parts.dev))

- [docs/plan.md](docs/plan.md): the master plan: the course, the labs, the architecture, the stages, and the **Status** of the build
- [docs/part1/plan.md](docs/part1/plan.md) and [docs/part1/research.md](docs/part1/research.md): Part I's detailed plan and research brief, with sources

## Development

Requires Node 20.19 or later (developed on Node 24).

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm test           # unit + property tests (Vitest, fast-check)
npm run e2e        # end-to-end + accessibility tests on the production build (Playwright + axe)
                   # first time only: npx playwright install chromium
npm run lint
npm run build      # type-check, build to dist/ and prerender every page to its own HTML
npm run preview    # serve dist/ the way CloudFront does, at http://localhost:4175
```

Every page has its own address (`/the-turning-sky/`) and is prerendered at build time, then hydrated in the browser; see "Search engines" in `CLAUDE.md`.

The data files in `src/data/` are committed; to rebuild them from the sources (downloaded once into `scripts/.cache/`):

```bash
npx tsx scripts/build-stars.ts            # HYG v4.4 → src/data/hyg/stars.json (CC BY-SA 4.0)
npx tsx scripts/build-constellations.ts   # d3-celestial → constellations.json, milkyway.json
npx tsx scripts/fetch-horizons.ts         # JPL Horizons → tests/fixtures/horizons.json
```

## Layout

```
src/core/      the physics: units, vectors and angles, calendars and time, coordinates, precession, the Sun, Moon and planets, stars (pure TypeScript, no UI)
src/viz/       reusable visual pieces: figure frame, step player, charts, the 3D scene, the scale zoom, the sky view, time and place controls
src/figures/   the figures themselves, one file each
src/site/      site shell: course registry, route list, routing, head tags and sitemap, sidebar, pages, glossary, Check yourself, reading progress
src/entry-server.tsx  renders a page to HTML at build time (scripts/prerender.ts)
src/content/   chapter and Toolkit text (MDX)
src/data/      compact data files built by scripts/, each with its source and licence (share-alike ones in their own folder)
scripts/       data builders, fixture fetchers, the prerenderer and a local server that behaves like CloudFront
tests/         unit and property tests
e2e/           Playwright tests and WCAG 2.1 AA checks
infra/         AWS CDK app: private S3 bucket + CloudFront (with its viewer-request function) on sky.moving-parts.dev
docs/          plans and research notes
```

## Conventions

- `src/core` takes and returns SI units (metres, seconds, kilograms, radians); time is a Julian Date in Terrestrial Time. Every exported function states its units.
- Historical dates use astronomical year numbering (1 BC is year 0), the Julian calendar before 15 October 1582 and the Gregorian after.
- The physics is tested against independent references: Meeus's worked examples, JPL Horizons, ERFA's test values, and (from Chapter 4) NASA's eclipse lists.
- British spelling.

## Deploying

The site is static: one prerendered HTML file per page. It is served from a private S3 bucket through CloudFront (Origin Access Control), with a CloudFront Function that gives every page one address (trailing slash, one host name) and serves each folder's `index.html`, on `sky.moving-parts.dev` with a certificate and an alias record in the `moving-parts.dev` hosted zone (owned by the Moving Parts project). It is all defined in `infra/` with AWS CDK, as the stack `ClockworkSkySite`.

```bash
npm install --prefix infra   # once
npm run deploy               # build, upload, invalidate the CloudFront cache
```

`npm run deploy` uses the active AWS CLI profile, which must be in `us-east-1` (CloudFront only takes certificates from there). To remove everything, run `npm --prefix infra run destroy`.
