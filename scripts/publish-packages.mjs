import fs from 'node:fs';
import path from 'node:path';
import {
  NPM_PUBLISH_ORDER,
  NPM_REGISTRY,
  buildNpmPublishArgs,
  clearNpmRegistryAuth,
  isTrustedPublisherAvailable,
  npmViewExists,
  packWorkspacePackage,
  packageDirectoryNameForPackageName,
  parsePublishMode,
  requireTrustedPublisherAuth,
} from './npm-publish-config.mjs';
import { runCommand } from './lib/run-command.mjs';
import { buildFreshWorkspaceArtifacts } from './lib/workspace-export-targets.mjs';
import { preparePublishCandidates } from './lib/prepare-publish-candidates.mjs';

const root = process.cwd();
const { dryRun, updatesOnly } = parsePublishMode();
const distTag = process.env.NPM_DIST_TAG || 'prototype';
const registry = NPM_REGISTRY;
const packDir = path.join(root, '.npm-pack');

requireTrustedPublisherAuth('publish');

if (updatesOnly) {
  console.log(
    '[publish] CI updates-only mode: publish NPM_PUBLISH_ORDER packages that already exist on npm.',
  );
}

const publishOrder = NPM_PUBLISH_ORDER;
const packages = publishOrder.map((packageName) => {
  const directory = packageDirFor(packageName);
  return { directory, packageJson: readJson(path.join(directory, 'package.json')) };
});
const publishCandidates = preparePublishCandidates({
  isPackagePublished: (packageName) => npmViewExists(packageName),
  isVersionPublished: isPublished,
  onPrepare: () => {
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });
    buildFreshWorkspaceArtifacts({ logPrefix: 'publish', repoRoot: root });
  },
  onSkip: ({ reason, spec }) => {
    if (reason === 'version-published') {
      console.log(`skip ${spec}: already published`);
      return;
    }

    console.log(
      `skip ${spec}: package not on npm yet (enable CI first-publish by setting NPM_PUBLISH_UPDATES_ONLY=false)`,
    );
  },
  packages,
  publishNewPackages: !updatesOnly,
});

for (const { packageJson: pkg } of publishCandidates) {
  const spec = `${pkg.name}@${pkg.version}`;

  const tarball = packWorkspacePackage({ packageName: pkg.name, packDir, run });
  const args = buildNpmPublishArgs({ tarball, distTag, dryRun });

  console.log(
    `${dryRun ? 'dry-run publish' : 'publish'} ${spec} with tag ${distTag} via trusted publishing`,
  );
  try {
    publishWithTrustedAuth(args);
  } catch (error) {
    throw publishFailureError(pkg.name, error);
  }

  // Brief pause between packages — long OIDC + provenance batches have hit
  // intermittent ENEEDAUTH mid-run even when Trusted Publisher is configured.
  if (!dryRun) {
    sleepMs(1500);
  }
}

function publishWithTrustedAuth(args) {
  const maxAttempts = isTrustedPublisherAvailable() ? 5 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    clearNpmRegistryAuth();

    try {
      run('npm', args, { stdio: 'inherit' });
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      const backoffMs = attempt * 3000;
      console.warn(
        `[publish] npm publish failed (attempt ${attempt}/${maxAttempts}); clearing auth and retrying OIDC in ${backoffMs}ms...`,
      );
      sleepMs(backoffMs);
    }
  }
}

function sleepMs(ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  try {
    runCommand('sleep', [String(seconds)], { stdio: 'ignore' });
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* busy-wait fallback when `sleep` is unavailable */
    }
  }
}

function packageDirFor(packageName) {
  return path.join(root, 'packages', packageDirectoryNameForPackageName(packageName));
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
      '- First releases also go through publish.yml (OIDC); local publish-packages-local.mjs is fallback only.',
      '- Ensure the package (or org policy) allows this repository as Trusted Publisher.',
      error instanceof Error ? error.message : String(error),
    ].join('\n'),
    { cause: error },
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, options = {}) {
  clearNpmRegistryAuth();
  return runCommand(command, args, {
    cwd: root,
    ...options,
  });
}
