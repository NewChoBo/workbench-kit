import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NPM_PUBLISH_ORDER, packageDirectoryNameForPackageName } from './npm-publish-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');
const publishPackageNames = new Set(NPM_PUBLISH_ORDER);
const privatePreviewPackageNames = new Set([
  '@workbench-kit/monaco',
  '@workbench-kit/workbench-core',
  '@workbench-kit/shell-react',
]);
const requiredSrcExclusions = [
  '!src/**/*.test.ts',
  '!src/**/*.test.tsx',
  '!src/**/*.stories.ts',
  '!src/**/*.stories.tsx',
];

const violations = [];
const workspacePackages = readWorkspacePackages();
const packageByName = new Map(
  workspacePackages.map((workspacePackage) => [
    workspacePackage.packageJson.name,
    workspacePackage,
  ]),
);

for (const packageName of NPM_PUBLISH_ORDER) {
  const workspacePackage = packageByName.get(packageName);
  if (!workspacePackage) {
    violations.push({
      location: 'scripts/npm-publish-config.mjs#NPM_PUBLISH_ORDER',
      message: `${packageName} is listed for publishing but has no matching package.json.`,
      rule: 'publish-package-missing',
    });
    continue;
  }

  const expectedDirectoryName = packageDirectoryNameForPackageName(packageName);
  if (workspacePackage.directoryName !== expectedDirectoryName) {
    violations.push({
      location: 'scripts/npm-publish-config.mjs#PACKAGE_DIRECTORY_BY_NAME',
      message: `${packageName} must resolve to packages/${workspacePackage.directoryName}; current mapping resolves to packages/${expectedDirectoryName}.`,
      rule: 'publish-directory-mapping',
    });
  }

  validatePublishPackage(workspacePackage);
}

for (const workspacePackage of workspacePackages) {
  if (workspacePackage.packageJson.private === true) {
    validatePrivatePreviewPackage(workspacePackage);
    continue;
  }

  if (!publishPackageNames.has(workspacePackage.packageJson.name)) {
    violations.push({
      location: relativePath(workspacePackage.packageJsonPath),
      message: `${workspacePackage.packageJson.name} is public but missing from NPM_PUBLISH_ORDER.`,
      rule: 'public-package-missing-from-publish-order',
    });
  }
}

validateReactPrivateDemoBoundary();

if (violations.length > 0) {
  console.error('Public package export check failed.');
  for (const violation of violations) {
    console.error(`${violation.location} [${violation.rule}] ${violation.message}`);
  }
  process.exit(1);
}

console.log(`Public package export check passed (${NPM_PUBLISH_ORDER.length} publish packages).`);

function validatePublishPackage(workspacePackage) {
  const { packageJson } = workspacePackage;
  const location = relativePath(workspacePackage.packageJsonPath);

  if (packageJson.private === true) {
    violations.push({
      location,
      message: `${packageJson.name} is in NPM_PUBLISH_ORDER but is private.`,
      rule: 'private-package-in-publish-order',
    });
  }

  if (packageJson.publishConfig?.access !== 'public') {
    violations.push({
      location: `${location}#publishConfig.access`,
      message: `${packageJson.name} must publish with public access.`,
      rule: 'publish-config-access',
    });
  }

  if (packageJson.publishConfig?.tag !== 'prototype') {
    violations.push({
      location: `${location}#publishConfig.tag`,
      message: `${packageJson.name} must publish with the prototype dist tag.`,
      rule: 'publish-config-tag',
    });
  }

  if (packageJson.publishConfig?.provenance !== true) {
    violations.push({
      location: `${location}#publishConfig.provenance`,
      message: `${packageJson.name} must keep npm provenance enabled.`,
      rule: 'publish-config-provenance',
    });
  }

  if (packageJson.type !== 'module') {
    violations.push({
      location: `${location}#type`,
      message: `${packageJson.name} must be an ESM package.`,
      rule: 'package-type-module',
    });
  }

  validateExports(workspacePackage);
  validatePackageFiles(workspacePackage);
  validateLegacyEntryPoints(workspacePackage, ['main', 'types']);
}

