import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';

function getStorybookBasePath(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return '/';
  }

  if (trimmed === './' || /^https?:\/\//.test(trimmed)) {
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const storybookBasePath = getStorybookBasePath(process.env.STORYBOOK_BASE_PATH);

const config: StorybookConfig = {
  stories: [
    '../examples/workbench-sample/src/**/*.stories.@(ts|tsx)',
    '../packages/react/src/primitives/Controls.stories.@(ts|tsx)',
    '../packages/react/src/primitives/EditorChrome.stories.@(ts|tsx)',
    '../packages/react/src/modal/OverlayDialogs.stories.@(ts|tsx)',
    '../packages/react/src/workbench/chat/ChatComponents.stories.@(ts|tsx)',
    '../packages/react/src/workbench/workspace/WorkspaceSearchPanel.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(config) {
    config.base = storybookBasePath;

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
