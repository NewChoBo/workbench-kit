import fs from 'node:fs';

export const NPM_REGISTRY = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org/';

export const PACKAGE_DIRECTORY_BY_NAME = {
  jdw: 'json-widget',
};

export function packageDirectoryNameForPackageName(packageName) {
  const shortName = packageName.replace('@workbench-kit/', '');
  return PACKAGE_DIRECTORY_BY_NAME[shortName] ?? shortName;
}

export function isTrustedPublisherAvailable() {
  return (
    process.env.GITHUB_ACTIONS === 'true' && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
  );
}

export function requireTrustedPublisherAuth(context = 'npm-publish') {
  if (process.env.NODE_AUTH_TOKEN?.trim()) {
    console.warn(
      `[${context}] Ignoring NODE_AUTH_TOKEN; npm publish uses GitHub Actions trusted publishing only.`,
    );
  }

  clearNpmRegistryAuth();

  if (!isTrustedPublisherAvailable()) {
    throw new Error(
      [
        'npm publish requires GitHub Actions trusted publishing (OIDC).',
        'Token auth (NPM_TOKEN / NODE_AUTH_TOKEN) is not supported.',
        'Run publish from publish.yml with permissions.id-token: write.',
        'For first-time package releases, use: node scripts/publish-packages-local.mjs',
        'Configure npm trusted publisher for NewChoBo/workbench-kit · Publish Workbench Kit / publish.yml.',
      ].join('\n'),
    );
  }
}

export function clearNpmRegistryAuth() {
  for (const configPath of npmUserConfigPaths()) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const lines = fs.readFileSync(configPath, 'utf8').split(/\r?\n/);
    const filtered = lines.filter((line) => {
      const lower = line.toLowerCase();
      return !lower.includes('_authtoken') && !lower.trim().startsWith('always-auth');
    });
    fs.writeFileSync(configPath, filtered.filter(Boolean).join('\n'));
  }

  delete process.env.NODE_AUTH_TOKEN;
  delete process.env.NPM_TOKEN;
}

export function buildNpmPublishArgs({ tarball, distTag, dryRun = false, provenance = true }) {
  const args = [
    'publish',
    tarball,
    '--access',
    'public',
    '--tag',
    distTag,
    '--registry',
    NPM_REGISTRY,
  ];

  if (provenance) {
    args.push('--provenance');
  } else {
    args.push('--provenance=false');
  }

  if (dryRun) {
    args.push('--dry-run');
  }

  return args;
}

function npmUserConfigPaths() {
  const paths = [];
  if (process.env.NPM_CONFIG_USERCONFIG) {
    paths.push(process.env.NPM_CONFIG_USERCONFIG);
  }
  if (process.env.HOME) {
    paths.push(`${process.env.HOME}/.npmrc`);
  }
  return paths;
}

export const NPM_PUBLISH_ORDER = [
  '@workbench-kit/base',
  '@workbench-kit/contracts',
  '@workbench-kit/platform',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workbench-config',
  '@workbench-kit/jdw',
  '@workbench-kit/runtime',
  '@workbench-kit/tokens',
  '@workbench-kit/workspace',
  '@workbench-kit/adapters',
  '@workbench-kit/services',
  '@workbench-kit/react',
  '@workbench-kit/jdw-editor',
];
