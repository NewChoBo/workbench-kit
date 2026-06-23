import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      '@workbench-kit/monaco': resolve(repoRoot, 'packages/monaco/src/testing/vitestMock.tsx'),
      react: resolve(repoRoot, 'node_modules/react'),
      'react-dom': resolve(repoRoot, 'node_modules/react-dom'),
      'react/jsx-runtime': resolve(repoRoot, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': resolve(repoRoot, 'node_modules/react/jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [],
  },
});
