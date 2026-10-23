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
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
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
