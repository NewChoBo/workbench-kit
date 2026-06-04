import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)', '../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-viewport'],
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
    return config;
  },
};

export default config;
