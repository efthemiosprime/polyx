import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      // Path to your library's entry point
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Poly',
      // Proper extensions for different formats
      fileName: (format) => `poly.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      // Make sure to externalize dependencies that shouldn't be bundled
      external: [],
      output: {
        // Global variables to use in UMD builds for externalized deps
        globals: {},
      },
    },
    // Generate source maps
    sourcemap: true,
    // Minify the output
    minify: 'terser',
  },
  test: {
    // Vitest configuration
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});