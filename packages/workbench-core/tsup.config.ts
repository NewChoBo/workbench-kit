import { defineConfig } from 'tsup';

/**
 * Self-contained CJS leaf for Electron main and other CommonJS consumers.
 * ESM/bundler consumers keep using the source subpath from package exports.
 */
export default defineConfig({
  entry: {
    'design-system': 'src/design-system/index.ts',
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['@workbench-kit/base'],
  platform: 'node',
  target: 'node18',
  outExtension() {
    return { js: '.cjs' };
  },
});
