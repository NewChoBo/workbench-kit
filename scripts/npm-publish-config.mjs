export const NPM_REGISTRY = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org/';

export const NPM_PUBLISH_ORDER = [
  '@workbench-kit/contracts',
  '@workbench-kit/json-widget',
  '@workbench-kit/core',
  '@workbench-kit/runtime',
  '@workbench-kit/tokens',
  '@workbench-kit/workspace',
  '@workbench-kit/adapters',
  '@workbench-kit/services',
  '@workbench-kit/react',
  '@workbench-kit/vscode-host',
  '@workbench-kit/vscode-extension',
];
