// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure modules run in Node for speed; DOM-touching modules run in jsdom.
    environment: 'node',
    environmentMatchGlobs: [
      ['src/dom/**', 'jsdom'],
      ['**/*.dom.test.js', 'jsdom'],
    ],
    include: ['src/**/*.{test,spec}.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.{test,spec}.js',
        'src/**/index.js',
        'src/**/just_for_reference__*.js',
      ],
    },
  },
});
