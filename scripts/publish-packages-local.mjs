import fs from 'node:fs';
import path from 'node:path';
import {
  NPM_PUBLISH_ORDER,
  NPM_REGISTRY,
  buildNpmPublishArgs,
  npmViewExists,
  packageDirectoryNameForPackageName,
} from './npm-publish-config.mjs';
import { runCommand } from './lib/run-command.mjs';
import { buildFreshWorkspaceArtifacts } from './lib/workspace-export-targets.mjs';
import { preparePublishCandidates } from './lib/prepare-publish-candidates.mjs';

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const newOnly = process.argv.includes('--new-only') || !process.argv.includes('--all');
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const packDir = path.join(root, '.npm-pack');

assertLocalNpmAuth();

const packages = NPM_PUBLISH_ORDER.map((packageName) => {
  const directory = packageDirFor(packageName);
  return { directory, packageJson: readJson(path.join(directory, 'package.json')) };
});
const publishCandidates = preparePublishCandidates({
  isPackagePublished: () => true,
  isVersionPublished: isPublished,
  onPrepare: () => {
    resetDirectory(packDir);
    buildFreshWorkspaceArtifacts({ logPrefix: 'publish-local', repoRoot: root });
  },
  onSkip: ({ spec }) => {
    console.log(`skip ${spec}: already on npm`);
  },
  packages,
  publishNewPackages: true,
  skipPublishedVersions: newOnly,
});

for (const { packageJson: pkg } of publishCandidates) {
  const spec = `${pkg.name}@${pkg.version}`;

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
  return npmViewExists(spec, NPM_REGISTRY);
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
  return runCommand(command, args, {
    cwd: root,
    env,
    ...restOptions,
  });
}