function validatePrivatePreviewPackage(workspacePackage) {
  const { packageJson } = workspacePackage;
  const location = relativePath(workspacePackage.packageJsonPath);

  if (publishPackageNames.has(packageJson.name)) {
    violations.push({
      location,
      message: `${packageJson.name} is private preview and must not be published.`,
      rule: 'private-preview-in-publish-order',
    });
  }

  if (packageJson.publishConfig !== undefined) {
    violations.push({
      location: `${location}#publishConfig`,
      message: `${packageJson.name} is private preview and must not declare publishConfig.`,
      rule: 'private-preview-publish-config',
    });
  }

  if (!privatePreviewPackageNames.has(packageJson.name)) {
    violations.push({
      location,
      message: `${packageJson.name} is private but is not documented as a private-preview package.`,
      rule: 'undocumented-private-package',
    });
  }
}

function validateExports(workspacePackage) {
  const { packageJson } = workspacePackage;
  const location = relativePath(workspacePackage.packageJsonPath);

  if (packageJson.exports === undefined) {
    violations.push({
      location: `${location}#exports`,
      message: `${packageJson.name} must declare an explicit export map.`,
      rule: 'missing-export-map',
    });
    return;
  }

  for (const target of collectExportTargets(packageJson.exports)) {
    if (!target.startsWith('./')) {
      violations.push({
        location: `${location}#exports`,
        message: `${packageJson.name} export target "${target}" must be package-relative.`,
        rule: 'invalid-export-target',
      });
      continue;
    }

    const targetPath = path.join(workspacePackage.directory, target);
    if (!fs.existsSync(targetPath)) {
      violations.push({
        location: `${location}#exports`,
        message: `${packageJson.name} export target "${target}" does not exist.`,
        rule: 'missing-export-target',
      });
    }

    if (/[\\/](?:test|__tests__|stories?)[\\/]/i.test(target)) {
      violations.push({
        location: `${location}#exports`,
        message: `${packageJson.name} export target "${target}" points at test/story source.`,
        rule: 'test-story-export-target',
      });
    }
  }
}

function validatePackageFiles(workspacePackage) {
  const { packageJson } = workspacePackage;
  const location = relativePath(workspacePackage.packageJsonPath);

  if (!Array.isArray(packageJson.files) || packageJson.files.length === 0) {
    violations.push({
      location: `${location}#files`,
      message: `${packageJson.name} must declare package files explicitly.`,
      rule: 'missing-package-files',
    });
    return;
  }

  if (packageJson.files.includes('src')) {
    for (const exclusion of requiredSrcExclusions) {
      if (!packageJson.files.includes(exclusion)) {
        violations.push({
          location: `${location}#files`,
          message: `${packageJson.name} must exclude ${exclusion} from published files.`,
          rule: 'missing-source-exclusion',
        });
      }
    }
  }
}

function validateLegacyEntryPoints(workspacePackage, fields) {
  const { packageJson } = workspacePackage;
  const location = relativePath(workspacePackage.packageJsonPath);

  for (const field of fields) {
    const value = packageJson[field];
    if (value === undefined) {
      continue;
    }

    if (typeof value !== 'string' || !value.startsWith('./')) {
      violations.push({
        location: `${location}#${field}`,
        message: `${packageJson.name} ${field} must be a package-relative path.`,
        rule: 'invalid-legacy-entry',
      });
      continue;
    }

    if (!fs.existsSync(path.join(workspacePackage.directory, value))) {
      violations.push({
        location: `${location}#${field}`,
        message: `${packageJson.name} ${field} target "${value}" does not exist.`,
        rule: 'missing-legacy-entry-target',
      });
    }
  }
}

function validateReactPrivateDemoBoundary() {
  const reactPackage = packageByName.get('@workbench-kit/react');
  if (!reactPackage) {
    return;
  }

  const { packageJson } = reactPackage;
  const location = relativePath(reactPackage.packageJsonPath);
  const exportPaths = Object.keys(packageJson.exports ?? {});

  if (exportPaths.some((exportPath) => exportPath.startsWith('./workbench/demo'))) {
    violations.push({
      location: `${location}#exports`,
      message: '@workbench-kit/react must not export private workbench demo helpers.',
      rule: 'react-demo-export',
    });
  }

  if (!packageJson.files?.includes('!src/workbench/demo')) {
    violations.push({
      location: `${location}#files`,
      message: '@workbench-kit/react must exclude private workbench demo helpers.',
      rule: 'react-demo-files',
    });
  }
}

function collectExportTargets(value) {
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

function readWorkspacePackages() {
  return fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(packagesRoot, entry.name, 'package.json')))
    .map((entry) => {
      const directory = path.join(packagesRoot, entry.name);
      const packageJsonPath = path.join(directory, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      return {
        directory,
        directoryName: entry.name,
        packageJson,
        packageJsonPath,
      };
    });
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}
