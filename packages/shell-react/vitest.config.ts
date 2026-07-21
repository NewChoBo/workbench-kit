import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';

import rootConfig from '../../vitest.config.ts';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageRoot, '../..');

export default mergeConfig(
  rootConfig,
  defineConfig({
    resolve: {
      alias: {
        '@workbench-kit/monaco': path.resolve(
          repoRoot,
          'packages/monaco/src/testing/vitestMock.tsx',
        ),
      },
    },
    test: {
      environment: 'jsdom',
      fileParallelism: false,
      hookTimeout: 20000,
      maxConcurrency: 1,
      testTimeout: 20000,
    },
  }),
);
