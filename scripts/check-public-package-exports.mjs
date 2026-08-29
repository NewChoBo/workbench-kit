import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { NPM_PUBLISH_ORDER, packageDirectoryNameForPackageName } from './npm-publish-config.mjs';
import {
  collectExportTargets,
  ensureGeneratedWorkspaceExportTargets,
} from './lib/workspace-export-targets.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');
const publishPackageNames = new Set(NPM_PUBLISH_ORDER);
/** packages/* must not stay private; repo-local extensions/ remain private separately. */
const privatePreviewPackageNames = new Set();
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

ensureGeneratedWorkspaceExportTargets({
  logPrefix: 'check-public-exports',
  repoRoot,
  workspacePackages,
});

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

validateCssOnlySideEffects();
validateReactStyleExports();
validateReactSchemaFormExport();
validateShellReactKeybindingManagementSettingsExport();
validateReactPrivateStorySurfaces();

if (violations.length > 0) {
  console.error('Public package export check failed.');
  for (const violation of violations) {
    console.error(`${violation.location} [${violation.rule}] ${violation.message}`);
  }
  process.exit(1);
}

function validateShellReactKeybindingManagementSettingsExport() {
  const workspacePackage = packageByName.get('@workbench-kit/shell-react');
  const reactPackage = packageByName.get('@workbench-kit/react');
  const expectedTarget = './src/keybinding-management-settings.ts';
  const actualTarget = workspacePackage?.packageJson.exports?.['./keybinding-management-settings'];
  const expectedCommandsTarget = './src/workbench/commands/commands.ts';
  const actualCommandsTarget = reactPackage?.packageJson.exports?.['./workbench/commands'];
  const providerPath = path.join(repoRoot, 'packages/shell-react/src/shell/provider.tsx');
  const focusedLeafPath = path.join(
    repoRoot,
    'packages/shell-react/src/keybinding-management-settings.ts',
  );
  const focusedViewPath = path.join(
    repoRoot,
    'packages/shell-react/src/management/keybinding-settings-view.tsx',
  );
  const managementModelPath = path.join(
    repoRoot,
    'packages/shell-react/src/management/use-keybinding-management.ts',
  );

  if (actualTarget !== expectedTarget) {
    violations.push({
      location: 'packages/shell-react/package.json#exports./keybinding-management-settings',
      message: `@workbench-kit/shell-react/keybinding-management-settings must map exactly to "${expectedTarget}".`,
      rule: 'shell-react-keybinding-management-settings-export',
    });
  }

  if (actualCommandsTarget !== expectedCommandsTarget) {
    violations.push({
      location: 'packages/react/package.json#exports./workbench/commands',
      message: `@workbench-kit/react/workbench/commands must map exactly to "${expectedCommandsTarget}".`,
      rule: 'react-workbench-commands-export',
    });
  }

  const providerSource = readSourceOrReport(providerPath, 'Provider binding source');
  if (!providerSource.includes('export function useWorkbenchKeybindingManagementBinding(')) {
    violations.push({
      location: 'packages/shell-react/src/shell/provider.tsx',
      message: 'The focused Provider entry must export useWorkbenchKeybindingManagementBinding.',
      rule: 'shell-react-keybinding-management-provider-binding',
    });
  }

  const focusedLeafSource = readSourceOrReport(focusedLeafPath, 'focused Settings View leaf');
  const normalizedFocusedLeafSource = focusedLeafSource.replaceAll('\r\n', '\n');
  if (
    !normalizedFocusedLeafSource.includes('WorkbenchKeybindingManagementSettingsView,') ||
    !normalizedFocusedLeafSource.includes('type WorkbenchKeybindingManagementSettingsViewProps,') ||
    !normalizedFocusedLeafSource.includes("from './management/keybinding-settings-view.js';") ||
    [...normalizedFocusedLeafSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].some(
      ([, specifier]) => specifier !== './management/keybinding-settings-view.js',
    )
  ) {
    violations.push({
      location: 'packages/shell-react/src/keybinding-management-settings.ts',
      message:
        'The focused Settings entry must re-export only the provider-free View and its props type.',
      rule: 'shell-react-keybinding-management-focused-leaf',
    });
  }

  const focusedViewSource = readSourceOrReport(focusedViewPath, 'provider-free Settings View');
  const forbiddenViewPatterns = [
    ['useWorkbench', 'useWorkbench'],
    ['WorkbenchContext', 'WorkbenchContext'],
    ['createContext', 'createContext'],
    ['shell/provider', 'shell/provider'],
    ['/provider', 'provider public subpath'],
  ];
  for (const [pattern, label] of forbiddenViewPatterns) {
    if (focusedViewSource.includes(pattern)) {
      violations.push({
        location: 'packages/shell-react/src/management/keybinding-settings-view.tsx',
        message: `The focused Settings View must not reference ${label}.`,
        rule: 'shell-react-keybinding-management-provider-free-view',
      });
    }
  }

  const managementModelSource = readSourceOrReport(
    managementModelPath,
    'keybinding management model',
  );
  const managementModelFile = ts.createSourceFile(
    managementModelPath,
    managementModelSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const shellCommandImports = managementModelFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return [];
    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) return [];
    return namedBindings.elements
      .filter(
        (element) =>
          (element.propertyName?.text ?? element.name.text) === 'createWorkbenchShellCommands',
      )
      .map((element) => ({
        element,
        importClause: statement.importClause,
        specifier: ts.isStringLiteralLike(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined,
      }));
  });
  const shellCommandImport = shellCommandImports[0];
  if (
    managementModelFile.parseDiagnostics.length > 0 ||
    shellCommandImports.length !== 1 ||
    shellCommandImport?.specifier !== '@workbench-kit/react/workbench/commands' ||
    shellCommandImport.importClause?.isTypeOnly === true ||
    shellCommandImport.element.isTypeOnly ||
    shellCommandImport.element.name.text !== 'createWorkbenchShellCommands'
  ) {
    violations.push({
      location: 'packages/shell-react/src/management/use-keybinding-management.ts',
      message:
        'The keybinding management model must import createWorkbenchShellCommands exactly once from the focused public commands leaf.',
      rule: 'shell-react-keybinding-management-command-runtime-boundary',
    });
  }
}

