const dependencyFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];

export function validatePackedPackageCohort({ expectedPackageNames, expectedVersion, manifests }) {
  const expectedNames = new Set(expectedPackageNames);
  const errors = [];

  for (const packageName of expectedPackageNames) {
    const manifest = manifests.get(packageName);
    if (!manifest) {
      errors.push(`${packageName}: packed manifest is missing`);
      continue;
    }

    if (manifest.name !== packageName) {
      errors.push(`${packageName}: packed name is ${String(manifest.name)}`);
    }
    if (manifest.version !== expectedVersion) {
      errors.push(
        `${packageName}: packed version ${String(manifest.version)} does not match ${expectedVersion}`,
      );
    }

    for (const field of dependencyFields) {
      for (const [dependencyName, dependencyVersion] of Object.entries(manifest[field] ?? {})) {
        if (typeof dependencyVersion !== 'string') continue;

        if (dependencyVersion.startsWith('workspace:')) {
          errors.push(`${packageName}: ${field}.${dependencyName} retains ${dependencyVersion}`);
        }

        if (!dependencyName.startsWith('@workbench-kit/')) continue;
        if (!expectedNames.has(dependencyName)) {
          errors.push(`${packageName}: ${field} references unpublished ${dependencyName}`);
          continue;
        }
        if (dependencyVersion !== expectedVersion) {
          errors.push(
            `${packageName}: ${field}.${dependencyName} is ${dependencyVersion}, expected ${expectedVersion}`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Packed package cohort is inconsistent:\n${errors.join('\n')}`);
  }

  return expectedPackageNames.length;
}
