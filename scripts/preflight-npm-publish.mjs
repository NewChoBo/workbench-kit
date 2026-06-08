import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { NPM_PUBLISH_ORDER, NPM_REGISTRY } from './npm-publish-config.mjs';

const root = process.cwd();
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const packDir = path.join(root, '.npm-pack-preflight');
const trustedPublisherAvailable =
  process.env.GITHUB_ACTIONS === 'true' && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);

console.log('[preflight-npm] Checking npm registry connectivity...');
run('npm', ['ping', '--registry', NPM_REGISTRY]);

if (!process.env.NODE_AUTH_TOKEN && process.env.GITHUB_ACTIONS === 'true') {
  throw new Error(
    'NODE_AUTH_TOKEN is missing. Configure an npm token secret for trusted publishing or classic token auth.',
  );
}

const whoami = run('npm', ['whoami', '--registry', NPM_REGISTRY], { encoding: 'utf8' }).trim();
console.log(`[preflight-npm] Authenticated as ${whoami}`);

try {
  const packages = run(
    'npm',
    ['access', 'list', 'packages', '@workbench-kit', '--registry', NPM_REGISTRY],
    { encoding: 'utf8' },
  ).trim();
  console.log(
    packages
      ? `[preflight-npm] Scope packages visible to ${whoami}:\n${packages}`
      : `[preflight-npm] No published @workbench-kit packages yet for ${whoami}.`,
  );
} catch {
  console.warn(
    '[preflight-npm] Could not list @workbench-kit packages. Verify org membership before first publish.',
  );
}

resetDirectory(packDir);

const probePackage = NPM_PUBLISH_ORDER[0];
const probeDir = packageDirFor(probePackage);
const probeJson = readJson(path.join(probeDir, 'package.json'));
const probeSpec = `${probeJson.name}@${probeJson.version}`;
const tarball = packPackage(probePackage);

const args = ['publish', tarball, '--access', 'public', '--tag', distTag, '--registry', NPM_REGISTRY, '--dry-run'];
if (!trustedPublisherAvailable) {
  args.push('--provenance=false');
}

console.log(`[preflight-npm] Dry-run publish probe for ${probeSpec}...`);
try {
  run('npm', args, { stdio: 'inherit' });
} catch {
  throw publishPermissionError(whoami, probeJson.name);
}

console.log('[preflight-npm] Publish auth preflight passed.');

function publishPermissionError(actor, packageName) {
  return new Error(
    [
      `npm publish preflight failed for ${packageName}.`,
      `Authenticated user: ${actor}`,
      'Common causes for npm E404 on scoped first publish:',
      '- The @workbench-kit npm organization does not exist or this user is not a member.',
      '- NODE_AUTH_TOKEN / trusted publisher lacks publish permission for @workbench-kit.',
      '- Trusted publishing is configured for a different repository or package name.',
      'Verify on npmjs.com: org membership, package access, and trusted publisher settings.',
    ].join('\n'),
  );
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
