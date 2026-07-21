import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  NPM_PUBLISH_ORDER,
  NPM_REGISTRY,
  buildNpmPublishArgs,
  packageDirectoryNameForPackageName,
} from './npm-publish-config.mjs';

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const newOnly = process.argv.includes('--new-only') || !process.argv.includes('--all');
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const packDir = path.join(root, '.npm-pack');

assertLocalNpmAuth();

resetDirectory(packDir);

for (const packageName of NPM_PUBLISH_ORDER) {
  const packageDir = packageDirFor(packageName);
  const pkg = readJson(path.join(packageDir, 'package.json'));
  const spec = `${pkg.name}@${pkg.version}`;

  if (newOnly && isPublished(spec)) {
    console.log(`skip ${spec}: already on npm`);
    continue;
  }

  const tarball = packPackage(pkg.name);
  const args = buildNpmPublishArgs({ tarball, distTag, dryRun, provenance: false });

  console.log(
    `${dryRun ? 'dry-run publish' : 'publish'} ${spec} with tag ${distTag} via local npm auth`,
  );
  run('npm', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_provenance: 'false',
    },
  });
}

function assertLocalNpmAuth() {
  if (process.env.GITHUB_ACTIONS === 'true') {
    throw new Error(
      'Local npm publish is not allowed in GitHub Actions. Use publish.yml (trusted publishing) instead.',
    );
  }

  try {
    const whoami = run('npm', ['whoami', '--registry', NPM_REGISTRY], { encoding: 'utf8' }).trim();
    console.log(`[publish-local] npm auth ok (${whoami})`);
  } catch {
    throw new Error(
      [
        'Local npm publish requires an authenticated npm session.',
        'Run `npm login` (2FA) or set NODE_AUTH_TOKEN, then retry.',
        'Use this script only for first-time package releases.',
        'Routine version updates should go through publish.yml on tag push.',
      ].join('\n'),
    );
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
  try {
    run('npm', ['view', spec, 'version', '--registry', NPM_REGISTRY], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
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
  const { env: envOverride, ...restOptions } = options;
  const env = envOverride ? { ...process.env, ...envOverride } : process.env;

  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].map(quoteCmdArg).join(' ')],
      {
        cwd: root,
        env,
        ...restOptions,
      },
    );
  }

  return execFileSync(command, args, {
    cwd: root,
    env,
    ...restOptions,
  });
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/(["^&|<>])/g, '^$1')}"`;
}
