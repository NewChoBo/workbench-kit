import fs from 'node:fs';

export const NPM_REGISTRY = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org/';

export function isTrustedPublisherAvailable() {
  return (
    process.env.GITHUB_ACTIONS === 'true' && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
  );
}

export function clearNpmRegistryAuth() {
  const userConfig = process.env.NPM_CONFIG_USERCONFIG;
  if (userConfig && fs.existsSync(userConfig)) {
    const lines = fs.readFileSync(userConfig, 'utf8').split(/\r?\n/);
    const filtered = lines.filter((line) => {
      const lower = line.toLowerCase();
      return !lower.includes('_authtoken') && !lower.trim().startsWith('always-auth');
    });
    fs.writeFileSync(userConfig, filtered.filter(Boolean).join('\n'));
  }

  delete process.env.NODE_AUTH_TOKEN;
}

export const NPM_PUBLISH_ORDER = [
  '@workbench-kit/contracts',
  '@workbench-kit/json-widget',
  '@workbench-kit/jdw-editor',
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
