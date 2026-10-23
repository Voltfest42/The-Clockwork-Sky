# The Clockwork Sky

An interactive course in astronomy and astrophysics for moving-parts.dev, in three parts that rise from the basics to stellar physics, with two labs (the Orrery and the Star Forge). It is the third explainer on the site, after Beyond Dijkstra and From Black Box to Rulebook, whose stack and conventions it follows.

## Where things are

- `docs/plan.md`: the master plan. Its **Status** section says what's done and which stage is next. Read it first.
- `docs/partN/plan.md` and `docs/partN/research.md`: the detailed plan and research brief for each part. They are written in that part's planning stage. Until then, the part exists only as an outline in the master plan; don't build ahead of it.
- Sibling projects to copy from: `../From Black Box to Rulebook` (the most recent), `../Beyond Dijkstra`, `../Moving Parts` (the front page and the `moving-parts.dev` DNS zone).

## Working in stages

- **One stage per session.** At the start, read this file, the Status section of `docs/plan.md` and the current part's plan.
- A stage ends with:
  1. unit tests, lint, type-check and build passing;
  2. end-to-end tests for the pages it touched;
  3. the Status section updated (done, deviations, next stage);
  4. a commit `Stage N: <summary>`, a push and a deploy.

  **Then stop and report. Never start the next stage in the same session.**
- If a session runs low, stop at a clean point, commit as `Stage N (part 1): …`, and record what's left in Status.
- Ask before anything outward-facing that the plan doesn't already approve (creating repositories, new AWS resources, changes to the Moving Parts project).

## Commands (from Stage 1 on)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit and property tests
npm run e2e        # Playwright + axe on the production build (first time: npx playwright install chromium)
npm run lint
npm run build      # type-check, build to dist/ and prerender every page
npm run preview    # serve dist/ the way CloudFront does, at http://localhost:4175
npm run deploy     # build, upload to S3, invalidate CloudFront (default AWS profile, us-east-1)
```

## Code conventions

- **`src/core` is pure TypeScript with no UI imports, and fully unit-tested.** Engines report steps through an optional `emit` callback when a figure steps through them; randomness is seeded.
- **Units:** SI at module boundaries. Engines may use natural units inside (the n-body engine uses AU, days and solar masses) and convert at their edges. Every exported function states its units.
- **Time:** Julian Date (TT) internally. Use `Date` only for "now" and for display, never for historical dates. Use astronomical year numbering (1 BC = year 0).
- **Heavy work** runs in Web Workers. Figures pause when off-screen. three.js is used only through `Scene3D` and lazy-loaded.
- **Tests:** physics against independent references (JPL Horizons fixtures, NASA eclipse lists, analytic solutions, conservation laws); property tests with fast-check; end-to-end and axe tests for every new page and figure.
- **Data:** scripts in `scripts/` build compact files in `src/data/`. Raw downloads go to `scripts/.cache/` and are not committed. Record every source and licence in `src/data/README.md` and on the About page. Keep share-alike files (HYG stars, CC BY-SA 4.0) separate.

## Search engines

Every page is a real address with its own prerendered HTML, so search engines and link previews see it. Keep it that way:

- **One route list.** `src/site/routes.ts` makes every page's path, title and description from the course registry (`course.ts`) plus the extra pages. A new chapter, Toolkit page or lab added to `course.ts` gets its address (`/<slug>/`, Toolkit pages `/toolkit/<slug>/`), its prerendered `dist/<path>/index.html`, its head tags, its structured data and its sitemap entry by itself. A new kind of page goes in `routes.ts` (and `App.tsx`); its title and description must be unique.
- **Links** are plain `<a href={href(page, section)}>`. Sections are fragments: `/the-turning-sky/#the-sky-as-a-dome`. Never write `#/` addresses; old ones are only moved on load.
- **Prerendering and hydration.** `npm run build` renders every route with `src/entry-server.tsx` (`scripts/prerender.ts`), and the browser hydrates it. The first render in the browser must match the server's exactly:
  - No module touches `window`, `document`, storage or the clock at import time. Read storage lazily, through `useSyncExternalStore` with a server snapshot.
  - Anything that needs the browser (canvas, WebGL, workers, `matchMedia`, the clock, storage) lives inside a figure's body: `Figure` prerenders the frame and the figure's `description` (required, with a `height` hint) and mounts the live figure after hydration. Hooks that watch a figure's elements restart then (`useOnScreen` does). Use `useHydrated()` for anything else that must wait.
  - Text that depends on today's date uses `usePageTime()`.
  - `npm run e2e` checks every page with JavaScript off, and hydrates every page on a development build of React, which reports any mismatch.
- **Head tags and structured data** come from `src/site/seo.ts`: title, description, canonical `https://sky.moving-parts.dev/<path>`, Open Graph and Twitter tags, a schema.org `Course` on the start page and a `LearningResource` on each chapter and Toolkit page. `sitemap.xml` and `robots.txt` are generated from the same list.
- **Hosting.** A CloudFront Function (`infra/lib/viewer-request.ts`) sends other host names to sky.moving-parts.dev, adds trailing slashes and serves `/<path>/index.html`. Unknown paths get `404.html` with a 404 status. `npm run preview` and the end-to-end tests serve the build through the same function (`scripts/serve.ts`).
- The link-preview image `public/og-image.png` comes from the Moving Parts project (`npm run previews` there); ask for a new one rather than editing it.

## Content conventions

- **Spelling:** British (colour, centre, neighbour), as in the sibling projects. Plain English, short sentences, one idea per section.
- **Tone:** intuition and pictures first, game-dev analogies where they fit, formulas only when they earn their place. Part I uses no equations beyond arithmetic. Part II uses algebra in short boxes. Part III uses real equations.
- **Every chapter:** a "Builds on" line, figures, and a Check yourself block at the end.
- **Every figure:** a caption, a legend, a "Try this" prompt and a reset. Add a "What's simplified here?" note when it simplifies, and a "not to scale" tag when it exaggerates.
- **Facts:** take numbers from the part's research brief. Facts that change (moon counts, exoplanet counts) carry an "as of" date, and their values live in `src/data/`, not in the prose.
- **Misconceptions:** figures for the seasons, phases, eclipses and gravity are built to confront the known wrong ideas (`docs/part1/research.md` §1).
- **Accessibility:** WCAG 2.1 AA in both themes, full keyboard control, `prefers-reduced-motion` respected, colour never the only cue, and a text description and keyboard camera for every 3D scene.
- **Scope:** no cosmology (the expanding universe, the Big Bang, the CMB, dark energy). It may become a separate course.
