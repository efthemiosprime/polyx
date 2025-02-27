// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Dynamically find all entry points
const getDirectories = (source) =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// Get core modules
const coreModules = getDirectories(resolve(__dirname, 'src'))
  .filter(dir => dir !== 'internal' && dir !== 'utils');

// Generate entry points object
const generateEntries = () => {
  const entries = {
    index: resolve(__dirname, 'src/index.js'),
  };
  
  // Add each module as a separate entry point
  coreModules.forEach(module => {
    entries[module] = resolve(__dirname, `src/${module}/index.js`);
  });
  
  return entries;
};

export default defineConfig(({ mode }) => {
  const isBuildingUmd = process.env.FORMAT === 'umd';
  
  // UMD build configuration (single entry)
  if (isBuildingUmd) {
    return {
      build: {
        outDir: 'dist/umd',
        lib: {
          entry: resolve(__dirname, 'src/index.js'),
          name: 'Poly',
          formats: ['umd'],
          fileName: () => 'poly.umd.js'
        },
        rollupOptions: {
          external: [],
          output: {
            globals: {},
          }
        },
        sourcemap: true,
        minify: 'esbuild',
      }
    };
  }

  // ESM build configuration (multiple entries)
  return {
    build: {
      outDir: 'dist/esm',
      lib: {
        entry: generateEntries(),
        formats: ['es'],
        fileName: (format, entryName) => `${entryName}.js`
      },
      rollupOptions: {
        external: [],
        output: {
          // Preserve directory structure in output
          preserveModules: true,
          preserveModulesRoot: 'src',
          // Ensure imported components are properly externalized
          manualChunks: undefined
        }
      },
      sourcemap: true,
      minify: 'esbuild',
    }
  };
});