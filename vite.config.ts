import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // MDX must run before the React plugin so chapters get Fast Refresh too.
    // remark-gfm adds GitHub-style Markdown: tables, strikethrough, autolinks.
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
  build: {
    target: 'es2022',
    // One stylesheet, linked from every prerendered page, so a page is fully styled
    // before its scripts run (split CSS would arrive only with each chapter's chunk).
    cssCodeSplit: false,
    // three.js is one lazy chunk of about 750 kB (190 kB gzipped), loaded only by pages with a 3D view.
    chunkSizeWarningLimit: 800,
  },
  server: {
    // The CDK app's build output holds locked zip files on Windows, which crashes the watcher.
    watch: { ignored: ['**/infra/**', '**/docs/**', '**/dist*/**'] },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
