import { defineConfig } from 'tsup';

/**
 * CJS leaves for Electron main (and other CommonJS hosts).
 * ESM consumers keep importing the source subpaths from package exports.
 */
export default defineConfig({
  entry: {
    'allowlisted-https-fetch': 'src/network/create-allowlisted-https-fetch.ts',
    'atomic-write': 'src/node/atomic-write.ts',
    'tray-close-policy': 'src/window/tray-close-policy.ts',
    'window-bounds-persistence': 'src/window/window-bounds-persistence.ts',
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
