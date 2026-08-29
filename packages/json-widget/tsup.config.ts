import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'ui-authoring/semantic-admission-v3': 'src/ui-authoring/semantic-admission-v3.ts',
    'ui-authoring/v3': 'src/ui-authoring/v3.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
