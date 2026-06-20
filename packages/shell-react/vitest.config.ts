import { defineConfig, mergeConfig } from 'vitest/config';

import rootConfig from '../../vitest.config.ts';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      fileParallelism: false,
      hookTimeout: 20000,
      maxConcurrency: 1,
      testTimeout: 20000,
    },
  }),
);
