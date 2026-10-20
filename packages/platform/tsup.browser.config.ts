import { defineConfig } from 'tsup';

/** One framework-independent module for native HTML and bundled consumers. */
export default defineConfig({
  entry: {
    'native-text-input': 'src/browser/native-text-input.ts',
    'native-checkbox': 'src/browser/native-checkbox.ts',
    'native-property-row': 'src/browser/native-property-row.ts',
  },
  outDir: 'dist/browser',
  format: ['esm'],
  dts: false,
  clean: process.env.WORKBENCH_KIT_WATCH !== '1',
  sourcemap: false,
  splitting: false,
  platform: 'browser',
  target: 'es2022',
});
