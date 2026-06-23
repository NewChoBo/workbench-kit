import { lstatSync, readlinkSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const scanRoots = [
  join(repoRoot, 'node_modules'),
  join(repoRoot, 'packages'),
  join(repoRoot, 'examples'),
  join(repoRoot, 'extensions'),
];

const skippedDirectoryNames = new Set([
  '.git',
  '.vite',
  '.cache',
  'dist',
  'out',
  'build',
  'coverage',
  'storybook-static',
]);

/**
 * pnpm install must resolve dependencies only inside this repository.
 * Consumer monorepos must not appear in node_modules symlinks.
 */
function isInsideRepo(absolutePath) {
  const normalizedRepoRoot = repoRoot.toLowerCase();
  const normalizedTarget = resolve(absolutePath).toLowerCase();
  return (
    normalizedTarget === normalizedRepoRoot ||
    normalizedTarget.startsWith(`${normalizedRepoRoot}\\`) ||
    normalizedTarget.startsWith(`${normalizedRepoRoot}/`)
  );
}

function resolveLinkTarget(linkPath) {
  const rawTarget = readlinkSync(linkPath);
  return resolve(dirname(linkPath), rawTarget);
}

function collectNodeModuleLinks(currentPath, violations) {
  let entries;

  try {
    entries = readdirSync(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectoryNames.has(entry.name)) {
      continue;
    }

    const nextPath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        scanNodeModulesDirectory(nextPath, violations);
        continue;
      }

      collectNodeModuleLinks(nextPath, violations);
      continue;
    }

    if (!entry.isSymbolicLink()) {
      continue;
    }

    let targetPath;

    try {
      targetPath = resolveLinkTarget(nextPath);
    } catch {
      continue;
    }

    if (!isInsideRepo(targetPath)) {
      violations.push({
        link: nextPath,
        target: targetPath,
      });
    }
  }
}

function scanNodeModulesDirectory(nodeModulesPath, violations) {
  let entries;

  try {
    entries = readdirSync(nodeModulesPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const packagePath = join(nodeModulesPath, entry.name);

    if (entry.isDirectory() && entry.name.startsWith('@')) {
      let scopedEntries;

      try {
        scopedEntries = readdirSync(packagePath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const scopedEntry of scopedEntries) {
        inspectNodeModuleEntry(join(packagePath, scopedEntry.name), violations);
      }

      continue;
    }

    inspectNodeModuleEntry(packagePath, violations);
  }
}

function inspectNodeModuleEntry(packagePath, violations) {
  let stats;

  try {
    stats = lstatSync(packagePath);
  } catch {
    return;
  }

  if (!stats.isSymbolicLink()) {
    return;
  }

  let targetPath;

  try {
    targetPath = resolveLinkTarget(packagePath);
  } catch {
    return;
  }

  if (!isInsideRepo(targetPath)) {
    violations.push({
      link: packagePath,
      target: targetPath,
    });
  }
}

const violations = [];

for (const scanRoot of scanRoots) {
  try {
    if (!statSync(scanRoot).isDirectory()) {
      continue;
    }
  } catch {
    continue;
  }

  collectNodeModuleLinks(scanRoot, violations);
}

if (violations.length > 0) {
  console.error(
    'Workspace isolation check failed: node_modules symlinks resolve outside workbench-kit.',
  );
  console.error('Run `pnpm install` from the workbench-kit repository root only.');
  console.error(
    'Consumer apps must not list this repository’s packages/* in their pnpm-workspace.yaml.',
  );

  for (const violation of violations) {
    console.error(`  ${violation.link}`);
    console.error(`    -> ${violation.target}`);
  }

  process.exit(1);
}

console.log('Workspace isolation check passed (node_modules stay inside workbench-kit).');
process.exit(0);
