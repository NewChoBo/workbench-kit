import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  NPM_PUBLISH_ORDER,
  NPM_REGISTRY,
  buildNpmPublishArgs,
  npmViewExists,
  packageDirectoryNameForPackageName,
  parsePublishMode,
  requireTrustedPublisherAuth,
} from './npm-publish-config.mjs';

const root = process.cwd();
const { dryRun, updatesOnly } = parsePublishMode();
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const registry = NPM_REGISTRY;
const packDir = path.join(root, '.npm-pack');

requireTrustedPublisherAuth('publish');

if (updatesOnly) {
  console.log('[publish] updates-only mode: skipping packages not yet on npm (use local publish first).');
}

const publishOrder = NPM_PUBLISH_ORDER;

resetDirectory(packDir);

for (const packageName of publishOrder) {
  const packageDir = packageDirFor(packageName);
  const pkg = readJson(path.join(packageDir, 'package.json'));
  const spec = `${pkg.name}@${pkg.version}`;

  if (isPublished(spec)) {
    console.log(`skip ${spec}: already published`);
    continue;
  }

  if (updatesOnly && !npmViewExists(pkg.name)) {
    console.log(`skip ${spec}: package not on npm yet (publish locally with publish-packages-local.mjs)`);
    continue;
  }

  const tarball = packPackage(pkg.name);
  const args = buildNpmPublishArgs({ tarball, distTag, dryRun });

  console.log(
    `${dryRun ? 'dry-run publish' : 'publish'} ${spec} with tag ${distTag} via trusted publishing`,
  );
  try {
    run('npm', args, { stdio: 'inherit' });
  } catch (error) {
    throw publishFailureError(pkg.name, error);
  }
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

function isPublished(spec) {
  return npmViewExists(spec, registry);
}

function publishFailureError(packageName, error) {
  return new Error(
    [
      `npm publish failed for ${packageName}.`,
      'Trusted publishing checklist:',
      '- npm Trusted Publisher: NewChoBo / workbench-kit / publish.yml (Environment blank).',
      '- First release of a package must use: node scripts/publish-packages-local.mjs',
      '- After local first publish, register the same trusted publisher on that package for CI updates.',
      error instanceof Error ? error.message : String(error),
    ].join('\n'),
    { cause: error },
  );
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
