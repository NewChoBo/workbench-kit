import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const registry = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmjs.org/';
const packDir = path.join(root, '.npm-pack');

const publishOrder = [
  '@workbench-kit/contracts',
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

resetDirectory(packDir);

for (const packageName of publishOrder) {
  const packageDir = packageDirFor(packageName);
  const pkg = readJson(path.join(packageDir, 'package.json'));
  const spec = `${pkg.name}@${pkg.version}`;

  if (isPublished(spec)) {
    console.log(`skip ${spec}: already published`);
    continue;
  }

  const tarball = packPackage(pkg.name);
  const args = ['publish', tarball, '--access', 'public', '--tag', distTag, '--registry', registry];
  if (dryRun) {
    args.push('--dry-run');
  }

  console.log(`${dryRun ? 'dry-run publish' : 'publish'} ${spec} with tag ${distTag}`);
  run('npm', args, { stdio: 'inherit' });
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

function isPublished(spec) {
  try {
    run('npm', ['view', spec, 'version', '--registry', registry], {
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
