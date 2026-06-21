import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const stringArrayFields = [
  'activationEvents',
  'extensionDependencies',
  'extensionOptionalDependencies',
  'extensionPack',
  'permissions',
];

export async function readWorkbenchExtensionManifestEntries(repoRoot) {
  const extensionsRoot = path.join(repoRoot, 'extensions');
  const directoryEntries = await readdir(extensionsRoot, { withFileTypes: true });
  const directories = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const entries = [];

  for (const directory of directories) {
    const extensionDirectory = path.join(extensionsRoot, directory);
    const manifestPath = path.join(extensionDirectory, 'workbench.extension.json');

    if (!existsSync(manifestPath)) {
      continue;
    }

    const packageJsonPath = path.join(extensionDirectory, 'package.json');

    entries.push({
      directory,
      extensionDirectory,
      extensionPath: path.join('extensions', directory).replaceAll(path.sep, '/'),
      manifest: JSON.parse(await readFile(manifestPath, 'utf8')),
      manifestPath,
      packageJson: existsSync(packageJsonPath)
        ? JSON.parse(await readFile(packageJsonPath, 'utf8'))
        : undefined,
      packageJsonPath,
    });
  }

  return entries;
}

export function validateWorkbenchExtensionManifests(entries, repoRoot) {
  const violations = [];
  const entriesById = new Map();

  for (const entry of entries) {
    validateManifestShape(entry, violations, repoRoot);
    validateExtensionPackage(entry, violations, repoRoot);

    const id = stringValue(entry.manifest.id);
    if (!id) {
      continue;
    }

    const existing = entriesById.get(id);
    if (existing) {
      violations.push({
        location: relativePath(entry.manifestPath, repoRoot),
        message: `Extension id "${id}" is already declared by ${relativePath(
          existing.manifestPath,
          repoRoot,
        )}.`,
        rule: 'duplicate-extension-id',
      });
      continue;
    }

    entriesById.set(id, entry);
  }

  validateKnownExtensionReferences(entries, entriesById, violations, repoRoot);
  validateHardDependencyCycles(entries, entriesById, violations, repoRoot);

  return violations;
}

export function formatManifestViolations(violations) {
  return violations
    .map((violation) => `${violation.location} [${violation.rule}] ${violation.message}`)
    .join('\n');
}

function validateManifestShape(entry, violations, repoRoot) {
  const manifest = entry.manifest;

  if (!isRecord(manifest)) {
    violations.push({
      location: relativePath(entry.manifestPath, repoRoot),
      message: 'Manifest must be a JSON object.',
      rule: 'manifest-shape',
    });
    return;
  }

  if (manifest.schemaVersion !== 1) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'schemaVersion', repoRoot),
      message: 'schemaVersion must be 1.',
      rule: 'manifest-schema-version',
    });
  }

  for (const field of ['id', 'name', 'displayName', 'version', 'publisher']) {
    if (!stringValue(manifest[field])) {
      violations.push({
        location: fieldLocation(entry.manifestPath, field, repoRoot),
        message: `${field} must be a non-empty string.`,
        rule: 'manifest-required-field',
      });
    }
  }

  const id = stringValue(manifest.id);
  const publisher = stringValue(manifest.publisher);
  if (id && publisher && !id.startsWith(`${publisher}.`)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'id', repoRoot),
      message: `Extension id "${id}" must be publisher-qualified with "${publisher}.".`,
      rule: 'manifest-publisher-qualified-id',
    });
  }

  if (!isRecord(manifest.engines)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'engines', repoRoot),
      message: 'engines must declare workbench and extensionApi ranges.',
      rule: 'manifest-engines',
    });
  } else {
    for (const field of ['workbench', 'extensionApi']) {
      if (!stringValue(manifest.engines[field])) {
        violations.push({
          location: fieldLocation(entry.manifestPath, `engines.${field}`, repoRoot),
          message: `engines.${field} must be a non-empty string.`,
          rule: 'manifest-engines',
        });
      }
    }
  }

  for (const field of stringArrayFields) {
    validateStringArrayField(entry, field, violations, repoRoot);
  }

  validateCapabilities(entry, violations, repoRoot);
  validateContributes(entry, violations, repoRoot);
}

