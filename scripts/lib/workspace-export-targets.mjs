import fs from 'node:fs';
import path from 'node:path';

import { runCommand } from './run-command.mjs';

export function collectExportTargets(value) {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectExportTargets);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectExportTargets);
  }

  return [];
}

export function findMissingGeneratedExportTargets(workspacePackages) {
  return [
    ...new Set(
      workspacePackages.flatMap((workspacePackage) => {
        const { packageJson } = workspacePackage;
        const entryTargets = [
          ...collectExportTargets(packageJson.exports),
          packageJson.main,
          packageJson.types,
        ];

        return entryTargets
          .filter((target) => typeof target === 'string' && target.startsWith('./dist/'))
          .filter((target) => !fs.existsSync(path.join(workspacePackage.directory, target)))
          .map((target) => `${packageJson.name}:${target}`);
      }),
    ),
  ];
}

export function ensureGeneratedWorkspaceExportTargets({
  logPrefix,
  repoRoot,
  run = runCommand,
  workspacePackages,
}) {
  const missingTargets = findMissingGeneratedExportTargets(workspacePackages);
  if (missingTargets.length === 0) {
    return [];
  }

  console.log(
    `[${logPrefix}] Building workspace artifacts for ${missingTargets.length} missing generated target(s)...`,
  );
  run('pnpm', ['build:workspace'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const remainingTargets = findMissingGeneratedExportTargets(workspacePackages);
  if (remainingTargets.length > 0) {
    throw new Error(
      `Workspace build did not create generated export target(s): ${remainingTargets.join(', ')}`,
    );
  }

  return missingTargets;
}
