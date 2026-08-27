import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

import { validatePackedPackageCohort } from './lib/packed-package-cohort.mjs';
import { runCommand } from './lib/run-command.mjs';
import { buildFreshWorkspaceArtifacts } from './lib/workspace-export-targets.mjs';
import { NPM_PUBLISH_ORDER, packageDirectoryNameForPackageName } from './npm-publish-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureBase = path.resolve(os.tmpdir());
const fixtureRoot = fs.mkdtempSync(path.join(fixtureBase, 'wbk-packed-consumer-'));
const packDir = path.join(fixtureRoot, 'pack');
const consumerDir = path.join(fixtureRoot, 'consumer');
const nodeModulesDir = path.join(consumerDir, 'node_modules');
const outputDir = path.join(consumerDir, 'dist');
const focusedCommandHostControllerOutputDir = path.join(
  consumerDir,
  'dist-focused-command-host-controller',
);
const focusedOverlayOutputDir = path.join(consumerDir, 'dist-focused-overlay');
const schemaFormIdentityOutputDir = path.join(consumerDir, 'dist-schema-form-identity');
const focusedSchemaFormOutputDir = path.join(consumerDir, 'dist-focused-schema-form');

// Keep a little deliberate headroom for normal fixes, while forcing larger
// public-surface growth to include an explicit bundle-budget review.
const PACKED_CONSUMER_BUDGETS = Object.freeze({
  cssGzipBytes: 52_000,
  focusedOverlayCssGzipBytes: 11_500,
  // Exact develop before the Field Remap property-stack migration consumed 249,124 bytes. Replacing
  // its bespoke detail controls with the existing shared property/control primitives consumes
  // 251,806 bytes while retaining the same 1,882-module / one-static-chunk graph; keep deliberate
  // repair headroom without hiding another dependency-surface jump.
  initialGzipBytes: 253_000,
});

// Runtime closure reached by the public imports in the generated consumer.
// Monaco is installed as it would be for a real consumer, but must not enter the
// manifest's transitive static entry closure.
const consumerPackageNames = [
  '@workbench-kit/base',
  '@workbench-kit/contracts',
  '@workbench-kit/platform',
  '@workbench-kit/workbench-extension-sdk',
  '@workbench-kit/workbench-config',
  '@workbench-kit/workbench-core',
  '@workbench-kit/runtime',
  '@workbench-kit/workspace',
  '@workbench-kit/adapters',
  '@workbench-kit/services',
  '@workbench-kit/tokens',
  '@workbench-kit/jdw',
  '@workbench-kit/monaco',
  '@workbench-kit/field-remap',
  '@workbench-kit/react',
  '@workbench-kit/shell-react',
];
const consumerManifests = new Map(
  consumerPackageNames.map((name) => [name, readJson(path.join(packageDir(name), 'package.json'))]),
);
const expectedVersion = readJson(path.join(repoRoot, 'package.json')).version;

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(nodeModulesDir, { recursive: true });

