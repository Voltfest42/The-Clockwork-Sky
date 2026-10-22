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
npm run build      # type-check and build to dist/
```

## Layout

```
src/core/      the physics: units, vectors and angles, calendars and time, coordinates (pure TypeScript, no UI)
src/viz/       reusable visual pieces: figure frame, step player, charts
src/site/      site shell: course registry, routing, sidebar, pages, glossary, Check yourself, reading progress
src/content/   chapter and Toolkit text (MDX)
src/data/      compact data files built by scripts/, each with its source and licence
tests/         unit and property tests
e2e/           Playwright tests and WCAG 2.1 AA checks
infra/         AWS CDK app: private S3 bucket + CloudFront on sky.moving-parts.dev
docs/          plans and research notes
```

## Conventions

- `src/core` takes and returns SI units (metres, seconds, kilograms, radians); time is a Julian Date in Terrestrial Time. Every exported function states its units.
- Historical dates use astronomical year numbering (1 BC is year 0), the Julian calendar before 15 October 1582 and the Gregorian after.
- The physics is tested against independent references: Meeus's worked examples now, JPL Horizons and NASA's eclipse lists as the chapters arrive.
- British spelling.

## Deploying

The site is static. It is served from a private S3 bucket through CloudFront (Origin Access Control), on `sky.moving-parts.dev` with a certificate and an alias record in the `moving-parts.dev` hosted zone (owned by the Moving Parts project). It is all defined in `infra/` with AWS CDK, as the stack `ClockworkSkySite`.

```bash
npm install --prefix infra   # once
npm run deploy               # build, upload, invalidate the CloudFront cache
```

`npm run deploy` uses the active AWS CLI profile, which must be in `us-east-1` (CloudFront only takes certificates from there). To remove everything, run `npm --prefix infra run destroy`.
