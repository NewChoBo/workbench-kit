import fs from 'node:fs';

import { runCommand } from './lib/run-command.mjs';

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
    fs.writeFileSync(
      configPath,
      filtered.filter(Boolean).join('\n') + (filtered.length ? '\n' : ''),
    );
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
  if (process.env.GITHUB_WORKSPACE) {
    paths.push(`${process.env.GITHUB_WORKSPACE}/.npmrc`);
  }
  paths.push(pathJoinCwdNpmrc());
  return [...new Set(paths)];
}

function pathJoinCwdNpmrc() {
  return `${process.cwd()}/.npmrc`;
}

export function npmViewExists(specOrName, registry = NPM_REGISTRY, run = runCommand) {
  try {
    run('npm', ['view', specOrName, 'version', '--registry', registry], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    if (/\bE404\b/u.test(npmErrorOutput(error))) {
      return false;
    }

    throw new Error(
      `npm registry lookup failed for ${specOrName}; refusing to treat the package as unpublished.`,
      { cause: error },
    );
  }
}

function npmErrorOutput(error) {
  if (typeof error !== 'object' || error === null) {
    return String(error);
  }

  return [error.stderr, error.stdout, error.message]
    .filter((value) => typeof value === 'string' || Buffer.isBuffer(value))
    .map(String)
    .join('\n');
}

export function probePackageForTrustedPublisher() {
  for (const packageName of NPM_PUBLISH_ORDER) {
    if (npmViewExists(packageName)) {
      return packageName;
    }
  }

  return NPM_PUBLISH_ORDER[0];
}

export function isCiPublishPackage(packageName) {
  return NPM_CI_PUBLISH_PACKAGES.has(packageName);
}

export function parsePublishMode(argv = process.argv, env = process.env) {
  const dryRun = argv.includes('--dry-run') || env.DRY_RUN === 'true';
  const updatesOnly =
    argv.includes('--updates-only') ||
    (env.NPM_PUBLISH_UPDATES_ONLY === 'true' && !argv.includes('--all'));

  return { dryRun, updatesOnly };
}

export const NPM_PUBLISH_ORDER = [
  '@workbench-kit/base',
  '@workbench-kit/contracts',
  '@workbench-kit/logging',
  '@workbench-kit/platform',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workbench-config',
  '@workbench-kit/workbench-core',
  '@workbench-kit/jdw',
  '@workbench-kit/runtime',
  '@workbench-kit/tokens',
  '@workbench-kit/workspace',
  '@workbench-kit/monaco',
  '@workbench-kit/adapters',
  '@workbench-kit/services',
  '@workbench-kit/react',
  '@workbench-kit/jdw-editor',
  '@workbench-kit/field-remap',
  '@workbench-kit/shell-react',
  '@workbench-kit/electron-shell',
];

// All public publish packages are CI targets.
// publish.yml publishes missing exact versions via OIDC, including first releases.
// publish-packages-local.mjs remains a fallback when Trusted Publisher is unavailable.
export const NPM_CI_PUBLISH_PACKAGES = new Set(NPM_PUBLISH_ORDER);