try {
  assertExternalFixture();
  buildFreshWorkspaceArtifacts({
    logPrefix: 'check-packed-consumer',
    repoRoot,
  });
  NPM_PUBLISH_ORDER.forEach(packPackage);
  verifyPackedPackageCohort();
  verifyJdwPackageManifest();
  linkExternalPackages();
  verifyReactSchemaFormPackageManifest();
  verifyExternalNodeCatalogPackageManifest();
  verifySourceInputCompatibilityPackageManifest();
  writeConsumer();

  console.log('[check-packed-consumer] Typechecking external TypeScript consumer...');
  runCommand('pnpm', ['exec', 'tsc', '--project', path.join(consumerDir, 'tsconfig.json')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  console.log(
    '[check-packed-consumer] Typechecking JDW generative UI root exports with exact optional properties...',
  );
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--exactOptionalPropertyTypes',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2022',
      path.join(consumerDir, 'src', 'ui-generative-plan-types.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  console.log(
    '[check-packed-consumer] Typechecking focused authoring-development exports with exact optional properties...',
  );
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--exactOptionalPropertyTypes',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2022',
      path.join(consumerDir, 'src', 'authoring-development-types.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  console.log(
    '[check-packed-consumer] Typechecking focused external-node-catalog exports with exact optional properties...',
  );
  for (const [moduleKind, moduleResolution, target] of [
    ['ESNext', 'Bundler', 'ES2022'],
    ['CommonJS', 'Node', 'ES2020'],
  ]) {
    runCommand(
      'pnpm',
      [
        'exec',
        'tsc',
        '--module',
        moduleKind,
        '--moduleResolution',
        moduleResolution,
        '--exactOptionalPropertyTypes',
        '--noEmit',
        '--skipLibCheck',
        '--strict',
        '--target',
        target,
        path.join(consumerDir, 'src', 'external-node-catalog-types.ts'),
      ],
      { cwd: repoRoot, stdio: 'inherit' },
    );
  }
  console.log(
    '[check-packed-consumer] Typechecking focused SchemaForm exports with exact optional properties...',
  );
  for (const [moduleKind, moduleResolution, target] of [
    ['ESNext', 'Bundler', 'ES2022'],
    ['CommonJS', 'Node', 'ES2020'],
  ]) {
    runCommand(
      'pnpm',
      [
        'exec',
        'tsc',
        '--module',
        moduleKind,
        '--moduleResolution',
        moduleResolution,
        '--exactOptionalPropertyTypes',
        '--jsx',
        'react-jsx',
        '--noEmit',
        '--skipLibCheck',
        '--strict',
        '--target',
        target,
        path.join(consumerDir, 'src', 'schema-form-types.ts'),
      ],
      { cwd: repoRoot, stdio: 'inherit' },
    );
  }
  console.log(
    '[check-packed-consumer] Typechecking focused source-input compatibility and JDW plan exports with exact optional properties...',
  );
  for (const [moduleKind, moduleResolution, target] of [
    ['ESNext', 'Bundler', 'ES2022'],
    ['CommonJS', 'Node', 'ES2020'],
  ]) {
    runCommand(
      'pnpm',
      [
        'exec',
        'tsc',
        '--module',
        moduleKind,
        '--moduleResolution',
        moduleResolution,
        '--exactOptionalPropertyTypes',
        '--noEmit',
        '--skipLibCheck',
        '--strict',
        '--target',
        target,
        path.join(consumerDir, 'src', 'source-input-compatibility-types.ts'),
      ],
      { cwd: repoRoot, stdio: 'inherit' },
    );
  }
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'CommonJS',
      '--moduleResolution',
      'Node',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2020',
      path.join(consumerDir, 'src', 'node-context-menu-item.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--noUncheckedIndexedAccess',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2022',
      path.join(consumerDir, 'src', 'strict-field-remap.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  runCommand(
    'pnpm',
    [
      'exec',
      'tsc',
      '--module',
      'CommonJS',
      '--moduleResolution',
      'Node',
      '--noEmit',
      '--skipLibCheck',
      '--strict',
      '--target',
      'ES2020',
      path.join(consumerDir, 'src', 'node-design-system.ts'),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  runCommand('node', [path.join(consumerDir, 'src', 'node-design-system-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'node-ui-authoring-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'node-ui-authoring-runtime.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'authoring-development-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'authoring-development-runtime.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'external-node-catalog-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'external-node-catalog-runtime.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'source-input-compatibility-runtime.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'source-input-compatibility-runtime.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'schema-form-private-paths.cjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });
  runCommand('node', [path.join(consumerDir, 'src', 'schema-form-private-paths.mjs')], {
    cwd: consumerDir,
    stdio: 'inherit',
  });

  console.log('[check-packed-consumer] Building external production consumer...');
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, 'vite.config.mjs')],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  const coreMetrics = verifyOutput();

  buildFocusedConsumer('focused-command-host-controller');
  verifyFocusedCommandHostControllerOutput();

  buildFocusedConsumer('focused-schema-form');
  verifyFocusedSchemaFormOutput();

  buildFocusedConsumer('schema-form-identity');
  await executeFocusedConsumer('SchemaForm identity', schemaFormIdentityOutputDir);

  buildFocusedConsumer('focused-overlay');
  verifyFocusedStyleOutput({
    budgetBytes: PACKED_CONSUMER_BUDGETS.focusedOverlayCssGzipBytes,
    coreCssGzipBytes: coreMetrics.cssGzipBytes,
    forbiddenSelectors: [
      '.chat-panel-drop-target',
      '.ui-modal',
      '.ui-workbench-activity-bar',
      '.ui-workbench-command-item',
      '.ui-workbench-command-list',
      '.widget-tree-workbench',
      '.workbench-settings-modal',
      '.workspace-editor',
    ],
    label: 'focused overlay',
    maxCoreRatio: 0.25,
    outputDirectory: focusedOverlayOutputDir,
    requiredSelectors: [
      '--font-size-xs:',
      '.codicon',
      '.ui-button',
      '.ui-context-menu',
      '.ui-context-menu__item',
      '.ui-context-menu__item.ui-button',
      '.ui-scroll-area',
    ],
  });
} finally {
  assertSafeFixturePath();
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

function packPackage(packageName) {
  console.log(`[check-packed-consumer] Packing ${packageName}...`);
  const output = runCommand(
    'pnpm',
    ['--filter', packageName, 'pack', '--pack-destination', packDir, '--json'],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const tarball = path.resolve(repoRoot, JSON.parse(output.trim()).filename);
  const target = packagePath(nodeModulesDir, packageName);
  fs.mkdirSync(target, { recursive: true });
  runCommand('tar', ['-xzf', tarball, '--strip-components=1', '-C', target], {
    stdio: 'inherit',
  });
}

function linkExternalPackages() {
  const requirements = new Map();

  for (const [packageName, manifest] of consumerManifests) {
    const optional = new Set([
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.entries(manifest.peerDependenciesMeta ?? {})
        .filter(([, meta]) => meta.optional)
        .map(([name]) => name),
    ]);
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    };

    for (const dependencyName of Object.keys(dependencies)) {
      if (dependencyName.startsWith('@workbench-kit/')) continue;
      const previous = requirements.get(dependencyName);
      requirements.set(dependencyName, {
        optional: (previous?.optional ?? true) && optional.has(dependencyName),
        requestedBy: previous?.requestedBy ?? packageName,
      });
    }
  }

  for (const dependencyName of ['@types/react', '@types/react-dom']) {
    requirements.set(dependencyName, {
      optional: false,
      requestedBy: 'packed TypeScript consumer',
    });
  }

  for (const [dependencyName, requirement] of requirements) {
    const source = [repoRoot, ...consumerPackageNames.map(packageDir)]
      .map((root) => packagePath(path.join(root, 'node_modules'), dependencyName))
      .find((candidate) => fs.existsSync(candidate));
    if (!source) {
      if (requirement.optional) continue;
      throw new Error(
        `Cannot resolve ${dependencyName}, required by ${requirement.requestedBy}. Run pnpm install.`,
      );
    }

    const target = packagePath(nodeModulesDir, dependencyName);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(
      fs.realpathSync(source),
      target,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
}

function verifyPackedPackageCohort() {
  const manifests = new Map(
    NPM_PUBLISH_ORDER.map((packageName) => [
      packageName,
      readJson(path.join(packagePath(nodeModulesDir, packageName), 'package.json')),
    ]),
  );
  const count = validatePackedPackageCohort({
    expectedPackageNames: NPM_PUBLISH_ORDER,
    expectedVersion,
    manifests,
  });
  console.log(
    `[check-packed-consumer] Packed release cohort OK (${count} packages at ${expectedVersion}).`,
  );
}

function verifyJdwPackageManifest() {
  const jdwRoot = packagePath(nodeModulesDir, '@workbench-kit/jdw');
  const manifest = readJson(path.join(jdwRoot, 'package.json'));
  const expectedRootExport = {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
    default: './dist/index.js',
  };
  if (JSON.stringify(manifest.exports?.['.']) !== JSON.stringify(expectedRootExport)) {
    throw new TypeError(
      'Packed JDW root must retain exact types/import/require/default conditions.',
    );
  }
  const expectedExportPaths = [
    '.',
    './schemas/jdw-node.jdw.schema.json',
    './schemas/widget-asset-manifest.v1.jdw.schema.json',
    './schemas/widget-document.v1.jdw.schema.json',
  ];
  if (
    JSON.stringify(Object.keys(manifest.exports ?? {}).sort()) !==
    JSON.stringify(expectedExportPaths.sort())
  ) {
    throw new TypeError('Packed JDW must not expose a generative UI or private deep subpath.');
  }
  for (const target of new Set(Object.values(expectedRootExport))) {
    if (!fs.existsSync(path.join(jdwRoot, target))) {
      throw new TypeError(`Packed JDW root target is missing: ${target}`);
    }
  }
  const runtimeDependencyNames = new Set(
    ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
      Object.keys(manifest[field] ?? {}),
    ),
  );
  if (
    runtimeDependencyNames.size !== 1 ||
    !runtimeDependencyNames.has('@workbench-kit/contracts')
  ) {
    throw new TypeError(
      'Packed JDW generative UI boundary must not add a model/provider runtime dependency.',
    );
  }
}

function verifyReactSchemaFormPackageManifest() {
  const reactRoot = packagePath(nodeModulesDir, '@workbench-kit/react');
  const manifest = readJson(path.join(reactRoot, 'package.json'));
  const expectedTarget = './src/workbench/settings/SchemaForm.tsx';
  if (manifest.exports?.['./schema-form'] !== expectedTarget) {
    throw new TypeError(
      'Packed React schema-form export must retain its exact focused source target.',
    );
  }
  const typeVersions = manifest.typesVersions?.['*']?.['schema-form'];
  if (
    !Array.isArray(typeVersions) ||
    typeVersions.length !== 1 ||
    typeVersions[0] !== 'src/workbench/settings/SchemaForm.tsx'
  ) {
    throw new TypeError('Packed React schema-form typesVersions mapping is invalid.');
  }
  if (Object.keys(manifest.exports ?? {}).some((key) => key.startsWith('./schema-form/'))) {
    throw new TypeError('Packed React schema-form exposes a private nested subpath.');
  }
  if (
    manifest.exports?.['./workbench/settings'] !== './src/workbench/settings/index.ts' ||
    manifest.exports?.['./workbench'] !== './src/workbench/index.ts'
  ) {
    throw new TypeError('Packed React schema-form changed a legacy Workbench export target.');
  }
  if (!fs.existsSync(path.join(reactRoot, expectedTarget))) {
    throw new TypeError(`Packed React schema-form target is missing: ${expectedTarget}`);
  }
  if (
    !Array.isArray(manifest.sideEffects) ||
    manifest.sideEffects.length !== 1 ||
    manifest.sideEffects[0] !== '**/*.css'
  ) {
    throw new TypeError('Packed React schema-form must retain CSS-only side effects.');
  }
}

function verifyExternalNodeCatalogPackageManifest() {
  const contractsRoot = packagePath(nodeModulesDir, '@workbench-kit/contracts');
  const manifest = readJson(path.join(contractsRoot, 'package.json'));
  const expectedExport = {
    types: './dist/external-node-catalog.d.ts',
    import: './dist/external-node-catalog.js',
    require: './dist/external-node-catalog.cjs',
    default: './dist/external-node-catalog.js',
  };
  const actualExport = manifest.exports?.['./external-node-catalog'];
  if (JSON.stringify(actualExport) !== JSON.stringify(expectedExport)) {
    throw new TypeError(
      'Packed external-node-catalog export must retain exact types/import/require/default conditions.',
    );
  }
  const typeVersions = manifest.typesVersions?.['*']?.['external-node-catalog'];
  if (
    !Array.isArray(typeVersions) ||
    typeVersions.length !== 1 ||
    typeVersions[0] !== 'dist/external-node-catalog.d.ts'
  ) {
    throw new TypeError('Packed external-node-catalog typesVersions mapping is invalid.');
  }
  if (
    Object.keys(manifest.exports ?? {}).some((key) => key.startsWith('./external-node-catalog/'))
  ) {
    throw new TypeError('Packed external-node-catalog exposes a private deep subpath.');
  }
  for (const target of new Set(Object.values(expectedExport))) {
    if (!fs.existsSync(path.join(contractsRoot, target))) {
      throw new TypeError(`Packed external-node-catalog target is missing: ${target}`);
    }
  }
}

function verifySourceInputCompatibilityPackageManifest() {
  const contractsRoot = packagePath(nodeModulesDir, '@workbench-kit/contracts');
  const manifest = readJson(path.join(contractsRoot, 'package.json'));
  const expectedExport = {
    types: './dist/source-input-compatibility.d.ts',
    import: './dist/source-input-compatibility.js',
    require: './dist/source-input-compatibility.cjs',
    default: './dist/source-input-compatibility.js',
  };
  const actualExport = manifest.exports?.['./source-input-compatibility'];
  if (JSON.stringify(actualExport) !== JSON.stringify(expectedExport)) {
    throw new TypeError(
      'Packed source-input-compatibility export must retain exact types/import/require/default conditions.',
    );
  }
  const typeVersions = manifest.typesVersions?.['*']?.['source-input-compatibility'];
  if (
    !Array.isArray(typeVersions) ||
    typeVersions.length !== 1 ||
    typeVersions[0] !== 'dist/source-input-compatibility.d.ts'
  ) {
    throw new TypeError('Packed source-input-compatibility typesVersions mapping is invalid.');
  }
  if (
    Object.keys(manifest.exports ?? {}).some((key) =>
      key.startsWith('./source-input-compatibility/'),
    )
  ) {
    throw new TypeError('Packed source-input-compatibility exposes a private deep subpath.');
  }
  for (const target of new Set(Object.values(expectedExport))) {
    if (!fs.existsSync(path.join(contractsRoot, target))) {
      throw new TypeError(`Packed source-input-compatibility target is missing: ${target}`);
    }
  }
  const runtimeDependencyNames = new Set(
    ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
      Object.keys(manifest[field] ?? {}),
    ),
  );
  if (runtimeDependencyNames.size !== 0) {
    throw new TypeError(
      'Packed source-input-compatibility boundary must remain dependency-free and provider-neutral.',
    );
  }
}

function writeConsumer() {
  fs.mkdirSync(path.join(consumerDir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body><script type="module" src="/src/main.ts"></script></body>
</html>
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'main.ts'),
    `import '@workbench-kit/react/styles/core.css';
import '@workbench-kit/shell-react/field-remap/view.css';
import {
  WorkbenchPreviewCanvas,
  WorkbenchPropertyOverrideLabel,
} from '@workbench-kit/react/layout';
import { ContextMenu } from '@workbench-kit/react/overlay';
import {
  WorkbenchCommandPalette,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  createWorkspaceFilesQuickOpenProvider,
  getWorkbenchCommandPaletteShortcutLabel,
  getWorkbenchQuickAccessShortcutLabel,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  matchesWorkbenchShortcut,
  resolveQuickOpenItemPath,
} from '@workbench-kit/react/workbench/command-ui';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench/commands';
import { StatusBar } from '@workbench-kit/react/workbench/shell';
import { WorkbenchStandaloneShell } from '@workbench-kit/react/workbench/standalone';
import { resolveWorkbenchTheme } from '@workbench-kit/react/workbench/theme';
import { DARK_THEME_PRESET_OPTIONS } from '@workbench-kit/react/workbench/themePresets';
import type {
  ExtensionManagementEntry,
  ExtensionManagementPanelProps,
  ExtensionManagementTransition,
} from '@workbench-kit/react';
import type { NodeTypeDescriptor } from '@workbench-kit/contracts';
import type { ValueTransformDefinition } from '@workbench-kit/field-remap';
import type { ExtensionManagementPendingAction } from '@workbench-kit/react/workbench/management';
import {
  ExtensionRegistry,
  type ExtensionRegistrationStore,
  type ThemeRegistryChangeEvent,
} from '@workbench-kit/workbench-core';
import type {
  WorkbenchContextValue,
  WorkbenchExtensionActivationAccess,
  WorkbenchExtensionActivationStateReader,
  WorkbenchExtensionCatalogReader,
  WorkbenchShellCommandHostProps,
  WorkbenchShellCommandRunContext,
  WorkbenchSettingsCapabilityPublication,
  WorkbenchSettingsCapabilityPublisher,
  FieldRemapPreviewState as FieldRemapRootPreviewState,
  FieldRemapSelection as FieldRemapRootSelection,
} from '@workbench-kit/shell-react';
import {
  FieldRemapFlowMapper,
  type FieldRemapDraftTransform,
  type FieldRemapFlowMapperProps,
  type FieldRemapPreviewState,
  type FieldRemapSelection,
} from '@workbench-kit/shell-react/field-remap';
import { WorkbenchHostShell } from '@workbench-kit/shell-react/host-shell';
import { WorkbenchProvider } from '@workbench-kit/shell-react/provider';
import { DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY } from '@workbench-kit/shell-react/layout-storage';
import { useExtensionRegistryCommandDescriptors } from '@workbench-kit/shell-react/registry-command-descriptors';

const quickOpenProvider = createWorkspaceFilesQuickOpenProvider({ files: [] });
type ExtensionRegistryRemoved = 'extensionRegistry' extends keyof WorkbenchContextValue
  ? never
  : true;
const extensionRegistryRemoved: ExtensionRegistryRemoved = true;
type FocusedExtensionContextContracts = {
  activation: WorkbenchExtensionActivationAccess;
  activationState: WorkbenchExtensionActivationStateReader;
  catalog: WorkbenchExtensionCatalogReader;
  publication: WorkbenchSettingsCapabilityPublication;
  publisher: WorkbenchSettingsCapabilityPublisher;
};
const focusedExtensionContextContracts = null as unknown as FocusedExtensionContextContracts;
type FocusedShellCommandContracts = {
  host: WorkbenchShellCommandHostProps;
  runContext: WorkbenchShellCommandRunContext;
};
const focusedShellCommandContracts = null as unknown as FocusedShellCommandContracts;
const legacyExtensionManagementEntry: ExtensionManagementEntry = {
  category: 'utility',
  displayName: 'Legacy Extension',
  enabled: true,
  id: 'workbench-kit.consumer.legacy-extension',
  source: 'installed',
};
const legacyExtensionManagementPanelProps: ExtensionManagementPanelProps = {
  browseEntries: [],
  installedEntries: [legacyExtensionManagementEntry],
};
const extensionManagementTransition: ExtensionManagementTransition = {
  kind: 'applied',
  message: 'Applied without a reload.',
};
function consumeLegacyPendingAction(action: ExtensionManagementPendingAction): string {
  const kind = action.kind;
  switch (kind) {
    case 'install':
      return \`install:\${action.entryId}\`;
    case 'toggle':
      return \`toggle:\${action.entryId}\`;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
const legacyPendingAction = consumeLegacyPendingAction({
  entryId: legacyExtensionManagementEntry.id,
  kind: 'toggle',
});
const packedExtensionRegistry = new ExtensionRegistry();
const packedExtensionRegistrations: ExtensionRegistrationStore =
  packedExtensionRegistry.registerExtensions([]);
const packedThemeChange = null as unknown as ThemeRegistryChangeEvent;
const packedFieldRemapPreview: FieldRemapPreviewState = {
  status: 'unavailable',
  reason: 'no-sample',
};
const packedFieldRemapRootPreview: FieldRemapRootPreviewState = packedFieldRemapPreview;
const packedFieldRemapSelections: readonly FieldRemapSelection[] = [
  { kind: 'edge', edgeId: 'edge:1' },
  { kind: 'transformStep', edgeId: 'edge:1', stepIndex: 0 },
  { kind: 'draft', localId: 'draft:1' },
  { kind: 'operator', operatorId: 'operator:1' },
  null,
];
const packedFieldRemapRootSelections: readonly FieldRemapRootSelection[] =
  packedFieldRemapSelections;
type PackedFieldRemapBulkPropsRemainInternal = Extract<
  keyof FieldRemapFlowMapperProps,
  'bulkSelection' | 'onBulkSelectionChange'
> extends never
  ? true
  : never;
const packedFieldRemapBulkPropsRemainInternal: PackedFieldRemapBulkPropsRemainInternal = true;
type PackedFieldRemapDraftCoordinatesRemainInternal = Extract<
  keyof FieldRemapDraftTransform,
  'position' | 'x' | 'y'
> extends never
  ? true
  : never;
const packedFieldRemapDraftCoordinatesRemainInternal: PackedFieldRemapDraftCoordinatesRemainInternal =
  true;
type PackedFieldRemapDragPropsRemainInternal = Extract<
  keyof FieldRemapFlowMapperProps,
  'dragDataType' | 'draftPositions' | 'onDropDraft'
> extends never
  ? true
  : never;
const packedFieldRemapDragPropsRemainInternal: PackedFieldRemapDragPropsRemainInternal = true;
function consumePackedFieldRemapSelection(selection: FieldRemapSelection): string {
  if (selection === null) {
    return 'none';
  }
  switch (selection.kind) {
    case 'edge':
      return selection.edgeId;
    case 'transformStep':
      return \`\${selection.edgeId}:\${selection.stepIndex}\`;
    case 'draft':
      return selection.localId;
    case 'operator':
      return selection.operatorId;
    default: {
      const exhaustive: never = selection;
      return exhaustive;
    }
  }
}
const packedFieldRemapPreviewProps: Pick<
  FieldRemapFlowMapperProps,
  'preview' | 'readOnly' | 'showPreview'
> = { preview: packedFieldRemapPreview, readOnly: true };
async function verifyPackedGraphAuthoring(): Promise<{
  descriptor: NodeTypeDescriptor;
  transform: ValueTransformDefinition;
}> {
  const { verifyPackedGraphAuthoringRuntime } = await import('./graph-authoring-runtime');
  return verifyPackedGraphAuthoringRuntime();
}

(globalThis as typeof globalThis & { __workbenchKitPackedConsumer?: unknown })
  .__workbenchKitPackedConsumer = Object.freeze({
  ContextMenu,
  DARK_THEME_PRESET_OPTIONS,
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  FieldRemapFlowMapper,
  StatusBar,
  WorkbenchCommandPalette,
  WorkbenchHostShell,
  WorkbenchPreviewCanvas,
  WorkbenchProvider,
  WorkbenchPropertyOverrideLabel,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  WorkbenchStandaloneShell,
  useExtensionRegistryCommandDescriptors,
  extensionRegistryRemoved,
  focusedExtensionContextContracts,
  focusedShellCommandContracts,
  legacyExtensionManagementPanelProps,
  legacyPendingAction,
  extensionManagementTransition,
  packedExtensionRegistrations,
  packedThemeChange,
  packedFieldRemapPreview,
  packedFieldRemapRootPreview,
  packedFieldRemapSelections,
  packedFieldRemapRootSelections,
  packedFieldRemapBulkPropsRemainInternal,
  packedFieldRemapSelectionKinds: packedFieldRemapSelections.map(consumePackedFieldRemapSelection),
  packedFieldRemapPreviewProps,
  verifyPackedGraphAuthoring,
  commands: createWorkbenchShellCommands({ activities: [] }),
  quickOpenProvider,
  quickOpenPath: resolveQuickOpenItemPath({ id: 'README.md', label: 'README.md' }),
  resolvedTheme: resolveWorkbenchTheme('dark'),
  commandPaletteShortcut: getWorkbenchCommandPaletteShortcutLabel(),
  commandPaletteShortcutMatches: matchesWorkbenchCommandPaletteShortcut({
    ctrlKey: true,
    key: 'p',
    shiftKey: true,
  }),
  quickAccessShortcut: getWorkbenchQuickAccessShortcutLabel(),
  quickAccessShortcutMatches: matchesWorkbenchQuickAccessShortcut({ ctrlKey: true, key: 'p' }),
  shortcutMatches: matchesWorkbenchShortcut({
    event: { ctrlKey: true, key: 'p' },
    shortcut: 'Ctrl+P',
  }),
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'appearance-public-compatibility.ts'),
    `import {
  REQUIRED_THEME_TOKEN_KEYS,
  ThemeRegistry,
  createWorkbenchHostThemeRegistration,
  registerHostWorkbenchThemes,
  registerWorkbenchTheme,
  type RegisterWorkbenchThemeOptions,
  type WorkbenchHostThemeRegistration,
} from '@workbench-kit/workbench-core';
import type {
  WorkbenchProviderProps,
  WorkbenchShellProps,
  WorkbenchThemeOption,
} from '@workbench-kit/shell-react';
import {
  createWorkbenchHostThemeRegistration as createWorkbenchHostThemeRegistrationFromShell,
  registerHostWorkbenchThemes as registerHostWorkbenchThemesFromShell,
  registerWorkbenchTheme as registerWorkbenchThemeFromShell,
} from '@workbench-kit/shell-react';

// These 072F modules are implementation details: a root-barrel leak or a new packed subpath must
// fail this external consumer fixture.
type PackedShellReactPublicValues = typeof import('@workbench-kit/shell-react');
type PackedShellReactShellPublicValues = typeof import('@workbench-kit/shell-react/shell');
type PackedPrivateAppearanceValueName =
  | 'createWorkbenchAppearanceCatalogSnapshot'
  | 'getWorkbenchAppearanceCatalogEntries'
  | 'resolveWorkbenchAppearanceSelection'
  | 'resolveWorkbenchAppearancePresentation'
  | 'createWorkbenchAppearanceOverrideSnapshot'
  | 'createWorkbenchDocumentAppearanceOverrideController'
  | 'createWorkbenchDocumentAppearanceDiagnosticController'
  | 'createWorkbenchThemeOptionSnapshot'
  | 'readPersistedWorkbenchAppearanceResult'
  | 'writePersistedWorkbenchAppearanceResult';
type PackedPrivateAppearanceValuesRemainInternal = Extract<
  keyof PackedShellReactPublicValues | keyof PackedShellReactShellPublicValues,
  PackedPrivateAppearanceValueName
> extends never
  ? true
  : never;
export const packedPrivateAppearanceValuesRemainInternal: PackedPrivateAppearanceValuesRemainInternal =
  true;

// @ts-expect-error WB-NS-072F catalog types remain private to shell-react.
type PackedPrivateAppearanceCatalogType = import('@workbench-kit/shell-react').WorkbenchAppearanceCatalogSnapshot;
// @ts-expect-error WB-NS-072F controller types remain private to shell-react.
type PackedPrivateAppearanceControllerType = import('@workbench-kit/shell-react').WorkbenchDocumentAppearanceOverrideController;
// @ts-expect-error WB-NS-072F presentation types remain private to shell-react.
type PackedPrivateAppearancePresentationType = import('@workbench-kit/shell-react').WorkbenchAppearancePresentationDecision;
// @ts-expect-error WB-NS-072F catalog types do not leak through the public shell subpath.
type PackedPrivateAppearanceCatalogShellType = import('@workbench-kit/shell-react/shell').WorkbenchAppearanceCatalogSnapshot;
// @ts-expect-error WB-NS-072F controller types do not leak through the public shell subpath.
type PackedPrivateAppearanceControllerShellType = import('@workbench-kit/shell-react/shell').WorkbenchDocumentAppearanceOverrideController;
// @ts-expect-error WB-NS-072F presentation types do not leak through the public shell subpath.
type PackedPrivateAppearancePresentationShellType = import('@workbench-kit/shell-react/shell').WorkbenchAppearancePresentationDecision;
// @ts-expect-error WB-NS-072F catalog has no packed public subpath.
type PackedPrivateAppearanceCatalogSubpath = typeof import('@workbench-kit/shell-react/appearance-catalog');
// @ts-expect-error WB-NS-072F controller has no packed public subpath.
type PackedPrivateAppearanceControllerSubpath = typeof import('@workbench-kit/shell-react/appearance-controller');
// @ts-expect-error WB-NS-072F presentation has no packed public subpath.
type PackedPrivateAppearancePresentationSubpath = typeof import('@workbench-kit/shell-react/appearance-presentation');

const packedTokenOverrides = Object.freeze(
  Object.fromEntries(REQUIRED_THEME_TOKEN_KEYS.map((key) => [key, '#202020'])),
) satisfies Readonly<Record<string, string>>;
const packedThemeRegistrationOptions: RegisterWorkbenchThemeOptions = {
  label: 'Packed direct theme',
  mode: 'dark',
};
const packedHostTheme: WorkbenchHostThemeRegistration = createWorkbenchHostThemeRegistration(
  'workbench-kit.consumer.host-theme',
  packedTokenOverrides,
  { label: 'Packed host theme', mode: 'light' },
);
export const packedShellThemeRegistrationHelperParity: {
  create: typeof createWorkbenchHostThemeRegistration;
  register: typeof registerWorkbenchTheme;
  registerHost: typeof registerHostWorkbenchThemes;
} = {
  create: createWorkbenchHostThemeRegistrationFromShell,
  register: registerWorkbenchThemeFromShell,
  registerHost: registerHostWorkbenchThemesFromShell,
};

export const packedWorkbenchProviderAppearanceProps: Pick<
  WorkbenchProviderProps,
  'hostThemes'
> = { hostThemes: [packedHostTheme] };

export const packedWorkbenchThemeOption: WorkbenchThemeOption = {
  description: 'Packed ReactNode-compatible description',
  id: 'workbench-kit.consumer.flat-theme',
  label: 'Packed flat theme',
};
packedWorkbenchThemeOption.label = 'Packed mutable flat theme';

const packedAppearanceChanges: string[] = [];
export const packedWorkbenchShellAppearanceProps: Pick<
  WorkbenchShellProps,
  | 'theme'
  | 'lightPreset'
  | 'darkPreset'
  | 'onThemeChange'
  | 'onLightPresetChange'
  | 'onDarkPresetChange'
> = {
  darkPreset: 'purple',
  lightPreset: 'skyblue',
  onDarkPresetChange: (preset) => packedAppearanceChanges.push(preset),
  onLightPresetChange: (preset) => packedAppearanceChanges.push(preset),
  onThemeChange: (theme) => packedAppearanceChanges.push(theme),
  theme: 'system',
};

export function verifyPackedThemeRegistrationHelpers(): void {
  const registry: ThemeRegistry = new ThemeRegistry();
  const direct = registerWorkbenchTheme(
    registry,
    'workbench-kit.consumer.direct-theme',
    packedTokenOverrides,
    packedThemeRegistrationOptions,
  );
  const host = registerHostWorkbenchThemes(registry, [packedHostTheme]);
  host.dispose();
  direct.dispose();
  registry.dispose();
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'graph-authoring-runtime.ts'),
    `import {
  resolveNodeTypeCatalog,
  validateNodeTypeDescriptor,
  type NodeTypeDescriptor,
} from '@workbench-kit/contracts';
import {
  projectValueTransformToNodeType,
  type ValueTransformDefinition,
} from '@workbench-kit/field-remap';

export function verifyPackedGraphAuthoringRuntime(): {
  descriptor: NodeTypeDescriptor;
  transform: ValueTransformDefinition;
} {
  const descriptor: NodeTypeDescriptor = {
    id: 'workbench.consumer.transform',
    version: '1.0.0',
    inputs: [{ id: 'input', value: { type: 'number' }, required: true }],
    outputs: [{ id: 'output', value: { type: 'number' } }],
    designTime: { label: 'Consumer transform' },
  };
  const catalog = resolveNodeTypeCatalog([
    { contributorId: 'packed-consumer', nodeTypes: [descriptor] },
  ]);
  if (validateNodeTypeDescriptor(descriptor).length > 0 || catalog.catalog.nodeTypes().length !== 1) {
    throw new Error('Packed node type runtime validation failed.');
  }

  const transform: ValueTransformDefinition = {
    id: 'consumer:identity-number',
    label: 'Identity number',
    inputTypes: ['number'],
    outputType: 'number',
    apply: (value) => value,
  };
  const projection = projectValueTransformToNodeType(transform, {
    nodeTypeRef: { id: 'workbench.consumer.identity-number', version: '1.0.0' },
  });
  if (projection.descriptor === null || projection.issues.length > 0) {
    throw new Error('Packed transform projection failed.');
  }
  return { descriptor, transform };
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'ui-generative-plan-types.ts'),
    `import {
  admitUiGenerativeUiRequest,
  createUiGenerativeUiPlan,
  finalizeUiGenerativeUiPlan,
  previewUiGenerativeUiPlan,
  type AdmitUiGenerativeUiRequestInput,
  type CreateUiGenerativeUiPlanInput,
  type GenerativeUiPlannerPort,
  type UiDocumentAtomicCommandV3,
  type UiDocumentV3,
  type UiGenerativeAuthoringContextV1,
  type UiGenerativeUiBatchCommand,
  type UiGenerativeUiBlockedPlan,
  type UiGenerativeUiBlockedPlanPreview,
  type UiGenerativeUiDiagnostic,
  type UiGenerativeUiDiagnosticCode,
  type UiGenerativeUiPlan,
  type UiGenerativeUiPlanBase,
  type UiGenerativeUiPlanFinalizeContext,
  type UiGenerativeUiPlanFinalizeResult,
  type UiGenerativeUiPlannerDiagnostic,
  type UiGenerativeUiPlannerResult,
  type UiGenerativeUiPlanPreview,
  type UiGenerativeUiProposal,
  type UiGenerativeUiRequest,
  type UiGenerativeUiRequestAdmissionResult,
  type UiGenerativeUiValidPlan,
  type UiGenerativeUiValidPlanPreview,
} from '@workbench-kit/jdw';

// @ts-expect-error Strict authoring snapshot helpers remain private to JDW.
import { cloneUiAuthoringJsonValue } from '@workbench-kit/jdw';
// @ts-expect-error WB-NS-070F adds no public implementation subpath.
type PackedPrivateGenerativePlanModule = typeof import('@workbench-kit/jdw/ui-authoring/generative-plan');
// @ts-expect-error Strict authoring snapshot helpers have no public deep subpath.
type PackedPrivateUiAuthoringImmutabilityModule = typeof import('@workbench-kit/jdw/ui-authoring/immutability');

declare const packedAtomicCommand: UiDocumentAtomicCommandV3;
declare const packedCandidateDocument: UiDocumentV3;
declare const packedRequest: UiGenerativeUiRequest;
declare const packedPlanBase: UiGenerativeUiPlanBase;
declare const packedValidPlan: UiGenerativeUiValidPlan;
declare const packedFinalizeContext: UiGenerativeUiPlanFinalizeContext;

const packedPlannerDiagnostic: UiGenerativeUiPlannerDiagnostic = {
  code: 'planner-unavailable',
  message: 'Planner unavailable.',
  path: 'planner',
};
const packedDiagnostic: UiGenerativeUiDiagnostic = {
  code: 'invalid-proposal',
  message: 'Invalid proposal.',
  path: 'proposal',
};
const packedProposal = {
  schemaVersion: 1,
  proposalId: 'packed-proposal',
  requestId: packedRequest.requestId,
  commands: [packedAtomicCommand],
} satisfies UiGenerativeUiProposal;

export const packedGenerativeUiPlanner: GenerativeUiPlannerPort = {
  propose: async () => ({ status: 'proposal', proposal: packedProposal }),
};
export const packedPlannerProposalResult = {
  status: 'proposal',
  proposal: packedProposal,
} satisfies UiGenerativeUiPlannerResult;
export const packedPlannerUnavailableResult = {
  status: 'unavailable',
  diagnostics: [packedPlannerDiagnostic],
} satisfies UiGenerativeUiPlannerResult;
export const packedAdmittedRequest = {
  status: 'admitted',
  request: packedRequest,
  diagnostics: [],
} satisfies UiGenerativeUiRequestAdmissionResult;
export const packedRejectedRequest = {
  status: 'rejected',
  diagnostics: [packedDiagnostic],
} satisfies UiGenerativeUiRequestAdmissionResult;

export const packedBlockedPlan = {
  ...packedPlanBase,
  blocked: true,
  commands: [],
  referencedComponentSnapshots: [],
  referencedLayoutStrategySnapshots: [],
  referencedLayoutPropertySnapshots: [],
  diagnostics: [packedDiagnostic],
} satisfies UiGenerativeUiBlockedPlan;
export const packedPlan: UiGenerativeUiPlan = packedValidPlan;
export const packedValidPreview = {
  blocked: false,
  planId: packedValidPlan.planId,
  candidateDocument: packedCandidateDocument,
  commands: [packedAtomicCommand],
  diagnostics: [],
} satisfies UiGenerativeUiValidPlanPreview;
export const packedBlockedPreview = {
  blocked: true,
  planId: packedBlockedPlan.planId,
  commands: [],
  diagnostics: [packedDiagnostic],
} satisfies UiGenerativeUiBlockedPlanPreview;
export const packedPreview: UiGenerativeUiPlanPreview = packedValidPreview;

export const packedGenerativeBatch = {
  type: 'batch',
  commandId: 'packed-generative-plan',
  commands: [packedAtomicCommand],
} satisfies UiGenerativeUiBatchCommand;
export const packedFinalizeSuccess = {
  command: packedGenerativeBatch,
  diagnostics: [],
} satisfies UiGenerativeUiPlanFinalizeResult;
export const packedFinalizeFailure = {
  diagnostics: [packedDiagnostic],
} satisfies UiGenerativeUiPlanFinalizeResult;

export type PackedGenerativeUiRootTypes = {
  admissionInput: AdmitUiGenerativeUiRequestInput;
  authoringContext: UiGenerativeAuthoringContextV1;
  blockedPlan: UiGenerativeUiBlockedPlan;
  blockedPreview: UiGenerativeUiBlockedPlanPreview;
  createPlanInput: CreateUiGenerativeUiPlanInput;
  diagnostic: UiGenerativeUiDiagnostic;
  diagnosticCode: UiGenerativeUiDiagnosticCode;
  finalizeContext: UiGenerativeUiPlanFinalizeContext;
  finalizeResult: UiGenerativeUiPlanFinalizeResult;
  planner: GenerativeUiPlannerPort;
  plannerDiagnostic: UiGenerativeUiPlannerDiagnostic;
  plannerResult: UiGenerativeUiPlannerResult;
  plan: UiGenerativeUiPlan;
  planBase: UiGenerativeUiPlanBase;
  preview: UiGenerativeUiPlanPreview;
  proposal: UiGenerativeUiProposal;
  request: UiGenerativeUiRequest;
  requestAdmission: UiGenerativeUiRequestAdmissionResult;
  validPlan: UiGenerativeUiValidPlan;
  validPreview: UiGenerativeUiValidPlanPreview;
};
export const packedGenerativeUiFunctions = Object.freeze({
  admitUiGenerativeUiRequest,
  createUiGenerativeUiPlan,
  finalizeUiGenerativeUiPlan,
  previewUiGenerativeUiPlan,
});
void packedFinalizeContext;
void cloneUiAuthoringJsonValue;
type _PackedPrivateGenerativePlanModule = PackedPrivateGenerativePlanModule;
type _PackedPrivateUiAuthoringImmutabilityModule = PackedPrivateUiAuthoringImmutabilityModule;

// @ts-expect-error A proposal result cannot also carry diagnostics.
export const packedInvalidMixedPlannerResult: UiGenerativeUiPlannerResult = { status: 'proposal', proposal: packedProposal, diagnostics: [packedPlannerDiagnostic] };
// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined on an impossible field.
export const packedInvalidUndefinedPlannerDiagnostics: UiGenerativeUiPlannerResult = { status: 'proposal', proposal: packedProposal, diagnostics: undefined };
// @ts-expect-error A blocked plan cannot expose a candidate document.
export const packedInvalidMixedBlockedPlan: UiGenerativeUiBlockedPlan = { ...packedBlockedPlan, candidateDocument: packedCandidateDocument };
// @ts-expect-error A finalize failure cannot also return a command.
export const packedInvalidMixedFinalizeResult: UiGenerativeUiPlanFinalizeResult = { command: packedGenerativeBatch, diagnostics: [packedDiagnostic] };
// @ts-expect-error Finalize success requires one outer non-empty batch, never an atomic command.
export const packedInvalidAtomicFinalizeResult: UiGenerativeUiPlanFinalizeResult = { command: packedAtomicCommand, diagnostics: [] };
// @ts-expect-error A generative outer batch must contain at least one atomic command.
export const packedInvalidEmptyGenerativeBatch: UiGenerativeUiBatchCommand = { type: 'batch', commandId: 'packed-empty-plan', commands: [] };
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'authoring-development-types.ts'),
    `import {
  resolveNodeTypeCatalog,
  resolveUiComponentCatalog,
  type UiAtomicComponentDescriptor,
} from '@workbench-kit/contracts';
import {
  AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES,
  AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  parseAuthoringDevelopmentRequirement,
  reconcileAuthoringDevelopmentRequirement,
  resolveAuthoringDevelopmentRequirement,
  type AuthoringDevelopmentComponentRequirement,
  type AuthoringDevelopmentIntent,
  type AuthoringDevelopmentNodeTypeRequirement,
  type AuthoringDevelopmentRequirement,
  type AuthoringDevelopmentRequirementIssue,
  type AuthoringDevelopmentRequirementIssueCode,
  type AuthoringDevelopmentRequirementParseResult,
  type AuthoringDevelopmentRequirementResolution,
  type AuthoringDevelopmentRequirementResumeResolution,
  type AuthoringDevelopmentRequirementResumeStatus,
  type AuthoringDevelopmentRequirementStatus,
  type AuthoringDevelopmentTarget,
} from '@workbench-kit/contracts/authoring-development';

// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentComponentRequirement as RootAuthoringDevelopmentComponentRequirement } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentIntent as RootAuthoringDevelopmentIntent } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentNodeTypeRequirement as RootAuthoringDevelopmentNodeTypeRequirement } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirement as RootAuthoringDevelopmentRequirement } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementIssue as RootAuthoringDevelopmentRequirementIssue } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementIssueCode as RootAuthoringDevelopmentRequirementIssueCode } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementParseResult as RootAuthoringDevelopmentRequirementParseResult } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementResolution as RootAuthoringDevelopmentRequirementResolution } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementResumeResolution as RootAuthoringDevelopmentRequirementResumeResolution } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementResumeStatus as RootAuthoringDevelopmentRequirementResumeStatus } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentRequirementStatus as RootAuthoringDevelopmentRequirementStatus } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B remains available only from the focused public subpath.
import type { AuthoringDevelopmentTarget as RootAuthoringDevelopmentTarget } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071B snapshot helpers remain private implementation details.
import { snapshotAuthoringDevelopmentValue } from '@workbench-kit/contracts/authoring-development/snapshot';
// @ts-expect-error WB-NS-071B snapshot helpers remain private implementation details.
import { UnsupportedAuthoringDevelopmentSnapshotValueError } from '@workbench-kit/contracts/authoring-development/snapshot';

const descriptor: UiAtomicComponentDescriptor = {
  id: 'workbench.consumer.packed-card',
  version: '1.0.0',
  kind: 'atomic',
  properties: [{ id: 'title', value: { type: 'string' } }],
  designTime: { label: 'Packed card' },
};

export const packedAuthoringDevelopmentRequirement = {
  schemaVersion: AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-authoring-development',
  target: { kind: 'component', descriptor },
  intent: { summary: 'Provide a reusable packed card.', acceptance: ['Renders a title.'] },
} satisfies AuthoringDevelopmentRequirement;

export const packedAuthoringDevelopmentTarget: AuthoringDevelopmentTarget =
  packedAuthoringDevelopmentRequirement.target;
export const packedAuthoringDevelopmentComponentRequirement: AuthoringDevelopmentComponentRequirement =
  packedAuthoringDevelopmentRequirement;
export const packedAuthoringDevelopmentNodeTypeRequirement: AuthoringDevelopmentNodeTypeRequirement = {
  schemaVersion: AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-authoring-development-node',
  target: {
    kind: 'node-type',
    descriptor: {
      id: 'workbench.consumer.packed-node',
      version: '1.0.0',
      inputs: [{ id: 'input', value: { type: 'string' } }],
      outputs: [{ id: 'output', value: { type: 'string' } }],
      designTime: { label: 'Packed node' },
    },
  },
  intent: { summary: 'Provide a reusable packed node.', acceptance: ['Exposes exact ports.'] },
};
export const packedAuthoringDevelopmentIssueCode: AuthoringDevelopmentRequirementIssueCode =
  'malformed-requirement';
export const packedAuthoringDevelopmentIssue: AuthoringDevelopmentRequirementIssue = {
  code: packedAuthoringDevelopmentIssueCode,
  message: 'Packed issue',
  path: '$',
};
export const packedAuthoringDevelopmentStatuses: readonly AuthoringDevelopmentRequirementStatus[] =
  ['missing', 'fulfilled', 'identity-conflict', 'catalog-unavailable', 'invalid', 'unsupported-version'];
export const packedAuthoringDevelopmentResumeStatuses: readonly AuthoringDevelopmentRequirementResumeStatus[] =
  ['same-requirement', 'new-requirement', 'requirement-id-conflict', 'invalid', 'unsupported-version'];
if (!AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES.includes(packedAuthoringDevelopmentIssueCode)) {
  throw new TypeError('Packed authoring-development issue vocabulary is incomplete.');
}

// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined for an optional field.
export const packedInvalidOptionalIntent: AuthoringDevelopmentIntent = {
  summary: 'Invalid optional intent',
  acceptance: [],
  nonGoals: undefined,
};

export function consumePackedAuthoringDevelopmentParseResult(
  result: AuthoringDevelopmentRequirementParseResult,
): string {
  switch (result.status) {
    case 'valid':
      return result.requirement.requirementId;
    case 'invalid':
    case 'unsupported-version':
      return result.issues[0]?.code ?? result.status;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

export function consumePackedAuthoringDevelopmentResolution(
  result: AuthoringDevelopmentRequirementResolution,
): string {
  switch (result.status) {
    case 'missing':
    case 'fulfilled':
    case 'identity-conflict':
    case 'catalog-unavailable':
    case 'invalid':
    case 'unsupported-version':
      return result.status;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

export function consumePackedAuthoringDevelopmentResumeResolution(
  result: AuthoringDevelopmentRequirementResumeResolution,
): string {
  switch (result.status) {
    case 'same-requirement':
    case 'new-requirement':
    case 'requirement-id-conflict':
    case 'invalid':
    case 'unsupported-version':
      return result.status;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

const parsed = parseAuthoringDevelopmentRequirement(packedAuthoringDevelopmentRequirement);
if (parsed.status === 'valid') {
  const catalogs = {
    components: resolveUiComponentCatalog([]).catalog,
    nodeTypes: resolveNodeTypeCatalog([]).catalog,
  };
  consumePackedAuthoringDevelopmentResolution(
    resolveAuthoringDevelopmentRequirement(parsed.requirement, catalogs),
  );
  consumePackedAuthoringDevelopmentResumeResolution(
    reconcileAuthoringDevelopmentRequirement(parsed.requirement, parsed.requirement),
  );
}

void (0 as unknown as RootAuthoringDevelopmentRequirement);
void (0 as unknown as RootAuthoringDevelopmentComponentRequirement);
void (0 as unknown as RootAuthoringDevelopmentIntent);
void (0 as unknown as RootAuthoringDevelopmentNodeTypeRequirement);
void (0 as unknown as RootAuthoringDevelopmentRequirementIssue);
void (0 as unknown as RootAuthoringDevelopmentRequirementIssueCode);
void (0 as unknown as RootAuthoringDevelopmentRequirementParseResult);
void (0 as unknown as RootAuthoringDevelopmentRequirementResolution);
void (0 as unknown as RootAuthoringDevelopmentRequirementResumeResolution);
void (0 as unknown as RootAuthoringDevelopmentRequirementResumeStatus);
void (0 as unknown as RootAuthoringDevelopmentRequirementStatus);
void (0 as unknown as RootAuthoringDevelopmentTarget);
void snapshotAuthoringDevelopmentValue;
void UnsupportedAuthoringDevelopmentSnapshotValueError;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'external-node-catalog-types.ts'),
    `import {
  EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES,
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS,
  EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
  projectExternalNodeCatalogContribution,
  type ExternalDynamicNodeCatalogEntry,
  type ExternalNodeCatalogEntry,
  type ExternalNodeCatalogProjectionAcceptance,
  type ExternalNodeCatalogProjectionAcceptances,
  type ExternalNodeCatalogProjectionIssue,
  type ExternalNodeCatalogProjectionIssueCode,
  type ExternalNodeCatalogProjectionIssues,
  type ExternalNodeCatalogProjectionMapping,
  type ExternalNodeCatalogProjectionResult,
  type ExternalNodeCatalogSnapshot,
  type ExternalNodeDynamicInputSnapshot,
  type ExternalNodeDynamicOutputSnapshot,
  type ExternalNodeFixedInputSnapshot,
  type ExternalNodeFixedOutputSnapshot,
  type ExternalNodeIdentityMapping,
  type ExternalNodeInputSnapshot,
  type ExternalNodeOutputSnapshot,
  type ExternalNodeValueSemanticMapping,
  type ExternalStaticNodeCatalogEntry,
} from '@workbench-kit/contracts/external-node-catalog';

// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import { EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES as RootExternalNodeCatalogIssueCodes } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import { EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS as RootExternalNodeCatalogLimits } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import { EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION as RootExternalNodeCatalogSchemaVersion } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import { projectExternalNodeCatalogContribution as RootProjectExternalNodeCatalogContribution } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalDynamicNodeCatalogEntry as RootExternalDynamicNodeCatalogEntry } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogEntry as RootExternalNodeCatalogEntry } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionAcceptance as RootExternalNodeCatalogProjectionAcceptance } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionAcceptances as RootExternalNodeCatalogProjectionAcceptances } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionIssue as RootExternalNodeCatalogProjectionIssue } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionIssueCode as RootExternalNodeCatalogProjectionIssueCode } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionIssues as RootExternalNodeCatalogProjectionIssues } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionMapping as RootExternalNodeCatalogProjectionMapping } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogProjectionResult as RootExternalNodeCatalogProjectionResult } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeCatalogSnapshot as RootExternalNodeCatalogSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeDynamicInputSnapshot as RootExternalNodeDynamicInputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeDynamicOutputSnapshot as RootExternalNodeDynamicOutputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeFixedInputSnapshot as RootExternalNodeFixedInputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeFixedOutputSnapshot as RootExternalNodeFixedOutputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeIdentityMapping as RootExternalNodeIdentityMapping } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeInputSnapshot as RootExternalNodeInputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeOutputSnapshot as RootExternalNodeOutputSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalNodeValueSemanticMapping as RootExternalNodeValueSemanticMapping } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C remains available only from the focused public subpath.
import type { ExternalStaticNodeCatalogEntry as RootExternalStaticNodeCatalogEntry } from '@workbench-kit/contracts';
// @ts-expect-error WB-NS-071C implementation modules remain private.
import { projectExternalNodeCatalogContribution as PrivateExternalNodeCatalogProjector } from '@workbench-kit/contracts/external-node-catalog/projection';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import { createStrictPortableDataBudget as RootCreateStrictPortableDataBudget } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import { snapshotStrictPortableData as RootSnapshotStrictPortableData } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import { StrictPortableDataError as RootStrictPortableDataError } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import type { StrictPortableDataBudget as RootStrictPortableDataBudget } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import type { StrictPortableDataFailureKind as RootStrictPortableDataFailureKind } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the package root.
import type { StrictPortableDataSnapshotOptions as RootStrictPortableDataSnapshotOptions } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private value-schema symbols never reach the package root.
import { collectNoncanonicalUiValueSchemaText as RootCollectNoncanonicalUiValueSchemaText } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private value-schema symbols never reach the package root.
import { isSupportedUiValueSchemaShape as RootIsSupportedUiValueSchemaShape } from '@workbench-kit/contracts';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import { createStrictPortableDataBudget as FocusedCreateStrictPortableDataBudget } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import { snapshotStrictPortableData as FocusedSnapshotStrictPortableData } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import { StrictPortableDataError as FocusedStrictPortableDataError } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import type { StrictPortableDataBudget as FocusedStrictPortableDataBudget } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import type { StrictPortableDataFailureKind as FocusedStrictPortableDataFailureKind } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data symbols never reach the focused public leaf.
import type { StrictPortableDataSnapshotOptions as FocusedStrictPortableDataSnapshotOptions } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private value-schema symbols never reach the focused public leaf.
import { collectNoncanonicalUiValueSchemaText as FocusedCollectNoncanonicalUiValueSchemaText } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private value-schema symbols never reach the focused public leaf.
import { isSupportedUiValueSchemaShape as FocusedIsSupportedUiValueSchemaShape } from '@workbench-kit/contracts/external-node-catalog';
// @ts-expect-error contracts-private strict portable data modules are not packed public subpaths.
import { snapshotStrictPortableData as PrivateSnapshotStrictPortableData } from '@workbench-kit/contracts/internal/strict-portable-data';
// @ts-expect-error contracts-private value-schema modules are not packed public subpaths.
import { isSupportedUiValueSchemaShape as PrivateIsSupportedUiValueSchemaShape } from '@workbench-kit/contracts/internal/ui-value-schema-shape';

export type PackedExternalNodeCatalogTypes = {
  dynamicEntry: ExternalDynamicNodeCatalogEntry;
  entry: ExternalNodeCatalogEntry;
  acceptance: ExternalNodeCatalogProjectionAcceptance;
  acceptances: ExternalNodeCatalogProjectionAcceptances;
  issue: ExternalNodeCatalogProjectionIssue;
  issueCode: ExternalNodeCatalogProjectionIssueCode;
  issues: ExternalNodeCatalogProjectionIssues;
  mapping: ExternalNodeCatalogProjectionMapping;
  result: ExternalNodeCatalogProjectionResult;
  snapshot: ExternalNodeCatalogSnapshot;
  dynamicInput: ExternalNodeDynamicInputSnapshot;
  dynamicOutput: ExternalNodeDynamicOutputSnapshot;
  fixedInput: ExternalNodeFixedInputSnapshot;
  fixedOutput: ExternalNodeFixedOutputSnapshot;
  identity: ExternalNodeIdentityMapping;
  input: ExternalNodeInputSnapshot;
  output: ExternalNodeOutputSnapshot;
  value: ExternalNodeValueSemanticMapping;
  staticEntry: ExternalStaticNodeCatalogEntry;
};

export const packedExternalNodeCatalogSnapshot = {
  schemaVersion: EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
  entries: [
    {
      kind: 'static',
      sourceTypeKey: 'packed.static-node@1',
      inputs: [
        {
          kind: 'fixed',
          id: 'input',
          valueSemanticId: 'packed.text',
          required: true,
        },
      ],
      outputs: [
        {
          kind: 'fixed',
          id: 'output',
          valueSemanticId: 'packed.text',
        },
      ],
      designTime: { label: 'Packed static node' },
    },
  ],
} satisfies ExternalNodeCatalogSnapshot;

export const packedExternalNodeCatalogMapping = {
  schemaVersion: EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
  contributorId: 'workbench.consumer.packed-external-node-catalog',
  identities: [
    {
      sourceTypeKey: 'packed.static-node@1',
      target: { id: 'workbench.consumer.packed-static-node', version: '1.0.0' },
    },
  ],
  values: [{ sourceSemanticId: 'packed.text', target: { type: 'string' } }],
} satisfies ExternalNodeCatalogProjectionMapping;

export const packedExternalNodeCatalogProjection = projectExternalNodeCatalogContribution(
  packedExternalNodeCatalogSnapshot,
  packedExternalNodeCatalogMapping,
);
export const packedExternalNodeCatalogIssueCode: ExternalNodeCatalogProjectionIssueCode =
  'invalid-foreign-entry';
if (
  !EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES.includes(packedExternalNodeCatalogIssueCode) ||
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxEntries !== 512
) {
  throw new TypeError('Packed external-node-catalog constants are incomplete.');
}

// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined for an optional field.
export const packedInvalidExternalInputOptional: ExternalNodeFixedInputSnapshot = { kind: 'fixed', id: 'input', label: undefined, valueSemanticId: 'packed.text' };
// @ts-expect-error top-level issues cannot expose source or mapping coordinates.
export const packedInvalidExternalTopLevelCoordinate: ExternalNodeCatalogProjectionIssue = { code: 'unsupported-schema-version', message: 'Invalid coordinate', path: '$.schemaVersion', sourceIndex: 0 };
// @ts-expect-error mapping issues require their exact mapping ordinal.
export const packedInvalidExternalMappingCoordinate: ExternalNodeCatalogProjectionIssue = { code: 'duplicate-identity-mapping', message: 'Missing coordinate', path: '$.identities' };
// @ts-expect-error keyed source issues cannot expose a mapping ordinal.
export const packedInvalidExternalSourceCoordinate: ExternalNodeCatalogProjectionIssue = { code: 'missing-identity-mapping', message: 'Invalid coordinate', path: '$.entries[0]', sourceIndex: 0, sourceTypeKey: 'packed.static-node@1', mappingIndex: 0 };
// @ts-expect-error partial results require at least one acceptance.
export const packedInvalidExternalPartial: ExternalNodeCatalogProjectionResult = { status: 'partial', contribution: { contributorId: 'packed', nodeTypes: [] }, accepted: [], issues: [{ code: 'duplicate-identity-mapping', message: 'Duplicate', path: '$.identities[0]', mappingIndex: 0 }] };
// @ts-expect-error unsupported-version is coupled only to unsupported-schema-version.
export const packedInvalidExternalUnsupportedStatus: ExternalNodeCatalogProjectionResult = { status: 'unsupported-version', accepted: [], issues: [{ code: 'invalid-foreign-snapshot', message: 'Invalid', path: '$' }] };

export function consumePackedExternalNodeCatalogResult(
  result: ExternalNodeCatalogProjectionResult,
): string {
  switch (result.status) {
    case 'complete':
    case 'partial':
      return result.contribution.contributorId;
    case 'rejected':
    case 'invalid':
    case 'unsupported-version':
      return result.issues[0].code;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

void RootExternalNodeCatalogIssueCodes;
void RootExternalNodeCatalogLimits;
void RootExternalNodeCatalogSchemaVersion;
void RootProjectExternalNodeCatalogContribution;
void PrivateExternalNodeCatalogProjector;
void RootCreateStrictPortableDataBudget;
void RootSnapshotStrictPortableData;
void RootStrictPortableDataError;
void RootCollectNoncanonicalUiValueSchemaText;
void RootIsSupportedUiValueSchemaShape;
void FocusedCreateStrictPortableDataBudget;
void FocusedSnapshotStrictPortableData;
void FocusedStrictPortableDataError;
void FocusedCollectNoncanonicalUiValueSchemaText;
void FocusedIsSupportedUiValueSchemaShape;
void PrivateSnapshotStrictPortableData;
void PrivateIsSupportedUiValueSchemaShape;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'source-input-compatibility-types.ts'),
    `import {
  UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION,
  UI_SOURCE_INPUT_ISSUE_CODES,
  UI_SOURCE_INPUT_LIMITS,
  resolveUiSourceInputCandidates,
  type UiConvertibleSourceInputCandidate,
  type UiExactSourceInputCandidate,
  type UiIncompatibleSourceInputCandidate,
  type UiSourceBindingAssignment,
  type UiSourceInputAdmissionIssue,
  type UiSourceInputCandidate,
  type UiSourceInputCandidateBase,
  type UiSourceInputCandidateSetResult,
  type UiSourceInputCompatibilityRequestV1,
  type UiSourceInputIncompatibleIssue,
  type UiSourceInputIssue,
  type UiSourceInputIssueBase,
  type UiSourceInputIssueCode,
  type UiSourceInputIssueCoordinateKey,
  type UiSourceInputPlanIssue,
  type UiSourceInputRecommendationIssue,
  type UiSourceInputRequestSnapshotV1,
  type UiSourceInputResolution,
  type UiSourceInputStaleIssue,
  type UiSourceInputTargetDescriptor,
  type UiSourceValueDescriptor,
  type UiValueCompatibilitySchemaSnapshot,
  type UiValueConversionEvidence,
} from '@workbench-kit/contracts/source-input-compatibility';
import {
  createUiAuthoringSourceInputPlan,
  finalizeUiAuthoringSourceInputPlan,
  inspectUiAuthoringSourceInputCandidates,
  previewUiAuthoringSourceInputPlan,
  type CreateUiAuthoringSourceInputPlanResult,
  type FinalizeUiAuthoringSourceInputPlanInput,
  type FinalizeUiAuthoringSourceInputPlanResult,
  type UiAuthoringSourceInputCandidateRequestV1,
  type UiAuthoringSourceInputCandidateResult,
  type UiAuthoringSourceInputPlan,
  type UiAuthoringSourceInputPlanPreview,
  type UiAuthoringSourceInputPlanRequestV1,
  type UiAuthoringSourceInputRequestSnapshotV1,
  type UiAuthoringSourceInputSelection,
  type UiSourceInputComponentLookup,
} from '@workbench-kit/jdw';

// @ts-expect-error focused source-input constants do not leak through the contracts root.
import { UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION as RootSourceInputSchemaVersion } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input constants do not leak through the contracts root.
import { UI_SOURCE_INPUT_ISSUE_CODES as RootSourceInputIssueCodes } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input constants do not leak through the contracts root.
import { UI_SOURCE_INPUT_LIMITS as RootSourceInputLimits } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input functions do not leak through the contracts root.
import { resolveUiSourceInputCandidates as RootResolveSourceInputCandidates } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceValueDescriptor as RootUiSourceValueDescriptor } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputTargetDescriptor as RootUiSourceInputTargetDescriptor } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiValueCompatibilitySchemaSnapshot as RootUiValueCompatibilitySchemaSnapshot } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiValueConversionEvidence as RootUiValueConversionEvidence } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceBindingAssignment as RootUiSourceBindingAssignment } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputIssueCoordinateKey as RootUiSourceInputIssueCoordinateKey } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputIssueBase as RootUiSourceInputIssueBase } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputIssueCode as RootUiSourceInputIssueCode } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputAdmissionIssue as RootUiSourceInputAdmissionIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputIncompatibleIssue as RootUiSourceInputIncompatibleIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputRecommendationIssue as RootUiSourceInputRecommendationIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputPlanIssue as RootUiSourceInputPlanIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputStaleIssue as RootUiSourceInputStaleIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputIssue as RootUiSourceInputIssue } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputCandidateBase as RootUiSourceInputCandidateBase } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiExactSourceInputCandidate as RootUiExactSourceInputCandidate } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiConvertibleSourceInputCandidate as RootUiConvertibleSourceInputCandidate } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiIncompatibleSourceInputCandidate as RootUiIncompatibleSourceInputCandidate } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputCandidate as RootUiSourceInputCandidate } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputResolution as RootUiSourceInputResolution } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputCompatibilityRequestV1 as RootUiSourceInputCompatibilityRequestV1 } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputRequestSnapshotV1 as RootUiSourceInputRequestSnapshotV1 } from '@workbench-kit/contracts';
// @ts-expect-error focused source-input types do not leak through the contracts root.
import type { UiSourceInputCandidateSetResult as RootUiSourceInputCandidateSetResult } from '@workbench-kit/contracts';
// @ts-expect-error focused implementation modules remain private package subpaths.
type PackedPrivateSourceInputCompatibilityModule = typeof import('@workbench-kit/contracts/source-input-compatibility/resolver');
// @ts-expect-error JDW source-input implementation modules remain private package subpaths.
type PackedPrivateSourceInputPlanModule = typeof import('@workbench-kit/jdw/ui-authoring/source-input-plan');

const packedSourceValue = {
  id: 'packed-source',
  value: { type: 'string' },
  semanticRole: 'packed.text',
} satisfies UiSourceValueDescriptor;
const packedBinding = {
  sourceId: packedSourceValue.id,
  bindingId: 'packed-binding',
} satisfies UiSourceBindingAssignment;
const packedCompatibilityRequest = {
  schemaVersion: UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION,
  sources: [packedSourceValue],
  targets: [],
  bindings: [packedBinding],
} satisfies UiSourceInputCompatibilityRequestV1;

export const packedSourceInputResult = resolveUiSourceInputCandidates(
  packedCompatibilityRequest,
);
export const packedSourceInputConstants = Object.freeze({
  issueCodes: UI_SOURCE_INPUT_ISSUE_CODES,
  limits: UI_SOURCE_INPUT_LIMITS,
});

export type PackedSourceInputCompatibilityTypes = {
  schema: UiValueCompatibilitySchemaSnapshot;
  conversion: UiValueConversionEvidence;
  target: UiSourceInputTargetDescriptor;
  coordinateKey: UiSourceInputIssueCoordinateKey;
  issueBase: UiSourceInputIssueBase<'no-change'>;
  admissionIssue: UiSourceInputAdmissionIssue;
  incompatibleIssue: UiSourceInputIncompatibleIssue;
  recommendationIssue: UiSourceInputRecommendationIssue;
  planIssue: UiSourceInputPlanIssue;
  staleIssue: UiSourceInputStaleIssue;
  issue: UiSourceInputIssue;
  issueCode: UiSourceInputIssueCode;
  candidateBase: UiSourceInputCandidateBase;
  exact: UiExactSourceInputCandidate;
  convertible: UiConvertibleSourceInputCandidate;
  incompatible: UiIncompatibleSourceInputCandidate;
  candidate: UiSourceInputCandidate;
  resolution: UiSourceInputResolution;
  request: UiSourceInputCompatibilityRequestV1;
  snapshot: UiSourceInputRequestSnapshotV1;
  result: UiSourceInputCandidateSetResult;
  lookup: UiSourceInputComponentLookup;
  candidateRequest: UiAuthoringSourceInputCandidateRequestV1;
  selection: UiAuthoringSourceInputSelection;
  planRequest: UiAuthoringSourceInputPlanRequestV1;
  requestSnapshot: UiAuthoringSourceInputRequestSnapshotV1;
  candidateResult: UiAuthoringSourceInputCandidateResult;
  plan: UiAuthoringSourceInputPlan;
  createResult: CreateUiAuthoringSourceInputPlanResult;
  preview: UiAuthoringSourceInputPlanPreview;
  finalizeInput: FinalizeUiAuthoringSourceInputPlanInput;
  finalizeResult: FinalizeUiAuthoringSourceInputPlanResult;
};

declare const packedCandidateRequestWithoutEvidence: Omit<
  UiAuthoringSourceInputCandidateRequestV1,
  'conversionEvidence'
>;

// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined for source semanticRole.
export const packedInvalidSourceOptional: UiSourceValueDescriptor = { id: 'packed-source', value: { type: 'string' }, semanticRole: undefined };
// @ts-expect-error top-level request issues cannot expose a source coordinate.
export const packedInvalidAdmissionCoordinate: UiSourceInputAdmissionIssue = { code: 'invalid-request', message: 'Invalid', path: '$', sourceId: 'packed-source' };
// @ts-expect-error incompatible issues cannot carry recommendation-only codes.
export const packedInvalidIncompatibleIssue: UiSourceInputIncompatibleIssue = { code: 'ambiguous-exact', message: 'Ambiguous', path: '$.sources[0]', sourceId: 'packed-source' };
// @ts-expect-error blocked compatibility results cannot expose a snapshot.
export const packedInvalidBlockedCompatibilityResult: UiSourceInputCandidateSetResult = { status: 'blocked', issues: [{ code: 'invalid-request', message: 'Invalid', path: '$' }], snapshot: packedCompatibilityRequest };
// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined for conversionEvidence.
export const packedInvalidCandidateRequestOptional: UiAuthoringSourceInputCandidateRequestV1 = { ...packedCandidateRequestWithoutEvidence, conversionEvidence: undefined };

export const packedSourceInputRuntime = Object.freeze({
  createUiAuthoringSourceInputPlan,
  finalizeUiAuthoringSourceInputPlan,
  inspectUiAuthoringSourceInputCandidates,
  previewUiAuthoringSourceInputPlan,
  resolveUiSourceInputCandidates,
});

void RootSourceInputSchemaVersion;
void RootSourceInputIssueCodes;
void RootSourceInputLimits;
void RootResolveSourceInputCandidates;
type _RootUiSourceValueDescriptor = RootUiSourceValueDescriptor;
type _RootUiSourceInputTargetDescriptor = RootUiSourceInputTargetDescriptor;
type _RootUiValueCompatibilitySchemaSnapshot = RootUiValueCompatibilitySchemaSnapshot;
type _RootUiValueConversionEvidence = RootUiValueConversionEvidence;
type _RootUiSourceBindingAssignment = RootUiSourceBindingAssignment;
type _RootUiSourceInputIssueCoordinateKey = RootUiSourceInputIssueCoordinateKey;
type _RootUiSourceInputIssueBase = RootUiSourceInputIssueBase<'no-change'>;
type _RootUiSourceInputIssueCode = RootUiSourceInputIssueCode;
type _RootUiSourceInputAdmissionIssue = RootUiSourceInputAdmissionIssue;
type _RootUiSourceInputIncompatibleIssue = RootUiSourceInputIncompatibleIssue;
type _RootUiSourceInputRecommendationIssue = RootUiSourceInputRecommendationIssue;
type _RootUiSourceInputPlanIssue = RootUiSourceInputPlanIssue;
type _RootUiSourceInputStaleIssue = RootUiSourceInputStaleIssue;
type _RootUiSourceInputIssue = RootUiSourceInputIssue;
type _RootUiSourceInputCandidateBase = RootUiSourceInputCandidateBase;
type _RootUiExactSourceInputCandidate = RootUiExactSourceInputCandidate;
type _RootUiConvertibleSourceInputCandidate = RootUiConvertibleSourceInputCandidate;
type _RootUiIncompatibleSourceInputCandidate = RootUiIncompatibleSourceInputCandidate;
type _RootUiSourceInputCandidate = RootUiSourceInputCandidate;
type _RootUiSourceInputResolution = RootUiSourceInputResolution;
type _RootUiSourceInputCompatibilityRequestV1 = RootUiSourceInputCompatibilityRequestV1;
type _RootUiSourceInputRequestSnapshotV1 = RootUiSourceInputRequestSnapshotV1;
type _RootUiSourceInputCandidateSetResult = RootUiSourceInputCandidateSetResult;
type _PackedPrivateSourceInputCompatibilityModule = PackedPrivateSourceInputCompatibilityModule;
type _PackedPrivateSourceInputPlanModule = PackedPrivateSourceInputPlanModule;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'authoring-development-runtime.cjs'),
    `const contracts = require('@workbench-kit/contracts');
const development = require('@workbench-kit/contracts/authoring-development');

const runtimeNames = [
  'AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES',
  'AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION',
  'parseAuthoringDevelopmentRequirement',
  'reconcileAuthoringDevelopmentRequirement',
  'resolveAuthoringDevelopmentRequirement',
];
for (const name of runtimeNames) {
  if (name in contracts) {
    throw new TypeError('Authoring-development unexpectedly leaked through the contracts root: ' + name);
  }
  if (!(name in development)) {
    throw new TypeError('Packed authoring-development CommonJS export is missing: ' + name);
  }
}
for (const name of [
  'parseAuthoringDevelopmentRequirement',
  'reconcileAuthoringDevelopmentRequirement',
  'resolveAuthoringDevelopmentRequirement',
]) {
  if (typeof development[name] !== 'function') {
    throw new TypeError('Packed authoring-development CommonJS function is invalid: ' + name);
  }
}
if (development.AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION !== 1) {
  throw new TypeError('Packed authoring-development CommonJS schema version is invalid.');
}
const expectedIssueCodes = [
  'unsupported-schema-version',
  'malformed-requirement',
  'malformed-intent',
  'unsupported-target-kind',
  'malformed-target',
  'noncanonical-requirement-text',
  'invalid-component-descriptor',
  'composite-component-target',
  'invalid-node-type-descriptor',
  'unsafe-existing-component-descriptor',
  'unsafe-existing-node-type-descriptor',
  'component-catalog-unavailable',
  'node-type-catalog-unavailable',
  'component-identity-conflict',
  'node-type-identity-conflict',
  'requirement-id-conflict',
];
if (
  !Object.isFrozen(development.AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES) ||
  JSON.stringify(development.AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES) !==
    JSON.stringify(expectedIssueCodes)
) {
  throw new TypeError('Packed authoring-development CommonJS issue vocabulary is invalid.');
}

let privateSubpathRejected = false;
try {
  require('@workbench-kit/contracts/authoring-development/snapshot');
} catch (error) {
  privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}
if (!privateSubpathRejected) {
  throw new TypeError('Packed authoring-development CommonJS private snapshot subpath is exposed.');
}

const descriptor = {
  id: 'workbench.consumer.packed-card',
  version: '1.0.0',
  kind: 'atomic',
  properties: [{ id: 'title', value: { type: 'string' } }],
  designTime: { label: 'Packed card' },
};
const requirement = {
  schemaVersion: development.AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-authoring-development',
  target: { kind: 'component', descriptor },
  intent: { summary: 'Provide a reusable packed card.', acceptance: ['Renders a title.'] },
};
const parsed = development.parseAuthoringDevelopmentRequirement(requirement);
if (
  parsed.status !== 'valid' ||
  !Object.isFrozen(parsed) ||
  !Object.isFrozen(parsed.requirement) ||
  !Object.isFrozen(parsed.requirement.target.descriptor)
) {
  throw new TypeError('Packed authoring-development CommonJS parse contract failed.');
}

const nodeTypes = contracts.resolveNodeTypeCatalog([]).catalog;
const componentCatalog = (components) =>
  contracts.resolveUiComponentCatalog([
    { contributorId: 'packed-authoring-development', components },
  ]).catalog;
const missing = development.resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([]),
  nodeTypes,
});
const fulfilled = development.resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([descriptor]),
  nodeTypes,
});
const conflictingDescriptor = {
  ...descriptor,
  designTime: { ...descriptor.designTime, hiddenFromPalette: true },
};
const conflict = development.resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([conflictingDescriptor]),
  nodeTypes,
});
if (
  missing.status !== 'missing' ||
  fulfilled.status !== 'fulfilled' ||
  conflict.status !== 'identity-conflict'
) {
  throw new TypeError('Packed authoring-development CommonJS resolution contract failed.');
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'authoring-development-runtime.mjs'),
    `import * as contracts from '@workbench-kit/contracts';
import {
  AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES,
  AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  parseAuthoringDevelopmentRequirement,
  reconcileAuthoringDevelopmentRequirement,
  resolveAuthoringDevelopmentRequirement,
} from '@workbench-kit/contracts/authoring-development';

const runtimeNames = [
  'AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES',
  'AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION',
  'parseAuthoringDevelopmentRequirement',
  'reconcileAuthoringDevelopmentRequirement',
  'resolveAuthoringDevelopmentRequirement',
];
for (const name of runtimeNames) {
  if (name in contracts) {
    throw new TypeError('Authoring-development unexpectedly leaked through the contracts root: ' + name);
  }
}
if (
  typeof parseAuthoringDevelopmentRequirement !== 'function' ||
  typeof reconcileAuthoringDevelopmentRequirement !== 'function' ||
  typeof resolveAuthoringDevelopmentRequirement !== 'function' ||
  AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION !== 1
) {
  throw new TypeError('Packed authoring-development ESM exports are incomplete.');
}
const expectedIssueCodes = [
  'unsupported-schema-version',
  'malformed-requirement',
  'malformed-intent',
  'unsupported-target-kind',
  'malformed-target',
  'noncanonical-requirement-text',
  'invalid-component-descriptor',
  'composite-component-target',
  'invalid-node-type-descriptor',
  'unsafe-existing-component-descriptor',
  'unsafe-existing-node-type-descriptor',
  'component-catalog-unavailable',
  'node-type-catalog-unavailable',
  'component-identity-conflict',
  'node-type-identity-conflict',
  'requirement-id-conflict',
];
if (
  !Object.isFrozen(AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES) ||
  JSON.stringify(AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES) !== JSON.stringify(expectedIssueCodes)
) {
  throw new TypeError('Packed authoring-development ESM issue vocabulary is invalid.');
}

let privateSubpathRejected = false;
try {
  await import('@workbench-kit/contracts/authoring-development/snapshot');
} catch (error) {
  privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}
if (!privateSubpathRejected) {
  throw new TypeError('Packed authoring-development ESM private snapshot subpath is exposed.');
}

const descriptor = {
  id: 'workbench.consumer.packed-card',
  version: '1.0.0',
  kind: 'atomic',
  properties: [{ id: 'title', value: { type: 'string' } }],
  designTime: { label: 'Packed card' },
};
const requirement = {
  schemaVersion: AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-authoring-development',
  target: { kind: 'component', descriptor },
  intent: { summary: 'Provide a reusable packed card.', acceptance: ['Renders a title.'] },
};
const parsed = parseAuthoringDevelopmentRequirement(requirement);
if (
  parsed.status !== 'valid' ||
  !Object.isFrozen(parsed) ||
  !Object.isFrozen(parsed.requirement) ||
  !Object.isFrozen(parsed.requirement.target.descriptor)
) {
  throw new TypeError('Packed authoring-development ESM parse contract failed.');
}

const nodeTypes = contracts.resolveNodeTypeCatalog([]).catalog;
const componentCatalog = (components) =>
  contracts.resolveUiComponentCatalog([
    { contributorId: 'packed-authoring-development', components },
  ]).catalog;
const missing = resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([]),
  nodeTypes,
});
const fulfilled = resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([descriptor]),
  nodeTypes,
});
const conflictingDescriptor = {
  ...descriptor,
  designTime: { ...descriptor.designTime, hiddenFromPalette: true },
};
const conflict = resolveAuthoringDevelopmentRequirement(parsed.requirement, {
  components: componentCatalog([conflictingDescriptor]),
  nodeTypes,
});
if (
  missing.status !== 'missing' ||
  fulfilled.status !== 'fulfilled' ||
  conflict.status !== 'identity-conflict'
) {
  throw new TypeError('Packed authoring-development ESM resolution contract failed.');
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'external-node-catalog-runtime.cjs'),
    `const contracts = require('@workbench-kit/contracts');
const development = require('@workbench-kit/contracts/authoring-development');
const externalCatalog = require('@workbench-kit/contracts/external-node-catalog');

const runtimeNames = [
  'EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES',
  'EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS',
  'EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION',
  'projectExternalNodeCatalogContribution',
];
for (const name of runtimeNames) {
  if (name in contracts) {
    throw new TypeError('External-node-catalog unexpectedly leaked through the contracts root: ' + name);
  }
}
for (const name of [
  'createStrictPortableDataBudget',
  'snapshotStrictPortableData',
  'StrictPortableDataError',
  'collectNoncanonicalUiValueSchemaText',
  'isSupportedUiValueSchemaShape',
]) {
  if (name in contracts || name in externalCatalog) {
    throw new TypeError('External-node-catalog private helper unexpectedly leaked: ' + name);
  }
}
if (JSON.stringify(Object.keys(externalCatalog).sort()) !== JSON.stringify([...runtimeNames].sort())) {
  throw new TypeError('Packed external-node-catalog CommonJS exports are incomplete or expose private helpers.');
}
if (
  externalCatalog.EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION !== 1 ||
  typeof externalCatalog.projectExternalNodeCatalogContribution !== 'function'
) {
  throw new TypeError('Packed external-node-catalog CommonJS runtime exports are invalid.');
}
const expectedLimits = {
  maxEntries: 512,
  maxPortsPerEntry: 256,
  maxMappings: 2048,
  maxPortableDepth: 32,
  maxPortableProperties: 32768,
  maxStringLength: 4096,
};
const expectedIssueCodes = [
  'unsupported-schema-version',
  'invalid-foreign-snapshot',
  'invalid-foreign-entry',
  'invalid-projection-mapping',
  'admission-limit-exceeded',
  'duplicate-source-type-key',
  'duplicate-identity-mapping',
  'missing-identity-mapping',
  'duplicate-value-semantic-mapping',
  'missing-value-semantic-mapping',
  'duplicate-projected-node-ref',
  'unsupported-foreign-input',
  'unsupported-foreign-output',
  'unsupported-dynamic-shape',
  'unsafe-foreign-entry',
  'projected-descriptor-invalid',
];
if (
  !Object.isFrozen(externalCatalog.EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS) ||
  JSON.stringify(externalCatalog.EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS) !==
    JSON.stringify(expectedLimits) ||
  !Object.isFrozen(externalCatalog.EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES) ||
  JSON.stringify(externalCatalog.EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES) !==
    JSON.stringify(expectedIssueCodes)
) {
  throw new TypeError('Packed external-node-catalog CommonJS frozen constants are invalid.');
}

let privateSubpathRejected = false;
try {
  require('@workbench-kit/contracts/external-node-catalog/projection');
} catch (error) {
  privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}
if (!privateSubpathRejected) {
  throw new TypeError('Packed external-node-catalog CommonJS private projector subpath is exposed.');
}
for (const subpath of [
  '@workbench-kit/contracts/internal/strict-portable-data',
  '@workbench-kit/contracts/internal/ui-value-schema-shape',
]) {
  let helperSubpathRejected = false;
  try {
    require(subpath);
  } catch (error) {
    helperSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!helperSubpathRejected) {
    throw new TypeError('Packed external-node-catalog CommonJS private helper subpath is exposed: ' + subpath);
  }
}

const firstStaticEntry = {
  kind: 'static',
  sourceTypeKey: 'packed.static-node@1',
  inputs: [{ kind: 'fixed', id: 'input', valueSemanticId: 'packed.text', required: true }],
  outputs: [{ kind: 'fixed', id: 'output', valueSemanticId: 'packed.text' }],
  designTime: { label: 'Packed static node' },
};
const secondStaticEntry = {
  kind: 'static',
  sourceTypeKey: 'packed.second-static-node@1',
  inputs: [{ kind: 'fixed', id: 'source', valueSemanticId: 'packed.text' }],
  outputs: [{ kind: 'fixed', id: 'formatted', valueSemanticId: 'packed.text' }],
  designTime: { label: 'Packed second static node' },
};
const dynamicEntry = {
  kind: 'dynamic',
  sourceTypeKey: 'packed.dynamic-node@1',
  designTime: { label: 'Packed dynamic node' },
};
const mapping = {
  schemaVersion: 1,
  contributorId: 'workbench.consumer.packed-external-node-catalog',
  identities: [
    {
      sourceTypeKey: firstStaticEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-static-node', version: '1.0.0' },
    },
    {
      sourceTypeKey: dynamicEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-dynamic-node', version: '1.0.0' },
    },
    {
      sourceTypeKey: secondStaticEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-second-static-node', version: '1.0.0' },
    },
  ],
  values: [{ sourceSemanticId: 'packed.text', target: { type: 'string' } }],
};
const callerSentinels = {
  document: { revision: 7, nodes: ['packed-existing-node-instance'] },
  history: { entries: ['packed-before-projection'] },
  task: { status: 'waiting', attempts: 0 },
};
const callerSentinelsBefore = JSON.stringify(callerSentinels);
const project = externalCatalog.projectExternalNodeCatalogContribution;
const complete = project(
  { schemaVersion: 1, entries: [firstStaticEntry, secondStaticEntry] },
  mapping,
);
const partial = project(
  { schemaVersion: 1, entries: [firstStaticEntry, dynamicEntry, secondStaticEntry] },
  mapping,
);
const rejected = project({ schemaVersion: 1, entries: [dynamicEntry] }, mapping);
if (
  complete.status !== 'complete' ||
  complete.accepted.length !== 2 ||
  complete.contribution.nodeTypes.length !== 2 ||
  !Object.isFrozen(complete) ||
  !Object.isFrozen(complete.contribution) ||
  partial.status !== 'partial' ||
  JSON.stringify(partial.accepted.map(({ sourceIndex, sourceTypeKey }) => ({ sourceIndex, sourceTypeKey }))) !==
    JSON.stringify([
      { sourceIndex: 0, sourceTypeKey: 'packed.static-node@1' },
      { sourceIndex: 2, sourceTypeKey: 'packed.second-static-node@1' },
    ]) ||
  JSON.stringify(partial.contribution.nodeTypes.map(({ id }) => id)) !==
    JSON.stringify([
      'workbench.consumer.packed-static-node',
      'workbench.consumer.packed-second-static-node',
    ]) ||
  partial.issues.length !== 1 ||
  partial.issues[0]?.code !== 'unsupported-dynamic-shape' ||
  rejected.status !== 'rejected' ||
  rejected.accepted.length !== 0 ||
  'contribution' in rejected
) {
  throw new TypeError('Packed external-node-catalog CommonJS projection matrix failed.');
}

const requirement = {
  schemaVersion: development.AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-external-node-catalog-requirement',
  target: {
    kind: 'node-type',
    descriptor: {
      id: 'workbench.consumer.packed-static-node',
      version: '1.0.0',
      inputs: [{ id: 'input', required: true, value: { type: 'string' } }],
      outputs: [{ id: 'output', value: { type: 'string' } }],
      designTime: { label: 'Packed static node' },
    },
  },
  intent: { summary: 'Provide the projected packed node.', acceptance: ['Uses exact ports.'] },
};
const components = contracts.resolveUiComponentCatalog([]).catalog;
const existingContribution = {
  contributorId: 'workbench.consumer.packed-existing-catalog',
  nodeTypes: [
    {
      id: 'workbench.consumer.packed-existing-node',
      version: '1.0.0',
      inputs: [],
      outputs: [],
      designTime: { label: 'Packed existing node' },
    },
  ],
};
const initialCatalog = contracts.resolveNodeTypeCatalog([existingContribution]);
const missing = development.resolveAuthoringDevelopmentRequirement(requirement, {
  components,
  nodeTypes: initialCatalog.catalog,
});
const freshCatalog = contracts.resolveNodeTypeCatalog([existingContribution, partial.contribution]);
let retryCount = 0;
const retryOnce = () => {
  retryCount += 1;
  return development.resolveAuthoringDevelopmentRequirement(requirement, {
    components,
    nodeTypes: freshCatalog.catalog,
  });
};
const fulfilled = retryOnce();
if (
  initialCatalog.issues.length !== 0 ||
  freshCatalog.issues.length !== 0 ||
  JSON.stringify(freshCatalog.catalog.nodeTypes().map(({ id }) => id)) !==
    JSON.stringify([
      'workbench.consumer.packed-existing-node',
      'workbench.consumer.packed-static-node',
      'workbench.consumer.packed-second-static-node',
    ]) ||
  initialCatalog.catalog.nodeType(requirement.target.descriptor) !== undefined ||
  missing.status !== 'missing' ||
  fulfilled.status !== 'fulfilled' ||
  retryCount !== 1 ||
  fulfilled.existingNodeType === requirement.target.descriptor ||
  JSON.stringify(fulfilled.existingNodeType) !== JSON.stringify(requirement.target.descriptor) ||
  JSON.stringify(callerSentinels) !== callerSentinelsBefore
) {
  throw new TypeError('Packed external-node-catalog CommonJS explicit handoff failed.');
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'external-node-catalog-runtime.mjs'),
    `import * as contracts from '@workbench-kit/contracts';
import * as development from '@workbench-kit/contracts/authoring-development';
import {
  EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES,
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS,
  EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
  projectExternalNodeCatalogContribution,
} from '@workbench-kit/contracts/external-node-catalog';
import * as externalCatalog from '@workbench-kit/contracts/external-node-catalog';

const runtimeNames = [
  'EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES',
  'EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS',
  'EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION',
  'projectExternalNodeCatalogContribution',
];
for (const name of runtimeNames) {
  if (name in contracts) {
    throw new TypeError('External-node-catalog unexpectedly leaked through the contracts root: ' + name);
  }
}
for (const name of [
  'createStrictPortableDataBudget',
  'snapshotStrictPortableData',
  'StrictPortableDataError',
  'collectNoncanonicalUiValueSchemaText',
  'isSupportedUiValueSchemaShape',
]) {
  if (name in contracts || name in externalCatalog) {
    throw new TypeError('External-node-catalog private helper unexpectedly leaked: ' + name);
  }
}
if (JSON.stringify(Object.keys(externalCatalog).sort()) !== JSON.stringify([...runtimeNames].sort())) {
  throw new TypeError('Packed external-node-catalog ESM exports are incomplete or expose private helpers.');
}
const expectedLimits = {
  maxEntries: 512,
  maxPortsPerEntry: 256,
  maxMappings: 2048,
  maxPortableDepth: 32,
  maxPortableProperties: 32768,
  maxStringLength: 4096,
};
const expectedIssueCodes = [
  'unsupported-schema-version',
  'invalid-foreign-snapshot',
  'invalid-foreign-entry',
  'invalid-projection-mapping',
  'admission-limit-exceeded',
  'duplicate-source-type-key',
  'duplicate-identity-mapping',
  'missing-identity-mapping',
  'duplicate-value-semantic-mapping',
  'missing-value-semantic-mapping',
  'duplicate-projected-node-ref',
  'unsupported-foreign-input',
  'unsupported-foreign-output',
  'unsupported-dynamic-shape',
  'unsafe-foreign-entry',
  'projected-descriptor-invalid',
];
if (
  EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION !== 1 ||
  typeof projectExternalNodeCatalogContribution !== 'function' ||
  !Object.isFrozen(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS) ||
  JSON.stringify(EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS) !== JSON.stringify(expectedLimits) ||
  !Object.isFrozen(EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES) ||
  JSON.stringify(EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES) !==
    JSON.stringify(expectedIssueCodes)
) {
  throw new TypeError('Packed external-node-catalog ESM frozen exports are invalid.');
}

let privateSubpathRejected = false;
try {
  await import('@workbench-kit/contracts/external-node-catalog/projection');
} catch (error) {
  privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}
if (!privateSubpathRejected) {
  throw new TypeError('Packed external-node-catalog ESM private projector subpath is exposed.');
}
for (const subpath of [
  '@workbench-kit/contracts/internal/strict-portable-data',
  '@workbench-kit/contracts/internal/ui-value-schema-shape',
]) {
  let helperSubpathRejected = false;
  try {
    await import(subpath);
  } catch (error) {
    helperSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!helperSubpathRejected) {
    throw new TypeError('Packed external-node-catalog ESM private helper subpath is exposed: ' + subpath);
  }
}

const firstStaticEntry = {
  kind: 'static',
  sourceTypeKey: 'packed.static-node@1',
  inputs: [{ kind: 'fixed', id: 'input', valueSemanticId: 'packed.text', required: true }],
  outputs: [{ kind: 'fixed', id: 'output', valueSemanticId: 'packed.text' }],
  designTime: { label: 'Packed static node' },
};
const secondStaticEntry = {
  kind: 'static',
  sourceTypeKey: 'packed.second-static-node@1',
  inputs: [{ kind: 'fixed', id: 'source', valueSemanticId: 'packed.text' }],
  outputs: [{ kind: 'fixed', id: 'formatted', valueSemanticId: 'packed.text' }],
  designTime: { label: 'Packed second static node' },
};
const dynamicEntry = {
  kind: 'dynamic',
  sourceTypeKey: 'packed.dynamic-node@1',
  designTime: { label: 'Packed dynamic node' },
};
const mapping = {
  schemaVersion: 1,
  contributorId: 'workbench.consumer.packed-external-node-catalog',
  identities: [
    {
      sourceTypeKey: firstStaticEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-static-node', version: '1.0.0' },
    },
    {
      sourceTypeKey: dynamicEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-dynamic-node', version: '1.0.0' },
    },
    {
      sourceTypeKey: secondStaticEntry.sourceTypeKey,
      target: { id: 'workbench.consumer.packed-second-static-node', version: '1.0.0' },
    },
  ],
  values: [{ sourceSemanticId: 'packed.text', target: { type: 'string' } }],
};
const callerSentinels = {
  document: { revision: 7, nodes: ['packed-existing-node-instance'] },
  history: { entries: ['packed-before-projection'] },
  task: { status: 'waiting', attempts: 0 },
};
const callerSentinelsBefore = JSON.stringify(callerSentinels);
const complete = projectExternalNodeCatalogContribution(
  { schemaVersion: 1, entries: [firstStaticEntry, secondStaticEntry] },
  mapping,
);
const partial = projectExternalNodeCatalogContribution(
  { schemaVersion: 1, entries: [firstStaticEntry, dynamicEntry, secondStaticEntry] },
  mapping,
);
const rejected = projectExternalNodeCatalogContribution(
  { schemaVersion: 1, entries: [dynamicEntry] },
  mapping,
);
if (
  complete.status !== 'complete' ||
  complete.accepted.length !== 2 ||
  complete.contribution.nodeTypes.length !== 2 ||
  !Object.isFrozen(complete) ||
  !Object.isFrozen(complete.contribution) ||
  partial.status !== 'partial' ||
  JSON.stringify(partial.accepted.map(({ sourceIndex, sourceTypeKey }) => ({ sourceIndex, sourceTypeKey }))) !==
    JSON.stringify([
      { sourceIndex: 0, sourceTypeKey: 'packed.static-node@1' },
      { sourceIndex: 2, sourceTypeKey: 'packed.second-static-node@1' },
    ]) ||
  JSON.stringify(partial.contribution.nodeTypes.map(({ id }) => id)) !==
    JSON.stringify([
      'workbench.consumer.packed-static-node',
      'workbench.consumer.packed-second-static-node',
    ]) ||
  partial.issues.length !== 1 ||
  partial.issues[0]?.code !== 'unsupported-dynamic-shape' ||
  rejected.status !== 'rejected' ||
  rejected.accepted.length !== 0 ||
  'contribution' in rejected
) {
  throw new TypeError('Packed external-node-catalog ESM projection matrix failed.');
}

const requirement = {
  schemaVersion: development.AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  requirementId: 'packed-external-node-catalog-requirement',
  target: {
    kind: 'node-type',
    descriptor: {
      id: 'workbench.consumer.packed-static-node',
      version: '1.0.0',
      inputs: [{ id: 'input', required: true, value: { type: 'string' } }],
      outputs: [{ id: 'output', value: { type: 'string' } }],
      designTime: { label: 'Packed static node' },
    },
  },
  intent: { summary: 'Provide the projected packed node.', acceptance: ['Uses exact ports.'] },
};
const components = contracts.resolveUiComponentCatalog([]).catalog;
const existingContribution = {
  contributorId: 'workbench.consumer.packed-existing-catalog',
  nodeTypes: [
    {
      id: 'workbench.consumer.packed-existing-node',
      version: '1.0.0',
      inputs: [],
      outputs: [],
      designTime: { label: 'Packed existing node' },
    },
  ],
};
const initialCatalog = contracts.resolveNodeTypeCatalog([existingContribution]);
const missing = development.resolveAuthoringDevelopmentRequirement(requirement, {
  components,
  nodeTypes: initialCatalog.catalog,
});
const freshCatalog = contracts.resolveNodeTypeCatalog([existingContribution, partial.contribution]);
let retryCount = 0;
const retryOnce = () => {
  retryCount += 1;
  return development.resolveAuthoringDevelopmentRequirement(requirement, {
    components,
    nodeTypes: freshCatalog.catalog,
  });
};
const fulfilled = retryOnce();
if (
  initialCatalog.issues.length !== 0 ||
  freshCatalog.issues.length !== 0 ||
  JSON.stringify(freshCatalog.catalog.nodeTypes().map(({ id }) => id)) !==
    JSON.stringify([
      'workbench.consumer.packed-existing-node',
      'workbench.consumer.packed-static-node',
      'workbench.consumer.packed-second-static-node',
    ]) ||
  initialCatalog.catalog.nodeType(requirement.target.descriptor) !== undefined ||
  missing.status !== 'missing' ||
  fulfilled.status !== 'fulfilled' ||
  retryCount !== 1 ||
  fulfilled.existingNodeType === requirement.target.descriptor ||
  JSON.stringify(fulfilled.existingNodeType) !== JSON.stringify(requirement.target.descriptor) ||
  JSON.stringify(callerSentinels) !== callerSentinelsBefore
) {
  throw new TypeError('Packed external-node-catalog ESM explicit handoff failed.');
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'source-input-compatibility-runtime.cjs'),
    `const contracts = require('@workbench-kit/contracts');
const compatibility = require('@workbench-kit/contracts/source-input-compatibility');
const jdw = require('@workbench-kit/jdw');

const compatibilityRuntimeNames = [
  'UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION',
  'UI_SOURCE_INPUT_ISSUE_CODES',
  'UI_SOURCE_INPUT_LIMITS',
  'resolveUiSourceInputCandidates',
];
for (const name of compatibilityRuntimeNames) {
  if (name in contracts || !(name in compatibility)) {
    throw new TypeError('Packed source-input CommonJS focused/root boundary is invalid: ' + name);
  }
}
const jdwRuntimeNames = [
  'createUiAuthoringSourceInputPlan',
  'finalizeUiAuthoringSourceInputPlan',
  'inspectUiAuthoringSourceInputCandidates',
  'previewUiAuthoringSourceInputPlan',
];
for (const name of jdwRuntimeNames) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW CommonJS source-input export is missing: ' + name);
  }
}
if (
  compatibility.UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION !== 1 ||
  !Object.isFrozen(compatibility.UI_SOURCE_INPUT_ISSUE_CODES) ||
  !Object.isFrozen(compatibility.UI_SOURCE_INPUT_LIMITS) ||
  typeof compatibility.resolveUiSourceInputCandidates !== 'function'
) {
  throw new TypeError('Packed source-input CommonJS runtime exports are invalid.');
}
const expectedIssueCodes = ${JSON.stringify([
      'invalid-request',
      'unsupported-version',
      'request-too-large',
      'invalid-source',
      'duplicate-source',
      'invalid-target',
      'duplicate-target',
      'component-catalog-unavailable',
      'invalid-conversion',
      'duplicate-conversion',
      'invalid-binding-assignment',
      'missing-binding-assignment',
      'extra-binding-assignment',
      'duplicate-binding-id',
      'target-output-only',
      'target-binding-disallowed',
      'target-occupied',
      'type-mismatch',
      'constraint-mismatch',
      'no-declared-conversion',
      'no-compatible-target',
      'ambiguous-exact',
      'convertible-only',
      'selection-required',
      'source-unselected',
      'invalid-selection',
      'target-contended',
      'no-change',
      'stale-source',
      'stale-assigned-binding',
      'stale-target-binding',
      'stale-conversion-evidence',
      'stale-selection',
      'stale-plan',
      'stale-recipe',
      'stale-document',
      'stale-design-system',
      'stale-component-catalog',
    ])};
