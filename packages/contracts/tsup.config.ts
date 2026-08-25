import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'authoring-development': 'src/authoring-development/index.ts',
    index: 'src/index.ts',
    'theme-presets': 'src/design-system/builtin-theme-presets.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
