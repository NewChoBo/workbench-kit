import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { NPM_PUBLISH_ORDER, NPM_REGISTRY } from './npm-publish-config.mjs';

const root = process.cwd();
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const packDir = path.join(root, '.npm-pack-preflight');
const trustedPublisherAvailable =
  process.env.GITHUB_ACTIONS === 'true' && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
const hasAuthToken = Boolean(process.env.NODE_AUTH_TOKEN);

console.log('[preflight-npm] Checking npm registry connectivity...');
run('npm', ['ping', '--registry', NPM_REGISTRY]);

if (!hasAuthToken && !trustedPublisherAvailable) {
  throw new Error(
    [
      'No npm auth path is available for publish preflight.',
      'Configure either:',
      '- GitHub Actions trusted publishing (permissions.id-token: write + npm trusted publisher), or',
      '- Repository secret NPM_TOKEN for classic/granular token auth.',
    ].join('\n'),
  );
}

let actor = 'unknown';
if (hasAuthToken) {
  try {
    actor = run('npm', ['whoami', '--registry', NPM_REGISTRY], { encoding: 'utf8' }).trim();
    console.log(`[preflight-npm] Authenticated as ${actor} via NODE_AUTH_TOKEN.`);
  } catch {
    throw new Error(
      'npm whoami failed with NODE_AUTH_TOKEN. Check NPM_TOKEN secret value, expiry, and automation/2FA settings.',
    );
  }

  try {
    const packages = run(
      'npm',
      ['access', 'list', 'packages', '@workbench-kit', '--registry', NPM_REGISTRY],
      { encoding: 'utf8' },
    ).trim();
    console.log(
      packages
        ? `[preflight-npm] Scope packages visible to ${actor}:\n${packages}`
        : `[preflight-npm] No published @workbench-kit packages yet for ${actor}.`,
    );
  } catch {
    console.warn(
      '[preflight-npm] Could not list @workbench-kit packages. Verify org membership before first publish.',
    );
  }
} else {
  actor = 'github-actions-trusted-publisher';
  console.log(
    '[preflight-npm] NODE_AUTH_TOKEN is not set; using GitHub Actions trusted publishing (OIDC).',
  );
  console.log('[preflight-npm] Skipping npm whoami because OIDC auth is resolved at publish time.');
}

resetDirectory(packDir);

const probePackage = NPM_PUBLISH_ORDER[0];
const probeDir = packageDirFor(probePackage);
const probeJson = readJson(path.join(probeDir, 'package.json'));
const probeSpec = `${probeJson.name}@${probeJson.version}`;
const tarball = packPackage(probePackage);

const args = [
  'publish',
  tarball,
  '--access',
  'public',
  '--tag',
  distTag,
  '--registry',
  NPM_REGISTRY,
  '--dry-run',
];
if (!trustedPublisherAvailable) {
  args.push('--provenance=false');
}

console.log(`[preflight-npm] Dry-run publish probe for ${probeSpec}...`);
try {
  run('npm', args, { stdio: 'inherit' });
} catch {
  throw publishPermissionError(actor, probeJson.name, { hasAuthToken, trustedPublisherAvailable });
}

console.log('[preflight-npm] Publish auth preflight passed.');

function publishPermissionError(actor, packageName, auth) {
  const hints = [
    `npm publish preflight failed for ${packageName}.`,
    `Auth mode: ${auth.trustedPublisherAvailable ? 'trusted-publisher' : 'token'} (${actor})`,
  ];

  if (auth.trustedPublisherAvailable && !auth.hasAuthToken) {
    hints.push(
      '- Trusted publisher may be missing or mismatched for NewChoBo/newchobo-ui-package / publish.yml.',
      '- Confirm npm org workbench-kit grants publish access to the trusted publisher owner account.',
    );
  } else {
    hints.push(
      '- NODE_AUTH_TOKEN may lack publish permission for @workbench-kit.',
      '- Use an Automation token when npm 2FA is enabled.',
    );
  }

  hints.push(
    'Common causes for npm E404/E401 on scoped publish:',
    '- The @workbench-kit npm organization exists but this auth path is not a member.',
    '- Trusted publishing is configured for a different repository, workflow, or environment.',
    'Verify on npmjs.com: org membership, trusted publisher settings, and package access.',
  );

  return new Error(hints.join('\n'));
}

function packageDirFor(packageName) {
  const shortName = packageName.replace('@workbench-kit/', '');
  return path.join(root, 'packages', shortName);
}

function packPackage(packageName) {
  const output = run(
    'pnpm',
    ['--filter', packageName, 'pack', '--pack-destination', packDir, '--json'],
    { encoding: 'utf8' },
  );
  const result = JSON.parse(output.trim());
  return result.filename;
}

function resetDirectory(target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing to remove directory outside repository: ${resolvedTarget}`);
  }
  fs.rmSync(resolvedTarget, { recursive: true, force: true });
  fs.mkdirSync(resolvedTarget, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, options = {}) {
  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteCmdArg).join(' ')],
      {
        cwd: root,
        ...options,
      },
    );
  }

  return execFileSync(command, args, {
    cwd: root,
    ...options,
  });
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/(["^&|<>])/g, '^$1')}"`;
}