if (JSON.stringify(compatibility.UI_SOURCE_INPUT_ISSUE_CODES) !== JSON.stringify(expectedIssueCodes)) {
  throw new TypeError('Packed source-input CommonJS issue vocabulary is invalid.');
}
const result = compatibility.resolveUiSourceInputCandidates({
  schemaVersion: 1,
  sources: [{ id: 'packed-source', value: { type: 'string' } }],
  targets: [],
  bindings: [{ sourceId: 'packed-source', bindingId: 'packed-binding' }],
});
if (
  result.status !== 'ready' ||
  result.resolutions.length !== 1 ||
  result.resolutions[0].status !== 'incompatible' ||
  result.resolutions[0].issues[0].code !== 'no-compatible-target'
) {
  throw new TypeError('Packed source-input CommonJS resolution contract failed.');
}
for (const subpath of [
  '@workbench-kit/contracts/source-input-compatibility/resolver',
  '@workbench-kit/jdw/ui-authoring/source-input-plan',
]) {
  let privateSubpathRejected = false;
  try {
    require(subpath);
  } catch (error) {
    privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!privateSubpathRejected) {
    throw new TypeError('Packed source-input CommonJS private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'source-input-compatibility-runtime.mjs'),
    `import * as contracts from '@workbench-kit/contracts';
import * as compatibility from '@workbench-kit/contracts/source-input-compatibility';
import * as jdw from '@workbench-kit/jdw';

const compatibilityRuntimeNames = [
  'UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION',
  'UI_SOURCE_INPUT_ISSUE_CODES',
  'UI_SOURCE_INPUT_LIMITS',
  'resolveUiSourceInputCandidates',
];
for (const name of compatibilityRuntimeNames) {
  if (name in contracts || !(name in compatibility)) {
    throw new TypeError('Packed source-input ESM focused/root boundary is invalid: ' + name);
  }
}
const jdwRuntimeNames = [
  'createUiAuthoringSourceInputPlan',
  'finalizeUiAuthoringSourceInputPlan',
  'inspectUiAuthoringSourceInputCandidates',
  'previewUiAuthoringSourceInputPlan',
];
for (const name of jdwRuntimeNames) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW ESM source-input export is missing: ' + name);
  }
}
if (
  compatibility.UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION !== 1 ||
  !Object.isFrozen(compatibility.UI_SOURCE_INPUT_ISSUE_CODES) ||
  !Object.isFrozen(compatibility.UI_SOURCE_INPUT_LIMITS) ||
  typeof compatibility.resolveUiSourceInputCandidates !== 'function'
) {
  throw new TypeError('Packed source-input ESM runtime exports are invalid.');
}
const expectedIssueCodes = ${JSON.stringify([
      'invalid-request',
      'unsupported-version',
      'request-too-large',
      'invalid-source',
      'duplicate-source',
      'invalid-target',
      'duplicate-target',
      'component-catalog-unavailable',
      'invalid-conversion',
      'duplicate-conversion',
      'invalid-binding-assignment',
      'missing-binding-assignment',
      'extra-binding-assignment',
      'duplicate-binding-id',
      'target-output-only',
      'target-binding-disallowed',
      'target-occupied',
      'type-mismatch',
      'constraint-mismatch',
      'no-declared-conversion',
      'no-compatible-target',
      'ambiguous-exact',
      'convertible-only',
      'selection-required',
      'source-unselected',
      'invalid-selection',
      'target-contended',
      'no-change',
      'stale-source',
      'stale-assigned-binding',
      'stale-target-binding',
      'stale-conversion-evidence',
      'stale-selection',
      'stale-plan',
      'stale-recipe',
      'stale-document',
      'stale-design-system',
      'stale-component-catalog',
    ])};
if (JSON.stringify(compatibility.UI_SOURCE_INPUT_ISSUE_CODES) !== JSON.stringify(expectedIssueCodes)) {
  throw new TypeError('Packed source-input ESM issue vocabulary is invalid.');
}
const result = compatibility.resolveUiSourceInputCandidates({
  schemaVersion: 1,
  sources: [{ id: 'packed-source', value: { type: 'string' } }],
  targets: [],
  bindings: [{ sourceId: 'packed-source', bindingId: 'packed-binding' }],
});
if (
  result.status !== 'ready' ||
  result.resolutions.length !== 1 ||
  result.resolutions[0].status !== 'incompatible' ||
  result.resolutions[0].issues[0].code !== 'no-compatible-target'
) {
  throw new TypeError('Packed source-input ESM resolution contract failed.');
}
for (const subpath of [
  '@workbench-kit/contracts/source-input-compatibility/resolver',
  '@workbench-kit/jdw/ui-authoring/source-input-plan',
]) {
  let privateSubpathRejected = false;
  try {
    await import(subpath);
  } catch (error) {
    privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!privateSubpathRejected) {
    throw new TypeError('Packed source-input ESM private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'builtins.ts'),
    `import { BUILTIN_WORKBENCH_EXTENSIONS } from '@workbench-kit/shell-react';

export const packedBuiltins = BUILTIN_WORKBENCH_EXTENSIONS;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'schema-form-types.ts'),
    `import {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormCancelContext,
  type WorkbenchSchemaFormCheckboxField,
  type WorkbenchSchemaFormErrors,
  type WorkbenchSchemaFormField,
  type WorkbenchSchemaFormFieldBase,
  type WorkbenchSchemaFormFieldChangeContext,
  type WorkbenchSchemaFormFieldType,
  type WorkbenchSchemaFormFieldValue,
  type WorkbenchSchemaFormNumberField,
  type WorkbenchSchemaFormOption,
  type WorkbenchSchemaFormProps,
  type WorkbenchSchemaFormSelectField,
  type WorkbenchSchemaFormSubmitContext,
  type WorkbenchSchemaFormTextField,
  type WorkbenchSchemaFormValues,
} from '@workbench-kit/react/schema-form';

export const packedSchemaFormComponent = WorkbenchSchemaForm;
export const packedSchemaFormOmitted = { fields: [] } satisfies WorkbenchSchemaFormProps;
export const packedSchemaFormFalse = {
  fields: [],
  focusFirstInvalidFieldOnSubmit: false,
} satisfies WorkbenchSchemaFormProps;
export const packedSchemaFormTrue = {
  fields: [],
  focusFirstInvalidFieldOnSubmit: true,
} satisfies WorkbenchSchemaFormProps;

// @ts-expect-error exactOptionalPropertyTypes rejects explicit undefined.
const packedSchemaFormExplicitUndefined: WorkbenchSchemaFormProps = {
  fields: [],
  focusFirstInvalidFieldOnSubmit: undefined,
};
void packedSchemaFormExplicitUndefined;

export const packedSchemaFormRuntime = Object.freeze({
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
});

export type PackedSchemaFormPublicTypes = readonly [
  WorkbenchSchemaFormCancelContext,
  WorkbenchSchemaFormCheckboxField,
  WorkbenchSchemaFormErrors,
  WorkbenchSchemaFormField,
  WorkbenchSchemaFormFieldBase,
  WorkbenchSchemaFormFieldChangeContext,
  WorkbenchSchemaFormFieldType,
  WorkbenchSchemaFormFieldValue,
  WorkbenchSchemaFormNumberField,
  WorkbenchSchemaFormOption,
  WorkbenchSchemaFormProps,
  WorkbenchSchemaFormSelectField,
  WorkbenchSchemaFormSubmitContext,
  WorkbenchSchemaFormTextField,
  WorkbenchSchemaFormValues,
];
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'schema-form-legacy-types.ts'),
    `import * as FocusedSchemaForm from '@workbench-kit/react/schema-form';
import * as LegacySettingsSchemaForm from '@workbench-kit/react/workbench/settings';
import * as LegacyWorkbenchSchemaForm from '@workbench-kit/react/workbench';

export const packedLegacySettingsSchemaForm: typeof FocusedSchemaForm.WorkbenchSchemaForm =
  LegacySettingsSchemaForm.WorkbenchSchemaForm;
export const packedLegacyWorkbenchSchemaForm: typeof FocusedSchemaForm.WorkbenchSchemaForm =
  LegacyWorkbenchSchemaForm.WorkbenchSchemaForm;
export const packedLegacySettingsHelpers = {
  coerceWorkbenchSchemaFormFieldValue:
    LegacySettingsSchemaForm.coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors: LegacySettingsSchemaForm.getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue:
    LegacySettingsSchemaForm.getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError: LegacySettingsSchemaForm.getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable:
    LegacySettingsSchemaForm.isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues:
    LegacySettingsSchemaForm.normalizeWorkbenchSchemaFormValues,
} satisfies Pick<
  typeof FocusedSchemaForm,
  | 'coerceWorkbenchSchemaFormFieldValue'
  | 'getWorkbenchSchemaFormErrors'
  | 'getWorkbenchSchemaFormFieldDefaultValue'
  | 'getWorkbenchSchemaFormFieldError'
  | 'isWorkbenchSchemaFormSubmittable'
  | 'normalizeWorkbenchSchemaFormValues'
>;
export const packedLegacyWorkbenchHelpers: typeof packedLegacySettingsHelpers = {
  coerceWorkbenchSchemaFormFieldValue:
    LegacyWorkbenchSchemaForm.coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors: LegacyWorkbenchSchemaForm.getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue:
    LegacyWorkbenchSchemaForm.getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError: LegacyWorkbenchSchemaForm.getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable:
    LegacyWorkbenchSchemaForm.isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues:
    LegacyWorkbenchSchemaForm.normalizeWorkbenchSchemaFormValues,
};
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'focused-schema-form.ts'),
    `import {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
} from '@workbench-kit/react/schema-form';

const focusedRuntime = Object.freeze({
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
});

(globalThis as typeof globalThis & { __workbenchKitFocusedSchemaForm?: unknown })
  .__workbenchKitFocusedSchemaForm = focusedRuntime;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'schema-form-identity.ts'),
    `import {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
} from '@workbench-kit/react/schema-form';
import {
  WorkbenchSchemaForm as SettingsSchemaForm,
  coerceWorkbenchSchemaFormFieldValue as settingsCoerce,
  getWorkbenchSchemaFormErrors as settingsGetErrors,
  getWorkbenchSchemaFormFieldDefaultValue as settingsGetDefault,
  getWorkbenchSchemaFormFieldError as settingsGetFieldError,
  isWorkbenchSchemaFormSubmittable as settingsIsSubmittable,
  normalizeWorkbenchSchemaFormValues as settingsNormalize,
} from '@workbench-kit/react/workbench/settings';
import {
  WorkbenchSchemaForm as WorkbenchSchemaFormLegacy,
  coerceWorkbenchSchemaFormFieldValue as workbenchCoerce,
  getWorkbenchSchemaFormErrors as workbenchGetErrors,
  getWorkbenchSchemaFormFieldDefaultValue as workbenchGetDefault,
  getWorkbenchSchemaFormFieldError as workbenchGetFieldError,
  isWorkbenchSchemaFormSubmittable as workbenchIsSubmittable,
  normalizeWorkbenchSchemaFormValues as workbenchNormalize,
} from '@workbench-kit/react/workbench';

const focusedRuntime = {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
};
const settingsRuntime: typeof focusedRuntime = {
  WorkbenchSchemaForm: SettingsSchemaForm,
  coerceWorkbenchSchemaFormFieldValue: settingsCoerce,
  getWorkbenchSchemaFormErrors: settingsGetErrors,
  getWorkbenchSchemaFormFieldDefaultValue: settingsGetDefault,
  getWorkbenchSchemaFormFieldError: settingsGetFieldError,
  isWorkbenchSchemaFormSubmittable: settingsIsSubmittable,
  normalizeWorkbenchSchemaFormValues: settingsNormalize,
};
const workbenchRuntime: typeof focusedRuntime = {
  WorkbenchSchemaForm: WorkbenchSchemaFormLegacy,
  coerceWorkbenchSchemaFormFieldValue: workbenchCoerce,
  getWorkbenchSchemaFormErrors: workbenchGetErrors,
  getWorkbenchSchemaFormFieldDefaultValue: workbenchGetDefault,
  getWorkbenchSchemaFormFieldError: workbenchGetFieldError,
  isWorkbenchSchemaFormSubmittable: workbenchIsSubmittable,
  normalizeWorkbenchSchemaFormValues: workbenchNormalize,
};

for (const exportName of Object.keys(focusedRuntime) as (keyof typeof focusedRuntime)[]) {
  if (
    focusedRuntime[exportName] !== settingsRuntime[exportName] ||
    focusedRuntime[exportName] !== workbenchRuntime[exportName]
  ) {
    throw new TypeError('Packed SchemaForm runtime identity diverged for ' + exportName);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'schema-form-private-paths.cjs'),
    `const privateSubpaths = [
  '@workbench-kit/react/schema-form/SchemaForm',
  '@workbench-kit/react/schema-form/settingsCommit',
  '@workbench-kit/react/workbench/settings/SchemaForm',
  '@workbench-kit/react/src/workbench/settings/SchemaForm',
];
for (const subpath of privateSubpaths) {
  let rejected = false;
  try {
    require(subpath);
  } catch (error) {
    rejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!rejected) {
    throw new TypeError('Packed SchemaForm CommonJS private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'schema-form-private-paths.mjs'),
    `const privateSubpaths = [
  '@workbench-kit/react/schema-form/SchemaForm',
  '@workbench-kit/react/schema-form/settingsCommit',
  '@workbench-kit/react/workbench/settings/SchemaForm',
  '@workbench-kit/react/src/workbench/settings/SchemaForm',
];
for (const subpath of privateSubpaths) {
  let rejected = false;
  try {
    await import(subpath);
  } catch (error) {
    rejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!rejected) {
    throw new TypeError('Packed SchemaForm ESM private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'editor-tabs-compatibility-types.ts'),
    `import {
  WorkbenchEditorTabs as RootWorkbenchEditorTabs,
  type WorkbenchEditorTabCommandFocusDisposition as RootFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent as RootFocusEvent,
  type WorkbenchEditorTabsProps as RootEditorTabsProps,
} from '@workbench-kit/react';
import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import {
  WorkbenchEditorTabs as WorkbenchEditorTabs,
  type WorkbenchEditorTabCommandFocusDisposition as WorkbenchFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent as WorkbenchFocusEvent,
  type WorkbenchEditorTabsProps as WorkbenchEditorTabsProps,
} from '@workbench-kit/react/workbench';
import {
  WorkbenchEditorTabs as ShellWorkbenchEditorTabs,
  type WorkbenchEditorTabCommandFocusDisposition as ShellFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent as ShellFocusEvent,
  type WorkbenchEditorTabsProps as ShellEditorTabsProps,
} from '@workbench-kit/react/workbench/shell';
import {
  WorkbenchEditorTabs as FocusedWorkbenchEditorTabs,
  type WorkbenchEditorTabCommandFocusDisposition as FocusedFocusDisposition,
  type WorkbenchEditorTabCommandFocusEvent as FocusedFocusEvent,
  type WorkbenchEditorTabsProps as FocusedEditorTabsProps,
} from '@workbench-kit/react/editor-tabs';

const legacyExtraItem = {
  label: 'Inspect tab',
  onSelect: () => undefined,
} satisfies ContextMenuItem;
const legacyProps = {
  activeId: 'library',
  getExtraTabContextMenuItems: () => [legacyExtraItem],
  onClose: () => undefined,
  onSelect: () => undefined,
  tabs: [{ id: 'library', label: 'Library' }],
} satisfies RootEditorTabsProps;

const rootProps: RootEditorTabsProps = legacyProps;
const workbenchProps: WorkbenchEditorTabsProps = legacyProps;
const shellProps: ShellEditorTabsProps = legacyProps;
const focusedProps: FocusedEditorTabsProps = legacyProps;
const components: readonly [
  typeof RootWorkbenchEditorTabs,
  typeof WorkbenchEditorTabs,
  typeof ShellWorkbenchEditorTabs,
  typeof FocusedWorkbenchEditorTabs,
] = [
  RootWorkbenchEditorTabs,
  WorkbenchEditorTabs,
  ShellWorkbenchEditorTabs,
  FocusedWorkbenchEditorTabs,
];

declare const rootFocusEvent: RootFocusEvent;
declare const rootFocusDisposition: RootFocusDisposition;
const workbenchFocusEvent: WorkbenchFocusEvent = rootFocusEvent;
const shellFocusEvent: ShellFocusEvent = rootFocusEvent;
const focusedFocusEvent: FocusedFocusEvent = rootFocusEvent;
const workbenchFocusDisposition: WorkbenchFocusDisposition = rootFocusDisposition;
const shellFocusDisposition: ShellFocusDisposition = rootFocusDisposition;
const focusedFocusDisposition: FocusedFocusDisposition = rootFocusDisposition;
declare const resolver: NonNullable<RootEditorTabsProps['resolveContextMenuCommandFocus']>;
const optedInProps = {
  ...legacyProps,
  resolveContextMenuCommandFocus: resolver,
} satisfies FocusedEditorTabsProps;

void [
  components,
  focusedFocusDisposition,
  focusedFocusEvent,
  focusedProps,
  optedInProps,
  rootProps,
  shellFocusDisposition,
  shellFocusEvent,
  shellProps,
  workbenchFocusDisposition,
  workbenchFocusEvent,
  workbenchProps,
];
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-context-menu-item.ts'),
    `import type { ContextMenuItem } from '@workbench-kit/react/overlay/context-menu-item';

export type NodeResolvedContextMenuItem = ContextMenuItem;
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-design-system.ts'),
    `import { DesignSystemPackRegistry } from '@workbench-kit/workbench-core/design-system';

export const packedDesignSystemRegistry = new DesignSystemPackRegistry();
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-design-system-runtime.cjs'),
    `const { DesignSystemPackRegistry } = require('@workbench-kit/workbench-core/design-system');

const registry = new DesignSystemPackRegistry();
if (registry.snapshot().revision !== 0) process.exit(1);
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'ui-authoring-compat.ts'),
    `import type { DesignSystemPackChangeMutation } from '@workbench-kit/contracts';
import {
  applyUiAuthoringSessionCommand,
  applyUiAuthoringSessionCommandV2,
  applyUiAuthoringSessionCommandV3,
  applyUiDesignSystemPackChange,
  applyUiDesignSystemPackChangeV2,
  applyUiDesignSystemPackChangeV3,
  applyUiDocumentCommand,
  applyUiDocumentCommandV2,
  applyUiDocumentCommandV3,
  createUiAuthoringDetachedPlan,
  createUiAuthoringSession,
  createUiAuthoringSessionV2,
  createUiAuthoringSessionV3,
  createUiDocumentV3,
  finalizeUiAuthoringDetachedPlan,
  previewUiAuthoringDetachedPlan,
  projectUiAuthoringDocument,
  projectUiAuthoringDocumentV3,
  projectUiDesignSystemDocumentV3,
  redoUiAuthoringSession,
  redoUiAuthoringSessionV2,
  redoUiAuthoringSessionV3,
  selectUiDocumentNodesV3,
  undoUiAuthoringSession,
  undoUiAuthoringSessionV2,
  undoUiAuthoringSessionV3,
  upgradeUiDocumentToV3,
  type ApplyUiDocumentCommandResult,
  type ApplyUiDocumentCommandV2Result,
  type ApplyUiDocumentCommandV3Result,
  type ApplyUiDesignSystemPackChangeResult,
  type ApplyUiDesignSystemPackChangeV2Result,
  type ApplyUiDesignSystemPackChangeV3Result,
  type CreateUiAuthoringDetachedPlanInput,
  type UiAuthoringSessionCommandResult,
  type UiAuthoringSessionState,
  type UiAuthoringSessionStateV2,
  type UiAuthoringSessionStateV3,
  type UiAuthoringSessionV2CommandResult,
  type UiAuthoringSessionV3CommandResult,
  type UiAuthoringBindingProvenance,
  type UiAuthoringDesignSystemInputSnapshot,
  type UiAuthoringDetachedPlan,
  type UiAuthoringDocumentProjection,
  type UiAuthoringDocumentProjectionV3,
  type UiAuthoringDocumentNodeProjection,
  type UiAuthoringInputBindingProjection,
  type UiAuthoringPlanDiagnostic,
  type UiAuthoringPlanDiagnosticCode,
  type UiAuthoringPlanFinalizeContext,
  type UiAuthoringPlanFinalizeResult,
  type UiAuthoringPlanPreview,
  type UiAuthoringRecipeRef,
  type UiAuthoringRecipeProvenance,
  type UiDocument,
  type UiDocumentAtomicCommandV2,
  type UiDocumentAtomicCommandV3,
  type UiDocumentCommand,
  type UiDocumentCommandV2,
  type UiDocumentCommandV3,
  type UiDocumentCommandV2Context,
  type UiDocumentCommandV3Context,
  type UiDocumentCommandV2Issue,
  type UiDocumentCommandV2IssueCode,
  type UiDocumentTransaction,
  type UiDocumentTransactionRecordV2,
  type UiDocumentTransactionRecordV3,
  type UiDocumentTransactionV2,
  type UiDocumentTransactionV3,
  type UiDocumentNodeAuthoringV3,
  type UiDocumentV3,
} from '@workbench-kit/jdw';

export function consumeLegacyUiDocumentCommand(command: UiDocumentCommand): string {
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeLegacyUiDocumentTransaction(transaction: UiDocumentTransaction): string {
  const command = transaction.command;
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeUiDocumentCommandV2(command: UiDocumentCommandV2): string {
  switch (command.type) {
    case 'insert-node':
      return 'insert-node';
    case 'remove-node':
      return 'remove-node';
    case 'replace-node':
      return 'replace-node';
    case 'move-node':
      return 'move-node';
    case 'set-property':
      return 'set-property';
    case 'set-layout':
      return 'set-layout';
    case 'set-input-binding':
      return 'set-input-binding';
    case 'clear-input-binding':
      return 'clear-input-binding';
    case 'batch':
      return 'batch';
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeUiDocumentCommandV3(command: UiDocumentCommandV3): string {
  switch (command.type) {
    case 'insert-node':
    case 'remove-node':
    case 'replace-node':
    case 'move-node':
    case 'set-property':
    case 'set-layout':
    case 'set-input-binding':
    case 'clear-input-binding':
    case 'batch':
    case 'upsert-responsive-variant':
    case 'remove-responsive-variant':
    case 'set-responsive-property':
    case 'clear-responsive-property':
    case 'set-responsive-layout':
    case 'clear-responsive-layout':
      return command.type;
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

export function consumeUiDocumentTransactionV3(transaction: UiDocumentTransactionV3): string {
  switch (transaction.kind) {
    case 'document-command':
      return consumeUiDocumentCommandV3(transaction.command);
    case 'design-system-change':
      return transaction.intent.type;
    default: {
      const exhaustive: never = transaction;
      return exhaustive;
    }
  }
}

export function consumeUiDocumentV3(document: UiDocumentV3): readonly [string, string, unknown] {
  const rootId: string = document.root.id;
  const rootType: string = document.root.type;
  const extendedRoot: UiDocumentV3['root'] = {
    ...document.root,
    packedConsumerField: { enabled: true },
  };
  const arbitraryWidgetField: unknown = extendedRoot.packedConsumerField;
  return [rootId, rootType, arbitraryWidgetField];
}

type PackedSchema2UiDocument = UiDocumentV3 & {
  readonly root: UiDocumentV3['root'] & {
    readonly $authoring: UiDocumentNodeAuthoringV3 & {
      readonly documentSchemaVersion: 2;
    };
  };
};
declare const packedV3Document: PackedSchema2UiDocument;
declare const packedLegacyCommand: UiDocumentCommand;
declare const packedV2Command: UiDocumentCommandV2;
declare const packedV2Context: UiDocumentCommandV2Context;
if (false) {
  // @ts-expect-error V3 schema 2 documents are intentionally rejected by the legacy mutator.
  applyUiDocumentCommand(packedV3Document, packedLegacyCommand);
  // @ts-expect-error V3 schema 2 documents are intentionally rejected by the V2 mutator.
  applyUiDocumentCommandV2(packedV3Document, packedV2Command, packedV2Context);
  // @ts-expect-error V3 schema 2 documents are intentionally rejected by the legacy session.
  createUiAuthoringSession(packedV3Document);
  // @ts-expect-error V3 schema 2 documents are intentionally rejected by the V2 session.
  createUiAuthoringSessionV2(packedV3Document);
}

type LegacyApplyUiDocumentCommand = (
  document: UiDocument,
  command: UiDocumentCommand,
) => ApplyUiDocumentCommandResult;
type LegacyApplyUiAuthoringSessionCommand = (
  state: UiAuthoringSessionState,
  command: UiDocumentCommand,
) => UiAuthoringSessionCommandResult;
type LegacyCreateUiAuthoringSession = (
  document: UiDocument,
  selectedNodeIds?: readonly string[],
) => UiAuthoringSessionState;
type LegacyMoveUiAuthoringSessionHistory = (
  state: UiAuthoringSessionState,
) => UiAuthoringSessionState | null;
type LegacyApplyUiDesignSystemPackChange = (
  state: UiAuthoringSessionState,
  mutation: DesignSystemPackChangeMutation,
  currentRegistryRevision: number,
) => ApplyUiDesignSystemPackChangeResult;

export const legacyApplyUiDocumentCommand: LegacyApplyUiDocumentCommand = applyUiDocumentCommand;
export const legacyApplyUiAuthoringSessionCommand: LegacyApplyUiAuthoringSessionCommand =
  applyUiAuthoringSessionCommand;
export const legacyCreateUiAuthoringSession: LegacyCreateUiAuthoringSession =
  createUiAuthoringSession;
export const legacyUndoUiAuthoringSession: LegacyMoveUiAuthoringSessionHistory =
  undoUiAuthoringSession;
export const legacyRedoUiAuthoringSession: LegacyMoveUiAuthoringSessionHistory =
  redoUiAuthoringSession;
export const legacyApplyUiDesignSystemPackChange: LegacyApplyUiDesignSystemPackChange =
  applyUiDesignSystemPackChange;

export type PackedUiAuthoringV2Contracts = {
  atomicCommand: UiDocumentAtomicCommandV2;
  command: UiDocumentCommandV2;
  context: UiDocumentCommandV2Context;
  transaction: UiDocumentTransactionV2;
  transactionRecord: UiDocumentTransactionRecordV2;
  documentResult: ApplyUiDocumentCommandV2Result;
  sessionState: UiAuthoringSessionStateV2;
  sessionResult: UiAuthoringSessionV2CommandResult;
  designSystemResult: ApplyUiDesignSystemPackChangeV2Result;
  recipe: UiAuthoringRecipeRef;
  recipeProvenance: UiAuthoringRecipeProvenance;
  createPlanInput: CreateUiAuthoringDetachedPlanInput;
  designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  plan: UiAuthoringDetachedPlan;
  preview: UiAuthoringPlanPreview;
  planDiagnostic: UiAuthoringPlanDiagnostic;
  planDiagnosticCode: UiAuthoringPlanDiagnosticCode;
  finalizeContext: UiAuthoringPlanFinalizeContext;
  finalizeResult: UiAuthoringPlanFinalizeResult;
  bindingProvenance: UiAuthoringBindingProvenance;
  inputBinding: UiAuthoringInputBindingProjection;
  documentProjection: UiAuthoringDocumentProjection;
  documentNodeProjection: UiAuthoringDocumentNodeProjection;
  commandIssue: UiDocumentCommandV2Issue;
  commandIssueCode: UiDocumentCommandV2IssueCode;
};

export type PackedUiAuthoringV3Contracts = {
  atomicCommand: UiDocumentAtomicCommandV3;
  command: UiDocumentCommandV3;
  context: UiDocumentCommandV3Context;
  transaction: UiDocumentTransactionV3;
  transactionRecord: UiDocumentTransactionRecordV3;
  document: UiDocumentV3;
  documentResult: ApplyUiDocumentCommandV3Result;
  sessionState: UiAuthoringSessionStateV3;
  sessionResult: UiAuthoringSessionV3CommandResult;
  designSystemResult: ApplyUiDesignSystemPackChangeV3Result;
  documentProjection: UiAuthoringDocumentProjectionV3;
};

export const packedUiAuthoringV2Runtime = Object.freeze({
  applyUiAuthoringSessionCommandV2,
  applyUiDesignSystemPackChangeV2,
  applyUiDocumentCommandV2,
  createUiAuthoringDetachedPlan,
  createUiAuthoringSessionV2,
  finalizeUiAuthoringDetachedPlan,
  previewUiAuthoringDetachedPlan,
  projectUiAuthoringDocument,
  redoUiAuthoringSessionV2,
  undoUiAuthoringSessionV2,
});

export const packedUiAuthoringV3Runtime = Object.freeze({
  applyUiAuthoringSessionCommandV3,
  applyUiDesignSystemPackChangeV3,
  applyUiDocumentCommandV3,
  createUiAuthoringSessionV3,
  createUiDocumentV3,
  projectUiAuthoringDocumentV3,
  projectUiDesignSystemDocumentV3,
  redoUiAuthoringSessionV3,
  selectUiDocumentNodesV3,
  undoUiAuthoringSessionV3,
  upgradeUiDocumentToV3,
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-ui-authoring-runtime.cjs'),
    `const jdw = require('@workbench-kit/jdw');

const requiredFunctions = [
  'admitUiGenerativeUiRequest',
  'applyUiAuthoringSessionCommand',
  'applyUiAuthoringSessionCommandV2',
  'applyUiAuthoringSessionCommandV3',
  'applyUiDesignSystemPackChange',
  'applyUiDesignSystemPackChangeV2',
  'applyUiDesignSystemPackChangeV3',
  'applyUiDocumentCommand',
  'applyUiDocumentCommandV2',
  'applyUiDocumentCommandV3',
  'createUiAuthoringDetachedPlan',
  'createUiAuthoringSession',
  'createUiAuthoringSessionV2',
  'createUiAuthoringSessionV3',
  'createUiDocumentV3',
  'createUiGenerativeUiPlan',
  'finalizeUiAuthoringDetachedPlan',
  'finalizeUiGenerativeUiPlan',
  'previewUiAuthoringDetachedPlan',
  'previewUiGenerativeUiPlan',
  'projectUiAuthoringDocument',
  'projectUiAuthoringDocumentV3',
  'projectUiDesignSystemDocumentV3',
  'redoUiAuthoringSession',
  'redoUiAuthoringSessionV2',
  'redoUiAuthoringSessionV3',
  'selectUiDocumentNodesV3',
  'undoUiAuthoringSession',
  'undoUiAuthoringSessionV2',
  'undoUiAuthoringSessionV3',
  'upgradeUiDocumentToV3',
];
for (const name of requiredFunctions) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW CommonJS root is missing function export: ' + name);
  }
}
for (const name of ['cloneUiAuthoringJsonValue', 'deepFreezeUiAuthoringValue']) {
  if (name in jdw) {
    throw new TypeError('Packed JDW root exposes private authoring helper: ' + name);
  }
}
for (const subpath of [
  '@workbench-kit/jdw/ui-authoring/generative-plan',
  '@workbench-kit/jdw/ui-authoring/immutability',
]) {
  let privateSubpathRejected = false;
  try {
    require(subpath);
  } catch (error) {
    privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!privateSubpathRejected) {
    throw new TypeError('Packed JDW CommonJS private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'node-ui-authoring-runtime.mjs'),
    `import * as jdw from '@workbench-kit/jdw';

const requiredFunctions = [
  'admitUiGenerativeUiRequest',
  'applyUiAuthoringSessionCommand',
  'applyUiAuthoringSessionCommandV2',
  'applyUiAuthoringSessionCommandV3',
  'applyUiDesignSystemPackChange',
  'applyUiDesignSystemPackChangeV2',
  'applyUiDesignSystemPackChangeV3',
  'applyUiDocumentCommand',
  'applyUiDocumentCommandV2',
  'applyUiDocumentCommandV3',
  'createUiAuthoringDetachedPlan',
  'createUiAuthoringSession',
  'createUiAuthoringSessionV2',
  'createUiAuthoringSessionV3',
  'createUiDocumentV3',
  'createUiGenerativeUiPlan',
  'finalizeUiAuthoringDetachedPlan',
  'finalizeUiGenerativeUiPlan',
  'previewUiAuthoringDetachedPlan',
  'previewUiGenerativeUiPlan',
  'projectUiAuthoringDocument',
  'projectUiAuthoringDocumentV3',
  'projectUiDesignSystemDocumentV3',
  'redoUiAuthoringSession',
  'redoUiAuthoringSessionV2',
  'redoUiAuthoringSessionV3',
  'selectUiDocumentNodesV3',
  'undoUiAuthoringSession',
  'undoUiAuthoringSessionV2',
  'undoUiAuthoringSessionV3',
  'upgradeUiDocumentToV3',
];
for (const name of requiredFunctions) {
  if (typeof jdw[name] !== 'function') {
    throw new TypeError('Packed JDW ESM root is missing function export: ' + name);
  }
}
for (const name of ['cloneUiAuthoringJsonValue', 'deepFreezeUiAuthoringValue']) {
  if (name in jdw) {
    throw new TypeError('Packed JDW root exposes private authoring helper: ' + name);
  }
}
for (const subpath of [
  '@workbench-kit/jdw/ui-authoring/generative-plan',
  '@workbench-kit/jdw/ui-authoring/immutability',
]) {
  let privateSubpathRejected = false;
  try {
    await import(subpath);
  } catch (error) {
    privateSubpathRejected = error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  if (!privateSubpathRejected) {
    throw new TypeError('Packed JDW ESM private subpath is exposed: ' + subpath);
  }
}
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'strict-field-remap.ts'),
    `import { projectValueTransformToNodeType } from '@workbench-kit/field-remap';

export const packedStrictFieldRemapProjection = projectValueTransformToNodeType(
  {
    id: 'packed:identity',
    label: 'Identity',
    inputTypes: ['string'],
    outputType: 'string',
    apply: (value) => value,
  },
  { nodeTypeRef: { id: 'packed.identity', version: '1.0.0' } },
);
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'focused-command-host-controller.ts'),
    `import {
  WorkbenchCommandHostController,
  type WorkbenchCommandHostControllerProps,
  type WorkbenchCommandHostExecutor,
} from '@workbench-kit/shell-react/command-host-controller';

const executeCommand: WorkbenchCommandHostExecutor = () => undefined;
const props = {
  commands: [],
  executeCommand,
} satisfies WorkbenchCommandHostControllerProps;

(globalThis as typeof globalThis & { __workbenchKitCommandHostController?: unknown })
  .__workbenchKitCommandHostController = Object.freeze({
  WorkbenchCommandHostController,
  props,
});
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'src', 'focused-overlay.ts'),
    `import '@workbench-kit/react/styles/foundation.css';
import '@workbench-kit/react/styles/overlay.css';
import { ContextMenu } from '@workbench-kit/react/overlay';

(globalThis as typeof globalThis & { __workbenchKitFocusedOverlay?: unknown })
  .__workbenchKitFocusedOverlay = Object.freeze({ ContextMenu });
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
        },
        exclude: [
          'src/authoring-development-types.ts',
          'src/external-node-catalog-types.ts',
          'src/schema-form-types.ts',
          'src/source-input-compatibility-types.ts',
          'src/ui-generative-plan-types.ts',
        ],
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(consumerDir, 'vite.config.mjs'),
    `export default {
  root: ${JSON.stringify(consumerDir)},
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: ${JSON.stringify(outputDir)},
    sourcemap: true,
  },
};
`,
  );
  writeFocusedViteConfig(
    'focused-command-host-controller',
    path.join(consumerDir, 'src', 'focused-command-host-controller.ts'),
    focusedCommandHostControllerOutputDir,
  );
  writeFocusedViteConfig(
    'focused-overlay',
    path.join(consumerDir, 'src', 'focused-overlay.ts'),
    focusedOverlayOutputDir,
  );
  writeFocusedViteConfig(
    'focused-schema-form',
    path.join(consumerDir, 'src', 'focused-schema-form.ts'),
    focusedSchemaFormOutputDir,
  );
  writeFocusedViteConfig(
    'schema-form-identity',
    path.join(consumerDir, 'src', 'schema-form-identity.ts'),
    schemaFormIdentityOutputDir,
    true,
  );
}

function writeFocusedViteConfig(name, input, outputDirectory, nodeExecutable = false) {
  fs.writeFileSync(
    path.join(consumerDir, `vite.${name}.config.mjs`),
    `export default {
  root: ${JSON.stringify(consumerDir)},
  plugins: [{
    name: 'workbench-kit-focused-module-graph',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'module-graph.json',
        source: JSON.stringify([...this.getModuleIds()].sort(), null, 2),
      });
    },
  }],
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: ${JSON.stringify(outputDirectory)},
    rollupOptions: {
      input: ${JSON.stringify(input)},
      ${nodeExecutable ? 'treeshake: { moduleSideEffects: false },' : ''}
      ${nodeExecutable ? "output: { entryFileNames: 'assets/[name]-[hash].mjs' }," : ''}
    },
    sourcemap: true,
  },
};
`,
  );
}

function buildFocusedConsumer(name) {
  console.log(`[check-packed-consumer] Building ${name} consumer...`);
  runCommand(
    'pnpm',
    ['exec', 'vite', 'build', '--config', path.join(consumerDir, `vite.${name}.config.mjs`)],
    { cwd: repoRoot, stdio: 'inherit' },
  );
}

async function executeFocusedConsumer(label, outputDirectory) {
  const manifest = readJson(path.join(outputDirectory, '.vite', 'manifest.json'));
  const entry = Object.values(manifest).find((candidate) => candidate.isEntry);
  if (!entry?.file) throw new Error(`${label} consumer emitted no Vite entry.`);
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://127.0.0.1/',
  });
  const browserGlobals = {
    CustomEvent: dom.window.CustomEvent,
    customElements: dom.window.customElements,
    document: dom.window.document,
    Event: dom.window.Event,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    MutationObserver: dom.window.MutationObserver,
    navigator: dom.window.navigator,
    Node: dom.window.Node,
    window: dom.window,
  };
  const previousDescriptors = new Map(
    Object.keys(browserGlobals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );

  try {
    for (const [key, value] of Object.entries(browserGlobals)) {
      Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
    }
    await import(`${pathToFileURL(path.join(outputDirectory, entry.file)).href}?packed-consumer`);
    console.log(`[check-packed-consumer] ${label} runtime OK.`);
  } finally {
    dom.window.close();
    for (const [key, descriptor] of previousDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function collectInitialJavaScriptSources(outputDirectory, label) {
  const manifest = readJson(path.join(outputDirectory, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error(`${label} consumer emitted no Vite entry.`);

  const sources = [];
  for (const entry of collectStaticEntries(manifest, entryKey).filter((candidate) =>
    candidate.file?.endsWith('.js'),
  )) {
    const chunkPath = path.join(outputDirectory, entry.file);
    const sourceMap = readJson(`${chunkPath}.map`);
    sources.push(...(sourceMap.sources ?? []));
  }
  if (sources.length === 0) throw new Error(`${label} emitted no source-map evidence.`);
  return sources;
}

function verifyFocusedCommandHostControllerOutput() {
  const sources = collectInitialJavaScriptSources(
    focusedCommandHostControllerOutputDir,
    'focused command-host controller',
  );
  const normalizedSources = sources.map((source) =>
    `/${source.replaceAll('\\', '/')}`.toLowerCase(),
  );
  const requiredSourceSegments = [
    '/@workbench-kit/shell-react/src/workbench/command-host-controller.tsx',
    '/@workbench-kit/react/src/workbench/commands/commandpalette.tsx',
    '/@workbench-kit/react/src/workbench/commands/shortcutcommandbridge.tsx',
    '/@workbench-kit/react/src/workbench/commands/workbenchquickopen.tsx',
    '/@workbench-kit/platform/src/commands/command-contributions.ts',
  ];
  const forbiddenSourceSegments = [
    '/@workbench-kit/shell-react/src/workbench/command-host.tsx',
    '/@workbench-kit/shell-react/src/shell/provider',
    '/@workbench-kit/shell-react/src/extensions/',
    '/@workbench-kit/workbench-core/',
    '/packages/workbench-core/',
  ];

  for (const requiredSegment of requiredSourceSegments) {
    if (!normalizedSources.some((source) => source.includes(requiredSegment))) {
      throw new Error(
        `Focused command-host controller consumer is missing retained source ${requiredSegment}.`,
      );
    }
  }

  const forbiddenSources = normalizedSources.filter((source) =>
    forbiddenSourceSegments.some((segment) => source.includes(segment)),
  );
  if (forbiddenSources.length > 0) {
    throw new Error(
      `Focused command-host controller pulled the provider/extension graph:\n${[
        ...new Set(forbiddenSources),
      ].join('\n')}`,
    );
  }

  console.log(
    `[check-packed-consumer] focused command-host controller graph OK (${sources.length} source-map entries).`,
  );
}

function verifyFocusedSchemaFormOutput() {
  const sources = collectInitialJavaScriptSources(focusedSchemaFormOutputDir, 'focused SchemaForm');
  const moduleIds = readJson(path.join(focusedSchemaFormOutputDir, 'module-graph.json'));
  if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
    throw new Error('Focused SchemaForm emitted no module-graph evidence.');
  }
  const normalizedModuleIds = moduleIds.map((moduleId) =>
    `/${moduleId.replaceAll('\\', '/')}`.toLowerCase(),
  );
  const requiredModuleSegments = [
    '/@workbench-kit/react/src/workbench/settings/schemaform.tsx',
    '/@workbench-kit/react/src/workbench/settings/schema-form.css',
    '/@workbench-kit/react/src/workbench/settings/settingscommit.tsx',
    '/@workbench-kit/react/src/primitives/button/button.tsx',
    '/@workbench-kit/react/src/primitives/checkbox/checkbox.tsx',
    '/@workbench-kit/react/src/primitives/empty-state/emptystate.tsx',
    '/@workbench-kit/react/src/primitives/field/field.tsx',
    '/@workbench-kit/react/src/primitives/select/select.tsx',
    '/@workbench-kit/react/src/primitives/text-input/textinput.tsx',
  ];
  const settingsModuleRoot = '/@workbench-kit/react/src/workbench/settings/';
  const allowedSettingsModules = new Set([
    `${settingsModuleRoot}schemaform.tsx`,
    `${settingsModuleRoot}schema-form.css`,
    `${settingsModuleRoot}settingscommit.tsx`,
  ]);
  const forbiddenModuleSegments = [
    '/@workbench-kit/react/src/workbench/index.ts',
    '/@workbench-kit/react/src/styles/core.css',
    '/@workbench-kit/react/src/workbench/shell/',
    '/@workbench-kit/react/src/workbench/extensions/',
    '/@workbench-kit/react/src/workbench/provider',
    '/@workbench-kit/shell-react/',
    '/@workbench-kit/runtime/',
    '/@workbench-kit/workbench-core/',
    '/@workbench-kit/workbench-extension-sdk/',
    '/@workbench-kit/platform/src/extensions/',
    '/@workbench-kit/monaco/',
    '/packages/runtime/',
    '/packages/workbench-core/',
    '/packages/workbench-extension-sdk/',
    '/packages/monaco/',
  ];

  for (const requiredSegment of requiredModuleSegments) {
    if (!normalizedModuleIds.some((moduleId) => moduleId.includes(requiredSegment))) {
      throw new Error(`Focused SchemaForm consumer is missing retained module ${requiredSegment}.`);
    }
  }

  const unexpectedSettingsModules = normalizedModuleIds.filter((moduleId) => {
    const settingsModuleIndex = moduleId.indexOf(settingsModuleRoot);
    if (settingsModuleIndex === -1) return false;
    return !allowedSettingsModules.has(moduleId.slice(settingsModuleIndex));
  });
  const forbiddenModules = [
    ...unexpectedSettingsModules,
    ...normalizedModuleIds.filter((moduleId) =>
      forbiddenModuleSegments.some((segment) => moduleId.includes(segment)),
    ),
  ];
  if (forbiddenModules.length > 0) {
    throw new Error(
      `Focused SchemaForm pulled a broad Settings/shell runtime graph:\n${[
        ...new Set(forbiddenModules),
      ].join('\n')}`,
    );
  }

  const manifest = readJson(path.join(focusedSchemaFormOutputDir, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error('Focused SchemaForm consumer emitted no Vite entry.');
  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  if (cssFiles.size === 0) throw new Error('Focused SchemaForm consumer emitted no CSS.');
  const css = [...cssFiles]
    .map((file) => fs.readFileSync(path.join(focusedSchemaFormOutputDir, file), 'utf8'))
    .join('\n');
  for (const selector of [
    '.ui-workbench-schema-form',
    '.ui-workbench-schema-form__error',
    '.ui-workbench-schema-form__actions',
    '.ui-button',
    '.ui-checkbox',
    '.ui-empty-state',
    '.ui-field',
    '.ui-select',
    '.ui-input',
  ]) {
    if (!css.includes(selector)) throw new Error(`Focused SchemaForm CSS is missing ${selector}.`);
  }
  for (const selector of [
    '.workbench-settings-modal',
    '.ui-workbench-navigation-panel',
    '.ui-workbench-sectioned-panel',
    '.ui-workbench-section-tab-panel',
    '.ui-workbench-structured-data-form',
    '.ui-workbench-structured-data-schema-panel',
  ]) {
    if (css.includes(selector)) {
      throw new Error(`Focused SchemaForm CSS unexpectedly includes ${selector}.`);
    }
  }

  console.log(
    `[check-packed-consumer] focused SchemaForm graph/CSS OK (${moduleIds.length} module IDs, ${sources.length} source-map entries, ${cssFiles.size} CSS assets).`,
  );
}

function verifyOutput() {
  const manifest = readJson(path.join(outputDir, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error('Production consumer emitted no Vite entry.');

  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  const staticAssetFiles = new Set(staticEntries.flatMap((entry) => entry.assets ?? []));
  const sources = [];
  let bytes = 0;
  let gzipBytes = 0;

  for (const entry of staticEntries.filter((candidate) => candidate.file?.endsWith('.js'))) {
    const chunkPath = path.join(outputDir, entry.file);
    const chunk = fs.readFileSync(chunkPath);
    const sourceMap = readJson(`${chunkPath}.map`);
    bytes += chunk.byteLength;
    gzipBytes += gzipSync(chunk).byteLength;
    sources.push(...(sourceMap.sources ?? []));
  }
  if (sources.length === 0) throw new Error('Initial chunks emitted no source-map evidence.');

  const cssAssets = [...cssFiles].map((file) => fs.readFileSync(path.join(outputDir, file)));
  const css = cssAssets.map((asset) => asset.toString('utf8')).join('\n');
  for (const selector of ['.ui-button', '.workbench-field-remap-editor-surface']) {
    if (!css.includes(selector)) throw new Error(`Packed consumer CSS is missing ${selector}.`);
  }
  for (const selector of ['.workbench-profile-card', '.chat-panel-drop-target']) {
    if (css.includes(selector)) {
      throw new Error(`Core Workbench CSS unexpectedly includes optional selector ${selector}.`);
    }
  }

  const cssBytes = cssAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const cssGzipBytes = gzipSync(Buffer.concat(cssAssets)).byteLength;
  const staticAssets = [...staticAssetFiles].map((file) =>
    fs.readFileSync(path.join(outputDir, file)),
  );
  const staticAssetBytes = staticAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const staticAssetGzipBytes = staticAssets.reduce(
    (total, asset) => total + gzipSync(asset).byteLength,
    0,
  );
  const initialGzipBytes = gzipBytes + cssGzipBytes + staticAssetGzipBytes;

  assertWithinBudget('CSS gzip', cssGzipBytes, PACKED_CONSUMER_BUDGETS.cssGzipBytes);
  assertWithinBudget('initial gzip', initialGzipBytes, PACKED_CONSUMER_BUDGETS.initialGzipBytes);

  // Vite may emit unreferenced Monaco workers while scanning the React barrel.
  // Only the manifest's transitive static JS closure is part of initial load.
  const forbidden = sources.filter((source) => {
    const normalized = `/${source.replaceAll('\\', '/')}`.toLowerCase();
    return [
      '/node_modules/@workbench-kit/monaco/',
      '/node_modules/@monaco-editor/react/',
      '/node_modules/monaco-editor/',
      '/packages/monaco/',
    ].some((segment) => normalized.includes(segment));
  });
  if (forbidden.length) {
    throw new Error(`Monaco entered the initial bundle:\n${[...new Set(forbidden)].join('\n')}`);
  }

  console.log(
    `[check-packed-consumer] OK (${staticEntries.length} static chunks, JS ${bytes} bytes / ${gzipBytes} gzip bytes, CSS ${cssBytes} bytes / ${cssGzipBytes} gzip bytes in ${cssFiles.size} assets, static assets ${staticAssetBytes} bytes / ${staticAssetGzipBytes} gzip bytes in ${staticAssetFiles.size} files, initial ${initialGzipBytes} / ${PACKED_CONSUMER_BUDGETS.initialGzipBytes} gzip bytes).`,
  );

  return { cssBytes, cssGzipBytes };
}

function verifyFocusedStyleOutput({
  budgetBytes,
  coreCssGzipBytes,
  forbiddenSelectors,
  label,
  maxCoreRatio,
  outputDirectory,
  requiredSelectors,
}) {
  const manifest = readJson(path.join(outputDirectory, '.vite', 'manifest.json'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entryKey) throw new Error(`${label} consumer emitted no Vite entry.`);

  const staticEntries = collectStaticEntries(manifest, entryKey);
  const cssFiles = new Set(staticEntries.flatMap((entry) => entry.css ?? []));
  const cssAssets = [...cssFiles].map((file) => fs.readFileSync(path.join(outputDirectory, file)));
  const css = cssAssets.map((asset) => asset.toString('utf8')).join('\n');

  for (const selector of requiredSelectors) {
    if (!css.includes(selector)) throw new Error(`${label} CSS is missing ${selector}.`);
  }
  for (const selector of forbiddenSelectors) {
    if (css.includes(selector)) {
      throw new Error(`${label} CSS unexpectedly includes ${selector}.`);
    }
  }

  const cssBytes = cssAssets.reduce((total, asset) => total + asset.byteLength, 0);
  const cssGzipBytes = gzipSync(Buffer.concat(cssAssets)).byteLength;
  assertWithinBudget(`${label} CSS gzip`, cssGzipBytes, budgetBytes);

  const ratio = cssGzipBytes / coreCssGzipBytes;
  if (ratio > maxCoreRatio) {
    throw new Error(
      `${label} CSS lost its focused advantage: ${(ratio * 100).toFixed(1)}% of core > ${(maxCoreRatio * 100).toFixed(0)}%.`,
    );
  }

  console.log(
    `[check-packed-consumer] ${label} OK (CSS ${cssBytes} bytes / ${cssGzipBytes} gzip bytes, ${(ratio * 100).toFixed(1)}% of core).`,
  );
}

function assertWithinBudget(label, actualBytes, budgetBytes) {
  if (actualBytes <= budgetBytes) return;
  throw new Error(
    `Packed consumer ${label} exceeds its budget: ${actualBytes} > ${budgetBytes} bytes. Review the initial dependency and CSS surface before raising the budget.`,
  );
}

function collectStaticEntries(manifest, entryKey) {
  const entries = [];
  const pending = [entryKey];
  const visited = new Set();
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`Vite manifest references missing import ${key}.`);
    entries.push(entry);
    pending.push(...(entry.imports ?? []));
  }
  return entries;
}

function assertExternalFixture() {
  const relative = path.relative(repoRoot, fixtureRoot);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`Packed consumer fixture must stay outside the workspace: ${fixtureRoot}`);
  }
}

function assertSafeFixturePath() {
  if (
    path.dirname(path.resolve(fixtureRoot)) !== fixtureBase ||
    !path.basename(fixtureRoot).startsWith('wbk-packed-consumer-')
  ) {
    throw new Error(`Refusing to remove unexpected fixture path: ${fixtureRoot}`);
  }
}

function packageDir(packageName) {
  return path.join(repoRoot, 'packages', packageDirectoryNameForPackageName(packageName));
}

function packagePath(nodeModulesRoot, packageName) {
  return path.join(nodeModulesRoot, ...packageName.split('/'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
