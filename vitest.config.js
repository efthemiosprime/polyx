// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure modules run in Node for speed. DOM-touching test files opt into jsdom
    // with a `// @vitest-environment jsdom` docblock at the top of the file
    // (environmentMatchGlobs was deprecated in Vitest 3).
    environment: 'node',
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