function validateExtensionPackage(entry, violations, repoRoot) {
  if (!entry.packageJson) {
    violations.push({
      location: relativePath(entry.packageJsonPath, repoRoot),
      message: 'Extension directory must include package.json.',
      rule: 'extension-package-missing',
    });
    return;
  }

  const packageName = stringValue(entry.packageJson.name);
  if (!packageName) {
    violations.push({
      location: fieldLocation(entry.packageJsonPath, 'name', repoRoot),
      message: 'Extension package name must be a non-empty string.',
      rule: 'extension-package-name',
    });
  }

  if (entry.packageJson.private !== true) {
    violations.push({
      location: fieldLocation(entry.packageJsonPath, 'private', repoRoot),
      message: 'Repository-local extensions must remain private packages.',
      rule: 'extension-package-private',
    });
  }

  if (entry.packageJson.type !== 'module') {
    violations.push({
      location: fieldLocation(entry.packageJsonPath, 'type', repoRoot),
      message: 'Extension packages must be ESM modules.',
      rule: 'extension-package-module-type',
    });
  }

  const sdkDependency =
    entry.packageJson.dependencies?.['@workbench-kit/workbench-extension-sdk'] ??
    entry.packageJson.peerDependencies?.['@workbench-kit/workbench-extension-sdk'];

  if (sdkDependency !== 'workspace:*') {
    violations.push({
      location: fieldLocation(entry.packageJsonPath, 'dependencies', repoRoot),
      message:
        'Extension packages must depend on @workbench-kit/workbench-extension-sdk with workspace:*.',
      rule: 'extension-sdk-dependency',
    });
  }
}

function validateStringArrayField(entry, field, violations, repoRoot) {
  const value = entry.manifest[field];
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, field, repoRoot),
      message: `${field} must be an array of non-empty strings.`,
      rule: 'manifest-string-array',
    });
    return;
  }

  const seen = new Set();
  for (const [index, item] of value.entries()) {
    if (!stringValue(item)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, `${field}[${index}]`, repoRoot),
        message: `${field} entries must be non-empty strings.`,
        rule: 'manifest-string-array',
      });
      continue;
    }

    if (seen.has(item)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, field, repoRoot),
        message: `${field} must not contain duplicate entry "${item}".`,
        rule: 'manifest-duplicate-array-entry',
      });
    }
    seen.add(item);
  }
}

function validateCapabilities(entry, violations, repoRoot) {
  const { capabilities } = entry.manifest;
  if (capabilities === undefined) {
    return;
  }

  if (!isRecord(capabilities)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'capabilities', repoRoot),
      message: 'capabilities must be an object with optional requires/provides arrays.',
      rule: 'manifest-capabilities',
    });
    return;
  }

  for (const field of ['requires', 'provides']) {
    const value = capabilities[field];
    if (value === undefined) {
      continue;
    }

    if (!Array.isArray(value)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, `capabilities.${field}`, repoRoot),
        message: `capabilities.${field} must be an array of non-empty strings.`,
        rule: 'manifest-capabilities',
      });
      continue;
    }

    const seen = new Set();
    for (const [index, item] of value.entries()) {
      if (!stringValue(item)) {
        violations.push({
          location: fieldLocation(entry.manifestPath, `capabilities.${field}[${index}]`, repoRoot),
          message: `capabilities.${field} entries must be non-empty strings.`,
          rule: 'manifest-capabilities',
        });
        continue;
      }

      if (seen.has(item)) {
        violations.push({
          location: fieldLocation(entry.manifestPath, `capabilities.${field}`, repoRoot),
          message: `capabilities.${field} must not contain duplicate entry "${item}".`,
          rule: 'manifest-capabilities',
        });
      }
      seen.add(item);
    }
  }
}