function readSourceOrReport(sourcePath, label) {
  if (fs.existsSync(sourcePath)) return fs.readFileSync(sourcePath, 'utf8');
  violations.push({
    location: path.relative(repoRoot, sourcePath).replaceAll('\\', '/'),
    message: `${label} is missing.`,
    rule: 'shell-react-keybinding-management-source-presence',
  });
  return '';
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
  validatePackageTestScript(workspacePackage);
  validateLegacyEntryPoints(workspacePackage, ['main', 'types']);
}

function validatePackageTestScript(workspacePackage) {
  const sourceRoot = path.join(workspacePackage.directory, 'src');
  if (!fs.existsSync(sourceRoot)) {
    return;
  }

  const hasTests = fs
    .readdirSync(sourceRoot, { recursive: true })
    .some((entry) => typeof entry === 'string' && /\.test\.tsx?$/u.test(entry));
  if (hasTests && !workspacePackage.packageJson.scripts?.test) {
    violations.push({
      location: `${relativePath(workspacePackage.packageJsonPath)}#scripts.test`,
      message: `${workspacePackage.packageJson.name} contains source tests but has no package-local test command.`,
      rule: 'missing-package-test-script',
    });
  }
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

function validateCssOnlySideEffects() {
  for (const packageName of ['@workbench-kit/react', '@workbench-kit/shell-react']) {
    const workspacePackage = packageByName.get(packageName);
    if (!workspacePackage) {
      continue;
    }

    const { packageJson } = workspacePackage;
    const sideEffects = packageJson.sideEffects;
    const hasRequiredCssPattern = Array.isArray(sideEffects) && sideEffects.includes('**/*.css');
    const hasNonCssPattern =
      Array.isArray(sideEffects) &&
      sideEffects.some((pattern) => typeof pattern !== 'string' || !pattern.endsWith('.css'));

    if (!hasRequiredCssPattern || hasNonCssPattern) {
      violations.push({
        location: `${relativePath(workspacePackage.packageJsonPath)}#sideEffects`,
        message: `${packageName} must keep JavaScript tree-shakeable while preserving only imported CSS side effects.`,
        rule: 'css-only-tree-shaking-side-effects',
      });
    }
  }
}

function validateReactStyleExports() {
  const reactPackage = packageByName.get('@workbench-kit/react');
  if (!reactPackage) {
    return;
  }

  const requiredStyleExports = {
    './styles/core.css': './src/styles/core.css',
    './styles/foundation.css': './src/styles/foundation.css',
    './styles/overlay.css': './src/styles/overlay.css',
    './styles.css': './src/styles.css',
  };
  const exports = reactPackage.packageJson.exports ?? {};
  const location = relativePath(reactPackage.packageJsonPath);
  const reviewedStyleExports = new Set(Object.keys(requiredStyleExports));

  for (const [exportPath, expectedTarget] of Object.entries(requiredStyleExports)) {
    if (exports[exportPath] !== expectedTarget) {
      violations.push({
        location: `${location}#exports`,
        message: `${exportPath} must target ${expectedTarget}.`,
        rule: 'react-style-export-contract',
      });
    }
  }

  for (const exportPath of Object.keys(exports)) {
    if (
      exportPath.startsWith('./styles/') &&
      exportPath.endsWith('.css') &&
      !reviewedStyleExports.has(exportPath)
    ) {
      violations.push({
        location: `${location}#exports`,
        message: `${exportPath} is a public CSS contract without focused-entry review coverage.`,
        rule: 'react-unreviewed-style-export',
      });
    }
  }
}

function validateReactSchemaFormExport() {
  const reactPackage = packageByName.get('@workbench-kit/react');
  if (!reactPackage) {
    return;
  }

  const { packageJson } = reactPackage;
  const location = relativePath(reactPackage.packageJsonPath);
  const exports = packageJson.exports ?? {};
  const schemaFormExportPath = './schema-form';
  const schemaFormTarget = './src/workbench/settings/SchemaForm.tsx';
  const privateSchemaFormExportPaths = [
    schemaFormExportPath,
    './workbench/settings/SchemaForm',
    './workbench/settings/schema-form',
  ];
  const stableSurfaceTargets = {
    '.': './src/index.ts',
    './workbench': './src/workbench/index.ts',
    './workbench/settings': './src/workbench/settings/index.ts',
    [schemaFormExportPath]: schemaFormTarget,
  };

  for (const [exportPath, expectedTarget] of Object.entries(stableSurfaceTargets)) {
    if (exports[exportPath] !== expectedTarget) {
      violations.push({
        location: `${location}#exports`,
        message: `${exportPath} must target ${expectedTarget}.`,
        rule: 'react-schema-form-export-contract',
      });
    }
  }

  for (const [exportPath, target] of Object.entries(exports)) {
    if (exportPath === schemaFormExportPath) {
      continue;
    }

    const exposesFocusedPath =
      privateSchemaFormExportPaths.some((privatePath) =>
        exportPatternMatches(exportPath, privatePath),
      ) ||
      isSchemaFormReference(exportPath) ||
      collectExportTargets(target).some(
        (exportTarget) =>
          isSchemaFormReference(exportTarget) ||
          exportPatternMatches(exportTarget, schemaFormTarget),
      );
    if (exposesFocusedPath) {
      violations.push({
        location: `${location}#exports`,
        message: `${exportPath} must not expose a wildcard, alias, or private SchemaForm path beside ${schemaFormExportPath}.`,
        rule: 'react-schema-form-private-export',
      });
    }
  }

  const expectedTypesVersionTargets = ['src/workbench/settings/SchemaForm.tsx'];
  const privateSchemaFormTypesPaths = privateSchemaFormExportPaths.map((exportPath) =>
    exportPath.slice(2),
  );
  const typesVersions = packageJson.typesVersions;
  const schemaFormTypes = typesVersions?.['*']?.['schema-form'];
  if (JSON.stringify(schemaFormTypes) !== JSON.stringify(expectedTypesVersionTargets)) {
    violations.push({
      location: `${location}#typesVersions`,
      message: `schema-form must map exactly to ${expectedTypesVersionTargets[0]}.`,
      rule: 'react-schema-form-types-versions-contract',
    });
  }

  for (const [versionRange, mappings] of Object.entries(typesVersions ?? {})) {
    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
      continue;
    }

    for (const [mappingPath, targets] of Object.entries(mappings)) {
      if (versionRange === '*' && mappingPath === 'schema-form') {
        continue;
      }

      const exposesFocusedPath =
        privateSchemaFormTypesPaths.some((privatePath) =>
          typesVersionPatternMatches(mappingPath, privatePath),
        ) ||
        isSchemaFormReference(mappingPath) ||
        (Array.isArray(targets) &&
          targets.some(
            (target) =>
              typeof target === 'string' &&
              (isSchemaFormReference(target) ||
                typesVersionPatternMatches(target, expectedTypesVersionTargets[0])),
          ));
      if (exposesFocusedPath) {
        violations.push({
          location: `${location}#typesVersions`,
          message: `${versionRange}:${mappingPath} must not expose a wildcard, alias, or private SchemaForm type path.`,
          rule: 'react-schema-form-private-types-version',
        });
      }
    }
  }

  if (!Array.isArray(packageJson.sideEffects) || !packageJson.sideEffects.includes('**/*.css')) {
    violations.push({
      location: `${location}#sideEffects`,
      message: `${schemaFormExportPath} must retain imported CSS through the package CSS side-effect pattern.`,
      rule: 'react-schema-form-css-side-effects',
    });
  }

  const rootIndexPath = path.join(reactPackage.directory, 'src/index.ts');
  const schemaFormSourcePath = path.join(
    reactPackage.directory,
    'src/workbench/settings/SchemaForm.tsx',
  );
  const schemaFormProgram = ts.createProgram([rootIndexPath, schemaFormSourcePath], {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  });
  const rootExportNames = collectTypeScriptModuleExportNames(schemaFormProgram, rootIndexPath);
  const schemaFormExportNames = collectTypeScriptModuleExportNames(
    schemaFormProgram,
    schemaFormSourcePath,
  );
  const leakedSchemaFormExports = schemaFormExportNames.filter((exportName) =>
    rootExportNames.includes(exportName),
  );
  if (leakedSchemaFormExports.length > 0) {
    violations.push({
      location: relativePath(rootIndexPath),
      message: `@workbench-kit/react root must not re-export the focused SchemaForm surface: ${leakedSchemaFormExports.join(', ')}.`,
      rule: 'react-schema-form-root-re-export',
    });
  }
}

