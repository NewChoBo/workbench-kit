import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  NPM_REGISTRY,
  buildNpmPublishArgs,
  packageDirectoryNameForPackageName,
  probePackageForTrustedPublisher,
  requireTrustedPublisherAuth,
} from './npm-publish-config.mjs';

const root = process.cwd();
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const packDir = path.join(root, '.npm-pack-preflight');

requireTrustedPublisherAuth('preflight-npm');

console.log('[preflight-npm] Checking npm registry connectivity...');
run('npm', ['ping', '--registry', NPM_REGISTRY]);

console.log('[preflight-npm] Using GitHub Actions trusted publishing (OIDC).');
console.log('[preflight-npm] Skipping npm whoami because OIDC auth is resolved at publish time.');

resetDirectory(packDir);

const probePackage = probePackageForTrustedPublisher();
const probeDir = packageDirFor(probePackage);
const probeJson = readJson(path.join(probeDir, 'package.json'));
const probeSpec = `${probeJson.name}@${probeJson.version}`;
const tarball = packPackage(probePackage);

const args = buildNpmPublishArgs({ tarball, distTag, dryRun: true });

console.log(`[preflight-npm] Dry-run publish probe for ${probeSpec}...`);
console.log(
  '[preflight-npm] Note: dry-run may pass even when OIDC auth fails on real publish. Each package needs its own trusted publisher (or org-level publisher).',
);
try {
  run('npm', args, { stdio: 'inherit' });
} catch {
  throw publishPermissionError(probeJson.name);
}

console.log('[preflight-npm] Publish auth preflight passed.');

function publishPermissionError(packageName) {
  return new Error(
    [
      `npm publish preflight failed for ${packageName}.`,
      'Auth mode: trusted-publisher (github-actions-trusted-publisher)',
      '- Trusted publisher may be missing or mismatched for NewChoBo/workbench-kit / publish.yml.',
      '- If Environment is set on npm, publish.yml must use the same GitHub environment name (or clear Environment on npm).',
      '- New packages such as @workbench-kit/base need trusted publisher registration before first publish.',
      '- Confirm npm org @workbench-kit grants publish access to the trusted publisher owner account.',
      'Common causes for npm E404/E401 on scoped publish:',
      '- The @workbench-kit npm organization exists but trusted publishing is not configured for this repo/workflow.',
      '- Trusted publishing is configured for a different repository, workflow, or environment.',
      'Verify on npmjs.com: org membership, trusted publisher settings, and package access.',
    ].join('\n'),
  );
}

function packageDirFor(packageName) {
  return path.join(root, 'packages', packageDirectoryNameForPackageName(packageName));
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