function validateContributes(entry, violations, repoRoot) {
  const { contributes } = entry.manifest;
  if (contributes === undefined) {
    return;
  }

  if (!isRecord(contributes)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'contributes', repoRoot),
      message: 'contributes must be an object.',
      rule: 'manifest-contributes',
    });
    return;
  }

  validateContributionArray(entry, contributes, 'commands', violations, repoRoot, (item) => [
    ['command', stringValue(item.command)],
    ['title', stringValue(item.title)],
  ]);
  validateContributionArray(entry, contributes, 'keybindings', violations, repoRoot, (item) => [
    ['command', stringValue(item.command)],
    ['key', stringValue(item.key)],
  ]);
  validateContributionArray(entry, contributes, 'activities', violations, repoRoot, (item) => [
    ['id', stringValue(item.id)],
    ['viewContainerId', stringValue(item.viewContainerId)],
    ['icon', stringValue(item.icon)],
    ['title', stringValue(item.title)],
  ]);
  validateContributionArray(entry, contributes, 'editors', violations, repoRoot, (item) => [
    ['id', stringValue(item.id)],
    ['label', stringValue(item.label)],
  ]);
  validateContributionArray(entry, contributes, 'documentViews', violations, repoRoot, (item) => [
    ['id', stringValue(item.id)],
    ['kind', item.kind === 'form' || item.kind === 'preview'],
    ['label', stringValue(item.label)],
  ]);
  validateContributionArray(entry, contributes, 'themes', violations, repoRoot, (item) => [
    ['id', stringValue(item.id)],
    ['label', stringValue(item.label)],
  ]);
  validateContributionArray(entry, contributes, 'localizations', violations, repoRoot, (item) => [
    ['locale', stringValue(item.locale)],
    ['label', stringValue(item.label)],
    ['translations', isRecord(item.translations)],
  ]);
  validateConfigurationContribution(entry, contributes.configuration, violations, repoRoot);
  validateMenuContributions(entry, contributes, violations, repoRoot);
  validateContributionArrayMap(
    entry,
    contributes,
    'viewContainers',
    violations,
    repoRoot,
    (item) => [
      ['id', stringValue(item.id)],
      ['title', stringValue(item.title)],
    ],
  );
  validateContributionArrayMap(entry, contributes, 'views', violations, repoRoot, (item) => [
    ['id', stringValue(item.id)],
    ['name', stringValue(item.name)],
  ]);
}

function validateContributionArray(
  entry,
  contributes,
  field,
  violations,
  repoRoot,
  requiredFields,
) {
  const value = contributes[field];
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, `contributes.${field}`, repoRoot),
      message: `contributes.${field} must be an array.`,
      rule: 'manifest-contributes',
    });
    return;
  }

  validateContributionItems(
    entry,
    `contributes.${field}`,
    value,
    violations,
    repoRoot,
    requiredFields,
  );
}

function validateContributionArrayMap(
  entry,
  contributes,
  field,
  violations,
  repoRoot,
  requiredFields,
) {
  const value = contributes[field];
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, `contributes.${field}`, repoRoot),
      message: `contributes.${field} must be an object whose values are contribution arrays.`,
      rule: 'manifest-contributes',
    });
    return;
  }

  for (const [surface, items] of Object.entries(value)) {
    if (!Array.isArray(items)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, `contributes.${field}.${surface}`, repoRoot),
        message: `contributes.${field}.${surface} must be an array.`,
        rule: 'manifest-contributes',
      });
      continue;
    }

    validateContributionItems(
      entry,
      `contributes.${field}.${surface}`,
      items,
      violations,
      repoRoot,
      requiredFields,
    );
  }
}

function validateMenuContributions(entry, contributes, violations, repoRoot) {
  const value = contributes.menus;
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    validateContributionItems(entry, 'contributes.menus', value, violations, repoRoot, (item) => [
      ['menu', stringValue(item.menu)],
      ['command', stringValue(item.command)],
    ]);
    return;
  }

  if (!isRecord(value)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'contributes.menus', repoRoot),
      message:
        'contributes.menus must be an array or an object whose values are contribution arrays.',
      rule: 'manifest-contributes',
    });
    return;
  }

  for (const [surface, items] of Object.entries(value)) {
    if (!Array.isArray(items)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, `contributes.menus.${surface}`, repoRoot),
        message: `contributes.menus.${surface} must be an array.`,
        rule: 'manifest-contributes',
      });
      continue;
    }

    validateContributionItems(
      entry,
      `contributes.menus.${surface}`,
      items,
      violations,
      repoRoot,
      (item) => [['command', stringValue(item.command)]],
    );
  }
}