function collectTypeScriptModuleExportNames(program, sourcePath) {
  const sourceFile = program.getSourceFile(sourcePath);
  const moduleSymbol = sourceFile ? program.getTypeChecker().getSymbolAtLocation(sourceFile) : null;
  return moduleSymbol
    ? program
        .getTypeChecker()
        .getExportsOfModule(moduleSymbol)
        .map((exportSymbol) => exportSymbol.getName())
        .sort()
    : [];
}

function isSchemaFormReference(value) {
  return typeof value === 'string' && /schema[-_]?form/iu.test(value);
}

function exportPatternMatches(pattern, exportPath) {
  if (!pattern.includes('*')) {
    return false;
  }

  const expression = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('.*');
  return new RegExp(`^${expression}$`, 'u').test(exportPath);
}

function typesVersionPatternMatches(pattern, exportPath) {
  return exportPatternMatches(`./${pattern}`, `./${exportPath}`);
}

function validateReactPrivateStorySurfaces() {
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

  if (exportPaths.some((exportPath) => exportPath.startsWith('./workbench/story'))) {
    violations.push({
      location: `${location}#exports`,
      message: '@workbench-kit/react must not export Storybook-only workbench helpers.',
      rule: 'react-story-export',
    });
  }

  if (!packageJson.files?.includes('!src/workbench/story')) {
    violations.push({
      location: `${location}#files`,
      message: '@workbench-kit/react must exclude Storybook-only workbench helpers.',
      rule: 'react-story-files',
    });
  }

  const workbenchIndexPath = path.join(reactPackage.directory, 'src/workbench/index.ts');
  const workbenchIndex = fs.existsSync(workbenchIndexPath)
    ? fs.readFileSync(workbenchIndexPath, 'utf8')
    : '';

  if (/from\s+['"]\.\/story\//u.test(workbenchIndex)) {
    violations.push({
      location: relativePath(workbenchIndexPath),
      message: '@workbench-kit/react/workbench must not re-export Storybook-only helpers.',
      rule: 'react-workbench-story-re-export',
    });
  }
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
