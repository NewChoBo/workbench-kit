import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)', '../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(config) {
    config.resolve ??= {};
    config.resolve.dedupe = Array.from(
      new Set([...(config.resolve.dedupe ?? []), 'react', 'react-dom']),
    );

    // Allow serving files from the workspace root or parent directories to avoid 403 Forbidden on symlinked resources
    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow = Array.from(
      new Set([
        ...(config.server.fs.allow ?? []),
        path.resolve(process.cwd(), '..').replace(/\\/g, '/'),
      ]),
    );

    return config;
  },
};

export default config;
