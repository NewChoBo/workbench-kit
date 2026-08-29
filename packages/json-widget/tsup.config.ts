import { defineConfig, type Options } from 'tsup';

const sharedOptions = {
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  splitting: false,
} satisfies Options;

export default defineConfig([
  {
    ...sharedOptions,
    entry: {
      index: 'src/index.ts',
      'ui-authoring/semantic-admission-v3': 'src/ui-authoring/semantic-admission-v3.ts',
    },
    clean: true,
  },
  {
    ...sharedOptions,
    entry: {
      'ui-authoring/v3': 'src/ui-authoring/v3.ts',
    },
    clean: false,
    // The focused complete V3 entry is a lazy-surface boundary. Keep its
    // contracts validators private so consumers do not hoist broad contracts
    // root exports into an otherwise static renderer closure.
    noExternal: ['@workbench-kit/contracts'],
  },
]);
