import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests against the production build, served the way CloudFront
 * serves it (scripts/serve.ts), so they check exactly what gets deployed. Run with: npm run e2e
 * To test the live site instead: BASE_URL=<the site URL> npm run e2e
 */
const liveUrl = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: liveUrl ?? 'http://localhost:4175',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@perf/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
    // A slow phone's frame rates, on request (PERF=1 npx playwright test --project=perf): see e2e/performance.spec.ts.
    ...(process.env.PERF ? [{ name: 'perf', use: { ...devices['Desktop Chrome'] }, grep: /@perf/ }] : []),
    // Cross-browser checks, on request (CROSS_BROWSER=1 npm run e2e; first time: npx playwright install firefox webkit):
    // each page's overview test and the tests tagged @cross, in Firefox and in WebKit (Safari's engine).
    ...(process.env.CROSS_BROWSER
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }, grep: /@phone|@cross/ },
          { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }, grep: /@phone|@cross/ },
        ]
      : []),
  ],
  webServer: liveUrl
    ? undefined
    : [
        {
          command: 'npm run build && node scripts/serve.ts --port 4175',
          url: 'http://localhost:4175',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          // The same site built with React's development build, which reports every hydration
          // mismatch (the production build stays quiet about some), for e2e/hydration.spec.ts.
          command:
            'npx vite build --mode development --outDir dist-dev && npx vite build --mode development --ssr src/entry-server.tsx --outDir dist-dev-server' +
            ' && node scripts/prerender.ts --dist dist-dev --server dist-dev-server && node scripts/serve.ts --port 4177 --dist dist-dev',
          env: { NODE_ENV: 'development' },
          url: 'http://localhost:4177',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
