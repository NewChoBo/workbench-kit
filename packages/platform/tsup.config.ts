import { defineConfig } from 'tsup';

/**
 * CJS leaves for Electron main (and other CommonJS hosts).
 * ESM consumers keep importing the source subpaths from package exports.
 */
export default defineConfig({
  entry: {
    'atomic-write': 'src/node/atomic-write.ts',
    'tray-close-policy': 'src/window/tray-close-policy.ts',
  },
  format: ['cjs'],
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  platform: 'node',
  target: 'node18',
  outExtension() {
    return { js: '.cjs' };
  },
});