function validateContributionItems(entry, field, items, violations, repoRoot, requiredFields) {
  for (const [index, value] of items.entries()) {
    if (!isRecord(value)) {
      violations.push({
        location: fieldLocation(entry.manifestPath, `${field}[${index}]`, repoRoot),
        message: `${field} entries must be objects.`,
        rule: 'manifest-contributes',
      });
      continue;
    }

    for (const [requiredField, valid] of requiredFields(value)) {
      if (!valid) {
        violations.push({
          location: fieldLocation(
            entry.manifestPath,
            `${field}[${index}].${requiredField}`,
            repoRoot,
          ),
          message: `${field} entries must declare ${requiredField}.`,
          rule: 'manifest-contributes',
        });
      }
    }
  }
}

function validateConfigurationContribution(entry, configuration, violations, repoRoot) {
  if (configuration === undefined) {
    return;
  }

  if (!isRecord(configuration) || !isRecord(configuration.properties)) {
    violations.push({
      location: fieldLocation(entry.manifestPath, 'contributes.configuration.properties', repoRoot),
      message: 'contributes.configuration must include a properties object.',
      rule: 'manifest-contributes',
    });
    return;
  }

  for (const [key, property] of Object.entries(configuration.properties)) {
    if (!isRecord(property)) {
      violations.push({
        location: fieldLocation(
          entry.manifestPath,
          `contributes.configuration.properties.${key}`,
          repoRoot,
        ),
        message: `Configuration property "${key}" must be an object.`,
        rule: 'manifest-contributes',
      });
      continue;
    }

    if (!['array', 'boolean', 'number', 'object', 'string'].includes(property.type)) {
      violations.push({
        location: fieldLocation(
          entry.manifestPath,
          `contributes.configuration.properties.${key}.type`,
          repoRoot,
        ),
        message: `Configuration property "${key}" must declare a supported type.`,
        rule: 'manifest-contributes',
      });
    }
  }
}

function validateKnownExtensionReferences(entries, entriesById, violations, repoRoot) {
  for (const entry of entries) {
    const id = stringValue(entry.manifest.id);
    if (!id) {
      continue;
    }

    for (const field of ['extensionDependencies', 'extensionPack']) {
      for (const referencedId of arrayValue(entry.manifest[field])) {
        if (referencedId === id) {
          violations.push({
            location: fieldLocation(entry.manifestPath, field, repoRoot),
            message: `${field} must not reference the extension itself.`,
            rule: 'extension-self-reference',
          });
          continue;
        }

        if (!entriesById.has(referencedId)) {
          violations.push({
            location: fieldLocation(entry.manifestPath, field, repoRoot),
            message: `${field} references unknown extension "${referencedId}".`,
            rule: 'unknown-extension-reference',
          });
        }
      }
    }

    for (const referencedId of arrayValue(entry.manifest.extensionOptionalDependencies)) {
      if (referencedId === id) {
        violations.push({
          location: fieldLocation(entry.manifestPath, 'extensionOptionalDependencies', repoRoot),
          message: 'extensionOptionalDependencies must not reference the extension itself.',
          rule: 'extension-self-reference',
        });
      }
    }
  }
}

function validateHardDependencyCycles(entries, entriesById, violations, repoRoot) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  for (const entry of entries) {
    const id = stringValue(entry.manifest.id);
    if (id) {
      visit(id);
    }
  }

  function visit(extensionId) {
    if (visiting.has(extensionId)) {
      const cycleStart = stack.indexOf(extensionId);
      const cycle = [...stack.slice(cycleStart), extensionId];
      const entry = entriesById.get(extensionId);
      violations.push({
        location: entry ? relativePath(entry.manifestPath, repoRoot) : extensionId,
        message: `Extension dependency cycle detected: ${cycle.join(' -> ')}.`,
        rule: 'extension-dependency-cycle',
      });
      return;
    }

    if (visited.has(extensionId)) {
      return;
    }

    visiting.add(extensionId);
    stack.push(extensionId);

    const entry = entriesById.get(extensionId);
    for (const dependencyId of arrayValue(entry?.manifest.extensionDependencies)) {
      if (entriesById.has(dependencyId)) {
        visit(dependencyId);
      }
    }

    stack.pop();
    visiting.delete(extensionId);
    visited.add(extensionId);
  }
}

function fieldLocation(filePath, field, repoRoot) {
  return `${relativePath(filePath, repoRoot)}#${field}`;
}

function relativePath(filePath, repoRoot) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function stringValue(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
